from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
import shutil
import stat
import fcntl
import time
import json
import traceback
import subprocess

from sandbox_runtime.utils.loggers import DEFAULT_LOGGER
from sandbox_runtime.errors import SandboxError
from sandbox_runtime.utils.common import safe_join
from sandbox_runtime.sandbox.shared_env.app.config import (
    DEFAULT_SESSION_SIZE,
    WORKSPACE_LIST_FILE,
)
from sandbox_runtime.sandbox.shared_env.utils.session_utils import (
    get_session_dir,
    create_tmpfs_mount,
    cleanup_tmpfs_mount,
    ensure_session_exists,
)

router = APIRouter()


class SessionRequest(BaseModel):
    size: Optional[str] = DEFAULT_SESSION_SIZE


@router.post("/session/{session_id}")
async def create_new_session(session_id: str, request: SessionRequest):
    """
    创建新的会话

    Args:
        session_id: 会话 ID
        request: 会话请求参数

    Returns:
        dict: 包含会话 ID 的响应
    """
    try:
        session_id = create_session(session_id, request.size or DEFAULT_SESSION_SIZE)
        return {"session_id": session_id}
    except Exception as e:
        DEFAULT_LOGGER.error(f"Failed to create session {session_id}: {str(e)}")
        raise SandboxError(message="Failed to create session", detail=str(e))


@router.delete("/session/{session_id}")
async def delete_session(session_id: str):
    """删除会话"""
    try:
        cleanup_tmpfs_mount(session_id)
        return {"status": "success"}
    except Exception as e:
        DEFAULT_LOGGER.error(f"Failed to delete session {session_id}: {str(e)}")
        raise SandboxError(message="Failed to delete session", detail=str(e))


def create_session(session_id: str, size: str = DEFAULT_SESSION_SIZE) -> str:
    """
    创建新的会话

    Args:
        session_id: 会话 ID
        size: tmpfs 大小

    Returns:
        str: 会话 ID
    """
    DEFAULT_LOGGER.info(f"Creating session {session_id}")
    # 检查会话目录是否已存在
    session_dir = get_session_dir(session_id)
    if os.path.exists(session_dir):
        DEFAULT_LOGGER.info(f"Session {session_id} already exists")
        raise SandboxError(message="Session already exists")

    # 为每个会话创建 tmpfs 挂载点
    create_tmpfs_mount(session_id, size)
    DEFAULT_LOGGER.info(f"Session {session_id} created successfully")
    return session_id


@router.get("/status/{session_id}")
async def get_session_status(session_id: str) -> dict:
    """
    获取会话状态

    Args:
        session_id: 会话 ID

    Returns:
        Dict[str, Any]: 包含会话状态信息的响应
    """
    from ..models.session import SessionStatus

    session_dir = get_session_dir(session_id)
    status = SessionStatus(id=session_id, exists=os.path.exists(session_dir), files=[])

    # 如果会话目录存在，获取更多信息
    if status.exists:
        # 检查是否已挂载
        try:
            with open("/proc/mounts", "r") as f:
                status.is_mounted = session_dir in f.read()
        except Exception:
            status.is_mounted = False

        # 获取工作区信息
        try:
            if os.path.exists(WORKSPACE_LIST_FILE):
                with open(WORKSPACE_LIST_FILE, "r") as f:
                    content = f.read()
                    if content.strip():
                        workspaces = json.loads(content.strip())
                        if session_id in workspaces:
                            info = workspaces[session_id]
                            status.created_at = info.get("created_at")
                            status.mount_point = info.get("mount_point")
        except Exception:
            pass

        # 获取文件列表
        try:
            for filename in os.listdir(session_dir):
                file_path = os.path.join(session_dir, filename)
                if os.path.isfile(file_path):
                    status.files.append(
                        {
                            "filename": filename,
                            "size": os.path.getsize(file_path),
                            "type": (
                                filename.split(".")[-1]
                                if "." in filename
                                else "unknown"
                            ),
                            "modified_at": os.path.getmtime(file_path),
                        }
                    )
        except Exception:
            pass

    return status.dict()
