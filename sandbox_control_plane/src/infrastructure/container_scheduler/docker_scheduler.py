"""
Docker 容器调度器

使用 aiodocker 实现 Docker 容器的创建和管理。

支持 S3 workspace 挂载：当 workspace_path 以 s3:// 开头时，
容器会通过 s3fs 将 S3 bucket 挂载到 /workspace 目录。

支持 Python 依赖安装：按照 sandbox-design-v2.1.md 章节 5 设计。
"""
import asyncio
import json
import os
from typing import Optional, List
from urllib.parse import urlparse

from aiodocker import Docker
from aiodocker.exceptions import DockerError

from src.infrastructure.container_scheduler.base import (
    IContainerScheduler,
    ContainerConfig,
    ContainerInfo,
    ContainerResult,
)
from src.infrastructure.config.settings import get_settings
from src.infrastructure.logging import get_logger

logger = get_logger(__name__)


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

    def _parse_s3_workspace(self, workspace_path: str) -> Optional[dict]:
        """
        解析 S3 workspace 路径

        Args:
            workspace_path: S3 路径，格式: s3://bucket/sessions/{session_id}/

        Returns:
            包含 bucket, prefix 的字典，如果不是 S3 路径则返回 None
        """
        if not workspace_path or not workspace_path.startswith("s3://"):
            return None

        parsed = urlparse(workspace_path)
        return {
            "bucket": parsed.netloc,
            "prefix": parsed.path.lstrip('/'),
        }

    def _build_s3_mount_entrypoint(
        self,
        s3_bucket: str,
        s3_prefix: str,
        s3_endpoint_url: str,
        s3_access_key: str,
        s3_secret_key: str,
        dependencies: Optional[List[str]] = None,
    ) -> str:
        """
        构建容器启动脚本，用于挂载 S3 bucket 并安装依赖

        Args:
            s3_bucket: S3 bucket 名称
            s3_prefix: S3 路径前缀
            s3_endpoint_url: S3 端点 URL
            s3_access_key: S3 访问密钥 ID
            s3_secret_key: S3 访问密钥
            dependencies: pip 包规范列表（如 ["requests==2.31.0", "pandas>=2.0"]）

        Returns:
            Shell 脚本字符串

        工作原理:
        1. 挂载 S3 bucket 到 /workspace/s3-root
        2. 创建符号链接 /workspace -> /workspace/s3-root/sessions/{session_id}
        3. 安装依赖到 /workspace/.venv/（如果指定）
        4. 使用 gosu 切换到 sandbox 用户运行 executor
        """
        # 对于 MinIO，需要使用 use_path_request_style
        path_style_option = "-o use_path_request_style" if s3_endpoint_url else ""

        # 依赖安装脚本片段
        dependency_install_script = ""
        if dependencies:
            # 转换依赖格式：[{"name": "requests", "version": "==2.31.0"}] -> ["requests==2.31.0"]
            pip_specs = []
            for dep in dependencies:
                if isinstance(dep, dict):
                    name = dep.get("name", "")
                    version = dep.get("version", "")
                    if version:
                        pip_specs.append(f"{name}{version}")
                    else:
                        pip_specs.append(name)
                elif isinstance(dep, str):
                    pip_specs.append(dep)

            deps_json = json.dumps(dependencies)
            deps_list = " ".join(f'"{spec}"' for spec in pip_specs)
            dependency_install_script = f"""
# ========== 安装 Python 依赖 ==========
echo "📦 Installing dependencies: {deps_json}"
echo "📦 Pip specs: {pip_specs}"
mkdir -p /workspace/.venv/

if pip3 install \\
    --target /workspace/.venv/ \\
    --isolated \\
    --no-warn-script-location \\
    --disable-pip-version-check \\
    --index-url https://pypi.org/simple/ \\
    {deps_list}; then
    echo "✅ Dependencies installed successfully"
    # 修改属主为 sandbox 用户（gosu 切换前以 root 安装）
    chown -R sandbox:sandbox /workspace/.venv/
else
    echo "❌ Failed to install dependencies"
    exit 1
fi
"""

        return f"""#!/bin/bash
set -e

# 创建 s3fs 凭证文件
echo "{s3_access_key}:{s3_secret_key}" > /tmp/.passwd-s3fs
chmod 600 /tmp/.passwd-s3fs

# 1. 创建 S3 挂载点（注意：不是直接挂到 /workspace）
echo "Mounting S3 bucket {s3_bucket}..."
mkdir -p /mnt/s3-root
s3fs {s3_bucket} /mnt/s3-root \\
    -o passwd_file=/tmp/.passwd-s3fs \\
    -o url={s3_endpoint_url or "https://s3.amazonaws.com"} \\
    {path_style_option} \\
    -o allow_other \\
    -o umask=000

# 2. 创建 session workspace 目录（如果不存在）
SESSION_PATH="/mnt/s3-root/{s3_prefix}"
echo "Ensuring session workspace exists: $SESSION_PATH"
mkdir -p "$SESSION_PATH"

# 3. 将 /workspace 移动到临时位置
mv /workspace /workspace-old 2>/dev/null || true

# 4. 创建符号链接从 /workspace 到 session 目录
ln -s "$SESSION_PATH" /workspace

# 5. 验证符号链接
echo "Workspace symlink: $(ls -la /workspace)"

# ========== ✅ 新增：安装依赖 ==========
{dependency_install_script}

# 6. 使用 gosu 切换到 sandbox 用户运行 executor
# 通过 bash -c 在 gosu 之后设置环境变量
echo "Starting sandbox executor as sandbox user..."
exec gosu sandbox bash -c 'export PYTHONPATH=/app:/workspace/.venv:/workspace; export SANDBOX_VENV_PATH=/workspace/.venv/; exec python -m executor.interfaces.http.rest'
"""

    def _build_dependency_install_entrypoint(
        self,
        dependencies: Optional[List[str]] = None,
    ) -> str:
        """
        构建依赖安装脚本（非 S3 模式）

        Args:
            dependencies: pip 包规范列表（如 ["requests==2.31.0", "pandas>=2.0"]）

        Returns:
            Shell 脚本字符串

        工作原理:
        1. 以 sandbox 用户运行
        2. 安装依赖到 /workspace/.venv/
        3. 启动 executor
        """
        # 依赖安装脚本片段
        dependency_install_script = ""
        if dependencies:
            # 转换依赖格式：[{"name": "requests", "version": "==2.31.0"}] -> ["requests==2.31.0"]
            pip_specs = []
            for dep in dependencies:
                if isinstance(dep, dict):
                    name = dep.get("name", "")
                    version = dep.get("version", "")
                    if version:
                        pip_specs.append(f"{name}{version}")
                    else:
                        pip_specs.append(name)
                elif isinstance(dep, str):
                    pip_specs.append(dep)

            deps_json = json.dumps(dependencies)
            deps_list = " ".join(f'"{spec}"' for spec in pip_specs)
            dependency_install_script = f"""
# ========== 安装 Python 依赖 ==========
echo "📦 Installing dependencies: {deps_json}"
echo "📦 Pip specs: {pip_specs}"
mkdir -p /workspace/.venv/

if pip3 install \\
    --target /workspace/.venv/ \\
    --isolated \\
    --no-warn-script-location \\
    --disable-pip-version-check \\
    --index-url https://pypi.org/simple/ \\
    {deps_list}; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi
"""

        return f"""#!/bin/bash
set -e

echo "🚀 Starting sandbox executor (non-S3 mode)..."

# ========== 安装依赖 ==========
{dependency_install_script}

# 启动 executor
echo "🎯 Starting executor daemon..."
exec python -m executor.interfaces.http.rest
"""

    async def create_container(self, config: ContainerConfig) -> str:
        """
        创建 Docker 容器

        容器配置：
        - NetworkMode: sandbox_network (容器网络，用于 executor 通信)
        - CAP_DROP: ALL (移除所有特权)
        - CAP_ADD: SYS_ADMIN (仅当使用 S3 workspace 时需要，用于 FUSE 挂载)
        - SecurityOpt: no-new-privileges (禁止获取新权限)
        - User: 1000:1000 (非特权用户)
        - ReadonlyRootfs: false (需要写入工作空间)

        S3 Workspace 挂载：
        当 workspace_path 以 s3:// 开头时，容器会通过 s3fs 将 S3 bucket 挂载到 /workspace：
        - 添加 /dev/fuse 设备（FUSE 需要）
        - 添加 SYS_ADMIN capability（FUSE 挂载需要）
        - 创建 entrypoint 脚本，在启动 executor 之前先挂载 S3
        - 容器启动后自动 cd 到 workspace 子目录
        """
        docker = await self._ensure_docker()

        # 解析资源限制
        cpu_quota = int(float(config.cpu_limit) * 100000)
        memory_bytes = self._parse_memory_to_bytes(config.memory_limit)

        # 检查是否需要 S3 workspace 挂载
        s3_workspace = self._parse_s3_workspace(config.workspace_path)
        use_s3_mount = s3_workspace is not None

        # 基础环境变量
        env_vars = dict(config.env_vars)

        # 基础容器配置
        container_config = {
            "Image": config.image,
            "Hostname": config.name,
            "Env": [f"{k}={v}" for k, v in env_vars.items()],
            "HostConfig": {
                "NetworkMode": config.network_name,
                # 默认配置，S3 mount 模式会覆盖
                "CpuQuota": cpu_quota,
                "CpuPeriod": 100000,
                "Memory": memory_bytes,
                "MemorySwap": memory_bytes,
            },
            "Labels": config.labels,
            "ExposedPorts": {
                "8080/tcp": {}
            },
        }

        # 如果不使用 S3 workspace，保持原有安全配置
        # 注意: Bubblewrap 需要用户命名空间支持，如果遇到权限错误：
        # 1. 在宿主机启用: sudo sysctl -w kernel.unprivileged_userns_clone=1
        # 2. 或者设置环境变量 DISABLE_BWRAP=true 来禁用 bubblewrap
        if not use_s3_mount:
            # 从 config.labels 中提取依赖列表
            dependencies_json = config.labels.get("dependencies", "")
            dependencies = json.loads(dependencies_json) if dependencies_json else None

            # 添加 PYTHONPATH 环境变量以支持依赖导入
            if dependencies:
                container_config["Env"].append("PYTHONPATH=/workspace/.venv/:/workspace:$PYTHONPATH")
                container_config["Env"].append("SANDBOX_VENV_PATH=/workspace/.venv/")

                # 如果有依赖，使用动态 entrypoint 脚本
                entrypoint_script = self._build_dependency_install_entrypoint(
                    dependencies=dependencies,
                )
                container_config["Entrypoint"] = ["/bin/sh", "-c"]
                container_config["Cmd"] = [entrypoint_script]

                logger.info(
                    f"Configuring dependency installation for {config.name}: "
                    f"dependencies={len(dependencies)}"
                )

            container_config["HostConfig"]["CapDrop"] = ["ALL"]
            container_config["HostConfig"]["SecurityOpt"] = ["no-new-privileges"]
            # 添加 seccomp 配置以允许用户命名空间
            container_config["HostConfig"]["SecurityOpt"].append("seccomp=default")
            container_config["HostConfig"]["User"] = "1000:1000"

        # 如果使用 S3 workspace 挂载，添加必要的配置
        if use_s3_mount:
            settings = get_settings()

            # 新增：从 config.labels 中提取依赖列表
            dependencies_json = config.labels.get("dependencies", "")
            dependencies = json.loads(dependencies_json) if dependencies_json else None

            # 以 root 用户启动（覆盖 Dockerfile 中的 USER sandbox）
            # 这样 entrypoint 脚本可以以 root 执行 s3fs 挂载
            container_config["User"] = "root"

            # 添加 SYS_ADMIN capability（FUSE 需要）
            container_config["HostConfig"]["CapAdd"] = ["SYS_ADMIN"]

            # 添加 /dev/fuse 设备
            container_config["HostConfig"]["Devices"] = [
                {
                    "PathOnHost": "/dev/fuse",
                    "PathInContainer": "/dev/fuse",
                    "CgroupPermissions": "rwm"
                }
            ]

            # 添加 tmpfs 用于 s3fs 缓存
            container_config["HostConfig"]["Tmpfs"] = {
                "/tmp": "size=100M,mode=1777"
            }

            # 添加 S3 相关环境变量
            s3_env_vars = {
                "S3_BUCKET": s3_workspace["bucket"],
                "S3_PREFIX": s3_workspace["prefix"],
                "S3_ENDPOINT_URL": settings.s3_endpoint_url or "https://s3.amazonaws.com",
                "S3_REGION": settings.s3_region,
                "WORKSPACE_MOUNT_POINT": "/workspace",
                "WORKSPACE_PATH": "/workspace",  # 告诉 executor 使用本地挂载点
            }
            for k, v in s3_env_vars.items():
                container_config["Env"].append(f"{k}={v}")

            # 新增：添加 PYTHONPATH 环境变量以支持依赖导入
            # /app 必须在最前面，以便 executor 模块能被找到
            if dependencies:
                container_config["Env"].append("PYTHONPATH=/app:/workspace/.venv/:/workspace")
                container_config["Env"].append("SANDBOX_VENV_PATH=/workspace/.venv/")

            # 修改：传递依赖列表到 entrypoint 脚本
            entrypoint_script = self._build_s3_mount_entrypoint(
                s3_bucket=s3_workspace["bucket"],
                s3_prefix=s3_workspace["prefix"],
                s3_endpoint_url=settings.s3_endpoint_url or "",
                s3_access_key=settings.s3_access_key_id,
                s3_secret_key=settings.s3_secret_access_key,
                dependencies=dependencies,  # 新增参数
            )
            container_config["Entrypoint"] = ["/bin/sh", "-c"]
            container_config["Cmd"] = [entrypoint_script]

            logger.info(
                f"Configuring S3 workspace mount for {config.name}: "
                f"bucket={s3_workspace['bucket']}, prefix={s3_workspace['prefix']}, "
                f"dependencies={len(dependencies) if dependencies else 0}"
            )

        try:
            container = await docker.containers.create(container_config, name=config.name)
            logger.info(
                f"Created container {container.id} for session {config.name} "
                f"on network {config.network_name} (S3 mount: {use_s3_mount})"
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

    async def is_container_running(self, container_id: str) -> bool:
        """
        检查容器是否正在运行

        直接通过 Docker API 查询，不依赖数据库。
        此方法供 StateSyncService 使用。

        Args:
            container_id: 容器 ID

        Returns:
            bool: 容器是否运行中
        """
        try:
            container_info = await self.get_container_status(container_id)
            return container_info.status == "running"
        except Exception as e:
            logger.warning(f"Failed to check container {container_id} status: {e}")
            return False

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
