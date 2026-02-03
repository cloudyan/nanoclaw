# NanoClaw 源码解读文档系列 - 工作计划

## TL;DR

> **快速摘要**：为 NanoClaw 项目创建完整的源码解读文档系列（从入门到精通），共 28 篇文档，输出到 `analysis/` 目录，面向中文开发者。
> 
> **交付物**：
> - 00-入门系列（4篇）：项目概览、环境搭建、快速开始、核心概念
> - 10-架构深入（6篇）：整体架构、消息路由、容器系统、调度、IPC、安全模型
> - 20-模块解析（8篇）：index.ts、container-runner.ts、task-scheduler.ts、db.ts、mount-security.ts、whatsapp-auth.ts、utils、agent-runner
> - 30-高级主题（6篇）：安全设计、对话归档、性能优化、故障排查、扩展指南、部署 checklist
> - 附录：术语对照表、架构图集、命令速查
> 
> **预计工作量**：XL（大型项目）
> **并行执行**：YES - 4 波次（入门系列→架构→模块解析→高级主题）
> **关键路径**：00-03（核心概念）→ 10-10（整体架构）→ 20-20→23（核心模块）→ 30-35（部署）

---

## Context

### Original Request

用户要求为 NanoClaw 项目添加详细的源码解读文档到 `analysis` 目录，输出完整的项目解读系列，从入门到精通。

### Interview Summary

**核心需求确认**：
- 文档受众：中文开发者
- 文档深度：源码级别，需要逐函数解释项目特有逻辑
- 输出位置：`analysis/` 目录
- 文档范围：覆盖所有核心模块源码，从基础概念到高级主题

**技术栈确认**：
- Node.js 20+ + TypeScript
- baileys（WhatsApp 连接）
- better-sqlite3（SQLite 数据库）
- Apple Container / Docker（容器隔离）
- Claude Agent SDK（Agent 执行）

### Research Findings

**探索 Agent 发现**（3 并行任务）：
1. **项目结构分析**：9 个核心 TypeScript 文件，总计约 2000 行代码，架构清晰的极简设计
2. **现有文档评估**：包含 README.md（用户文档）、docs/SPEC.md（技术规范）、docs/REQUIREMENTS.md（架构决策）、docs/SECURITY.md（安全模型），但缺少系统化的源码解读
3. **核心源码分析**：单进程架构，消息轮询模式，文件系统 IPC，容器隔离执行

**Librarian Agent 发现**：
- 无需外部库文档查询（依赖为标准 npm 包，用法直接）

### Metis Review

**关键建议（已整合）**：

| 建议 | 整合方式 |
|------|----------|
| 新增环境搭建文档 | 添加 analysis/01-环境搭建与依赖详解.md |
| 新增 IPC 机制文档 | 添加 analysis/14-IPC 机制深度解析.md |
| 新增安全模型文档 | 添加 analysis/15-安全模型实现细节.md |
| 分离安全模块源码解读 | 添加 analysis/24-mount-security.ts 源码解读.md |
| 添加认证流程文档 | 添加 analysis/25-whatsapp-auth.ts 源码解读.md |
| 添加双层架构文档 | 添加 analysis/27-agent-runner 容器内代码.md |
| 扩展高级主题 | 添加对话归档、部署 checklist |
| 中文读者适配 | 添加术语对照表，使用类比解释 |
| 质量标准 | 每篇文档必须包含学习目标、验证步骤、Mermaid 图表 |

**Guardrails Applied**：
- ✅ 不深入外部依赖内部（baileys、Claude Agent SDK 的实现）
- ✅ 不解释语言基础知识（TypeScript/JavaScript）
- ✅ 聚焦项目特有逻辑（IPC、安全隔离、调度系统）
- ✅ 所有验证步骤必须可执行，无需人工干预

**Auto-Resolved Issues**：
- ✅ 文档顺序调整：采用"由外而内"策略（先让读者能运行，再解释内部）
- ✅ 文件引用验证：所有源码文件路径经探索 Agent 确认存在
- ✅ 输出目录确认：`analysis/` 目录将在任务执行时创建

---

## Work Objectives

### Core Objective

创建完整的 NanoClaw 源码解读文档系列（28 篇），帮助中文开发者从零开始深入理解项目架构、核心模块实现和高级设计决策。

### Concrete Deliverables

**文档结构**：
```
analysis/
├── 00-项目概览与哲学.md
├── 01-环境搭建与依赖详解.md
├── 02-快速开始指南.md
├── 03-核心概念入门.md
├── 10-整体架构与数据流.md
├── 11-消息路由机制.md
├── 12-容器隔离系统.md
├── 13-调度系统详解.md
├── 14-IPC 机制深度解析.md
├── 15-安全模型实现细节.md
├── 20-index.ts 源码解读.md
├── 21-container-runner.ts 源码解读.md
├── 22-task-scheduler.ts 源码解读.md
├── 23-db.ts 源码解读.md
├── 24-mount-security.ts 源码解读.md
├── 25-whatsapp-auth.ts 源码解读.md
├── 26-utils.ts 与工具函数.md
├── 27-agent-runner 容器内代码.md
├── 30-安全设计深度解析.md
├── 31-对话归档与会话压缩.md
├── 32-性能优化与最佳实践.md
├── 33-故障排查与调试.md
├── 34-扩展与集成指南.md
├── 35-生产部署 checklist.md
├── 附录-术语对照表.md
├── 附录-架构图集.md
└── 附录-命令速查.md
```

### Definition of Done

- [ ] 所有 28 篇文档创建完成，包含完整内容
- [ ] 每篇文档包含学习目标、Mermaid 图表、代码片段（带行号）、验证步骤
- [ ] 所有 Markdown 语法正确，无格式错误
- [ ] 所有代码引用路径和行号与当前代码库匹配
- [ ] 所有验证步骤可执行（bash 命令）
- [ ] 术语对照表覆盖所有技术术语

### Must Have

- ✅ 每篇文档必须包含"学习目标"章节
- ✅ 复杂流程必须包含 Mermaid 图表
- ✅ 关键安全代码（mount-security.ts）必须逐行解释
- ✅ 代码片段必须包含文件路径和行号
- ✅ 术语首次出现时附中文解释
- ✅ 每篇文档结束必须包含验证 checklist

### Must NOT Have (Guardrails)

- ❌ 不深入外部依赖的内部实现（baileys、Claude Agent SDK 源码）
- ❌ 不解释 TypeScript/JavaScript 语言基础知识
- ❌ 不使用"显然"、"简单"等主观描述
- ❌ 不创建无法验证的纯理论章节
- ❌ 不深入 Apple Container/Docker 底层原理
- ❌ 不解释 AI/LLM 工作原理

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
> 
> ALL verification steps must be executable WITHOUT any human action.
> Each markdown file is verified automatically using shell commands.

### Test Decision

- **Automated Tests**: None（文档生成任务）
- **Agent-Executed QA Scenarios**: MANDATORY（每篇文档的验证步骤）

### Agent-Executed QA Scenarios (MANDATORY — ALL Tasks)

每篇文档生成后，执行以下验证：

```
Scenario: Markdown 文档语法验证
  Tool: Bash
  Preconditions: Document generated at analysis/{filename}.md
  Steps:
    1. markdownlint analysis/{filename}.md 2>&1 | grep -E "error|warning" || echo "No issues"
    2. grep -E "^#{1,6} " analysis/{filename}.md | wc -l  # 至少 5 个标题
    3. grep -E "```(typescript|bash|javascript|mermaid)" analysis/{filename}.md | wc -l  # 代码块存在
    4. grep "## 学习目标" analysis/{filename}.md  # 学习目标章节存在
  Expected Result: 
    - Markdown 无语法错误
    - 至少 5 个标题
    - 至少 1 个代码块
    - 学习目标章节存在

Scenario: 文档结构完整性验证
  Tool: Bash
  Preconditions: Document generated
  Steps:
    1. grep "## 读者将能够" analysis/{filename}.md  # 学习目标格式正确
    2. grep -E "## (核心概念|架构|实现细节|验证)" analysis/{filename}.md  # 核心章节存在
    3. grep -E "src/.*\.ts:\d+" analysis/{filename}.md | head -5  # 代码引用示例
    4. grep "```bash" analysis/{filename}.md | grep -E "(ls|cat|npm)"  # 验证命令存在
  Expected Result: 所有章节格式正确，包含验证步骤

Scenario: 术语双语对照验证（中文文档特有）
  Tool: Bash
  Preconditions: Document generated
  Steps:
    1. grep -E "（.*\(|\s+（.*）" analysis/{filename}.md  # 中文解释模式
    2. grep -E "(IPC|MCP|Container|WhatsApp)" analysis/{filename}.md | head -3  # 英文术语
  Expected Result: 关键术语首次出现时附有中文解释
```

---

## Execution Strategy

### Parallel Execution Waves

将 28 篇文档分为 4 波次，最大化并行效率：

```
Wave 1（入门系列 - 可并行 4 个任务）
├── 00-项目概览与哲学.md
├── 01-环境搭建与依赖详解.md
├── 02-快速开始指南.md
└── 03-核心概念入门.md

Wave 2（架构深入 - 可并行 6 个任务，依赖 Wave 1）
├── 10-整体架构与数据流.md
├── 11-消息路由机制.md
├── 12-容器隔离系统.md
├── 13-调度系统详解.md
├── 14-IPC 机制深度解析.md
└── 15-安全模型实现细节.md

