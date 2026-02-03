# src/whatsapp-auth.ts 源码解读

## 概述

`src/whatsapp-auth.ts` 是 NanoClaw 的 WhatsApp 认证脚本，用于在首次设置时通过扫描 QR 码完成 WhatsApp Web 认证。该脚本负责生成 QR 码、监听连接状态变化、保存认证凭据，并在认证成功后退出。

**文件路径**: `src/whatsapp-auth.ts`
**代码行数**: 93 行
**主要功能**: WhatsApp Web 认证流程管理

---

## 依赖导入

```typescript
// src/whatsapp-auth.ts:12-21
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';
import { createProxyAgent } from './proxy.js';
```

**功能说明**:
- `@whiskeysockets/baileys`: WhatsApp Web API 库，提供 Socket 连接和认证功能
- `pino`: 日志库，用于记录认证过程中的事件
- `qrcode-terminal`: 在终端生成 QR 码
- `fs`, `path`: 文件系统操作，用于创建认证目录
- `createProxyAgent`: 代理配置（可选）

---

## 常量定义

```typescript
// src/whatsapp-auth.ts:23-27
const AUTH_DIR = './store/auth';

const logger = pino({
  level: 'warn', // Quiet logging - only show errors
});
```

**功能说明**:
- `AUTH_DIR`: 认证凭据存储目录，所有会话数据将保存在此
- `logger`: 配置为只显示警告和错误级别，减少输出噪音

---

## 核心函数：authenticate()

### 函数签名

```typescript
// src/whatsapp-auth.ts:29
async function authenticate(): Promise<void>
```

**功能**: 主认证流程函数，负责初始化连接、处理认证事件、保存凭据

---

### 1. 初始化认证目录和状态

```typescript
// src/whatsapp-auth.ts:30-32
fs.mkdirSync(AUTH_DIR, { recursive: true });

const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
```

**功能说明**:
- 创建认证目录（如果不存在）
- `useMultiFileAuthState`: 加载或创建多文件认证状态
  - `state`: 包含 `creds`（凭据）和 `keys`（加密密钥）
  - `saveCreds`: 保存凭据的回调函数

---

### 2. 检查是否已认证

```typescript
// src/whatsapp-auth.ts:34-38
if (state.creds.registered) {
  console.log('✓ Already authenticated with WhatsApp');
  console.log('  To re-authenticate, delete the store/auth folder and run again.');
  process.exit(0);
}
```

**功能说明**:
- 检查 `state.creds.registered` 标志
- 如果已认证，提示用户删除 `store/auth` 目录以重新认证
- 直接退出，避免重复认证

---

### 3. 创建 WhatsApp Socket 连接

```typescript
// src/whatsapp-auth.ts:42-51
const sock = makeWASocket({
  auth: {
    creds: state.creds,
    keys: makeCacheableSignalKeyStore(state.keys, logger),
  },
  printQRInTerminal: false,
  logger,
  browser: ['NanoClaw', 'Chrome', '1.0.0'],
  agent: createProxyAgent()
});
```

**功能说明**:
- `makeWASocket`: 创建 WhatsApp Web Socket 连接
- `auth`: 认证配置
  - `creds`: 当前凭据状态
  - `keys`: 使用 `makeCacheableSignalKeyStore` 包装密钥存储，提供缓存功能
- `printQRInTerminal: false`: 禁用 baileys 内置的 QR 码打印（使用自定义 QR 码生成）
- `browser`: 模拟浏览器信息，格式为 `[名称, 浏览器, 版本]`
- `agent`: 可选的代理配置

---

### 4. 连接状态事件处理

#### QR 码生成

```typescript
// src/whatsapp-auth.ts:53-62
sock.ev.on('connection.update', (update) => {
  const { connection, lastDisconnect, qr } = update;

  if (qr) {
    console.log('Scan this QR code with WhatsApp:\n');
    console.log('  1. Open WhatsApp on your phone');
    console.log('  2. Tap Settings → Linked Devices → Link a Device');
    console.log('  3. Point your camera at the QR code below\n');
    qrcode.generate(qr, { small: true });
  }
```

**功能说明**:
- 监听 `connection.update` 事件
- 当收到 `qr` 字段时，表示需要用户扫描 QR 码
- 使用 `qrcode-terminal` 库在终端生成 QR 码
- `{ small: true }`: 生成小尺寸 QR 码，适合终端显示

**QR 码生成流程**:
1. WhatsApp 服务器生成唯一的认证 QR 码
2. baileys 库通过 `connection.update` 事件传递 QR 码字符串
3. `qrcode.generate()` 将字符串转换为 ASCII 艺术 QR 码
4. 用户使用手机 WhatsApp 扫描 QR 码完成认证

---

#### 连接关闭处理

