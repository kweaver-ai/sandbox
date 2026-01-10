"""
Docker 容器调度器

使用 aiodocker 实现 Docker 容器的创建和管理。
"""
import asyncio
import logging
from typing import Optional

from aiodocker import Docker
from aiodocker.exceptions import DockerError

from src.infrastructure.container_scheduler.base import (
    IContainerScheduler,
    ContainerConfig,
    ContainerInfo,
    ContainerResult,
)

logger = logging.getLogger(__name__)


class DockerScheduler(IContainerScheduler):
    """
    Docker 容器调度器

    通过 Docker socket 或 TCP 连接 Docker daemon，管理容器生命周期。
    """

    def __init__(self, docker_url: str = "unix:///var/run/docker.sock"):
        """
        初始化 Docker 调度器

        Args:
            docker_url: Docker daemon 连接URL
                - unix:///var/run/docker.sock (Unix socket)
                - tcp://localhost:2375 (TCP)
        """
        self._docker_url = docker_url
        self._docker: Optional[Docker] = None
        self._initialized = False

    async def _ensure_docker(self) -> Docker:
        """确保 Docker 客户端已初始化"""
        if not self._initialized:
            self._docker = Docker(url=self._docker_url)
            self._initialized = True
        return self._docker

    async def close(self) -> None:
        """关闭 Docker 连接"""
        if self._docker:
            await self._docker.close()
            self._initialized = False

    async def create_container(self, config: ContainerConfig) -> str:
        """
        创建 Docker 容器

        容器配置：
        - NetworkMode: sandbox_network (容器网络，用于 executor 通信)
        - CAP_DROP: ALL (移除所有特权)
        - SecurityOpt: no-new-privileges (禁止获取新权限)
        - User: 1000:1000 (非特权用户)
        - ReadonlyRootfs: false (需要写入工作空间)
        """
        docker = await self._ensure_docker()

        # 解析资源限制
        cpu_quota = int(float(config.cpu_limit) * 100000)
        memory_bytes = self._parse_memory_to_bytes(config.memory_limit)

        # aiodocker 的 config 格式
        container_config = {
            "Image": config.image,
            "Hostname": config.name,
            "Env": [f"{k}={v}" for k, v in config.env_vars.items()],
            "HostConfig": {
                "NetworkMode": config.network_name,  # 使用指定的 Docker 网络
                "CapDrop": ["ALL"],  # 移除所有特权
                "SecurityOpt": ["no-new-privileges"],  # 禁止获取新权限
                "User": "1000:1000",  # 非特权用户
                "CpuQuota": cpu_quota,
                "CpuPeriod": 100000,
                "Memory": memory_bytes,
                "MemorySwap": memory_bytes,  # 禁用 swap
                # PortBindings removed - executor ports NOT mapped to host
                # to avoid conflicts when multiple sessions are created
            },
            "Labels": config.labels,
            "ExposedPorts": {
                "8080/tcp": {}  # 声明容器暴露的端口（仅用于内部网络通信）
            },
        }

        try:
            container = await docker.containers.create(container_config, name=config.name)
            logger.info(
                f"Created container {container.id} for session {config.name} "
                f"on network {config.network_name}"
            )
            return container.id
        except DockerError as e:
            logger.error(f"Failed to create container: {e}")
            raise

    async def start_container(self, container_id: str) -> None:
        """启动容器"""
        docker = await self._ensure_docker()
        try:
            container = docker.containers.container(container_id)
            await container.start()
            logger.info(f"Started container {container_id}")
        except DockerError as e:
            logger.error(f"Failed to start container {container_id}: {e}")
            raise

    async def stop_container(
        self,
        container_id: str,
        timeout: int = 10
    ) -> None:
        """停止容器"""
        docker = await self._ensure_docker()
        try:
            container = docker.containers.container(container_id)
            await container.stop(timeout=timeout)
            logger.info(f"Stopped container {container_id}")
        except DockerError as e:
            logger.error(f"Failed to stop container {container_id}: {e}")
            raise

    async def remove_container(
        self,
        container_id: str,
        force: bool = True
    ) -> None:
        """删除容器"""
        docker = await self._ensure_docker()
        try:
            container = docker.containers.container(container_id)
            await container.delete(force=force)
            logger.info(f"Removed container {container_id}")
        except DockerError as e:
            logger.warning(f"Failed to remove container {container_id}: {e}")

    async def get_container_status(self, container_id: str) -> ContainerInfo:
        """获取容器状态"""
        docker = await self._ensure_docker()
        try:
            container = docker.containers.container(container_id)
            info = await container.show()

            status = info["State"]["Status"]
            if status == "running":
                # Docker 可能返回运行中，但实际上是 paused
                if info["State"].get("Paused", False):
                    status = "paused"
            elif status == "exited":
                # 可以根据 exit_code 判断是 completed/failed
                pass

            return ContainerInfo(
                id=container_id,
                name=info["Name"].lstrip("/"),
                image=info["Config"]["Image"],
                status=status,
                ip_address=info["NetworkSettings"].get("IPAddress"),
                created_at=info["Created"],
                started_at=info["State"].get("StartedAt"),
                exited_at=info["State"].get("FinishedAt"),
                exit_code=info["State"].get("ExitCode"),
            )
        except DockerError as e:
            logger.error(f"Failed to get container status {container_id}: {e}")
            raise

    async def get_container_logs(
        self,
        container_id: str,
        tail: int = 100,
        since: Optional[str] = None
    ) -> str:
        """获取容器日志"""
        docker = await self._ensure_docker()
        try:
            container = docker.containers.container(container_id)
            # 构建日志参数
            params = {"stdout": True, "stderr": True, "tail": tail}
            if since:
                params["since"] = since
            logs = await container.log(**params)
            return "".join(logs)
        except DockerError as e:
            logger.error(f"Failed to get logs for container {container_id}: {e}")
            raise

    async def wait_container(
        self,
        container_id: str,
        timeout: Optional[int] = None
    ) -> ContainerResult:
        """等待容器执行完成"""
        docker = await self._ensure_docker()
        try:
            container = docker.containers.container(container_id)

            if timeout:
                # 使用 asyncio.wait_for 实现超时
                result = await asyncio.wait_for(
                    container.wait(),
                    timeout=timeout
                )
            else:
                result = await container.wait()

            exit_code = result["StatusCode"]
            status = "completed" if exit_code == 0 else "failed"

            # 获取日志
            logs = await self.get_container_logs(container_id, tail=-1)

            return ContainerResult(
                status=status,
                stdout=logs,
                stderr="",
                exit_code=exit_code,
            )
        except asyncio.TimeoutError:
            logger.warning(f"Container {container_id} timed out")
            return ContainerResult(
                status="timeout",
                stdout="",
                stderr=f"Container execution timed out after {timeout}s",
                exit_code=124,
            )
        except DockerError as e:
            logger.error(f"Failed to wait for container {container_id}: {e}")
            raise

    async def ping(self) -> bool:
        """检查 Docker 连接状态"""
        try:
            docker = await self._ensure_docker()
            # 尝试获取 Docker 版本信息来验证连接
            version = await docker.version()
            return version is not None
        except Exception as e:
            logger.error(f"Docker ping failed: {e}")
            return False

    def _parse_memory_to_bytes(self, value: str) -> int:
        """
        解析内存限制为字节数

        Args:
            value: 如 "512Mi", "1Gi"

        Returns:
            字节数
        """
        value = value.strip()
        if value.endswith("Gi") or value.endswith("GB") or value.endswith("G"):
            return int(float(value[:-2]) * 1024 * 1024 * 1024)
        elif value.endswith("Mi") or value.endswith("MB") or value.endswith("M"):
            return int(float(value[:-2]) * 1024 * 1024)
        elif value.endswith("Ki") or value.endswith("KB") or value.endswith("K"):
            return int(float(value[:-2]) * 1024)
        else:
            # 默认为 MB
            return int(float(value) * 1024 * 1024)

    def _parse_disk_to_bytes(self, value: str) -> int:
        """解析磁盘限制为字节数"""
        return self._parse_memory_to_bytes(value)
