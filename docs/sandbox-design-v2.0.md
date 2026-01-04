# 沙箱平台技术方案设计

## 1. C4 架构设计

### 1.1 Level 1 - 系统上下文 (System Context)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AI Agent 沙箱平台                                    │
│                    (Sandbox Management Platform)                             │
└──────┬───────────────────────────────────────────────────────────┬──────────┘
       │                                                           │
       │ RESTful API / Python SDK                                  │
       │                                                           │
┌──────▼──────────┐                                         ┌──────▼──────────┐
│  AI Agent 系统   │                                         │  运维人员       │
│  (LangChain,    │                                         │  (DevOps)       │
│   CrewAI, etc.) │                                         │                 │
└─────────────────┘                                         └─────────────────┘
```

**外部系统说明：**
- **AI Agent 系统**: 主要用户，通过 SDK 或 REST API 调用沙箱执行代码
- **运维人员**: 负责平台部署、监控、配置管理

### 1.2 Level 2 - 容器架构 (Container)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         沙箱平台系统                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐           │
│  │  控制平面        │   │  运行时池        │   │  存储层          │           │
│  │  (Control Plane)│   │  (Runtime Pool) │   │  (Storage)      │           │
│  │                 │   │                 │   │                 │           │
│  │  - API Gateway  │   │  - Docker Runtime│  │  - 元数据存储    │           │
│  │  - Scheduler    │   │  - K8s Runtime   │  │  - 执行结果存储  │           │
│  │  - Session Mgr  │   │  - 注册中心      │  │  - 文件存储      │           │
│  │  - Monitor      │   │  - 健康检查      │  │  - 指标存储      │           │
│  │  - Template Mgr │   │                 │   │                 │           │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘           │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      消息总线 / 事件总线                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Level 3 - 组件架构 (Component)

#### 1.3.1 控制平面组件

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Control Plane Service                                │
│                        (FastAPI + asyncio)                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  REST API Layer (FastAPI Router)                                     │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  /sessions/*         │  /templates/*      │  /runtime/*             │   │
│  │  /execute/*          │  /results/*        │  /metrics/*             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ▲                                              │
│  ┌───────────────────────────┴─────────────────────────────────────────┐   │
│  │  业务逻辑层                                                         │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐           │   │
│  │  │Session Manager│  │  Scheduler    │  │Template Manager│           │   │
│  │  └───────────────┘  └───────────────┘  └───────────────┘           │   │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐           │   │
│  │  │Runtime Registry│  │  Monitor     │  │Result Collector│          │   │
│  │  └───────────────┘  └───────────────┘  └───────────────┘           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  数据访问层                                                         │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │   │
│  │  │ Storage API │  │Cache Layer  │  │Message Queue │                 │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 1.3.2 运行时组件

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Runtime Node                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Runtime Agent (运行时代理)                                           │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  - Session Lifecycle Management                                       │   │
│  │  - Code/Command Execution                                             │   │
│  │  - File Operations                                                    │   │
│  │  - Resource Monitoring                                                │   │
│  │  - Result Reporting                                                   │   │
│  │  - Heartbeat to Control Plane                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  隔离层                                                             │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  ┌─────────────────────────────────────────────────────────────┐    │   │
│  │  │  Docker Runtime Mode                                         │    │   │
│  │  │  ├─ Container Per Session                                    │    │   │
│  │  │  ├─ Bubblewrap Isolation (inside container)                  │    │   │
│  │  │  ├─ Network Control                                         │    │   │
│  │  │  └─ Resource Limits (cgroups)                               │    │   │
│  │  └─────────────────────────────────────────────────────────────┘    │   │
│  │  ┌─────────────────────────────────────────────────────────────┐    │   │
│  │  │  Kubernetes Runtime Mode                                     │    │   │
│  │  │  ├─ Pod Per Session                                         │    │   │
│  │  │  ├─ CRD: Sandbox/SandboxTemplate/SandboxClaim                │    │   │
│  │  │  ├─ Warm Pool Management                                     │    │   │
│  │  │  └─ Auto-scaling                                             │    │   │
│  │  └─────────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.4 Level 4 - 代码结构 (Code)

```
sandbox-platform/
├── control-plane/              # 控制平面服务
│   ├── src/
│   │   ├── api/               # REST API 层
│   │   │   ├── routes/
│   │   │   │   ├── sessions.py
│   │   │   │   ├── templates.py
│   │   │   │   ├── runtime.py
│   │   │   │   ├── execute.py
│   │   │   │   └── results.py
│   │   │   ├── middleware/    # 中间件
│   │   │   └── dependencies.py
│   │   ├── core/              # 核心业务逻辑
│   │   │   ├── session_manager.py
│   │   │   ├── scheduler.py
│   │   │   ├── runtime_registry.py
│   │   │   ├── template_manager.py
│   │   │   ├── monitor.py
│   │   │   └── result_collector.py
│   │   ├── models/            # Pydantic 模型
│   │   │   ├── session.py
│   │   │   ├── template.py
│   │   │   ├── runtime.py
│   │   │   └── execution.py
│   │   ├── storage/           # 存储抽象层
│   │   │   ├── metadata_store.py
│   │   │   ├── result_store.py
│   │   │   └── file_store.py
│   │   ├── scheduler/         # 调度策略
│   │   │   ├── strategies/
│   │   │   │   ├── round_robin.py
│   │   │   │   ├── least_loaded.py
│   │   │   │   └── resource_aware.py
│   │   │   └── base.py
│   │   └── config/            # 配置管理
│   │       ├── settings.py
│   │       └── logging.py
│   ├── tests/
│   └── Dockerfile
│
├── runtime/                    # 运行时服务
│   ├── src/
│   │   ├── agent/             # 运行时代理
│   │   │   ├── server.py      # HTTP Server
│   │   │   ├── handlers/      # 请求处理
│   │   │   ├── session.py     # Session 管理
│   │   │   └── heartbeat.py   # 心跳上报
│   │   ├── isolation/         # 隔离层实现
│   │   │   ├── docker.py
│   │   │   ├── kubernetes.py
│   │   │   └── bubblewrap.py
│   │   ├── executor/          # 代码执行器
│   │   │   ├── python.py
│   │   │   ├── shell.py
│   │   │   └── javascript.py
│   │   └── file_ops/          # 文件操作
│   │       ├── upload.py
│   │       └── download.py
│   ├── tests/
│   └── Dockerfile
│
├── sdk/                        # Python SDK
│   ├── src/
│   │   ├── client.py          # 同步客户端
│   │   ├── async_client.py    # 异步客户端
│   │   └── models.py          # 数据模型
│   ├── tests/
│   └── setup.py
│
├── proto/                      # 协议定义 (可选 gRPC)
│   └── sandbox_api.proto
│
└── deployment/                 # 部署配置
    ├── kubernetes/
    │   ├── control-plane/
    │   │   ├── deployment.yaml
    │   │   ├── service.yaml
    │   │   └── configmap.yaml
    │   ├── runtime/
    │   │   ├── deployment.yaml
    │   │   └── daemonset.yaml
    │   └── crd/               # Custom Resource Definitions
    │       ├── sandbox.yaml
    │       ├── sandboxtemplate.yaml
    │       └── sandboxclaim.yaml
    ├── docker/
    │   └── docker-compose.yaml
    └── helm/
        └── sandbox-platform/
