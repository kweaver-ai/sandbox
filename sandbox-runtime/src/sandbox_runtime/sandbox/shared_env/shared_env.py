import re
from fastapi import FastAPI, UploadFile, File, HTTPException, APIRouter, Form, Query
from fastapi.responses import FileResponse, JSONResponse
import os
import uuid
import shutil
from typing import Dict, Optional, Any, Callable, List
import subprocess
import tempfile
import json
import uvicorn
import argparse
import logging
from pathlib import Path
import stat
import fcntl
import time
import asyncio
from functools import wraps
import yaml
import platform
import base64
from pydantic import BaseModel
import traceback

from sandbox_runtime.errors import SandboxError
from sandbox_runtime.sandbox.sandbox.async_pool import AsyncSandboxPool
from sandbox_runtime.sandbox.core.executor import LambdaSandboxExecutor
from sandbox_runtime.sandbox.sandbox.config import SandboxConfig

from sandbox_runtime.utils.loggers import DEFAULT_LOGGER
from sandbox_runtime.utils.clean_task import start_cleanup_task
from sandbox_runtime.utils.efast_downloader import EFASTDownloader, DownloadItem

# 初始化 EFAST 下载器
from sandbox_runtime.settings import get_settings

settings = get_settings()


PYTHON_COMMAND = "python3"

SUPPORTED_FILE_TYPES = [
    "html",
    "txt",
    "md",
    "json",
    "xml",
    "csv",
    "png",
    "jpg",
    "jpeg",
    "gif",
    "bmp",
    "webp",
    "svg",
    "ico",
]

URL_PREFIX = "/workspace/se"
DEFAULT_SESSION_SIZE = "100M"


# 全局应用实例和executor实例
app: Optional[FastAPI] = None
executor: Optional[LambdaSandboxExecutor] = None

# 创建路由器
router = APIRouter(prefix=URL_PREFIX)

# workspace.list 文件路径
WORKSPACE_LIST_FILE = "/tmp/workspace_shared.list"

from sandbox_runtime.utils.common import safe_join


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


def wrap_result(func: Callable) -> Callable:
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


def wrap_result_v2(func: Callable) -> Callable:
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


class SessionRequest(BaseModel):
    size: Optional[str] = DEFAULT_SESSION_SIZE


class CreateFileRequest(BaseModel):
    content: str
    filename: str
    mode: Optional[int] = 0o644  # Default file permissions


class ExecuteRequest(BaseModel):
    command: str  # 要执行的命令
    args: Optional[List[str]] = None  # 命令行参数


class ExecuteCodeRequest(BaseModel):
    code: str
    filename: Optional[str] = None
    args: Optional[List[str]] = None
    script_type: Optional[str] = "python"
    output_params: Optional[List[str]] = None


class ExecuteCodeRequestV2(BaseModel):
    """
    执行代码请求参数模型
    """

    handler_code: str
    event: Dict[str, Any] = {}
    context: Optional[Dict[str, Any]] = {}


class CleanupRequest(BaseModel):
    force: Optional[bool] = False


class CleanupResponse(BaseModel):
    total: int
    success: int
    failed: List[str]
    skipped: List[str]


class DownloadFromEFASTRequest(BaseModel):
    file_params: List[dict]
    efast_url: Optional[str] = ""
    save_path: Optional[str] = ""
    token: Optional[str] = ""
    timeout: Optional[int] = None


class SessionStatus(BaseModel):
    """会话状态"""

    id: str
    exists: bool
    created_at: Optional[float] = None
    mount_point: Optional[str] = None
    is_mounted: bool = False
    files: List[Dict[str, Any]] = []


def validate_session_access(session_id: str, sid: str) -> bool:
    """验证会话访问权限

    Args:
        session_id: 会话ID
        sid: 会话验证ID

    Returns:
        bool: 是否有权限访问
    """
    # 简单的验证逻辑：sid 应该是 session_id 的某种哈希或签名
    # 这里使用简单的哈希验证，实际项目中可能需要更复杂的验证机制
    # import hashlib
    # expected_sid = hashlib.md5(f"sandbox_{session_id}".encode()).hexdigest()[:8]
    # return sid == expected_sid
    return True


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