Wave 3（模块解析 - 可并行 8 个任务，依赖 Wave 2）
├── 20-index.ts 源码解读.md
├── 21-container-runner.ts 源码解读.md
├── 22-task-scheduler.ts 源码解读.md
├── 23-db.ts 源码解读.md
├── 24-mount-security.ts 源码解读.md
├── 25-whatsapp-auth.ts 源码解读.md
├── 26-utils.ts 与工具函数.md
└── 27-agent-runner 容器内代码.md

Wave 4（高级主题 - 可并行 6 个任务，依赖 Wave 2,3）
├── 30-安全设计深度解析.md
├── 31-对话归档与会话压缩.md
├── 32-性能优化与最佳实践.md
├── 33-故障排查与调试.md
├── 34-扩展与集成指南.md
├── 35-生产部署 checklist.md
└── 附录（术语对照表、架构图集、命令速查）

关键路径：Wave 1 → Wave 2 → Wave 3 → Wave 4
并行加速：约 60% 快于顺序执行
```

### Dependency Matrix

| Wave | Tasks | Depends On | Can Parallelize With |
|------|-------|------------|---------------------|
| 1 | 00, 01, 02, 03 | None | None（启动波） |
| 2 | 10, 11, 12, 13, 14, 15 | Wave 1 全部完成 | None |
| 3 | 20, 21, 22, 23, 24, 25, 26, 27 | Wave 2 全部完成 | None（可内部 4×2 并行） |
| 4 | 30-35 + 附录 | Wave 2, 3 完成 | None |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agent |
|------|-------|-------------------|
| 1 | 00, 01, 02, 03 | delegate_task(category="writing", load_skills=["code-mentor"], run_in_background=true) × 4 |
| 2 | 10, 11, 12, 13 | delegate_task(category="writing", load_skills=["code-mentor"], run_in_background=true) × 4<br/>14, 15 需要 Oracle 咨询 |
| 3 | 20, 21, 22, 23 | delegate_task(category="unspecified-high", load_skills=["code-mentor"], run_in_background=true) × 4<br/>24, 25, 26, 27 内部 2×2 并行 |
| 4 | 30-35 + 附录 | delegate_task(category="writing", load_skills=["code-mentor"], run_in_background=true) × 6 |

---

## TODOs

- [ ] 0. 创建 analysis 目录结构
  **What to do**:
  - 创建 `analysis/` 目录
  - 创建 `.gitkeep` 文件以确保空目录被 Git 跟踪
  - 验证目录写入权限

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 单纯的目录创建，一分钟任务
  - **Skills**: 无需

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential（启动任务）
  - **Blocks**: All documentation tasks
  - **Blocked By**: None

  **References**:
  - **Pattern References**: 无（基础任务）

  **Acceptance Criteria**:
  - [ ] analysis/ 目录创建成功
  - [ ] analysis/.gitkeep 文件创建成功
  - [ ] ls -la analysis/ 返回包含 .gitkeep
  - [ ] mkdir -p analysis  命令成功

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: 验证 analysis 目录和 .gitkeep 存在
    Tool: Bash
    Preconditions: None
    Steps:
      1. test -d analysis/  # 目录存在
      2. test -f analysis/.gitkeep  # .gitkeep 文件存在
      3. ls -la analysis/ | grep gitkeep  # 确认文件列在目录中
    Expected Result: 目录存在且 .gitkeep 文件已创建
  ```

  **Commit**: YES
  - Message: `docs: create analysis directory for source code documentation`
  - Files: `analysis/.gitkeep`

---

### WAVE 1: 入门系列（4 篇）

- [ ] 1. 00-项目概览与哲学.md

  **What to do**:
  - 阅读 README.md、docs/REQUIREMENTS.md
  - 解释 NanoClaw 的设计哲学（极致简洁、安全隔离、AI-Native、Skills over Features）
  - 对比与 OpenClaw 的差异
  - 使用图表展示项目规模（52+ 模块 → 9 个文件）
  - 包含 Mermaid 架构概览图

  **Must NOT do**:
  - 不解释具体实现细节（留给后续文档）

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: 文档编写，需要清晰的叙述和解释
  - **Skills**: [`code-mentor`]
    - `code-mentor`: 解释项目概念和设计哲学，适合初学者理解

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1（与 01, 02, 03）
  - **Blocks**: None
  - **Blocked By**: Task 0

  **References**:
  - **Documentation**: `README.md` (Why I Built This, Philosophy, What It Supports)
  - **Documentation**: `docs/REQUIREMENTS.md` (Why This Exists, Philosophy, RFS)
  - **Documentation**: `docs/SPEC.md` (Architecture section)

  **Acceptance Criteria**:
  - [ ] 文档创建: analysis/00-项目概览与哲学.md
  - [ ] 包含"学习目标"章节："读者将能够..."
  - [ ] 包含 Mermaid 架构概览图
  - [ ] 包含项目规模对比表（OpenClaw vs NanoClaw）
  - [ ] 包含 4 大设计哲学的详细解释
  - [ ] 包含中文术语对照表（首次出现）

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: 入门文档结构验证
    Tool: Bash
    Preconditions: Document generated
    Steps:
      1. grep "## 读者将能够" analysis/00-项目概览与哲学.md
      2. grep "```mermaid" analysis/00-项目概览与哲学.md
      3. grep "设计哲学" analysis/00-项目概览与哲学.md | wc -l  # 至少 4 次
      4. grep "（.*\(|\s+（.*）" analysis/00-项目概览与哲学.md  # 中文解释
    Expected Result: 所有核心章节存在

  Scenario: Markdown 验证
    Tool: Bash
    Steps:
      1. markdownlint analysis/00-项目概览与哲学.md 2>&1 || true
      2. grep -E "^#{1,6} " analysis/00-项目概览与哲学.md | wc -l
    Expected Result: 
      - Markdown 语法正确（无 block 规则错误）
      - 至少 10 个标题
  ```

  **Commit**: NO
  - 等待 Wave 1 全部完成后统一提交

---

- [ ] 2. 01-环境搭建与依赖详解.md

  **What to do**:
  - 阅读 package.json、README.md (Requirements)
  - 解释所有依赖的用途（baileys, better-sqlite3, pino 等）
  - 详细的安装步骤（Node.js、Apple Container/Docker）
  - 环境变量配置说明
  - 验证命令（node --version, container --version）

  **Must NOT do**:
  - 不重复 README.md 的 Quick Start（聚焦技术细节）

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: 技术文档，需要详细的命令和配置解释
  - **Skills**: [`code-mentor`]
    - `code-mentor`: 解释环境搭建的技术细节

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1（与 00, 02, 03）
  - **Blocks**: None
  - **Blocked By**: Task 0

  **References**:
  - **Configuration**: `package.json` (dependencies, devDependencies)
  - **Documentation**: `README.md` (Requirements, Quick Start)
  - **Documentation**: `src/config.ts` (环境变量引用)

  **Acceptance Criteria**:
  - [ ] 文档创建: analysis/01-环境搭建与依赖详解.md
  - [ ] 包含所有 8 个依赖的用途说明表
  - [ ] 包含 macOS 和 Linux 的安装步骤
  - [ ] 包含环境变量配置列表（ASSISTANT_NAME, LOG_LEVEL, CONTAINER_IMAGE 等）
  - [ ] 包含验证步骤的 bash 命令

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: 依赖完整性验证
    Tool: Bash
    Preconditions: Document generated
    Steps:
      1. grep "baileys" analysis/01-环境搭建与依赖详解.md
      2. grep "better-sqlite3" analysis/01-环境搭建与依赖详解.md
      3. grep "pino" analysis/01-环境搭建与依赖详解.md
      4. grep -c "@whiskeysockets" analysis/01-环境搭建与依赖详解.md
    Expected Result: 所有主要依赖被提及

  Scenario: 验证命令可执行性
    Tool: Bash
    Steps:
      1. grep "node --version" analysis/01-环境搭建与依赖详解.md
      2. grep "npm install" analysis/01-环境搭建与依赖详解.md
      3. grep -E "ASSISTANT_NAME|LOG_LEVEL" analysis/01-环境搭建与依赖详解.md
    Expected Result: 包含关键验证命令
  ```

  **Commit**: NO

---

