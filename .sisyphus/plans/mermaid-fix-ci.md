# 修复Mermaid语法错误并建立CI检查流程

## TL;DR

**目标**: 修复analysis目录下8个文件中的170处Mermaid语法错误，并建立CI自动检查流程防止未来出现类似问题。

**核心问题**:
- 170处`<br/>`在Mermaid节点定义中导致解析错误
- 预期错误：`Parse error line XX: ... Expecting 'SQE', ... got 'DIAMOND_START'`

**修复方法**:
- Flowchart节点：`ID[Text<br/>Line]` → `ID["Text<br/>Line"]`（添加引号）
- Sequence participant：`participant A as Text<br/>(detail)` → `participant A as Text (detail)`（移除多行）
- 决策节点：`ID{Decision<br/>Text}` → `ID["Decision<br/>Text"]`（添加引号）

**交付物**:
- 修复脚本：`scripts/fix-mermaid-syntax.js`
- 所有170处错误修复的文件
- CI检查脚本：`scripts/check-mermaid.sh`
- Git commit

---

## Context

### Original Request
用户报告Mermaid语法错误：
```
[Parsed ~4 lineParse error on line 43:
...roup<br/>挂载自 groups/{name}/]
-----------------------^
Expecting 'SQE', 'DOUBLECIRCLEEND', 'PE', '-)', 'STADIUMEND', 'SUBROUTINEEND', 'PIPE', 'CYLINDEREND', 'DIAMOND_STOP', 'TAGEND', 'TRAPEND', 'INVTRAPEND', 'UNICODE_TEXT', 'TEXT', 'TAGSTART', got 'DIAMOND_START'
```

要求：
1. 修复当前报错
2. 建立Mermaid语法检查的CI流程

### Research Findings

**问题规模**（通过grep扫描）：
- **170处**`<br/>`分布在**8个文件**中
- 主要文件（错误数估算）：
  - `附录-架构图集.md`: ~150处
  - `10-整体架构与数据流.md`: ~35处
  - `15-安全模型实现细节.md`: ~40处
  - `30-安全设计深度解析.md`: ~24处
  - 其他文件：少量

**错误模式分类**：
1. **Flowchart节点定义**：`WA[WhatsApp<br/>baileys]`（解析错误）
2. **Sequence participant**：`participant WA as WhatsApp<br/>(baileys)`（不支持多行）
3. **Flowchart决策节点**：`CheckAllowlist{Allowlist<br/>存在?}`（解析错误）
4. **Sequence消息文本**：`Router->>Router: 7. 检查触发条件<br/>...`（需使用`\n`）

**Mermaid语法规范**（查阅官方文档）：
- Flowchart节点：`ID["Text\nLine2"]` 使用双引号包裹文本，`\n`换行
- Sequence participant：不支持多行文本，必须用单行
- Sequence消息：使用`\n`换行，`A->>B: Line1\nLine2`

---

## Work Objectives

### Core Objective
修复所有Mermaid语法错误，使文档中的图表可正常渲染，并建立CI检查防止回归。

### Concrete Deliverables
1. **修复脚本** `scripts/fix-mermaid-syntax.js` - Node.js脚本，自动修复所有错误
2. **CI检查脚本** `scripts/check-mermaid.sh` - 在git提交前检查Mermaid语法
3. **修复后的文件** - 8个文档文件，所有170处错误已修复
4. **Git commit** - 提交所有修复和CI脚本

### Definition of Done
```bash
# 1. 运行修复脚本
node scripts/fix-mermaid-syntax.js
# 输出: 修复的文件数: 8, 修复的错误数: 170

# 2. 验证修复
grep -c '<br/>' analysis/*.md | grep -v ':0$'
# 输出: 空（所有<br/>已正确处理）

# 3. 运行CI检查
bash scripts/check-mermaid.sh
# 输出: ✓ All Mermaid diagrams validated

# 4. 验证图表渲染
# 在支持Mermaid的Markdown预览中打开文件，确认正常渲染
```

### Must Have
- ✅ 所有文件中的错误节点定义都添加引号
- ✅ Sequence diagram的participant定义移除`<br/>`
- ✅ CI脚本能在git钩子中运行
- ✅ 保留`.backup`文件用于回滚（可选）

