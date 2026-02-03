# container-runner.ts 源码解读

## 文件概述

`src/container-runner.ts` 是 NanoClaw 的容器运行器模块，负责在 Apple Container（或 Docker）中启动 Claude Agent SDK 容器，并处理进程间通信（IPC）。该文件约 448 行，实现了容器生命周期管理、卷挂载配置、输出解析和 IPC 快照写入等核心功能。

**核心职责**：
- 构建容器卷挂载配置（主组/非主组隔离）
- 启动容器并管理输入/输出流
- 解析容器输出（使用标记机制提取 JSON）
- 写入任务和组的 IPC 快照

---

## 关键常量与类型定义

### 输出标记常量

**src/container-runner.ts:28-31**

```typescript
// Sentinel markers for robust output parsing (must match agent-runner)
// 输出解析标记，用于从容器输出中提取 JSON 结果
const OUTPUT_START_MARKER = '---NANOCLAW_OUTPUT_START---';
const OUTPUT_END_MARKER = '---NANOCLAW_OUTPUT_END---';
```

**功能说明**：
- 定义了两个标记常量，用于从容器输出中提取 JSON 结果
- 这些标记必须与容器内的 `agent-runner` 保持一致
- 通过标记机制实现鲁棒的输出解析，避免将日志等非 JSON 内容误解析

### 类型定义

**src/container-runner.ts:41-61**

```typescript
export interface ContainerInput {
  prompt: string;
  sessionId?: string;
  groupFolder: string;
  chatJid: string;
  isMain: boolean;
  isScheduledTask?: boolean;
}

export interface ContainerOutput {
  status: 'success' | 'error';
  result: string | null;
  newSessionId?: string;
  error?: string;
}

interface VolumeMount {
  hostPath: string;
  containerPath: string;
  readonly?: boolean;
}
```

**功能说明**：
- `ContainerInput`：传递给容器的输入数据，包含提示词、会话 ID、组信息等
- `ContainerOutput`：容器返回的输出数据，包含状态、结果、错误信息等
- `VolumeMount`：卷挂载配置，定义主机路径到容器路径的映射

---

## 关键函数详解

### 1. getHomeDir() - 获取主目录

**src/container-runner.ts:33-39**

```typescript
function getHomeDir(): string {
  const home = process.env.HOME || os.homedir();
  if (!home) {
    throw new Error('Unable to determine home directory: HOME environment variable is not set and os.homedir() returned empty');
  }
  return home;
}
```

**功能说明**：
- 获取用户主目录路径
- 优先使用环境变量 `HOME`，回退到 `os.homedir()`
- 如果两者都失败，抛出错误

**设计考虑**：
- 确保在不同环境下都能正确获取主目录
- 提供明确的错误信息，便于调试

---

### 2. buildVolumeMounts() - 构建卷挂载配置（核心函数）

**src/container-runner.ts:63-160**

