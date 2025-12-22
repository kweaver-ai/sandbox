#!/bin/bash

# 设置错误时退出
set -e

# 检查 Firejail 是否安装
if ! command -v firejail &> /dev/null; then
    echo "Error: Firejail is not installed. Please install it first."
    echo "You can install it using:"
    echo "  - For Debian/Ubuntu: sudo apt-get install firejail"
    echo "  - For CentOS/RHEL: sudo yum install firejail"
    echo "  - For Arch Linux: sudo pacman -S firejail"
    exit 1
fi

# 检查参数
if [ $# -lt 2 ]; then
    echo "Usage: $0 <session_id> <command> [args...]"
    exit 1
fi

# 获取会话ID和命令
SESSION_ID="$1"
shift  # 移除第一个参数（会话ID）
CMD="$@"  # 获取剩余的所有参数作为命令

# 设置会话目录
SESSION_DIR="/tmp/sandbox_${SESSION_ID}"

# 进入会话目录
cd "$SESSION_DIR"

# 设置 PYTHONPATH
export PYTHONPATH=$PYTHONPATH:$SESSION_DIR

# 设置 Firejail 配置文件
FIREJAIL_PROFILE="$SESSION_DIR/firejail.profile"
cat > "$FIREJAIL_PROFILE" << EOF
# Firejail profile for Python sandbox
# Network restrictions
private
net none

# System directory restrictions
# 禁用系统管理命令
blacklist /usr/bin/sudo
blacklist /bin/su
blacklist /usr/bin/systemctl
blacklist /sbin/reboot

# 禁用编译器等
blacklist /usr/bin/gcc
blacklist /usr/bin/make

# 禁用网络访问工具
blacklist /usr/bin/wget
blacklist /usr/bin/curl
blacklist /usr/bin/ftp
blacklist /usr/bin/ssh

# 隐藏其他用户家目录
blacklist /home/otheruser
blacklist /root

# 禁止访问挂载信息
blacklist /proc/mounts
blacklist /sys

# User directory restrictions
blacklist ~
blacklist /home

# Resource limits
cpu 2
rlimit-nproc 20
rlimit-as 100m
rlimit-fsize 100m

# Python specific settings
whitelist /usr/bin/python3
whitelist /usr/lib/python3
whitelist /usr/local/lib/python3
whitelist /usr/share/python3

# Basic commands
whitelist /bin/bash
whitelist /usr/bin/bash
whitelist /bin/ls
whitelist /usr/bin/ls
whitelist /bin/pwd
whitelist /usr/bin/pwd
whitelist /bin/cat
whitelist /usr/bin/cat
whitelist /bin/grep
whitelist /usr/bin/grep
whitelist /bin/head
whitelist /usr/bin/head
whitelist /bin/tail
whitelist /usr/bin/tail
whitelist /bin/less
whitelist /usr/bin/less
whitelist /bin/more
whitelist /usr/bin/more
whitelist /bin/vim
whitelist /usr/bin/vim
whitelist /bin/nano
whitelist /usr/bin/nano
whitelist /bin/sed
whitelist /usr/bin/sed
whitelist /bin/awk
whitelist /usr/bin/awk

# Allow access to session directory
whitelist ${SESSION_DIR}
EOF

# 使用 Firejail 运行命令
firejail --quiet \
    --profile="$FIREJAIL_PROFILE" \
    --private="$SESSION_DIR" \
    --output="$SESSION_DIR/stdout.log" \
    --output-stderr="$SESSION_DIR/stderr.log" \
    $CMD

# 获取执行结果
EXIT_CODE=$?
STDOUT=$(cat "$SESSION_DIR/stdout.log" 2>/dev/null || echo "")
STDERR=$(cat "$SESSION_DIR/stderr.log" 2>/dev/null || echo "")

# 输出结果
echo "=== EXIT CODE ==="
echo "$EXIT_CODE"
echo "=== STDOUT ==="
echo "$STDOUT"
echo "=== STDERR ==="
echo "$STDERR"

exit $EXIT_CODE 