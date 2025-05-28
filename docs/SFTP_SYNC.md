# SFTP 文件同步指南

SFTP (SSH File Transfer Protocol) 是一种安全的文件传输协议，可用于在本地和远程服务器之间同步文件。本指南将介绍如何使用 SFTP 进行文件同步，包括删除操作的同步。

## 基本连接

```bash
sftp username@remote_host
# 例如: sftp user@192.168.1.100
```

## 手动同步命令

### 上传文件和目录
```bash
put localfile                         # 上传单个文件
put -r localdirectory                # 递归上传整个目录
```

### 下载文件和目录
```bash
get remotefile                        # 下载单个文件
get -r remotedirectory               # 递归下载整个目录
```

## 使用 lftp 实现自动同步

lftp 是一个更强大的工具，支持镜像同步功能：

1. 安装 lftp:
```bash
# MacOS
brew install lftp

# Ubuntu/Debian
sudo apt-get install lftp
```

2. 创建同步脚本 sync.sh:
```bash
#!/bin/bash
lftp -u username,password sftp://remote_host << EOF
# 设置同步模式
set sftp:auto-confirm yes
set mirror:parallel-transfer-count 5

# 上传同步（包括删除）
mirror -R --delete /local/path /remote/path

# 下载同步（包括删除）
mirror --delete /remote/path /local/path

exit
EOF
```

## 自动化定时同步

使用 crontab 设置定时任务：

```bash
# 编辑 crontab
crontab -e

# 添加定时任务（每小时执行一次）
0 * * * * /path/to/sync.sh
```

## 重要参数说明

mirror 命令的主要参数：
- `-R`: 反向镜像（从本地到远程）
- `--delete`: 删除目标端不存在的文件
- `--parallel=N`: 并行传输数量
- `--ignore-time`: 忽略时间戳比较
- `--only-newer`: 仅同步更新的文件

## 安全注意事项

1. 使用 SSH 密钥认证代替密码：
```bash
ssh-keygen -t rsa
ssh-copy-id username@remote_host
```

2. 限制同步目录和文件权限：
```bash
chmod 700 sync.sh
chmod 600 ~/.ssh/id_rsa
```

## 最佳实践

1. 在首次同步前，建议先进行测试：
```bash
lftp -e "mirror --dry-run -R --delete /local/path /remote/path" \
     -u username,password sftp://remote_host
```

2. 保持良好的日志记录：
```bash
mirror -R --delete /local/path /remote/path --log=/path/to/sync.log
```

3. 设置排除规则：
```bash
mirror -R --delete --exclude-glob "*.tmp" \
             --exclude-glob ".git/" \
             /local/path /remote/path
```

## 故障排除

1. 连接问题
```bash
# 测试 SSH 连接
ssh username@remote_host

# 检查网络连接
ping remote_host
```

2. 权限问题
```bash
# 检查本地文件权限
ls -la /local/path

# 检查远程文件权限
sftp username@remote_host
ls -la /remote/path
```

3. 常见错误处理
- 连接超时：检查网络和防火墙设置
- 权限拒绝：确认用户权限和文件所有权
- 磁盘空间不足：检查目标系统可用空间