- [ ] 3. 02-快速开始指南.md

  **What to do**:
  - 基于 README.md 的 Quick Start
  - 创建分步骤的入门教程
  - 包含首次运行的预期输出验证
  - 解释 `/setup` 流程
  - 常见问题排查

  **Must NOT do**:
  - 不深入内部机制（保持简单）

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: 教程式文档，需要循序渐进的步骤
  - **Skills**: [`code-mentor`]
    - `code-mentor`: 解释快速开始的工作流

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1（与 00, 01, 03）
  - **Blocks**: None
  - **Blocked By**: Task 0

  **References**:
  - **Documentation**: `README.md` (Quick Start, Usage section)
  - **Skill Reference**: `.claude/skills/setup/SKILL.md` (setup 流程参考)

  **Acceptance Criteria**:
  - [ ] 文档创建: analysis/02-快速开始指南.md
  - [ ] 包含至少 5 个步骤（clone → npm install → setup → auth → start）
  - [ ] 包含预期输出示例
  - [ ] 包含首次对话示例（@Andy 测试）
  - [ ] 包含常见问题（FAQ）

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: 教程步骤完整性验证
    Tool: Bash
    Preconditions: Document generated
    Steps:
      1. grep -E "^[0-9]+\." analysis/02-快速开始指南.md | wc -l  # 步骤数量
      2. grep "npm install" analysis/02-快速开始指南.md
      3. grep "/setup" analysis/02-快速开始指南.md
      4. grep "@Andy" analysis/02-快速开始指南.md
    Expected Result: 至少 5 个步骤，包含关键命令

  Scenario: 输出示例验证
    Tool: Bash
    Steps:
      1. grep "```bash" analysis/02-快速开始指南.md
      2. grep "预期输出" analysis/02-快速开始指南.md
    Expected Result: 包含代码块和输出示例
  ```

  **Commit**: NO

---

- [ ] 4. 03-核心概念入门.md

  **What to do**:
  - 解释核心概念：WhatsApp Group、Main Channel、Trigger Pattern、Container、IPC、Memory System
  - 使用中文类比解释抽象概念（如 IPC 文件系统 →"信箱"）
  - 包含概念关系图（Mermaid）
  - 对比传统应用与 AI-Native 应用的差异

  **Must NOT do**:
  - 不深入实现细节（概念层面）

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: 概念解释，需要类比和清晰定义
  - **Skills**: [`code-mentor`]
    - `code-mentor`: 解释核心概念和技术术语

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1（与 00, 01, 02）
  - **Blocks**: Wave 2（架构系列）
  - **Blocked By**: Task 0

  **References**:
  - **Code Patterns**: `src/config.ts` (TRIGGER_PATTERN, ASSISTANT_NAME)
  - **Documentation**: `docs/REQUIREMENTS.md` (Philosophy, Architecture Decisions)
  - **Documentation**: `docs/SECURITY.md` (Isolation model)

  **Acceptance Criteria**:
  - [ ] 文档创建: analysis/03-核心概念入门.md
  - [ ] 包含 6 个核心概念的定义和类比
  - [ ] 包含 Mermaid 概念关系图
  - [ ] 包含传统应用 vs AI-Native 应用对比表
  - [ ] 包含中文术语对照（首次出现）

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: 概念定义完整性验证
    Tool: Bash
    Preconditions: Document generated
    Steps:
      1. grep "## .*概念" analysis/03-核心概念入门.md | wc -l  # 概念章节
      2. grep -E "(WhatsApp Group|Main Channel|Trigger Pattern|Container|IPC|Memory)" analysis/03-核心概念入门.md
      3. grep "```mermaid" analysis/03-核心概念入门.md
    Expected Result: 
      - 至少 6 个概念章节
      - 所有核心概念被提及
      - 包含 Mermaid 图

  Scenario: 类比解释验证
    Tool: Bash
    Steps:
      1. grep -E "(类比|类似|像|好比)" analysis/03-核心概念入门.md
      2. grep "（.*\(|\s+（.*）" analysis/03-核心概念入门.md  # 中文解释
    Expected Result: 包含类比和中文解释
  ```

  **Commit**: YES（Wave 1 统一提交）
  - Message: `docs: add Wave 1 documentation - project overview, setup, quickstart, concepts`
  - Files: `analysis/00-*.md`, `analysis/01-*.md`, `analysis/02-*.md`, `analysis/03-*.md`

---

### WAVE 2: 架构深入（6 篇）

- [ ] 5. 10-整体架构与数据流.md

  **What to do**:
  - 基于 docs/SPEC.md 的 Architecture section
  - 创建详细的整体架构图（Host vs Container）
  - 解释数据流：WhatsApp → SQLite → Router Loop → Container → Response
  - 说明三层架构：消息层、路由层、执行层
  - 包含进程架构图

  **Must NOT do**:
  - 不深入某个模块的细节（架构层面）

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: 架构文档，需要图表和高层描述
  - **Skills**: [`code-mentor`]
    - `code-mentor`: 解释整体架构和数据流

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2（与 11, 12, 13）
  - **Blocks**: None
  - **Blocked By**: Wave 1（00-03 全部完成）

  **References**:
  - **Documentation**: `docs/SPEC.md` (Architecture diagram, Technology Stack)
  - **Documentation**: `docs/REQUIREMENTS.md` (Architecture Decisions)
  - **Code Patterns**: `src/index.ts` (top-level structure)

  **Acceptance Criteria**:
  - [ ] 文档创建: analysis/10-整体架构与数据流.md
  - [ ] 包含 Host vs Container 架构图（Mermaid）
  - [ ] 包含数据流图（Mermaid sequence 或 flowchart）
  - [ ] 包含三层架构说明：消息层、路由层、执行层
  - [ ] 包含技术栈对照表

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: 架构图完整性验证
    Tool: Bash
    Preconditions: Document generated
    Steps:
      1. grep -c "```mermaid" analysis/10-整体架构与数据流.md  # 至少 2 个图
      2. grep "Host" analysis/10-整体架构与数据流.md
      3. grep "Container" analysis/10-整体架构与数据流.md
      4. grep "数据流" analysis/10-整体架构与数据流.md
    Expected Result: 
      - 至少 2 个 Mermaid 图
      - 关键组件被提及

  Scenario: 技术栈验证
    Tool: Bash
    Steps:
      1. grep "baileys" analysis/10-整体架构与数据流.md
      2. grep "better-sqlite3" analysis/10-整体架构与数据流.md
      3. grep "Apple Container" analysis/10-整体架构与数据流.md
    Expected Result: 所有技术栈组件被提及
  ```

  **Commit**: NO（Wave 2 统一提交）

---

- [ ] 6. 11-消息路由机制.md

  **What to do**:
  - 阅读并解释 src/index.ts 的路由逻辑
  - 解释 TRIGGER_PATTERN 匹配
  - 说明 Main Channel 与其他 Groups 的路由差异
  - 解释 Polling Loop 工作原理
  - 包含路由流程图（Mermaid flowchart）

  **Must NOT do**:
  - 不深入 WhatsApp 消息格式（baileys 职责）

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: 机制解释，需要流程图和代码示例
  - **Skills**: [`code-mentor`]
    - `code-mentor`: 解释路由机制的实现

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2（与 10, 12, 13）
  - **Blocks**: None
  - **Blocked By**: Wave 1

  **References**:
  - **Implementation**: `src/index.ts:131-250` (processMessage, message loop)
  - **Pattern References**: `src/config.ts:27` (TRIGGER_PATTERN)
  - **Database Operations**: `src/db.ts:storeMessage, getNewMessages`

  **Acceptance Criteria**:
  - [ ] 文档创建: analysis/11-消息路由机制.md
  - [ ] 包含路由流程图（Mermaid flowchart）
  - [ ] 解释 processMessage 函数逻辑（带行号引用）
  - [ ] 说明 Main Channel vs 其他 Groups 的路由差异
  - [ ] 解释 Polling Loop 机制（POLL_INTERVAL: 2000ms）

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: 路由逻辑验证
    Tool: Bash
    Preconditions: Document generated
    Steps:
      1. grep "processMessage" analysis/11-消息路由机制.md
      2. grep "TRIGGER_PATTERN" analysis/11-消息路由机制.md
      3. grep "src/index.ts:\|src/index.ts:1" analysis/11-消息路由机制.md
      4. grep "Main Channel" analysis/11-消息路由机制.md
    Expected Result: 
      - processMessage 函数被解释
      - 代码引用包含文件路径和行号
      - Main Channel 差异被说明

  Scenario: 流程图验证
    Tool: Bash
    Steps:
      1. grep "```mermaid" analysis/11-消息路由机制.md
      2. grep -E "(flowchart|sequenceDiagram)" analysis/11-消息路由机制.md
    Expected Result: 包含 Mermaid 流程图
  ```

  **Commit**: NO

---

- [ ] 7. 12-容器隔离系统.md

  **What to do**:
  - 阅读 src/container-runner.ts 的容器管理逻辑
  - 解释 Volume Mounts 的构建（Main vs 其他 Groups）
  - 说明文件系统隔离机制
  - 解释 Container Lifecycle（spawn → execute → collect output → cleanup）
  - 包含容器生命周期图（Mermaid sequence）

  **Must NOT do**:
  - 不深入 Apple Container 底层原理

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: 容器机制，需要生命周期图和隔离解释
  - **Skills**: [`code-mentor`]
    - `code-mentor`: 解释容器隔离的实现

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2（与 10, 11, 13）
  - **Blocks**: None
  - **Blocked By**: Wave 1

  **References**:
  - **Implementation**: `src/container-runner.ts:60-157` (buildVolumeMounts)
  - **Implementation**: `src/container-runner.ts:160-250` (runContainerAgent)
  - **Security**: `src/mount-security.ts` (allowlist validation)

  **Acceptance Criteria**:
  - [ ] 文档创建: analysis/12-容器隔离系统.md
  - [ ] 包含容器生命周期图（Mermaid sequence）
  - [ ] 解释 buildVolumeMounts 函数（带行号）
  - [ ] 说明 Main Group vs 其他 Groups 的挂载差异
  - [ ] 解释隔离机制（/workspace/group, /workspace/global, .claude/）

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: 容器配置验证
    Tool: Bash
    Preconditions: Document generated
    Steps:
      1. grep "buildVolumeMounts" analysis/12-容器隔离系统.md
      2. grep "/workspace/group" analysis/12-容器隔离系统.md
      3. grep "/workspace/global" analysis/12-容器隔离系统.md
      4. grep "src/container-runner.ts:" analysis/12-容器隔离系统.md
    Expected Result: 
      - 挂载函数被解释
      - 关键路径被提及
      - 代码引用包含行号

  Scenario: 生命周期图验证
    Tool: Bash
    Steps:
      1. grep "```mermaid" analysis/12-容器隔离系统.md
      2. grep -E "(spawn|execute|cleanup)" analysis/12-容器隔离系统.md
    Expected Result: 包含生命周期阶段的 Mermaid 图
  ```

  **Commit**: NO

---

- [ ] 8. 13-调度系统详解.md

  **What to do**:
  - 阅读 src/task-scheduler.ts 的调度逻辑
  - 解释三种调度类型：cron、interval（毫秒）、one-time（ISO timestamp）
  - 说明 Scheduler Loop（SCHEDULER_POLL_INTERVAL: 60000ms）
  - 解释 Task Execution Flow
  - 包含调度系统架构图（Mermaid）

  **Must NOT do**:
  - 不深入 cron-parser 库的实现

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: 调度逻辑，需要架构图和时间线解释
  - **Skills**: [`code-mentor`]
    - `code-mentor`: 解释调度系统的实现

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2（与 10, 11, 12）
  - **Blocks**: None
  - **Blocked By**: Wave 1

  **References**:
  - **Implementation**: `src/task-scheduler.ts:21-100` (runTask, startSchedulerLoop)
  - **Database**: `src/db.ts:getDueTasks, updateTaskAfterRun, logTaskRun`
  - **Configuration**: `src/config.ts:5` (SCHEDULER_POLL_INTERVAL)

  **Acceptance Criteria**:
  - [ ] 文档创建: analysis/13-调度系统详解.md
  - [ ] 包含调度系统架构图（Mermaid）
  - [ ] 解释三种调度类型（cron、interval、one-time）
  - [ ] 说明 Scheduler Loop 机制（60s 轮询）
  - [ ] 解释 Task Execution Flow（带行号引用）

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: 调度类型验证
    Tool: Bash
    Preconditions: Document generated
    Steps:
      1. grep -E "(cron|interval|one-time)" analysis/13-调度系统详解.md
      2. grep "getDueTasks" analysis/13-调度系统详解.md
      3. grep "SCHEDULER_POLL_INTERVAL" analysis/13-调度系统详解.md
      4. grep "src/task-scheduler.ts:" analysis/13-调度系统详解.md
    Expected Result: 
      - 所有调度类型被解释
      - 数据库函数被引用
      - 配置常量被提及
      - 代码引用包含行号

  Scenario: 架构图验证
    Tool: Bash
    Steps:
      1. grep "```mermaid" analysis/13-调度系统详解.md
      2. grep -E "(getDueTasks|runTask|updateTask)" analysis/13-调度系统详解.md
    Expected Result: 包含调度流程的 Mermaid 图
  ```

  **Commit**: NO

---

- [ ] 9. 14-IPC 机制深度解析.md

  **What to do**:
  - **需要 Oracle 咨询**（IPC 是核心创新点）
  - 解释基于文件系统的 IPC 机制（非网络 socket）
  - 说明 IPC 目录结构（data/ipc/{group}/messages/, data/ipc/{group}/tasks/）
  - 解释 IPC 授权检查（main group vs 其他 groups）
  - 说明 Container 与 Host 的双向通信
  - 包含 IPC 流程图（Mermaid）

  **Must NOT do**:
  - 不建议用户改为消息队列

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: IPC 是核心创新点，需要深入解释和 Oracle 咨询
  - **Skills**: [`code-mentor`]
    - `code-mentor`: 解释 IPC 机制的设计和工作原理

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2（与 15，需 Oracle 并行）
  - **Blocks**: None
  - **Blocked By**: Wave 1

  **References**:
  - **Implementation**: `src/index.ts:350-489` (IPC watcher)
  - **Implementation**: `container/agent-runner/src/ipc-mcp.ts` (container side IPC)
  - **Directory Structure**: `data/ipc/` 目录的实际结构

  **Acceptance Criteria**:
  - [ ] 文档创建: analysis/14-IPC 机制深度解析.md
  - [ ] 包含 IPC 流程图（Mermaid）
  - [ ] 解释文件系统 IPC 的优势和局限
  - [ ] 说明 IPC 目录结构（messages/, tasks/）
  - [ ] 解释 Host → Container 和 Container → Host 的通信路径

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: IPC 结构验证
    Tool: Bash
    Preconditions: Document generated
    Steps:
      1. grep "data/ipc/" analysis/14-IPC 机制深度解析.md
      2. grep -E "(messages|tasks)" analysis/14-IPC 机制深度解析.md
      3. grep "文件系统" analysis/14-IPC 机制深度解析.md
      4. grep "src/index.ts:" analysis/14-IPC 机制深度解析.md
    Expected Result: 
      - IPC 目录结构被解释
      - 文件系统机制被强调
      - 代码引用包含行号

  Scenario: 流程图验证
    Tool: Bash
    Steps:
      1. grep "```mermaid" analysis/14-IPC 机制深度解析.md
      2. grep -E "(Host|Container|IPC)" analysis/14-IPC 机制深度解析.md
    Expected Result: 包含 IPC 通信流程的 Mermaid 图
  ```

  **Commit**: NO

---

- [ ] 10. 15-安全模型实现细节.md

  **What to do**:
  - **需要 Oracle 咨询**（安全是核心卖点）
  - 基于 docs/SECURITY.md 的安全模型
  - 解释 OS 级隔离 vs 应用层权限的差异
  - 说明 mount-security.ts 的 allowlist 机制
  - 解释路径遍历防护
  - 对比 OpenClaw 的安全模型差异
  - 包含安全边界图（Mermaid）

  **Must NOT do**:
  - 不宣称"绝对安全"（强调缓解措施）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 安全是核心卖点，需要深入解释和 Oracle 咨询
  - **Skills**: [`code-mentor`]
    - `code-mentor`: 解释安全模型的设计和实现

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2（与 14，需 Oracle 并行）
  - **Blocks**: None
  - **Blocked By**: Wave 1

  **References**:
  - **Documentation**: `docs/SECURITY.md` (完整的安全模型文档)
  - **Implementation**: `src/mount-security.ts` (allowlist, path validation)
  - **Documentation**: `docs/REQUIREMENTS.md` (Security Through True Isolation)

  **Acceptance Criteria**:
  - [ ] 文档创建: analysis/15-安全模型实现细节.md
  - [ ] 包含安全边界图（Mermaid）
  - [ ] 解释 OS 级隔离 vs 应用层权限
  - [ ] 说明 allowlist 机制
  - [ ] 解释路径遍历防护（关键安全代码）
  - [ ] 对比 OpenClaw 的安全模型

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: 安全机制验证
    Tool: Bash
    Preconditions: Document generated
    Steps:
      1. grep "allowlist" analysis/15-安全模型实现细节.md
      2. grep "路径遍历防护\|path traversal" analysis/15-安全模型实现细节.md
      3. grep "OS 级隔离" analysis/15-安全模型实现细节.md
      4. grep "OpenClaw" analysis/15-安全模型实现细节.md
    Expected Result: 
      - allowlist 机制被解释
      - 路径防护被详细说明
      - 对比 OpenClaw

  Scenario: 流程图验证
    Tool: Bash
    Steps:
      1. grep "```mermaid" analysis/15-安全模型实现细节.md
      2. grep -E "(隔离|permission|isolation)" analysis/15-安全模型实现细节.md
    Expected Result: 包含安全边界的 Mermaid 图
  ```

  **Commit**: YES（Wave 2 统一提交）
  - Message: `docs: add Wave 2 documentation - architecture deep dive (6 docs)`
  - Files: `analysis/10-*.md`, `analysis/11-*.md`, `analysis/12-*.md`, `analysis/13-*.md`, `analysis/14-*.md`, `analysis/15-*.md`

---

### WAVE 3: 模块解析（8 篇）

- [ ] 11. 20-index.ts 源码解读.md

  **What to do**:
  - 逐模块解释 src/index.ts（约 600 行）
  - 重点解释：WhatsApp连接、消息轮询 loop、IPC 授权检查、进程管理
  - 关键函数详细讲解：loadState, saveState, processMessage, startMainLoop
  - 包含代码片段（带行号和文件路径）
  - 说明状态持久化机制

  **Must NOT do**:
  - 不逐行解释每个语句（聚焦关键逻辑和设计决策）
  - 不解释 baileys 库的 API 细节

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 主应用源码，需要详细逐函数解释
  - **Skills**: [`code-mentor`]
    - `code-mentor`: 深度解读源码，解释设计决策

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3-A（与 21, 22, 23）
  - **Blocks**: None
  - **Blocked By**: Wave 2（10-15 全部完成）

  **References**:
  - **Full Source**: `src/index.ts` (完整源码)
  - **Key Sections**:
    - Lines 1-40: Imports and state initialization
    - Lines 49-73: State management (loadState, saveState, registerGroup)
    - Lines 80-129: Group metadata sync
    - Lines 131-250: processMessage function
    - Lines 350-489: IPC watcher and authorization
    - Lines 500-600: Main loop initialization

  **Acceptance Criteria**:
  - [ ] 文档创建: analysis/20-index.ts 源码解读.md
  - [ ] 包含至少 10 个关键函数的逐函数解释
  - [ ] 每个代码片段包含：文件路径、行号范围、功能说明
  - [ ] 解释状态持久化机制（lastTimestamp, lastAgentTimestamp, sessions）
  - [ ] 包含主程序流程图（Mermaid）

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: 关键函数覆盖验证
    Tool: Bash
    Preconditions: Document generated
    Steps:
      1. grep "processMessage" analysis/20-index.ts 源码解读.md
      2. grep "loadState\|saveState" analysis/20-index.ts 源码解读.md
      3. grep "syncGroupMetadata" analysis/20-index.ts 源码解读.md
      4. grep "IPCAuthorization" analysis/20-index.ts 源码解读.md
    Expected Result: 
      - 至少 10 个关键函数被解释
      - 核心功能函数被覆盖

  Scenario: 代码引用格式验证
    Tool: Bash
    Steps:
      1. grep "src/index.ts:\|src/index.ts:1" analysis/20-index.ts 源码解读.md | head -5
      2. grep -E "Lines|行" analysis/20-index.ts 源码解读.md | head -5
    Expected Result: 
      - 代码引用包含 src/index.ts: 行号
      - 行号范围被标注

  Scenario: 流程图验证
    Tool: Bash
    Steps:
      1. grep -c "```mermaid" analysis/20-index.ts 源码解读.md
      2. grep -E "(Main Loop|消息轮询|IPC)" analysis/20-index.ts 源码解读.md
    Expected Result: 
      - 至少 1 个 Mermaid 图
      - 主程序流程被可视化
  ```

  **Commit**: NO

---

- [ ] 12. 21-container-runner.ts 源码解读.md

  **What to do**:
  - 逐模块解释 src/container-runner.ts（约 350 行）
  - 重点解释：卷挂载构建、容器启动、输出解析、IPC 快照写入
  - 关键函数：buildVolumeMounts, runContainerAgent, writeTasksSnapshot, writeGroupsSnapshot
  - 包含代码片段（带行号和文件路径）
  - 说明 IPC 输出标记（OUTPUT_START_MARKER, OUTPUT_END_MARKER）

  **Must NOT do**:
  - 不深入 Apple Container CLI 命令参数（聚焦 NanoClaw 封装）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 容器运行器源码，需要详细解释隔离和挂载逻辑
  - **Skills**: [`code-mentor`]
    - `code-mentor`: 深度解读源码，解释容器生命周期

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3-A（与 20, 22, 23）
  - **Blocks**: None
  - **Blocked By**: Wave 2

  **References**:
  - **Full Source**: `src/container-runner.ts` (完整源码)
  - **Key Sections**:
    - Lines 26-58: HOME_DIR, ContainerInput/Output interfaces
    - Lines 60-157: buildVolumeMounts function
    - Lines 160-280: runContainerAgent function
    - Lines 300-350: Snapshot writing functions (writeTasksSnapshot, writeGroupsSnapshot)

  **Acceptance Criteria**:
  - [ ] 文档创建: analysis/21-container-runner.ts 源码解读.md
  - [ ] 包含至少 6 个关键函数的逐函数解释
  - [ ] 每个代码片段包含：文件路径、行号范围、功能说明
  - [ ] 重点解释 buildVolumeMounts 的挂载逻辑
  - [ ] 说明输出标记机制（OUTPUT_START/END_MARKER）

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: 关键函数覆盖验证
    Tool: Bash
    Preconditions: Document generated
    Steps:
      1. grep "buildVolumeMounts" analysis/21-container-runner.ts 源码解读.md
      2. grep "runContainerAgent" analysis/21-container-runner.ts 源码解读.md
      3. grep "writeTasksSnapshot\|writeGroupsSnapshot" analysis/21-container-runner.ts 源码解读.md
    Expected Result: 
      - 至少 6 个关键函数被解释
      - 核心容器函数被覆盖

  Scenario: 挂载逻辑验证
    Tool: Bash
    Steps:
      1. grep "/workspace/group" analysis/21-container-runner.ts 源码解读.md
      2. grep "/workspace/global" analysis/21-container-runner.ts 源码解读.md
      3. grep "/workspace/project" analysis/21-container-runner.ts 源码解读.md
      4. grep "src/container-runner.ts:" analysis/21-container-runner.ts 源码解读.md
    Expected Result:
      - 所有关键挂载路径被解释
      - 代码引用包含行号

  Scenario: 输出标记验证
    Tool: Bash
    Steps:
      1. grep "OUTPUT_START_MARKER\|OUTPUT_END_MARKER" analysis/21-container-runner.ts 源码解读.md
      2. grep "---NANOCLAW" analysis/21-container-runner.ts 源码解读.md
    Expected Result: 
      - 输出标记机制被详细说明
  ```

  **Commit**: NO