```typescript
// src/whatsapp-auth.ts:64-74
  if (connection === 'close') {
    const reason = (lastDisconnect?.error as any)?.output?.statusCode;

    if (reason === DisconnectReason.loggedOut) {
      console.log('\n✗ Logged out. Delete store/auth and try again.');
      process.exit(1);
    } else {
      console.log('\n✗ Connection failed. Please try again.');
      process.exit(1);
    }
  }
```

**功能说明**:
- 检测连接关闭事件
- 从 `lastDisconnect.error` 中提取断开原因
- `DisconnectReason.loggedOut`: 用户在手机上登出，需要重新认证
- 其他错误：网络问题或认证失败，提示重试

---

#### 认证成功处理

```typescript
// src/whatsapp-auth.ts:76-84
  if (connection === 'open') {
    console.log('\n✓ Successfully authenticated with WhatsApp!');
    console.log('  Credentials saved to store/auth/');
    console.log('  You can now start the NanoClaw service.\n');

    // Give it a moment to save credentials, then exit
    setTimeout(() => process.exit(0), 1000);
  }
});
```

**功能说明**:
- `connection === 'open'`: 认证成功，连接已建立
- 显示成功消息和凭据保存位置
- 延迟 1 秒退出，确保凭据保存完成

---

### 5. 凭据保存事件

```typescript
// src/whatsapp-auth.ts:86
sock.ev.on('creds.update', saveCreds);
```

**功能说明**:
- 监听 `creds.update` 事件
- 当凭据更新时（如会话密钥刷新），调用 `saveCreds` 保存到文件
- 确保认证状态持久化，下次启动无需重新认证

---

## 认证状态转换

```
[初始状态]
    ↓
[connecting] ← makeWASocket() 创建连接
    ↓
[QR 码生成] ← connection.update { qr }
    ↓
[用户扫描 QR 码]
    ↓
[open] ← connection.update { connection: 'open' }
    ↓
[凭据保存] ← creds.update 事件
    ↓
[退出] ← process.exit(0)
```

**状态说明**:
- **connecting**: 正在建立连接，等待 QR 码
- **QR 码生成**: 显示 QR 码供用户扫描
- **open**: 认证成功，连接已建立
- **close**: 连接关闭（可能是错误或登出）

---

## WhatsApp Web 连接机制

### 认证流程

1. **初始化**: `makeWASocket()` 创建 WebSocket 连接到 WhatsApp 服务器
2. **QR 码请求**: 服务器生成唯一的认证 QR 码
3. **用户扫描**: 用户使用手机 WhatsApp 扫描 QR 码
4. **密钥交换**: 手机和服务器交换加密密钥
5. **会话建立**: 连接状态变为 `open`，认证完成
6. **凭据保存**: `creds.update` 事件触发，保存会话凭据到 `store/auth/`

### 会话持久化

- **存储位置**: `store/auth/` 目录
- **存储内容**:
  - `creds.json`: 认证凭据（包含会话 ID、密钥等）
  - `app-state-sync-*`: 应用状态同步数据
  - `session-*`: 会话密钥和加密数据
- **下次启动**: 直接加载已保存的凭据，无需重新扫描 QR 码

---

## 错误处理

```typescript
// src/whatsapp-auth.ts:89-92
authenticate().catch((err) => {
  console.error('Authentication failed:', err.message);
  process.exit(1);
});
```

**功能说明**:
- 捕获 `authenticate()` 函数中的所有未处理异常
- 显示错误消息并退出（状态码 1）
- 确保脚本在出错时不会挂起

---

## 使用方式

```bash
npx tsx src/whatsapp-auth.ts
```

**预期输出**:
1. 如果已认证：提示删除 `store/auth` 目录
2. 如果未认证：显示 QR 码，等待扫描
3. 扫描成功：显示成功消息并退出
4. 扫描失败：显示错误消息并退出

---

## 关键函数总结

| 函数 | 行号 | 功能 |
|------|------|------|
| `authenticate()` | 29-87 | 主认证流程，初始化连接、处理事件、保存凭据 |
| `connection.update` 事件处理 | 53-84 | 处理 QR 码生成、连接关闭、认证成功 |
| `creds.update` 事件处理 | 86 | 保存认证凭据到文件 |

---

## 技术要点

1. **QR 码生成**: 使用 `qrcode-terminal` 库在终端显示 ASCII 艺术 QR 码
2. **状态管理**: `useMultiFileAuthState` 提供多文件认证状态管理
3. **事件驱动**: 通过 `sock.ev.on()` 监听连接和凭据更新事件
4. **持久化**: 凭据自动保存到文件系统，支持会话恢复
5. **错误处理**: 区分登出和其他连接错误，提供清晰的错误提示

---

## 注意事项

- 不深入 baileys 库的内部认证协议（如 Curve25519 密钥交换）
- 认证凭据包含敏感信息，应妥善保管 `store/auth/` 目录
- 如需重新认证，删除 `store/auth/` 目录并重新运行脚本
- 代理配置通过 `createProxyAgent()` 可选支持
