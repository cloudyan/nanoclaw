# src/mount-security.ts 源码解读

## 概述

`src/mount-security.ts` 是 NanoClaw 的核心安全模块，负责验证容器挂载请求。该模块通过外部 allowlist 机制防止容器代理访问敏感文件系统路径，确保容器隔离的安全性。

**关键特性：**
- Allowlist 存储在项目外部（`~/.config/nanoclaw/mount-allowlist.json`），防止容器代理修改安全配置
- 路径遍历防护（Path Traversal Protection）
- 符号链接解析（Symlink Resolution）
- 默认阻止敏感路径（SSH 密钥、凭证文件等）

---

## 模块结构

### 导入和初始化

```typescript
// src/mount-security.ts:13-22
import fs from 'fs';
import path from 'path';
import pino from 'pino';
import { MOUNT_ALLOWLIST_PATH } from './config.js';
import { AdditionalMount, MountAllowlist, AllowedRoot } from './types.js';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: { target: 'pino-pretty', options: { colorize: true } }
});
```

**功能说明：**
- 导入文件系统操作模块 `fs` 和路径处理模块 `path`
- 使用 `pino` 日志库记录安全事件
- 从 `config.js` 导入 allowlist 文件路径常量
- 从 `types.js` 导入类型定义

---

## 默认阻止模式

```typescript
// src/mount-security.ts:28-49
const DEFAULT_BLOCKED_PATTERNS = [
  '.ssh',
  '.gnupg',
  '.gpg',
  '.aws',
  '.azure',
  '.gcloud',
  '.kube',
  '.docker',
  'credentials',
  '.env',
  '.netrc',
  '.npmrc',
  '.pypirc',
  'id_rsa',
  'id_ed25519',
  'private_key',
  '.secret',
];
```

**功能说明：**
- 定义默认阻止的敏感路径模式
- 包含 SSH 密钥、GPG 密钥、云服务凭证、环境变量文件等
- 这些模式会与用户自定义的 blockedPatterns 合并
- 即使 allowlist 中未明确阻止，这些路径也会被自动拒绝

**安全意义：**
防止容器代理访问用户的敏感凭证和密钥文件，即使攻击者尝试通过路径遍历或符号链接绕过限制。

---

## 核心函数详解

### 1. loadMountAllowlist() - 加载挂载允许列表

```typescript
// src/mount-security.ts:56-113
export function loadMountAllowlist(): MountAllowlist | null {
  if (cachedAllowlist !== null) {
    return cachedAllowlist;
  }

  if (allowlistLoadError !== null) {
    // Already tried and failed, don't spam logs
    return null;
  }

  try {
    if (!fs.existsSync(MOUNT_ALLOWLIST_PATH)) {
      allowlistLoadError = `Mount allowlist not found at ${MOUNT_ALLOWLIST_PATH}`;
      logger.warn({ path: MOUNT_ALLOWLIST_PATH },
        'Mount allowlist not found - additional mounts will be BLOCKED. ' +
        'Create the file to enable additional mounts.');
      return null;
    }

    const content = fs.readFileSync(MOUNT_ALLOWLIST_PATH, 'utf-8');
    const allowlist = JSON.parse(content) as MountAllowlist;

    // Validate structure
    if (!Array.isArray(allowlist.allowedRoots)) {
      throw new Error('allowedRoots must be an array');
    }

    if (!Array.isArray(allowlist.blockedPatterns)) {
      throw new Error('blockedPatterns must be an array');
    }

    if (typeof allowlist.nonMainReadOnly !== 'boolean') {
      throw new Error('nonMainReadOnly must be a boolean');
    }

    // Merge with default blocked patterns
    const mergedBlockedPatterns = [
      ...new Set([...DEFAULT_BLOCKED_PATTERNS, ...allowlist.blockedPatterns])
    ];
    allowlist.blockedPatterns = mergedBlockedPatterns;

    cachedAllowlist = allowlist;
    logger.info({
      path: MOUNT_ALLOWLIST_PATH,
      allowedRoots: allowlist.allowedRoots.length,
      blockedPatterns: allowlist.blockedPatterns.length
    }, 'Mount allowlist loaded successfully');

    return cachedAllowlist;
  } catch (err) {
    allowlistLoadError = err instanceof Error ? err.message : String(err);
    logger.error({
      path: MOUNT_ALLOWLIST_PATH,
      error: allowlistLoadError
    }, 'Failed to load mount allowlist - additional mounts will be BLOCKED');
    return null;
  }
}
```

