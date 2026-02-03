# Agent Runner 容器内代码分析

## 概述

`container/agent-runner/` 是 NanoClaw 容器内的核心代码，负责：
- 启动 Claude Agent SDK
- 处理与 Host 进程的 IPC 通信
- 管理会话和对话归档

本文档重点分析容器内的执行逻辑，不深入 Claude Agent SDK 的内部实现。

---

## 架构概览

### 双层架构协作

```
┌─────────────────────────────────────────────────────────────┐
│ Host 进程 (src/container-runner.ts)                          │
│ - 调度容器启动                                                │
│ - 挂载文件系统                                                │
│ - 通过 stdin 传递配置                                         │
│ - 通过 stdout 接收结果                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ stdin: JSON 配置
                              │ stdout: JSON 结果
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Container 进程 (container/agent-runner/)                     │
│ - index.ts: 主入口，启动 Claude Agent SDK                    │
│ - ipc-mcp.ts: MCP 服务器，通过文件系统与 Host 通信            │
└─────────────────────────────────────────────────────────────┘
```

### 关键文件

| 文件 | 职责 |
|------|------|
| `container/agent-runner/src/index.ts` | 主入口，启动 Claude Agent SDK，处理输入输出 |
| `container/agent-runner/src/ipc-mcp.ts` | MCP 服务器，提供工具供 Agent 调用 |

---

## index.ts - 主入口分析

### 1. 接口定义

**文件**: `container/agent-runner/src/index.ts`
**行号**: 11-36

```typescript
interface ContainerInput {
  prompt: string;
  sessionId?: string;
  groupFolder: string;
  chatJid: string;
  isMain: boolean;
  isScheduledTask?: boolean;
}

interface ContainerOutput {
  status: 'success' | 'error';
  result: string | null;
  newSessionId?: string;
  error?: string;
}
```

**功能说明**:
- `ContainerInput`: Host 通过 stdin 传递给容器的配置
  - `prompt`: 用户提示词
  - `sessionId`: 可选的会话 ID（用于恢复对话）
  - `groupFolder`: 组文件夹名称
  - `chatJid`: WhatsApp 群组 JID
  - `isMain`: 是否为主组
  - `isScheduledTask`: 是否为定时任务

- `ContainerOutput`: 容器通过 stdout 返回给 Host 的结果
  - `status`: 执行状态
  - `result`: Agent 的最终回复
  - `newSessionId`: 新会话 ID（首次运行时生成）
  - `error`: 错误信息（如果失败）

---

### 2. 输入输出处理

**文件**: `container/agent-runner/src/index.ts`
**行号**: 38-59

```typescript
async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

const OUTPUT_START_MARKER = '---NANOCLAW_OUTPUT_START---';
const OUTPUT_END_MARKER = '---NANOCLAW_OUTPUT_END---';

function writeOutput(output: ContainerOutput): void {
  console.log(OUTPUT_START_MARKER);
  console.log(JSON.stringify(output));
  console.log(OUTPUT_END_MARKER);
}
```

**功能说明**:
- `readStdin()`: 从 stdin 读取 Host 传递的 JSON 配置
- `writeOutput()`: 将结果写入 stdout，使用标记符包裹 JSON
  - 标记符确保 Host 可以准确提取 JSON，避免被其他日志干扰

---

### 3. Claude Agent SDK 启动

**文件**: `container/agent-runner/src/index.ts`
**行号**: 203-287