---

- [ ] 13. 22-task-scheduler.ts 源码解读.md

  **What to do**:
  - 逐模块解释 src/task-scheduler.ts（约 150 行）
  - 重点解释：任务执行、cron 解析、任务更新、错误处理
  - 关键函数：runTask, startSchedulerLoop, getNextRunTime
  - 包含代码片段（带行号和文件路径）
  - 说明任务状态转换（active, paused, completed）

  **Must NOT do**:
  - 不深入 cron-parser 库的内部实现

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 调度器源码，需要解释时间管理和状态转换
  - **Skills**: [`code-mentor`]
    - `code-mentor`: 深度解读源码，解释调度逻辑

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3-A（与 20, 21, 23）
  - **Blocks**: None
  - **Blocked By**: Wave 2

  **References**:
  - **Full Source**: `src/task-scheduler.ts` (完整源码)
  - **Key Sections**:
    - Lines 15-20: SchedulerDependencies interface
    - Lines 21-100: runTask function
    - Lines 110-150: startSchedulerLoop function

  **Acceptance Criteria**:
  - [ ] 文档创建: analysis/22-task-scheduler.ts 源码解读.md
  - [ ] 包含至少 5 个关键函数的逐函数解释
  - [ ] 每个代码片段包含：文件路径、行号范围、功能说明
  - [ ] 解释三种调度类型的具体实现
  - [ ] 说明任务状态转换逻辑

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: 关键函数覆盖验证
    Tool: Bash
    Preconditions: Document generated
    Steps:
      1. grep "runTask" analysis/22-task-scheduler.ts 源码解读.md
      2. grep "startSchedulerLoop" analysis/22-task-scheduler.ts 源码解读.md
      3. grep "updateTaskAfterRun\|logTaskRun" analysis/22-task-scheduler.ts 源码解读.md
    Expected Result: 
      - 至少 5 个关键函数被解释
      - 核心调度函数被覆盖

  Scenario: 调度类型验证
    Tool: Bash
    Steps:
      1. grep -E "(cron|interval|one-time)" analysis/22-task-scheduler.ts 源码解读.md
      2. grep "CronExpressionParser" analysis/22-task-scheduler.ts 源码解读.md
      3. grep "src/task-scheduler.ts:" analysis/22-task-scheduler.ts 源码解读.md
    Expected Result: 
      - 所有调度类型被解释
      - 代码引用包含行号

  Scenario: 状态转换验证
    Tool: Bash
    Steps:
      1. grep -E "(active|paused|completed)" analysis/22-task-scheduler.ts 源码解读.md
      2. grep "status" analysis/22-task-scheduler.ts 源码解读.md
    Expected Result: 任务状态转换被说明
  ```

  **Commit**: NO

---

- [ ] 14. 23-db.ts 源码解读.md

  **What to do**:
  - 逐模块解释 src/db.ts（约 200 行）
  - 重点解释：数据库初始化、消息存储、任务管理、聊天元数据
  - 关键函数：initDatabase, storeMessage, getNewMessages, getDueTasks, getAllTasks
  - 包含代码片段（带行号和文件路径）
  - 说明表结构（chats, messages, scheduled_tasks, task_run_logs）
  - 解释索引优化策略

  **Must NOT do**:
  - 不深入 better-sqlite3 的 API 细节

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 数据库模块源码，需要解释存储和查询逻辑
  - **Skills**: [`code-mentor`]
    - `code-mentor`: 深度解读源码，解释数据库设计

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3-A（与 20, 21, 22）
  - **Blocks**: None
  - **Blocked By**: Wave 2

  **References**:
  - **Full Source**: `src/db.ts` (完整源码)
  - **Key Sections**:
    - Lines 10-72: initDatabase function (table creation)
    - Lines 78-130: chat metadata operations
    - Lines 140-200: message storage and retrieval
    - Lines 210-280: scheduled task operations

  **Acceptance Criteria**:
  - [ ] 文档创建: analysis/23-db.ts 源码解读.md
  - [ ] 包含至少 8 个关键函数的逐函数解释
  - [ ] 每个代码片段包含：文件路径、行号范围、功能说明
  - [ ] 说明 4 个表的用途和字段
  - [ ] 解释索引优化策略

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: 关键函数覆盖验证
    Tool: Bash
    Preconditions: Document generated
    Steps:
      1. grep "initDatabase" analysis/23-db.ts 源码解读.md
      2. grep "storeMessage\|getNewMessages" analysis/23-db.ts 源码解读.md
      3. grep "getDueTasks\|getAllTasks" analysis/23-db.ts 源码解读.md
      4. grep "logTaskRun\|updateTaskAfterRun" analysis/23-db.ts 源码解读.md
    Expected Result: 
      - 至少 8 个关键函数被解释
      - 消息和任务函数被覆盖

  Scenario: 表结构验证
    Tool: Bash
    Steps:
      1. grep -E "(chats|messages|scheduled_tasks|task_run_logs)" analysis/23-db.ts 源码解读.md
      2. grep "CREATE TABLE" analysis/23-db.ts 源码解读.md
      3. grep "CREATE INDEX" analysis/23-db.ts 源码解读.md
    Expected Result: 
      - 所有表被解释
      - 索引优化被说明

  Scenario: 代码引用验证
    Tool: Bash
    Steps:
      1. grep "src/db.ts:" analysis/23-db.ts 源码解读.md | head -5
    Expected Result: 代码引用包含文件路径和行号
  ```

  **Commit**: YES（Wave 3-A 统一提交）
  - Message: `docs: add Wave 3-A documentation - core modules (index, container-runner, scheduler, db)`
  - Files: `analysis/20-*.md`, `analysis/21-*.md`, `analysis/22-*.md`, `analysis/23-*.md`