```typescript
function buildVolumeMounts(group: RegisteredGroup, isMain: boolean): VolumeMount[] {
  const mounts: VolumeMount[] = [];
  const homeDir = getHomeDir();
  const projectRoot = process.cwd();

  if (isMain) {
    // Main gets the entire project root mounted
    mounts.push({
      hostPath: projectRoot,
      containerPath: '/workspace/project',
      readonly: false
    });

    // Main also gets its group folder as the working directory
    mounts.push({
      hostPath: path.join(GROUPS_DIR, group.folder),
      containerPath: '/workspace/group',
      readonly: false
    });
  } else {
    // Other groups only get their own folder
    mounts.push({
      hostPath: path.join(GROUPS_DIR, group.folder),
      containerPath: '/workspace/group',
      readonly: false
    });

    // Global memory directory (read-only for non-main)
    // Apple Container only supports directory mounts, not file mounts
    const globalDir = path.join(GROUPS_DIR, 'global');
    if (fs.existsSync(globalDir)) {
      mounts.push({
        hostPath: globalDir,
        containerPath: '/workspace/global',
        readonly: true
      });
    }
  }

  // Per-group Claude sessions directory (isolated from other groups)
  // Each group gets their own .claude/ to prevent cross-group session access
  const groupSessionsDir = path.join(DATA_DIR, 'sessions', group.folder, '.claude');
  fs.mkdirSync(groupSessionsDir, { recursive: true });
  mounts.push({
    hostPath: groupSessionsDir,
    containerPath: '/home/node/.claude',
    readonly: false
  });

  // Per-group IPC namespace: each group gets its own IPC directory
  // This prevents cross-group privilege escalation via IPC
  const groupIpcDir = path.join(DATA_DIR, 'ipc', group.folder);
  fs.mkdirSync(path.join(groupIpcDir, 'messages'), { recursive: true });
  fs.mkdirSync(path.join(groupIpcDir, 'tasks'), { recursive: true });
  mounts.push({
    hostPath: groupIpcDir,
    containerPath: '/workspace/ipc',
    readonly: false
  });

  // Environment file directory (workaround for Apple Container -i env var bug)
  // Only expose specific auth variables needed by Claude Code, not the entire .env
  const envDir = path.join(DATA_DIR, 'env');
  fs.mkdirSync(envDir, { recursive: true });
  const envFile = path.join(projectRoot, '.env');
  if (fs.existsSync(envFile)) {
    const envContent = fs.readFileSync(envFile, 'utf-8');
    const allowedVars = ['CLAUDE_CODE_OAUTH_TOKEN', 'ANTHROPIC_API_KEY'];
    const filteredLines = envContent
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return false;
        return allowedVars.some(v => trimmed.startsWith(`${v}=`));
      });

    if (filteredLines.length > 0) {
      fs.writeFileSync(path.join(envDir, 'env'), filteredLines.join('\n') + '\n');
      mounts.push({
        hostPath: envDir,
        containerPath: '/workspace/env-dir',
        readonly: true
      });
    }
  }

  // Additional mounts validated against external allowlist (tamper-proof from containers)
  if (group.containerConfig?.additionalMounts) {
    const validatedMounts = validateAdditionalMounts(
      group.containerConfig.additionalMounts,
      group.name,
      isMain
    );
    mounts.push(...validatedMounts);
  }

  return mounts;
}
```

**功能说明**：
- 根据组类型（主组/非主组）构建不同的卷挂载配置
- 实现了严格的文件系统隔离，防止跨组访问

**挂载路径详解**：

| 容器路径 | 主组挂载 | 非主组挂载 | 说明 |
|---------|---------|-----------|------|
| `/workspace/project` | ✅ 项目根目录（读写） | ❌ | 主组可访问整个项目 |
| `/workspace/group` | ✅ 组目录（读写） | ✅ 组目录（读写） | 每个组的工作目录 |
| `/workspace/global` | ❌ | ✅ 全局内存（只读） | 非主组可读全局记忆 |
| `/home/node/.claude` | ✅ 会话目录（读写） | ✅ 会话目录（读写） | Claude 会话隔离 |
| `/workspace/ipc` | ✅ IPC 目录（读写） | ✅ IPC 目录（读写） | 进程间通信 |
| `/workspace/env-dir` | ✅ 环境变量（只读） | ✅ 环境变量（只读） | 认证令牌 |

**安全机制**：
1. **主组特权**：主组可以访问整个项目根目录，用于管理操作
2. **非主组隔离**：非主组只能访问自己的组目录和全局只读记忆
3. **会话隔离**：每个组有独立的 `.claude` 目录，防止跨组会话访问
4. **IPC 隔离**：每个组有独立的 IPC 命名空间，防止通过 IPC 进行权限提升
5. **环境变量过滤**：只暴露必要的认证变量（`CLAUDE_CODE_OAUTH_TOKEN`、`ANTHROPIC_API_KEY`），不泄露整个 `.env`
6. **额外挂载验证**：通过 `validateAdditionalMounts` 验证额外挂载，防止容器篡改

**设计考虑**：
- Apple Container 只支持目录挂载，不支持文件挂载（注释说明）
- 环境变量目录是 Apple Container `-i` 参数 bug 的变通方案
- 所有目录在挂载前都会自动创建（`recursive: true`）

