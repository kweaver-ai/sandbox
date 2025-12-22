#!/bin/bash

# 检查是否以root权限运行
if [ "$EUID" -ne 0 ]; then
    echo "请使用root权限运行此脚本"
    exit 1
fi

# 检查参数
if [ $# -lt 1 ]; then
    echo "用法: $0 <user_id> [size]"
    echo "示例: $0 test123 20M"
    exit 1
fi

USER_ID="$1"
SIZE="${2:-50M}"  # 默认大小为50M
SANDBOX_DIR="/tmp/sandbox_ssh_${USER_ID}"
WORKSPACE_FILE="/tmp/sandbox_ssh.workspace"
LOCK_FILE="/tmp/sandbox_ssh.lock"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESTRICTED_SHELL="$SCRIPT_DIR/restricted_shell.sh"

# 获取文件锁（带重试机制）
MAX_RETRIES=5
RETRY_INTERVAL=2
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    exec 200>"$LOCK_FILE"
    if flock -n 200; then
        break
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
        echo "等待文件锁释放... (尝试 $RETRY_COUNT/$MAX_RETRIES)"
        sleep $RETRY_INTERVAL
    else
        echo "无法获取文件锁，已达到最大重试次数 ($MAX_RETRIES)"
        exit 1
    fi
done

# 清理函数
cleanup() {
    # 释放文件锁
    flock -u 200
    # 如果创建用户失败，清理已创建的资源
    if [ -n "$CLEANUP_USER" ]; then
        userdel -r "$USER_ID" 2>/dev/null
    fi
    if [ -n "$CLEANUP_DIR" ]; then
        umount "$SANDBOX_DIR" 2>/dev/null
        rm -rf "$SANDBOX_DIR" 2>/dev/null
    fi
}

# 设置清理钩子
trap cleanup EXIT

# 检查用户是否已存在
if id "$USER_ID" &>/dev/null; then
    echo "用户 $USER_ID 已存在"
    exit 1
fi

# 检查目录是否已存在
if [ -d "$SANDBOX_DIR" ]; then
    echo "目录 $SANDBOX_DIR 已存在"
    exit 1
fi

# 创建用户
echo "创建用户 $USER_ID..."
useradd -m -s "$RESTRICTED_SHELL" "$USER_ID"
if [ $? -ne 0 ]; then
    echo "创建用户失败"
    exit 1
fi
CLEANUP_USER=1

# 设置随机密码
PASSWORD=$(openssl rand -base64 12)
echo "$USER_ID:$PASSWORD" | chpasswd
if [ $? -ne 0 ]; then
    echo "设置密码失败"
    exit 1
fi

# 创建挂载点
echo "创建挂载点 $SANDBOX_DIR..."
mkdir -p "$SANDBOX_DIR"
if [ $? -ne 0 ]; then
    echo "创建挂载点失败"
    exit 1
fi
CLEANUP_DIR=1

# 设置目录权限
chown "$USER_ID:$USER_ID" "$SANDBOX_DIR"
chmod 700 "$SANDBOX_DIR"

# 挂载tmpfs
echo "挂载tmpfs到 $SANDBOX_DIR..."
mount -t tmpfs -o size="$SIZE" tmpfs "$SANDBOX_DIR"
if [ $? -ne 0 ]; then
    echo "挂载tmpfs失败"
    exit 1
fi

# 创建基本目录结构
mkdir -p "$SANDBOX_DIR"/{bin,lib/python/site-packages,usr,etc}
chown -R "$USER_ID:$USER_ID" "$SANDBOX_DIR"

# 创建 Python 虚拟环境
echo "设置 Python 环境..."
su - "$USER_ID" -c "python3 -m venv $SANDBOX_DIR/venv"
if [ $? -ne 0 ]; then
    echo "创建 Python 虚拟环境失败"
    exit 1
fi

# 记录工作空间信息
echo "记录工作空间信息..."
WORKSPACE_INFO="${USER_ID}	${SANDBOX_DIR}	${SIZE}	$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# 追加到工作空间文件
echo "$WORKSPACE_INFO" >> "$WORKSPACE_FILE"

# 清除清理标记，表示操作成功
CLEANUP_USER=""
CLEANUP_DIR=""

echo "环境初始化完成"
echo "用户名: $USER_ID"
echo "密码: $PASSWORD"
echo "工作目录: $SANDBOX_DIR"
echo "文件系统大小: $SIZE"
echo "Python 环境已配置，可以使用 python 和 pip 命令" 