@router.get("/healthy")
@wrap_result
async def healthy():
    """健康检查"""
    return {"status": "success"}


@router.post("/session/{session_id}")
@wrap_result
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
@wrap_result
async def delete_session(session_id: str):
    """删除会话"""
    try:
        cleanup_tmpfs_mount(session_id)
        return {"status": "success"}
    except Exception as e:
        DEFAULT_LOGGER.error(f"Failed to delete session {session_id}: {str(e)}")
        raise SandboxError(message="Failed to delete session", detail=str(e))


@router.post("/upload/{session_id}")
@wrap_result
async def upload_file(
    session_id: str, file: UploadFile = File(...), filename: Optional[str] = None
):
    """
    上传文件到会话

    Args:
        session_id: 会话 ID
        file: 要上传的文件
        filename: 文件路径（支持相对路径，如 "subdir/file.txt"），如果不提供则使用原始文件名

    Returns:
        dict: 包含文件信息的响应
    """
    ensure_session_exists(session_id)
    session_dir = get_session_dir(session_id)

    # 使用提供的文件名或原始文件名
    target_filename = filename or file.filename
    if not target_filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    # 使用 safe_join 安全地拼接路径（防止路径遍历攻击）
    try:
        file_path = str(safe_join(session_dir, target_filename))
    except ValueError as e:
        raise SandboxError(message="Invalid file path", detail=str(e))

    # 确保目录存在
    file_dir = os.path.dirname(file_path)
    if file_dir:
        os.makedirs(file_dir, exist_ok=True)

    # 保存文件
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"filename": target_filename, "size": os.path.getsize(file_path)}


@router.get("/download/{session_id}/{filepath:path}")
@wrap_result
async def download_file(session_id: str, filepath: str):
    """
    从会话下载文件

    Args:
        session_id: 会话 ID
        filepath: 文件路径（支持相对路径，如 "subdir/file.txt"）
    """
    ensure_session_exists(session_id)
    session_dir = get_session_dir(session_id)
    DEFAULT_LOGGER.info(f"Session {session_id} exists")

    # 使用 safe_join 安全地拼接路径（防止路径遍历攻击）
    try:
        file_path = str(safe_join(session_dir, filepath))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid file path: {str(e)}")

    DEFAULT_LOGGER.info(f"Downloading file {filepath} from session {session_id}")
    if not os.path.exists(file_path):
        DEFAULT_LOGGER.info(f"File {filepath} not found in session {session_id}")
        raise HTTPException(status_code=404, detail="File not found")

    # 检查是否为文件（不是目录）
    if not os.path.isfile(file_path):
        DEFAULT_LOGGER.info(f"File {filepath} is not a file in session {session_id}")
        raise HTTPException(status_code=400, detail="Not a file")

    # 提取文件名（路径的最后一部分）用于下载
    display_filename = os.path.basename(filepath)

    DEFAULT_LOGGER.info(
        f"File {filepath} downloaded successfully from session {session_id}"
    )
    return FileResponse(
        file_path, filename=display_filename, media_type="application/octet-stream"
    )


