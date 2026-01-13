import aiohttp
from pathlib import Path
from typing import Optional, List, Dict, Any, Union
from sandbox_runtime.sdk.base import Sandbox
from sandbox_runtime.sdk.utils.common import safe_unescape
import json
from sandbox_runtime.utils.loggers import DEFAULT_LOGGER

URL_PREFIX = "/workspace/se/session"
DEFAULT_SESSION_SIZE = "50M"


class SandboxError(Exception):
    """沙箱操作异常基类"""

    def __init__(
        self,
        message: str,
        original_error: Optional[Exception] = None,
        context: Optional[Dict[str, Any]] = None,
    ):
        self.message = message
        self.original_error = original_error
        self.context = context or {}
        super().__init__(self.message)

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "message": self.message,
            "original_error": str(self.original_error),
            "context": self.context,
        }

    def __str__(self) -> str:
        """转换为字符串"""
        return json.dumps(self.to_dict(), indent=2)


class SharedEnvSandbox(Sandbox):
    """Shared Environment 沙箱实现"""

    def __init__(
        self,
        session_id: str,
        server_selector_type: str = "static",
        server_selector_params: Optional[Dict[str, Any]] = {},
        **kwargs,
    ):
        """
        初始化 Shared Environment 沙箱

        Args:
            session_id: 会话ID，必须提供
        """
        if not session_id:
            raise ValueError("session_id is required")

        if server_selector_params is None:
            server_selector_params = {}
        if kwargs is not None:
            server_selector_params.update(kwargs)

        super().__init__(
            session_id=session_id,
            server_selector_type=server_selector_type,
            server_selector_params=server_selector_params,
            **kwargs,
        )

    @staticmethod
    def _unwrap_result(response: Any) -> Any:
        """兼容处理服务端是否包 result 的返回结构。"""
        if isinstance(response, dict) and "result" in response:
            return response["result"]
        return response

    async def _request(
        self, method: str, path: str, **kwargs
    ) -> Dict[str, Any]:
        """
        发送请求到服务

        Args:
            method: HTTP 方法
            path: 请求路径
            **kwargs: 请求参数

        Returns:
            Dict[str, Any]: 响应数据
        """
        DEFAULT_LOGGER.debug(f"Making {method} request to {path}")

        # 如果有多个服务器，选择一个可用的服务器
        if self.server_selector:
            server = await self._select_server()
            if not server:
                raise SandboxError(
                    "No available server found",
                    context={"method": method, "path": path},
                )
            base_url = server
        else:
            base_url = "http://localhost:8899"

        url = f"{base_url.rstrip('/')}{path}"
        DEFAULT_LOGGER.debug(f"Full URL: {url}")

        # 设置超时：总超时300秒，连接超时10秒，读取超时300秒
        timeout = aiohttp.ClientTimeout(total=300, connect=10, sock_read=300)

        try:
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.request(method, url, **kwargs) as response:
                    if response.status >= 400:
                        err_msg = await response.json()
                        error_msg = (
                            f"HTTP request failed: {method} {url} - "
                            f"Status: {response.status}, Message: {err_msg}"
                        )
                        DEFAULT_LOGGER.error(error_msg)
                        raise SandboxError(
                            error_msg,
                            context={
                                "method": method,
                                "url": url,
                                "status": response.status,
                                "err_msg": err_msg,
                            },
                        )
                    result = await response.json()
                    return result
        except SandboxError:
            raise
        except aiohttp.ServerTimeoutError as e:
            error_msg = f"Request timeout: {method} {url} - Timeout: 30s"
            DEFAULT_LOGGER.error(error_msg)
            raise SandboxError(
                error_msg,
                original_error=e,
                context={"method": method, "url": url, "timeout": 30},
            )
        except aiohttp.ClientError as e:
            error_msg = f"Network request failed: {method} {url} - {e}"
            DEFAULT_LOGGER.error(error_msg)
            raise SandboxError(
                error_msg,
                original_error=e,
                context={"method": method, "url": url},
            )
        except Exception as e:
            error_msg = f"Request failed: {method} {url} - {e}"
            DEFAULT_LOGGER.error(error_msg)
            raise SandboxError(
                error_msg,
                original_error=e,
                context={"method": method, "url": url},
            )

    async def create_session(self, size: str = DEFAULT_SESSION_SIZE) -> str:
        """创建会话

        一般不需要手动创建会话，会话会自动创建

        Args:
            size: 会话大小

        Returns:
            str: 会话ID
        """
        DEFAULT_LOGGER.info(f"Creating session with size={size}")
        try:
            result = await self._request(
                "POST",
                f"/workspace/se/session/{self.session_id}",
                json={"size": size},
            )
            unwrapped = self._unwrap_result(result)
            DEFAULT_LOGGER.info(f"Session created successfully: {unwrapped}")
            return unwrapped
        except SandboxError:
            raise
        except Exception as e:
            error_msg = f"Failed to create session: {e}"
            DEFAULT_LOGGER.error(error_msg)
            raise SandboxError(
                error_msg,
                original_error=e,
                context={"session_id": self.session_id, "size": size},
            )

    async def delete_session(self) -> bool:
        """删除会话"""
        DEFAULT_LOGGER.info(f"Deleting session: {self.session_id}")
        try:
            await self._request(
                "DELETE", f"/workspace/se/session/{self.session_id}"
            )
            DEFAULT_LOGGER.info("Session deleted successfully")
            return True
        except SandboxError:
            raise
        except Exception as e:
            error_msg = f"Failed to delete session: {e}"
            DEFAULT_LOGGER.error(error_msg)
            raise SandboxError(
                error_msg,
                original_error=e,
                context={"session_id": self.session_id},
            )

    async def upload_file(
        self,
        file_path: Union[str, Path],
        target_filename: Optional[str] = None,
    ) -> Dict[str, Any]:
        """上传文件"""
        file_path = Path(file_path)
        target_filename = target_filename or file_path.name

        DEFAULT_LOGGER.info(
            "Uploading file: %s -> %s",
            file_path,
            target_filename,
        )

        if not file_path.exists():
            error_msg = f"File not found: {file_path}"
            DEFAULT_LOGGER.error(error_msg)
            raise SandboxError(
                error_msg,
                context={
                    "file_path": str(file_path),
                    "target_filename": target_filename,
                    "session_id": self.session_id,
                },
            )

        try:
            with open(file_path, "rb") as f:
                data = aiohttp.FormData()
                data.add_field("file", f, filename=target_filename)

                result = await self._request(
                    "POST",
                    f"/workspace/se/upload/{self.session_id}",
                    data=data,
                )
                unwrapped = self._unwrap_result(result)
                DEFAULT_LOGGER.info(f"File uploaded successfully: {unwrapped}")
                return unwrapped
        except SandboxError:
            raise
        except Exception as e:
            error_msg = f"Failed to upload file: {e}"
            DEFAULT_LOGGER.error(error_msg)
            raise SandboxError(
                error_msg,
                original_error=e,
                context={
                    "file_path": str(file_path),
                    "target_filename": target_filename,
                    "session_id": self.session_id,
                },
            )

    async def download_file(
        self, filename: str, target_path: Union[str, Path]
    ) -> bool:
        """下载文件"""
        target_path = Path(target_path)

        DEFAULT_LOGGER.info(f"Downloading file: {filename} -> {target_path}")

        try:
            target_path.parent.mkdir(parents=True, exist_ok=True)

            # 如果有多个服务器，选择一个可用的服务器
            if self.server_selector:
                server = await self._select_server()
                if not server:
                    raise SandboxError(
                        "No available server found",
                        context={
                            "filename": filename,
                            "target_path": str(target_path),
                        },
                    )
                base_url = server
            else:
                base_url = "http://localhost:8899"

            url = (
                f"{base_url.rstrip('/')}/workspace/se/download/"
                f"{self.session_id}/{filename}"
            )

            # 设置超时：总超时300秒，连接超时10秒，读取超时300秒
            timeout = aiohttp.ClientTimeout(
                total=300, connect=10, sock_read=300
            )

            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(url) as response:
                    response.raise_for_status()
                    with open(target_path, "wb") as f:
                        f.write(await response.read())

            DEFAULT_LOGGER.info(f"File downloaded successfully: {target_path}")
            return True
        except aiohttp.ServerTimeoutError as e:
            error_msg = f"Download timeout: {filename} - Timeout: 30s"
            DEFAULT_LOGGER.error(error_msg)
            raise SandboxError(
                error_msg,
                original_error=e,
                context={
                    "filename": filename,
                    "target_path": str(target_path),
                    "session_id": self.session_id,
                    "timeout": 30,
                },
            )
        except SandboxError:
            raise
        except Exception as e:
            error_msg = f"Failed to download file: {e}"
            DEFAULT_LOGGER.error(error_msg)
            raise SandboxError(
                error_msg,
                original_error=e,
                context={
                    "filename": filename,
                    "target_path": str(target_path),
                    "session_id": self.session_id,
                },
            )

    async def create_file(
        self, content: str, filename: str, mode: int = 0o644
    ) -> Dict[str, Any]:
        """创建文件"""
        DEFAULT_LOGGER.info(f"Creating file: {filename} (mode={oct(mode)})")
        DEFAULT_LOGGER.debug(f"File content length: {len(content)} characters")

        try:
            result = await self._request(
                "POST",
                f"/workspace/se/create/{self.session_id}",
                json={"content": content, "filename": filename, "mode": mode},
            )
            unwrapped = self._unwrap_result(result)
            DEFAULT_LOGGER.info(f"File created successfully: {unwrapped}")
            return unwrapped
        except SandboxError:
            raise
        except Exception as e:
            error_msg = f"Failed to create file: {e}"
            DEFAULT_LOGGER.error(error_msg)
            raise SandboxError(
                error_msg,
                original_error=e,
                context={
                    "filename": filename,
                    "mode": mode,
                    "content_length": len(content),
                    "session_id": self.session_id,
                },
            )

    async def execute(self, command: str, *args: str) -> Dict[str, Any]:
        """执行文件

        Args:
            command: 要执行的命令
            args: 命令行参数列表, 可变参数

        Returns:
            Dict[str, Any]: 包含执行结果的响应
        """
        args_list = list(args) or []
        DEFAULT_LOGGER.info(f"Executing command: {command} {args_list}")

        try:
            result = await self._request(
                "POST",
                f"/workspace/se/execute/{self.session_id}",
                json={"command": command, "args": args_list},
            )
            unwrapped = self._unwrap_result(result)
            DEFAULT_LOGGER.info(
                "Command executed successfully, return code: %s",
                unwrapped.get("returncode", "unknown"),
            )
            DEFAULT_LOGGER.debug(
                "Command stdout: %s...",
                unwrapped.get("stdout", "")[:200],
            )
            return unwrapped
        except SandboxError:
            raise
        except Exception as e:
            error_msg = f"Failed to execute command: {e}"
            DEFAULT_LOGGER.error(error_msg)
            raise SandboxError(
                error_msg,
                original_error=e,
                context={
                    "command": command,
                    "args": args_list,
                    "session_id": self.session_id,
                },
            )

    async def execute_code(
        self,
        code: str,
        filename: Optional[str] = None,
        args: Optional[List[str]] = None,
        script_type: str = "python",
        output_params: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """执行代码"""

        DEFAULT_LOGGER.info(
            f"Executing {script_type} code (filename={filename}, args={args})"
        )
        DEFAULT_LOGGER.debug(f"Code length: {len(code)} characters")
        if output_params:
            DEFAULT_LOGGER.info(f"Output parameters: {output_params}")

        try:
            code = safe_unescape(code)
            result = await self._request(
                "POST",
                f"/workspace/se/execute_code/{self.session_id}",
                json={
                    "code": code,
                    "filename": filename,
                    "args": args or [],
                    "script_type": script_type,
                    "output_params": output_params or [],
                },
            )
            unwrapped = self._unwrap_result(result)
            DEFAULT_LOGGER.info(
                "Code executed successfully, return code: %s",
                unwrapped.get("returncode", "unknown"),
            )
            DEFAULT_LOGGER.debug(
                "Code stdout: %s...",
                unwrapped.get("stdout", "")[:200],
            )

            if output_params and "output_variables" in unwrapped:
                DEFAULT_LOGGER.info(
                    "Output variables: %s",
                    list(unwrapped["output_variables"].keys()),
                )

            return unwrapped
        except SandboxError:
            raise
        except Exception as e:
            error_msg = f"Failed to execute code: {e}"
            DEFAULT_LOGGER.error(error_msg)
            raise SandboxError(
                error_msg,
                original_error=e,
                context={
                    "filename": filename,
                    "args": args,
                    "script_type": script_type,
                    "output_params": output_params,
                    "code_length": len(code),
                    "session_id": self.session_id,
                },
            )

    async def list_files(
        self, directory: str = "", recursive: bool = False
    ) -> List[Dict[str, Any]]:
        """列出文件"""
        DEFAULT_LOGGER.info(
            "Listing files in directory: '%s' (recursive: %s)",
            directory,
            recursive,
        )

        try:
            # 构建请求路径
            path_param = directory if directory else ""
            url = f"/workspace/se/files/{self.session_id}"
            if path_param:
                url += f"/{path_param}"

            # 构建查询参数
            params = {}
            if recursive:
                params["recursive"] = "false"

            result = await self._request("GET", url, params=params)
            unwrapped = self._unwrap_result(result)
            files = unwrapped["files"]
            DEFAULT_LOGGER.info(f"Found {len(files)} files")
            DEFAULT_LOGGER.debug(
                "Files: %s", [f["filename"] for f in files]
            )
            return files
        except SandboxError:
            raise
        except Exception as e:
            error_msg = f"Failed to list files: {e}"
            DEFAULT_LOGGER.error(error_msg)
            raise SandboxError(
                error_msg,
                original_error=e,
                context={"session_id": self.session_id},
            )

    async def read_file(
        self, filename: str, offset: int = 0, buffer_size: int = 4096
    ) -> Dict[str, Any]:
        """读取文件"""
        DEFAULT_LOGGER.info(
            "Reading file: %s (offset=%s, buffer_size=%s)",
            filename,
            offset,
            buffer_size,
        )

        try:
            result = await self._request(
                "GET",
                f"/workspace/se/readfile/{self.session_id}/{filename}",
                params={"offset": offset, "buffer_size": buffer_size},
            )
            content = self._unwrap_result(result)
            DEFAULT_LOGGER.info(
                "File read successfully, content length: %s",
                len(content.get("content", "")),
            )
            return content
        except SandboxError:
            raise
        except Exception as e:
            error_msg = f"Failed to read file: {e}"
            DEFAULT_LOGGER.error(error_msg)
            raise SandboxError(
                error_msg,
                original_error=e,
                context={
                    "filename": filename,
                    "offset": offset,
                    "buffer_size": buffer_size,
                    "session_id": self.session_id,
                },
            )

    async def download_from_efast(
        self,
        file_params: List[Dict[str, Any]],
        save_path: Optional[str] = "",
        efast_url: Optional[str] = "",
        token: Optional[str] = "",
        timeout: Optional[int] = 300,
    ) -> bool:
        """从 EFAST 下载文件

        Args:
            file_params: 下载文件参数, 结构示例:
            [
                {
                    'docid': 'gns://.../A5AAE8168BAF4C49A7E10FFF800DB2A2',
                    'rev': '9EB18A32ADBB466991396E4D5942E72D',
                    'savename': '新能源汽车产业分析.docx'
                }
            ]
            save_path: 保存路径, 可选, 默认保存到会话目录
            efast_url: EFAST 地址, 可选, 默认使用默认URL
            token: EFAST 认证令牌, 可选, 默认使用默认令牌
            timeout: 超时时间, 可选, 默认使用默认超时时间

        Returns:
            bool: 是否下载成功
        """

        payload = {
            "file_params": file_params,
            "save_path": save_path,
            "efast_url": efast_url,
            "token": token,
            "timeout": timeout,
        }

        DEFAULT_LOGGER.info(f"Downloading files from EFAST: {payload}")

        try:
            result = await self._request(
                "POST",
                f"/workspace/se/download_from_efast/{self.session_id}",
                json=payload,
            )
            unwrapped = self._unwrap_result(result)
            DEFAULT_LOGGER.info(f"Files downloaded successfully: {unwrapped}")
            return unwrapped
        except SandboxError:
            raise
        except Exception as e:
            error_msg = f"Failed to download files from EFAST: {e}"
            DEFAULT_LOGGER.error(error_msg)
            raise SandboxError(
                error_msg,
                original_error=e,
                context={
                    "file_params": file_params,
                    "session_id": self.session_id,
                },
            )

    async def get_status(self) -> Dict[str, Any]:
        """获取会话状态"""
        DEFAULT_LOGGER.info("Getting session status")

        try:
            result = await self._request(
                "GET", f"/workspace/se/status/{self.session_id}"
            )
            DEFAULT_LOGGER.info("Session status retrieved successfully")
            return self._unwrap_result(result)
        except SandboxError:
            raise
        except Exception as e:
            error_msg = f"Failed to get session status: {e}"
            DEFAULT_LOGGER.error(error_msg)
            raise SandboxError(
                error_msg,
                original_error=e,
                context={"session_id": self.session_id},
            )

    async def close(self):
        """关闭会话
        清理工作区
        """
        DEFAULT_LOGGER.info("Closing sandbox session and cleaning up")

        try:
            await self.delete_session()
            DEFAULT_LOGGER.info("Session deleted successfully")
        except Exception as e:
            DEFAULT_LOGGER.error(f"Failed to delete session: {e}")