---

### 3. buildContainerArgs() - 构建容器参数

**src/container-runner.ts:162-178**

```typescript
function buildContainerArgs(mounts: VolumeMount[]): string[] {
  const args: string[] = ['run', '-i', '--rm'];

  // Apple Container: --mount for readonly, -v for read-write
  // Apple Container 使用 --mount 挂载只读目录，-v 挂载读写目录
  for (const mount of mounts) {
    if (mount.readonly) {
      args.push('--mount', `type=bind,source=${mount.hostPath},target=${mount.containerPath},readonly`);
    } else {
      args.push('-v', `${mount.hostPath}:${mount.containerPath}`);
    }
  }

  args.push(CONTAINER_IMAGE);

  return args;
}
```

**功能说明**：
- 将卷挂载配置转换为 Apple Container CLI 参数
- 只读挂载使用 `--mount` 参数，读写挂载使用 `-v` 参数
- 容器运行后自动清理（`--rm`）

**参数示例**：
```bash
container run -i --rm \
  -v /path/to/project:/workspace/project \
  -v /path/to/groups/main:/workspace/group \
  --mount type=bind,source=/path/to/global,target=/workspace/global,readonly \
  nanoclaw-agent:latest
```

**设计考虑**：
- Apple Container 的参数格式与 Docker 类似，但有细微差异
- 使用 `-i` 保持标准输入打开，用于传递 JSON 输入

---

### 4. runContainerAgent() - 运行容器代理（核心函数）

**src/container-runner.ts:181-387**