**功能说明：**
- **缓存机制**：使用 `cachedAllowlist` 缓存 allowlist，避免重复读取文件
- **错误缓存**：`allowlistLoadError` 防止重复记录相同的加载错误
- **文件存在性检查**：如果 allowlist 文件不存在，返回 `null` 并记录警告
- **结构验证**：验证 JSON 结构必须包含 `allowedRoots`（数组）、`blockedPatterns`（数组）、`nonMainReadOnly`（布尔值）
- **模式合并**：将用户自定义的 blockedPatterns 与 DEFAULT_BLOCKED_PATTERNS 合并，使用 `Set` 去重
- **失败安全**：任何错误都会导致返回 `null`，从而阻止所有额外挂载

**安全意义：**
- Allowlist 文件存储在项目外部（`~/.config/nanoclaw/mount-allowlist.json`），容器代理无法修改
- 失败安全设计：如果 allowlist 加载失败，默认拒绝所有挂载请求
- 结构验证防止格式错误导致的安全漏洞

---

### 2. expandPath() - 路径展开

```typescript
// src/mount-security.ts:115-127
function expandPath(p: string): string {
  const homeDir = process.env.HOME || '/Users/user';
  if (p.startsWith('~/')) {
    return path.join(homeDir, p.slice(2));
  }
  if (p === '~') {
    return homeDir;
  }
  return path.resolve(p);
}
```

**功能说明：**
- 将 `~` 展开为用户主目录（从 `HOME` 环境变量获取）
- 处理 `~/path` 格式，替换为 `/home/user/path`
- 处理单独的 `~`，替换为 `/home/user`
- 使用 `path.resolve()` 将相对路径转换为绝对路径

**安全意义：**
- 确保所有路径都是绝对路径，便于后续验证
- 防止相对路径导致的歧义

---

### 3. getRealPath() - 符号链接解析

```typescript
// src/mount-security.ts:129-139
function getRealPath(p: string): string | null {
  try {
    return fs.realpathSync(p);
  } catch {
    return null;
  }
}
```

**功能说明：**
- 使用 `fs.realpathSync()` 解析符号链接，返回真实路径
- 如果路径不存在或解析失败，返回 `null`
- 同步操作，确保路径解析的原子性

**安全意义：**
- **防止符号链接攻击**：攻击者可能创建符号链接指向敏感文件（如 `~/.ssh/id_rsa`），通过解析真实路径可以检测到这种攻击
- **路径规范化**：确保所有路径都指向实际文件系统位置，而不是符号链接

**攻击场景示例：**
```bash
# 攻击者创建符号链接
ln -s ~/.ssh/id_rsa ~/projects/innocent-file.txt

# 如果不解析符号链接，容器可能访问到 SSH 密钥
# 解析后，真实路径是 ~/.ssh/id_rsa，会被 blockedPatterns 拦截
```

---

### 4. matchesBlockedPattern() - 阻止模式匹配

```typescript
// src/mount-security.ts:141-162
function matchesBlockedPattern(realPath: string, blockedPatterns: string[]): string | null {
  const pathParts = realPath.split(path.sep);

  for (const pattern of blockedPatterns) {
    // Check if any path component matches the pattern
    for (const part of pathParts) {
      if (part === pattern || part.includes(pattern)) {
        return pattern;
      }
    }

    // Also check if the full path contains the pattern
    if (realPath.includes(pattern)) {
      return pattern;
    }
  }

  return null;
}
```

**功能说明：**
- 将路径按分隔符拆分为多个部分
- 检查每个路径组件是否匹配阻止模式（完全匹配或包含）
- 检查完整路径是否包含阻止模式
- 返回匹配的模式（用于日志记录），如果没有匹配则返回 `null`

**安全意义：**
- **多层防护**：既检查路径组件，也检查完整路径
- **灵活匹配**：支持完全匹配（如 `.ssh`）和包含匹配（如 `password`）
- **详细日志**：返回匹配的模式，便于审计和调试

**匹配示例：**
```
路径: /home/user/projects/secret/passwords.txt
阻止模式: ['secret', 'password']

匹配结果:
- 'secret' 匹配路径组件
- 'password' 匹配完整路径
```

---

### 5. findAllowedRoot() - 查找允许的根路径