```

---

## 2. 关键组件设计

### 2.1 控制平面服务 (Control Plane Service)

**技术栈**: FastAPI + asyncio + Python 3.11+

#### 2.1.1 会话管理器 (Session Manager)

```python
# core/session_manager.py
from typing import Dict, Optional
from datetime import datetime
import asyncio
from models.session import Session, SessionStatus, SessionConfig

class SessionManager:
    """会话生命周期管理"""

    def __init__(self, storage_backend, result_collector):
        self.storage = storage_backend
        self.result_collector = result_collector
        self._lock = asyncio.Lock()

    async def create_session(
        self,
        template_id: str,
        config: SessionConfig,
        runtime_node: str
    ) -> Session:
        """创建新会话"""
        session = Session(
            id=generate_session_id(),
            template_id=template_id,
            runtime_node=runtime_node,
            status=SessionStatus.CREATING,
            config=config,
            created_at=datetime.utcnow()
        )
        await self.storage.save_session(session)
        return session

    async def get_session(self, session_id: str) -> Optional[Session]:
        """获取会话信息"""
        return await self.storage.get_session(session_id)

    async def update_session_status(
        self,
        session_id: str,
        status: SessionStatus,
        metadata: Dict = None
    ):
        """更新会话状态"""
        session = await self.get_session(session_id)
        if session:
            session.status = status
            session.updated_at = datetime.utcnow()
            if metadata:
                session.metadata.update(metadata)
            await self.storage.save_session(session)

    async def terminate_session(self, session_id: str):
        """终止会话"""
        await self.update_session_status(session_id, SessionStatus.TERMINATED)
        # 通知运行时清理资源

    async def cleanup_expired_sessions(self):
        """清理过期会话"""
        # 定时任务，清理超时或僵尸会话
        pass
```

#### 2.1.2 调度器 (Scheduler)

```python
# core/scheduler.py
from abc import ABC, abstractmethod
from enum import Enum
import asyncio

class SchedulingStrategy(Enum):
    ROUND_ROBIN = "round_robin"
    LEAST_LOADED = "least_loaded"
    RESOURCE_AWARE = "resource_aware"

class SchedulingDecision:
    node_id: str
    score: float
    reason: str

class BaseScheduler(ABC):
    """调度器基类"""

    @abstractmethod
    async def select_runtime(
        self,
        template_id: str,
        requirements: Dict
    ) -> SchedulingDecision:
        pass

