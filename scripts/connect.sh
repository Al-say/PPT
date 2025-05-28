#!/bin/bash

# 设置服务器信息
USER="root"
HOST="14.103.177.132"

echo "正在通过SSH密钥连接到远程服务器..."
ssh -o PasswordAuthentication=no \
    -o StrictHostKeyChecking=accept-new \
    $USER@$HOST