---

- [ ] 15. 24-mount-security.ts 源码解读.md

  **What to do**:
  - **关键安全模块，必须详细解释**
  - 逐模块解释 src/mount-security.ts（约 200 行）
  - 重点解释：allowlist 读取、路径验证、符号链接解析、路径遍历防护
  - 关键函数：loadMountAllowlist, validateMount, validateAdditionalMounts
  - 逐行解释路径遍历防护逻辑（关键安全代码）
  - 包含代码片段（带行号和文件路径）

  **Must NOT do**:
  - 不省略任何安全关键代码的解释

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: **安全核心模块，Metis 强调必须逐行解释**
  - **Skills**: [`code-mentor`]
    - `code-mentor`: 深度解读源码，强调安全防护逻辑

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3-B（与 25, 26, 27）
  - **Blocks**: None
  - **Blocked By**: Wave 2

  **References**:
  - **Full Source**: `src/mount-security.ts` (完整源码)
  -   **Critical Security Sections**:
    - Lines 56-113: loadMountAllowlist function (allowlist JSON 加载和缓存)
    - Lines 220-310: validateMount function (单个挂载验证)
    - Lines 310-350: validateAdditionalMounts function (批量验证)
    - **Lines 190-207**: isValidContainerPath（路径遍历防护，关键，必须详细解释）

  **Acceptance Criteria**:
  - [ ] 文档创建: analysis/24-mount-security.ts 源码解读.md
  - [ ] **必须逐行解释路径遍历防护逻辑（lines 190-207, isValidContainerPath 函数）**
  - [ ] 包含至少 6 个关键函数的逐函数解释
  - [ ] 每个代码片段包含：文件路径、行号范围、功能说明
  - [ ] 解释 allowlist 机制
  - [ ] 解释符号链接解析逻辑
  - [ ] 解释路径遍历攻击原理和防护方法

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: 安全代码覆盖验证
    Tool: Bash
    Preconditions: Document generated
    Steps:
      1. grep "loadMountAllowlist" analysis/24-mount-security.ts 源码解读.md
      2. grep "validateMount\|validateAdditionalMounts" analysis/24-mount-security.ts 源码解读.md
      3. grep "isValidContainerPath" analysis/24-mount-security.ts 源码解读.md
    Expected Result: 所有关键安全函数被解释

  Scenario: 路径遍历防护验证（关键）
    Tool: Bash
    Preconditions: Document generated
    Steps:
      1. grep "路径遍历防护\|path traversal" analysis/24-mount-security.ts 源码解读.md
      2. grep "\\.\\.\/\.\.\\\\\.\.\\" analysis/24-mount-security.ts 源码解读.md
      3. grep -c "src/mount-security.ts:1" analysis/24-mount-security.ts 源码解读.md
    Expected Result:
      - 路径遍历攻击被详细说明
      - 防护代码（lines 190-207, isValidContainerPath 函数）被逐行解释
      - 至少 10 处代码引用

  Scenario: allowlist 验证
    Tool: Bash
    Steps:
      1. grep "allowlist" analysis/24-mount-security.ts 源码解读.md
      2. grep "~/.config/nanoclaw/mount-allowlist.json" analysis/24-mount-security.ts 源码解读.md
    Expected Result: allowlist 机制被详细说明
  ```

  **Commit**: NO

---

- [ ] 16. 25-whatsapp-auth.ts 源码解读.md

  **What to do**:
  - 逐模块解释 src/whatsapp-auth.ts（约 80 行）
  - 重点解释：QR code 生成、认证状态管理、会话持久化
  - 关键函数：startAuthFlow, handleConnectionUpdate
  - 包含代码片段（带行号和文件路径）
  - 说明 WhatsApp Web 连接机制

  **Must NOT do**:
  - 不深入 baileys 库的内部认证协议

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 认证流程，需要清晰的步骤解释
  - **Skills**: [`code-mentor`]
    - `code-mentor`: 深度解读源码，解释认证流程

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3-B（与 24, 26, 27）
  - **Blocks**: None
  - **Blocked By**: Wave 2

  **References**:
  - **Full Source**: `src/whatsapp-auth.ts` (完整源码)
  - **Key Sections**:
    - Lines 10-50: startAuthFlow function
    - Lines 60-80: handleConnectionUpdate function

  **Acceptance Criteria**:
  - [ ] 文档创建: analysis/25-whatsapp-auth.ts 源码解读.md
  - [ ] 包含至少 3 个关键函数的逐函数解释
  - [ ] 每个代码片段包含：文件路径、行号范围、功能说明
  - [ ] 解释 QR code 生成流程
  - [ ] 说明认证状态转换（connecting → open → close）

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: 认证函数覆盖验证
    Tool: Bash
    Preconditions: Document generated
    Steps:
      1. grep "startAuthFlow" analysis/25-whatsapp-auth.ts 源码解读.md
      2. grep "handleConnectionUpdate" analysis/25-whatsapp-auth.ts 源码解读.md
      3. grep "generateQRCode\|qrcode-terminal" analysis/25-whatsapp-auth.ts 源码解读.md
    Expected Result: 
      - 至少 3 个关键函数被解释
      - QR code 生成被说明

  Scenario: 状态转换验证
    Tool: Bash
    Steps:
      1. grep -E "(connecting|open|close|connectionUpdate)" analysis/25-whatsapp-auth.ts 源码解读.md
      2. grep "src/whatsapp-auth.ts:" analysis/25-whatsapp-auth.ts 源码解读.md
    Expected Result: 
      - 认证状态转换被说明
      - 代码引用包含行号
  ```

  **Commit**: NO