```typescript
async function main(): Promise<void> {
  let input: ContainerInput;

  try {
    const stdinData = await readStdin();
    input = JSON.parse(stdinData);
    log(`Received input for group: ${input.groupFolder}`);
  } catch (err) {
    writeOutput({
      status: 'error',
      result: null,
      error: `Failed to parse input: ${err instanceof Error ? err.message : String(err)}`
    });
    process.exit(1);
  }

  const ipcMcp = createIpcMcp({
    chatJid: input.chatJid,
    groupFolder: input.groupFolder,
    isMain: input.isMain
  });

  let result: string | null = null;
  let newSessionId: string | undefined;

  // Add context for scheduled tasks
  let prompt = input.prompt;
  if (input.isScheduledTask) {
    prompt = `[SCHEDULED TASK - You are running automatically, not in response to a user message. Use mcp__nanoclaw__send_message if needed to communicate with the user.]\n\n${input.prompt}`;
  }

  try {
    log('Starting agent...');

    for await (const message of query({
      prompt,
      options: {
        cwd: '/workspace/group',
        resume: input.sessionId,
        allowedTools: [
          'Bash',
          'Read', 'Write', 'Edit', 'Glob', 'Grep',
          'WebSearch', 'WebFetch',
          'mcp__nanoclaw__*'
        ],
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        settingSources: ['project'],
        mcpServers: {
          nanoclaw: ipcMcp
        },
        hooks: {
          PreCompact: [{ hooks: [createPreCompactHook()] }]
        }
      }
    })) {
      if (message.type === 'system' && message.subtype === 'init') {
        newSessionId = message.session_id;
        log(`Session initialized: ${newSessionId}`);
      }

      if ('result' in message && message.result) {
        result = message.result as string;
      }
    }

    log('Agent completed successfully');
    writeOutput({
      status: 'success',
      result,
      newSessionId
    });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    log(`Agent error: ${errorMessage}`);
    writeOutput({
      status: 'error',
      result: null,
      newSessionId,
      error: errorMessage
    });
    process.exit(1);
  }
}
```

**功能说明**:

1. **输入解析** (行 206-217):
   - 从 stdin 读取 JSON 配置
   - 解析失败时返回错误并退出

2. **创建 IPC MCP 服务器** (行 219-223):
   - 调用 `createIpcMcp()` 创建 MCP 服务器
   - 传递上下文信息（chatJid、groupFolder、isMain）

3. **定时任务上下文** (行 229-232):
   - 如果是定时任务，在 prompt 前添加特殊标记
   - 提示 Agent 这是自动运行，需要主动使用 `mcp__nanoclaw__send_message` 通信

4. **Claude Agent SDK 启动** (行 237-267):
   - 使用 `query()` 函数启动 Agent
   - 配置工作目录、允许的工具、权限模式等
   - 注册 MCP 服务器和钩子函数

5. **消息迭代处理** (行 259-266):
   - 使用 `for await` 迭代处理消息流
   - 捕获 `init` 消息获取会话 ID
   - 捕获 `result` 字段获取最终回复

6. **结果返回** (行 269-286):
   - 成功时返回结果和会话 ID
   - 失败时返回错误信息

---

### 4. query() 迭代器模式

**文件**: `container/agent-runner/src/index.ts`
**行号**: 237-267

```typescript
for await (const message of query({
  prompt,
  options: {
    cwd: '/workspace/group',
    resume: input.sessionId,
    allowedTools: [
      'Bash',
      'Read', 'Write', 'Edit', 'Glob', 'Grep',
      'WebSearch', 'WebFetch',
      'mcp__nanoclaw__*'
    ],
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    settingSources: ['project'],
    mcpServers: {
      nanoclaw: ipcMcp
    },
    hooks: {
      PreCompact: [{ hooks: [createPreCompactHook()] }]
    }
  }
})) {
  if (message.type === 'system' && message.subtype === 'init') {
    newSessionId = message.session_id;
    log(`Session initialized: ${newSessionId}`);
  }

  if ('result' in message && message.result) {
    result = message.result as string;
  }
}
```

**功能说明**:

`query()` 是 Claude Agent SDK 提供的异步迭代器，用于执行 Agent 任务：

1. **迭代器模式**:
   - `query()` 返回一个异步生成器
   - 使用 `for await` 逐个处理消息
   - 消息类型包括：`system`、`tool_use`、`tool_result`、`text` 等

2. **关键消息类型**:
   - `system` + `init`: 会话初始化，包含 `session_id`
   - `result`: 最终回复文本

