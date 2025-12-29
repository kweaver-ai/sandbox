from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any, Union
from pathlib import Path
import uuid
from sandbox_runtime.sdk.utils.server_select import (
    ServerSelector,
    StaticServiceDiscovery,
    K8sServiceDiscovery,
)
from enum import Enum
import logging


class ServerSelectorType(Enum):
    STATIC = "static"
    K8S = "k8s"


SELECTOR_TYPE_MAP = {
    ServerSelectorType.STATIC.value: StaticServiceDiscovery,
    ServerSelectorType.K8S.value: K8sServiceDiscovery,
}

DEFAULT_SESSION_SIZE = "50M"


class Sandbox(ABC):
    """沙箱环境基类
    server_selector_type: 服务器选择器类型，如果为空，则使用静态服务器选择器
    server_selector_params: 服务器选择器参数，如果为空，则使用默认参数
    server_selector: 服务器选择器实例，如果为空，则使用默认服务器选择器
    """

    def __init__(
        self,
        session_id: Optional[str] = "",
        server_selector_type: str = ServerSelectorType.STATIC.value,
        server_selector_params: Optional[Dict[str, Any]] = {},
        server_selector: Optional[ServerSelector] = None,
        **kwargs,
    ):
        """
        初始化沙箱环境

        Args:
            session_id: 会话ID，如果不提供则自动生成
            service_discovery: 服务发现实例，用于获取服务器列表
        """
        self.session_id = session_id

        # 设置日志记录器
        self.logger = logging.getLogger(
            f"sandbox_runtime.sdk.{self.__class__.__name__}"
        )

        self.logger.info(
            f"Initializing {self.__class__.__name__} with session_id={session_id}"
        )

        if server_selector:
            self.server_selector = server_selector
            self.logger.debug("Using provided server selector")
        else:
            select_class = SELECTOR_TYPE_MAP.get(
                server_selector_type, StaticServiceDiscovery
            )
            self.server_selector = ServerSelector(
                id_to_select=session_id or "",
                service_discovery=select_class(**server_selector_params or {}),
                selector_type=server_selector_type,
            )
            self.logger.debug(
                f"Created server selector with type={server_selector_type}"
            )

        self._current_server: Optional[str] = None
        self.logger.info(f"{self.__class__.__name__} initialized successfully")

    async def _select_server(self) -> Optional[str]:
        """
        选择一个服务器

        Returns:
            Optional[str]: 选中的服务器URL
        """
        self.logger.debug("Selecting server...")

        if not self.server_selector:
            self.logger.warning("No server selector available")
            return None

        # 选择服务器
        server = await self.server_selector.select_server()
        if server:
            self._current_server = server
            self.logger.info(f"Selected server: {server}")
        else:
            self.logger.warning("No server selected")

        return server

    @property
    def current_server(self) -> Optional[str]:
        """获取当前使用的服务器URL"""
        return self._current_server

    @abstractmethod
    async def create_session(self, size: str = DEFAULT_SESSION_SIZE) -> str:
        """
        创建会话

        Args:
            size: 会话大小

        Returns:
            str: 会话ID
        """
        raise NotImplementedError("create_session is temporarily disabled")

    @abstractmethod
    async def delete_session(self) -> bool:
        """
        删除会话

        Returns:
            bool: 是否成功
        """
        pass

    @abstractmethod
    async def upload_file(
        self, file_path: Union[str, Path], target_filename: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        上传文件

        Args:
            file_path: 本地文件路径
            target_filename: 目标文件名，如果不提供则使用原文件名

        Returns:
            Dict[str, Any]: 上传结果
        """
        pass

    @abstractmethod
    async def download_file(self, filename: str, target_path: Union[str, Path]) -> bool:
        """
        下载文件

        Args:
            filename: 文件名
            target_path: 本地保存路径

        Returns:
            bool: 是否成功
        """
        pass

    @abstractmethod
    async def create_file(
        self, content: str, filename: str, mode: int = 0o644
    ) -> Dict[str, Any]:
        """
        创建文件

        Args:
            content: 文件内容
            filename: 文件名
            mode: 文件权限

        Returns:
            Dict[str, Any]: 创建结果
        """
        pass

    @abstractmethod
    async def execute(
        self, filename: str, args: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        执行文件

        Args:
            filename: 文件名
            args: 命令行参数

        Returns:
            Dict[str, Any]: 执行结果
        """
        pass

    @abstractmethod
    async def execute_code(
        self,
        code: str,
        filename: Optional[str] = None,
        args: Optional[List[str]] = None,
        script_type: str = "python",
    ) -> Dict[str, Any]:
        """
        执行代码

        Args:
            code: 代码内容
            filename: 文件名，如果不提供则自动生成
            args: 命令行参数
            script_type: 脚本类型 (python 或 shell)

        Returns:
            Dict[str, Any]: 执行结果
        """
        pass

    @abstractmethod
    async def list_files(
        self, directory: str = "", recursive: bool = False
    ) -> List[Dict[str, Any]]:
        """
        列出文件

        Args:
            directory (str): 要浏览的目录路径，默认为根目录
            recursive (bool): 是否递归浏览子目录，默认为False

        Returns:
            List[Dict[str, Any]]: 文件列表
        """
        pass

    @abstractmethod
    async def read_file(
        self, filename: str, offset: int = 0, buffer_size: int = 1024
    ) -> Dict[str, Any]:
        """
        读取文件

        Args:
            filename: 文件名
            offset: 起始位置
            buffer_size: 缓冲区大小

        Returns:
            Dict[str, Any]: 文件内容
        """
        pass

    @abstractmethod
    async def get_status(self) -> Dict[str, Any]:
        """
        获取会话状态

        Returns:
            Dict[str, Any]: 状态信息
        """
        pass
