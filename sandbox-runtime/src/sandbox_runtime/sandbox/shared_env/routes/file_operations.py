from fastapi import APIRouter, File, UploadFile, HTTPException, Query, Form
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import shutil
import json
import base64
from pathlib import Path

from sandbox_runtime.utils.loggers import DEFAULT_LOGGER
from sandbox_runtime.errors import SandboxError
from sandbox_runtime.utils.common import safe_join
from sandbox_runtime.sandbox.shared_env.app.config import SUPPORTED_FILE_TYPES
from sandbox_runtime.sandbox.shared_env.utils.session_utils import (
    get_session_dir,
    ensure_session_exists,
)

router = APIRouter()


class CreateFileRequest(BaseModel):
    content: str
    filename: str
    mode: Optional[int] = 0o644  # Default file permissions


class DownloadFromEFASTRequest(BaseModel):
    file_params: List[dict]
    efast_url: Optional[str] = ""
    save_path: Optional[str] = ""
    token: Optional[str] = ""
    timeout: Optional[int] = None


@router.post("/upload/{session_id}")
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
    from fastapi.responses import FileResponse

    return FileResponse(
        file_path, filename=display_filename, media_type="application/octet-stream"
    )


@router.post("/download_from_efast/{session_id}")
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

    from sandbox_runtime.utils.efast_downloader import EFASTDownloader, DownloadItem

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


@router.get("/files/{session_id}/{path:path}")
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


@router.get("/files/preview/{session_id}/{filepath:path}")
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

    from fastapi.responses import FileResponse

    return FileResponse(
        file_path,
        filename=display_filename,
    )


@router.get("/readfile/{session_id}/{filepath:path}")
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


@router.get("/workspaces")
async def list_workspaces():
    """列出所有工作区"""
    from ..app.config import WORKSPACE_LIST_FILE

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