```typescript
// src/mount-security.ts:164-185
function findAllowedRoot(realPath: string, allowedRoots: AllowedRoot[]): AllowedRoot | null {
  for (const root of allowedRoots) {
    const expandedRoot = expandPath(root.path);
    const realRoot = getRealPath(expandedRoot);

    if (realRoot === null) {
      // Allowed root doesn't exist, skip it
      continue;
    }

    // Check if realPath is under realRoot
    const relative = path.relative(realRoot, realPath);
    if (!relative.startsWith('..') && !path.isAbsolute(relative)) {
      return root;
    }
  }

  return null;
}
```

**功能说明：**
- 遍历所有允许的根路径
- 展开并解析每个根路径（处理 `~` 和符号链接）
- 使用 `path.relative()` 计算相对路径
- 如果相对路径不以 `..` 开头且不是绝对路径，说明 `realPath` 在 `realRoot` 下
- 返回匹配的根路径配置，如果没有匹配则返回 `null`

**安全意义：**
- **路径包含验证**：确保请求的路径确实在允许的根路径下
- **防止路径遍历**：通过检查相对路径是否以 `..` 开头来防止逃逸
- **符号链接安全**：解析根路径的符号链接，防止通过符号链接绕过限制

**验证逻辑：**
```typescript
// 示例 1: 路径在允许根下
realRoot: /home/user/projects
realPath: /home/user/projects/myapp
relative: myapp
结果: 允许（不以 .. 开头，不是绝对路径）

// 示例 2: 路径在允许根外
realRoot: /home/user/projects
realPath: /home/user/documents
relative: ../documents
结果: 拒绝（以 .. 开头）

// 示例 3: 路径是绝对路径
realRoot: /home/user/projects
realPath: /etc/passwd
relative: /etc/passwd
结果: 拒绝（是绝对路径）
```

---

### 6. isValidContainerPath() - 路径遍历防护（关键安全函数）

```typescript
// src/mount-security.ts:187-207
function isValidContainerPath(containerPath: string): boolean {
  // Must not contain .. to prevent path traversal
  if (containerPath.includes('..')) {
    return false;
  }

  // Must not be absolute (it will be prefixed with /workspace/extra/)
  if (containerPath.startsWith('/')) {
    return false;
  }

  // Must not be empty
  if (!containerPath || containerPath.trim() === '') {
    return false;
  }

  return true;
}
```

**逐行解释：**

**第 192-194 行：防止路径遍历攻击**
```typescript
if (containerPath.includes('..')) {
  return false;
}
```
- **检查内容**：检测路径中是否包含 `..` 序列
- **攻击原理**：`..` 在文件系统中表示"上级目录"，攻击者可以利用它逃逸出预期的目录
- **攻击示例**：
  ```
  正常请求: containerPath = "myapp"
  实际挂载: /workspace/extra/myapp

  攻击请求: containerPath = "../../../etc/passwd"
  如果不检查，实际挂载: /workspace/extra/../../../etc/passwd = /etc/passwd
  ```
- **防护方法**：拒绝任何包含 `..` 的路径，确保容器路径无法逃逸 `/workspace/extra/`

**第 196-199 行：防止绝对路径攻击**
```typescript
if (containerPath.startsWith('/')) {
  return false;
}
```
- **检查内容**：检测路径是否以 `/` 开头（绝对路径）
- **攻击原理**：绝对路径会覆盖前缀 `/workspace/extra/`，直接指向任意位置
- **攻击示例**：
  ```
  正常请求: containerPath = "myapp"
  实际挂载: /workspace/extra/myapp

  攻击请求: containerPath = "/etc/passwd"
  如果不检查，实际挂载: /workspace/extra//etc/passwd = /etc/passwd
  ```
- **防护方法**：只允许相对路径，确保所有挂载都在 `/workspace/extra/` 下

**第 201-204 行：防止空路径攻击**
```typescript
if (!containerPath || containerPath.trim() === '') {
  return false;
}
```
- **检查内容**：检测路径是否为空或仅包含空白字符
- **攻击原理**：空路径可能导致意外的挂载行为
- **攻击示例**：
  ```
  攻击请求: containerPath = ""
  实际挂载: /workspace/extra/
  可能导致整个 /workspace/extra/ 目录被覆盖
  ```
- **防护方法**：拒绝空路径，确保挂载目标明确

**第 206 行：验证通过**
```typescript
return true;
```
- 如果所有检查都通过，返回 `true`，表示容器路径是安全的

