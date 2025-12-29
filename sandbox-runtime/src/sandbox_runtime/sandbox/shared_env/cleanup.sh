#!/bin/bash

# 检查是否以root权限运行
if [ "$EUID" -ne 0 ]; then
    echo "请使用root权限运行此脚本"
    exit 1
fi

# 工作空间文件路径
WORKSPACE_FILE="/tmp/workspace_shared.list"
LOCK_FILE="/tmp/workspace_shared.lock"

# 获取文件锁
exec 200>"$LOCK_FILE"
if ! flock -n 200; then
    echo "另一个进程正在操作工作空间文件，请稍后再试"
    exit 1
fi

# 清理函数
cleanup() {
    # 释放文件锁
    flock -u 200
}

# 设置清理钩子
trap cleanup EXIT

# 检查工作空间文件是否存在
if [ ! -f "$WORKSPACE_FILE" ]; then
    echo "工作空间文件不存在"
    exit 0
fi

# 读取并清理所有环境
TOTAL=0
SUCCESS=0
FAILED=()
SKIPPED=()

while IFS=$'\t' read -r session_id session_dir created_at; do
    TOTAL=$((TOTAL + 1))
    echo "正在清理环境: $session_id"
    
    # 检查会话是否在运行
    if pgrep -f "python.*$session_id" > /dev/null; then
        echo "  - 会话正在运行，跳过"
        SKIPPED+=("$session_id: 会话正在运行")
        continue
    fi
    
    # 删除会话目录
    if [ -d "$session_dir" ]; then
        if rm -rf "$session_dir" 2>/dev/null; then
            echo "  - 目录删除成功"
        else
            echo "  - 目录删除失败"
            FAILED+=("$session_id: 目录删除失败")
            continue
        fi
    fi
    
    SUCCESS=$((SUCCESS + 1))
    echo "  - 环境清理完成"
done < "$WORKSPACE_FILE"

# 清空工作空间文件
echo "" > "$WORKSPACE_FILE"

# 输出清理结果
echo
echo "清理完成"
echo "总计: $TOTAL"
echo "成功: $SUCCESS"
if [ ${#SKIPPED[@]} -gt 0 ]; then
    echo "跳过: ${#SKIPPED[@]}"
    for item in "${SKIPPED[@]}"; do
        echo "  - $item"
    done
fi
if [ ${#FAILED[@]} -gt 0 ]; then
    echo "失败: ${#FAILED[@]}"
    for error in "${FAILED[@]}"; do
        echo "  - $error"
    done
fi 