### Must NOT Have (Guardrails)
- ❌ 不要修改Mermaid代码块之外的任何内容
- ❌ 不要改变图表的语义或结构
- ❌ 不要删除任何`<br/>`（应该转换为`\n`或在引号内）
- ❌ 不要破坏现有的代码块格式
- ❌ 不要修改图表的样式和布局

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (立即开始):
└── Task 1: 创建修复脚本 scripts/fix-mermaid-syntax.js

Wave 2 (Wave 1完成):
├── Task 2: 创建CI检查脚本 scripts/check-mermaid.sh
└── Task 3: 执行修复脚本，修复所有8个文件

Wave 3 (Wave 2完成):
└── Task 4: 验证修复结果

Wave 4 (Wave 3完成):
└── Task 5: 提交 git commit

Critical Path: Task 1 → Task 3 → Task 4 → Task 5
Parallel Speedup: ~25% (Task 2 与 Task 3 并行)
```

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1 | `category: "quick"` |
| 2 | 2, 3 | `category: "unspecified-low"` (并行) |
| 3 | 4 | `category: "quick"` |
| 4 | 5 | `category: "quick"`, `load_skills: ["git-master"]` |

---

## TODOs

- [x] 1. 创建修复脚本 scripts/fix-mermaid-syntax.js

  **What to do**:
  - 创建Node.js脚本，实现以下规则：
    1. Flowchart节点: `ID[Text<br/>Line]` → `ID["Text<br/>Line"]`
    2. Sequence participant: `participant A as Text<br/>(detail)` → `participant A as Text (detail)`
    3. Flowchart决策节点: `ID{Decision<br/>Text}` → `ID["Decision<br/>Text"]`
    4. Sequence消息: `A->>B: Line1<br/>Line2` → `A->>B: Line1\nLine2`
  - 只在Mermaid代码块内替换（检查```mermaid和```）
  - 创建备份文件（`.backup`后缀）
  - 输出修复统计信息

  **修复规则详细说明**：

  ```javascript
  // 规则1: Flowchart节点
  // 匹配: WA[WhatsApp<br/>baileys]
  // 替换: WA["WhatsApp<br/>baileys"]
  regex: /(\w+)\[([^\[\]]*<br\/>[^\[\]]*)\]/g

  // 规则2: Sequence participant
  // 匹配: participant WA as WhatsApp<br/>(baileys)
  // 替换: participant WA as WhatsApp (baileys)
  regex: /(participant\s+\w+\s+as\s+[^<\n]+)<br\/>/g

  // 规则3: Flowchart决策节点
  // 匹配: CheckAllowlist{Allowlist<br/>存在?}
  // 替换: CheckAllowlist["Allowlist<br/>存在?"]
  regex: /(\w+)\{([^\{\}]*<br\/>[^\{\}]*)\}/g

  // 规则4: Sequence消息中的<br/>
  // 匹配: Router->>Router: 7. 检查触发条件<br/>- ...
  // 替换: Router->>Router: 7. 检查触发条件\n- ...
  regex: /(\w+(->>|--|\.\.>|-->)\w+:\s*)([^<\n]*)(<br\/>)/g
  ```

  **必须处理文件列表**：
  ```
  analysis/附录-架构图集.md
  analysis/10-整体架构与数据流.md
  analysis/15-安全模型实现细节.md
  analysis/30-安全设计深度解析.md
  analysis/13-调度系统详解.md
  analysis/03-核心概念入门.md
  analysis/14-IPC机制深度解析.md
  analysis/00-项目概览与哲学.md
  ```

  **Must NOT do**:
  - ❌ 不要在非Mermaid代码块内进行替换
  - ❌ 不要修改Markdown标题、段落等非图表内容
  - ❌ 不要修改代码块外的`<br/>`（如果有其他用途）

  **推荐Agent Profile**:
  > Select category + skills based on task domain. Justify each choice.
  - **Category**: `quick`
    - Reason: 单个脚本文件创建，任务清晰直截
  - **Skills**: []
    - 不需要特定技能，Node.js和正则表达式足够

  **Skills Evaluated but Omitted**:
  - `context7`: 虽然可以查Mermaid文档，但语法规则已经明确

  **Parallelization**:
  - **Can Run In Parallel**: NO - 这是首个任务，必须先完成脚本
  - **Parallel Group**: Sequential (can start immediately)
  - **Blocks**: Task 2, Task 3（需要脚本存在）
  - **Blocked By**: None

  **References** (CRITICAL - Be Exhaustive):

  > The executor has NO context from your interview. References are their ONLY guide.

  **Pattern References** (existing code to follow):
  - 无 - 这是新文件创建

  **API/Type References** (contracts to implement against):
  - 无 - 纯Node.js脚本

  **Test References** (testing patterns to follow):
  - 无脚本可参考

  **Documentation References** (specs and requirements):
  - Node.js fs模块: https://nodejs.org/api/fs.html
  - 正则表达式: MDN RegExp documentation

  **External References** (libraries and frameworks):
  - 无外部依赖，纯Node.js

  **WHY Each Reference Matters**:
  - Node.js fs: 读写文件，创建备份
  - 正则表达式: 实现4种修复规则

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY**

  **If TDD (tests enabled)**:
  - N/A - 无自动化测试

  **Agent-Executed QA Scenarios (MANDATORY — per-scenario, ultra-detailed):**

  ```bash
  Scenario: 修复脚本成功创建并可执行
    Tool: Bash (执行命令)
    Preconditions: 脚本已创建
    Steps:
      1. 检查文件存在: test -f scripts/fix-mermaid-syntax.js
      2. 检查文件可执行: test -x scripts/fix-mermaid-syntax.js (或使用node运行)
      3. 检查语法: node -c scripts/fix-mermaid-syntax.js
         Expected: exit code 0 (no syntax errors)
      4. 查看脚本内容: head -20 scripts/fix-mermaid-syntax.js
         Expected: 包含描述注释和规则定义
    Expected Result: 脚本存在且语法正确
    Evidence: 输出捕获

  Scenario: 修复脚本帮助信息正常显示
    Tool: Bash
    Preconditions: 脚本可执行
    Steps:
      1. 运行脚本: node scripts/fix-mermaid-syntax.js --help
         Expected: 脚本运行，显示用法信息或开始执行修复
    Expected Result: 脚本正常运行
    Evidence: 输出捕获
  ```

  **Evidence to Capture**:
  - [ ] 脚本创建的输出（ls命令）
  - [ ] 语法检查的输出（node -c）

  **Commit**: NO (groups with Task 5)

- [x] 2. 创建CI检查脚本 scripts/check-mermaid.sh

  **What to do**:
  - 创建bash脚本，检查所有Markdown文件中的Mermaid语法
  - 提取Mermaid代码块验证语法
  - 支持检查单个文件或所有文件
  - 返回适当的退出码（0=成功，非0=失败）

  **脚本功能**：
  ```bash
  # 单文件检查
  bash scripts/check-mermaid.sh analysis/附录-架构图集.md

  # 全部检查
  bash scripts/check-mermaid.sh analysis/
  ```

  **验证方法**：
  - 方法1（推荐）：使用 `mermaid-cli` (@mermaid-js/mermaid-cli)
    ```bash
    npx @mermaid-js/mermaid-cli -i mermaid.mmd -o /dev/null
    ```
  - 方法2（备选）：在线API或简单的语法检查
    - 由于没有现成工具，可以只做基本的语法检查

  **实际实现建议**：
  由于`mermaid-cli`可能安装较慢，可以先实现基本版本，之后再升级。

  基本版本：
  ```bash
  # 简单检查语法：
  # 1. 提取所有Mermaid代码块
  # 2. 检查是否包含明显的错误模式（如节点ID中的<br/>）
  # 3. 返回错误信息
  ```

  **Must NOT do**:
  - ❌ 不要修改任何文件（只检查）
  - ❌ 不要遗漏任何Markdown文件
  - ❌ 不要忽略Mermaid代码块之外的语法问题

  **推荐Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: 脚本创建任务，中等复杂度
  - **Skills**: []
    - 标准bash脚本足够

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: Task 4 (需要完成才能验证)
  - **Blocked By**: Task 1

  **Acceptance Criteria**:

  ```bash
  Scenario: CI脚本成功创建并可执行
    Tool: Bash
    Steps:
      1. 检查文件存在: test -f scripts/check-mermaid.sh
      2. 检查执行权限: test -x scripts/check-mermaid.sh
      3. 执行脚本: bash scripts/check-mermaid.sh --help
         Expected: 显示用法信息
    Expected Result: 脚本可执行
    Evidence: 输出捕获

  Scenario: CI脚本能在有错误的文件上检测到问题
    Tool: Bash
    Preconditions: filesToFix中的文件仍有错误
    Steps:
      1. 运行检查: bash scripts/check-mermaid.sh analysis/附录-架构图集.md
         Expected: 检测到错误，exit code非0
    Expected Result: 错误被检测到
    Evidence: 输出文件路径和错误信息
  ```

  **Commit**: NO (groups with Task 5)

- [x] 3. 执行修复脚本，修复所有8个文件

  **What to do**:
  - 运行 `node scripts/fix-mermaid-syntax.js`
  - 验证输出显示8个文件都被处理
  - 检查生成了.backup文件
  - 计录修复的错误总数

  **验证方法**：
  ```bash
  # 运行修复
  node scripts/fix-mermaid-syntax.js

  # 检查修复后
  grep -c '<br/>' analysis/附录-架构图集.md | head -1
  # 预期：数量大幅减少（只有引号内的<br/>保留）

  # 检查特定修复
  grep "WhatsApp\[.*baileys\]" analysis/00-项目概览与哲学.md
  # 预期：所有节点都有引号包裹
  ```

  **Must NOT do**:
  - ❌ 不要手动修改文件（使用脚本）
  - ❌ 不要跳过任何文件
  - ❌ 不要在修复前不清空目录

  **推荐Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: 执行脚本和验证，中等复杂度
  - **Skills**: []
    - 标准命令行操作

  **Parallelization**:
  - **Can Run In Parallel**: YES (can run with Task 2)
  - **Parallel Group**: Wave 2 (with Task 2)
  - **Blocks**: Task 4 (需要修复完成才能验证)
  - **Blocked By**: Task 1

  **Acceptance Criteria**:

  ```bash
  Scenario: 修复脚本成功执行并修复所有文件
    Tool: Bash
    Preconditions: 脚本已创建，8个文件存在
    Steps:
      1. 运行修复: node scripts/fix-mermaid-syntax.js
         Expected: 输出显示处理8个文件，修复约170处错误
      2. 检查备份: ls analysis/*.backup | wc -l
         Expected: 8个备份文件
      3. 检查修复结果: grep -r '\[.*<br\/>.*\]' analysis/*.md | grep -v '"' | wc -l
         Expected: 0（所有节点定义的<br/>都已加引号）
    Expected Result: 所有错误已修复
    Evidence: 修复脚本输出，grep结果

  Scenario: Sequence diagram的participant定义已移除<br/>
    Tool: Bash
    Steps:
      1. 搜索未修复的participant: grep -n 'participant.*<br\/>' analysis/*.md
         Expected: 0匹配
      2. 搜索正确格式: grep -n 'participant as' analysis/*.md | head -5
         Expected: 显示正确的单行格式
    Expected Result: participant定义已修复
    Evidence: grep输出
  ```

  **Evidence to Capture**:
  - [ ] 修复脚本的完整输出
  - [ ] 备份文件列表
  - [ ] 验证grep的输出

  **Commit**: NO (groups with Task 5)

- [x] 4. 验证修复结果

  **What to do**:
  - 运行CI检查脚本确认所有错误已修复
  - 手动检查几个关键图表（Host vs Container架构图）
  - 测试在Markdown预览中是否正常渲染

  **验证清单**：
  - [ ] `bash scripts/check-mermaid.sh analysis/` 返回成功
  - [ ] `grep 'participant.*<br/>' analysis/*.md` 无匹配
  - [ ] `grep '\[[^"]*<br\/>[^"]*\]' analysis/*.md` 无匹配（未加引号的`<br/>`）
  - [ ] 打开文件，查看图表渲染正常

  **推荐Agent Profile**:
  - **Category**: `quick`
    - Reason: 验证任务，步骤简单
  - **Skills**: []
    - 标准命令行验证

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 5 (需要验证通过才能提交)
  - **Blocked By**: Task 2, Task 3

  **Acceptance Criteria**:

  ```bash
  Scenario: 所有Mermaid语法错误已修复
    Tool: Bash
    Preconditions: 修复完成
    Steps:
      1. 运行CI检查: bash scripts/check-mermaid.sh analysis/
         Expected: exit code 0，输出"All Mermaid diagrams validated"
      2. 检查节点定义: grep -n '\[[^"]*<br\/>[^"]*\]' analysis/附录-架构图集.md
         Expected: 0匹配（所有节点都有引号）
      3. 检查participant: grep -n 'participant.*<br/>' analysis/*.md
         Expected: 0匹配
      4. 统计剩余<br/>: grep -o '<br/>' analysis/*.md | wc -l
         Expected: 大幅减少（只保留引号内的<br/>）
    Expected Result: 所有语法错误已修复
    Evidence: 所有命令输出
  ```

  **Commit**: NO (groups with Task 5)

- [x] 5. 提交 git commit

  **What to do**:
  - 添加所有修复的文件和脚本
  - 创建commit message
  - 运行 `git commit`

  **Commit message**:
  ```
  docs: 修复所有Mermaid语法错误并建立CI检查流程

- 修复了170处Mermaid语法错误，涉及8个文档文件
- 错误类型：
  • Flowchart节点中的<br/>缺少引号包裹
  • Sequence diagram的participant定义使用了多行
  • 决策节点中的<br/>缺少引号包裹
- 新增脚本：
  • scripts/fix-mermaid-syntax.js - 自动修复脚本
  • scripts/check-mermaid.sh - CI检查脚本
- 改进：
  • 所有Mermaid图表现在可以正常渲染
  • CI流程可自动检测未来的语法错误
- 修复的文件：
  • analysis/附录-架构图集.md
  • analysis/10-整体架构与数据流.md
  • analysis/15-安全模型实现细节.md
  • analysis/30-安全设计深度解析.md
  • analysis/13-调度系统详解.md
  • analysis/03-核心概念入门.md
  • analysis/14-IPC机制深度解析.md
  • analysis/00-项目概览与哲学.md
  ```

  **推荐Agent Profile**:
  - **Category**: `quick`
    - Reason: 单个git commit操作
  - **Skills**: `["git-master"]`
    - 需要 git-master 来正确执行 git 提交流程

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: None (final task)
  - **Blocked By**: Task 4 (需要验证通过)

  **Acceptance Criteria**:

  ```bash
  Scenario: Git commit成功创建
    Tool: Bash
    Preconditions: 所有文件已修复和验证
    Steps:
      1. 检查git状态: git status
         Expected: 显示8个修复的文件 + 2个脚本
      2. 检查diff: git diff --stat
         Expected: 显示修改的行数统计
      3. 执行commit: git status (已在Task 4中完成git add)
         Expected: 显示准备提交的文件
    Expected Result: 所有文件已暂存，准备提交
    Evidence: git status输出
  ```

  **Evidence to Capture**:
  - [ ] git status
  - [ ] git diff --stat
  - [ ] git log -1 (commit创建后)

  **Commit**: YES - 包含Task 2, 3, 5的文件
  - Message: 见上文
  - Files:
    - `scripts/fix-mermaid-syntax.js`
    - `scripts/check-mermaid.sh`
    - `analysis/` 目录下的8个修复文件
  - Pre-commit: `bash scripts/check-mermaid.sh analysis/`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 5 | `docs: 修复所有Mermaid语法错误并建立CI检查流程` | scripts/*, analysis/*.md | bash scripts/check-mermaid.sh analysis/ |

---

## Success Criteria

### Verification Commands
```bash
# 运行CI检查
bash scripts/check-mermaid.sh analysis/

# 验证无未修复的节点定义
grep -n '\[[^"]*<br\/>[^"]*\]' analysis/*.md | wc -l
# Expected: 0

# 验证无未修复的participant
grep -n 'participant.*<br/>' analysis/*.md | wc -l
# Expected: 0

# 检查commit
git log -1 --stat
```

### Final Checklist
- [x] 所有8个文件已修复
- [x] 备份文件已创建（可选）
- [x] CI脚本可正常工作
- [x] Git commit已创建
- [x] 所有验证命令通过
