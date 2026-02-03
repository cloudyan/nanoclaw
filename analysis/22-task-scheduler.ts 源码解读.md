# task-scheduler.ts 源码解读

## 概述

`src/task-scheduler.ts` 是 NanoClaw 的任务调度器模块，负责管理和执行计划任务。该模块约 142 行代码，实现了基于 cron 表达式、固定间隔和一次性执行的任务调度功能。

**核心职责**：
- 定期轮询数据库查找到期任务
- 在隔离的容器环境中执行任务
- 记录任务执行日志和结果
- 计算下次运行时间并更新任务状态

**关键依赖**：
- `cron-parser`：解析 cron 表达式
- `./db.ts`：数据库操作（获取任务、更新状态、记录日志）
- `./container-runner.ts`：在容器中运行 Claude Agent

---

## 核心数据结构

### SchedulerDependencies 接口

**文件路径**：`src/task-scheduler.ts:16-20`

```typescript
export interface SchedulerDependencies {
  sendMessage: (jid: string, text: string) => Promise<void>;
  registeredGroups: () => Record<string, RegisteredGroup>;
  getSessions: () => Record<string, string>;
}
```

**功能说明**：
调度器依赖的外部服务接口，用于：
- `sendMessage`：向 WhatsApp 发送消息
- `registeredGroups`：获取已注册的组列表
- `getSessions`：获取各组的会话 ID（用于组上下文模式）

---

## 关键函数详解

### 1. runTask - 执行单个任务

**文件路径**：`src/task-scheduler.ts:22-112`

```typescript
async function runTask(task: ScheduledTask, deps: SchedulerDependencies): Promise<void> {
  const startTime = Date.now();
  const groupDir = path.join(GROUPS_DIR, task.group_folder);
  fs.mkdirSync(groupDir, { recursive: true });

  logger.info({ taskId: task.id, group: task.group_folder }, 'Running scheduled task');

  const groups = deps.registeredGroups();
  const group = Object.values(groups).find(g => g.folder === task.group_folder);

  if (!group) {
    logger.error({ taskId: task.id, groupFolder: task.group_folder }, 'Group not found for task');
    logTaskRun({
      task_id: task.id,
      run_at: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      status: 'error',
      result: null,
      error: `Group not found: ${task.group_folder}`
    });
    return;
  }

  // Update tasks snapshot for container to read (filtered by group)
  // 更新任务快照供容器读取（按组过滤）
  const isMain = task.group_folder === MAIN_GROUP_FOLDER;
  const tasks = getAllTasks();
  writeTasksSnapshot(task.group_folder, isMain, tasks.map(t => ({
    id: t.id,
    groupFolder: t.group_folder,
    prompt: t.prompt,
    schedule_type: t.schedule_type,
    schedule_value: t.schedule_value,
    status: t.status,
    next_run: t.next_run
  })));

  let result: string | null = null;
  let error: string | null = null;

  // For group context mode, use the group's current session
  // 组上下文模式使用该组的当前会话
  const sessions = deps.getSessions();
  const sessionId = task.context_mode === 'group' ? sessions[task.group_folder] : undefined;

  try {
    const output = await runContainerAgent(group, {
      prompt: task.prompt,
      sessionId,
      groupFolder: task.group_folder,
      chatJid: task.chat_jid,
      isMain,
      isScheduledTask: true
    });

    if (output.status === 'error') {
      error = output.error || 'Unknown error';
    } else {
      result = output.result;
    }

    logger.info({ taskId: task.id, durationMs: Date.now() - startTime }, 'Task completed');
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    logger.error({ taskId: task.id, error }, 'Task failed');
  }

  const durationMs = Date.now() - startTime;

  logTaskRun({
    task_id: task.id,
    run_at: new Date().toISOString(),
    duration_ms: durationMs,
    status: error ? 'error' : 'success',
    result,
    error
  });

  let nextRun: string | null = null;
  if (task.schedule_type === 'cron') {
    const interval = CronExpressionParser.parse(task.schedule_value, { tz: TIMEZONE });
    nextRun = interval.next().toISOString();
  } else if (task.schedule_type === 'interval') {
    const ms = parseInt(task.schedule_value, 10);
    nextRun = new Date(Date.now() + ms).toISOString();
  }
  // 'once' tasks have no next run

  const resultSummary = error ? `Error: ${error}` : (result ? result.slice(0, 200) : 'Completed');
  updateTaskAfterRun(task.id, nextRun, resultSummary);
}
```

