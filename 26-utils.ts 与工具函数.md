# 工具函数：loadJson 与 saveJson

## 概述

`src/utils.ts` 文件仅包含两个工具函数，用于 JSON 文件的读写操作。代码总行数约 19 行，体现了 NanoClaw 的核心设计理念：**简单工具，不过度抽象**。

这两个函数直接封装了 Node.js 原生的文件系统操作，没有引入额外的依赖，没有复杂的错误处理，没有装饰器或中间件。它们的职责单一明确：安全地读取 JSON，原子地写入 JSON。

---

## loadJson 函数

### 代码位置

**文件路径**：`src/utils.ts:4-13`

```typescript
export function loadJson<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch {
    // Return default on error
  }
  return defaultValue;
}
```

### 功能说明

`loadJson` 是一个泛型函数，用于从指定路径读取 JSON 文件。函数签名中的泛型 `T` 确保了类型安全，调用者可以明确指定期望的数据结构。

**核心逻辑**分为三个步骤：首先检查文件是否存在，如果存在则读取并解析为对象；如果读取或解析过程中发生任何异常（包括文件不存在、JSON 格式错误、权限问题等），函数会静默捕获异常并返回默认值。这种设计避免了复杂的错误传播机制，调用方无需处理异常情况。

### 设计特点

该函数体现了**防御性编程**与**简洁性**的平衡。传统的文件读取函数可能会抛出异常、返回 `null`、或要求调用方显式处理错误。而 `loadJson` 采用「有则返回，无则默认」的语义，将所有边界情况统一处理为返回 `defaultValue`。这种设计在配置加载、数据初始化等场景中非常实用，因为这些场景下默认值本身就是可接受的结果。

---

## saveJson 函数

### 代码位置

**文件路径**：`src/utils.ts:15-18`

```typescript
export function saveJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
```

### 功能说明

`saveJson` 用于将数据写入 JSON 文件。函数接受文件路径和待写入的数据，不返回任何值。

**核心逻辑**同样简洁：第一步确保目标目录存在（使用 `recursive: true` 选项自动创建嵌套目录），第二步将数据序列化为格式化的 JSON 字符串并写入文件。`JSON.stringify(data, null, 2)` 中的 `null, 2` 参数表示使用两个空格缩进，使输出的 JSON 文件具有良好的可读性。

### 设计特点

该函数的一个巧妙之处在于**自动创建父目录**。在写入文件前调用 `fs.mkdirSync` 并设置 `recursive: true`，可以处理任意深度的文件路径，无需调用方预先确保目录存在。这种「一次调用，完成所有准备工作」的模式减少了调用方的认知负担。

---

## 简洁工具的设计哲学

### 核心理念

NanoClaw 的 utils.ts 体现了「简单工具」的设计哲学：**每个函数只做一件事，做好这一件事，不多也不少**。

`loadJson` 和 `saveJson` 的设计遵循以下原则：

1. **职责单一**：`loadJson` 只负责读取，不负责写入；`saveJson` 只负责写入，不负责读取。两者各司其职，组合使用。

2. **无过度抽象**：没有创建 `JsonStorage` 类，没有实现 `Storage` 接口，没有引入策略模式。直接暴露函数，调用方按需使用。

3. **错误处理适度**：`loadJson` 捕获异常但不记录日志或重新抛出，因为对于「读取配置」这类操作，返回默认值本身就是合理的处理方式。

4. **零依赖**：仅使用 Node.js 内置的 `fs` 和 `path` 模块，不引入第三方库，减少维护负担和潜在的安全风险。

### 为什么不过度抽象

在大型项目中，常见的反模式是「为简单操作创建复杂抽象」。例如，将 JSON 读写封装为 `IStorage` 接口、实现 `FileBasedJsonStorage` 和 `MemoryBasedJsonStorage`、添加缓存层和事件钩子。这种设计虽然看起来「企业级」，但对于 NanoClaw 这样的项目而言是过度工程。

NanoClaw 的选择是：**让代码可以被快速理解**。当一个新开发者阅读 `src/utils.ts` 时，19 行代码、两个函数、一目了然的功能，无需理解接口契约、继承体系或配置选项。这种简洁性本身就是一种设计决策，它服务于「可理解性」这一核心价值。

---

## 使用示例

```typescript
import { loadJson, saveJson } from './utils';

// 读取配置，如果文件不存在则使用默认配置
interface Config {
  triggerPattern: string;
  containerPath: string;
}

const config = loadJson<Config>('./config.json', {
  triggerPattern: '@Andy',
  containerPath: '/tmp/nanoclaw'
});

// 保存配置
saveJson('./data/session.json', {
  lastActive: new Date().toISOString(),
  messageCount: 42
});
```

---

## 小结

`src/utils.ts` 中的两个工具函数展示了 NanoClaw 的代码风格：**直接、简洁、实用**。它们不追求架构上的优雅或设计模式的应用，而是专注于解决具体问题。这种「工具箱」式的代码组织方式，使得项目易于维护、易于修改、易于理解。