class RoundRobinScheduler(BaseScheduler):
    """轮询调度"""

    def __init__(self):
        self._index = 0
        self._lock = asyncio.Lock()

    async def select_runtime(
        self,
        template_id: str,
        requirements: Dict
    ) -> SchedulingDecision:
        async with self._lock:
            # 获取可用运行时节点列表
            nodes = await self.registry.get_available_nodes()
            if not nodes:
                raise NoAvailableRuntimeError()

            node = nodes[self._index % len(nodes)]
            self._index += 1
            return SchedulingDecision(
                node_id=node.id,
                score=1.0,
                reason="round_robin"
            )

class LeastLoadedScheduler(BaseScheduler):
    """最少负载调度"""

    async def select_runtime(
        self,
        template_id: str,
        requirements: Dict
    ) -> SchedulingDecision:
        nodes = await self.registry.get_available_nodes()
        if not nodes:
            raise NoAvailableRuntimeError()

        # 选择当前会话数最少的节点
        node = min(nodes, key=lambda n: n.session_count)
        return SchedulingDecision(
            node_id=node.id,
            score=1.0 / (node.session_count + 1),
            reason=f"least_loaded: {node.session_count} sessions"
        )

class ResourceAwareScheduler(BaseScheduler):
    """资源感知调度"""

    async def select_runtime(
        self,
        template_id: str,
        requirements: Dict
    ) -> SchedulingDecision:
        nodes = await self.registry.get_available_nodes()
        if not nodes:
            raise NoAvailableRuntimeError()

        # 计算每个节点的适合度分数
        scores = []
        for node in nodes:
            score = self._calculate_score(node, requirements)
            scores.append((node, score))

        # 选择分数最高的节点
        best_node, best_score = max(scores, key=lambda x: x[1])
        return SchedulingDecision(
            node_id=best_node.id,
            score=best_score,
            reason=f"resource_score: {best_score:.2f}"
        )

    def _calculate_score(self, node, requirements):
        """根据资源使用情况计算分数"""
        cpu_available = node.resources.cpu_total - node.resources.cpu_used
        mem_available = node.resources.memory_total - node.resources.memory_used

        required_cpu = requirements.get('cpu', 1)
        required_mem = requirements.get('memory', 1024)

        if cpu_available < required_cpu or mem_available < required_mem:
            return 0.0

        # 分数计算: 考虑资源余量和负载均衡
        cpu_score = cpu_available / node.resources.cpu_total
        mem_score = mem_available / node.resources.memory_total
        load_score = 1.0 / (node.session_count + 1)

        return (cpu_score * 0.4 + mem_score * 0.4 + load_score * 0.2)
```

#### 2.1.3 运行时注册中心 (Runtime Registry)

```python
# core/runtime_registry.py
from typing import Dict, List
from datetime import datetime, timedelta
import asyncio

class RuntimeNode:
    id: str
    type: str  # "docker" or "kubernetes"
    endpoint: str
    capabilities: List[str]
    resources: ResourceInfo
    health: HealthStatus
    last_heartbeat: datetime

class ResourceInfo:
    cpu_total: float
    cpu_used: float
    memory_total: int  # MB
    memory_used: int
    session_count: int