```typescript
export async function runContainerAgent(
  group: RegisteredGroup,
  input: ContainerInput
): Promise<ContainerOutput> {
  const startTime = Date.now();

  const groupDir = path.join(GROUPS_DIR, group.folder);
  fs.mkdirSync(groupDir, { recursive: true });

  const mounts = buildVolumeMounts(group, input.isMain);
  const containerArgs = buildContainerArgs(mounts);

  logger.debug({
    group: group.name,
    mounts: mounts.map(m => `${m.hostPath} -> ${m.containerPath}${m.readonly ? ' (ro)' : ''}`),
    containerArgs: containerArgs.join(' ')
  }, 'Container mount configuration');

  logger.info({
    group: group.name,
    mountCount: mounts.length,
    isMain: input.isMain
  }, 'Spawning container agent');

  const logsDir = path.join(GROUPS_DIR, group.folder, 'logs');
  fs.mkdirSync(logsDir, { recursive: true });

  return new Promise((resolve) => {
    const container = spawn('container', containerArgs, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let stdoutTruncated = false;
    let stderrTruncated = false;

    container.stdin.write(JSON.stringify(input));
    container.stdin.end();

    container.stdout.on('data', (data) => {
      if (stdoutTruncated) return;
      const chunk = data.toString();
      const remaining = CONTAINER_MAX_OUTPUT_SIZE - stdout.length;
      if (chunk.length > remaining) {
        stdout += chunk.slice(0, remaining);
        stdoutTruncated = true;
        logger.warn({ group: group.name, size: stdout.length }, 'Container stdout truncated due to size limit');
      } else {
        stdout += chunk;
      }
    });

    container.stderr.on('data', (data) => {
      const chunk = data.toString();
      const lines = chunk.trim().split('\n');
      for (const line of lines) {
        if (line) logger.debug({ container: group.folder }, line);
      }
      if (stderrTruncated) return;
      const remaining = CONTAINER_MAX_OUTPUT_SIZE - stderr.length;
      if (chunk.length > remaining) {
        stderr += chunk.slice(0, remaining);
        stderrTruncated = true;
        logger.warn({ group: group.name, size: stderr.length }, 'Container stderr truncated due to size limit');
      } else {
        stderr += chunk;
      }
    });

    const timeout = setTimeout(() => {
      logger.error({ group: group.name }, 'Container timeout, killing');
      container.kill('SIGKILL');
      resolve({
        status: 'error',
        result: null,
        error: `Container timed out after ${CONTAINER_TIMEOUT}ms`
      });
    }, group.containerConfig?.timeout || CONTAINER_TIMEOUT);

    container.on('close', (code) => {
      clearTimeout(timeout);
      const duration = Date.now() - startTime;

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const logFile = path.join(logsDir, `container-${timestamp}.log`);
      const isVerbose = process.env.LOG_LEVEL === 'debug' || process.env.LOG_LEVEL === 'trace';

      const logLines = [
        `=== Container Run Log ===`,
        `Timestamp: ${new Date().toISOString()}`,
        `Group: ${group.name}`,
        `IsMain: ${input.isMain}`,
        `Duration: ${duration}ms`,
        `Exit Code: ${code}`,
        `Stdout Truncated: ${stdoutTruncated}`,
        `Stderr Truncated: ${stderrTruncated}`,
        ``
      ];

      if (isVerbose) {
        logLines.push(
          `=== Input ===`,
          JSON.stringify(input, null, 2),
          ``,
          `=== Container Args ===`,
          containerArgs.join(' '),
          ``,
          `=== Mounts ===`,
          mounts.map(m => `${m.hostPath} -> ${m.containerPath}${m.readonly ? ' (ro)' : ''}`).join('\n'),
          ``,
          `=== Stderr${stderrTruncated ? ' (TRUNCATED)' : ''} ===`,
          stderr,
          ``,
          `=== Stdout${stdoutTruncated ? ' (TRUNCATED)' : ''} ===`,
          stdout
        );
      } else {
        logLines.push(
          `=== Input Summary ===`,
          `Prompt length: ${input.prompt.length} chars`,
          `Session ID: ${input.sessionId || 'new'}`,
          ``,
          `=== Mounts ===`,
          mounts.map(m => `${m.containerPath}${m.readonly ? ' (ro)' : ''}`).join('\n'),
          ``
        );

        if (code !== 0) {
          logLines.push(
            `=== Stderr (last 500 chars) ===`,
            stderr.slice(-500),
            ``
          );
        }
      }

      fs.writeFileSync(logFile, logLines.join('\n'));
      logger.debug({ logFile, verbose: isVerbose }, 'Container log written');

      if (code !== 0) {
        logger.error({
          group: group.name,
          code,
          duration,
          stderr: stderr.slice(-500),
          logFile
        }, 'Container exited with error');

        resolve({
          status: 'error',
          result: null,
          error: `Container exited with code ${code}: ${stderr.slice(-200)}`
        });
        return;
      }

      try {
        // Extract JSON between sentinel markers for robust parsing
        const startIdx = stdout.indexOf(OUTPUT_START_MARKER);
        const endIdx = stdout.indexOf(OUTPUT_END_MARKER);

        let jsonLine: string;
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
          jsonLine = stdout.slice(startIdx + OUTPUT_START_MARKER.length, endIdx).trim();
        } else {
          // Fallback: last non-empty line (backwards compatibility)
          const lines = stdout.trim().split('\n');
          jsonLine = lines[lines.length - 1];
        }

        const output: ContainerOutput = JSON.parse(jsonLine);

        logger.info({
          group: group.name,
          duration,
          status: output.status,
          hasResult: !!output.result
        }, 'Container completed');

        resolve(output);
      } catch (err) {
        logger.error({
          group: group.name,
          stdout: stdout.slice(-500),
          error: err
        }, 'Failed to parse container output');

        resolve({
          status: 'error',
          result: null,
          error: `Failed to parse container output: ${err instanceof Error ? err.message : String(err)}`
        });
      }
    });

    container.on('error', (err) => {
      clearTimeout(timeout);
      logger.error({ group: group.name, error: err }, 'Container spawn error');
      resolve({
        status: 'error',
        result: null,
        error: `Container spawn error: ${err.message}`
      });
    });
  });
}
```

**功能说明**：
- 启动容器并管理其生命周期
- 处理输入/输出流，实现超时控制
- 解析容器输出，提取 JSON 结果
- 记录详细的运行日志

**执行流程**：

