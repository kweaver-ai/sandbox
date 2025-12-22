import asyncio
import aiohttp
import random
import time
import logging
from typing import List, Optional, Dict, Any
from sandbox_runtime.utils.loggers import DEFAULT_LOGGER
from dataclasses import dataclass
from abc import ABC, abstractmethod


URL_PREFIX = "/workspace/se"


@dataclass
class ServerInfo:
    """服务器信息"""

    url: str
    weight: float = 1.0
    last_check: float = 0.0
    is_healthy: bool = True
    response_time: float = float("inf")


class ServiceDiscovery(ABC):
    """服务发现抽象类"""

    def __init__(self):
        self.logger = logging.getLogger(
            f"sandbox_runtime.sdk.server_select.{self.__class__.__name__}"
        )

    @abstractmethod
    async def get_servers(self) -> List[ServerInfo]:
        """
        获取服务器列表

        Returns:
            List[ServerInfo]: 服务器列表
        """
        pass

    @abstractmethod
    async def close(self):
        """关闭服务发现"""
        pass

    @abstractmethod
    async def check_all_servers(self):
        """检查所有服务器健康状态"""
        pass

    async def start(self):
        """
        运行服务发现
        """
        self.logger.info("Starting service discovery")
        # 每10秒检查一次服务器健康状态，用任务方式运行
        asyncio.create_task(self.check_all_servers())


class StaticServiceDiscovery(ServiceDiscovery):
    """静态服务器列表服务发现"""

    def __init__(self, servers: List[str] = [], check_interval: float = 60.0, **kwargs):
        """
        初始化静态服务器列表服务发现

        Args:
            servers: 服务器URL列表
            check_interval: 健康检查间隔（秒）
        """
        super().__init__()
        self.servers = [ServerInfo(url=url) for url in servers]
        self.check_interval = check_interval

        self.logger.info(
            f"Initialized with {len(servers)} servers, check_interval={check_interval}s"
        )

    async def check_server_health(self, server: ServerInfo) -> bool:
        """
        检查服务器健康状态

        Args:
            server: 服务器信息

        Returns:
            bool: 是否健康
        """
        self.logger.debug(f"Checking health of server: {server.url}")

        try:
            start_time = time.time()

            async with aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=10.0)
            ) as session:
                async with session.get(
                    f"{server.url}{URL_PREFIX}/healthy",
                    timeout=aiohttp.ClientTimeout(total=10.0),
                ) as response:
                    if response.status == 200:
                        server.is_healthy = True
                        server.response_time = time.time() - start_time
                        server.last_check = time.time()
                        self.logger.debug(
                            f"Server {server.url} is healthy, response time: {server.response_time:.3f}s"
                        )
                        return True
                    else:
                        self.logger.warning(
                            f"Server {server.url} returned non-200 status: {response.status}"
                        )
                        return False
        except Exception as e:
            import traceback

            self.logger.debug(
                f"Server {server.url} health check failed: {type(e).__name__}: {e}"
            )
            self.logger.debug(f"Exception traceback: {traceback.format_exc()}")

        server.is_healthy = False
        server.last_check = time.time()
        self.logger.warning(f"Server {server.url} is unhealthy")
        return False

    async def check_all_servers(self):
        """检查所有服务器健康状态"""
        self.logger.debug("Checking health of all servers")

        tasks = []
        for server in self.servers:
            if time.time() - server.last_check > self.check_interval:
                tasks.append(self.check_server_health(server))

        if tasks:
            self.logger.debug(f"Starting health checks for {len(tasks)} servers")
            await asyncio.gather(*tasks)
            self.logger.debug("Health checks completed")

    async def get_servers(self) -> List[ServerInfo]:
        """获取服务器列表"""
        self.logger.debug("Getting server list")
        await self.check_all_servers()

        healthy_servers = [s for s in self.servers if s.is_healthy]
        self.logger.info(
            f"Found {len(healthy_servers)}/{len(self.servers)} healthy servers"
        )

        return self.servers

    async def close(self):
        """关闭服务发现"""
        self.logger.info("Static service discovery closed")
        pass