@router.post("/download_from_efast/{session_id}")
@wrap_result
async def download_from_efast(
    session_id: str,
    body: DownloadFromEFASTRequest,
):
    """
    从 efast 下载文件到会话目录

    file_params 结构示例:
    [
        {
            'docid': 'gns://00328E97423F42AC9DEE87B4F4B4631E/83D893844A0B4A34A64DFFB343BEF416/A5AAE8168BAF4C49A7E10FFF800DB2A2',
            'rev': 'aaa',
            'savename': '新能源汽车产业分析 (9).docx'
        }
    ]
    """
    DEFAULT_LOGGER.info(f"Downloading files from EFAST for session {session_id}")
    ensure_session_exists(session_id)
    session_dir = get_session_dir(session_id)

    DEFAULT_LOGGER.info(f"Session directory {session_dir} exists")

    file_params = body.file_params
    efast_url = body.efast_url
    save_path = body.save_path
    token = body.token
    timeout = body.timeout

    if not file_params or len(file_params) == 0:
        DEFAULT_LOGGER.info(f"No file parameters provided")
        raise HTTPException(status_code=400, detail="No file parameters provided")

    # 验证 token
    if not token:
        # 尝试从环境变量获取 token
        token = os.getenv("EFAST_TOKEN", "")
        if not token:
            DEFAULT_LOGGER.info(f"EFAST token not configured")
            # raise HTTPException(status_code=500, detail="EFAST token not configured")

    real_path = save_path
    try:
        # 确定保存路径
        if not save_path:
            real_path = session_dir
        else:
            # 相对路径，相对于会话目录
            # 如果是绝对路径，需要转化到 session_dir 的相对路径， 不能直接用绝对路径
            real_path = safe_join(session_dir, save_path)

        DEFAULT_LOGGER.info(f"Saving path {real_path}")

        # 确保保存目录存在
        os.makedirs(real_path, exist_ok=True)
    except Exception as e:
        DEFAULT_LOGGER.error(f"Failed to create save path: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to create save path: {str(e)}"
        )

    downloader = EFASTDownloader(base_url=efast_url, token=token, timeout=timeout)

    # 验证和准备下载参数
    download_items = []

    for i, file_param in enumerate(file_params):
        # 验证文件参数结构
        DEFAULT_LOGGER.info(f"File param {file_param}")

        if "docid" not in file_param:
            raise HTTPException(
                status_code=400, detail=f"Missing docid in file_params[{i}]"
            )

        docid = file_param["docid"]
        savename = file_param.get("savename", f"downloaded_file_{i}")
        rev = file_param.get("rev", "")

        # 检查文件名安全性（禁止路径遍历，但允许路径分隔符）
        if ".." in savename:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid filename: {savename} (cannot contain '..')",
            )

        # 创建 DownloadItem
        download_item = DownloadItem(docid=docid, savename=savename, rev=rev)
        download_items.append(download_item)

        DEFAULT_LOGGER.info(f"Download item {download_item}")

    # 使用 download_multiple_async 进行批量下载
    try:
        DEFAULT_LOGGER.info(f"Downloading files from EFAST for session {session_id}")
        results = await downloader.download_multiple_async(
            downloads=download_items, save_path=real_path
        )

        DEFAULT_LOGGER.info(f"Download results: {results}")

        # 为结果添加索引信息
        for i, result in enumerate(results):
            result["index"] = i
            if i < len(download_items):
                result["docid"] = download_items[i].docid
                result["savename"] = download_items[i].savename
                if "file_path" in result:
                    result["file_path"] = (
                        result["file_path"].split(session_dir)[1].lstrip("/")
                    )

    except Exception as e:
        traceback.print_exc()
        # 记录错误日志
        DEFAULT_LOGGER.error(
            f"EFAST batch download failed for session {session_id}: {str(e)}"
        )
        raise HTTPException(status_code=500, detail=f"Batch download failed: {str(e)}")

    # 统计下载结果
    successful_downloads = [r for r in results if r.get("success", False)]
    failed_downloads = [r for r in results if not r.get("success", False)]

    # 返回下载结果
    return {
        "message": f"下载完成: {len(successful_downloads)}个成功, 共{len(file_params)} 个文件",
        "success_count": len(successful_downloads),
        "failed_count": len(failed_downloads),
        "total_count": len(file_params),
        "results": results,
        "save_path": save_path,
    }


@router.post("/create/{session_id}")
@wrap_result
async def create_file(session_id: str, request: CreateFileRequest):
    """
    创建文件

    Args:
        session_id: 会话 ID
        request: 创建文件请求参数
            - content: 文件内容
            - filename: 文件名
            - mode: 文件权限模式（可选，默认 0o644）

    Returns:
        dict: 包含创建文件信息的响应
    """
    ensure_session_exists(session_id)
    session_dir = get_session_dir(session_id)

    # 使用 safe_join 安全地拼接路径（防止路径遍历攻击）
    try:
        file_path = str(safe_join(session_dir, request.filename))
    except ValueError as e:
        raise SandboxError(message="Invalid file path", detail=str(e))

    # 确保目录存在
    file_dir = os.path.dirname(file_path)
    if file_dir:
        os.makedirs(file_dir, exist_ok=True)

    # 创建文件
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(request.content)

    # 设置文件权限
    os.chmod(file_path, request.mode or 0o644)

    return {"filename": request.filename, "size": os.path.getsize(file_path)}