**路径遍历攻击总结：**

| 攻击类型 | 恶意输入 | 预期结果 | 防护方法 |
|---------|---------|---------|---------|
| 上级目录逃逸 | `../../../etc/passwd` | 访问 `/etc/passwd` | 检查 `..` |
| 绝对路径覆盖 | `/etc/passwd` | 访问 `/etc/passwd` | 检查 `/` 开头 |
| 空路径覆盖 | `""` 或 `"   "` | 覆盖 `/workspace/extra/` | 检查空字符串 |

**安全意义：**
- **多层防护**：同时检查 `..`、绝对路径和空路径
- **白名单策略**：只允许安全的相对路径
- **防御深度**：即使其他验证失败，这个函数也能防止路径逃逸

---

### 7. validateMount() - 验证单个挂载

```typescript
// src/mount-security.ts:216-303
export function validateMount(
  mount: AdditionalMount,
  isMain: boolean
): MountValidationResult {
  const allowlist = loadMountAllowlist();

  // If no allowlist, block all additional mounts
  if (allowlist === null) {
    return {
      allowed: false,
      reason: `No mount allowlist configured at ${MOUNT_ALLOWLIST_PATH}`
    };
  }

  // Validate container path first (cheap check)
  if (!isValidContainerPath(mount.containerPath)) {
    return {
      allowed: false,
      reason: `Invalid container path: "${mount.containerPath}" - must be relative, non-empty, and not contain ".."`
    };
  }

  // Expand and resolve the host path
  const expandedPath = expandPath(mount.hostPath);
  const realPath = getRealPath(expandedPath);

  if (realPath === null) {
    return {
      allowed: false,
      reason: `Host path does not exist: "${mount.hostPath}" (expanded: "${expandedPath}")`
    };
  }

  // Check against blocked patterns
  const blockedMatch = matchesBlockedPattern(realPath, allowlist.blockedPatterns);
  if (blockedMatch !== null) {
    return {
      allowed: false,
      reason: `Path matches blocked pattern "${blockedMatch}": "${realPath}"`
    };
  }

  // Check if under an allowed root
  const allowedRoot = findAllowedRoot(realPath, allowlist.allowedRoots);
  if (allowedRoot === null) {
    return {
      allowed: false,
      reason: `Path "${realPath}" is not under any allowed root. Allowed roots: ${
        allowlist.allowedRoots.map(r => expandPath(r.path)).join(', ')
      }`
    };
  }

  // Determine effective readonly status
  const requestedReadWrite = mount.readonly === false;
  let effectiveReadonly = true; // Default to readonly

  if (requestedReadWrite) {
    if (!isMain && allowlist.nonMainReadOnly) {
      // Non-main groups forced to read-only
      effectiveReadonly = true;
      logger.info({
        mount: mount.hostPath
      }, 'Mount forced to read-only for non-main group');
    } else if (!allowedRoot.allowReadWrite) {
      // Root doesn't allow read-write
      effectiveReadonly = true;
      logger.info({
        mount: mount.hostPath,
        root: allowedRoot.path
      }, 'Mount forced to read-only - root does not allow read-write');
    } else {
      // Read-write allowed
      effectiveReadonly = false;
    }
  }

  return {
    allowed: true,
    reason: `Allowed under root "${allowedRoot.path}"${allowedRoot.description ? ` (${allowedRoot.description})` : ''}`,
    realHostPath: realPath,
    effectiveReadonly
  };
}
```

**功能说明：**
- **步骤 1**：加载 allowlist，如果不存在则拒绝所有挂载
- **步骤 2**：验证容器路径（调用 `isValidContainerPath`，防止路径遍历）
- **步骤 3**：展开并解析主机路径（处理 `~` 和符号链接）
- **步骤 4**：检查路径是否匹配阻止模式
- **步骤 5**：检查路径是否在允许的根路径下
- **步骤 6**：确定有效的只读状态（考虑组类型和根路径配置）

**只读状态逻辑：**
- 默认为只读（安全优先）
- 如果请求读写权限：
  - 非主组且 `nonMainReadOnly` 为 `true` → 强制只读
  - 根路径不允许读写 → 强制只读
  - 否则 → 允许读写

**安全意义：**
- **多层验证**：容器路径、主机路径、阻止模式、允许根路径
- **失败安全**：任何验证失败都会拒绝挂载
- **最小权限原则**：默认只读，只在明确允许时才授予写权限

---

