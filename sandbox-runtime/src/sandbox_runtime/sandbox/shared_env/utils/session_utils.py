import os
import stat
import fcntl
import json
import time
import subprocess
import shutil
import traceback
from typing import Any, Dict
from functools import wraps
import asyncio

from fastapi.responses import FileResponse, JSONResponse
from fastapi import HTTPException

from sandbox_runtime.utils.loggers import DEFAULT_LOGGER
from sandbox_runtime.errors import SandboxError
from sandbox_runtime.utils.common import safe_join
from sandbox_runtime.sandbox.shared_env.app.config import (
    WORKSPACE_LIST_FILE,
    DEFAULT_SESSION_SIZE,
)


def get_session_dir(session_id: str) -> str:
    """获取会话目录路径"""
    return f"/tmp/sandbox_{session_id}"


def make_json_response(result: Any):
    """统一处理响应格式"""
    if isinstance(result, Exception):
        # 处理异常情况，抛出 HTTPException
        if isinstance(result, SandboxError):
            raise HTTPException(
                status_code=500,
                detail={
                    "type": "SandboxError",
                    "message": result.message,
                    "detail": result.detail,
                    **result.extra,
                },
            )
        elif isinstance(result, HTTPException):
            # 直接重新抛出 HTTPException
            raise result
        else:
            raise HTTPException(
                status_code=500,
                detail={
                    "type": "UnexpectedError",
                    "message": "An unexpected error occurred",
                    "detail": str(result),
                },
            )
    else:
        # 处理正常响应
        if isinstance(result, str):
            try:
                result = json.loads(result)
            except ValueError:
                pass

        if isinstance(result, dict):
            output = result.get("output", result)
            full_output = result.get("full_output", {})
        else:
            output = result
            full_output = {}

        res = {
            "result": output,
        }

        if full_output:
            res["full_result"] = full_output
        else:
            res["full_result"] = output
        return res


def wrap_result(func):
    """
    装饰器：统一包装返回结果为 {"result": ...} 格式，并处理异常

    Args:
        func: 被装饰的函数

    Returns:
        Callable: 装饰后的函数
    """

    @wraps(func)
    async def wrapper(*args, **kwargs) -> Dict[str, Any] | FileResponse:
        try:
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)
        except Exception as e:
            # 记录错误日志
            DEFAULT_LOGGER.error(f"Error in {func.__name__}: {str(e)}", exc_info=True)
            return make_json_response(e)

        # 如果已经是 FileResponse，直接返回
        if isinstance(result, FileResponse):
            return result

        DEFAULT_LOGGER.info(f"wrap_result res: {result}")
        return make_json_response(result)

    return wrapper


def wrap_result_v2(func):
    """
    装饰器：统一处理返回结果

    Args:
        func: 被装饰的函数

    Returns:
        Callable: 装饰后的函数
    """

    @wraps(func)
    async def wrapper(*args, **kwargs) -> Dict[str, Any] | FileResponse:
        try:
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)
        except HTTPException as e:
            return e.detail
        except Exception as e:

            # 记录错误日志
            DEFAULT_LOGGER.error(f"Error in {func.__name__}: {str(e)}", exc_info=True)
            return make_json_response(e)

        print(f"wrap_result_v2 res: {result}")
        return result

    return wrapper


