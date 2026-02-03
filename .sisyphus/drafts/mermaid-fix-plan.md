# Mermaid 语法错误修复计划

## 问题总结

发现的170处语法错误分布在8个文件中：

| 文件 | 错误数 | 图表类型 |
|------|--------|----------|
| 附录-架构图集.md | ~150 | Flowchart, SequenceDiagram |
| 00-项目概览与哲学.md | ~2 | Flowchart |
| 10-整体架构与数据流.md | ~35 | Flowchart, SequenceDiagram |
| 14-IPC机制深度解析.md | ~3 | SequenceDiagram |
| 13-调度系统详解.md | ~8 | Flowchart |
| 15-安全模型实现细节.md | ~40 | Flowchart |
| 03-核心概念入门.md | ~8 | Flowchart |
| 30-安全设计深度解析.md | ~24 | Flowchart |

## 错误类型

### 类型1：Flowchart节点定义中的`<br/>`（导致解析错误）

**错误示例：**
```mermaid
WA[WhatsApp<br/>baileys]
DB[SQLite Database<br/>messages.db]
```

**修复方案：**
```mermaid
WA["WhatsApp\nbaileys"]
DB["SQLite Database\nmessages.db"]
```

**原因：**
- 节点ID和标签没有分离时，`<br/>`在ID中导致解析错误
- 必须使用引号包裹标签，ID保持简单

### 类型2：Sequence Diagram participant中的`<br/>`（不支持多行）

**错误示例：**
```mermaid
participant WA as WhatsApp<br/>(baileys)
```

**修复方案：**
```mermaid
participant WA as WhatsApp (baileys)
```

**原因：**
- Mermaid的participant定义不支持多行文本
- 必须使用单行文本

### 类型3：节点文本列表中的`<br/>`

**错误示例：**
```mermaid
Tools[Tools<br/>• Bash (沙箱)<br/>• Read/Write/Edit<br/>• WebSearch/WebFetch<br/>• agent-browser]
```

**修复方案：**
```mermaid
Tools["Tools<br/>• Bash (沙箱)<br/>• Read/Write/Edit<br/>• WebSearch/WebFetch<br/>• agent-browser"]
```

**原因：**
- 长文本需要在引号内
- 这里可以保留`<br/>`，因为是在引号内的文本中

### 类型4：决策节点中的多行文本

**错误示例：**
```mermaid
CheckAllowlist{Allowlist<br/>存在?}
```

**修复方案：**
```mermaid
CheckAllowlist["Allowlist<br/>存在?"]
```

**原因：**
- 决策节点的多行文本也需要引号

## 修复规则

### Flowchart节点

| 原始模式 | 修复后 |
|---------|--------|
| `ID[Line1<br/>Line2]` | `ID["Line1<br/>Line2"]` 或 `ID["Line1\nLine2"]` |
| `ID[Text]` （简单单行） | `ID["Text"]` 或保持原样 |
| `ID{Decision<br/>Text}` | `ID["Decision<br/>Text"]` |

### Flowchart连接

原模式保持不变：
- `A[Text] --> B[Text]`

### Sequence Diagram

| 原始模式 | 修复后 |
|---------|--------|
| `participant A as Name<br/>(detail)` | `participant A as Name (detail)` |
| `A->>B: Note<br/>line` | `A->>B: Note\nline` |

## 受影响的文件和模式

### 附录-架构图集.md
1. **Host vs Container 架构图**（line 46-100）
   - 所有节点需要添加引号
   - `WD[/workspace/group<br/>挂载自 groups/{name}/]` → `WD["/workspace/group<br/>挂载自 groups/{name}/"]`

2. **Host vs Container 消息流程图**（line 113-151）
   - participant定义需要移除`<br/>`
   - `Router->>Router: 7. 检查触发条件<br/>...` 需要使用`\n`

3. **消息处理流程图**（line 196-275）
   - 类似修复

4. **安全机制相关图**（line 400-468）
   - 节点和决策节点添加引号

5. **安全防护目标图**（line 505-550）
   - 类似修复

6. **多租户隔离机制图**（line 554-595）
   - 节点添加引号

7. **安全深度解析图**（line 755-792）
   - 决策节点添加引号

8. **IPC机制序列图**（line 911-948）
   - participant移除`<br/>`

### 10-整体架构与数据流.md
1. **系统架构图**（line 35-92）
   - 节点添加引号

2. **消息处理流程图**（line 109-151）
   - participant和消息文本修复

### 13-调度系统详解.md
节点添加引号

### 14-IPC机制深度解析.md
序列图participant修复

### 15-安全模型实现细节.md
节点和决策节点添加引号

### 30-安全设计深度解析.md
节点、决策节点、列表节点添加引号

### 其他小文件
少量节点需要添加引号

## 修复执行计划

### 文件修复顺序
1. 附录-架构图集.md（最复杂，包含150处错误）
2. 10-整体架构与数据流.md（35处）
3. 15-安全模型实现细节.md（40处）
4. 30-安全设计深度解析.md（24处）
5. 13-调度系统详解.md（8处）
6. 03-核心概念入门.md（8处）
7. 14-IPC机制深度解析.md（3处）
8. 00-项目概览与哲学.md（2处）

### 修复方法
使用工具：
- `Read` - 读取文件
- `Edit` - 逐个修复（需要精确的oldString）
- 或使用AST-grep批量替换（如果可用）

### 验证方法
修复后使用以下命令验证：
```bash
# 提取所有Mermaid代码块并验证语法
grep -A 50 '```mermaid' analysis/*.md | mermaid-cli
```

或在线验证：https://mermaid.live

## CI流程设计

### 方案1：pre-commit hook
使用mermaid-cli（mmdc）进行语法检查：

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: mermaid-lint
        name: Mermaid Syntax Check
        entry: scripts/check-mermaid.sh
        language: script
        files: '\.(md)$'
```

```bash
#!/bin/bash
# scripts/check-mermaid.sh

# 提取Mermaid代码块
grep -zoP '(?s)```mermaid\n\K.*?(?=```)' "$1" \
  | awk 'BEGIN {RS="\0"} {print}' \
  | while IFS= read -r mermaid_code; do
  echo "$mermaid_code" | npx @mermaid-js/mermaid-cli -i /dev/stdin -o /dev/null \
    || exit 1
done
```

### 方案2：GitHub Actions
```yaml
# .github/workflows/mermaid-check.yml
name: Mermaid Syntax Check

on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install mermaid-cli
        run: npm install -g @mermaid-js/mermaid-cli
      - name: Check Mermaid Syntax
        run: ./scripts/check-all-mermaid.sh
```

### 方案3：VS Code扩展
推荐安装 `Markdown Preview Mermaid Support` 扩展进行实时预览。

## 预期结果
- ✅ 所有170处语法错误修复
- ✅ 所有Mermaid图表可正常渲染
- ✅ CI流程自动检测未来的语法错误
- ✅ 提交commit包含修复脚本