class HealthStatus(str, Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"

class RuntimeRegistry:
    """运行时节点注册中心"""

    def __init__(self, heartbeat_timeout: int = 30):
        self.nodes: Dict[str, RuntimeNode] = {}
        self.heartbeat_timeout = heartbeat_timeout
        self._lock = asyncio.Lock()

    async def register(self, node: RuntimeNode):
        """注册运行时节点"""
        async with self._lock:
            self.nodes[node.id] = node
            node.last_heartbeat = datetime.utcnow()

    async def heartbeat(self, node_id: str, resources: ResourceInfo):
        """处理心跳"""
        async with self._lock:
            if node_id in self.nodes:
                node = self.nodes[node_id]
                node.resources = resources
                node.last_heartbeat = datetime.utcnow()
                node.health = HealthStatus.HEALTHY

    async def get_available_nodes(self) -> List[RuntimeNode]:
        """获取可用节点"""
        async with self._lock:
            now = datetime.utcnow()
            return [
                node for node in self.nodes.values()
                if node.health == HealthStatus.HEALTHY
                and (now - node.last_heartbeat).seconds < self.heartbeat_timeout
            ]

    async def check_health(self):
        """定期健康检查，标记超时节点"""
        async with self._lock:
            now = datetime.utcnow()
            for node in self.nodes.values():
                if (now - node.last_heartbeat).seconds >= self.heartbeat_timeout:
                    node.health = HealthStatus.UNHEALTHY
                    # 触发故障转移
```

#### 2.1.4 模板管理器 (Template Manager)

```python
# core/template_manager.py
from typing import Dict, Optional
from models.template import Template

class TemplateManager:
    """模板管理"""

    def __init__(self, storage_backend):
        self.storage = storage_backend
        self._cache: Dict[str, Template] = {}
        self._lock = asyncio.Lock()

    async def create_template(self, template: Template) -> Template:
        """创建模板"""
        # 验证模板配置
        self._validate_template(template)
        await self.storage.save_template(template)
        async with self._lock:
            self._cache[template.id] = template
        return template

    async def get_template(self, template_id: str) -> Optional[Template]:
        """获取模板"""
        # 先查缓存
        if template_id in self._cache:
            return self._cache[template_id]

        template = await self.storage.get_template(template_id)
        if template:
            async with self._lock:
                self._cache[template_id] = template
        return template

    def _validate_template(self, template: Template):
        """验证模板配置"""
        if not template.image:
            raise ValueError("Template must specify an image")
        if template.resources.cpu <= 0:
            raise ValueError("CPU quota must be positive")
        # 更多验证...

    async def list_templates(self) -> List[Template]:
        """列出所有模板"""
        return await self.storage.list_templates()
```

### 2.2 运行时服务 (Runtime Service)

#### 2.2.1 Docker 运行时

```python
# isolation/docker.py
import docker
import asyncio
from typing import Optional

class DockerIsolation:
    """Docker 容器隔离实现"""

    def __init__(self):
        self.client = docker.from_env()
        self.containers: Dict[str, docker.models.containers.Container] = {}

    async def create_sandbox(
        self,
        session_id: str,
        template: Template
    ) -> str:
        """创建隔离容器"""
        container = self.client.containers.run(
            image=template.image,
            command=f"sleep infinity",
            detach=True,
            name=f"sandbox-{session_id}",
            # 资源限制
            cpu_quota=int(template.resources.cpu * 100000),
            mem_limit=f"{template.resources.memory}m",
            # 安全配置
            security_opt=[
                "no-new-privileges:true",
                "seccomp=default.json"
            ],
            cap_drop=["ALL"],
            # 网络隔离
            network_mode="none" if not template.allow_network else "bridge",
            # 挂载点
            volumes={
                f"/tmp/sandbox/{session_id}": {
                    "bind": "/workspace",
                    "mode": "rw"
                }
            },
            # 环境
            environment=template.env,
        )

        self.containers[session_id] = container
        return container.id

    async def execute_code(
        self,
        session_id: str,
        code: str,
        language: str = "python"
    ) -> ExecutionResult:
        """在容器中执行代码"""
        container = self.containers.get(session_id)
        if not container:
            raise SessionNotFoundError(session_id)

        # 准备执行命令
        if language == "python":
            cmd = f"python3 -c {shlex.quote(code)}"
        else:
            cmd = code

        # 执行命令
        exit_code, output = container.exec_run(
            cmd,
            workdir="/workspace",
            environment={"PYTHONUNBUFFERED": "1"}
        )

        return ExecutionResult(
            exit_code=exit_code,
            output=output.decode("utf-8"),
            exec_time=time.time() - start_time
        )

    async def destroy_sandbox(self, session_id: str):
        """销毁容器"""
        container = self.containers.pop(session_id, None)
        if container:
            container.remove(force=True)

    async def get_resource_usage(self, session_id: str) -> ResourceUsage:
        """获取资源使用情况"""
        container = self.containers.get(session_id)
        if not container:
            raise SessionNotFoundError(session_id)

        stats = container.stats(stream=False)
        return ResourceUsage(
            cpu_percent=self._calculate_cpu_percent(stats),
            memory_mb=stats["memory_stats"].get("usage", 0) // 1024 // 1024
        )
```

#### 2.2.2 Kubernetes 运行时

```python
# isolation/kubernetes.py
from kubernetes import client, config
import asyncio

class KubernetesIsolation:
    """Kubernetes Pod 隔离实现"""

    def __init__(self):
        config.load_kube_config()
        self.core_v1 = client.CoreV1Api()
        self.custom_api = client.CustomObjectsApi()

    async def create_sandbox(
        self,
        session_id: str,
        template: Template
    ) -> str:
        """创建 SandboxClaim，触发 Pod 创建"""

        # 创建 SandboxClaim CR
        sandbox_claim = {
            "apiVersion": "sandbox.example.com/v1alpha1",
            "kind": "SandboxClaim",
            "metadata": {
                "name": f"sb-{session_id}",
                "namespace": "default"
            },
            "spec": {
                "templateRef": {
                    "name": template.id
                },
                "session_id": session_id,
                "ttl": template.ttl
            }
        }

        self.custom_api.create_namespaced_custom_object(
            group="sandbox.example.com",
            version="v1alpha1",
            namespace="default",
            plural="sandboxclaims",
            body=sandbox_claim
        )

        # 等待 Pod 就绪
        await self._wait_for_pod_ready(session_id)
        return f"sb-{session_id}"

    async def _wait_for_pod_ready(self, session_id: str, timeout: int = 60):
        """等待 Pod 就绪"""
        start = time.time()
        while time.time() - start < timeout:
            pod = self.core_v1.read_namespaced_pod(
                name=f"sb-{session_id}",
                namespace="default"
            )
            if pod.status.phase == "Running":
                return
            await asyncio.sleep(1)
        raise TimeoutError(f"Pod not ready for session {session_id}")

    async def execute_code(
        self,
        session_id: str,
        code: str,
        language: str = "python"
    ) -> ExecutionResult:
        """通过 Pod exec 执行代码"""

        # 调用 Runtime Agent API 执行代码
        # Runtime Agent 会以 Sidecar 形式运行在 Pod 中
        agent_url = f"http://sb-{session_id}:8080/execute"
        async with aiohttp.ClientSession() as session:
            async with session.post(
                agent_url,
                json={"code": code, "language": language}
            ) as resp:
                return await resp.json()

    async def destroy_sandbox(self, session_id: str):
        """删除 SandboxClaim，触发 Pod 清理"""
        self.custom_api.delete_namespaced_custom_object(
            group="sandbox.example.com",
            version="v1alpha1",
            namespace="default",
            plural="sandboxclaims",
            name=f"sb-{session_id}"
        )
```

### 2.3 SDK 设计

```python
# sdk/client.py
from typing import Optional, Dict, Any
import httpx
from models.session import Session, SessionConfig
from models.execution import ExecutionResult

class SandboxClient:
    """同步 SDK 客户端"""

    def __init__(
        self,
        base_url: str = "http://localhost:8000",
        api_key: Optional[str] = None
    ):
        self.base_url = base_url.rstrip("/")
        self.client = httpx.Client(
            headers={"Authorization": f"Bearer {api_key}"} if api_key else None
        )

    def create_session(
        self,
        template_id: str,
        config: Optional[SessionConfig] = None
    ) -> Session:
        """创建会话"""
        resp = self.client.post(
            f"{self.base_url}/workspace/se/session",
            json={"template_id": template_id, **(config or {})}
        )
        resp.raise_for_status()
        return Session(**resp.json())

    def execute_python(
        self,
        session_id: str,
        code: str,
        timeout: int = 300
    ) -> ExecutionResult:
        """执行 Python 代码"""
        resp = self.client.post(
            f"{self.base_url}/workspace/se/execute_code/{session_id}",
            json={"code": code, "timeout": timeout}
        )
        resp.raise_for_status()
        return ExecutionResult(**resp.json())

    def execute_command(
        self,
        session_id: str,
        command: str,
        timeout: int = 300
    ) -> ExecutionResult:
        """执行 Shell 命令"""
        resp = self.client.post(
            f"{self.base_url}/workspace/se/execute/{session_id}",
            json={"command": command, "timeout": timeout}
        )
        resp.raise_for_status()
        return ExecutionResult(**resp.json())

    def upload_file(
        self,
        session_id: str,
        file_path: str,
        content: bytes
    ):
        """上传文件到会话"""
        files = {"file": (file_path, content)}
        self.client.post(
            f"{self.base_url}/workspace/se/upload/{session_id}",
            files=files
        )

    def download_file(self, session_id: str, filename: str) -> bytes:
        """从会话下载文件"""
        resp = self.client.get(
            f"{self.base_url}/workspace/se/download/{session_id}/{filename}"
        )
        resp.raise_for_status()
        return resp.content

    def close(self):
        """关闭客户端"""
        self.client.close()

# 使用示例
def example():
    client = SandboxClient("http://localhost:8000")

    # 创建会话
    session = client.create_session(template_id="python-default")

    # 执行代码
    result = client.execute_python(
        session.id,
        code="print('Hello from sandbox!')"
    )
    print(result.output)

    client.close()
```

---

## 3. 关键流程设计

### 3.1 会话创建流程

```
┌─────────┐                              ┌─────────────┐
│  Agent  │                              │Control Plane│
└────┬────┘                              └──────┬──────┘
     │                                          │
     │  POST /sessions (template_id)            │
     │─────────────────────────────────────────>│
     │                                          │
     │                                 1. Validate template
     │                                 2. Select runtime (Scheduler)
     │                                          │
     │                              3. POST /runtime/create_session
     │                                          │
     │                              ┌───────────▼───────────┐
     │                              │     Runtime Node      │
     │                              └───────────┬───────────┘
     │                                          │
     │                              4. Create container/Pod
     │                              5. Init isolation env
     │                                          │
     │<─────────────────────────────────────────│
     │  HTTP 202 Accepted {session_id}          │
     │                                          │
     │                              6. POST /control_plane/session_ready
     │                              ┌───────────▼───────────┐
     │                              │  Control Plane        │
     │                              │  (Update status:      │
     │                              │   CREATING -> READY)  │
     │                              └───────────────────────┘
```

### 3.2 代码执行流程

```
┌─────────┐       ┌─────────────┐       ┌─────────────┐       ┌──────────┐
│  Agent  │       │Control Plane│       │ Runtime Node│       │Container │
└────┬────┘       └──────┬──────┘       └──────┬──────┘       └────┬─────┘
     │                   │                      │                    │
     │ POST /execute     │                      │                    │
     │──────────────────>│                      │                    │
     │                   │                      │                    │
     │                   │ Route to runtime     │                    │
     │                   │─────────────────────>│                    │
     │                   │                      │                    │
     │  HTTP 202 Accepted│                      │ Exec in container  │
     │<──────────────────│                      │───────────────────>│
     │                   │                      │                    │
     │                   │                      │<───────────────────│
     │                   │                      │  stdout/stderr     │
     │                   │                      │                    │
     │                   │<─────────────────────│                    │
     │                   │  POST /result        │                    │
     │                   │                      │                    │
     │ GET /result/{id}  │                      │                    │
     │──────────────────>│                      │                    │
     │                   │                      │                    │
     │<──────────────────│                      │                    │
     │  Execution Result │                      │                    │
```

### 3.3 故障检测与转移流程

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│Runtime Node 1│      │Runtime Node 2│      │Control Plane │
└──────┬───────┘      └──────┬───────┘      └──────┬───────┘
       │                     │                     │
       │  Heartbeat (every 5s)                   │
       │────────────────────────────────────────>│
       │                     │                     │
       │  Heartbeat (every 5s)                   │
       │────────────────────────────────────────>│
       │                     │                     │
       │  [Network Fail]     │                     │
       │  X                  │                     │
       │                     │                     │
       │                     │  1. Heartbeat timeout (>30s)
       │                     │<────────────────────│
       │                     │                     │
       │                     │  2. Mark node as UNHEALTHY
       │                     │                     │
       │                     │  3. Reschedule affected sessions
       │                     │────────────────────>│
       │                     │                     │
       │                     │<────────────────────│
       │  4. Create new sessions on healthy node
       │                     │                     │
```

### 3.4 Warm Pool 管理流程

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│Control Plane│         │Runtime Agent│         │   Warm Pool │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │  Init                 │                       │
       │  1. Configure pool size│                       │
       │  (e.g., 5 instances)  │                       │
       │                       │                       │
       │  2. Start pre-warming │                       │
       │──────────────────────>│                       │
       │                       │                       │
       │                       │  Create idle containers│
       │                       │──────────────────────>│
       │                       │                       │
       │                       │<──────────────────────│
       │  3. Report ready      │                       │
       │<──────────────────────│                       │
       │                       │                       │
       │  4. Incoming request  │                       │
       │                       │                       │
       │  5. Assign from pool  │                       │
       │──────────────────────>│                       │
       │                       │                       │
       │                       │  Mark instance as used│
       │                       │──────────────────────>│
       │                       │                       │
       │  6. Return immediately (no cold start delay)  │
       │<──────────────────────│                       │
       │                       │                       │
       │  7. Background: replenish pool               │
       │──────────────────────>│                       │
       │                       │  Create new idle instance
       │                       │──────────────────────>│
```

---

## 4. 数据模型

### 4.1 核心数据模型

```python
# models/session.py
from pydantic import BaseModel
from enum import Enum
from datetime import datetime
from typing import Dict, Optional

class SessionStatus(str, Enum):
    CREATING = "creating"
    READY = "ready"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    TERMINATED = "terminated"

class SessionConfig(BaseModel):
    timeout_seconds: int = 300
    allow_network: bool = False
    environment: Dict[str, str] = {}

class Session(BaseModel):
    id: str
    template_id: str
    runtime_node: str
    status: SessionStatus
    config: SessionConfig
    created_at: datetime
    updated_at: datetime
    metadata: Dict = {}

# models/template.py
class ResourceLimit(BaseModel):
    cpu: float  # CPU cores
    memory: int  # MB
    disk: int = 1024  # MB

class SecurityPolicy(BaseModel):
    allow_network: bool = False
    allowed_domains: list = []
    read_only_filesystem: bool = False

class Template(BaseModel):
    id: str
    name: str
    image: str
    resources: ResourceLimit
    security: SecurityPolicy = SecurityPolicy()
    env: Dict[str, str] = {}
    preinstalled_packages: list = []

# models/execution.py
class ExecutionResult(BaseModel):
    session_id: str
    execution_id: str
    exit_code: int
    stdout: str
    stderr: str
    result: Optional[dict] = None
    metrics: dict = {}
    duration_ms: int

# models/runtime.py
class RuntimeInfo(BaseModel):
    id: str
    type: str  # "docker" | "kubernetes"
    endpoint: str
    resources: ResourceInfo
    health: str

class ResourceInfo(BaseModel):
    cpu_total: float
    cpu_used: float
    memory_total: int
    memory_used: int
    session_count: int
```

---

## 5. API 设计

### 5.1 控制平面 API

```
# 会话管理
POST   /api/v1/sessions                    # 创建会话
GET    /api/v1/sessions/{id}               # 获取会话详情
GET    /api/v1/sessions                    # 列出会话
DELETE /api/v1/sessions/{id}               # 终止会话

# 代码执行
POST   /api/v1/sessions/{id}/execute       # 执行代码/命令
GET    /api/v1/sessions/{id}/status     # 查询执行状态
GET    /api/v1/sessions/{id}/results       # 获取执行结果

# 文件操作
POST   /api/v1/sessions/{id}/files/upload  # 上传文件
GET    /api/v1/sessions/{id}/files/{name}  # 下载文件

# 模板管理
POST   /api/v1/templates                   # 创建模板
GET    /api/v1/templates                   # 列出模板
GET    /api/v1/templates/{id}              # 获取模板详情
PUT    /api/v1/templates/{id}              # 更新模板
DELETE /api/v1/templates/{id}              # 删除模板

# 运行时管理
GET    /api/v1/runtimes                    # 列出运行时节点
GET    /api/v1/runtimes/{id}/health        # 获取节点健康状态
GET    /api/v1/runtimes/{id}/metrics       # 获取节点指标

# 监控
GET    /api/v1/metrics                     # 获取平台指标
GET    /api/v1/health                      # 健康检查
```

### 5.2 运行时 API

```
# 运行时内部 API（由控制平面调用）
POST   /runtime/sessions                   # 创建会话
POST   /runtime/sessions/{id}/execute      # 执行代码
DELETE /runtime/sessions/{id}              # 销毁会话
GET    /runtime/sessions/{id}/status       # 查询状态
GET    /runtime/health                     # 健康检查
GET    /runtime/metrics                    # 资源指标
```

---

## 6. 部署架构

### 6.1 单机 Docker 模式

```
┌─────────────────────────────────────────────────────────────┐
│                        Host Machine                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         Control Plane (Docker Container)              │  │
│  │         FastAPI + PostgreSQL                          │  │
│  └───────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         Runtime (Docker Container)                     │  │
│  │         Runtime Agent + Docker Socket Mount           │  │
│  └───────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         Sandbox Containers (Per Session)               │  │
│  │         ├─ sandbox-session-1                           │  │
│  │         ├─ sandbox-session-2                           │  │
│  │         └─ sandbox-session-N                           │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Kubernetes 模式

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Kubernetes Cluster                          │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Control Plane Namespace                                       │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐ │  │
│  │  │ Control Plane   │  │   PostgreSQL    │  │    Redis       │ │  │
│  │  │   (Deployment)  │  │   (StatefulSet) │  │   (Deployment) │ │  │
│  │  │  3 Replicas     │  │                 │  │                │ │  │
│  │  └─────────────────┘  └─────────────────┘  └────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Runtime Namespace                                             │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │  Runtime Agent (DaemonSet - per node)                   │  │  │
│  │  │  - Manages sandbox containers/pods on node              │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │  Warm Pool Pods                                         │  │  │
│  │  │  ├─ sandbox-warm-1                                      │  │  │
│  │  │  ├─ sandbox-warm-2                                      │  │  │
│  │  │  └─ sandbox-warm-N                                      │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │  Active Session Pods                                    │  │  │
│  │  │  ├─ sb-session-{uuid}-1                                 │  │  │
│  │  │  ├─ sb-session-{uuid}-2                                 │  │  │
│  │  │  └─ sb-session-{uuid}-N                                 │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Monitoring Namespace                                         │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────────────────┐ │  │
│  │  │ Prometheus  │  │  Grafana    │  │     AlertManager      │ │  │
│  │  └─────────────┘  └─────────────┘  └────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. 安全设计

### 7.1 多层隔离

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Security Layers                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Layer 1: 容器隔离                                                   │
│  ├─ Linux Namespaces (pid, net, ipc, uts, mnt)                     │
│  ├─ Control Groups (cgroups) - 资源限制                             │
│  └─ Seccomp Filters - 系统调用限制                                   │
│                                                                     │
│  Layer 2: 容器安全配置                                               │
│  ├─ Non-root user                                                   │
│  ├─ no-new-privileges                                               │
│  ├─ Drop all capabilities                                          │
│  ├─ Read-only root filesystem (可选)                                │
│  └─ Custom seccomp profile                                          │
│                                                                     │
│  Layer 3: Bubblewrap 隔离 (可选增强)                                  │
│  ├─ User namespace                                                  │
│  ├─ PID namespace                                                  │
│  ├─ Mount namespace                                                │
│  └─ Network namespace                                              │
│                                                                     │
│  Layer 4: 网络隔离                                                   │
│  ├─ Default no network                                             │
│  ├─ Network policies (K8s)                                         │
│  └─ Allowed domains whitelist                                      │
│                                                                     │
│  Layer 5: 应用层安全                                                 │
│  ├─ Input validation                                               │
│  ├─ Resource limits (CPU, memory, timeout)                         │
│  └─ File access restrictions                                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8. 监控与可观测性

### 8.1 指标收集

```python
# 关键指标
metrics = {
    # 业务指标
    "sessions_created_total": "Counter",
    "sessions_active": "Gauge",
    "executions_total": "Counter",
    "executions_duration_seconds": "Histogram",
    "executions_errors_total": "Counter",

    # 运行时指标
    "runtime_nodes_healthy": "Gauge",
    "runtime_cpu_usage_percent": "Gauge",
    "runtime_memory_usage_bytes": "Gauge",
    "runtime_session_count": "Gauge",

    # 性能指标
    "api_request_duration_seconds": "Histogram",
    "api_requests_total": "Counter",
    "warm_pool_size": "Gauge",
    "warm_pool_hits_total": "Counter",
}

# Prometheus Exporter
from prometheus_client import Counter, Histogram, Gauge

sessions_created = Counter('sessions_created_total', 'Total sessions created')
execution_duration = Histogram('execution_duration_seconds', 'Execution duration')
```

### 8.2 日志格式

```json
{
  "timestamp": "2025-12-30T10:30:00Z",
  "level": "info",
  "service": "control-plane",
  "trace_id": "abc123",
  "session_id": "sess-456",
  "event": "session_created",
  "runtime_node": "runtime-1",
  "template_id": "python-default",
  "metadata": {}
}
```

---

## 9. 性能优化

### 9.1 两阶段加载

```python
class TwoPhaseExecutor:
    """两阶段代码执行优化"""

    async def phase1_base_environment(self, template):
        """阶段1: 基础环境（预加载）"""
        # 基础镜像已包含常用库
        # numpy, pandas, requests, etc.
        pass

    async def phase2_user_dependencies(self, session_id, requirements):
        """阶段2: 用户依赖（按需安装）"""
        # 安装用户指定的额外包
        # pip install -r requirements.txt
        pass
```

### 9.2 Warm Pool 优化

```python
class WarmPoolManager:
    """预热池管理"""

    def __init__(self, pool_size: int = 5):
        self.pool_size = pool_size
        self.idle_instances: asyncio.Queue = asyncio.Queue()
        self.used_instances: set = set()

    async def initialize(self):
        """初始化预热池"""
        for _ in range(self.pool_size):
            instance = await self._create_idle_instance()
            await self.idle_instances.put(instance)

    async def acquire(self) -> SandboxInstance:
        """获取实例（无等待）"""
        instance = await self.idle_instances.get()
        self.used_instances.add(instance)
        # 触发后台补充
        asyncio.create_task(self._replenish())
        return instance

    async def release(self, instance: SandboxInstance):
        """释放实例回池或销毁"""
        self.used_instances.remove(instance)
        if instance.is_healthy():
            await self.idle_instances.put(instance)
        else:
            await instance.destroy()

    async def _replenish(self):
        """补充池到目标大小"""
        while self.idle_instances.qsize() < self.pool_size:
            instance = await self._create_idle_instance()
            await self.idle_instances.put(instance)
```

---

## 10. 扩展性设计

### 10.1 插件化调度器

```python
# scheduler/plugin.py
class SchedulerPlugin(ABC):
    """调度器插件接口"""

    @abstractmethod
    async def before_schedule(self, context: ScheduleContext):
        """调度前钩子"""
        pass

    @abstractmethod
    async def after_schedule(self, context: ScheduleContext, result: ScheduleResult):
        """调度后钩子"""
        pass

# 插件示例: 亲和性调度
class AffinityPlugin(SchedulerPlugin):
    async def before_schedule(self, context: ScheduleContext):
        # 根据会话标签选择有亲和性的节点
        pass
```

### 10.2 多语言 SDK 支持

```
sdk/
├── python/
│   ├── src/
│   │   ├── client.py
│   │   └── async_client.py
│   └── setup.py
├── javascript/
│   ├── src/
│   │   ├── client.ts
│   │   └── async_client.ts
│   └── package.json
├── go/
│   ├── client.go
│   └── go.mod
└── java/
    ├── src/
    │   └── main/java/
    │       └── SandboxClient.java
    └── pom.xml
```

---

## 11. 总结

本技术方案基于产品需求文档，设计了完整的 AI Agent 沙箱平台架构：

1. **C4 架构**: 从系统上下文到代码结构，四层架构清晰
2. **关键组件**: 控制平面、运行时、SDK 完整设计
3. **关键流程**: 会话创建、代码执行、故障转移等核心流程
4. **扩展性**: 支持水平扩展、插件化、多语言 SDK
5. **安全性**: 多层隔离确保安全执行
6. **性能**: Warm Pool、两阶段加载优化性能

下一步可基于此设计进行详细开发和实现。
