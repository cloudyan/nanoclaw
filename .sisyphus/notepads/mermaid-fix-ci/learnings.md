# Mermaid 语法修复 - 学习记录

## 执行时间
2026-02-03

## 完成的任务
- [x] 创建修复脚本 scripts/fix-mermaid-syntax.cjs
- [x] 创建CI检查脚本 scripts/check-mermaid.sh  
- [x] 执行修复脚本，修复166处错误
- [x] 验证修复结果
- [x] 提交 git commit (a7d68df)

## 关键发现

### 错误模式
1. **Flowchart节点**: `ID[Text<br/>Line]` 需要改为 `ID["Text<br/>Line"]`
2. **Sequence participant**: `participant A as Text<br/>(detail)` 需要改为单行
3. **决策节点**: `ID{Decision<br/>Text}` 需要改为 `ID["Decision<br/>Text"]`

### 修复统计
- 附录-架构图集.md: 84处
- 30-安全设计深度解析.md: 27处
- 15-安全模型实现细节.md: 22处
- 10-整体架构与数据流.md: 19处
- 03-核心概念入门.md: 6处
- 13-调度系统详解.md: 5处
- 14-IPC 机制深度解析.md: 3处
- 00-项目概览与哲学.md: 2处
- **总计: 166处**

## 技术要点

### Mermaid语法规则
- Flowchart节点文本必须用双引号包裹才能使用`<br/>`
- Sequence diagram的participant定义不支持多行
- 决策节点(diamond)的多行文本也需要引号包裹

### Node.js模块系统
- 项目使用ES模块(`"type": "module"` in package.json)
- 需要使用`.cjs`扩展名来启用CommonJS
- `require()`在ES模块中不可用

### 正则表达式模式
```javascript
// 节点定义
/(\w+)\[([^\[\]]*<br\/>[^\[\]]*)\]/g

// Sequence participant
/(participant\s+\w+\s+as\s+[^<\n]+)<br\/>/g

// 决策节点
/(\w+)\{([^\{\}]*<br\/>[^\{\}]*)\}/g
```

## 交付物
1. scripts/fix-mermaid-syntax.cjs - 自动修复脚本
2. scripts/check-mermaid.sh - CI检查脚本
3. Git commit a7d68df - 包含所有修复

## 后续建议
- 定期运行 `bash scripts/check-mermaid.sh analysis/` 检查新文档
- 考虑集成到pre-commit hook或CI pipeline
- 备份文件(.backup)可以清理以节省空间
