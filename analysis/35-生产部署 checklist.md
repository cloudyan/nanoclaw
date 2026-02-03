# NanoClaw 生产部署 Checklist

本文档提供了 NanoClaw 部署到生产环境的完整检查清单，确保系统安全、可靠、可维护。

---

## 部署前准备 Checklist

- [ ] **确认 Node.js 版本**
  - 生产环境 Node.js 版本 >= 20.0.0
  - 验证命令：`node --version`

- [ ] **安装系统依赖**
  - macOS：已安装 [Apple Container](https://github.com/apple/container)
  - Linux/macOS：已安装 [Docker](https://docker.com/products/docker-desktop)
  - 验证命令：`container list` 或 `docker ps`

- [ ] **准备环境变量**
  - 设置 CLAUDE_API_KEY（用于 Claude Agent SDK）
  - 可选：设置代理环境变量（HTTPS_PROXY）

- [ ] **代码编译**
  - 运行 `npm run build` 编译 TypeScript
  - 确保 `dist/` 目录已生成
  - 验证：`ls -la dist/`

- [ ] **依赖安装**
  - 运行 `npm install --production` 安装生产依赖
  - 验证：`node -e "require('better-sqlite3')"`

---

## 安全检查 Checklist

- [ ] **文件权限检查**
  - 项目目录权限限制为用户读写（700 或 600）
  - `store/` 目录权限设置为 700
  - `groups/` 目录权限设置为 700
  - 验证命令：`ls -la` 检查权限

- [ ] **密钥安全**
  - CLAUDE_API_KEY 存储在环境变量中，不在代码中硬编码
  - `.env` 文件不在版本控制中（已在 .gitignore）
  - WhatsApp 认证文件（`store/auth/`）权限受限

- [ ] **容器隔离验证**
  - 容器运行时仅挂载必要目录
  - 容器无特权模式运行
  - 容器网络隔离（无宿主机网络访问，除非显式配置）

- [ ] **数据库安全**
  - `store/messages.db` 文件权限设置为 600
  - 数据库 WAL 文件权限设置为 600
  - 定期清理未使用的临时文件

- [ ] **日志安全**
  - 敏感信息不写入日志（API Key、私人聊天内容）
  - 日志轮转已配置（避免磁盘空间耗尽）
  - 日志文件权限设置为 600

---

## 配置 Checklist

- [ ] **服务管理配置**
  - macOS：创建 `~/Library/LaunchAgents/com.nanoclaw.plist`
  - Linux：创建 `/etc/systemd/system/nanoclaw.service`
  - 配置自动重启策略（KeepAlive=TRUE 或 Restart=on-failure）

- [ ] **工作目录配置**
  - 确保所有路径使用绝对路径
  - `store/`、`data/`、`groups/` 目录存在且可访问
  - IPC 目录 `data/ipc/` 可写

- [ ] **WhatsApp 认证**
  - 已完成 WhatsApp 二维码认证
  - `store/auth/` 目录包含完整的会话文件
  - 认证文件完整性验证

- [ ] **触发词配置**
  - 检查 `src/config.ts` 中的 TRIGGER_PATTERN 设置
  - 确保触发词不会与常用冲突
  - 测试触发词响应

- [ ] **计划任务配置**
  - 审查 `store/tasks.db` 中的任务列表
  - 确认 cron 表达式正确
  - 验证任务挂载路径存在

---

## 容器运行时 Checklist

- [ ] **容器镜像准备**
  - Apple Container：确保基础镜像已拉取
  - Docker：构建或拉取 agent 容器镜像
  - 验证命令：`container images` 或 `docker images`

- [ ] **容器资源限制**
  - 设置 CPU 和内存限制（如适用）
  - 配置容器重启策略
  - 避免容器逃逸风险

- [ ] **挂载点验证**
  - 每个组的 `groups/{name}/` 目录正确挂载到容器
  - 容器内挂载路径正确（如 `/workspace`）
  - 只读挂载不必要文件

- [ ] **IPC 目录准备**
  - `data/ipc/` 目录存在且可写
  - 主进程和容器进程可共享 IPC 目录
  - IPC 文件定期清理机制

---

## 服务启动 Checklist

- [ ] **启动前检查**
  - 端口未被占用（如使用特定端口）
  - 数据库文件未被其他进程锁定
  - 磁盘空间充足（至少 1GB 可用）

- [ ] **服务启动**
  - macOS：`launchctl load ~/Library/LaunchAgents/com.nanoclaw.plist`
  - Linux：`systemctl enable --now nanoclaw`
  - 手动启动（调试）：`npm run start`

- [ ] **启动验证**
  - 检查进程是否运行：`ps aux | grep node`
  - 检查日志输出：`tail -f logs/nanoclaw.log`
  - 验证 WhatsApp 连接状态

- [ ] **容器启动验证**
  - 检查容器是否成功启动：`container list` 或 `docker ps`
  - 验证容器日志无错误
  - 确认容器内 Claude Agent SDK 可用

---

## 验证 Checklist

- [ ] **WhatsApp 消息测试**
  - 从手机发送测试消息
  - 验证触发词响应
  - 检查消息路由是否正确

- [ ] **分组隔离测试**
  - 在不同组发送消息
  - 验证内存隔离（`CLAUDE.md` 独立）
  - 验证文件系统隔离

- [ ] **计划任务测试**
  - 手动触发计划任务
  - 验证任务输出
  - 检查任务日志

- [ ] **容器隔离测试**
  - 在容器内执行 `ls -la` 验证挂载限制
  - 尝试访问非挂载目录（应失败）
  - 验证容器内网络访问限制

- [ ] **数据库完整性**
  - 运行 `npm run typecheck` 验证类型
  - 检查 SQLite 数据库文件完整性：`sqlite3 store/messages.db "PRAGMA integrity_check;"`
  - 验证 WAL 文件一致性

---

## 备份策略

### 数据库备份

**备份内容：**
- `store/messages.db` - 主消息数据库
- `store/messages.db-wal` - WAL 日志文件
- `store/messages.db-shm` - 共享内存文件

**备份频率：**
- **增量备份**：每小时（备份 WAL 文件）
- **完整备份**：每天（备份完整数据库）
- **归档备份**：每周（保留 7 天）

**备份命令：**
```bash
# 创建完整备份
mkdir -p backups/db/$(date +%Y%m%d)
cp store/messages.db* backups/db/$(date +%Y%m%d)/

# 使用 SQLite 在线备份
sqlite3 store/messages.db ".backup backups/db/$(date +%Y%m%d)/messages.db"
```

**恢复命令：**
```bash
# 停止服务
launchctl unload ~/Library/LaunchAgents/com.nanoclaw.plist

# 恢复数据库
cp backups/db/20250203/messages.db* store/

# 启动服务
launchctl load ~/Library/LaunchAgents/com.nanoclaw.plist
```

### WhatsApp 认证备份

**备份内容：**
- `store/auth/` 目录（WhatsApp 会话文件）

**备份频率：**
- **实时备份**：认证完成后立即备份
- **定期备份**：每次配置变更后

**备份命令：**
```bash
cp -r store/auth backups/auth/$(date +%Y%m%d)/
```

**注意：**
- WhatsApp 认证文件有有效期（约 30 天）
- 过期后需重新认证
- 备份仅在认证有效期内有用

### 分组数据备份

**备份内容：**
- `groups/*/CLAUDE.md` - 每组的记忆文件
- `groups/*/` 目录下的所有文件

**备份频率：**
- **增量备份**：每小时
- **完整备份**：每天

**备份命令：**
```bash
# 创建完整备份
mkdir -p backups/groups/$(date +%Y%m%d)
cp -r groups/* backups/groups/$(date +%Y%m%d)/
```

### 配置文件备份

**备份内容：**
- `src/config.ts` - 配置文件
- `package.json` - 依赖配置
- `.env` - 环境变量（如使用）

**备份频率：**
- 每次配置变更后

**备份命令：**
```bash
cp src/config.ts backups/config/$(date +%Y%m%d)/
cp package.json backups/config/$(date +%Y%m%d)/
```

### 自动化备份脚本

```bash
#!/bin/bash
# backups/backup.sh

BACKUP_DIR=backups/$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# 备份数据库
mkdir -p $BACKUP_DIR/db
sqlite3 store/messages.db ".backup $BACKUP_DIR/db/messages.db"
cp store/auth $BACKUP_DIR/

# 备份分组数据
mkdir -p $BACKUP_DIR/groups
cp -r groups/* $BACKUP_DIR/groups/

# 备份配置
mkdir -p $BACKUP_DIR/config
cp src/config.ts $BACKUP_DIR/config/
cp package.json $BACKUP_DIR/config/

# 清理旧备份（保留 7 天）
find backups/ -type d -mtime +7 -exec rm -rf {} +
```

**配置定时任务（cron）：**
```bash
# 每天凌晨 2 点执行备份
0 2 * * * /path/to/nanoclaw/backups/backup.sh >> backups/backup.log 2>&1
```

---

## 运维命令

### 服务管理

**macOS (launchd)：**
```bash
# 启动服务
launchctl load ~/Library/LaunchAgents/com.nanoclaw.plist

# 停止服务
launchctl unload ~/Library/LaunchAgents/com.nanoclaw.plist

# 重启服务
launchctl unload ~/Library/LaunchAgents/com.nanoclaw.plist && \
launchctl load ~/Library/LaunchAgents/com.nanoclaw.plist

# 查看服务状态
launchctl list | grep nanoclaw

# 查看服务日志
log show --predicate 'process == "nanoclaw"' --last 1h
```

**Linux (systemd)：**
```bash
# 启动服务
systemctl start nanoclaw

# 停止服务
systemctl stop nanoclaw

# 重启服务
systemctl restart nanoclaw

# 查看服务状态
systemctl status nanoclaw

# 启用开机自启
systemctl enable nanoclaw

# 禁用开机自启
systemctl disable nanoclaw

# 查看服务日志
journalctl -u nanoclaw -f
```

### 容器管理

**Apple Container：**
```bash
# 列出所有容器
container list

# 查看容器日志
container logs <container-id>

# 停止容器
container stop <container-id>

# 删除容器
container rm <container-id>

# 进入容器（调试）
container exec -it <container-id> /bin/bash
```

**Docker：**
```bash
# 列出所有容器
docker ps -a

# 查看容器日志
docker logs <container-id>

# 实时查看日志
docker logs -f <container-id>

# 停止容器
docker stop <container-id>

# 删除容器
docker rm <container-id>

# 进入容器（调试）
docker exec -it <container-id> /bin/bash

# 清理未使用的容器
docker container prune
```

### 数据库操作

```bash
# 进入 SQLite 命令行
sqlite3 store/messages.db

# 查看所有表
.tables

# 查看表结构
.schema

# 查询消息记录
SELECT * FROM messages ORDER BY timestamp DESC LIMIT 10;

# 统计消息数量
SELECT COUNT(*) FROM messages;

# 数据库完整性检查
PRAGMA integrity_check;

# 数据库优化
VACUUM;
PRAGMA optimize;

# 导出数据库
sqlite3 store/messages.db .dump > backup.sql

# 导入数据库
sqlite3 store/messages.db < backup.sql
```

### 日志查看

```bash
# 查看完整日志
tail -f logs/nanoclaw.log

# 查看最近 100 行
tail -n 100 logs/nanoclaw.log

# 搜索错误日志
grep -i error logs/nanoclaw.log

# 搜索特定组的日志
grep "group-name" logs/nanoclaw.log

# 按时间过滤日志
grep "2025-02-03 14:" logs/nanoclaw.log

# 统计错误数量
grep -c "ERROR" logs/nanoclaw.log

# 查看容器日志
container logs <container-id> | tail -f
```

### 清理与维护

```bash
# 清理 IPC 临时文件
rm -rf data/ipc/*

# 清理旧日志（保留 7 天）
find logs/ -name "*.log" -mtime +7 -delete

# 清理数据库 WAL 文件（需要先关闭数据库）
sqlite3 store/messages.db "PRAGMA wal_checkpoint(TRUNCATE);"

# 清理未使用的容器镜像
docker image prune -a

# 检查磁盘使用
df -h
du -sh store/ groups/ data/

# 清理系统缓存（谨慎使用）
npm cache clean --force
```

---

## 监控与告警建议

### 监控指标

**应用级别监控：**
- 进程运行状态（是否存活）
- 内存使用量（RSS、Heap）
- CPU 使用率
- 消息处理延迟

**数据库级别监控：**
- SQLite 文件大小
- 数据库锁等待时间
- 查询响应时间
- WAL 文件大小

**容器级别监控：**
- 容器运行数量
- 容器启动/失败次数
- 容器资源使用（CPU、内存）

**WhatsApp 连接监控：**
- 连接状态（在线/离线）
- 消息发送失败率
- 认证有效期剩余天数

### 监控工具

**系统监控（macOS/Linux）：**
```bash
# 进程监控
top -pid $(pgrep -f "node dist/index.js")

# 内存监控
vm_stat  # macOS
free -h  # Linux

# 磁盘监控
df -h
du -sh store/ groups/ data/

# 网络监控（如使用网络）
netstat -an | grep LISTEN
```

**日志监控：**
```bash
# 实时监控错误
tail -f logs/nanoclaw.log | grep -i error

# 统计错误频率
watch -n 60 "grep -c 'ERROR' logs/nanoclaw.log"

# 监控特定组的消息
tail -f logs/nanoclaw.log | grep "group-name"
```

**自定义监控脚本：**
```bash
#!/bin/bash
# 监控脚本：monitor.sh

while true; do
    # 检查进程是否运行
    if ! pgrep -f "node dist/index.js" > /dev/null; then
        echo "WARNING: NanoClaw 进程未运行" | \
            mail -s "NanoClaw Alert" your@email.com
    fi

    # 检查数据库文件
    if [ ! -f "store/messages.db" ]; then
        echo "CRITICAL: 数据库文件不存在" | \
            mail -s "NanoClaw Alert" your@email.com
    fi

    # 检查磁盘空间（低于 10% 报警）
    DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
    if [ $DISK_USAGE -gt 90 ]; then
        echo "WARNING: 磁盘空间不足 (${DISK_USAGE}%)" | \
            mail -s "NanoClaw Alert" your@email.com
    fi

    sleep 300  # 每 5 分钟检查一次
done
```

### 告警建议

**告警级别定义：**
- **INFO**：正常操作通知（如计划任务完成）
- **WARNING**：潜在问题（如磁盘空间不足、容器频繁重启）
- **ERROR**：错误发生（如消息发送失败、数据库锁定）
- **CRITICAL**：严重故障（如进程崩溃、数据库损坏）

**告警方式：**
- 邮件通知（配置 mail 命令或 SMTP）
- 短信通知（通过网关）
- WhatsApp 消息（自我通知）
- 日志文件记录

**告警触发条件示例：**
```bash
# 进程崩溃告警
if ! pgrep -f "node dist/index.js" > /dev/null; then
    send_alert "CRITICAL: NanoClaw 进程已停止"
fi

# 磁盘空间不足告警
if [ $(df / | awk 'NR==2 {print $5}' | tr -d '%') -gt 90 ]; then
    send_alert "WARNING: 磁盘空间不足 10%"
fi

# 容器失败告警
FAILED_CONTAINERS=$(docker ps -a -f status=exited | wc -l)
if [ $FAILED_CONTAINERS -gt 5 ]; then
    send_alert "WARNING: ${FAILED_CONTAINERS} 个容器已停止"
fi

# 数据库错误告警
if grep -i "database.*locked\|database.*error" logs/nanoclaw.log; then
    send_alert "ERROR: 数据库错误"
fi
```

### 日志聚合与分析

**使用 journalctl（Linux）：**
```bash
# 查看最近的日志
journalctl -u nanoclaw --since "1 hour ago"

# 导出日志
journalctl -u nanoclaw > nanoclaw.log

# 按优先级过滤
journalctl -u nanoclaw -p err
```

**使用 pino-pretty（格式化日志）：**
```bash
# 实时查看格式化日志
cat logs/nanoclaw.log | pino-pretty | tail -f

# 搜索并格式化
grep "ERROR" logs/nanoclaw.log | pino-pretty
```

### 性能分析

**使用 Node.js 性能分析：**
```bash
# 生成 CPU profile
kill -USR2 $(pgrep -f "node dist/index.js")

# 分析 profile
node --prof-process isolate-*.log > profile.txt
```

**使用内存分析：**
```bash
# 生成 heap snapshot
kill -USR1 $(pgrep -f "node dist/index.js")

# 分析内存泄漏
node --inspect dist/index.js
# 然后在 Chrome DevTools 中连接分析
```

---

## 附录：服务配置示例

### macOS LaunchAgent 配置示例

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.nanoclaw</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/path/to/nanoclaw/dist/index.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/path/to/nanoclaw</string>
    <key>StandardOutPath</key>
    <string>/path/to/nanoclaw/logs/nanoclaw.log</string>
    <key>StandardErrorPath</key>
    <string>/path/to/nanoclaw/logs/nanoclaw-error.log</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>EnvironmentVariables</key>
    <dict>
        <key>CLAUDE_API_KEY</key>
        <string>your-api-key-here</string>
        <key>NODE_ENV</key>
        <string>production</string>
    </dict>
</dict>
</plist>
```

### Linux systemd 配置示例

```ini
[Unit]
Description=NanoClaw Personal Assistant
After=network.target docker.service

[Service]
Type=simple
User=nanoclaw
WorkingDirectory=/opt/nanoclaw
ExecStart=/usr/bin/node /opt/nanoclaw/dist/index.js
Restart=on-failure
RestartSec=10

Environment="CLAUDE_API_KEY=your-api-key-here"
Environment="NODE_ENV=production"

StandardOutput=append:/var/log/nanoclaw/nanoclaw.log
StandardError=append:/var/log/nanoclaw/nanoclaw-error.log

[Install]
WantedBy=multi-user.target
```

---

## 总结

本 checklist 提供了 NanoClaw 生产部署的完整指南，涵盖：

- ✅ 部署前准备（环境、依赖、编译）
- ✅ 安全检查（权限、密钥、隔离）
- ✅ 配置验证（服务、触发词、任务）
- ✅ 容器运行时（镜像、挂载、隔离）
- ✅ 服务启动（验证、日志、状态）
- ✅ 功能验证（消息、分组、任务）
- ✅ 备份策略（数据库、认证、分组、配置）
- ✅ 运维命令（服务、容器、数据库、日志）
- ✅ 监控告警（指标、工具、通知）

**重要提醒：**
- 不承诺任何 SLA 或可用性保证
- 定期备份和监控是责任自负
- 遇到问题时使用 `/debug` 技能排查
- 保持代码更新和安全最佳实践
