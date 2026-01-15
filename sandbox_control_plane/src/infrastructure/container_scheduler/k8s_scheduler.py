"""
Kubernetes 容器调度器

使用官方 Python kubernetes 客户端实现 Pod 的创建和管理。

支持 S3 workspace 挂载：当 workspace_path 以 s3:// 开头时，
Pod 会通过 s3fs sidecar 容器将 S3 bucket 挂载到 /workspace 目录。

支持 Python 依赖安装：按照 sandbox-design-v2.1.md 章节 5 设计。
"""
import asyncio
import json
import os
from typing import Optional, List
from urllib.parse import urlparse

from kubernetes import client, config
from kubernetes.client import (
    V1Pod,
    V1PodSpec,
    V1ObjectMeta,
    V1Container,
    V1ContainerPort,
    V1EnvVar,
    V1ResourceRequirements,
    V1Volume,
    V1VolumeMount,
    V1PersistentVolumeClaimVolumeSource,
    V1PersistentVolumeClaim,
    V1PersistentVolumeClaimSpec,
    V1SecurityContext,
    V1Capabilities,
    V1PodSecurityContext,
    V1EmptyDirVolumeSource,
)
from kubernetes.client.rest import ApiException

from src.infrastructure.container_scheduler.base import (
    IContainerScheduler,
    ContainerConfig,
    ContainerInfo,
    ContainerResult,
)
from src.infrastructure.config.settings import get_settings
from src.infrastructure.logging import get_logger

logger = get_logger(__name__)


