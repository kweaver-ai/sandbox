#!/bin/bash

# 设置错误时退出
set -e

# 资源限制配置
MEMORY_LIMIT=${MEMORY_LIMIT:-"32GB"}  # 默认内存限制 32GB

# 检查 Bubblewrap 是否安装
if ! command -v bwrap &> /dev/null; then
    echo "Error: Bubblewrap is not installed. Please install it first."
    echo "You can install it using:"
    echo "  - For Debian/Ubuntu: sudo apt-get install bubblewrap"
    echo "  - For CentOS/RHEL: sudo yum install bubblewrap"
    echo "  - For Arch Linux: sudo pacman -S bubblewrap"
    echo "  - For Alpine: apk add bubblewrap"
    exit 1
fi

# 检查参数
if [ $# -lt 2 ]; then
    echo "Usage: $0 <session_id> <command> [args...]"
    echo "Environment variables:"
    echo "  MEMORY_LIMIT: Memory limit (default: 32GB)"
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

# 创建临时目录用于输出重定向
STDOUT_LOG="$SESSION_DIR/stdout.log"
STDERR_LOG="$SESSION_DIR/stderr.log"

# 设置ulimit限制
# 内存限制 (虚拟内存，单位KB)
if [[ "$MEMORY_LIMIT" =~ ^([0-9]+)([MG]?)$ ]]; then
    NUM=${BASH_REMATCH[1]}
    UNIT=${BASH_REMATCH[2]}
    case $UNIT in
        M|"") MEMORY_KB=$((NUM * 1024)) ;;
        G) MEMORY_KB=$((NUM * 1024 * 1024)) ;;
    esac
    ulimit -v $MEMORY_KB
fi

# 进程数限制
ulimit -u 100

# CPU时间限制 (5分钟)
ulimit -t 300

# 使用 Bubblewrap 运行命令
bwrap \
    --ro-bind /usr /usr \
    --ro-bind /lib /lib \
    --ro-bind /lib64 /lib64 \
    --ro-bind /bin /bin \
    --ro-bind /sbin /sbin \
    --ro-bind /etc/resolv.conf /etc/resolv.conf \
    --bind "$SESSION_DIR" /workspace \
    --dev /dev \
    --chdir /workspace \
    --die-with-parent \
    --setenv PYTHONPATH "/workspace" \
    --setenv HOME "/workspace" \
    bash -c "$CMD > '/workspace/stdout.log' 2> '/workspace/stderr.log'; echo \$? > '/workspace/exit_code.tmp'"

# 获取执行结果
EXIT_CODE=$(cat "$SESSION_DIR/exit_code.tmp" 2>/dev/null || echo "1")
STDOUT=$(cat "$STDOUT_LOG" 2>/dev/null || echo "")
STDERR=$(cat "$STDERR_LOG" 2>/dev/null || echo "")

# 清理临时文件
rm -f "$SESSION_DIR/exit_code.tmp"

# 输出结果
echo "=== EXIT CODE ==="
echo "$EXIT_CODE"
echo "=== STDOUT ==="
echo "$STDOUT"
echo "=== STDERR ==="
echo "$STDERR"

exit $EXIT_CODE 