# 将执行命令变成一个函数
async def execute_command(session_id: str, cmd: str, args: List[str]):
    """执行命令"""
    session_dir = get_session_dir(session_id)
    if not os.path.exists(session_dir):
        raise SandboxError(message="Session not found")

    # 使用 Firejail 运行命令
    script_dir = os.path.dirname(os.path.abspath(__file__))
    run_script = os.path.join(script_dir, "run_isolated.sh")

    # 检查运行脚本是否存在
    if not os.path.exists(run_script):
        raise SandboxError(
            message="Run script not found", detail=f"Script not found: {run_script}"
        )

    # 确保运行脚本有执行权限
    try:
        os.chmod(run_script, 0o755)
    except Exception as e:
        DEFAULT_LOGGER.warning(f"Failed to set script permissions: {e}")

    # 构建命令
    cmd_list = [run_script, session_id, cmd]

    # 添加命令行参数
    if args:
        cmd_list.extend(args)

    # 异步执行命令
    try:
        process = await asyncio.create_subprocess_exec(
            *cmd_list,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=session_dir,
        )
    except Exception as e:
        raise SandboxError(message="Failed to start command execution", detail=str(e))

    try:
        stdout, stderr = await process.communicate()
    except Exception as e:
        raise SandboxError(message="Failed to execute command", detail=str(e))

    stdout_text = stdout.decode("utf-8") if stdout else ""
    # stderr_text = stderr.decode('utf-8') if stderr else ""

    # 解析输出
    output_lines = stdout_text.split("\n")
    exit_code = None
    stdout_lines = []
    stderr_lines = []
    current_section = None

    for line in output_lines:
        if line == "=== EXIT CODE ===":
            current_section = "exit_code"
        elif line == "=== STDOUT ===":
            current_section = "stdout"
        elif line == "=== STDERR ===":
            current_section = "stderr"
        elif current_section == "exit_code" and line.strip():
            try:
                exit_code = int(line)
            except ValueError:
                DEFAULT_LOGGER.warning(f"Invalid exit code format: {line}")
        elif current_section == "stdout":
            stdout_lines.append(line)
        elif current_section == "stderr":
            stderr_lines.append(line)

    return {
        "stdout": "\n".join(stdout_lines),
        "stderr": "\n".join(stderr_lines),
        "returncode": exit_code or process.returncode,
    }


@router.post("/execute/{session_id}")
@wrap_result
async def execute(session_id: str, request: ExecuteRequest):
    """
    执行命令

    Args:
        session_id: 会话 ID
        request: 执行命令请求参数
            - command: 要执行的命令
            - args: 命令行参数列表

    Returns:
        dict: 包含执行结果的响应
    """
    ensure_session_exists(session_id)
    return await execute_command(
        session_id=session_id, cmd=request.command, args=request.args or []
    )