class K8sServiceDiscovery(ServiceDiscovery):
    """Kubernetes 服务发现"""

    def __init__(
        self, namespace: str, service_name: str, check_interval: float = 60.0, **kwargs
    ):
        """
        初始化 Kubernetes 服务发现

        Args:
            namespace: Kubernetes 命名空间
            service_name: 服务名称
            check_interval: 健康检查间隔（秒）
        """
        super().__init__()
        self.namespace = namespace
        self.service_name = service_name
        self.check_interval = check_interval
        self._k8s_client = None  # 这里需要实现 K8s 客户端

        self.logger.info(
            f"Initialized K8s service discovery for {namespace}/{service_name}"
        )

    async def _get_k8s_client(self):
        """获取 K8s 客户端"""
        if self._k8s_client is None:
            # 这里需要实现 K8s 客户端的初始化
            # 可以使用 kubernetes-asyncio 库
            self.logger.debug("K8s client not implemented yet")
        return self._k8s_client

    async def check_server_health(self, server: ServerInfo) -> bool:
        """
        检查服务器健康状态

        Args:
            server: 服务器信息

        Returns:
            bool: 是否健康
        """
        self.logger.debug(f"Checking health of K8s server: {server.url}")

        try:
            start_time = time.time()
            async with aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=10.0)
            ) as session:
                async with session.get(
                    f"{server.url}{URL_PREFIX}/healthy",
                    timeout=aiohttp.ClientTimeout(total=10.0),
                ) as response:
                    if response.status == 200:
                        server.is_healthy = True
                        server.response_time = time.time() - start_time
                        server.last_check = time.time()
                        self.logger.debug(
                            f"K8s server {server.url} is healthy, response time: {server.response_time:.3f}s"
                        )
                        return True
        except Exception as e:
            import traceback

            self.logger.debug(
                f"K8s server {server.url} health check failed: {type(e).__name__}: {e}"
            )
            self.logger.debug(f"Exception traceback: {traceback.format_exc()}")

        server.is_healthy = False
        server.last_check = time.time()
        self.logger.warning(f"K8s server {server.url} is unhealthy")
        return False

    async def get_servers(self) -> List[ServerInfo]:
        """
        从 K8s 获取服务器列表

        Returns:
            List[ServerInfo]: 服务器列表
        """
        self.logger.debug("Getting K8s server list")
        # 这里需要实现从 K8s 获取服务端点列表的逻辑
        # 可以使用 kubernetes-asyncio 库的 CoreV1Api().list_namespaced_endpoints
        # 然后将端点转换为 ServerInfo 列表
        self.logger.warning("K8s service discovery not fully implemented")
        return []

    async def close(self):
        """关闭服务发现"""
        self.logger.info("K8s service discovery closed")


class ServerSelector:
    """服务器选择器"""

    def __init__(
        self,
        id_to_select: str,
        service_discovery: Optional[ServiceDiscovery] = None,
        selector_type: str = "mod",
    ):
        """
        初始化服务器选择器

        Args:
            id_to_select: 用于选择服务器的ID
            service_discovery: 服务发现实例
            selector_type: 选择器类型 (mod, random, round_robin)
        """
        self.id_to_select = id_to_select
        self.service_discovery = service_discovery
        self.selector_type = selector_type
        self.logger = logging.getLogger(
            f"sandbox_runtime.sdk.server_select.{self.__class__.__name__}"
        )

        self.logger.info(
            f"Initialized server selector with type={selector_type}, id={id_to_select}"
        )

    async def select_server(self) -> Optional[str]:
        """
        选择一个服务器

        Returns:
            Optional[str]: 选中的服务器URL
        """
        self.logger.debug("Selecting server")

        if not self.service_discovery:
            self.logger.warning("No service discovery available")
            return None

        servers = await self.service_discovery.get_servers()
        healthy_servers = [s for s in servers if s.is_healthy]

        if not healthy_servers:
            self.logger.warning("No healthy servers available")
            return None

        self.logger.debug(f"Found {len(healthy_servers)} healthy servers")

        if self.selector_type == "mod":
            # 基于ID的模运算选择
            index = hash(self.id_to_select) % len(healthy_servers)
            selected_server = healthy_servers[index]
        elif self.selector_type == "random":
            # 随机选择
            selected_server = random.choice(healthy_servers)
        elif self.selector_type == "round_robin":
            # 轮询选择
            index = int(time.time()) % len(healthy_servers)
            selected_server = healthy_servers[index]
        else:
            # 默认使用模运算
            index = hash(self.id_to_select) % len(healthy_servers)
            selected_server = healthy_servers[index]

        self.logger.info(
            f"Selected server: {selected_server.url} using {self.selector_type} strategy"
        )
        return selected_server.url

    async def close(self):
        """关闭服务器选择器"""
        self.logger.info("Closing server selector")
        if self.service_discovery:
            await self.service_discovery.close()
            self.logger.debug("Service discovery closed")