3. **配置选项**:
   - `cwd`: 工作目录（容器内路径）
   - `resume`: 恢复现有会话（可选）
   - `allowedTools`: 允许使用的工具列表
   - `permissionMode`: 权限模式（`bypassPermissions` 跳过权限检查）
   - `mcpServers`: MCP 服务器配置
   - `hooks`: 钩子函数（如 `PreCompact` 在对话压缩前触发）

4. **优势**:
   - 流式处理：实时接收消息，无需等待全部完成
   - 灵活控制：可以根据消息类型执行不同逻辑
   - 资源高效：避免阻塞，适合长时间运行的任务

---

### 5. 对话归档钩子

**文件**: `container/agent-runner/src/index.ts`
**行号**: 84-127

```typescript
function createPreCompactHook(): HookCallback {
  return async (input, _toolUseId, _context) => {
    const preCompact = input as PreCompactHookInput;
    const transcriptPath = preCompact.transcript_path;
    const sessionId = preCompact.session_id;

    if (!transcriptPath || !fs.existsSync(transcriptPath)) {
      log('No transcript found for archiving');
      return {};
    }

    try {
      const content = fs.readFileSync(transcriptPath, 'utf-8');
      const messages = parseTranscript(content);

      if (messages.length === 0) {
        log('No messages to archive');
        return {};
      }

      const summary = getSessionSummary(sessionId, transcriptPath);
      const name = summary ? sanitizeFilename(summary) : generateFallbackName();

      const conversationsDir = '/workspace/group/conversations';
      fs.mkdirSync(conversationsDir, { recursive: true });

      const date = new Date().toISOString().split('T')[0];
      const filename = `${date}-${name}.md`;
      const filePath = path.join(conversationsDir, filename);

      const markdown = formatTranscriptMarkdown(messages, summary);
      fs.writeFileSync(filePath, markdown);

      log(`Archived conversation to ${filePath}`);
    } catch (err) {
      log(`Failed to archive transcript: ${err instanceof Error ? err.message : String(err)}`);
    }

    return {};
  };
}
```

**功能说明**:

`createPreCompactHook()` 创建一个钩子函数，在对话压缩前自动归档：

1. **触发时机**:
   - 当 Claude Agent SDK 准备压缩对话时触发
   - 压缩会保留关键信息，但会丢失详细对话历史

2. **归档流程**:
   - 读取对话记录文件（transcript）
   - 解析消息内容
   - 从 `sessions-index.json` 获取对话摘要
   - 生成文件名（日期 + 摘要）
   - 写入 Markdown 格式的归档文件

3. **归档位置**:
   - `/workspace/group/conversations/` 目录
   - 文件名格式：`YYYY-MM-DD-summary.md`

4. **优势**:
   - 自动保存对话历史，避免丢失
   - Markdown 格式便于阅读和搜索
   - 按日期组织，便于查找

---

## ipc-mcp.ts - MCP 服务器分析

### 1. 概述

**文件**: `container/agent-runner/src/ipc-mcp.ts`
**行号**: 1-20

```typescript
/**
 * IPC-based MCP Server for NanoClaw
 * Writes messages and tasks to files for the host process to pick up
 */

import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { CronExpressionParser } from 'cron-parser';

const IPC_DIR = '/workspace/ipc';
const MESSAGES_DIR = path.join(IPC_DIR, 'messages');
const TASKS_DIR = path.join(IPC_DIR, 'tasks');

export interface IpcMcpContext {
  chatJid: string;
  groupFolder: string;
  isMain: boolean;
}
```

**功能说明**:

- **MCP (Model Context Protocol)**: Claude Agent SDK 的扩展协议，允许 Agent 调用自定义工具
- **IPC 实现**: 通过文件系统与 Host 进程通信
  - 容器写入文件到 `/workspace/ipc/`
  - Host 进程轮询读取并执行操作
- **目录结构**:
  - `/workspace/ipc/messages/`: 待发送的消息
  - `/workspace/ipc/tasks/`: 任务管理操作

---

### 2. IPC 文件写入

**文件**: `container/agent-runner/src/ipc-mcp.ts`
**行号**: 22-34