@router.post("/execute_code/{session_id}")
@wrap_result
async def execute_code(session_id: str, request: ExecuteCodeRequest):
    """
    执行代码

    Args:
        session_id: 会话 ID
        request: 执行代码请求参数
            - code: 要执行的代码
            - filename: 可选的文件名，如果不提供则自动生成
            - args: 命令行参数列表
            - script_type: 脚本类型 (python 或 shell)
            - output_params: 输出参数列表

    Returns:
        dict: 包含执行结果的响应
    """
    ensure_session_exists(session_id)
    session_dir = get_session_dir(session_id)

    # 根据脚本类型确定默认扩展名
    if request.script_type == "python":
        default_ext = ".py"
    elif request.script_type == "shell":
        default_ext = ".sh"
    else:
        raise SandboxError(message="Unsupported script type")

    DEFAULT_LOGGER.info(f"request.output_params: {request.output_params}")

    # 生成或使用提供的文件名
    if request.filename:
        filename = request.filename
        if not filename.endswith(default_ext):
            filename = f"{filename}{default_ext}"
    else:
        filename = f"script_{int(time.time())}{default_ext}"

    # 如果指定数据变量，则需要组合输出的格，并追加在代码中，用 json 格式
    if request.output_params:
        if request.script_type == "python":
            # 生成临时文件名
            base_filename = filename.replace(".py", "")
            output_filename = f"{base_filename}_output_variables.json"

            output_code = f"""
import json
import os

def save_output_variables(output_params, output_file):
    output_data = {{}}
    
    for param_name in output_params:
        try:
            if param_name in globals():
                output_data[param_name] = globals()[param_name]
            # 如果变量不存在，直接跳过，不报错
        except Exception:
            # 如果获取变量信息时出错，跳过该变量
            pass
    
    # 将变量数据写入文件
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2, default=str)

# 使用字符串列表，避免NameError
param_names = [{', '.join([f'"{param}"' for param in request.output_params])}]

# 调用函数保存变量
output_file = "/workspace/{output_filename}"
save_output_variables(param_names, output_file)
"""
            request.code = f"{request.code}\n{output_code}"
            DEFAULT_LOGGER.info(f"output_code: {request.code}")
        elif request.script_type == "shell":
            pass

    # 保存代码到文件
    script_path = os.path.join(session_dir, filename)
    with open(script_path, "w", encoding="utf-8") as f:
        f.write(request.code)

    # 如果是 shell 脚本，添加执行权限
    if request.script_type == "shell":
        os.chmod(script_path, 0o755)

    # 执行脚本
    if request.script_type == "python":
        # 传递相对文件名，因为在容器内会话目录被映射到 /workspace
        result = await execute_command(
            session_id, PYTHON_COMMAND, [filename] + (request.args or [])
        )

        # 如果指定了输出参数，尝试读取临时文件
        if request.output_params:
            try:
                # 生成临时文件名
                base_filename = filename.replace(".py", "")
                output_filename = f"{base_filename}_output_variables.json"
                output_file_path = os.path.join(session_dir, output_filename)

                # 直接尝试读取文件，如果存在就读取，不存在就返回空字典
                if os.path.exists(output_file_path):
                    with open(output_file_path, "r", encoding="utf-8") as f:
                        output_variables = json.load(f)
                    result["output_variables"] = output_variables
                else:
                    result["output_variables"] = {}

                # 清理临时文件（无论是否存在都尝试删除）
                try:
                    os.remove(output_file_path)
                except FileNotFoundError:
                    pass  # 文件不存在时忽略错误

            except Exception as e:
                DEFAULT_LOGGER.warning(f"Failed to read output variables: {e}")
                result["output_variables"] = {}

        return result
    elif request.script_type == "shell":
        # 对于shell脚本，也使用相对文件名
        return await execute_command(session_id, filename, request.args or [])
    else:
        raise SandboxError(message="Unsupported script type")


@router.get("/files/{session_id}/{path:path}")
@wrap_result
async def list_files(
    session_id: str,
    path: str = "",
    recursive: bool = Query(False, description="是否递归浏览子目录"),
):
    """列出会话中的所有文件"""
    ensure_session_exists(session_id)
    session_dir = get_session_dir(session_id)

    # 使用 safe_join 安全地拼接路径（防止路径遍历攻击）
    try:
        target_dir = str(safe_join(session_dir, path)) if path else session_dir
    except ValueError as e:
        raise SandboxError(message="Invalid path", detail=str(e))

    files = []
    try:
        if recursive:
            # 递归遍历所有子目录
            for root, dirs, filenames in os.walk(target_dir):
                # 跳过日志文件
                dirs[:] = [d for d in dirs if d not in ("stdout.log", "stderr.log")]
                filenames[:] = [
                    f for f in filenames if f not in ("stdout.log", "stderr.log")
                ]

                for filename in filenames:
                    file_path = os.path.join(root, filename)
                    if os.path.isfile(file_path):
                        # 计算相对于会话目录的路径
                        rel_path = os.path.relpath(file_path, session_dir)
                        files.append(
                            {
                                "filename": rel_path,
                                "size": os.path.getsize(file_path),
                                "type": (
                                    filename.split(".")[-1]
                                    if "." in filename
                                    else "unknown"
                                ),
                            }
                        )
        else:
            # 非递归，只遍历当前目录
            for filename in os.listdir(target_dir):
                if filename in ("stdout.log", "stderr.log"):
                    continue
                file_path = os.path.join(target_dir, filename)
                if os.path.isfile(file_path):
                    # 如果有路径参数，需要包含相对路径
                    display_name = os.path.join(path, filename) if path else filename
                    files.append(
                        {
                            "filename": display_name,
                            "size": os.path.getsize(file_path),
                            "type": (
                                filename.split(".")[-1]
                                if "." in filename
                                else "unknown"
                            ),
                        }
                    )
    except Exception as e:
        raise SandboxError(message="Failed to list files", detail=str(e))

    return {"files": files}


