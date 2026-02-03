# NanoClaw 源码学习笔记

## 性能优化与最佳实践学习要点

### 性能基准数据
- POLL_INTERVAL: 2000ms（WhatsApp消息轮询）
- SCHEDULER_POLL_INTERVAL: 60000ms（任务调度器）
- IPC_POLL_INTERVAL: 1000ms（IPC轮询）
- CONTAINER_TIMEOUT: 300000ms（容器超时）
- CONTAINER_MAX_OUTPUT_SIZE: 10MB

### 性能特征
1. **三层轮询机制**: WhatsApp消息（2秒）、任务调度（60秒）、IPC（1秒）
2. **语义保证**: 至少一次（at-least-once）投递，失败消息重试
3. **容器启动开销**: ~3-7秒（创建+挂载+启动）
4. **资源使用**: 主进程~100MB，每容器~300MB

### 优化方向
1. 轮询间隔调整（根据场景权衡响应性和资源使用）
2. 容器超时配置（针对不同任务类型）
3. 日志级别管理（开发debug，生产warn/error）
4. 数据库优化（WAL模式、定期清理）
5. 磁盘管理（日志轮转、定期清理）

---

## 扩展与集成学习要点

### Fork 哲学核心
1. **不要提交功能 PR** - 用户应该 Fork 仓库并自定义
2. **代码 > 配置** - 直接修改代码，而不是添加配置开关
3. **技能 > 功能** - 通过 Skills 系统分享扩展逻辑
4. **保持简洁** - 每个用户只保留自己需要的代码

### Skills 系统机制
1. **Skill 结构**: `.claude/skills/skill-name/SKILL.md`
2. **工作流程**: 触发 → 加载 → 执行 → 完成
3. **命名规范**: kebab-case, 以动词开头 (add, setup, convert)
4. **最佳实践**: 完整命令路径、错误检查、回滚选项

### 通道扩展模式
1. **主通道**: 管理员控制 (WhatsApp self-chat, Telegram DM)
2. **输入通道**: 对话输入 (WhatsApp groups, Slack channels)
3. **输出通道**: 接收通知 (Email, SMS)
4. **并行模式**: 多通道同时运行，共享 session 存储

### MCP 集成要点
1. **配置位置**: `container/agent-runner/src/index.ts` (mcpServers, allowedTools)
2. **挂载必要文件**: MCP 可能需要访问配置目录
3. **更新内存文档**: 在 `groups/CLAUDE.md` 中说明可用工具
4. **重建容器**: 修改 agent-runner 后必须重建容器镜像

### 扩展代码模板
1. **命令处理器**: 在 `processMessage` 前添加命令检查
2. **数据库表**: 在 `initDatabase` 中初始化新表
3. **调度任务**: 扩展 TaskConfig 接口并添加处理函数
4. **IPC 工具**: 容器内定义工具，主机端处理逻辑
5. **挂载点**: 在 `buildVolumeMounts` 中添加新目录

### Discord 添加示例（完整流程）
1. 创建 Discord 应用和 Bot
2. 安装依赖 (`discord.js`)
3. 配置 Bot Token 到 `.env`
4. 修改 `src/index.ts` 添加 Discord 连接
5. 更新数据库以支持 Discord 消息
6. 重建和测试

### 常用 MCP 服务器
- Gmail: `@gongrzhe/server-gmail-autoauth-mcp`
- GitHub: `mcp-server-github`
- Notion: `notion-mcp-server`
- Brave Search: `@modelcontextprotocol/server-brave-search`
- Puppeteer: `@modelcontextprotocol/server-puppeteer`