---

- [ ] 17. 26-utils.ts 与工具函数.md

  **What to do**:
  - 解释 src/utils.ts 的工具函数（约 20 行）
  - 重点解释：loadJson, saveJson
  - 说明这些函数的用途和设计简洁性
  - 包含代码片段（带行号和文件路径）
  - 说明简单工具的哲学（不过度抽象）

  **Must NOT do**:
  - 不过度解释（这些是简单工具）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 简单工具函数，不需要深入解释
  - **Skills**: 无需

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3-B（与 24, 25, 27）
  - **Blocks**: None
  - **Blocked By**: Wave 2

  **References**:
  - **Full Source**: `src/utils.ts` (完整源码)

  **Acceptance Criteria**:
  - [ ] 文档创建: analysis/26-utils.ts 与工具函数.md
  - [ ] 包含所有 2 个工具函数的说明
  - [ ] 每个代码片段包含：文件路径、行号范围、功能说明
  - [ ] 解释简洁工具的设计哲学

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: 工具函数覆盖验证
    Tool: Bash
    Preconditions: Document generated
    Steps:
      1. grep "loadJson" analysis/26-utils.ts 与工具函数.md
      2. grep "saveJson" analysis/26-utils.ts 与工具函数.md
    Expected Result: 所有工具函数被说明

  Scenario: 代码引用验证
    Tool: Bash
    Steps:
      1. grep "src/utils.ts:" analysis/26-utils.ts 与工具函数.md
    Expected Result: 代码引用包含文件路径和行号
  ```

  **Commit**: NO

---

- [ ] 18. 27-agent-runner 容器内代码.md

  **What to do**:
  - 解释 container/agent-runner/ 的容器内逻辑
  - 重点解释：agent-runner/index.ts（Claude Agent SDK 启动）、ipc-mcp.ts（容器侧 IPC）
  - 说明双层架构的协作（Host 调度 → Container 执行）
  - 解释 Claude Agent SDK 的 `query()` 迭代器模式
  - 包含关键代码片段（带行号和文件路径）

  **Must NOT do**:
  - 不深入 Claude Agent SDK 的内部实现
  - 不重复解释 Host 端的 IPC 逻辑

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 双层架构的容器端，需要解释 SDK 使用和 IPC
  - **Skills**: [`code-mentor`]
    - `code-mentor`: 深度解读源码，解释容器端逻辑

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3-B（与 24, 25, 26）
  - **Blocks**: None
  - **Blocked By**: Wave 2

  **References**:
  - **Container Code**: `container/agent-runner/src/index.ts` (Claude Agent SDK 启动)
  - **Container Code**: `container/agent-runner/src/ipc-mcp.ts` (IPC MCP server)
  - **Host Side Reference**: `src/container-runner.ts` (Host 端容器调用)

  **Acceptance Criteria**:
  - [ ] 文档创建: analysis/27-agent-runner 容器内代码.md
  - [ ] 包含 index.ts 和 ipc-mcp.ts 的关键函数解释
  - [ ] 每个代码片段包含：文件路径、行号范围、功能说明
  - [ ] 解释 Claude Agent SDK 的 `query()` 迭代器模式
  - [ ] 说明 Host 和 Container 的协作流程

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: 容器代码覆盖验证
    Tool: Bash
    Preconditions: Document generated
    Steps:
      1. grep "agent-runner" analysis/27-agent-runner 容器内代码.md
      2. grep "Claude Agent SDK" analysis/27-agent-runner 容器内代码.md
      3. grep "ipc-mcp\|MCP" analysis/27-agent-runner 容器内代码.md
    Expected Result: 
      - 容器文件被引用
      - SDK 使用被说明

  Scenario: 迭代器模式验证
    Tool: Bash
    Steps:
      1. grep "query(\|for await" analysis/27-agent-runner 容器内代码.md
      2. grep "container/agent-runner/src/" analysis/27-agent-runner 容器内代码.md
    Expected Result: 
      - query() 迭代器模式被解释
      - 代码引用包含容器路径

  Scenario: 双层架构验证
    Tool: Bash
    Steps:
      1. grep -E "(Host|Container\|双层)" analysis/27-agent-runner 容器内代码.md
    Expected Result: 双层架构协作被说明
  ```

  **Commit**: YES（Wave 3 统一提交）
  - Message: `docs: add Wave 3-B documentation - additional modules (mount-security, whatsapp-auth, utils, agent-runner)`
  - Files: `analysis/24-*.md`, `analysis/25-*.md`, `analysis/26-*.md`, `analysis/27-*.md`