@router.get("/files/preview/{session_id}/{filepath:path}")
@wrap_result
async def preview_file(
    session_id: str, filepath: str, sid: str = Query(..., description="会话验证ID")
):
    """
    预览文件

    Args:
        session_id: 会话 ID
        filepath: 文件路径（支持相对路径，如 "subdir/file.txt"）
        sid: 会话验证ID
    """
    # 验证会话权限
    if not validate_session_access(session_id, sid):
        raise SandboxError(message="Access denied: Invalid session ID")

    ensure_session_exists(session_id)
    session_dir = get_session_dir(session_id)

    # 使用 safe_join 安全地拼接路径（防止路径遍历攻击）
    try:
        file_path = str(safe_join(session_dir, filepath))
    except ValueError as e:
        raise SandboxError(message="Invalid file path", detail=str(e))

    # 只能预览 html, txt, md, json, xml, csv, png, jpg, jpeg, gif, bmp, webp, svg, ico
    # 从完整路径中提取扩展名
    file_ext = os.path.splitext(file_path)[1].lower().lstrip(".")
    if file_ext not in SUPPORTED_FILE_TYPES:
        raise SandboxError(message="File type not supported")
    if not os.path.exists(file_path):
        raise SandboxError(message="File not found")

    # 检查是否为文件（不是目录）
    if not os.path.isfile(file_path):
        raise SandboxError(message="Not a file")

    # 提取文件名（路径的最后一部分）用于预览
    display_filename = os.path.basename(filepath)

    return FileResponse(
        file_path,
        filename=display_filename,
    )


@router.get("/workspaces")
@wrap_result
async def list_workspaces():
    """列出所有工作区"""
    try:
        if not os.path.exists(WORKSPACE_LIST_FILE):
            return {"workspaces": {}}

        with open(WORKSPACE_LIST_FILE, "r") as f:
            content = f.read()
            if not content:
                return {"workspaces": {}}
            return {"workspaces": json.loads(content)}
    except Exception as e:
        raise SandboxError(message="Failed to list workspaces", detail=str(e))