### 8. validateAdditionalMounts() - 验证多个挂载

```typescript
// src/mount-security.ts:310-353
export function validateAdditionalMounts(
  mounts: AdditionalMount[],
  groupName: string,
  isMain: boolean
): Array<{
  hostPath: string;
  containerPath: string;
  readonly: boolean;
}> {
  const validatedMounts: Array<{
    hostPath: string;
    containerPath: string;
    readonly: boolean;
  }> = [];

  for (const mount of mounts) {
    const result = validateMount(mount, isMain);

    if (result.allowed) {
      validatedMounts.push({
        hostPath: result.realHostPath!,
        containerPath: `/workspace/extra/${mount.containerPath}`,
        readonly: result.effectiveReadonly!
      });

      logger.debug({
        group: groupName,
        hostPath: result.realHostPath,
        containerPath: mount.containerPath,
        readonly: result.effectiveReadonly,
        reason: result.reason
      }, 'Mount validated successfully');
    } else {
      logger.warn({
        group: groupName,
        requestedPath: mount.hostPath,
        containerPath: mount.containerPath,
        reason: result.reason
      }, 'Additional mount REJECTED');
    }
  }

  return validatedMounts;
}
```

**功能说明：**
- 遍历所有挂载请求
- 对每个挂载调用 `validateMount` 进行验证
- 只保留通过验证的挂载
- 记录详细的日志（成功和失败）
- 返回验证通过的挂载列表

**安全意义：**
- **批量验证**：支持同时验证多个挂载
- **详细日志**：记录所有拒绝的挂载及其原因，便于审计
- **过滤机制**：只返回安全的挂载，拒绝的挂载不会进入系统

---

## Allowlist 机制详解

### Allowlist 文件位置

```typescript
// src/config.ts (参考)
export const MOUNT_ALLOWLIST_PATH = path.join(
  process.env.HOME || '/Users/user',
  '.config',
  'nanoclaw',
  'mount-allowlist.json'
);
```

**完整路径：** `~/.config/nanoclaw/mount-allowlist.json`

**安全意义：**
- 存储在项目外部，容器代理无法访问或修改
- 用户主目录下的配置目录，符合 XDG Base Directory 规范
- 只有宿主机用户可以修改，确保安全配置的完整性

### Allowlist 结构

```typescript
// src/types.ts (参考)
export interface MountAllowlist {
  allowedRoots: AllowedRoot[];
  blockedPatterns: string[];
  nonMainReadOnly: boolean;
}

export interface AllowedRoot {
  path: string;
  allowReadWrite: boolean;
  description?: string;
}
```

**示例配置：**
```json
{
  "allowedRoots": [
    {
      "path": "~/projects",
      "allowReadWrite": true,
      "description": "Development projects"
    },
    {
      "path": "~/Documents/work",
      "allowReadWrite": false,
      "description": "Work documents (read-only)"
    }
  ],
  "blockedPatterns": [
    "password",
    "secret",
    "token"
  ],
  "nonMainReadOnly": true
}
```

**配置说明：**
- `allowedRoots`：允许挂载的根路径列表
  - `path`：路径（支持 `~` 展开）
  - `allowReadWrite`：是否允许读写权限
  - `description`：可选描述
- `blockedPatterns`：额外的阻止模式（与默认模式合并）
- `nonMainReadOnly`：非主组是否强制只读

---

## 安全攻击场景与防护

### 场景 1：路径遍历攻击

**攻击尝试：**
```json
{
  "hostPath": "~/projects",
  "containerPath": "../../../etc/passwd",
  "readonly": false
}
```

**防护流程：**
1. `isValidContainerPath` 检测到 `..` → 拒绝
2. 返回错误：`Invalid container path: "../../../etc/passwd" - must be relative, non-empty, and not contain ".."`

**防护结果：** ✅ 成功阻止

---

### 场景 2：绝对路径攻击

**攻击尝试：**
```json
{
  "hostPath": "~/projects",
  "containerPath": "/etc/passwd",
  "readonly": false
}
```

**防护流程：**
1. `isValidContainerPath` 检测到 `/` 开头 → 拒绝
2. 返回错误：`Invalid container path: "/etc/passwd" - must be relative, non-empty, and not contain ".."`

**防护结果：** ✅ 成功阻止

---

### 场景 3：符号链接攻击

**攻击准备：**
```bash
# 攻击者创建符号链接
ln -s ~/.ssh/id_rsa ~/projects/innocent-file.txt
```

