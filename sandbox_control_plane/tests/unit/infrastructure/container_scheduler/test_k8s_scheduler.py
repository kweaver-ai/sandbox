"""
Kubernetes 容器调度器单元测试

测试 K8sScheduler 类的功能。
"""
import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from datetime import datetime, timezone

from src.infrastructure.container_scheduler.k8s_scheduler import K8sScheduler
from src.infrastructure.container_scheduler.base import ContainerConfig


class TestK8sScheduler:
    """K8s 容器调度器测试"""

    @pytest.fixture
    def mock_core_v1(self):
        """模拟 Kubernetes CoreV1Api"""
        api = Mock()
        return api

    @pytest.fixture
    def scheduler(self, mock_core_v1):
        """创建 K8s 调度器"""
        sched = K8sScheduler(namespace="test-namespace")
        sched._core_v1 = mock_core_v1
        sched._initialized = True
        return sched

    @pytest.fixture
    def basic_config(self):
        """基础容器配置"""
        return ContainerConfig(
            image="python:3.11",
            name="test-session-abc123",
            cpu_limit="1",
            memory_limit="512Mi",
            disk_limit="1Gi",
            env_vars={"SESSION_ID": "test-session-abc123"},
            labels={"test": "label"},
            network_name="sandbox_network",
            workspace_path="/workspace"
        )

    def test_build_pod_name(self, scheduler):
        """测试生成 Pod 名称"""
        pod_name = scheduler._build_pod_name("sess_abc123")

        assert "sandbox" in pod_name
        assert pod_name.startswith("sandbox-")
        assert len(pod_name) <= 253

    def test_build_pod_name_with_uppercase(self, scheduler):
        """测试大写会话 ID 转换"""
        pod_name = scheduler._build_pod_name("Sess_ABC123")

        assert "sess" in pod_name.lower()
        # 应该不包含大写字母
        assert pod_name == pod_name.lower()

    def test_parse_s3_workspace_valid(self, scheduler):
        """测试解析有效的 S3 workspace 路径"""
        result = scheduler._parse_s3_workspace("s3://my-bucket/sessions/sess_123/")

        assert result is not None
        assert result["bucket"] == "my-bucket"
        assert result["prefix"] == "sessions/sess_123/"

    def test_parse_s3_workspace_invalid(self, scheduler):
        """测试解析无效的 S3 workspace 路径"""
        result = scheduler._parse_s3_workspace("/local/path/workspace")

        assert result is None

    def test_parse_memory_to_bytes_gi(self, scheduler):
        """测试解析内存限制（Gi）"""
        result = scheduler._parse_memory_to_bytes("1Gi")

        assert result == 1024 * 1024 * 1024

    def test_parse_memory_to_bytes_mi(self, scheduler):
        """测试解析内存限制（Mi）"""
        result = scheduler._parse_memory_to_bytes("512Mi")

        assert result == 512 * 1024 * 1024

    def test_parse_disk_to_bytes(self, scheduler):
        """测试解析磁盘限制"""
        result = scheduler._parse_disk_to_bytes("10Gi")

        assert result == 10 * 1024 * 1024 * 1024

    @pytest.mark.asyncio
    async def test_ping_success(self, scheduler, mock_core_v1):
        """测试 ping 成功"""
        mock_core_v1.list_namespace.return_value = Mock(items=[])

        result = await scheduler.ping()

        assert result is True

    @pytest.mark.asyncio
    async def test_ping_failure(self, scheduler, mock_core_v1):
        """测试 ping 失败"""
        mock_core_v1.list_namespace.side_effect = Exception("Connection error")

        result = await scheduler.ping()

        assert result is False

    @pytest.mark.asyncio
    async def test_create_pod_basic(self, scheduler, mock_core_v1, basic_config):
        """测试创建基本 Pod"""
        mock_pod = Mock()
        mock_pod.metadata = Mock()
        mock_pod.metadata.name = "sandbox-test-session-abc123"
        mock_core_v1.create_namespaced_pod.return_value = mock_pod

        pod_name = await scheduler.create_container(basic_config)

        assert pod_name == "sandbox-test-session-abc123"
        mock_core_v1.create_namespaced_pod.assert_called_once()

        # 验证参数
        call_args = mock_core_v1.create_namespaced_pod.call_args
        assert call_args[1]["namespace"] == "test-namespace"

    @pytest.mark.asyncio
    async def test_create_pod_with_s3_workspace(self, scheduler, mock_core_v1):
        """测试创建带 S3 workspace 的 Pod"""
        config = ContainerConfig(
            image="python:3.11",
            name="test-session",
            cpu_limit="1",
            memory_limit="512Mi",
            disk_limit="1Gi",
            env_vars={},
            labels={},
            network_name="sandbox_network",
            workspace_path="s3://my-bucket/sessions/sess_123/"
        )

        mock_pod = Mock()
        mock_pod.metadata = Mock()
        mock_pod.metadata.name = "sandbox-test-session"
        mock_core_v1.create_namespaced_pod.return_value = mock_pod

        pod_name = await scheduler.create_container(config)

        assert pod_name == "sandbox-test-session"

        # 验证 Pod 配置包含两个容器（executor + s3-mount sidecar）
        call_args = mock_core_v1.create_namespaced_pod.call_args
        pod_spec = call_args[1]["body"]
        assert len(pod_spec.spec.containers) == 2
        container_names = [c.name for c in pod_spec.spec.containers]
        assert "executor" in container_names
        assert "s3-mount" in container_names

    @pytest.mark.asyncio
    async def test_create_pod_with_dependencies(self, scheduler, mock_core_v1):
        """测试创建带依赖安装的 Pod"""
        config = ContainerConfig(
            image="python:3.11",
            name="test-session",
            cpu_limit="1",
            memory_limit="512Mi",
            disk_limit="1Gi",
            env_vars={},
            labels={"dependencies": '[{"name": "requests", "version": "==2.31.0"}]'},
            network_name="sandbox_network",
            workspace_path="/workspace"
        )

        mock_pod = Mock()
        mock_pod.metadata = Mock()
        mock_pod.metadata.name = "sandbox-test-session"
        mock_core_v1.create_namespaced_pod.return_value = mock_pod

        pod_name = await scheduler.create_container(config)

        assert pod_name == "sandbox-test-session"

        # 验证 executor 容器有启动脚本
        call_args = mock_core_v1.create_namespaced_pod.call_args
        pod_spec = call_args[1]["body"]
        executor_container = next(c for c in pod_spec.spec.containers if c.name == "executor")
        assert executor_container.command is not None
        assert "pip3 install" in executor_container.command[2]

    @pytest.mark.asyncio
    async def test_stop_container(self, scheduler, mock_core_v1):
        """测试停止 Pod"""
        mock_core_v1.delete_namespaced_pod.return_value = None

        await scheduler.stop_container("test-pod", timeout=30)

        mock_core_v1.delete_namespaced_pod.assert_called_once()
        call_args = mock_core_v1.delete_namespaced_pod.call_args
        assert call_args[1]["name"] == "test-pod"
        assert call_args[1]["grace_period_seconds"] == 30

    @pytest.mark.asyncio
    async def test_remove_container_force(self, scheduler, mock_core_v1):
        """测试强制删除 Pod"""
        mock_core_v1.delete_namespaced_pod.return_value = None

        await scheduler.remove_container("test-pod", force=True)

        call_args = mock_core_v1.delete_namespaced_pod.call_args
        assert call_args[1]["grace_period_seconds"] == 0

    @pytest.mark.asyncio
    async def test_get_container_status_running(self, scheduler, mock_core_v1):
        """测试获取运行中 Pod 状态"""
        mock_pod = Mock()
        mock_pod.metadata = Mock()
        mock_pod.metadata.name = "test-pod"
        mock_pod.metadata.creation_timestamp = datetime.now(timezone.utc)
        mock_pod.status.phase = "Running"
        mock_pod.status.pod_ip = "10.244.1.5"
        mock_pod.status.start_time = datetime.now(timezone.utc)
        mock_pod.status.container_statuses = [
            Mock(
                name="executor",
                state=Mock(
                    running=Mock(),
                    terminated=None,
                    waiting=None,
                )
            )
        ]
        mock_pod.spec = Mock()
        mock_pod.spec.containers = [Mock(name="executor", image="python:3.11")]

        mock_core_v1.read_namespaced_pod.return_value = mock_pod

        status = await scheduler.get_container_status("test-pod")

        assert status.id == "test-pod"
        assert status.status == "running"
        assert status.ip_address == "10.244.1.5"

    @pytest.mark.asyncio
    async def test_is_container_running_true(self, scheduler, mock_core_v1):
        """测试检查 Pod 是否运行中（运行中）"""
        mock_pod = Mock()
        mock_pod.metadata = Mock()
        mock_pod.metadata.name = "test-pod"
        mock_pod.metadata.creation_timestamp = datetime.now(timezone.utc)
        mock_pod.status.phase = "Running"
        mock_pod.status.pod_ip = "10.244.1.5"
        mock_pod.status.start_time = datetime.now(timezone.utc)
        mock_pod.status.container_statuses = [
            Mock(
                name="executor",
                state=Mock(
                    running=Mock(),
                    terminated=None,
                    waiting=None,
                )
            )
        ]
        mock_pod.spec = Mock()
        mock_pod.spec.containers = [Mock(name="executor", image="python:3.11")]

        mock_core_v1.read_namespaced_pod.return_value = mock_pod

        is_running = await scheduler.is_container_running("test-pod")

        assert is_running is True

    @pytest.mark.asyncio
    async def test_is_container_running_false(self, scheduler, mock_core_v1):
        """测试检查 Pod 是否运行中（未运行）"""
        mock_pod = Mock()
        mock_pod.metadata = Mock()
        mock_pod.metadata.name = "test-pod"
        mock_pod.metadata.creation_timestamp = datetime.now(timezone.utc)
        mock_pod.status.phase = "Succeeded"
        mock_pod.status.pod_ip = "10.244.1.5"
        mock_pod.status.container_statuses = []

        mock_core_v1.read_namespaced_pod.return_value = mock_pod

        is_running = await scheduler.is_container_running("test-pod")

        assert is_running is False

    @pytest.mark.asyncio
    async def test_get_container_logs(self, scheduler, mock_core_v1):
        """测试获取 Pod 日志"""
        mock_core_v1.read_namespaced_pod_log.return_value = "log line 1\nlog line 2\n"

        logs = await scheduler.get_container_logs("test-pod", tail=100)

        assert logs == "log line 1\nlog line 2\n"
        mock_core_v1.read_namespaced_pod_log.assert_called_once()

    @pytest.mark.asyncio
    async def test_wait_container_success(self, scheduler, mock_core_v1):
        """测试等待 Pod 完成（成功）"""
        # 第一次调用返回运行中，第二次返回完成
        running_pod = Mock()
        running_pod.status.phase = "Running"
        running_pod.status.container_statuses = [
            Mock(
                name="executor",
                state=Mock(
                    running=Mock(),
                    terminated=None,
                )
            )
        ]

        succeeded_pod = Mock()
        succeeded_pod.status.phase = "Succeeded"
        succeeded_pod.status.container_statuses = []

        mock_core_v1.read_namespaced_pod.side_effect = [running_pod, succeeded_pod]
        mock_core_v1.read_namespaced_pod_log.return_value = "output\n"

        result = await scheduler.wait_container("test-pod")

        assert result.status == "completed"
        assert result.exit_code == 0
        assert result.stdout == "output\n"

    @pytest.mark.asyncio
    async def test_wait_container_timeout(self, scheduler, mock_core_v1):
        """测试等待 Pod 完成（超时）"""
        # 始终返回运行中
        running_pod = Mock()
        running_pod.status.phase = "Running"
        running_pod.status.container_statuses = [
            Mock(
                name="executor",
                state=Mock(
                    running=Mock(),
                    terminated=None,
                )
            )
        ]

        mock_core_v1.read_namespaced_pod.return_value = running_pod

        result = await scheduler.wait_container("test-pod", timeout=1)

        assert result.status == "timeout"
        assert "timed out" in result.stderr.lower()

    @pytest.mark.asyncio
    async def test_close(self, scheduler):
        """测试关闭连接"""
        await scheduler.close()
        assert scheduler._initialized is False

    def test_build_s3_sidecar_container(self, scheduler):
        """测试构建 S3 sidecar 容器"""
        container = scheduler._build_s3_sidecar_container(
            s3_bucket="test-bucket",
            s3_prefix="sessions/sess_123",
            s3_endpoint_url="http://localhost:9000",
            s3_access_key="minioadmin",
            s3_secret_key="minioadmin",
            dependencies=None,
        )

        assert container.name == "s3-mount"
        assert "s3fs" in container.command[2]

    def test_build_s3_sidecar_with_dependencies(self, scheduler):
        """测试构建带依赖的 S3 sidecar 容器"""
        dependencies = [{"name": "requests", "version": "==2.31.0"}]
        container = scheduler._build_s3_sidecar_container(
            s3_bucket="test-bucket",
            s3_prefix="sessions/sess_123",
            s3_endpoint_url="http://localhost:9000",
            s3_access_key="minioadmin",
            s3_secret_key="minioadmin",
            dependencies=dependencies,
        )

        assert "pip3 install" in container.command[2]
        assert "requests==2.31.0" in container.command[2]

    def test_build_executor_container(self, scheduler, basic_config):
        """测试构建 executor 容器"""
        container = scheduler._build_executor_container(
            config=basic_config,
            use_s3_mount=False,
            has_dependencies=False,
        )

        assert container.name == "executor"
        assert container.image == "python:3.11"

    def test_build_executor_container_with_s3_mount(self, scheduler):
        """测试构建带 S3 挂载的 executor 容器"""
        config = ContainerConfig(
            image="python:3.11",
            name="test-session",
            cpu_limit="1",
            memory_limit="512Mi",
            disk_limit="1Gi",
            env_vars={},
            labels={},
            network_name="sandbox_network",
            workspace_path="s3://my-bucket/sessions/sess_123/"
        )

        container = scheduler._build_executor_container(
            config=config,
            use_s3_mount=True,
            has_dependencies=False,
        )

        # 验证 S3 相关环境变量
        env_names = [env.name for env in container.env]
        assert "WORKSPACE_PATH" in env_names
        assert "S3_BUCKET" in env_names
        assert "S3_PREFIX" in env_names