@router.get("/readfile/{session_id}/{filepath:path}")
@wrap_result
async def read_file(
    session_id: str, filepath: str, offset: int = 0, buffer_size: int = 1024 * 4
):
    """
    分次读取文件内容

    Args:
        session_id: 会话 ID
        filepath: 文件路径（支持相对路径，如 "subdir/file.txt"）
        offset: 读取起始位置（字节）
        buffer_size: 读取缓冲区大小（字节）

    Returns:
        dict: 包含文件内容的响应
    """
    ensure_session_exists(session_id)
    session_dir = get_session_dir(session_id)

    # 使用 safe_join 安全地拼接路径（防止路径遍历攻击）
    try:
        file_path = str(safe_join(session_dir, filepath))
    except ValueError as e:
        raise SandboxError(message="Invalid file path", detail=str(e))

    if not os.path.exists(file_path):
        raise SandboxError(message="File not found")

    # 检查是否为文件（不是目录）
    if not os.path.isfile(file_path):
        raise SandboxError(message="Not a file")

    try:
        file_size = os.path.getsize(file_path)

        # 检查 offset 是否有效
        if offset < 0:
            raise SandboxError(message="Invalid offset")
        if offset >= file_size:
            return {"content": "", "offset": offset, "size": file_size, "is_eof": True}

        # 读取文件内容
        with open(file_path, "rb") as f:
            f.seek(offset)
            content = f.read(buffer_size)

            # 计算下一个 offset
            next_offset = offset + len(content)

            # 根据文件扩展名判断是否为文本文件
            text_extensions = {
                ".txt",
                ".py",
                ".js",
                ".html",
                ".css",
                ".json",
                ".xml",
                ".csv",
                ".md",
                ".sh",
                ".bash",
                ".zsh",
                ".fish",
                ".c",
                ".cpp",
                ".h",
                ".java",
                ".php",
                ".rb",
                ".go",
                ".rs",
                ".swift",
                ".kt",
                ".scala",
                ".sql",
                ".yaml",
                ".yml",
                ".toml",
                ".ini",
                ".cfg",
                ".conf",
                ".log",
            }

            # 从完整路径中提取文件名用于判断扩展名
            file_ext = os.path.splitext(file_path)[1].lower()
            is_text_file = file_ext in text_extensions

            if is_text_file:
                # 文本文件：尝试解码
                try:
                    text_content = content.decode("utf-8")
                    is_binary = False
                except UnicodeDecodeError:
                    # 如果UTF-8失败，尝试其他编码
                    for encoding in ["gbk", "iso-8859-1", "cp1252"]:
                        try:
                            text_content = content.decode(encoding, errors="replace")
                            is_binary = False
                            break
                        except UnicodeDecodeError:
                            continue
                    else:
                        # 所有编码都失败，当作二进制处理
                        text_content = base64.b64encode(content).decode("ascii")
                        is_binary = True
            else:
                # 二进制文件：base64编码
                text_content = base64.b64encode(content).decode("ascii")
                is_binary = True

            return {
                "content": text_content,
                "is_binary": is_binary,
                "offset": next_offset,
                "size": file_size,
                "is_eof": next_offset >= file_size,
            }
    except Exception as e:
        raise SandboxError(message="Failed to read file", detail=str(e))


# @router.get("/doc")
# async def get_api_doc() -> Dict[str, Any]:
#     """获取 OpenAPI 格式的 API 文档"""
#     try:
#         doc_path = os.path.join(os.path.dirname(__file__), "api_doc.yaml")
#         with open(doc_path, "r", encoding="utf-8") as f:
#             doc = yaml.safe_load(f)
#         return {"result": doc}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Failed to load API documentation: {str(e)}")


@router.post("/cleanup-all")
@wrap_result
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
                        ["pgrep", "-f", f"{PYTHON_COMMAND}.*{session_id}"],
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
                        ["pgrep", "-f", f"{PYTHON_COMMAND}.*{session_id}"],
                        capture_output=True,
                    ).returncode
                    == 0
                ):
                    subprocess.run(["pkill", "-f", f"{PYTHON_COMMAND}.*{session_id}"])
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


@router.get("/status/{session_id}")
@wrap_result
async def get_session_status(session_id: str) -> Dict[str, Any]:
    """
    获取会话状态

    Args:
        session_id: 会话 ID

    Returns:
        Dict[str, Any]: 包含会话状态信息的响应
    """
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

    return status.model_dump()