---

### WAVE 4: 高级主题（6 篇 + 附录）

- [ ] 19. 30-安全设计深度解析.md

  **What to do**:
  - 综合 docs/SECURITY.md 和 src/mount-security.ts
  - 深入解释所有安全机制（隔离、allowlist、路径验证、符号链接）
  - 说明威胁模型和缓解措施
  - 提供安全最佳实践
  - 包含安全设计图（Mermaid）

  **Must NOT do**:
  - 不宣称"无漏洞"

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: 安全深度分析，需要威胁模型和缓解措施说明
  - **Skills**: [`code-mentor`]
    - `code-mentor`: 解释安全设计和威胁模型

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4-A（与 31, 32）
  - **Blocks**: None
  - **Blocked By**: Wave 2, 3

  **References**:
  - **Documentation**: `docs/SECURITY.md` (完整安全模型)
  - **Implementation**: `src/mount-security.ts` (安全实现)
  - **Documentation**: `docs/REQUIREMENTS.md` (Security Through True Isolation)

  **Acceptance Criteria**:
  - [ ] 文档创建: analysis/30-安全设计深度解析.md
  - [ ] 包含威胁模型章节
  - [ ] 包含所有安全机制的缓解措施
  - [ ] 提供安全审计 Checklist
  - [ ] 包含安全边界图（Mermaid）

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: 安全主题覆盖验证
    Tool: Bash
    Preconditions: Document generated
    Steps:
      1. grep "威胁模型\|threat model" analysis/30-安全设计深度解析.md
      2. grep "缓解措施\|mitigation" analysis/30-安全设计深度解析.md
      3. grep "allowlist\|隔离\|符号链接" analysis/30-安全设计深度解析.md
    Expected Result: 
      - 威胁模型被说明
      - 所有关键安全机制被覆盖

  Scenario: 审计清单验证
    Tool: Bash
    Steps:
      1. grep "Checklist\|检查清单" analysis/30-安全设计深度解析.md
      2. grep -E "^\- \[ \]" analysis/30-安全设计深度解析.md | wc -l
    Expected Result: 
      - 包含安全审计 Checklist
      - 至少 5 个检查项
  ```

  **Commit**: NO

---

- [ ] 20. 31-对话归档与会话压缩.md

  **What to do**:
  - 解释 PreCompact Hook 机制
  - 说明对话归档到 `conversations/` 目录
  - 解释会话压缩策略（保留关键信息，压缩中间内容）
  - 演示如何配置 PreCompact Hook
  - 说明与 Claude Agent SDK 的集成

  **Must NOT do**:
  - 不深入 Compaction 算法（SDK 职责）

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: 高级功能，需要配置演示和效果说明
  - **Skills**: [`code-mentor`]
    - `code-mentor`: 解释对话归档和会话管理

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4-A（与 30, 32）
  - **Blocks**: None
  - **Blocked By**: Wave 2, 3

  **References**:
  - **Implementation**: `container/agent-runner/src/index.ts:87-120` (createPreCompactHook 函数)
  - **Directory Structure**: `groups/*/conversations/` (归档目录)
  - **SDK Reference**: Claude Agent SDK PreCompactHookInput 接口

  **Acceptance Criteria**:
  - [ ] 文档创建: analysis/31-对话归档与会话压缩.md
  - [ ] 包含 PreCompact Hook 的配置示例
  - [ ] 说明对话归档目录结构
  - [ ] 解释会话压缩策略
  - [ ] 包含归档效果对比（压缩前后）

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: 归档机制验证
    Tool: Bash
    Preconditions: Document generated
    Steps:
      1. grep "PreCompact Hook" analysis/31-对话归档与会话压缩.md
      2. grep "conversations/" analysis/31-对话归档与会话压缩.md
      3. grep "归档\|compress" analysis/31-对话归档与会话压缩.md
    Expected Result: 
      - PreCompact Hook 被详细说明
      - 归档目录被引用

  Scenario: 配置示例验证
    Tool: Bash
    Steps:
      1. grep "```json" analysis/31-对话归档与会话压缩.md
      2. grep "preCompact" analysis/31-对话归档与会话压缩.md
    Expected Result: 
      - 包含配置示例
      - Hook 配置被说明
  ```

  **Commit**: NO

---

- [ ] 21. 32-性能优化与最佳实践.md

  **What to do**:
  - 分析项目性能特征（轮询间隔、容器启动、消息处理）
  - 提供优化建议
  - 说明最佳实践（错误处理、日志级别、监控）
  - 包含性能测试命令示例

  **Must NOT do**:
  - 不提供未测试的优化建议

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: 性能分析，需要基准测试和优化建议
  - **Skills**: [`code-mentor`]
    - `code-mentor`: 解释性能特征和最佳实践

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4-A（与 30, 31）
  - **Blocks**: None
  - **Blocked By**: Wave 2, 3

  **References**:
  - **Configuration**: `src/config.ts` (POLL_INTERVAL, SCHEDULER_POLL_INTERVAL, CONTAINER_TIMEOUT)
  - **Logging**: `src/index.ts` (pino logger usage)

  **Acceptance Criteria**:
  - [ ] 文档创建: analysis/32-性能优化与最佳实践.md
  - [ ] 包含性能基准数据（轮询频率、容器启动时间）
  - [ ] 提供优化建议
  - [ ] 包含最佳实践 Checklist
  - [ ] 包含调试命令示例

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: 性能主题验证
    Tool: Bash
    Preconditions: Document generated
    Steps:
      1. grep "POLL_INTERVAL\|SCHEDULER_POLL_INTERVAL" analysis/32-性能优化与最佳实践.md
      2. grep "优化\|optimization" analysis/32-性能优化与最佳实践.md
      3. grep "CONTAINER_TIMEOUT" analysis/32-性能优化与最佳实践.md
    Expected Result: 
      - 性能参数被说明
      - 优化建议被提供

  Scenario: 最佳实践验证
    Tool: Bash
    Steps:
      1. grep "最佳实践\|best practice" analysis/32-性能优化与最佳实践.md
      2. grep -E "^\- \[ \]" analysis/32-性能优化与最佳实践.md | wc -l
    Expected Result: 
      - 包含最佳实践
      - 至少 5 个实践项
  ```

  **Commit**: YES（Wave 4-A 统一提交）
  - Message: `docs: add Wave 4-A documentation - advanced topics (security, conversation archive, performance)`
  - Files: `analysis/30-*.md`, `analysis/31-*.md`, `analysis/32-*.md`

---

- [ ] 22. 33-故障排查与调试.md

  **What to do**:
  - 列出常见错误和排查步骤
  - 说明日志位置和格式
  - 提供调试命令（查看 log、检查数据库、验证容器）
  - 解释 AI-Native 调试方式（"Describe the problem, Claude fixes it"）

  **Must NOT do**:
  - 不提供通用的"重启试试"建议

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: 故障排查，需要具体错误和解决方案
  - **Skills**: [`code-mentor`]
    - `code-mentor`: 解释故障排查流程

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4-B（与 34, 35）
  - **Blocks**: None
  - **Blocked By**: Wave 2, 3

  **References**:
  - **FAQ Reference**: `README.md` (FAQ section)
  - **Logging**: `groups/*/logs/` 目录
  - **Debug Skill**: `.claude/skills/debug/SKILL.md`

  **Acceptance Criteria**:
  - [ ] 文档创建: analysis/33-故障排查与调试.md
  - [ ] 包含至少 5 个常见错误的排查步骤
  - [ ] 说明日志位置和格式
  - [ ] 包含调试命令示例
  - [ ] 解释 AI-Native 调试哲学

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: 故障排查验证
    Tool: Bash
    Preconditions: Document generated
    Steps:
      1. grep -E "错误|Error|常见问题" analysis/33-故障排查与调试.md | wc -l
      2. grep "logs/\|日志" analysis/33-故障排查与调试.md
      3. grep "AI-Native" analysis/33-故障排查与调试.md
    Expected Result: 
      - 至少 5 个错误场景被说明
      - 日志位置被引用
      - AI-Native 调试被解释
  ```

  **Commit**: NO

---

