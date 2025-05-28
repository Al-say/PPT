#!/bin/bash

# SFTP同步脚本
# 用法：./sftp_sync.sh <local_dir> <remote_dir> <host> <username>

# 检查参数
if [ "$#" -ne 4 ]; then
    echo "用法: $0 <本地目录> <远程目录> <主机> <用户名>"
    echo "例如: $0 /local/path /remote/path example.com user"
    exit 1
fi

LOCAL_DIR="$1"
REMOTE_DIR="$2"
HOST="$3"
USERNAME="$4"

# 检查本地目录是否存在
if [ ! -d "$LOCAL_DIR" ]; then
    echo "错误: 本地目录 '$LOCAL_DIR' 不存在"
    exit 1
fi

# 记录日志的函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> sync.log
}

# 开始同步
log "开始同步操作"
log "本地目录: $LOCAL_DIR"
log "远程目录: $REMOTE_DIR"
log "主机: $HOST"
log "用户: $USERNAME"

# 使用lftp执行同步
lftp -u "$USERNAME" "sftp://$HOST" << EOF || exit 1
# 设置同步选项
set sftp:auto-confirm yes
set mirror:parallel-transfer-count 5
set mirror:use-pget-n 5
set mirror:parallel-directories yes

# 执行同步（包括删除）
mirror -R --delete \
    --parallel=5 \
    --exclude-glob .git/ \
    --exclude-glob .DS_Store \
    --exclude-glob "*.tmp" \
    --exclude-glob "*.log" \
    "$LOCAL_DIR" "$REMOTE_DIR"

exit
EOF

# 检查同步结果
if [ $? -eq 0 ]; then
    log "同步完成"
else
    log "同步失败"
    exit 1
fi