@router.post("/v2/execute_code")
@wrap_result_v2
async def execute_code_v2(request: ExecuteCodeRequestV2):
    """
    执行 Python Handler 代码 (V2版本)
    在安全沙箱环境中执行用户提供的 Python handler 代码

    Args:
        request: 执行代码请求参数

    Returns:
        执行结果，包含标准输出、标准错误、业务结果和性能指标
    """
    global executor
    if executor is None:
        raise HTTPException(
            status_code=503,
            detail={
                "error_code": "Sandbox.NotInitialized",
                "description": "Sandbox executor not initialized",
                "error_detail": "The sandbox executor has not been properly initialized",
                "solution": "Please check the sandbox initialization process",
            },
        )

    try:
        # 调用全局executor执行代码
        result = executor.invoke(
            handler_code=request.handler_code,
            event=request.event,
            context_kwargs=request.context,
        )

        # 构造响应结果
        response_data = {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "result": result.result,
            "metrics": {
                "duration_ms": result.metrics.duration_ms,
                "memory_peak_mb": result.metrics.memory_peak_mb,
                "cpu_time_ms": result.metrics.cpu_time_ms,
            },
        }

        return response_data

    except Exception as e:
        DEFAULT_LOGGER.error(f"Error executing code: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error_code": "Sandbox.ExecException",
                "description": "Handler execution exception",
                "error_detail": str(e),
                "solution": "Please check your handler code for errors",
            },
        )


def get_router() -> APIRouter:
    return router


def create_app() -> FastAPI:
    """创建 FastAPI 应用"""
    global app

    # 如果app已经创建，直接返回
    if app is not None:
        return app

    app = FastAPI(
        title="沙箱 API",
        description="用于安全运行 Python 代码的沙箱 API",
        version="1.0.0",
        # docs_url="/docs",  # Swagger UI 路径
        # redoc_url="/redoc",  # ReDoc 路径
        openapi_url="/api.json",  # OpenAPI JSON 路径
    )

    # 注册应用启动事件
    @app.on_event("startup")
    async def startup_event():
        """应用启动时初始化沙箱池"""
        await init_sandbox_pool()

    # 注册应用关闭事件
    @app.on_event("shutdown")
    async def shutdown_event():
        """应用关闭时释放沙箱池资源"""
        await shutdown_sandbox_pool()

    # 注册路由
    app.include_router(router)

    return app


def run(
    host: str = "0.0.0.0",
    port: int = 9101,
    workers: int = 1,
    log_level: str = "info",
    reload: bool = False,
    ssl_keyfile: Optional[str] = None,
    ssl_certfile: Optional[str] = None,
):
    """
    启动沙箱服务

    Args:
        host: 监听地址
        port: 监听端口
        workers: 工作进程数
        log_level: 日志级别
        reload: 是否启用热重载
        ssl_keyfile: SSL 密钥文件路径
        ssl_certfile: SSL 证书文件路径
    """
    # 检查 Bubblewrap 是否安装
    if not shutil.which("bwrap"):
        DEFAULT_LOGGER.error("Bubblewrap is not installed. Please install it first.")
        return

    # 检查运行脚本是否存在
    script_dir = Path(__file__).parent
    run_script = script_dir / "run_isolated.sh"
    if not run_script.exists():
        DEFAULT_LOGGER.error(f"Run script not found: {run_script}")
        return

    # 确保运行脚本有执行权限
    run_script.chmod(0o755)

    # 启动线程清理过期会话
    start_cleanup_task(WORKSPACE_LIST_FILE)

    # 创建应用
    app = create_app()

    # 启动服务
    DEFAULT_LOGGER.info(f"Starting sandbox service on {host}:{port}")
    uvicorn.run(
        app,
        host=host,
        port=port,
        workers=workers,
        log_level=log_level,
        reload=reload,
        ssl_keyfile=ssl_keyfile,
        ssl_certfile=ssl_certfile,
    )


async def init_sandbox_pool():
    """
    初始化沙箱池和全局executor

    Returns:
        LambdaSandboxExecutor: 全局executor实例
    """
    global executor

    # 如果已经初始化，则直接返回
    if executor is not None:
        return executor

    # 创建沙箱配置
    config = SandboxConfig(
        cpu_quota=2, memory_limit=32 * 1024, allow_network=True, max_task_count=50
    )

    # 创建异步沙箱池
    pool = AsyncSandboxPool(pool_size=2, config=config)

    # 启动池
    await pool.start()

    # 创建执行器
    executor = LambdaSandboxExecutor(pool=pool)


async def shutdown_sandbox_pool():
    """
    关闭沙箱池和全局executor
    """
    global executor

    if executor:
        # 获取池并关闭它
        pool = executor.pool
        await pool.shutdown()
        executor = None
