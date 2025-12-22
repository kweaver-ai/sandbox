import os
import json
import shutil
import subprocess
import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from pathlib import Path

from sandbox_runtime.utils.loggers import DEFAULT_LOGGER
from sandbox_runtime.errors import SandboxError
from sandbox_runtime.sandbox.shared_env.utils.session_utils import get_session_dir
from sandbox_runtime.sandbox.shared_env.app.config import WORKSPACE_LIST_FILE


router = APIRouter()


class CleanupRequest(BaseModel):
    force: Optional[bool] = False


class CleanupResponse(BaseModel):
    total: int
    success: int
    failed: List[str]
    skipped: List[str]


@router.get("/healthy")
async def healthy():
    """健康检查"""
    return {"status": "success"}


@router.post("/cleanup-all")
async def cleanup_all_environments(request: CleanupRequest) -> CleanupResponse:
    """
    清理所有虚拟环境

    Args:
        request: 清理请求参数

    Returns:
        CleanupResponse: 清理结果
    """
    result = {"total": 0, "success": 0, "failed": [], "skipped": []}

    try:
        # 获取所有会话信息
        workspaces = {}
        if os.path.exists(WORKSPACE_LIST_FILE):
            with open(WORKSPACE_LIST_FILE, "r") as f:
                content = f.read()
                if content:
                    workspaces = json.loads(content)

        result["total"] = len(workspaces)

        # 遍历所有会话
        for session_id, info in workspaces.items():
            try:
                # 检查会话是否在运行
                if (
                    not request.force
                    and subprocess.run(
                        ["pgrep", "-f", f"python3.*{session_id}"],
                        capture_output=True,
                    ).returncode
                    == 0
                ):
                    result["skipped"].append(f"{session_id}: 会话正在运行")
                    continue

                # 获取会话目录
                session_dir = get_session_dir(session_id)
                if not os.path.exists(session_dir):
                    result["failed"].append(f"{session_id}: 会话目录不存在")
                    continue

                # 停止会话（如果在运行）
                if (
                    subprocess.run(
                        ["pgrep", "-f", f"python3.*{session_id}"],
                        capture_output=True,
                    ).returncode
                    == 0
                ):
                    subprocess.run(["pkill", "-f", f"python3.*{session_id}"])
                    time.sleep(1)  # 等待进程完全停止

                # 删除会话目录
                try:
                    shutil.rmtree(session_dir)
                except Exception as e:
                    result["failed"].append(f"{session_id}: 删除目录失败 - {str(e)}")
                    continue

                result["success"] += 1

            except Exception as e:
                result["failed"].append(f"{session_id}: {str(e)}")

        # 清空工作空间文件
        with open(WORKSPACE_LIST_FILE, "w") as f:
            f.write("")

        return CleanupResponse(**result)

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to cleanup all environments: {str(e)}"
        )
