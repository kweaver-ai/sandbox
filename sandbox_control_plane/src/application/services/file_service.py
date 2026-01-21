"""
文件应用服务

编排文件上传下载相关的用例。
"""
from typing import Dict, List, Any

from src.domain.repositories.session_repository import ISessionRepository
from src.domain.services.storage import IStorageService
from src.shared.errors.domain import NotFoundError, ValidationError


class FileService:
    """
    文件应用服务

    编排文件上传、下载等用例。
    """

    def __init__(
        self,
        session_repo: ISessionRepository,
        storage_service: IStorageService,
    ):
        self._session_repo = session_repo
        self._storage_service = storage_service

    async def upload_file(
        self,
        session_id: str,
        path: str,
        content: bytes,
        content_type: str = "application/octet-stream"
    ) -> str:
        """
        上传文件用例

        流程：
        1. 验证会话存在且运行中
        2. 验证路径格式
        3. 上传到存储
        4. 返回文件路径
        """
        # 1. 验证会话存在且运行中
        session = await self._session_repo.find_by_id(session_id)
        if not session:
            raise NotFoundError(f"Session not found: {session_id}")

        if not session.is_active():
            raise ValidationError(f"Session is not active: {session_id}")

        # 2. 验证路径格式
        if not path or path.startswith("/"):
            raise ValidationError("Invalid file path")

        # 3. 上传到存储
        s3_path = f"{session.workspace_path}/{path}"
        await self._storage_service.upload_file(
            s3_path=s3_path,
            content=content,
            content_type=content_type
        )

        return path

    async def download_file(self, session_id: str, path: str) -> Dict:
        """
        下载文件用例

        流程：
        1. 验证会话存在
        2. 验证文件存在
        3. 返回文件内容或预签名 URL
        """
        # 1. 验证会话存在
        session = await self._session_repo.find_by_id(session_id)
        if not session:
            raise NotFoundError(f"Session not found: {session_id}")

        # 2. 验证文件存在
        s3_path = f"{session.workspace_path}/{path}"
        file_exists = await self._storage_service.file_exists(s3_path)
        if not file_exists:
            raise NotFoundError(f"File not found: {path}")

        # 3. 获取文件
        file_info = await self._storage_service.get_file_info(s3_path)

        # 小文件直接返回内容，大文件返回预签名 URL
        if file_info["size"] < 10 * 1024 * 1024:  # 10MB
            content = await self._storage_service.download_file(s3_path)
            return {
                "content": content,
                "content_type": file_info.get("content_type", "application/octet-stream"),
                "size": file_info["size"],
            }
        else:
            presigned_url = await self._storage_service.generate_presigned_url(s3_path)
            return {
                "presigned_url": presigned_url,
                "size": file_info["size"],
            }

    async def list_files(
        self,
        session_id: str,
        limit: int = 1000
    ) -> List[Dict[str, Any]]:
        """
        列出 session 下的所有文件

        Args:
            session_id: Session ID
            limit: 最大返回文件数

        Returns:
            文件列表，每个文件包含 name, size, modified_time 等
        """
        # 1. 验证 session 存在
        session = await self._session_repo.find_by_id(session_id)
        if not session:
            raise NotFoundError(f"Session not found: {session_id}")

        # 2. 构建 session 的 S3 路径前缀
        # workspace_path 格式: s3://bucket/sessions/sess_xxx/
        # 或: sessions/sess_xxx/
        prefix = session.workspace_path.rstrip("/")

        # 3. 调用 storage.list_files()
        files = await self._storage_service.list_files(prefix, limit)

        # 4. 处理返回结果，去除前缀
        result = []
        prefix_len = len(prefix) + 1  # +1 for the leading slash
        for file in files:
            # key 格式: "sessions/sess_xxx/file.csv" 或 "sessions/sess_xxx/subdir/file.csv"
            # 提取相对文件名
            key = file["key"]
            if key.startswith(prefix):
                relative_name = key[prefix_len:].lstrip("/")
            else:
                # 如果 key 不以 prefix 开头，直接使用
                relative_name = key

            result.append({
                "name": relative_name,
                "size": file["size"],
                "modified_time": file.get("last_modified"),
                "etag": file.get("etag")
            })

        return result