**攻击尝试：**
```json
{
  "hostPath": "~/projects/innocent-file.txt",
  "containerPath": "ssh-key",
  "readonly": false
}
```

**防护流程：**
1. `expandPath` 展开：`/home/user/projects/innocent-file.txt`
2. `getRealPath` 解析符号链接：`/home/user/.ssh/id_rsa`
3. `matchesBlockedPattern` 检测到 `id_rsa` → 拒绝
4. 返回错误：`Path matches blocked pattern "id_rsa": "/home/user/.ssh/id_rsa"`

**防护结果：** ✅ 成功阻止

---

### 场景 4：敏感路径访问

**攻击尝试：**
```json
{
  "hostPath": "~/.aws/credentials",
  "containerPath": "aws-creds",
  "readonly": false
}
```

**防护流程：**
1. `expandPath` 展开：`/home/user/.aws/credentials`
2. `getRealPath` 解析：`/home/user/.aws/credentials`
3. `matchesBlockedPattern` 检测到 `.aws` → 拒绝
4. 返回错误：`Path matches blocked pattern ".aws": "/home/user/.aws/credentials"`

**防护结果：** ✅ 成功阻止

---

### 场景 5：未授权路径访问

**Allowlist 配置：**
```json
{
  "allowedRoots": [
    {
      "path": "~/projects",
      "allowReadWrite": true
    }
  ],
  "blockedPatterns": [],
  "nonMainReadOnly": true
}
```

**攻击尝试：**
```json
{
  "hostPath": "~/Documents",
  "containerPath": "docs",
  "readonly": false
}
```

**防护流程：**
1. `expandPath` 展开：`/home/user/Documents`
2. `getRealPath` 解析：`/home/user/Documents`
3. `matchesBlockedPattern`：无匹配
4. `findAllowedRoot`：不在 `~/projects` 下 → 拒绝
5. 返回错误：`Path "/home/user/Documents" is not under any allowed root. Allowed roots: /home/user/projects`

**防护结果：** ✅ 成功阻止

---

## 安全设计原则

### 1. 失败安全（Fail-Safe）

- Allowlist 不存在 → 拒绝所有挂载
- Allowlist 格式错误 → 拒绝所有挂载
- 路径解析失败 → 拒绝该挂载

### 2. 最小权限原则（Least Privilege）

- 默认只读
- 只在明确允许时才授予写权限
- 非主组强制只读（可配置）

### 3. 防御深度（Defense in Depth）

- 容器路径验证（防止路径遍历）
- 主机路径解析（防止符号链接攻击）
- 阻止模式检查（防止敏感路径访问）
- 允许根路径验证（防止未授权访问）

### 4. 白名单策略（Whitelist）

- 只允许明确配置的根路径
- 默认阻止所有敏感路径
- 用户必须显式配置才能启用额外挂载

### 5. 审计日志（Audit Logging）

- 记录所有挂载验证结果
- 记录拒绝原因
- 记录只读强制原因

---

## 总结

`src/mount-security.ts` 是 NanoClaw 的核心安全模块，通过多层防护机制确保容器挂载的安全性：

**关键安全机制：**
1. **Allowlist 机制**：外部配置文件，防止容器代理修改
2. **路径遍历防护**：`isValidContainerPath` 函数逐行检查 `..`、绝对路径、空路径
3. **符号链接解析**：`getRealPath` 函数解析符号链接，防止符号链接攻击
4. **阻止模式**：默认阻止敏感路径，支持自定义模式
5. **允许根路径**：白名单机制，只允许明确配置的路径

**安全函数：**
- `loadMountAllowlist()`：加载并验证 allowlist
- `expandPath()`：展开 `~` 为绝对路径
- `getRealPath()`：解析符号链接
- `matchesBlockedPattern()`：检查阻止模式
- `findAllowedRoot()`：验证路径是否在允许根下
- `isValidContainerPath()`：**路径遍历防护（关键）**
- `validateMount()`：验证单个挂载
- `validateAdditionalMounts()`：验证多个挂载

**安全意义：**
- 防止容器代理访问敏感文件系统
- 防止路径遍历攻击
- 防止符号链接攻击
- 防止未授权路径访问
- 确保容器隔离的完整性

这个模块是 NanoClaw 安全架构的核心，确保容器代理只能访问明确允许的文件系统路径，无法逃逸容器隔离或访问敏感数据。
