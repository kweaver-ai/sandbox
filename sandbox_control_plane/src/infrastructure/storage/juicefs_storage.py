"""
JuiceFS 存储实现 - 通过 FUSE 挂载点直接写入文件

架构说明：
1. Control Plane 通过 JuiceFS FUSE 挂载点直接写入文件
2. JuiceFS 自动将文件同步到 MinIO（后台）
3. Executor 容器通过 hostPath 卷挂载访问文件

这种方式的优势：
- 文件立即可见于 executor 容器（无延迟）
- JuiceFS 处理元数据管理和数据同步
- 避免了 S3 API 上传导致的可见性问题
"""
import asyncio
import logging
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

import boto3
from botocore.exceptions import ClientError

from src.domain.services.storage import IStorageService
from src.infrastructure.config.settings import get_settings

logger = logging.getLogger(__name__)


class JuiceFSStorage(IStorageService):
    """
    JuiceFS 存储实现 - 通过 FUSE 挂载点直接写入

    Control Plane 写入文件到 JuiceFS FUSE 挂载点。
    JuiceFS 处理元数据存储到 MariaDB 和数据同步到 MinIO。
    Executor 通过 hostPath 挂载点直接访问文件系统。

    架构：
    ┌─────────────────┐     write       ┌──────────────────┐
    │ Control Plane   │────────────────▶│  JuiceFS Mount   │
    │                 │                 │  /mnt/jfs/...    │
    └─────────────────┘                 └────────┬─────────┘
                                                 │ JuiceFS sync
                                                 ▼
                                          ┌──────────────┐
                                          │  MinIO S3    │
                                          │              │
                                          └──────────────┘
                                                 ▲
                                                 │ hostPath volume
                                                 │
    ┌─────────────────┐     read        ┌────────┴───────┐
    │   Executor      │◀────────────────│  Host Path     │
    │                 │                 │  /var/jfs/...  │
    └─────────────────┘                 └────────────────┘
    """

    def __init__(self):
        settings = get_settings()

        # FUSE 挂载点路径（容器内）
        self._mount_path = Path(settings.juicefs_container_mount_path)
        self._mount_path_str = str(self._mount_path)

        # 保留 S3 客户端用于下载操作（如果需要）
        self._s3_client = boto3.client(
            's3',
            endpoint_url=settings.s3_endpoint_url,
            aws_access_key_id=settings.s3_access_key_id,
            aws_secret_access_key=settings.s3_secret_access_key,
            region_name=settings.s3_region,
        )
        self._bucket = settings.s3_bucket

        logger.info(f"JuiceFS storage initialized via FUSE mount: {self._mount_path_str}")

    def _normalize_key(self, s3_path: str) -> str:
        """
        将 S3 路径转换为文件系统路径

        Args:
            s3_path: S3 路径，如 "s3://bucket/sessions/sess_001/file.txt"
                    或 "sessions/sess_001/file.txt"

        Returns:
            相对于挂载点的文件路径
        """
        # 移除 s3://bucket/ 前缀
        if s3_path.startswith("s3://"):
            parsed = urlparse(s3_path)
            # 如果 netloc 包含 bucket 名称，从 path 中提取 key
            if parsed.netloc == self._bucket:
                return parsed.path.lstrip('/')
            # 否则返回完整路径（去掉 s3://）
            return s3_path.replace(f"s3://{self._bucket}/", "").lstrip('/')

        # 如果已经是相对路径，直接使用
        return s3_path.lstrip('/')

    async def initialize(self) -> None:
        """验证 FUSE 挂载点"""
        try:
            if not self._mount_path.exists():
                raise FileNotFoundError(f"JuiceFS mount point not found: {self._mount_path_str}")

            # 尝试列出目录内容
            await asyncio.to_thread(lambda: list(self._mount_path.iterdir()))

            logger.info(f"JuiceFS storage initialized: mount={self._mount_path_str}")
        except Exception as e:
            logger.error(f"JuiceFS mount point check failed: {e}")
            raise

    async def upload_file(self, s3_path: str, content: bytes, content_type: str = "application/octet-stream") -> None:
        """上传文件到 JuiceFS（通过 FUSE 挂载点）"""
        import os

        key = self._normalize_key(s3_path)
        file_path = self._mount_path / key

        logger.info(f"[JuiceFS] Writing to FUSE mount: key={key}, size={len(content)}")

        def _write():
            # 确保父目录存在
            file_path.parent.mkdir(parents=True, exist_ok=True)

            # 使用原子写入模式：先写临时文件，然后重命名
            # 这确保写入完整性并避免部分写入
            temp_path = file_path.with_suffix(file_path.suffix + '.tmp')

            try:
                # 写入临时文件
                with open(temp_path, 'wb') as f:
                    f.write(content)
                    # 强制刷新到磁盘（FUSE 将其传递给 JuiceFS 客户端）
                    f.flush()
                    os.fsync(f.fileno())

                # 原子重命名
                temp_path.replace(file_path)

                # 再次 fsync 父目录以确保元数据已写入
                # 这对于 FUSE 文件系统特别重要
                try:
                    parent_dir = open(file_path.parent, 'r')
                    os.fsync(parent_dir.fileno())
                    parent_dir.close()
                except Exception as e:
                    logger.warning(f"[JuiceFS] Parent directory sync failed: {e}")

                logger.info(f"[JuiceFS] File written and synced: {file_path}")

            except Exception as e:
                # 清理临时文件
                if temp_path.exists():
                    temp_path.unlink()
                raise

        await asyncio.to_thread(_write)
        logger.info(f"[JuiceFS] Upload complete: {file_path}, size={len(content)}")

    async def download_file(self, s3_path: str) -> bytes:
        """从 JuiceFS 挂载点下载文件"""
        key = self._normalize_key(s3_path)
        file_path = self._mount_path / key

        def _read():
            if not file_path.exists():
                raise FileNotFoundError(f"File not found in JuiceFS mount: {file_path}")
            return file_path.read_bytes()

        return await asyncio.to_thread(_read)

    async def file_exists(self, s3_path: str) -> bool:
        """检查文件是否存在"""
        key = self._normalize_key(s3_path)
        file_path = self._mount_path / key

        def _exists():
            return file_path.exists() and file_path.is_file()

        return await asyncio.to_thread(_exists)

    async def get_file_info(self, s3_path: str) -> dict:
        """获取文件元数据"""
        key = self._normalize_key(s3_path)
        file_path = self._mount_path / key

        def _get_info():
            if not file_path.exists():
                raise FileNotFoundError(f"File not found in JuiceFS mount: {file_path}")

            stat = file_path.stat()
            return {
                "size": stat.st_size,
                "content_type": "application/octet-stream",  # FUSE 不存储 content-type
                "last_modified": stat.st_mtime,
                "etag": str(int(stat.st_mtime)),  # 使用 mtime 作为简单的 etag
            }

        return await asyncio.to_thread(_get_info)

    async def generate_presigned_url(self, s3_path: str, expiration_seconds: int = 3600) -> str:
        """生成预签名 URL（通过 S3 API）"""
        key = self._normalize_key(s3_path)

        return await asyncio.to_thread(
            self._s3_client.generate_presigned_url,
            'get_object',
            Params={'Bucket': self._bucket, 'Key': key},
            ExpiresIn=expiration_seconds
        )

    async def delete_file(self, s3_path: str) -> None:
        """删除文件"""
        key = self._normalize_key(s3_path)
        file_path = self._mount_path / key

        def _delete():
            if file_path.exists():
                file_path.unlink()

        await asyncio.to_thread(_delete)

    async def delete_prefix(self, prefix: str) -> int:
        """删除指定前缀的所有文件"""
        key_prefix = self._normalize_key(prefix)
        prefix_path = self._mount_path / key_prefix

        def _delete_recursive():
            if not prefix_path.exists():
                return 0

            count = 0
            for item in prefix_path.rglob('*'):
                if item.is_file():
                    item.unlink()
                    count += 1
                elif item.is_dir() and not any(item.iterdir()):
                    item.rmdir()

            # 删除空目录
            if prefix_path.is_dir() and not any(prefix_path.iterdir()):
                prefix_path.rmdir()

            return count

        return await asyncio.to_thread(_delete_recursive)

    async def list_files(self, prefix: str, limit: int = 1000) -> list:
        """列出文件"""
        key_prefix = self._normalize_key(prefix)
        prefix_path = self._mount_path / key_prefix

        def _list():
            files = []
            if not prefix_path.exists():
                return files

            for item in prefix_path.rglob('*'):
                if item.is_file():
                    files.append({
                        'key': str(item.relative_to(self._mount_path)),
                        'size': item.stat().st_size
                    })
                    if len(files) >= limit:
                        break

            return files

        return await asyncio.to_thread(_list)