def update_workspace_list(session_id: str, mount_point: str, action: str = "add"):
    """
    更新 workspace.list 文件

    Args:
        session_id: 会话 ID
        mount_point: 挂载点路径
        action: 操作类型 ("add" 或 "remove")
    """
    max_retries = 3
    retry_delay = 0.5  # 秒

    for attempt in range(max_retries):
        try:
            # 确保文件存在
            if not os.path.exists(WORKSPACE_LIST_FILE):
                DEFAULT_LOGGER.info(
                    f"Workspace list file {WORKSPACE_LIST_FILE} does not exist, creating it"
                )
                with open(WORKSPACE_LIST_FILE, "w") as f:
                    f.write("")

            # 使用文件锁确保并发安全
            with open(WORKSPACE_LIST_FILE, "r+") as f:
                DEFAULT_LOGGER.info(
                    f"Acquiring lock on workspace list file {WORKSPACE_LIST_FILE}"
                )
                # 尝试获取文件锁，设置非阻塞模式
                try:
                    fcntl.flock(f.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                except IOError:
                    DEFAULT_LOGGER.warning(
                        f"Failed to acquire lock, retrying in {retry_delay} seconds... (attempt {attempt + 1}/{max_retries})"
                    )
                    if attempt < max_retries - 1:
                        DEFAULT_LOGGER.warning(
                            f"Failed to acquire lock, retrying in {retry_delay} seconds... (attempt {attempt + 1}/{max_retries})"
                        )
                        time.sleep(retry_delay)
                        continue
                    else:
                        traceback.print_exc()
                        raise Exception("Failed to acquire lock after maximum retries")

                try:
                    # 读取现有内容
                    content = f.read()
                    DEFAULT_LOGGER.info(
                        f"Workspace list file {WORKSPACE_LIST_FILE} content: {content}"
                    )
                    workspaces = {}
                    if content.strip():
                        workspaces = json.loads(content.strip())

                    if action == "add":
                        DEFAULT_LOGGER.info(
                            f"Adding new workspace {session_id} to workspace list file {WORKSPACE_LIST_FILE}"
                        )
                        # 添加新的工作区
                        workspaces[session_id] = {
                            "mount_point": mount_point,
                            "created_at": time.time(),
                        }
                    elif action == "remove":
                        DEFAULT_LOGGER.info(
                            f"Removing workspace {session_id} from workspace list file {WORKSPACE_LIST_FILE}"
                        )
                        # 移除工作区
                        workspaces.pop(session_id, None)

                    # 写回文件
                    DEFAULT_LOGGER.info(
                        f"Writing workspace list file {WORKSPACE_LIST_FILE} content: {json.dumps(workspaces, indent=2)}"
                    )
                    f.seek(0)
                    f.truncate()
                    f.write(json.dumps(workspaces, indent=2))
                    f.flush()
                    os.fsync(f.fileno())  # 确保写入磁盘
                    DEFAULT_LOGGER.info(
                        f"Workspace list file {WORKSPACE_LIST_FILE} written successfully"
                    )

                    # 成功完成，跳出重试循环
                    break

                finally:
                    # 释放文件锁
                    DEFAULT_LOGGER.info(
                        f"Releasing lock on workspace list file {WORKSPACE_LIST_FILE}"
                    )
                    fcntl.flock(f.fileno(), fcntl.LOCK_UN)

        except Exception as e:
            traceback.print_exc()
            if attempt < max_retries - 1:
                DEFAULT_LOGGER.warning(
                    f"Error updating workspace list, retrying... (attempt {attempt + 1}/{max_retries}): {str(e)}"
                )
                time.sleep(retry_delay)
            else:
                DEFAULT_LOGGER.error(
                    f"Failed to update workspace list after {max_retries} attempts: {str(e)}"
                )
                raise SandboxError(
                    message="Failed to update workspace list", detail=str(e)
                )


def create_tmpfs_mount(session_id: str, size: str = DEFAULT_SESSION_SIZE) -> str:
    """
    为会话创建 tmpfs 挂载点

    Args:
        session_id: 会话 ID
        size: tmpfs 大小

    Returns:
        str: 挂载点路径
    """
    # 创建挂载点目录
    mount_point = get_session_dir(session_id)
    DEFAULT_LOGGER.info(f"Creating tmpfs mount point {mount_point}")
    os.makedirs(mount_point, exist_ok=True)

    try:
        # 检查是否已经挂载
        with open("/proc/mounts", "r") as f:
            if mount_point in f.read():
                DEFAULT_LOGGER.info(f"Tmpfs mount point {mount_point} already exists")
                return mount_point

        # 挂载 tmpfs
        subprocess.run(
            [
                "mount",
                "-t",
                "tmpfs",
                "-o",
                f"size={size}",
                f"sandbox_{session_id}",
                mount_point,
            ],
            check=True,
        )

        # 设置目录权限
        os.chmod(mount_point, stat.S_IRWXU)

        # 更新 workspace.list
        update_workspace_list(session_id, mount_point, "add")
        DEFAULT_LOGGER.info(f"Tmpfs mount point {mount_point} created")

        return mount_point
    except subprocess.CalledProcessError as e:
        DEFAULT_LOGGER.error(f"Failed to mount tmpfs: {e}")
        # 如果挂载失败，使用普通目录
        raise SandboxError(message="Failed to mount tmpfs", detail=str(e))


def cleanup_tmpfs_mount(session_id: str):
    """
    清理 tmpfs 挂载点

    Args:
        session_id: 会话 ID
    """
    mount_point = get_session_dir(session_id)
    DEFAULT_LOGGER.info(f"Cleaning up tmpfs mount point {mount_point}")
    try:
        # 检查是否已挂载
        with open("/proc/mounts", "r") as f:
            if mount_point in f.read():
                DEFAULT_LOGGER.info(f"Tmpfs mount point {mount_point} is mounted")
                # 卸载 tmpfs
                subprocess.run(["umount", mount_point], check=True)

        # 删除挂载点目录
        if os.path.exists(mount_point):
            shutil.rmtree(mount_point)

        # 更新 workspace.list
        update_workspace_list(session_id, mount_point, "remove")
    except subprocess.CalledProcessError as e:
        traceback.print_exc()
        DEFAULT_LOGGER.error(f"Failed to unmount tmpfs: {e}")
        # 如果卸载失败，尝试强制删除目录
        if os.path.exists(mount_point):
            try:
                shutil.rmtree(mount_point)
            except Exception as cleanup_error:
                DEFAULT_LOGGER.error(
                    f"Failed to cleanup mount point directory: {cleanup_error}"
                )
                raise SandboxError(
                    message="Failed to cleanup mount point", detail=str(cleanup_error)
                )
    except Exception as e:
        traceback.print_exc()
        DEFAULT_LOGGER.error(f"Unexpected error during cleanup: {e}")
        raise SandboxError(message="Failed to cleanup tmpfs mount", detail=str(e))


def ensure_session_exists(session_id: str) -> None:
    """
    确保会话环境存在，如果不存在则创建

    Args:
        session_id: 会话 ID
    """
    session_dir = get_session_dir(session_id)
    if not os.path.exists(session_dir):
        try:
            DEFAULT_LOGGER.info(f"Creating session {session_id}")
            create_session(session_id)
        except SandboxError as e:
            if "Session already exists" not in str(e):
                raise


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