- [ ] 23. 34-扩展与集成指南.md

  **What to do**:
  - 解释如何添加新通道（Telegram, Slack）
  - 解释如何添加 MCP 服务器
  - 说明 Skills 系统（贡献方式）
  - 提供自定义扩展的代码模板

  **Must NOT do**:
  - 不建议修改核心项目（通过 Fork + Skills）

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: 扩展指南，需要示例和最佳实践
  - **Skills**: [`code-mentor`]
    - `code-mentor`: 解释扩展方式和 Skills 系统

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4-B（与 33, 35）
  - **Blocks**: None
  - **Blocked By**: Wave 2, 3

  **References**:
  - **Skills System**: `README.md` (Contributing section, Don't add features. Add skills.)
  - **Skills Reference**: `.claude/skills/` 目录（现有 Skills 示例）
  - **RFS**: `docs/REQUIREMENTS.md` (Request for Skills)

  **Acceptance Criteria**:
  - [ ] 文档创建: analysis/34-扩展与集成指南.md
  - [ ] 包含添加新通道的步骤 outline
  - [ ] 解释 Skills 系统工作原理
  - [ ] 包含扩展代码模板
  - [ ] 强调"Fork don't PR 特性"的哲学

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: 扩展指南验证
    Tool: Bash
    Preconditions: Document generated
    Steps:
      1. grep "Skills\|skills" analysis/34-扩展与集成指南.md
      2. grep "Fork\|fork" analysis/34-扩展与集成指南.md
      3. grep "MCP" analysis/34-扩展与集成指南.md
      4. grep "Telegram\|Slack" analysis/34-扩展与集成指南.md
    Expected Result: 
      - Skills 系统被解释
      - 新通道示例被说明
      - MCP 被提及
  ```

  **Commit**: NO

---

- [ ] 24. 35-生产部署 checklist.md

  **What to do**:
  - 提供生产部署的完整 checklist
  - 包含安全检查、性能优化、监控设置
  - 说明备份策略（数据库、会话、配置）
  - 包含运维命令（停止、重启、日志查看）

  **Must NOT do**:
  - 不承诺 SLA 或可用性保证

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: 运维指南，需要 Checklist 和命令
  - **Skills**: [`code-mentor`]
    - `code-mentor`: 解释部署和运维流程

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4-B（与 33, 34）
  - **Blocks**: None
  - **Blocked By**: Wave 2, 3

  **References**:
  - **Service Management**: `package.json` (start script), README.md (Deployment via launchd)
  - **Backup**: `store/`, `groups/`, `data/` 目录

  **Acceptance Criteria**:
  - [ ] 文档创建: analysis/35-生产部署 checklist.md
  - [ ] 包含至少 20 条部署 Checklist 项
  - [ ] 包含备份策略
  - [ ] 包含运维命令示例
  - [ ] 说明监控和告警建议

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: 部署 checklist 验证
    Tool: Bash
    Preconditions: Document generated
    Steps:
      1. grep -E "^\- \[ \]" analysis/35-生产部署 checklist.md | wc -l
      2. grep "备份\|backup" analysis/35-生产部署 checklist.md
      3. grep "launchctl\|service" analysis/35-生产部署 checklist.md
    Expected Result: 
      - 至少 20 条 Checklist
      - 备份策略被说明
      - 运维命令被提供
  ```

  **Commit**: YES（Wave 4-B 统一提交）
  - Message: `docs: add Wave 4-B documentation - troubleshooting, extension, deployment`
  - Files: `analysis/33-*.md`, `analysis/34-*.md`, `analysis/35-*.md`

---

### 附录

- [ ] 25. 附录-术语对照表.md

  **What to do**:
  - 创建完整的双语术语对照表（英文 + 中文解释）
  - 按类别组织：技术术语、架构概念、开发工具
  - 覆盖所有文档中使用的术语

  **Must NOT do**:
  - 不定义未在项目中使用的术语

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 术语表，简单整理
  - **Skills**: 无需

  **Parallelization**:
  - **Can Run In Parallel**: YES（可在任何波次执行）
  - **Parallel Group**: Wave 4-C（独立）
  - **Blocks**: None
  - **Blocked By**: Wave 2, 3（需要参考所有文档）

  **Acceptance Criteria**:
  - [ ] 文档创建: analysis/附录-术语对照表.md
  - [ ] 包含至少 50 个术语
  - [ ] 按类别组织
  - [ ] 双语对照（英文 + 中文）

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: 术语覆盖验证
    Tool: Bash
    Preconditions: Document generated
    Steps:
      1. grep -c "\|.*\|.*\|" analysis/附录-术语对照表.md
      2. grep -E "(IPC|MCP|Container|WhatsApp)" analysis/附录-术语对照表.md
    Expected Result: 
      - 至少 50 个术语
      - 关键术语被覆盖
  ```

  **Commit**: NO

---

- [ ] 26. 附录-架构图集.md

  **What to do**:
  - 收集所有文档中的 Mermaid 图表
  - 统一格式和风格
  - 提供图例说明

  **Must NOT do**:
  - 不创建新图表（仅收集）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 图表收集，简单整理
  - **Skills**: 无需

  **Parallelization**:
  - **Can Run In Parallel**: YES（可在任何波次执行）
  - **Parallel Group**: Wave 4-C（独立）
  - **Blocks**: None
  - **Blocked By**: Waves 1-4（所有文档完成）

  **Acceptance Criteria**:
  - [ ] 文档创建: analysis/附录-架构图集.md
  - [ ] 包含至少 10 个 Mermaid 图表
  - [ ] 提供图例说明

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: 图表收集验证
    Tool: Bash
    Preconditions: Document generated
    Steps:
      1. grep -c "```mermaid" analysis/附录-架构图集.md
      2. grep "图例\|legend" analysis/附录-架构图集.md
    Expected Result: 
      - 至少 10 个 Mermaid 图
      - 图例被提供
  ```

  **Commit**: NO

---

- [ ] 27. 附录-命令速查.md

  **What to do**:
  - 收集所有文档中的验证命令
  - 按功能组织（开发、调试、运维）
  - 提供命令说明和预期输出

  **Must NOT do**:
  - 不定义新命令

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 命令收集，简单整理
  - **Skills**: 无需

  **Parallelization**:
  - **Can Run In Parallel**: YES（可在任何波次执行）
  - **Parallel Group**: Wave 4-C（独立）
  - **Blocks**: None
  - **Blocked By**: Waves 1-4（所有文档完成）

  **Acceptance Criteria**:
  - [ ] 文档创建: analysis/附录-命令速查.md
  - [ ] 包含至少 20 个命令
  - [ ] 按功能组织
  - [ ] 提供命令说明

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: 命令收集验证
    Tool: Bash
    Preconditions: Document generated
    Steps:
      1. grep -c "^\`\`\`bash" analysis/附录-命令速查.md
      2. grep -E "(开发|调试|运维)" analysis/附录-命令速查.md
    Expected Result: 
      - 至少 20 个命令
      - 按功能组织
  ```

  **Commit**: YES（附录统一提交）
  - Message: `docs: add appendices - glossary, diagrams, command reference`
  - Files: `analysis/附录-*.md`

---

## Commit Strategy

| Wave | Message | Files |
|------|---------|-------|
| 0 | `docs: create analysis directory` | `analysis/.gitkeep` |
| 1 | `docs: add Wave 1 documentation - project overview, setup, quickstart, concepts` | `analysis/00-*.md`, `analysis/01-*.md`, `analysis/02-*.md`, `analysis/03-*.md` |
| 2 | `docs: add Wave 2 documentation - architecture deep dive (6 docs)` | `analysis/10-*.md`, `analysis/11-*.md`, `analysis/12-*.md`, `analysis/13-*.md`, `analysis/14-*.md`, `analysis/15-*.md` |
| 3-A | `docs: add Wave 3-A documentation - core modules (index, container-runner, scheduler, db)` | `analysis/20-*.md`, `analysis/21-*.md`, `analysis/22-*.md`, `analysis/23-*.md` |
| 3-B | `docs: add Wave 3-B documentation - additional modules (mount-security, whatsapp-auth, utils, agent-runner)` | `analysis/24-*.md`, `analysis/25-*.md`, `analysis/26-*.md`, `analysis/27-*.md` |
| 4-A | `docs: add Wave 4-A documentation - advanced topics (security, conversation archive, performance)` | `analysis/30-*.md`, `analysis/31-*.md`, `analysis/32-*.md` |
| 4-B | `docs: add Wave 4-B documentation - troubleshooting, extension, deployment` | `analysis/33-*.md`, `analysis/34-*.md`, `analysis/35-*.md` |
| 附录 | `docs: add appendices - glossary, diagrams, command reference` | `analysis/附录-*.md` |

---

## Success Criteria

### Verification Commands

```bash
# 验证文档数量
ls -1 analysis/*.md | wc -l
# 预期输出: 28

# 验证Wave 1 文档
ls -1 analysis/00-*.md analysis/01-*.md analysis/02-*.md analysis/03-*.md | wc -l
# 预期输出: 4

# 验证Wave 2 文档
ls -1 analysis/10-*.md analysis/11-*.md analysis/12-*.md analysis/13-*.md analysis/14-*.md analysis/15-*.md | wc -l
# 预期输出: 6

# 验证Wave 3 文档
ls -1 analysis/2*.md | wc -l
# 预期输出: 8

# 验证Wave 4 文档
ls -1 analysis/3*.md analysis/35-*.md | wc -l
# 预期输出: 6

# 验证附录
ls -1 analysis/附录-*.md | wc -l
# 预期输出: 3

# 验证学习目标存在
grep -l "## 读者将能够" analysis/*.md | wc -l
# 预期输出: 28

# 验证 Mermaid 图存在
grep -c "```mermaid" analysis/*.md
# 预期输出: 多行（至少 20 个图）

# 验证代码引用存在
grep -c "src/.*\.ts:" analysis/*.md
# 预期输出: 多行（至少 100 处引用）

# 验证验证步骤存在
grep -c "验证步骤\|checklist" analysis/*.md
# 预期输出: 多行（至少 28 处）
```

### Final Checklist

- [ ] 所有 28 篇文档创建完成
- [ ] 每篇文档包含"学习目标"章节
- [ ] 每篇文档包含至少 1 个 Mermaid 图表
- [ ] 每篇文档包含代码片段（带文件路径和行号）
- [ ] 每篇文档包含验证步骤
- [ ] 所有 Markdown 语法正确（通过 markdownlint 验证，如有）
- [ ] 所有代码引用路径和行号与当前代码库匹配
- [] 安全模块（mount-security.ts）的路径遍历防护被逐行详细解释
- [ ] 术语首次出现时附有中文解释
- [ ] 附录包含术语对照表（≥50 个术语）
- [ ] 附录包含架构图集（≥10 个图）
- [ ] 附录包含命令速查（≥20 个命令）
