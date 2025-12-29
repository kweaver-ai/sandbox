#!/bin/bash

# 检查是否以root权限运行
if [ "$EUID" -ne 0 ]; then
    echo "请使用root权限运行此脚本"
    exit 1
fi

# 工作空间文件路径
WORKSPACE_FILE="/tmp/sandbox_ssh.workspace"
LOCK_FILE="/tmp/sandbox_ssh.lock"

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

while IFS=$'\t' read -r session_id sandbox_dir size created_at; do
    TOTAL=$((TOTAL + 1))
    echo "正在清理环境: $session_id"
    
    # 删除用户
    if userdel -r "$session_id" 2>/dev/null; then
        echo "  - 用户删除成功"
    else
        echo "  - 用户删除失败"
        FAILED+=("$session_id: 用户删除失败")
        continue
    fi
    
    # 卸载并删除目录
    if [ -d "$sandbox_dir" ]; then
        if umount "$sandbox_dir" 2>/dev/null; then
            echo "  - 文件系统卸载成功"
        else
            echo "  - 文件系统卸载失败"
        fi
        
        if rm -rf "$sandbox_dir" 2>/dev/null; then
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
if [ ${#FAILED[@]} -gt 0 ]; then
    echo "失败: ${#FAILED[@]}"
    for error in "${FAILED[@]}"; do
        echo "  - $error"
    done
fi 