1. **初始化**（185-203行）：
   - 创建组目录
   - 构建卷挂载配置和容器参数
   - 记录调试信息

2. **启动容器**（208-219行）：
   - 使用 `spawn` 启动容器进程
   - 通过 stdin 传递 JSON 输入
   - 初始化输出缓冲区

3. **处理输出流**（221-249行）：
   - **stdout**：累积输出，超过 `CONTAINER_MAX_OUTPUT_SIZE` 时截断
   - **stderr**：逐行记录日志，同样有大小限制

4. **超时控制**（251-259行）：
   - 设置超时定时器（默认 `CONTAINER_TIMEOUT`）
   - 超时后强制终止容器（`SIGKILL`）
   - 返回错误状态

5. **容器退出处理**（261-386行）：
   - 清除超时定时器
   - 计算运行时长
   - 写入日志文件（根据 `LOG_LEVEL` 决定详细程度）
   - 如果退出码非 0，返回错误
   - **解析输出**（338-374行）：
     - 使用标记机制提取 JSON（优先）
     - 回退方案：最后一行非空内容（向后兼容）
     - 解析失败返回错误

6. **错误处理**（377-385行）：
   - 容器启动失败时清除超时
   - 返回错误状态

**输出解析机制**：

**src/container-runner.ts:338-350**

```typescript
// Extract JSON between sentinel markers for robust parsing
const startIdx = stdout.indexOf(OUTPUT_START_MARKER);
const endIdx = stdout.indexOf(OUTPUT_END_MARKER);

let jsonLine: string;
if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
  jsonLine = stdout.slice(startIdx + OUTPUT_START_MARKER.length, endIdx).trim();
} else {
  // Fallback: last non-empty line (backwards compatibility)
  const lines = stdout.trim().split('\n');
  jsonLine = lines[lines.length - 1];
}
```

**工作原理**：
1. 在 stdout 中查找 `OUTPUT_START_MARKER` 和 `OUTPUT_END_MARKER`
2. 提取两个标记之间的内容作为 JSON
3. 如果标记不存在，回退到最后一行（向后兼容）

**示例输出**：
```
Some debug logs...
---NANOCLAW_OUTPUT_START---
{"status":"success","result":"Hello from container!"}
---NANOCLAW_OUTPUT_END---
More logs...
```

**设计考虑**：
- 使用 Promise 封装异步操作
- 输出大小限制防止内存溢出
- 详细的日志记录便于调试
- 标记机制确保鲁棒的输出解析
- 超时控制防止容器挂起

---

### 5. writeTasksSnapshot() - 写入任务快照

**src/container-runner.ts:389-413**

```typescript
export function writeTasksSnapshot(
  groupFolder: string,
  isMain: boolean,
  tasks: Array<{
    id: string;
    groupFolder: string;
    prompt: string;
    schedule_type: string;
    schedule_value: string;
    status: string;
    next_run: string | null;
  }>
): void {
  // Write filtered tasks to the group's IPC directory
  const groupIpcDir = path.join(DATA_DIR, 'ipc', groupFolder);
  fs.mkdirSync(groupIpcDir, { recursive: true });

  // Main sees all tasks, others only see their own
  const filteredTasks = isMain
    ? tasks
    : tasks.filter(t => t.groupFolder === groupFolder);

  const tasksFile = path.join(groupIpcDir, 'current_tasks.json');
  fs.writeFileSync(tasksFile, JSON.stringify(filteredTasks, null, 2));
}
```

**功能说明**：
- 将任务快照写入组的 IPC 目录
- 主组可以看到所有任务，非主组只能看到自己的任务

**权限控制**：
- **主组**：`filteredTasks = tasks`（所有任务）
- **非主组**：`filteredTasks = tasks.filter(t => t.groupFolder === groupFolder)`（仅自己的任务）

**文件路径**：
- 主机路径：`{DATA_DIR}/ipc/{groupFolder}/current_tasks.json`
- 容器内路径：`/workspace/ipc/current_tasks.json`