**功能说明**：
执行单个计划任务的完整流程，包括准备、执行、记录和更新。

**执行步骤**：

1. **初始化环境**（第 23-27 行）
   - 记录开始时间
   - 创建组目录（如果不存在）
   - 记录日志

2. **验证组存在性**（第 29-43 行）
   - 从依赖中获取已注册的组
   - 查找任务对应的组
   - 如果组不存在，记录错误日志并返回

3. **更新任务快照**（第 45-57 行）
   - 获取所有任务
   - 写入任务快照供容器读取
   - 快照按组过滤，只包含必要字段

4. **准备会话上下文**（第 62-65 行）
   - 如果任务使用组上下文模式（`context_mode === 'group'`），获取该组的会话 ID
   - 否则使用隔离模式（每次执行都是新会话）

5. **执行容器代理**（第 67-87 行）
   - 调用 `runContainerAgent` 在隔离容器中运行 Claude Agent
   - 传递任务提示词、会话 ID、组信息等
   - 捕获执行结果或错误

6. **记录执行日志**（第 89-98 行）
   - 计算执行时长
   - 调用 `logTaskRun` 记录到 `task_run_logs` 表
   - 记录状态（success/error）、结果、错误信息

7. **计算下次运行时间**（第 100-107 行）
   - **cron 类型**：使用 `cron-parser` 解析表达式，计算下次执行时间
   - **interval 类型**：在当前时间基础上增加间隔毫秒数
   - **once 类型**：不设置下次运行时间（任务将标记为 completed）

8. **更新任务状态**（第 110-111 行）
   - 调用 `updateTaskAfterRun` 更新任务的 `next_run`、`last_run`、`last_result`
   - 如果 `nextRun` 为 null（once 类型），状态自动变为 `completed`

---

### 2. startSchedulerLoop - 启动调度循环

**文件路径**：`src/task-scheduler.ts:114-141`

```typescript
export function startSchedulerLoop(deps: SchedulerDependencies): void {
  logger.info('Scheduler loop started');

  const loop = async () => {
    try {
      const dueTasks = getDueTasks();
      if (dueTasks.length > 0) {
        logger.info({ count: dueTasks.length }, 'Found due tasks');
      }

      for (const task of dueTasks) {
        // Re-check task status in case it was paused/cancelled
        const currentTask = getTaskById(task.id);
        if (!currentTask || currentTask.status !== 'active') {
          continue;
        }

        await runTask(currentTask, deps);
      }
    } catch (err) {
      logger.error({ err }, 'Error in scheduler loop');
    }

    setTimeout(loop, SCHEDULER_POLL_INTERVAL);
  };

  loop();
}
```

**功能说明**：
启动无限循环，定期检查并执行到期任务。

**执行流程**：

1. **初始化**（第 115 行）
   - 记录调度器启动日志

2. **定义循环函数**（第 117-138 行）
   - **获取到期任务**（第 119 行）：调用 `getDueTasks()` 查询数据库
   - **记录日志**（第 120-122 行）：如果找到到期任务，记录数量
   - **遍历执行任务**（第 124-132 行）：
     - 重新查询任务状态（防止任务在轮询间隔内被暂停/取消）
     - 如果任务不存在或状态不是 `active`，跳过
     - 调用 `runTask` 执行任务
   - **错误处理**（第 133-135 行）：捕获并记录循环中的错误
   - **设置下次轮询**（第 137 行）：使用 `setTimeout` 在 `SCHEDULER_POLL_INTERVAL`（60000ms = 1 分钟）后再次执行