class K8sScheduler(IContainerScheduler):
    """
    Kubernetes 容器调度器

    通过 Kubernetes API 管理 Pod 生命周期。
    """

    def __init__(
        self,
        namespace: str = "sandbox-runtime",
        kube_config_path: Optional[str] = None,
        service_account_token: Optional[str] = None,
    ):
        """
        初始化 K8s 调度器

        Args:
            namespace: Kubernetes 命名空间
            kube_config_path: kubeconfig 文件路径（可选，用于本地开发）
            service_account_token: ServiceAccount Token（用于 Pod 内运行）
        """
        self._namespace = namespace

        # 加载 Kubernetes 配置
        if service_account_token:
            # 在 Pod 内运行，使用 ServiceAccount
            self._load_incluster_config()
        elif kube_config_path:
            # 使用指定的 kubeconfig 文件
            config.load_kube_config(config_file=kube_config_path)
        else:
            # 尝试加载默认 kubeconfig
            try:
                config.load_kube_config()
            except Exception:
                # 如果 kubeconfig 不存在，尝试使用 in-cluster 配置
                try:
                    self._load_incluster_config()
                except Exception:
                    # 最后尝试使用默认配置（用于本地开发）
                    from kubernetes.client import Configuration
                    Configuration.set_default(Configuration())

        # 创建 API 客户端
        self._core_v1 = client.CoreV1Api()
        self._initialized = False

    def _load_incluster_config(self):
        """加载 in-cluster 配置"""
        config.load_incluster_config()
        logger.info("Loaded in-cluster Kubernetes config")

    async def _ensure_connected(self) -> bool:
        """确保 K8s 连接已建立"""
        if not self._initialized:
            try:
                # 测试连接 - 使用当前 namespace 的 Pod 列表代替 namespace 列表
                # 这样只需要 namespace 级别的权限，不需要 cluster 级别的权限
                self._core_v1.list_namespaced_pod(self._namespace, limit=1)
                self._initialized = True
                logger.info(f"Connected to Kubernetes cluster, namespace: {self._namespace}")
            except Exception as e:
                logger.error(f"Failed to connect to Kubernetes: {e}")
                raise
        return self._initialized

    async def close(self) -> None:
        """关闭连接（Kubernetes 客户端是无状态的，无需显式关闭）"""
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

    def _build_pod_name(self, session_id: str) -> str:
        """生成 Pod 名称"""
        # K8s Pod 名称需要符合 DNS 子域名规则
        # 只能包含小写字母、数字和 '-'，且开头和结尾必须是字母数字
        pod_name = f"sandbox-{session_id.lower()}"
        # 替换不符合规则的字符
        pod_name = ''.join(c if c.isalnum() or c == '-' else '-' for c in pod_name)
        # 确保不以 '-' 开头或结尾
        pod_name = pod_name.strip('-')
        # 限制长度（K8s Pod 名称最多 253 字符）
        return pod_name[:253]

    def _build_s3_sidecar_container(
        self,
        s3_bucket: str,
        s3_prefix: str,
        s3_endpoint_url: str,
        s3_access_key: str,
        s3_secret_key: str,
        dependencies: Optional[List[str]] = None,
    ) -> V1Container:
        """
        构建用于挂载 S3 的 sidecar 容器

        Args:
            s3_bucket: S3 bucket 名称
            s3_prefix: S3 路径前缀
            s3_endpoint_url: S3 端点 URL
            s3_access_key: S3 访问密钥 ID
            s3_secret_key: S3 访问密钥
            dependencies: pip 包规范列表

        Returns:
            V1Container 对象
        """
        # 依赖安装脚本
        dependency_install_script = ""
        if dependencies:
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

            deps_list = " ".join(f'"{spec}"' for spec in pip_specs)
            dependency_install_script = f"""
# 安装 Python 依赖
echo "📦 Installing dependencies: {len(dependencies)} packages"
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

chown -R 1000:1000 /workspace/.venv/
"""

        # s3fs 挂载脚本
        path_style_option = "-o use_path_request_style" if s3_endpoint_url else ""

        mount_script = f"""
#!/bin/sh
set -e

# 创建 s3fs 凭证文件
echo "{s3_access_key}:{s3_secret_key}" > /tmp/.passwd-s3fs
chmod 600 /tmp/.passwd-s3fs

# 挂载 S3 bucket
echo "Mounting S3 bucket {s3_bucket}..."
mkdir -p /workspace
s3fs {s3_bucket} /workspace \\
    -o passwd_file=/tmp/.passwd-s3fs \\
    -o url={s3_endpoint_url or "https://s3.amazonaws.com"} \\
    {path_style_option} \\
    -o allow_other \\
    -o umask=000

# 等待挂载完成
sleep 2

# 确保会话目录存在
SESSION_PATH="/workspace/{s3_prefix}"
mkdir -p "$SESSION_PATH"

echo "✅ S3 mounted successfully at $SESSION_PATH"

# 安装依赖（如果有）
{dependency_install_script}

# 保持容器运行以维持挂载
echo "Sidecar container keeping S3 mount alive..."
tail -f /dev/null
"""

        return V1Container(
            name="s3-mount",
            image="xueshanf/s3fs:latest",
            image_pull_policy="IfNotPresent",  # 优先使用本地镜像
            security_context=V1SecurityContext(
                privileged=True,  # s3fs FUSE 挂载需要特权
                capabilities=V1Capabilities(add=["SYS_ADMIN"]),
            ),
            env=[
                V1EnvVar(name="S3_BUCKET", value=s3_bucket),
                V1EnvVar(name="S3_PREFIX", value=s3_prefix),
                V1EnvVar(name="S3_ENDPOINT_URL", value=s3_endpoint_url or "https://s3.amazonaws.com"),
            ],
            command=["sh", "-c", mount_script],
            volume_mounts=[
                V1VolumeMount(
                    name="workspace",
                    mount_path="/workspace",
                )
            ],
        )

    def _build_executor_container(
        self,
        config: ContainerConfig,
        use_s3_mount: bool,
        has_dependencies: bool,
    ) -> V1Container:
        """
        构建主 executor 容器

        Args:
            config: 容器配置
            use_s3_mount: 是否使用 S3 挂载
            has_dependencies: 是否有依赖包

        Returns:
            V1Container 对象
        """
        env_vars = [
            V1EnvVar(name=k, value=v)
            for k, v in config.env_vars.items()
        ]

        # 添加 S3 相关环境变量
        if use_s3_mount:
            s3_workspace = self._parse_s3_workspace(config.workspace_path)
            settings = get_settings()
            env_vars.extend([
                V1EnvVar(name="WORKSPACE_PATH", value="/workspace"),
                V1EnvVar(name="S3_BUCKET", value=s3_workspace["bucket"]),
                V1EnvVar(name="S3_PREFIX", value=s3_workspace["prefix"]),
            ])

        # 添加 PYTHONPATH 环境变量以支持依赖导入
        if has_dependencies:
            if use_s3_mount:
                env_vars.append(V1EnvVar(
                    name="PYTHONPATH",
                    value="/app:/workspace/.venv:/workspace"
                ))
                env_vars.append(V1EnvVar(
                    name="SANDBOX_VENV_PATH",
                    value="/workspace/.venv/"
                ))
            else:
                env_vars.append(V1EnvVar(
                    name="PYTHONPATH",
                    value="/workspace/.venv/:/workspace:$PYTHONPATH"
                ))
                env_vars.append(V1EnvVar(
                    name="SANDBOX_VENV_PATH",
                    value="/workspace/.venv/"
                ))

        # 资源限制
        resources = V1ResourceRequirements(
            limits={
                "cpu": config.cpu_limit,
                "memory": config.memory_limit,
                "ephemeral-storage": config.disk_limit,
            },
            requests={
                "cpu": config.cpu_limit,
                "memory": config.memory_limit,
            },
        )

        # 容器端口
        ports = [
            V1ContainerPort(
                container_port=8080,
                name="executor",
                protocol="TCP",
            )
        ]

        # 卷挂载
        volume_mounts = [
            V1VolumeMount(
                name="workspace",
                mount_path="/workspace",
            )
        ]

        # 安全上下文
        security_context = V1SecurityContext(
            run_as_non_root=True,
            run_as_user=1000,
            run_as_group=1000,
            allow_privilege_escalation=False,
            capabilities=V1Capabilities(drop=["ALL"]),
            read_only_root_filesystem=False,
        )

        # 如果有依赖安装，使用启动脚本
        command = None
        if has_dependencies and not use_s3_mount:
            dependencies_json = config.labels.get("dependencies", "")
            dependencies = json.loads(dependencies_json) if dependencies_json else []

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

            deps_list = " ".join(f'"{spec}"' for spec in pip_specs)
            install_script = f"""
#!/bin/sh
set -e
echo "📦 Installing dependencies..."
mkdir -p /workspace/.venv/
pip3 install \\
    --target /workspace/.venv/ \\
    --isolated \\
    --no-warn-script-location \\
    --disable-pip-version-check \\
    --index-url https://pypi.org/simple/ \\
    {deps_list}
echo "✅ Dependencies installed"
# 启动 executor
exec python -m executor.interfaces.http.rest
"""
            command = ["sh", "-c", install_script]

        return V1Container(
            name="executor",
            image=config.image,
            image_pull_policy="IfNotPresent",  # 优先使用本地镜像
            command=command,
            env=env_vars,
            resources=resources,
            ports=ports,
            volume_mounts=volume_mounts,
            security_context=security_context,
        )

    async def create_pvc_for_workspace(
        self,
        session_id: str,
        workspace_path: str,
    ) -> Optional[str]:
        """
        为 S3 workspace 创建 PVC

        Args:
            session_id: 会话 ID
            workspace_path: S3 workspace 路径

        Returns:
            PVC 名称，如果不需要 PVC 则返回 None
        """
        s3_workspace = self._parse_s3_workspace(workspace_path)
        if not s3_workspace:
            return None

        # 在实际生产环境中，这里会创建一个指向 S3 CSI Driver 的 PVC
        # 对于简化实现，我们使用 emptyDir + s3fs sidecar
        # 如果需要真实的 S3 CSI，需要预先创建 StorageClass 和 PVC 模板
        return None

    async def create_container(self, config: ContainerConfig) -> str:
        """
        创建 Kubernetes Pod

        Pod 配置：
        - 主容器: executor（运行用户代码）
        - Sidecar 容器: s3-mount（挂载 S3 bucket，可选）

        S3 Workspace 挂载：
        当 workspace_path 以 s3:// 开头时，会创建 s3fs sidecar 容器将 S3 bucket 挂载到 /workspace：
        - 使用 emptyDir 共享卷
        - s3-mount 容器以特权模式运行，挂载 S3 到共享卷
        - executor 容器从共享卷读取文件

        Python 依赖安装：
        - 如果有依赖，s3fs sidecar 会先安装依赖再挂载
        - 非 S3 模式下，executor 容器会在启动时安装依赖
        """
        await self._ensure_connected()

        pod_name = self._build_pod_name(config.name)
        s3_workspace = self._parse_s3_workspace(config.workspace_path)
        use_s3_mount = s3_workspace is not None

        # 检查是否有依赖
        dependencies_json = config.labels.get("dependencies", "")
        has_dependencies = bool(dependencies_json)

        # 构建容器列表
        containers = []

        # 主 executor 容器
        executor_container = self._build_executor_container(
            config=config,
            use_s3_mount=use_s3_mount,
            has_dependencies=has_dependencies,
        )
        containers.append(executor_container)

        # S3 sidecar 容器（如果需要）
        if use_s3_mount:
            settings = get_settings()
            dependencies = json.loads(dependencies_json) if dependencies_json else None

            s3_sidecar = self._build_s3_sidecar_container(
                s3_bucket=s3_workspace["bucket"],
                s3_prefix=s3_workspace["prefix"],
                s3_endpoint_url=settings.s3_endpoint_url or "",
                s3_access_key=settings.s3_access_key_id,
                s3_secret_key=settings.s3_secret_access_key,
                dependencies=dependencies,
            )
            containers.append(s3_sidecar)

        # 构建卷
        volumes = []
        if use_s3_mount:
            # 使用 emptyDir 在两个容器间共享 S3 挂载点
            volumes.append(
                V1Volume(
                    name="workspace",
                    empty_dir=V1EmptyDirVolumeSource(
                        medium="Memory",  # 使用内存作为存储介质
                    ),
                )
            )
        else:
            # 非 S3 模式，使用 emptyDir 作为临时存储
            volumes.append(
                V1Volume(
                    name="workspace",
                    empty_dir=V1EmptyDirVolumeSource(),
                )
            )

        # 构建标签
        labels = {
            "app": "sandbox-executor",  # 匹配 sandbox-executor service selector
            "sandbox-session": config.name,
            "sandbox-type": "execution",
        }
        labels.update(config.labels)

        # 构建 Pod Spec
        pod = V1Pod(
            metadata=V1ObjectMeta(
                name=pod_name,
                labels=labels,
                annotations={
                    "sandbox-session-id": config.name,
                },
            ),
            spec=V1PodSpec(
                containers=containers,
                volumes=volumes,
                restart_policy="Never",
                host_network=False,
                termination_grace_period_seconds=30,
                # 使用默认 DNS 策略 (ClusterFirst)，允许 Pod 使用 K8s 集群 DNS
                # 这对于 executor 与 control plane 通信很重要
            ),
        )

        try:
            # 创建 Pod
            created_pod = await asyncio.to_thread(
                self._core_v1.create_namespaced_pod,
                namespace=self._namespace,
                body=pod,
            )
            logger.info(
                f"Created pod {created_pod.metadata.name} for session {config.name} "
                f"in namespace {self._namespace} (S3 mount: {use_s3_mount})"
            )
            return created_pod.metadata.name

        except ApiException as e:
            logger.error(f"Failed to create pod: {e}")
            raise

    async def start_container(self, container_id: str) -> None:
        """
        启动 Pod

        注意：Kubernetes Pod 创建后会自动启动，此方法为兼容接口保留
        """
        await self._ensure_connected()
        # K8s Pod 创建后自动启动，无需显式调用
        logger.debug(f"Pod {container_id} starts automatically after creation")

    async def stop_container(
        self,
        container_id: str,
        timeout: int = 30
    ) -> None:
        """
        停止（删除）Pod

        Args:
            container_id: Pod 名称
            timeout: 优雅终止超时时间（秒）
        """
        await self._ensure_connected()
        try:
            await asyncio.to_thread(
                self._core_v1.delete_namespaced_pod,
                name=container_id,
                namespace=self._namespace,
                grace_period_seconds=timeout,
            )
            logger.info(f"Stopped pod {container_id}")
        except ApiException as e:
            if e.status == 404:
                logger.warning(f"Pod {container_id} not found")
            else:
                logger.error(f"Failed to stop pod {container_id}: {e}")
                raise

    async def remove_container(
        self,
        container_id: str,
        force: bool = False
    ) -> None:
        """
        删除 Pod

        Args:
            container_id: Pod 名称
            force: 是否强制删除（grace_period_seconds=0）
        """
        await self._ensure_connected()
        try:
            await asyncio.to_thread(
                self._core_v1.delete_namespaced_pod,
                name=container_id,
                namespace=self._namespace,
                grace_period_seconds=0 if force else 30,
            )
            logger.info(f"Removed pod {container_id}")
        except ApiException as e:
            if e.status == 404:
                logger.warning(f"Pod {container_id} not found")
            else:
                logger.warning(f"Failed to remove pod {container_id}: {e}")

    async def get_container_status(self, container_id: str) -> ContainerInfo:
        """
        获取 Pod 状态

        Args:
            container_id: Pod 名称

        Returns:
            ContainerInfo 对象
        """
        await self._ensure_connected()
        try:
            pod = await asyncio.to_thread(
                self._core_v1.read_namespaced_pod,
                name=container_id,
                namespace=self._namespace,
            )

            # 转换 K8s Pod 状态到 ContainerInfo
            phase = pod.status.phase
            if phase == "Running":
                # 检查容器状态
                if pod.status.container_statuses:
                    for container_status in pod.status.container_statuses:
                        if container_status.name == "executor":
                            if container_status.state.terminated:
                                phase = "exited"
                            elif container_status.state.waiting:
                                phase = "waiting"
                            break

            # 获取 IP 地址
            ip_address = pod.status.pod_ip

            # 获取时间信息
            created_at = pod.metadata.creation_timestamp.isoformat() if pod.metadata.creation_timestamp else ""
            started_at = pod.status.start_time.isoformat() if pod.status.start_time else None

            # 获取退出码（如果已终止）
            exit_code = None
            if pod.status.container_statuses:
                for container_status in pod.status.container_statuses:
                    if container_status.name == "executor" and container_status.state.terminated:
                        exit_code = container_status.state.terminated.exit_code
                        break

            # 获取镜像名称
            image = ""
            if pod.spec.containers:
                for container in pod.spec.containers:
                    if container.name == "executor":
                        image = container.image
                        break

            return ContainerInfo(
                id=container_id,
                name=container_id,
                image=image,
                status=phase.lower(),
                ip_address=ip_address,
                created_at=created_at,
                started_at=started_at,
                exited_at=None,
                exit_code=exit_code,
            )

        except ApiException as e:
            if e.status == 404:
                logger.error(f"Pod {container_id} not found")
                raise ValueError(f"Pod {container_id} not found") from e
            else:
                logger.error(f"Failed to get pod status {container_id}: {e}")
                raise

    async def is_container_running(self, container_id: str) -> bool:
        """
        检查 Pod 是否正在运行

        Args:
            container_id: Pod 名称

        Returns:
            bool: Pod 是否运行中
        """
        try:
            container_info = await self.get_container_status(container_id)
            return container_info.status == "running"
        except Exception as e:
            logger.warning(f"Failed to check pod {container_id} status: {e}")
            return False

    async def get_container_logs(
        self,
        container_id: str,
        tail: int = 100,
        since: Optional[str] = None
    ) -> str:
        """
        获取 Pod 日志

        Args:
            container_id: Pod 名称
            tail: 返回最后几行
            since: 时间戳（可选）

        Returns:
            日志字符串
        """
        await self._ensure_connected()
        try:
            logs = await asyncio.to_thread(
                self._core_v1.read_namespaced_pod_log,
                name=container_id,
                namespace=self._namespace,
                container="executor",
                tail_lines=tail,
                since_seconds=None,  # since_time 需要转换
            )
            return logs
        except ApiException as e:
            logger.error(f"Failed to get logs for pod {container_id}: {e}")
            raise

    async def wait_container(
        self,
        container_id: str,
        timeout: Optional[int] = None
    ) -> ContainerResult:
        """
        等待 Pod 执行完成

        Args:
            container_id: Pod 名称
            timeout: 超时时间（秒）

        Returns:
            ContainerResult 对象
        """
        await self._ensure_connected()

        async def _wait() -> ContainerResult:
            while True:
                try:
                    pod = await asyncio.to_thread(
                        self._core_v1.read_namespaced_pod,
                        name=container_id,
                        namespace=self._namespace,
                    )

                    # 检查 Pod 状态
                    if pod.status.phase == "Succeeded":
                        # 获取日志
                        logs = await self.get_container_logs(container_id, tail=-1)
                        return ContainerResult(
                            status="completed",
                            stdout=logs,
                            stderr="",
                            exit_code=0,
                        )
                    elif pod.status.phase == "Failed":
                        # 获取日志
                        logs = await self.get_container_logs(container_id, tail=-1)
                        return ContainerResult(
                            status="failed",
                            stdout=logs,
                            stderr="Pod failed",
                            exit_code=1,
                        )

                    # 检查容器状态
                    if pod.status.container_statuses:
                        for container_status in pod.status.container_statuses:
                            if container_status.name == "executor":
                                if container_status.state.terminated:
                                    logs = await self.get_container_logs(container_id, tail=-1)
                                    terminated = container_status.state.terminated
                                    return ContainerResult(
                                        status="completed" if terminated.exit_code == 0 else "failed",
                                        stdout=logs,
                                        stderr="",
                                        exit_code=terminated.exit_code,
                                    )

                    # 等待后重试
                    await asyncio.sleep(1)

                except ApiException as e:
                    if e.status == 404:
                        return ContainerResult(
                            status="failed",
                            stdout="",
                            stderr=f"Pod {container_id} not found",
                            exit_code=1,
                        )
                    raise

        try:
            if timeout:
                return await asyncio.wait_for(_wait(), timeout=timeout)
            else:
                return await _wait()

        except asyncio.TimeoutError:
            logger.warning(f"Pod {container_id} timed out")
            return ContainerResult(
                status="timeout",
                stdout="",
                stderr=f"Pod execution timed out after {timeout}s",
                exit_code=124,
            )

    async def ping(self) -> bool:
        """
        检查 Kubernetes 连接状态

        Returns:
            bool: 连接是否正常
        """
        try:
            await self._ensure_connected()
            # 测试连接
            await asyncio.to_thread(
                self._core_v1.list_namespace,
                limit=1,
            )
            return True
        except Exception as e:
            logger.error(f"Kubernetes ping failed: {e}")
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