**设计考虑**：
- 实现任务可见性隔离
- 主组可以管理所有组的任务
- 非主组只能查看和操作自己的任务

---

### 6. writeGroupsSnapshot() - 写入组快照

**src/container-runner.ts:430-447**

```typescript
/**
 * Write available groups snapshot for the container to read.
 * Only main group can see all available groups (for activation).
 * Non-main groups only see their own registration status.
 *
 * 写入可用组快照供容器读取
 * 只有主组可以看到所有可用组（用于激活其他组）
 */
export function writeGroupsSnapshot(
  groupFolder: string,
  isMain: boolean,
  groups: AvailableGroup[],
  registeredJids: Set<string>
): void {
  const groupIpcDir = path.join(DATA_DIR, 'ipc', groupFolder);
  fs.mkdirSync(groupIpcDir, { recursive: true });

  // Main sees all groups; others see nothing (they can't activate groups)
  const visibleGroups = isMain ? groups : [];

  const groupsFile = path.join(groupIpcDir, 'available_groups.json');
  fs.writeFileSync(groupsFile, JSON.stringify({
    groups: visibleGroups,
    lastSync: new Date().toISOString()
  }, null, 2));
}
```

**功能说明**：
- 将可用组快照写入组的 IPC 目录
- 主组可以看到所有可用组（用于激活其他组）
- 非主组看不到任何组（不能激活其他组）

**权限控制**：
- **主组**：`visibleGroups = groups`（所有组）
- **非主组**：`visibleGroups = []`（空数组）

**文件路径**：
- 主机路径：`{DATA_DIR}/ipc/{groupFolder}/available_groups.json`
- 容器内路径：`/workspace/ipc/available_groups.json`

**数据结构**：
```json
{
  "groups": [
    {
      "jid": "1234567890@s.whatsapp.net",
      "name": "Family Chat",
      "lastActivity": "2026-02-03T12:00:00.000Z",
      "isRegistered": true
    }
  ],
  "lastSync": "2026-02-03T12:00:00.000Z"
}
```

**设计考虑**：
- 实现组激活权限隔离
- 只有主组可以激活新组
- 非主组无法查看或激活其他组
- 包含 `lastSync` 时间戳，便于检测数据新鲜度

---

## 总结

### 核心设计原则

1. **文件系统隔离**：通过卷挂载实现严格的文件系统隔离，防止跨组访问
2. **权限最小化**：非主组只能访问必要的目录，主组拥有管理权限
3. **鲁棒的输出解析**：使用标记机制确保从容器输出中正确提取 JSON
4. **详细的日志记录**：记录容器运行的所有关键信息，便于调试
5. **超时控制**：防止容器挂起，确保系统稳定性

### 关键路径总结

| 路径 | 用途 | 权限 |
|------|------|------|
| `/workspace/project` | 项目根目录 | 主组读写 |
| `/workspace/group` | 组工作目录 | 所有组读写 |
| `/workspace/global` | 全局记忆 | 非主组只读 |
| `/home/node/.claude` | Claude 会话 | 所有组读写（隔离） |
| `/workspace/ipc` | IPC 通信 | 所有组读写（隔离） |
| `/workspace/env-dir` | 环境变量 | 所有组只读（过滤） |

### 输出标记机制

- **OUTPUT_START_MARKER**：`---NANOCLAW_OUTPUT_START---`
- **OUTPUT_END_MARKER**：`---NANOCLAW_OUTPUT_END---`
- **作用**：从容器输出中提取 JSON 结果，避免将日志等非 JSON 内容误解析
- **回退方案**：如果标记不存在，使用最后一行非空内容（向后兼容）

### 安全机制

1. **卷挂载隔离**：每个组只能访问挂载的目录
2. **会话隔离**：每个组有独立的 `.claude` 目录
3. **IPC 隔离**：每个组有独立的 IPC 命名空间
4. **环境变量过滤**：只暴露必要的认证变量
5. **额外挂载验证**：通过 `validateAdditionalMounts` 验证额外挂载
6. **权限控制**：主组可以管理所有任务和组，非主组只能操作自己的资源