3. **启动循环**（第 140 行）
   - 立即执行第一次循环

**关键设计**：
- 使用递归 `setTimeout` 而非 `setInterval`，确保每次执行完成后才设置下次轮询
- 每次执行前重新查询任务状态，避免竞态条件
- 错误不会中断循环，保证调度器持续运行

---

### 3. getDueTasks - 获取到期任务

**文件路径**：`src/db.ts:251-258`

```typescript
export function getDueTasks(): ScheduledTask[] {
  const now = new Date().toISOString();
  return db.prepare(`
    SELECT * FROM scheduled_tasks
    WHERE status = 'active' AND next_run IS NOT NULL AND next_run <= ?
    ORDER BY next_run
  `).all(now) as ScheduledTask[];
}
```

**功能说明**：
从数据库查询所有需要立即执行的任务。

**查询条件**：
- `status = 'active'`：只查询活跃状态的任务
- `next_run IS NOT NULL`：排除没有下次运行时间的任务
- `next_run <= ?`：下次运行时间小于等于当前时间

**排序**：按 `next_run` 升序排列，确保最早的任务先执行

---

### 4. updateTaskAfterRun - 任务执行后更新

**文件路径**：`src/db.ts:260-267`

```typescript
export function updateTaskAfterRun(id: string, nextRun: string | null, lastResult: string): void {
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE scheduled_tasks
    SET next_run = ?, last_run = ?, last_result = ?, status = CASE WHEN ? IS NULL THEN 'completed' ELSE status END
    WHERE id = ?
  `).run(nextRun, now, lastResult, nextRun, id);
}
```

**功能说明**：
更新任务执行后的状态和下次运行时间。

**更新字段**：
- `next_run`：下次运行时间（可能为 null）
- `last_run`：最后执行时间（当前时间）
- `last_result`：执行结果摘要（前 200 字符）
- `status`：如果 `nextRun` 为 null，状态变为 `completed`，否则保持原状态

**状态转换逻辑**：
- `active` → `completed`：当 `nextRun` 为 null 时（once 类型任务执行完毕）
- `active` → `active`：当 `nextRun` 不为 null 时（cron/interval 类型任务继续执行）

---

### 5. logTaskRun - 记录任务运行日志

**文件路径**：`src/db.ts:269-274`

```typescript
export function logTaskRun(log: TaskRunLog): void {
  db.prepare(`
    INSERT INTO task_run_logs (task_id, run_at, duration_ms, status, result, error)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(log.task_id, log.run_at, log.duration_ms, log.status, log.result, log.error);
}
```

**功能说明**：
将每次任务执行的详细信息记录到 `task_run_logs` 表。

**记录字段**：
- `task_id`：任务 ID
- `run_at`：执行时间（ISO 8601 格式）
- `duration_ms`：执行时长（毫秒）
- `status`：执行状态（success/error）
- `result`：执行结果（成功时的输出）
- `error`：错误信息（失败时的错误消息）

**用途**：
- 任务执行历史追踪
- 性能监控和分析
- 问题排查和调试

---

## 三种调度类型详解

### 1. Cron 调度

**文件路径**：`src/task-scheduler.ts:101-103`

```typescript
if (task.schedule_type === 'cron') {
  const interval = CronExpressionParser.parse(task.schedule_value, { tz: TIMEZONE });
  nextRun = interval.next().toISOString();
}
```

**功能说明**：
基于 cron 表达式的灵活调度，支持复杂的定时规则。

**示例**：
- `0 9 * * 1-5`：工作日早上 9 点
- `0 */6 * * *`：每 6 小时
- `0 0 * * 0`：每周日午夜

**实现细节**：
- 使用 `cron-parser` 库解析表达式
- 支持时区配置（`TIMEZONE` 环境变量）
- 调用 `interval.next()` 获取下次执行时间

---

### 2. Interval 调度

**文件路径**：`src/task-scheduler.ts:104-107`

```typescript
else if (task.schedule_type === 'interval') {
  const ms = parseInt(task.schedule_value, 10);
  nextRun = new Date(Date.now() + ms).toISOString();
}
```

**功能说明**：
基于固定间隔的简单调度，从当前时间开始计算。

**示例**：
- `3600000`：每小时（60 分钟 × 60 秒 × 1000 毫秒）
- `86400000`：每天（24 小时 × 60 分钟 × 60 秒 × 1000 毫秒）
- `604800000`：每周（7 天 × 24 小时 × 60 分钟 × 60 秒 × 1000 毫秒）

**实现细节**：
- `schedule_value` 为毫秒数（字符串格式）
- 使用 `parseInt` 转换为整数
- 在当前时间基础上增加间隔时间

---

### 3. One-time 调度

**文件路径**：`src/task-scheduler.ts:108`

```typescript
// 'once' tasks have no next run
```

**功能说明**：
一次性执行的任务，执行后不再重复。

**实现细节**：
- 不计算 `nextRun`，保持为 `null`
- `updateTaskAfterRun` 检测到 `nextRun` 为 null 时，自动将状态设为 `completed`
- 适用于单次执行的场景，如一次性数据迁移、临时报告等

---

## 任务状态转换

### 状态定义

任务在 `scheduled_tasks` 表中的 `status` 字段有以下取值：

| 状态 | 说明 |
|------|------|
| `active` | 活跃状态，任务会被调度器执行 |
| `paused` | 暂停状态，任务不会被调度器执行 |
| `completed` | 已完成，一次性任务执行完毕后的状态 |

### 状态转换图

```
创建任务
   ↓
[active] ←→ [paused]
   ↓
[completed]
```

### 转换场景

1. **创建任务**（`src/db.ts:199-215`）
   - 新任务默认状态为 `active`
   - `status` 字段默认值为 `'active'`

2. **暂停任务**（用户操作）
   - 通过 `updateTask` 将状态改为 `paused`
   - 调度器会跳过 `paused` 状态的任务（`src/task-scheduler.ts:127-129`）

3. **恢复任务**（用户操作）
   - 通过 `updateTask` 将状态改回 `active`
   - 调度器会重新执行该任务

4. **任务完成**（自动转换）
   - 一次性任务（`once` 类型）执行完毕后
   - `updateTaskAfterRun` 检测到 `nextRun` 为 null 时自动转换（`src/db.ts:264`）
   - SQL：`status = CASE WHEN ? IS NULL THEN 'completed' ELSE status END`

5. **循环任务**（保持活跃）
   - cron 和 interval 类型任务执行后
   - `nextRun` 不为 null，状态保持 `active`
   - 任务会继续被调度执行

---

## 错误处理机制

### 1. 组不存在错误

**文件路径**：`src/task-scheduler.ts:32-43`

```typescript
if (!group) {
  logger.error({ taskId: task.id, groupFolder: task.group_folder }, 'Group not found for task');
  logTaskRun({
    task_id: task.id,
    run_at: new Date().toISOString(),
    duration_ms: Date.now() - startTime,
    status: 'error',
    result: null,
    error: `Group not found: ${task.group_folder}`
  });
  return;
}
```

**处理方式**：
- 记录错误日志
- 记录任务执行日志（status: 'error'）
- 提前返回，不执行任务

---

### 2. 容器执行错误

**文件路径**：`src/task-scheduler.ts:77-87`

```typescript
if (output.status === 'error') {
  error = output.error || 'Unknown error';
} else {
  result = output.result;
}

logger.info({ taskId: task.id, durationMs: Date.now() - startTime }, 'Task completed');
} catch (err) {
  error = err instanceof Error ? err.message : String(err);
  logger.error({ taskId: task.id, error }, 'Task failed');
}
```

**处理方式**：
- 捕获容器执行过程中的异常
- 记录错误信息到 `error` 变量
- 记录错误日志
- 任务执行日志中标记为 `status: 'error'`

---

### 3. 调度循环错误

**文件路径**：`src/task-scheduler.ts:133-135`

```typescript
} catch (err) {
  logger.error({ err }, 'Error in scheduler loop');
}
```

**处理方式**：
- 捕获循环中的任何错误
- 记录错误日志
- **不中断循环**，继续设置下次轮询（第 137 行）

**设计理念**：
- 调度器必须持续运行，单个任务的错误不应影响其他任务
- 错误信息记录到日志，供后续排查

---

## 配置参数

### SCHEDULER_POLL_INTERVAL

**文件路径**：`src/config.ts:5`

```typescript
export const SCHEDULER_POLL_INTERVAL = 60000;
```

**功能说明**：
调度器轮询间隔，默认为 60000 毫秒（1 分钟）。

**影响**：
- 决定了任务执行的时间精度
- 间隔越短，任务执行越及时，但系统开销越大
- 间隔越长，系统开销越小，但任务执行可能有延迟

---

### TIMEZONE

**文件路径**：`src/config.ts:32`

```typescript
export const TIMEZONE = process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone;
```

**功能说明**：
任务调度使用的时区，默认为系统时区。

**用途**：
- cron 表达式解析时使用
- 确保任务在用户期望的时间执行

**配置方式**：
- 通过环境变量 `TZ` 设置
- 示例：`TZ='Asia/Shanghai'` 或 `TZ='America/New_York'`

---

## 数据库表结构

### scheduled_tasks 表

**文件路径**：`src/db.ts:34-46`

```sql
CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id TEXT PRIMARY KEY,
  group_folder TEXT NOT NULL,
  chat_jid TEXT NOT NULL,
  prompt TEXT NOT NULL,
  schedule_type TEXT NOT NULL,
  schedule_value TEXT NOT NULL,
  next_run TEXT,
  last_run TEXT,
  last_result TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT NOT NULL
);
```

**关键字段**：
- `schedule_type`：调度类型（cron/interval/once）
- `schedule_value`：调度值（cron 表达式或毫秒数）
- `next_run`：下次运行时间（ISO 8601 格式）
- `status`：任务状态（active/paused/completed）
- `context_mode`：上下文模式（isolated/group）

**索引**：
- `idx_next_run`：加速到期任务查询
- `idx_status`：加速状态过滤

---

### task_run_logs 表

**文件路径**：`src/db.ts:50-60`

```sql
CREATE TABLE IF NOT EXISTS task_run_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL,
  run_at TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  status TEXT NOT NULL,
  result TEXT,
  error TEXT,
  FOREIGN KEY (task_id) REFERENCES scheduled_tasks(id)
);
```

**用途**：
- 记录每次任务执行的详细信息
- 支持任务执行历史查询
- 用于性能监控和问题排查

**索引**：
- `idx_task_run_logs`：加速按任务 ID 和时间查询

---

## 总结

`src/task-scheduler.ts` 是一个简洁而强大的任务调度器，具有以下特点：

**设计优势**：
1. **简洁性**：仅 142 行代码，易于理解和维护
2. **可靠性**：完善的错误处理，调度器不会因单个任务失败而中断
3. **灵活性**：支持三种调度类型，满足不同场景需求
4. **隔离性**：任务在容器中执行，保证安全性
5. **可观测性**：详细的日志记录，便于监控和调试

**核心流程**：
1. 调度循环每分钟轮询一次
2. 查询数据库获取到期任务
3. 验证任务状态和组存在性
4. 在隔离容器中执行任务
5. 记录执行日志和结果
6. 计算下次运行时间并更新任务状态

**适用场景**：
- 定期报告生成
- 数据同步和备份
- 定时提醒和通知
- 自动化运维任务