```typescript
function writeIpcFile(dir: string, data: object): string {
  fs.mkdirSync(dir, { recursive: true });

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
  const filepath = path.join(dir, filename);

  // Atomic write: temp file then rename
  const tempPath = `${filepath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
  fs.renameSync(tempPath, filepath);

  return filename;
}
```

**功能说明**:

- **原子写入**: 使用临时文件 + 重命名确保写入完整性
- **文件名格式**: `timestamp-random.json`
  - 时间戳确保唯一性
  - 随机后缀避免冲突
- **返回值**: 文件名，用于日志和调试

---

### 3. send_message 工具

**文件**: `container/agent-runner/src/ipc-mcp.ts`
**行号**: 43-67

```typescript
tool(
  'send_message',
  'Send a message to the current WhatsApp group. Use this to proactively share information or updates.',
  {
    text: z.string().describe('The message text to send')
  },
  async (args) => {
    const data = {
      type: 'message',
      chatJid,
      text: args.text,
      groupFolder,
      timestamp: new Date().toISOString()
    };

    const filename = writeIpcFile(MESSAGES_DIR, data);

    return {
      content: [{
        type: 'text',
        text: `Message queued for delivery (${filename})`
      }]
    };
  }
)
```

**功能说明**:

- **用途**: Agent 主动向 WhatsApp 群组发送消息
- **参数**:
  - `text`: 消息文本
- **IPC 数据结构**:
  ```json
  {
    "type": "message",
    "chatJid": "120363336345536173@g.us",
    "text": "Hello from Agent",
    "groupFolder": "family-chat",
    "timestamp": "2026-02-03T10:30:00.000Z"
  }
  ```
- **Host 处理**: 读取文件后通过 WhatsApp 发送消息

---

### 4. schedule_task 工具

**文件**: `container/agent-runner/src/ipc-mcp.ts`
**行号**: 69-147

```typescript
tool(
  'schedule_task',
  `Schedule a recurring or one-time task. The task will run as a full agent with access to all tools.

CONTEXT MODE - Choose based on task type:
• "group" (recommended for most tasks): Task runs in the group's conversation context, with access to chat history and memory. Use for tasks that need context about ongoing discussions, user preferences, or previous interactions.
• "isolated": Task runs in a fresh session with no conversation history. Use for independent tasks that don't need prior context. When using isolated mode, include all necessary context in the prompt itself.

If unsure which mode to use, ask the user. Examples:
- "Remind me about our discussion" → group (needs conversation context)
- "Check the weather every morning" → isolated (self-contained task)
- "Follow up on my request" → group (needs to know what was requested)
- "Generate a daily report" → isolated (just needs instructions in prompt)

SCHEDULE VALUE FORMAT (all times are LOCAL timezone):
• cron: Standard cron expression (e.g., "*/5 * * * *" for every 5 minutes, "0 9 * * *" for daily at 9am LOCAL time)
• interval: Milliseconds between runs (e.g., "300000" for 5 minutes, "3600000" for 1 hour)
• once: Local time WITHOUT "Z" suffix (e.g., "2026-02-01T15:30:00"). Do NOT use UTC/Z suffix.`,
  {
    prompt: z.string().describe('What the agent should do when the task runs. For isolated mode, include all necessary context here.'),
    schedule_type: z.enum(['cron', 'interval', 'once']).describe('cron=recurring at specific times, interval=recurring every N ms, once=run once at specific time'),
    schedule_value: z.string().describe('cron: "*/5 * * * *" | interval: milliseconds like "300000" | once: local timestamp like "2026-02-01T15:30:00" (no Z suffix!)'),
    context_mode: z.enum(['group', 'isolated']).default('group').describe('group=runs with chat history and memory, isolated=fresh session (include context in prompt)'),
    target_group: z.string().optional().describe('Target group folder (main only, defaults to current group)')
  },
  async (args) => {
    // Validate schedule_value before writing IPC
    if (args.schedule_type === 'cron') {
      try {
        CronExpressionParser.parse(args.schedule_value);
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Invalid cron: "${args.schedule_value}". Use format like "0 9 * * *" (daily 9am) or "*/5 * * * *" (every 5 min).` }],
          isError: true
        };
      }
    } else if (args.schedule_type === 'interval') {
      const ms = parseInt(args.schedule_value, 10);
      if (isNaN(ms) || ms <= 0) {
        return {
          content: [{ type: 'text', text: `Invalid interval: "${args.schedule_value}". Must be positive milliseconds (e.g., "300000" for 5 min).` }],
          isError: true
        };
      }
    } else if (args.schedule_type === 'once') {
      const date = new Date(args.schedule_value);
      if (isNaN(date.getTime())) {
        return {
          content: [{ type: 'text', text: `Invalid timestamp: "${args.schedule_value}". Use ISO 8601 format like "2026-02-01T15:30:00.000Z".` }],
          isError: true
        };
      }
    }

    // Non-main groups can only schedule for themselves
    const targetGroup = isMain && args.target_group ? args.target_group : groupFolder;

    const data = {
      type: 'schedule_task',
      prompt: args.prompt,
      schedule_type: args.schedule_type,
      schedule_value: args.schedule_value,
      context_mode: args.context_mode || 'group',
      groupFolder: targetGroup,
      chatJid,
      createdBy: groupFolder,
      timestamp: new Date().toISOString()
    };

    const filename = writeIpcFile(TASKS_DIR, data);

    return {
      content: [{
        type: 'text',
        text: `Task scheduled (${filename}): ${args.schedule_type} - ${args.schedule_value}`
      }]
    };
  }
)
```

**功能说明**:

- **用途**: Agent 创建定时任务
- **参数**:
  - `prompt`: 任务描述（isolated 模式需包含完整上下文）
  - `schedule_type`: 调度类型（`cron`、`interval`、`once`）
  - `schedule_value`: 调度值（cron 表达式、毫秒数、时间戳）
  - `context_mode`: 上下文模式（`group` 或 `isolated`）
  - `target_group`: 目标组（仅主组可指定）

- **验证逻辑**:
  - `cron`: 使用 `cron-parser` 验证表达式
  - `interval`: 验证为正整数
  - `once`: 验证为有效时间戳

- **权限控制**:
  - 非主组只能为自己创建任务
  - 主组可以为任何组创建任务

- **IPC 数据结构**:
  ```json
  {
    "type": "schedule_task",
    "prompt": "Send daily report",
    "schedule_type": "cron",
    "schedule_value": "0 9 * * *",
    "context_mode": "group",
    "groupFolder": "family-chat",
    "chatJid": "120363336345536173@g.us",
    "createdBy": "main",
    "timestamp": "2026-02-03T10:30:00.000Z"
  }
  ```

---

### 5. list_tasks 工具

**文件**: `container/agent-runner/src/ipc-mcp.ts`
**行号**: 150-201

```typescript
tool(
  'list_tasks',
  'List all scheduled tasks. From main: shows all tasks. From other groups: shows only that group\'s tasks.',
  {},
  async () => {
    const tasksFile = path.join(IPC_DIR, 'current_tasks.json');

    try {
      if (!fs.existsSync(tasksFile)) {
        return {
          content: [{
            type: 'text',
            text: 'No scheduled tasks found.'
          }]
        };
      }

      const allTasks = JSON.parse(fs.readFileSync(tasksFile, 'utf-8'));

      const tasks = isMain
        ? allTasks
        : allTasks.filter((t: { groupFolder: string }) => t.groupFolder === groupFolder);

      if (tasks.length === 0) {
        return {
          content: [{
            type: 'text',
            text: 'No scheduled tasks found.'
          }]
        };
      }

      const formatted = tasks.map((t: { id: string; prompt: string; schedule_type: string; schedule_value: string; status: string; next_run: string }) =>
        `- [${t.id}] ${t.prompt.slice(0, 50)}... (${t.schedule_type}: ${t.schedule_value}) - ${t.status}, next: ${t.next_run || 'N/A'}`
      ).join('\n');

      return {
        content: [{
          type: 'text',
          text: `Scheduled tasks:\n${formatted}`
        }]
      };
    } catch (err) {
      return {
        content: [{
          type: 'text',
          text: `Error reading tasks: ${err instanceof Error ? err.message : String(err)}`
        }]
      };
    }
  }
)
```

**功能说明**:

- **用途**: Agent 查询定时任务列表
- **权限控制**:
  - 主组：查看所有任务
  - 其他组：仅查看自己的任务
- **数据来源**: `/workspace/ipc/current_tasks.json`（由 Host 进程维护）
- **输出格式**: 文本列表，包含任务 ID、摘要、调度信息、状态、下次运行时间

---

### 6. pause_task / resume_task / cancel_task 工具

**文件**: `container/agent-runner/src/ipc-mcp.ts`
**行号**: 203-279

```typescript
tool(
  'pause_task',
  'Pause a scheduled task. It will not run until resumed.',
  {
    task_id: z.string().describe('The task ID to pause')
  },
  async (args) => {
    const data = {
      type: 'pause_task',
      taskId: args.task_id,
      groupFolder,
      isMain,
      timestamp: new Date().toISOString()
    };

    writeIpcFile(TASKS_DIR, data);

    return {
      content: [{
        type: 'text',
        text: `Task ${args.task_id} pause requested.`
      }]
    };
  }
)

tool(
  'resume_task',
  'Resume a paused task.',
  {
    task_id: z.string().describe('The task ID to resume')
  },
  async (args) => {
    const data = {
      type: 'resume_task',
      taskId: args.task_id,
      groupFolder,
      isMain,
      timestamp: new Date().toISOString()
    };

    writeIpcFile(TASKS_DIR, data);

    return {
      content: [{
        type: 'text',
        text: `Task ${args.task_id} resume requested.`
      }]
    };
  }
)

tool(
  'cancel_task',
  'Cancel and delete a scheduled task.',
  {
    task_id: z.string().describe('The task ID to cancel')
  },
  async (args) => {
    const data = {
      type: 'cancel_task',
      taskId: args.task_id,
      groupFolder,
      isMain,
      timestamp: new Date().toISOString()
    };

    writeIpcFile(TASKS_DIR, data);

    return {
      content: [{
        type: 'text',
        text: `Task ${args.task_id} cancellation requested.`
      }]
    };
  }
)
```

**功能说明**:

- **用途**: Agent 管理定时任务状态
- **参数**:
  - `task_id`: 任务 ID
- **IPC 数据结构**:
  ```json
  {
    "type": "pause_task",
    "taskId": "task-123",
    "groupFolder": "family-chat",
    "isMain": false,
    "timestamp": "2026-02-03T10:30:00.000Z"
  }
  ```
- **Host 处理**: 读取文件后更新任务状态

---

### 7. register_group 工具

**文件**: `container/agent-runner/src/ipc-mcp.ts`
**行号**: 281-318

```typescript
tool(
  'register_group',
  `Register a new WhatsApp group so the agent can respond to messages there. Main group only.

Use available_groups.json to find the JID for a group. The folder name should be lowercase with hyphens (e.g., "family-chat").`,
  {
    jid: z.string().describe('The WhatsApp JID (e.g., "120363336345536173@g.us")'),
    name: z.string().describe('Display name for the group'),
    folder: z.string().describe('Folder name for group files (lowercase, hyphens, e.g., "family-chat")'),
    trigger: z.string().describe('Trigger word (e.g., "@Andy")')
  },
  async (args) => {
    if (!isMain) {
      return {
        content: [{ type: 'text', text: 'Only the main group can register new groups.' }],
        isError: true
      };
    }

    const data = {
      type: 'register_group',
      jid: args.jid,
      name: args.name,
      folder: args.folder,
      trigger: args.trigger,
      timestamp: new Date().toISOString()
    };

    writeIpcFile(TASKS_DIR, data);

    return {
      content: [{
        type: 'text',
        text: `Group "${args.name}" registered. It will start receiving messages immediately.`
      }]
    };
  }
)
```

**功能说明**:

- **用途**: 主组注册新的 WhatsApp 群组
- **权限控制**: 仅主组可用
- **参数**:
  - `jid`: WhatsApp 群组 JID
  - `name`: 显示名称
  - `folder`: 文件夹名称（小写，连字符分隔）
  - `trigger`: 触发词（如 `@Andy`）
- **数据来源**: `/workspace/ipc/available_groups.json`（由 Host 进程维护）
- **IPC 数据结构**:
  ```json
  {
    "type": "register_group",
    "jid": "120363336345536173@g.us",
    "name": "Family Chat",
    "folder": "family-chat",
    "trigger": "@Andy",
    "timestamp": "2026-02-03T10:30:00.000Z"
  }
  ```

---

## Host 和 Container 协作流程

### 1. 容器启动流程

```
Host 进程 (src/container-runner.ts)
  │
  ├─> buildVolumeMounts() - 构建挂载配置
  │   ├─> /workspace/group -> groups/{folder}/
  │   ├─> /workspace/ipc -> data/ipc/{folder}/
  │   └─> /home/node/.claude -> data/sessions/{folder}/.claude/
  │
  ├─> spawn('container', args) - 启动容器
  │
  └─> stdin.write(JSON.stringify(input)) - 传递配置
      │
      ▼
Container 进程 (container/agent-runner/src/index.ts)
  │
  ├─> readStdin() - 读取配置
  │
  ├─> createIpcMcp() - 创建 MCP 服务器
  │
  ├─> query() - 启动 Claude Agent SDK
  │   │
  │   ├─> Agent 调用工具（如 mcp__nanoclaw__send_message）
  │   │   │
  │   │   └─> writeIpcFile() - 写入 IPC 文件
  │   │       │
  │   │       ▼
  │   │   Host 进程轮询读取 IPC 文件
  │   │   └─> 执行操作（发送 WhatsApp 消息）
  │   │
  │   └─> 返回最终结果
  │
  └─> writeOutput() - 返回结果
      │
      ▼
Host 进程
  └─> 解析 stdout，提取 JSON 结果
```

### 2. IPC 通信机制

**容器侧** (`container/agent-runner/src/ipc-mcp.ts`):
- Agent 调用 MCP 工具（如 `send_message`）
- 工具函数调用 `writeIpcFile()` 写入 JSON 文件
- 文件路径：`/workspace/ipc/messages/` 或 `/workspace/ipc/tasks/`

**Host 侧** (`src/container-runner.ts`):
- 轮询读取 `/workspace/ipc/` 目录
- 解析 JSON 文件，执行相应操作
- 删除已处理的文件

**优势**:
- 简单可靠：无需复杂的网络协议
- 容错性强：文件系统持久化，重启不丢失
- 安全隔离：容器只能写入指定目录

### 3. 会话管理

**会话 ID 流程**:
1. 首次运行：`query()` 返回 `init` 消息，包含 `session_id`
2. 容器将 `newSessionId` 返回给 Host
3. Host 保存 `session_id` 到数据库
4. 后续运行：Host 传递 `sessionId`，Agent 恢复对话上下文

**会话隔离**:
- 每个组有独立的 `.claude/` 目录
- 会话文件存储在 `data/sessions/{folder}/.claude/`
- 防止跨组会话泄露

---

## 总结

### 关键设计决策

1. **双层架构**:
   - Host 负责调度和资源管理
   - Container 负责执行和隔离
   - 通过 stdin/stdout 和文件系统通信

2. **Claude Agent SDK 集成**:
   - 使用 `query()` 迭代器模式流式处理消息
   - MCP 协议扩展工具能力
   - 钩子函数实现对话归档

3. **IPC 通信**:
   - 文件系统作为通信媒介
   - 原子写入确保数据完整性
   - 轮询读取简化实现

4. **安全隔离**:
   - 每个组独立的容器和文件系统
   - 权限控制（主组 vs 其他组）
   - 挂载点限制访问范围

### 扩展点

- **新增 MCP 工具**: 在 `ipc-mcp.ts` 中添加新的 `tool()` 定义
- **自定义钩子**: 在 `index.ts` 中添加新的钩子函数
- **修改 IPC 协议**: 调整 `writeIpcFile()` 和 Host 侧的读取逻辑