class TestK8sSchedulerCSI:
    """K8s 容器调度器 CSI Driver 测试"""

    @pytest.fixture
    def mock_core_v1(self):
        """模拟 Kubernetes CoreV1Api"""
        api = Mock()
        return api

    @pytest.fixture
    def scheduler(self, mock_core_v1):
        """创建 K8s 调度器"""
        sched = K8sScheduler(namespace="test-namespace")
        sched._core_v1 = mock_core_v1
        sched._initialized = True
        return sched

    @pytest.fixture
    def s3_config(self):
        """S3 workspace 容器配置"""
        return ContainerConfig(
            image="python:3.11",
            name="test-session-abc123",
            cpu_limit="1",
            memory_limit="512Mi",
            disk_limit="1Gi",
            env_vars={"SESSION_ID": "test-session-abc123"},
            labels={},
            network_name="sandbox_network",
            workspace_path="s3://sandbox-workspace/sessions/test-session-abc123/"
        )

    @pytest.mark.asyncio


class TestS3PrefixHelper:
    """测试 S3 路径前缀辅助函数"""

    def test_s3_prefix_from_path_session_format(self):
        """测试从会话格式路径提取会话 ID"""
        from src.infrastructure.container_scheduler.k8s_scheduler import s3_prefix_from_path

        session_id = s3_prefix_from_path("sessions/test-001/workspace")
        assert session_id == "test-001"

    def test_s3_prefix_from_path_session_format_without_workspace(self):
        """测试从会话格式路径提取会话 ID（无 workspace 后缀）"""
        from src.infrastructure.container_scheduler.k8s_scheduler import s3_prefix_from_path

        session_id = s3_prefix_from_path("sessions/test-001")
        assert session_id == "test-001"

    def test_s3_prefix_from_path_non_session_format(self):
        """测试非会话格式路径返回原路径"""
        from src.infrastructure.container_scheduler.k8s_scheduler import s3_prefix_from_path

        result = s3_prefix_from_path("custom/path/to/files")
        assert result == "custom/path/to/files"

    def test_s3_prefix_from_path_with_trailing_slash(self):
        """测试带尾部斜杠的路径"""
        from src.infrastructure.container_scheduler.k8s_scheduler import s3_prefix_from_path

        session_id = s3_prefix_from_path("sessions/test-001/")
        assert session_id == "test-001"

