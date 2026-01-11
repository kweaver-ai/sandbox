# 沙箱平台技术方案设计- V2.1
## 1. 架构设计
### 1.1 整体架构

系统采用管理中心（Control Plane）与容器调度器（Container Scheduler）分离的云原生架构，支持 Docker 和 Kubernetes 两种部署模式。
核心设计原则：

- 控制平面无状态，支持水平扩展
- 容器调度器池化管理，动态伸缩
- 协议驱动的解耦设计
- 多层安全隔离
- 异步高并发处理


### 1.2 C4 架构模型
#### C4 Level 1: 系统上下文
```mermaid
graph TB
    subgraph External["外部系统"]
        上层服务["Data Agent/Operator Platform"]
        Dev["开发者<br/>(通过 SDK/API)"]
        K8s["Kubernetes 集群"]
        Docker["Docker Engine"]
    end

    subgraph SandboxPlatform["Python 沙箱平台"]
        ControlPlane["管理中心<br/>(Control Plane)"]
        ContainerScheduler["Container Scheduler 模块"]
    end

    上层服务 -->|执行代码请求| ControlPlane
    Dev -->|SDK/API 调用| ControlPlane
    ContainerScheduler -->|直接调用| K8s
    ContainerScheduler -->|直接访问| Docker
    ContainerScheduler -->|上报结果| ControlPlane

    style SandboxPlatform fill:#e1f5ff
    style External fill:#fff4e6
```
外部交互：

- DataAgent/Operator Platform 系统通过 RESTful API 发起代码执行请求
- 开发者通过 Python SDK 集成沙箱能力
- 依赖 Kubernetes/Docker 提供容器基础设施


#### C4 Level 2: 容器视图
```mermaid
graph TB
    subgraph ControlPlane["管理中心 (Control Plane)"]
        API["API Gateway<br/>(FastAPI)"]
        Scheduler["调度器<br/>(Scheduler)"]
        SessionMgr["会话管理器<br/>(Session Manager)"]
        TemplateMgr["模板管理器<br/>(Template Manager)"]
        Monitor["监控探针<br/>(Health Probe)"]
        ResultStore["结果存储<br/>(Result Store)"]
        SessionCleanup["会话清理服务<br/>(Session Cleanup)"]
    end

    subgraph ContainerScheduler["Container Scheduler 模块"]
        DockerRuntime["Docker Scheduler"]
        K8sRuntime["K8s Scheduler"]
    end

    subgraph Sandbox["沙箱实例"]
        Container["容器<br/>(Docker/Pod)"]
        BubbleWrap["Bubblewrap<br/>(进程隔离)"]
        Executor["执行器<br/>(Code Executor)"]
    end

    subgraph Storage["存储层"]
        MariaDB["MariaDB<br/>(会话状态/模板)"]
        S3["对象存储 S3<br/>(workspace 文件)"]
        Etcd["Etcd<br/>(配置中心)"]
    end

    API --> Scheduler
    API --> SessionMgr
    API --> TemplateMgr
    Scheduler --> Monitor
    Scheduler --> DockerRuntime
    Scheduler --> K8sRuntime
    SessionMgr --> MariaDB
    TemplateMgr --> MariaDB
    Monitor --> DockerRuntime
    Monitor --> K8sRuntime
    ResultStore --> S3
    SessionCleanup --> SessionMgr

    DockerRuntime --> Container
    K8sRuntime --> Container
    Container --> BubbleWrap
    BubbleWrap --> Executor
    Executor -->|上报结果| API

    TemplateMgr --> Etcd

    style ControlPlane fill:#bbdefb
    style ContainerScheduler fill:#c8e6c9
    style Sandbox fill:#fff9c4
    style Storage fill:#f8bbd0
```
关键容器：

- API Gateway: 统一入口，基于 FastAPI 实现
- 调度器: 智能任务分发和资源调度
- 会话管理器: 会话生命周期管理
- Container Scheduler: Docker/K8s 运行时实例管理
- 存储层：
  - MariaDB（会话状态/模板/执行记录）
  - S3 对象存储（workspace 文件，通过 Volume 挂载到容器）
  - Etcd（配置中心）

**存储架构说明**：
- workspace 目录通过 S3 CSI Driver 或类似机制挂载为容器 Volume
- 执行时生成的文件直接写入 workspace，自动持久化到 S3
- MariaDB 存储 stdout、stderr、执行状态和文件列表（artifacts）
- 下载文件时通过文件 API 直接从 S3 获取

#### 部署架构
```mermaid
graph TB
    subgraph Internet["🌐 互联网"]
        User["👤 开发者/Agent系统"]
    end
    
    subgraph K8sCluster["☸️ Kubernetes 集群"]
        
        subgraph IngressLayer["入口层"]
            Ingress["Ingress Controller<br/>Nginx/Traefik"]
            LB["Load Balancer<br/>L4/L7"]
        end
        
        subgraph ControlPlaneNS["📦 Namespace: sandbox-system"]
            subgraph ControlPlaneDeployment["Deployment: control-plane"]
                CP1["Pod: control-plane-1<br/>├─ API Gateway<br/>├─ Scheduler<br/>├─ Session Manager<br/>└─ Health Probe"]
                CP2["Pod: control-plane-2<br/>├─ API Gateway<br/>├─ Scheduler<br/>├─ Session Manager<br/>└─ Health Probe"]
                CP3["Pod: control-plane-3<br/>├─ API Gateway<br/>├─ Scheduler<br/>├─ Session Manager<br/>└─ Health Probe"]
            end
            
            CPService["Service: control-plane-svc<br/>Type: ClusterIP<br/>Port: 8000"]
            
            HPA["HPA<br/>Min: 3, Max: 10<br/>CPU Target: 70%"]
        end
        
        subgraph RuntimeNS["🔒 Namespace: sandbox-runtime"]

            subgraph ActiveSandboxGroup["活跃沙箱"]
                SB1["Pod: sandbox-abc123<br/>├─ Session: abc123<br/>├─ Status: Executing<br/>└─ CPU: 0.8, Mem: 400Mi"]
                SB2["Pod: sandbox-def456<br/>├─ Session: def456<br/>├─ Status: Idle<br/>└─ CPU: 0.1, Mem: 200Mi"]
                SB3["Pod: sandbox-xyz789<br/>├─ Session: xyz789<br/>├─ Status: Executing<br/>└─ CPU: 1.0, Mem: 512Mi"]
            end

            NetworkPolicy["NetworkPolicy<br/>- 禁止 Pod 间通信<br/>- 仅允许访问管理中心<br/>- 可选白名单外部访问"]
        end
        
        subgraph DataLayer["💾 数据层 - Namespace: data"]
            
            subgraph MariaDBCluster["StatefulSet: MariaDB Cluster"]
                DB1["mariadb-0<br/>Role: Primary"]
                DB2["mariadb-1<br/>Role: Replica"]
                DB3["mariadb-2<br/>Role: Replica"]
            end
            
            subgraph EtcdCluster["StatefulSet: Etcd Cluster"]
                Etcd1["etcd-0"]
                Etcd2["etcd-1"]
                Etcd3["etcd-2"]
            end
            
            MariaDBService["Service: mariadb-svc<br/>Port: 3306"]
            EtcdService["Service: etcd-svc"]
        end
        
    end
    
    subgraph ExternalServices["☁️ 外部服务"]
        S3["S3 / MinIO<br/>- 执行结果存储<br/>- 生成文件存储<br/>- 日志归档"]
        Registry["Container Registry<br/>- Docker Hub<br/>- Harbor<br/>- 私有镜像仓库"]
    end
    
    User -->|"HTTPS<br/>TLS 1.3"| Ingress
    Ingress --> LB
    LB --> CPService
    CPService --> CP1
    CPService --> CP2
    CPService --> CP3
    
    HPA -.->|监控副本数| ControlPlaneDeployment
    
    CP1 -->|"查询/写入<br/>会话状态 / 元数据"| MariaDBService
    CP2 -->|"查询/写入<br/>会话状态 / 元数据"| MariaDBService
    CP3 -->|"查询/写入<br/>会话状态 / 元数据"| MariaDBService
    
    MariaDBService --> DB1
    DB1 -.->|主从复制| DB2
    DB1 -.->|主从复制| DB3
    
    CP1 -->|"读取配置<br/>模板信息"| EtcdService
    CP2 -->|"读取配置<br/>模板信息"| EtcdService
    EtcdService --> Etcd1
    EtcdService --> Etcd2
    EtcdService --> Etcd3

    CP1 -.->|"K8s API<br/>创建 Pod"| SB1
    CP2 -.->|"K8s API<br/>创建 Pod"| SB2
    CP3 -.->|"K8s API<br/>创建 Pod"| SB3
    
    NetworkPolicy -.->|限制| SB1
    NetworkPolicy -.->|限制| SB2
    NetworkPolicy -.->|限制| SB3
    
    SB1 -->|"上报结果<br/>S3 API"| S3
    SB2 -->|"上报结果<br/>S3 API"| S3
    SB3 -->|"上报结果<br/>S3 API"| S3
    
    CP1 -.->|"拉取镜像"| Registry
    Warm1 -.->|"基础镜像"| Registry
    SB1 -.->|"用户镜像"| Registry
    
    
    classDef ingressStyle fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef controlStyle fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef runtimeStyle fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef dataStyle fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef externalStyle fill:#f1f8e9,stroke:#33691e,stroke-width:2px
    
    class Ingress,LB ingressStyle
    class CP1,CP2,CP3,CPService,HPA controlStyle
    class SB1,SB2,SB3,NetworkPolicy runtimeStyle
    class DB1,DB2,DB3,Etcd1,Etcd2,Etcd3,MariaDBService,EtcdService dataStyle
    class S3,Registry externalStyle


```
## 2. 关键组件设计
### 2.1 管理中心 (Control Plane)
#### 2.1.1 API Gateway
技术栈： FastAPI + Uvicorn + asyncio
职责：

- 提供统一的 RESTful API 接口
- 请求验证、鉴权、限流
- 协议转换和请求路由

核心接口：

```
# 会话管理
POST   /api/v1/sessions                 # 创建会话
GET    /api/v1/sessions/{id}            # 查询会话
DELETE /api/v1/sessions/{id}            # 终止会话

# 执行管理
POST   /api/v1/sessions/{id}/execute    # 提交执行任务
GET    /api/v1/sessions/{id}/status     # 查询执行状态
GET    /api/v1/sessions/{id}/result     # 获取执行结果

# 模板管理
POST   /api/v1/templates                # 创建模板
GET    /api/v1/templates                # 列出模板
GET    /api/v1/templates/{id}           # 获取模板详情
```
请求模式：
```
class CreateSessionRequest(BaseModel):
    template_id: str
    timeout: int = 300  # 秒
    resources: ResourceLimit
    env_vars: Dict[str, str] = {}

class ExecuteRequest(BaseModel):
    code: str
    language: Literal["python", "javascript", "shell"]
    async_mode: bool = False
    stdin: Optional[str] = None
    timeout: int = 30
```

相应模型：
```
class SessionResponse(BaseModel):
    session_id: str
    status: SessionStatus
    created_at: datetime
    runtime_type: str
    node_id: str

class ExecutionResult(BaseModel):
    execution_id: str
    status: Literal["success", "failed", "timeout"]
    stdout: str
    stderr: str
    exit_code: int
    execution_time: float
    artifacts: List[str]  # 生成的文件路径
```

#### 2.1.2 调度器 (Scheduler)

调度器负责为会话请求选择最优的容器节点。系统采用**无状态架构**，容器本身不存储任何数据，所有状态存储在外部 S3 workspace 中。

**无状态架构说明**：

- 容器完全无状态（数据在 S3 workspace）
- 容器随时可创建/销毁/重建
- 节点故障时可无缝迁移到其他节点
- 调度不依赖历史绑定，基于当前集群状态做最优决策

**调度策略**：

调度原则：
1. 优先考虑模板亲和性（镜像已缓存）
2. 使用负载均衡（新建容器）

#### 2.1.2.1 模板亲和性

优先选择已缓存镜像的节点：
- 避免镜像拉取，加快启动速度
- 启动时间：1-2s（vs 冷启动 2-5s）

#### 2.1.2.2 负载均衡

综合考虑 CPU、内存、会话数：
- 选择负载最低的节点
- 确保集群负载均衡

**调度流程实现**：

```python
class Scheduler:
    async def schedule(self, request: CreateSessionRequest) -> RuntimeNode:
        """调度逻辑（无状态架构）"""

        # 1. 获取所有健康节点
        nodes = await self.health_probe.get_healthy_nodes()

        # 2. 选择最优节点（负载 + 模板亲和性）
        best_node = await self._select_best_node(nodes, request)

        logger.info(f"Selected node {best_node.id} for session")
        return best_node

    async def _select_best_node(
        self,
        nodes: List[RuntimeNode],
        req: CreateSessionRequest
    ) -> RuntimeNode:
        """综合评分（负载 + 模板亲和性）"""
        scored_nodes = [
            (node, self._calculate_score(node, req))
            for node in nodes
        ]

        best_node = max(scored_nodes, key=lambda x: x[1])[0]

        logger.info(
            f"Selected node {best_node.id} with score "
            f"{max(scored_nodes, key=lambda x: x[1])[1]:.2f}"
        )

        return best_node

    def _calculate_score(self, node: RuntimeNode, req: CreateSessionRequest) -> float:
        """计算综合评分（负载 + 模板亲和性）"""

        # 基础负载评分 (权重 0.7)
        cpu_score = (1 - node.cpu_usage) * 0.28   # 40% of 70%
        mem_score = (1 - node.mem_usage) * 0.28   # 40% of 70%
        session_score = (1 - node.session_count / node.max_sessions) * 0.14  # 20% of 70%
        load_score = cpu_score + mem_score + session_score

        # 模板亲和性评分 (权重 0.3)
        affinity_score = 0.0

        # 模板亲和性（镜像已缓存，启动更快）
        if req.template_id in node.cached_templates:
            affinity_score += 0.3

        return load_score + affinity_score
```

**性能优化路径**：

```
最优：模板亲和节点（1-2s，镜像缓存但容器未预热）
     ↓ 无缓存
   次优：冷启动（2-5s）
```

**无状态架构优势**：

- 节点故障时可在其他节点重建容器
- 调度更灵活，无历史绑定
- 支持会话迁移
- 完全弹性扩展

#### 2.1.3 会话管理器 (Session Manager)
状态管理：

- 使用 MariaDB 存储会话状态和模板（支持事务、关系查询、数据一致性）
- 会话状态机：Creating → Running → Completed/Failed/Timeout
- 使用 SQLAlchemy ORM + asyncpg (异步 PostgreSQL/MariaDB 驱动)

数据库表设计：
```sql
-- 会话表
CREATE TABLE sessions (
    id VARCHAR(64) PRIMARY KEY,
    template_id VARCHAR(64) NOT NULL,
    status ENUM('creating', 'running', 'completed', 'failed', 'timeout', 'terminated') NOT NULL,
    runtime_type ENUM('docker', 'kubernetes') NOT NULL,
    runtime_node VARCHAR(128),           -- 当前运行的节点（可为空，支持会话迁移）
    container_id VARCHAR(128),           -- 当前容器 ID
    pod_name VARCHAR(128),               -- 当前 Pod 名称
    workspace_path VARCHAR(256),         -- S3 路径：s3://bucket/sessions/{session_id}/
    resources_cpu VARCHAR(16),
    resources_memory VARCHAR(16),
    resources_disk VARCHAR(16),
    env_vars JSON,
    timeout INT NOT NULL DEFAULT 300,
    last_activity_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- 最后活动时间（用于自动清理）
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    INDEX idx_status (status),
    INDEX idx_template (template_id),
    INDEX idx_created (created_at),
    INDEX idx_runtime_node (runtime_node),  -- 支持节点故障时查询会话
    INDEX idx_last_activity (last_activity_at)  -- 支持自动清理查询
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 执行记录表
CREATE TABLE executions (
    id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    code TEXT NOT NULL,
    language VARCHAR(16) NOT NULL,
    status ENUM('pending', 'running', 'completed', 'failed', 'timeout') NOT NULL,
    stdout TEXT,
    stderr TEXT,
    exit_code INT,
    execution_time FLOAT,
    artifacts JSON,
    -- 新增字段：handler 返回值和性能指标
    return_value JSON,                  -- handler 函数返回值（JSON 可序列化）
    metrics JSON,                       -- 性能指标（duration_ms, cpu_time_ms, peak_memory_mb 等）
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    INDEX idx_session (session_id),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 模板表
CREATE TABLE templates (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL UNIQUE,
    image VARCHAR(256) NOT NULL,
    base_image VARCHAR(256),
    pre_installed_packages JSON,
    default_resources_cpu VARCHAR(16),
    default_resources_memory VARCHAR(16),
    default_resources_disk VARCHAR(16),
    security_context JSON,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

生命周期管理：
```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, update

# SQLAlchemy 模型
from sqlalchemy import Column, String, Enum, DateTime, Integer, Text, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class SessionDB(Base):
    __tablename__ = "sessions"

    id = Column(String(64), primary_key=True)
    template_id = Column(String(64), nullable=False)
    status = Column(Enum("creating", "running", "completed", "failed", "timeout", "terminated"), nullable=False)
    runtime_type = Column(Enum("docker", "kubernetes"), nullable=False)
    runtime_node = Column(String(128))
    container_id = Column(String(128))
    pod_name = Column(String(128))
    workspace_path = Column(String(256))  # S3 路径：s3://bucket/sessions/{session_id}/
    resources_cpu = Column(String(16))
    resources_memory = Column(String(16))
    resources_disk = Column(String(16))
    env_vars = Column(JSON)
    timeout = Column(Integer, default=300)
    last_activity_at = Column(DateTime, nullable=False, default=datetime.now)  # 最后活动时间
    created_at = Column(DateTime, nullable=False, default=datetime.now)
    updated_at = Column(DateTime, nullable=False, default=datetime.now, onupdate=datetime.now)
    completed_at = Column(DateTime, nullable=True)

class SessionManager:
    def __init__(self, db_url: str = "mysql+aiomysql://sandbox:password@mariadb:3306/sandbox"):
        # 创建异步数据库引擎
        self.engine = create_async_engine(
            db_url,
            pool_size=20,           # 连接池大小
            max_overflow=40,        # 最大溢出连接数
            pool_recycle=3600,      # 连接回收时间（秒）
            pool_pre_ping=True,     # 连接前检测可用性
            echo=False
        )
        self.async_session = sessionmaker(
            self.engine, class_=AsyncSession, expire_on_commit=False
        )

    async def create_session(self, request: CreateSessionRequest) -> Session:
        # 1. 生成会话 ID
        session_id = self._generate_session_id()

        # 2. 调度运行时
        runtime_node = await self.scheduler.schedule(request)

        # 3. 生成 S3 workspace 路径
        workspace_path = f"s3://{self.s3_bucket}/sessions/{session_id}/"

        # 4. 创建数据库事务
        async with self.async_session() as db:
            # 创建会话记录
            session_db = SessionDB(
                id=session_id,
                template_id=request.template_id,
                status=SessionStatus.CREATING,
                runtime_type=runtime_node.type,
                runtime_node=runtime_node.id,
                workspace_path=workspace_path,
                resources_cpu=request.resources.cpu,
                resources_memory=request.resources.memory,
                resources_disk=request.resources.disk,
                env_vars=request.env_vars,
                timeout=request.timeout
            )
            db.add(session_db)
            await db.commit()

            # 4. 调用运行时创建容器
            try:
                container_id = await runtime_node.create_container(session_id)

                # 更新容器信息
                session_db.container_id = container_id
                session_db.status = SessionStatus.RUNNING
                await db.commit()

            except Exception as e:
                # 创建失败，回滚会话状态
                session_db.status = SessionStatus.FAILED
                await db.commit()
                raise

        return self._db_to_pydantic(session_db)

    async def get_session(self, session_id: str) -> Optional[Session]:
        async with self.async_session() as db:
            result = await db.execute(
                select(SessionDB).where(SessionDB.id == session_id)
            )
            session_db = result.scalar_one_or_none()
            if session_db:
                return self._db_to_pydantic(session_db)
            return None

    async def update_session_status(self, session_id: str, status: SessionStatus):
        async with self.async_session() as db:
            await db.execute(
                update(SessionDB)
                .where(SessionDB.id == session_id)
                .values(status=status.value, updated_at=datetime.now())
            )
            await db.commit()

    async def terminate_session(self, session_id: str):
        async with self.async_session() as db:
            result = await db.execute(
                select(SessionDB).where(SessionDB.id == session_id)
            )
            session_db = result.scalar_one_or_none()

            if not session_db:
                raise ValueError(f"Session {session_id} not found")

            # 获取容器节点信息
            runtime_node = await self.scheduler.get_node(session_db.runtime_node)

            # 调用运行时清理资源
            await runtime_node.destroy_container(session_id, session_db.container_id)

            # 更新数据库状态
            session_db.status = SessionStatus.TERMINATED
            session_db.completed_at = datetime.now()
            await db.commit()

            # 回收到 Warm Pool（如果容器仍然健康）
            if await self._is_container_healthy(session_db):
                await self.warm_pool.recycle(self._db_to_pydantic(session_db))

    async def execute_code(self, session_id: str, request: ExecuteRequest) -> str:
        """执行代码，自动处理容器重建"""
        session = await self.get_session(session_id)

        # 检查容器是否存活，如果已销毁则自动重建
        if not await self._is_container_alive(session):
            logger.info(f"Container for session {session_id} not alive, recreating...")
            await self._recreate_container(session)

        # 更新最后活动时间
        await self._update_last_activity(session_id)

        # 调用运行时执行代码
        runtime_node = await self.scheduler.get_node(session.runtime_node)
        execution_id = await runtime_node.execute(session_id, request)

        return execution_id

    async def _is_container_alive(self, session: Session) -> bool:
        """检查容器是否存活"""
        try:
            runtime_node = await self.scheduler.get_node(session.runtime_node)
            return await runtime_node.is_container_alive(session.container_id)
        except Exception:
            return False

    async def _is_container_healthy(self, session_db: SessionDB) -> bool:
        """检查容器是否健康（用于回收判断）"""
        try:
            runtime_node = await self.scheduler.get_node(session_db.runtime_node)
            return await runtime_node.is_container_healthy(session_db.container_id)
        except Exception:
            return False

    async def _recreate_container(self, session: Session):
        """重建容器（共享同一个 S3 workspace）"""
        # 重新调度到最优节点
        runtime_node = await self.scheduler.schedule(
            CreateSessionRequest(
                template_id=session.template_id,
                resources=session.resources,
                env_vars=session.env_vars,
                timeout=session.timeout
            )
        )

        # 创建新容器，挂载同一个 S3 workspace
        container_id = await runtime_node.create_container(
            session_id=session.id,
            workspace_path=session.workspace_path
        )

        # 更新数据库中的容器信息
        async with self.async_session() as db:
            await db.execute(
                update(SessionDB)
                .where(SessionDB.id == session.id)
                .values(
                    runtime_node=runtime_node.id,
                    container_id=container_id,
                    status=SessionStatus.RUNNING,
                    updated_at=datetime.now()
                )
            )
            await db.commit()

    async def _update_last_activity(self, session_id: str):
        """更新最后活动时间（用于自动清理）"""
        async with self.async_session() as db:
            await db.execute(
                update(SessionDB)
                .where(SessionDB.id == session_id)
                .values(last_activity_at=datetime.now())
            )
            await db.commit()

    def _db_to_pydantic(self, session_db: SessionDB) -> Session:
        """将 SQLAlchemy 模型转换为 Pydantic 模型"""
        return Session(
            id=session_db.id,
            template_id=session_db.template_id,
            status=SessionStatus(session_db.status),
            runtime_type=session_db.runtime_type,
            runtime_node=session_db.runtime_node,
            container_id=session_db.container_id,
            pod_name=session_db.pod_name,
            workspace_path=session_db.workspace_path,
            resources=ResourceLimit(
                cpu=session_db.resources_cpu,
                memory=session_db.resources_memory,
                disk=session_db.resources_disk
            ),
            env_vars=session_db.env_vars or {},
            created_at=session_db.created_at,
            updated_at=session_db.updated_at,
            timeout=session_db.timeout
        )

    async def cleanup_idle_sessions(self):
        """定期清理空闲会话（后台任务）

        清理策略：
        - 空闲超过 30 分钟自动销毁容器
        - 创建超过 6 小时强制销毁
        """
        async with self.async_session() as db:
            # 空闲超时清理
            idle_threshold = datetime.now() - timedelta(minutes=30)
            idle_sessions = await db.execute(
                select(SessionDB)
                .where(SessionDB.status == SessionStatus.RUNNING)
                .where(SessionDB.last_activity_at < idle_threshold)
            )
            idle_sessions = idle_sessions.scalars().all()

            for session_db in idle_sessions:
                logger.info(f"Cleaning up idle session {session_db.id}")
                await self._destroy_session_container(session_db.id, session_db)

            # 最大生命周期强制清理
            max_lifetime_threshold = datetime.now() - timedelta(hours=6)
            old_sessions = await db.execute(
                select(SessionDB)
                .where(SessionDB.status == SessionStatus.RUNNING)
                .where(SessionDB.created_at < max_lifetime_threshold)
            )
            old_sessions = old_sessions.scalars().all()

            for session_db in old_sessions:
                logger.info(f"Cleaning up old session {session_db.id}")
                await self._destroy_session_container(session_db.id, session_db)

    async def _destroy_session_container(self, session_id: str, session_db: SessionDB):
        """销毁会话容器"""
        try:
            runtime_node = await self.scheduler.get_node(session_db.runtime_node)
            await runtime_node.destroy_container(session_id, session_db.container_id)
        except Exception as e:
            logger.warning(f"Failed to destroy container for session {session_id}: {e}")

        # 更新数据库状态
        async with self.async_session() as db:
            await db.execute(
                update(SessionDB)
                .where(SessionDB.id == session_id)
                .values(
                    status=SessionStatus.TERMINATED,
                    completed_at=datetime.now(),
                    container_id=None,  # 清空容器 ID
                    runtime_node=None
                )
            )
            await db.commit()
```

#### 2.1.4 监控探针 (Health Probe)
探测机制：

- 心跳检测：每 10 秒向运行时发送 /health 请求
- 负载采集：每 30 秒收集 CPU、内存、会话数
- 异常检测：连续 3 次心跳失败则标记为不健康

自动摘除：

```python
class HealthProbe:
    async def probe_loop(self):
        while True:
            for node in self.runtime_nodes:
                try:
                    # 发送心跳
                    response = await asyncio.wait_for(
                        self.http_client.get(f"{node.url}/health"),
                        timeout=5.0
                    )
                    
                    # 更新负载信息
                    node.update_metrics(response.json())
                    node.mark_healthy()
                    
                except asyncio.TimeoutError:
                    node.increment_failure_count()
                    
                    # 连续失败则摘除
                    if node.failure_count >= 3:
                        await self.remove_unhealthy_node(node)
            
            await asyncio.sleep(10)
```

#### 2.1.5 状态同步服务 (State Sync Service)

**设计原则**：Docker/K8s 是容器状态的唯一真实来源，Session 表只保存关联关系。

状态同步服务负责：
1. **启动时全量同步**：Control Plane 重启后恢复状态
2. **定时健康检查**：定期检查容器状态并修复不一致
3. **容器状态恢复**：结合预热池自动恢复不健康的容器

```python
class StateSyncService:
    """
    状态同步服务

    职责：
    1. 启动时全量状态同步
    2. 定时健康检查（每 30 秒）
    3. 容器状态恢复
    """

    def __init__(
        self,
        session_repo: ISessionRepository,
        docker_scheduler: IDockerScheduler,
        warm_pool_manager: WarmPoolManager,
    ):
        self._session_repo = session_repo
        self._docker_scheduler = docker_scheduler
        self._warm_pool_manager = warm_pool_manager

    async def sync_on_startup(self) -> dict:
        """
        启动时全量同步

        策略：
        1. 查询所有 RUNNING/CREATING 状态的 Session
        2. 通过 Docker API 检查每个容器是否真实存在且运行中
        3. 更新 Session 状态：
           - 容器存在且运行 → 保持 RUNNING
           - 容器不存在/已停止 → 尝试恢复或标记为 FAILED
        """
        active_sessions = await self._session_repo.find_by_status("running")
        active_sessions.extend(await self._session_repo.find_by_status("creating"))

        stats = {"healthy": 0, "unhealthy": 0, "recovered": 0, "failed": 0}

        for session in active_sessions:
            if not session.container_id:
                continue

            # 直接通过 Docker API 检查容器状态
            is_running = await self._docker_scheduler.is_container_running(
                session.container_id
            )

            if is_running:
                stats["healthy"] += 1
            else:
                stats["unhealthy"] += 1
                # 尝试恢复
                recovered = await self._attempt_recovery(session)
                if recovered:
                    stats["recovered"] += 1
                else:
                    stats["failed"] += 1

        return stats

    async def periodic_health_check(self) -> dict:
        """
        定时健康检查（每 30 秒）

        只检查 RUNNING 状态的 Session，减少查询范围
        """
        running_sessions = await self._session_repo.find_by_status("running")

        for session in running_sessions:
            if not session.container_id:
                continue

            is_running = await self._docker_scheduler.is_container_running(
                session.container_id
            )

            if not is_running:
                await self._attempt_recovery(session)

        return {"checked": len(running_sessions)}

    async def _attempt_recovery(self, session: Session) -> bool:
        """
        尝试恢复 Session

        策略：
        1. 首先尝试从预热池获取实例
        2. 如果预热池为空，创建新容器
        3. 如果创建失败，标记 Session 为 FAILED
        """
        # 1. 尝试从预热池获取
        warm_entry = await self._warm_pool_manager.acquire(
            session.template_id, session.id
        )
        if warm_entry:
            # 分配预热实例
            session.container_id = warm_entry.container_id
            session.runtime_node = warm_entry.node_id
            await self._session_repo.save(session)
            return True

        # 2. 创建新容器
        try:
            container_id = await self._docker_scheduler.create_container_for_session(
                session_id=session.id,
                template_id=session.template_id,
                workspace_path=session.workspace_path,
            )
            session.container_id = container_id
            await self._session_repo.save(session)
            return True
        except Exception as e:
            logger.error(f"Failed to recover session {session.id}: {e}")
            # 3. 标记为失败
            session.mark_as_failed()
            await self._session_repo.save(session)
            return False
```

**启动流程集成**：

```python
# 在 main.py 的 lifespan 函数中
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时
    logger.info("Starting Sandbox Control Plane")

    # 初始化依赖注入
    initialize_dependencies(app)

    # 执行启动时状态同步
    state_sync_service = app.state.state_sync_service
    sync_stats = await state_sync_service.sync_on_startup()
    logger.info(f"Startup sync completed: {sync_stats}")

    # 启动后台任务管理器
    task_manager = BackgroundTaskManager()

    # 注册定时健康检查任务（每 30 秒）
    task_manager.register_task(
        name="health_check",
        func=state_sync_service.periodic_health_check,
        interval_seconds=30,
        initial_delay_seconds=60,
    )

    await task_manager.start_all()

    yield

    # 关闭时
    await task_manager.stop_all()
```

### 2.2 Container Scheduler 模块

运行时负责管理沙箱容器的生命周期。系统采用容器隔离 + Bubblewrap 进程隔离的双层安全机制。

```
┌─────────────────────────────────────────┐
│ 宿主机 (Host)                            │
│  ├─ Docker Engine / Kubernetes          │
│  └─ 运行时管理器                         │
│     ├─ 创建容器                          │
│     └─ 监控容器                          │
└─────────────────────────────────────────┘
           ↓ 创建容器
┌─────────────────────────────────────────┐
│ 容器 (Container) - 第一层隔离            │
│  ├─ 独立文件系统 (Union FS)              │
│  ├─ 网络隔离 (NetworkMode=none)          │
│  ├─ 资源限制 (CPU/Memory/PID)            │
│  ├─ 能力限制 (CAP_DROP=ALL)              │
│  └─ 非特权用户 (sandbox:sandbox)         │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ 执行器进程 (Executor)               │ │
│  │  - 监听管理中心的执行请求           │ │
│  │  - 接收用户代码                     │ │
│  │  - 调用 bwrap 启动用户代码          │ │
│  │  - 收集执行结果                     │ │
│  └────────────────────────────────────┘ │
│           ↓ 调用 bwrap                   │
│  ┌────────────────────────────────────┐ │
│  │ Bubblewrap 沙箱 - 第二层隔离       │ │
│  │  ├─ 新的命名空间 (PID/NET/MNT...)  │ │
│  │  ├─ 只读文件系统                    │ │
│  │  ├─ 临时工作目录 (tmpfs)            │ │
│  │  ├─ /proc, /dev 最小化挂载          │ │
│  │  └─ seccomp 系统调用过滤            │ │
│  │                                     │ │
│  │  ┌──────────────────────────────┐  │ │
│  │  │ 用户代码进程                  │  │ │
│  │  │  - Python/Node.js/Shell      │  │ │
│  │  │  - 受 bwrap 完全限制          │  │ │
│  │  └──────────────────────────────┘  │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```
#### 2.2.1 Docker 运行时

容器配置（第一层隔离）：

```python
class DockerRuntime:
    def __init__(self):
        self.docker_client = aiodocker.Docker()
    
    async def create_container(self, session: Session) -> str:
        template = await self.get_template(session.template_id)
        
        # 容器配置 - 第一层隔离
        config = {
            "Image": template.image,
            # 容器启动后运行执行器
            "Cmd": ["/usr/local/bin/sandbox-executor"],
            "Env": self._build_env_vars(session),
            "WorkingDir": "/workspace",
            
            # 主机配置 - 容器层隔离
            "HostConfig": {
                # 资源限制
                "Memory": session.resources.memory_bytes,
                "MemorySwap": session.resources.memory_bytes,  # 禁用 swap
                "CpuQuota": session.resources.cpu_quota,
                "CpuPeriod": 100000,
                "PidsLimit": 128,  # 限制最大进程数

                # 网络隔离
                "NetworkMode": "none",  # 默认完全隔离网络

                # 安全配置
                "CapDrop": ["ALL"],  # 删除所有 Linux Capabilities
                "SecurityOpt": [
                    "no-new-privileges",  # 禁止进程获取新权限
                    "seccomp=default.json"  # Seccomp 配置
                ],

                # Volume 挂载
                "Binds": [
                    f"{session.s3_volume_path}:/workspace",  # S3 对象存储通过 FUSE/s3fs 挂载
                ],

                # 文件系统
                "ReadonlyRootfs": False,  # 根目录可写（执行器需要）
                "Tmpfs": {
                    "/tmp": "rw,noexec,nosuid,size=512m",  # 临时目录
                },

                # 日志配置
                "LogConfig": {
                    "Type": "json-file",
                    "Config": {
                        "max-size": "10m",
                        "max-file": "3"
                    }
                }
            },
            
            # 用户配置
            "User": "sandbox:sandbox",  # 非特权用户 (UID:GID = 1000:1000)
        }
        
        container = await self.docker_client.containers.create(config)
        await container.start()
        
        # 等待执行器就绪
        await self._wait_for_executor_ready(container.id)
        
        return container.id
    
    async def execute(self, session_id: str, request: ExecuteRequest) -> str:
        """向容器内的执行器发送执行请求"""
        container = await self.get_container(session_id)
        
        # 通过容器内的 HTTP API 与执行器通信
        executor_url = f"http://container-{session_id}:8080"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{executor_url}/execute",
                json={
                    "code": request.code,
                    "language": request.language,
                    "timeout": request.timeout,
                    "stdin": request.stdin
                }
            )
        
        return response.json()["execution_id"]
    
    def _build_env_vars(self, session: Session) -> List[str]:
        """构建容器环境变量"""
        env_vars = [
            f"SESSION_ID={session.id}",
            f"CONTROL_PLANE_URL={self.control_plane_url}",
            f"EXECUTION_TIMEOUT={session.timeout}",
        ]
        
        # 用户自定义环境变量
        for key, value in session.env_vars.items():
            env_vars.append(f"{key}={value}")
        
        return env_vars
    
    async def _wait_for_executor_ready(self, container_id: str, timeout: int = 10):
        """等待容器内执行器启动完成"""
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                # 检查执行器是否响应
                exec_result = await self.docker_client.containers.get(container_id).exec_run(
                    cmd=["curl", "-f", "http://localhost:8080/health"],
                    stdout=True
                )
                
                if exec_result.exit_code == 0:
                    return
            except Exception:
                pass
            
            await asyncio.sleep(0.5)
        
        raise TimeoutError(f"Executor not ready in container {container_id}")

    # ========== 状态查询接口（状态同步服务专用） ==========

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
            container = await self.docker_client.containers.get(container_id)
            info = await container.show()
            return info["State"]["Status"] == "running"
        except Exception:
            return False

    async def get_container_status(self, container_id: str) -> ContainerInfo:
        """
        获取容器详细状态

        直接通过 Docker API 查询，不依赖数据库。
        此方法供 StateSyncService 使用。

        Args:
            container_id: 容器 ID

        Returns:
            ContainerInfo: 包含 status, health, created_at 等信息
        """
        container = await self.docker_client.containers.get(container_id)
        info = await container.show()

        return ContainerInfo(
            id=container_id,
            status=info["State"]["Status"],
            created_at=info["Created"],
            health=info["State"].get("Health", {}).get("Status", "unknown"),
            image=info["Config"]["Image"],
            labels=info["Config"].get("Labels", {}),
        )
```

容器镜像构建：

```
# Dockerfile - 沙箱执行环境镜像
FROM python:3.11-slim

# 安装必要工具
RUN apt-get update && apt-get install -y \
    bubblewrap \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 创建非特权用户
RUN groupadd -g 1000 sandbox && \
    useradd -m -u 1000 -g sandbox sandbox

# 安装执行器
COPY sandbox-executor /usr/local/bin/sandbox-executor
RUN chmod +x /usr/local/bin/sandbox-executor

# 创建工作目录
RUN mkdir -p /workspace && chown sandbox:sandbox /workspace

# 切换到非特权用户
USER sandbox

WORKDIR /workspace

# 启动执行器（监听 8080 端口）
CMD ["/usr/local/bin/sandbox-executor"]
```

#### 2.2.2 Kubernetes 运行时
Pod 配置（第一层隔离）：
```python
class K8sRuntime:
    def _build_pod_spec(self, sandbox: Sandbox) -> V1Pod:
        template = self.get_template(sandbox.spec.templateRef)
        
        return V1Pod(
            metadata=V1ObjectMeta(
                name=f"sandbox-{sandbox.name}",
                labels={
                    "app": "sandbox",
                    "session": sandbox.name,
                    "template": sandbox.spec.templateRef
                }
            ),
            spec=V1PodSpec(
                # 容器配置
                containers=[V1Container(
                    name="executor",
                    image=template.image,
                    command=["/usr/local/bin/sandbox-executor"],
                    
                    # 环境变量
                    env=[
                        V1EnvVar(name="SESSION_ID", value=sandbox.name),
                        V1EnvVar(name="CONTROL_PLANE_URL", value=self.control_plane_url)
                    ],
                    
                    # 资源限制
                    resources=V1ResourceRequirements(
                        limits={
                            "cpu": sandbox.spec.resources.cpu,
                            "memory": sandbox.spec.resources.memory,
                            "ephemeral-storage": "1Gi"
                        },
                        requests={
                            "cpu": sandbox.spec.resources.cpu,
                            "memory": sandbox.spec.resources.memory
                        }
                    ),
                    
                    # 安全上下文 - 容器层隔离
                    security_context=V1SecurityContext(
                        # 非特权模式
                        privileged=False,
                        # 非 root 用户
                        run_as_non_root=True,
                        run_as_user=1000,
                        run_as_group=1000,
                        # 只读根文件系统（执行器目录除外）
                        read_only_root_filesystem=False,
                        # 禁止权限提升
                        allow_privilege_escalation=False,
                        # 删除所有 Capabilities
                        capabilities=V1Capabilities(
                            drop=["ALL"]
                        ),
                        # Seccomp 配置
                        seccomp_profile=V1SeccompProfile(
                            type="RuntimeDefault"
                        )
                    ),
                    
                    # 卷挂载
                    volume_mounts=[
                        V1VolumeMount(
                            name="workspace",
                            mount_path="/workspace"
                        )
                    ]
                )],
                
                # Pod 安全配置
                security_context=V1PodSecurityContext(
                    fs_group=1000,
                    run_as_non_root=True,
                    run_as_user=1000,
                    # Sysctl 限制
                    sysctls=[
                        V1Sysctl(name="net.ipv4.ping_group_range", value="1000 1000")
                    ]
                ),
                
                # 卷定义
                volumes=[
                    V1Volume(
                        name="workspace",
                        # 使用 PVC 挂载 S3 对象存储（通过 CSI Driver）
                        persistent_volume_claim=V1PersistentVolumeClaimVolumeSource(
                            claim_name=f"sandbox-{sandbox.name}-workspace"
                        )
                    )
                ],
                
                # 重启策略
                restart_policy="Never",
                
                # DNS 策略
                dns_policy="None",  # 禁用 DNS
                
                # 主机网络配置
                host_network=False,
                host_pid=False,
                host_ipc=False
            )
        )
```

**S3 CSI Driver 配置说明**：

Kubernetes 环境下使用 S3 CSI Driver 将对象存储挂载为 Pod Volume：

```yaml
# StorageClass 定义
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: s3-storage
provisioner: s3.csi.aws.com  # 或其他 S3 CSI Driver
parameters:
  mounter: geesefs  # 或 goofys、s3fs 等挂载工具
  region: us-east-1
  bucket: sandbox-workspace

# PVC 模板（由沙箱系统动态创建）
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: sandbox-{session-id}-workspace
  namespace: sandbox-system
spec:
  accessModes: [ "ReadWriteOnce" ]
  storageClassName: s3-storage
  resources:
    requests:
      storage: 5Gi  # S3 无实际限制，仅为满足 K8s 要求
```

**注意事项**：
- S3 挂载性能较本地磁盘慢，适合文件读写不频繁的场景
- 对于高频读写场景，可考虑使用本地存储 + 异步上传到 S3 的方案
- 需要配置 IAM Role 或 Secret 提供 S3 访问凭证

### 2.3 执行器 (Executor)

执行器是运行在容器内的守护进程，负责接收执行请求并通过 Bubblewrap 启动用户代码，实现第二层隔离。

#### 2.3.1 执行器架构
执行器职责：

- 在容器启动时作为主进程运行
- 监听 HTTP 请求（来自管理中心）
- 接收用户代码和执行参数
- 调用 bwrap 命令隔离执行用户代码
- 收集执行结果（stdout、stderr、返回值、性能指标）
- 上报结果到管理中心

**执行模式**: AWS Lambda-style Handler

所有 Python 用户代码必须定义以下入口函数：

```python
def handler(event: dict) -> dict:
    """
    AWS Lambda-style handler 函数

    Args:
        event: 业务输入数据 (JSON 可序列化类型)

    Returns:
        返回值必须支持 JSON 序列化

    Raises:
        Exception: 业务逻辑异常会被捕获并记录到 stderr
    """
    # 用户业务逻辑
    result = process(event)
    return {"status": "ok", "data": result}
```

**Fileless Execution**: 执行器使用 `python3 -c` 直接在内存中执行代码，避免文件 I/O 操作。

核心实现：

```python
# sandbox-executor.py
# 运行在容器内的执行器进程

import asyncio
import json
import subprocess
import time
from pathlib import Path
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import httpx

app = FastAPI()

class ExecuteRequest(BaseModel):
    code: str
    language: str
    timeout: int = 30
    stdin: str = ""
    execution_id: str  # 执行 ID，用于上报结果

class ExecutionResult(BaseModel):
    status: str
    stdout: str
    stderr: str
    exit_code: int
    execution_time: float
    artifacts: list[str] = []
    return_value: dict | None = None  # 新增：handler 返回值
    metrics: dict | None = None  # 新增：性能指标

class SandboxExecutor:
    def __init__(self):
        self.workspace = Path("/workspace")
        self.workspace.mkdir(exist_ok=True)

        self.session_id = os.environ.get("SESSION_ID")
        self.control_plane_url = os.environ.get("CONTROL_PLANE_URL")
        self.internal_api_token = os.environ.get("INTERNAL_API_TOKEN")

        # Bubblewrap 配置
        self.bwrap_base_args = [
            "bwrap",
            # 只读挂载系统目录
            "--ro-bind", "/usr", "/usr",
            "--ro-bind", "/lib", "/lib",
            "--ro-bind", "/lib64", "/lib64",
            "--ro-bind", "/bin", "/bin",
            "--ro-bind", "/sbin", "/sbin",

            # 工作目录（可写）
            "--bind", str(self.workspace), "/workspace",
            "--chdir", "/workspace",

            # 临时目录
            "--tmpfs", "/tmp",

            # 最小化的 /proc 和 /dev
            "--proc", "/proc",
            "--dev", "/dev",

            # 隔离所有命名空间
            "--unshare-all",
            "--unshare-net",

            # 进程管理
            "--die-with-parent",
            "--new-session",

            # 环境变量清理
            "--clearenv",
            "--setenv", "PATH", "/usr/local/bin:/usr/bin:/bin",
            "--setenv", "HOME", "/workspace",
            "--setenv", "TMPDIR", "/tmp",

            # 安全选项
            "--cap-drop", "ALL",
            "--no-new-privs",
        ]

    def _generate_wrapper_code(self, user_code: str) -> str:
        """生成 Lambda-style wrapper 代码"""
        return f"""
import json
import sys

# User code
{user_code}

# Read event from stdin
try:
    input_data = sys.stdin.read()
    event = json.loads(input_data) if input_data.strip() else {{}}
except json.JSONDecodeError as e:
    print(f"Error parsing event JSON: {{e}}", file=sys.stderr)
    sys.exit(1)

# Call handler
try:
    if 'handler' not in globals():
        raise ValueError("必须定义 handler(event) 函数")

    result = handler(event)

    # Output result with markers
    print("\\n===SANDBOX_RESULT===")
    print(json.dumps(result))
    print("\\n===SANDBOX_RESULT_END===")

except Exception as e:
    import traceback
    print("\\n===SANDBOX_ERROR===")
    print(traceback.format_exc())
    print("\\n===SANDBOX_ERROR_END===")
    sys.exit(1)
"""

    async def execute_code(self, request: ExecuteRequest) -> ExecutionResult:
        """执行用户代码（通过 bwrap 隔离）"""
        execution_id = request.execution_id
        start_time = time.perf_counter()
        start_cpu = time.process_time()

        try:
            # 1. 根据语言构建执行命令
            if request.language == "python":
                # Fileless execution: 使用 python3 -c
                wrapper_code = self._generate_wrapper_code(request.code)

                exec_cmd = self.bwrap_base_args + [
                    "--",
                    "python3", "-c", wrapper_code
                ]

            elif request.language == "javascript":
                code_file = self.workspace / "user_code.js"
                code_file.write_text(request.code)

                exec_cmd = self.bwrap_base_args + [
                    "--ro-bind", str(code_file), "/workspace/user_code.js",
                    "--",
                    "node", "/workspace/user_code.js"
                ]

            elif request.language == "shell":
                exec_cmd = self.bwrap_base_args + [
                    "--",
                    "bash", "-c", request.code
                ]
            else:
                raise ValueError(f"Unsupported language: {request.language}")

            # 2. 在 bwrap 沙箱中执行代码
            result = subprocess.run(
                exec_cmd,
                input=request.stdin,
                capture_output=True,
                text=True,
                timeout=request.timeout,
                cwd=str(self.workspace)
            )

            duration_ms = (time.perf_counter() - start_time) * 1000
            cpu_time_ms = (time.process_time() - start_cpu) * 1000

            # 3. 解析返回值（Python handler 模式）
            return_value = None
            if request.language == "python":
                return_value = self._parse_return_value(result.stdout)

            # 4. 构建性能指标
            metrics = {
                "duration_ms": round(duration_ms, 2),
                "cpu_time_ms": round(cpu_time_ms, 2),
            }

            # 5. 收集执行结果
            execution_result = ExecutionResult(
                status="success" if result.returncode == 0 else "failed",
                stdout=result.stdout,
                stderr=result.stderr,
                exit_code=result.returncode,
                execution_time=duration_ms / 1000,  # 转换为秒
                artifacts=self._collect_artifacts(),
                return_value=return_value,
                metrics=metrics,
            )

        except subprocess.TimeoutExpired:
            duration_ms = (time.perf_counter() - start_time) * 1000
            execution_result = ExecutionResult(
                status="timeout",
                stdout="",
                stderr=f"Execution timeout after {request.timeout} seconds",
                exit_code=-1,
                execution_time=duration_ms / 1000,
                artifacts=[],
                metrics={"duration_ms": round(duration_ms, 2)},
            )

        except Exception as e:
            duration_ms = (time.perf_counter() - start_time) * 1000
            execution_result = ExecutionResult(
                status="error",
                stdout="",
                stderr=str(e),
                exit_code=-1,
                execution_time=duration_ms / 1000,
                artifacts=[],
                metrics={"duration_ms": round(duration_ms, 2)},
            )

        # 6. 上报结果到管理中心（通过内部 API）
        await self._report_result(execution_id, execution_result)

        return execution_result

    def _parse_return_value(self, stdout: str) -> dict | None:
        """从 stdout 解析 handler 返回值"""
        try:
            if "===SANDBOX_RESULT===" in stdout:
                start = stdout.find("===SANDBOX_RESULT===") + len("===SANDBOX_RESULT===")
                end = stdout.find("===SANDBOX_RESULT_END===")
                if start > 0 and end > start:
                    json_str = stdout[start:end].strip()
                    return json.loads(json_str)
        except (json.JSONDecodeError, ValueError):
            pass
        return None

    def _collect_artifacts(self) -> list[str]:
        """收集生成的文件"""
        artifacts = []
        for file_path in self.workspace.rglob("*"):
            if file_path.is_file() and not file_path.name.startswith("."):
                artifacts.append(str(file_path.relative_to(self.workspace)))
        return artifacts

    async def _report_result(self, execution_id: str, result: ExecutionResult):
        """上报执行结果到管理中心（通过内部 API）"""
        try:
            headers = {}
            if self.internal_api_token:
                headers["Authorization"] = f"Bearer {self.internal_api_token}"

            async with httpx.AsyncClient() as client:
                await client.post(
                    f"{self.control_plane_url}/internal/executions/{execution_id}/result",
                    json=result.dict(),
                    headers=headers,
                    timeout=10.0
                )
        except Exception as e:
            logger.error(f"Failed to report result for execution {execution_id}: {e}")

# FastAPI 端点
executor = SandboxExecutor()

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/execute")
async def execute(request: ExecuteRequest) -> ExecutionResult:
    """接收执行请求"""
    return await executor.execute_code(request)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
```

#### 2.3.2 执行结果格式

执行结果包含以下字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `status` | str | 执行状态：success/failed/timeout/error |
| `stdout` | str | 标准输出 |
| `stderr` | str | 标准错误 |
| `exit_code` | int | 进程退出码 |
| `execution_time` | float | 执行耗时（秒） |
| `artifacts` | list[str] | 生成的文件路径列表 |
| `return_value` | dict | **新增**：handler 函数返回值（JSON 可序列化） |
| `metrics` | dict | **新增**：性能指标（duration_ms、cpu_time_ms、peak_memory_mb 等） |

**返回格式示例**:

```json
{
  "status": "success",
  "stdout": "Processing complete.\\n",
  "stderr": "",
  "exit_code": 0,
  "execution_time": 0.07523,
  "artifacts": ["output.csv"],
  "return_value": {
    "status": "ok",
    "data": [1, 2, 3]
  },
  "metrics": {
    "duration_ms": 75.23,
    "cpu_time_ms": 68.12,
    "peak_memory_mb": 42.5
  }
}
```

**metrics 字段格式**:

```json
{
  "duration_ms": 75.23,     // 墙钟耗时（毫秒）
  "cpu_time_ms": 68.12,     // CPU 时间（毫秒）
  "peak_memory_mb": 42.5,    // 内存峰值（MB），可选
  "io_read_bytes": 1024,     // 读取字节数，可选
  "io_write_bytes": 2048     // 写入字节数，可选
}
```

优势：
- 扩展性好：添加新指标无需修改表结构
- 灵活性高：不同执行类型可包含不同指标
- 查询方便：MySQL 5.7+ 支持 JSON 字段索引和查询

#### 2.3.3 Bubblewrap 安全配置详解
完整的 bwrap 命令示例：

```bash
bwrap \
  # === 文件系统隔离 ===
  # 只读挂载系统目录
  --ro-bind /usr /usr \
  --ro-bind /lib /lib \
  --ro-bind /lib64 /lib64 \
  --ro-bind /bin /bin \
  --ro-bind /sbin /sbin \
  
  # 工作目录（读写）
  --bind /workspace /workspace \
  --chdir /workspace \
  
  # 临时目录（内存文件系统）
  --tmpfs /tmp \
  
  # === 命名空间隔离 ===
  --unshare-all \        # 隔离所有命名空间（PID、NET、MNT、IPC、UTS、USER）
  --share-net \          # 可选：如果需要网络访问
  
  # === 进程隔离 ===
  --proc /proc \         # 挂载 /proc（只能看到沙箱内进程）
  --dev /dev \           # 最小化的 /dev
  --die-with-parent \    # 父进程终止时自动终止
  --new-session \        # 新的会话
  
  # === 环境隔离 ===
  --clearenv \           # 清除所有环境变量
  --setenv PATH /usr/local/bin:/usr/bin:/bin \
  --setenv HOME /workspace \
  --setenv TMPDIR /tmp \
  --unsetenv TERM \      # 清除终端环境
  
  # === 安全限制 ===
  --cap-drop ALL \       # 删除所有 Linux Capabilities
  --no-new-privs \       # 禁止获取新权限
  
  # === 资源限制（可选，与 ulimit 配合）===
  --rlimit NPROC=128 \   # 最大进程数
  --rlimit NOFILE=1024 \ # 最大文件描述符
  
  # === 执行命令 ===
  -- \
  python3 /workspace/user_code.py
```

安全特性说明：

| 隔离层面 | 容器隔离         | Bubblewrap隔离               |
| -------- | ---------------- | ---------------------------- |
| 文件系统 | Union FS, 独立层 | 只读绑定, tmpfs              |
| 网络     | NetworkMode=none | unshare network namespace    |
| 进程     | PID namespace    | 新 PID namespace（PID 1）|
| IPC      | IPC namespace    | 新 IPC namespace             |
| 用户     | 非特权用户       | 进一步限制 capabilities      |
| 系统调用 | Seccomp 过滤     | 额外的 seccomp 过滤          |
| 资源     | cgroup 限制      | ulimit 限制                  |


## 3. 关键流程设计
### 3.1 会话创建流程
![alt text](image-2.png)
```mermaid
sequenceDiagram
    participant Agent as AI Agent
    participant API as API Gateway
    participant SessionMgr as 会话管理器
    participant Scheduler as 调度器
    participant WarmPool as 预热池
    participant Runtime as 运行时
    participant Container as 容器实例
    
    Agent->>API: POST /sessions (template_id, resources)
    API->>SessionMgr: create_session()
    SessionMgr->>Scheduler: schedule(request)
    
    Scheduler->>WarmPool: acquire(template_id)
    alt 预热实例可用
        WarmPool-->>Scheduler: 返回预热实例
        Scheduler-->>SessionMgr: 返回容器节点
    else 无预热实例
        Scheduler->>Runtime: 选择最优节点
        Runtime-->>Scheduler: 返回节点信息
    end
    
    SessionMgr->>Runtime: create_container(session)
    Runtime->>Container: docker run / kubectl create pod
    Container-->>Runtime: 容器启动成功
    Runtime-->>SessionMgr: 返回容器 ID

    SessionMgr->>MariaDB: INSERT INTO sessions ...
    MariaDB-->>SessionMgr: 确认保存
    SessionMgr-->>API: 返回 session_id
    API-->>Agent: 返回会话信息
```

### 3.2 代码执行流程
![alt text](image-1.png)
```mermaid
sequenceDiagram
    participant Agent as AI Agent
    participant API as API Gateway
    participant SessionMgr as 会话管理器
    participant Runtime as 运行时
    participant Executor as 执行器
    participant DB as MariaDB
    participant Volume as 对象存储<br/>(Volume 挂载)

    Agent->>API: POST /api/v1/sessions/{session_id}/execute (code, language)
    API->>SessionMgr: get_session(id)
    SessionMgr->>DB: SELECT * FROM sessions WHERE id=?
    DB-->>SessionMgr: 返回会话信息
    SessionMgr-->>API: 返回会话信息

    API->>DB: INSERT INTO executions (生成 execution_id)
    DB-->>API: 返回 execution_id

    API->>Runtime: execute_code(session_id, execution_id, request)
    Runtime->>Executor: 通过容器内 HTTP API 发送执行请求

    Note over Executor,Volume: workspace 目录已通过 Volume 挂载对象存储

    par 异步执行
        Executor->>Executor: 运行代码 (bwrap + subprocess)
        Executor->>Executor: 收集 stdout/stderr
        Executor->>Volume: 生成文件写入 workspace<br/>(自动持久化到对象存储)
        Executor->>Executor: 扫描生成的文件列表
    end

    Executor->>API: POST /internal/executions/{execution_id}/result
    API->>DB: UPDATE executions (保存 stdout/stderr/状态/文件列表)
    DB-->>API: 确认保存
    API-->>Executor: 200 OK

    API-->>Agent: 返回 execution_id (已提交)

    Agent->>API: GET /api/v1/executions/{execution_id}/result
    API->>DB: SELECT * FROM executions WHERE id=?
    DB-->>API: 返回结果数据 (stdout/stderr/artifacts)
    API-->>Agent: 返回执行结果

    Note over Agent,Volume: 如需下载文件，通过文件 API 从对象存储获取
```
### 3.3 健康检查与故障恢复流程
![alt text](image-4.png)
```mermaid
sequenceDiagram
    participant Probe as 监控探针
    participant Runtime as 容器节点
    participant Scheduler as 调度器
    participant SessionMgr as 会话管理器
    
    loop 每 10 秒
        Probe->>Runtime: GET /health
        
        alt 健康响应
            Runtime-->>Probe: 200 OK + metrics
            Probe->>Probe: 更新节点状态
        else 超时或失败
            Runtime--xProbe: Timeout / Error
            Probe->>Probe: failure_count++
            
            alt failure_count >= 3
                Probe->>Scheduler: mark_unhealthy(node)
                Scheduler->>SessionMgr: migrate_sessions(node)
                
                loop 对该节点的每个会话
                    SessionMgr->>Scheduler: schedule(session)
                    Scheduler->>Runtime: 在新节点创建会话
                end
                
                Probe->>Scheduler: remove_node(node)
            end
        end
    end
```

## 4. 数据模型设计


### 4.1 核心实体模型
```python
from enum import Enum
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, List

class SessionStatus(str, Enum):
    CREATING = "creating"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"
    TERMINATED = "terminated"

class ResourceLimit(BaseModel):
    cpu: str = "1"  # CPU 核心数
    memory: str = "512Mi"  # 内存限制
    disk: str = "1Gi"  # 磁盘限制
    max_processes: int = 128  # 最大进程数

class Template(BaseModel):
    id: str
    name: str
    image: str  # Docker 镜像
    base_image: str  # 基础镜像（用于两阶段加载）
    pre_installed_packages: List[str]
    default_resources: ResourceLimit
    security_context: Dict[str, any]
    created_at: datetime

class Session(BaseModel):
    id: str
    template_id: str
    status: SessionStatus
    runtime_type: str  # "docker" or "kubernetes"
    runtime_node: str  # 节点 ID
    container_id: Optional[str]
    pod_name: Optional[str]
    resources: ResourceLimit
    env_vars: Dict[str, str]
    created_at: datetime
    updated_at: datetime
    timeout: int  # 超时时间（秒）

class Execution(BaseModel):
    id: str
    session_id: str
    code: str
    language: str
    status: str  # "pending", "running", "completed", "failed"
    stdout: str
    stderr: str
    exit_code: int
    execution_time: float  # 执行耗时（秒）
    artifacts: List[Artifact]  # 生成的文件元数据列表
    # 新增字段：handler 返回值和性能指标
    return_value: Optional[dict] = None  # handler 函数返回值（JSON 可序列化）
    metrics: Optional[dict] = None  # 性能指标（duration_ms, cpu_time_ms, peak_memory_mb 等）
    created_at: datetime
    completed_at: Optional[datetime]

class Artifact(BaseModel):
    """文件元数据模型"""
    path: str  # 相对于 workspace 的文件路径，如 "results/output.csv"
    size: int  # 文件大小（字节）
    mime_type: str  # MIME 类型，如 "text/csv"
    type: Literal["artifact", "log", "output"]  # 文件类型
    created_at: datetime  # 创建时间
    checksum: Optional[str] = None  # SHA256 校验和（可选）
    download_url: Optional[str] = None  # 下载 URL（预签名 S3 URL）

class RuntimeNode(BaseModel):
    id: str
    type: str  # "docker" or "kubernetes"
    url: str  # 节点 API 地址
    status: str  # "healthy", "unhealthy", "draining"
    cpu_usage: float  # 0.0 - 1.0
    mem_usage: float  # 0.0 - 1.0
    session_count: int
    max_sessions: int
    cached_templates: List[str]
    last_heartbeat: datetime
    failure_count: int
```

### 4.2 协议定义

#### 4.2.1 控制平面 API（外部 API）

**说明**: 由 AI Agent 或上层服务调用的公开 API 接口。

```
# 会话管理
POST   /api/v1/sessions                           # 创建会话
GET    /api/v1/sessions/{id}                      # 获取会话详情
GET    /api/v1/sessions                           # 列出会话
DELETE /api/v1/sessions/{id}                      # 终止会话

# 代码执行
POST   /api/v1/sessions/{session_id}/execute      # 提交执行任务，返回 execution_id
GET    /api/v1/sessions/{session_id}/executions   # 列出该会话的所有执行记录

# 执行结果查询（基于 execution_id）
GET    /api/v1/executions/{execution_id}          # 获取执行详情（包含结果）
GET    /api/v1/executions/{execution_id}/status   # 获取执行状态（pending/running/completed/failed）
GET    /api/v1/executions/{execution_id}/result   # 获取执行结果（stdout/stderr/exit_code）

# 文件操作
POST   /api/v1/sessions/{id}/files/upload         # 上传文件到会话工作目录
GET    /api/v1/sessions/{id}/files/{name}         # 下载会话工作目录中的文件

# 模板管理
POST   /api/v1/templates                          # 创建模板
GET    /api/v1/templates                          # 列出模板
GET    /api/v1/templates/{id}                     # 获取模板详情
PUT    /api/v1/templates/{id}                     # 更新模板
DELETE /api/v1/templates/{id}                     # 删除模板

# 运行时管理
GET    /api/v1/runtimes                           # 列出容器节点
GET    /api/v1/runtimes/{id}/health               # 获取节点健康状态
GET    /api/v1/runtimes/{id}/metrics              # 获取节点指标
```

**请求/响应示例**：

```python
# 提交执行任务
POST /api/v1/sessions/{session_id}/execute
Request:
{
    "code": "def handler(event):\n    return {'message': 'Hello', 'input': event.get('name', 'World')}",
    "language": "python",
    "timeout": 30,
    "event": {"name": "Alice"}
}

Response:
{
    "execution_id": "exec_1234567890",
    "status": "submitted",
    "submitted_at": "2025-01-04T10:30:00Z"
}

# 查询执行状态
GET /api/v1/executions/{execution_id}/status
Response:
{
    "execution_id": "exec_1234567890",
    "session_id": "sess_abc123",
    "status": "completed",
    "created_at": "2025-01-04T10:30:00Z",
    "completed_at": "2025-01-04T10:30:02Z"
}

# 获取执行结果
GET /api/v1/executions/{execution_id}/result
Response:
{
    "execution_id": "exec_1234567890",
    "status": "success",
    "stdout": "Processing complete.\\n",
    "stderr": "",
    "exit_code": 0,
    "execution_time": 0.07523,
    "return_value": {
        "message": "Hello",
        "input": "Alice"
    },
    "metrics": {
        "duration_ms": 75.23,
        "cpu_time_ms": 68.12,
        "peak_memory_mb": 42.5
    },
    "artifacts": ["output.txt"]
}
```

#### 4.2.2 内部回调 API（由 Executor 调用）

**说明**: 执行器（运行在容器内的 sandbox-executor）调用的内部接口，用于上报执行结果。

```
# 执行结果上报
POST   /internal/executions/{execution_id}/result    # 上报执行结果（完成/失败/超时）
POST   /internal/executions/{execution_id}/status    # 上报执行状态变更（running/timeout）

# 请求体示例：
POST /internal/executions/{execution_id}/result
{
    "status": "success",              # success | failed | timeout | error
    "stdout": "执行输出内容",
    "stderr": "错误输出内容",
    "exit_code": 0,
    "execution_time": 0.07523,
    "return_value": {                 # handler 函数返回值（JSON 可序列化）
        "message": "Hello",
        "input": "Alice"
    },
    "metrics": {                      # 性能指标
        "duration_ms": 75.23,
        "cpu_time_ms": 68.12,
        "peak_memory_mb": 42.5
    },
    "artifacts": ["generated_file.txt"]
}
```

**安全说明**: 内部 API 应该：
- 仅在内网/容器网络中可访问
- 使用认证机制（如 JWT token 或 API Key）
- 限制仅容器节点可访问

**说明**: Container Scheduler 作为 Control Plane 内部模块，通过 SDK 直接调用 Docker/K8s API，无需独立的 HTTP API。

### 4.3 执行语义与幂等性模型

#### 4.3.1 execution_id 生命周期

每个代码执行请求都会被分配一个唯一的 `execution_id`，用于追踪整个执行过程。

**execution_id 生成规则**:
```python
execution_id = f"exec_{timestamp}_{uuid4()[:8]}"
# 示例: exec_20240115_abc12345
```

**生命周期状态机**:
```mermaid
stateDiagram-v2
    [*] --> Pending: 创建 execution_id
    Pending --> Running: Executor 开始执行
    Running --> Completed: 执行成功
    Running --> Failed: 执行失败（语法错误/运行时错误）
    Running --> Timeout: 超时
    Running --> Crashed: Executor 崩溃
    Crashed --> Running: 自动重试（最多 3 次）
    Crashed --> Failed: 重试次数耗尽
    Completed --> [*]
    Failed --> [*]
    Timeout --> [*]
```

**状态说明**:

| 状态 | 说明 | 可否重试 |
|------|------|----------|
| `pending` | 已创建，等待 Executor 接收 | 是 |
| `running` | Executor 正在执行 | 否 |
| `completed` | 执行成功完成 | 否 |
| `failed` | 执行失败（用户代码错误） | 否 |
| `timeout` | 执行超时 | 可选（由调用方决定） |
| `crashed` | Executor 进程崩溃 | 是（自动重试） |

#### 4.3.2 幂等性保证

**At-Least-Once 语义**:
- 系统保证每个执行请求**至少被执行一次**
- 在网络故障、Executor 崩溃等场景下可能会执行多次
- 调用方应设计幂等处理逻辑

**Exactly-Once 语义（有限保证）**:
- 在正常情况下（无崩溃、无网络分区），每个 execution_id 只执行一次
- 通过数据库唯一约束和状态机保证：
  ```sql
  CREATE UNIQUE INDEX idx_execution_id ON executions(id);
  ```

**幂等性建议**:
1. **调用方层面**:
   - 对于有副作用的操作（如写文件），应先检查是否已存在
   - 使用幂等键（idempotency key）去重

2. **平台层面**:
   - 相同 execution_id 的重复提交返回已有结果
   - 文件写入使用原子操作（重命名而非覆盖）

```python
# 示例：幂等文件写入
def write_output(filename: str, content: str):
    tmp_file = f"{filename}.tmp.{uuid4()}"
    with open(tmp_file, 'w') as f:
        f.write(content)
    os.rename(tmp_file, filename)  # 原子操作
```

#### 4.3.3 重试机制

**自动重试条件**:
- Executor 进程崩溃（exit_code = -1 或信号终止）
- 网络通信失败（超过 3 次心跳超时）
- 容器异常退出（非用户代码导致的失败）

**重试策略**:
```python
class RetryPolicy:
    max_attempts: int = 3  # 最大重试次数
    backoff_base: float = 1.0  # 退避基数（秒）
    backoff_factor: float = 2.0  # 退避因子
    max_backoff: float = 10.0  # 最大退避时间

    def get_delay(attempt: int) -> float:
        """计算第 N 次重试的延迟时间"""
        delay = backoff_base * (backoff_factor ** (attempt - 1))
        return min(delay, max_backoff)

# 重试延迟序列: 1s, 2s, 4s, 8s, 10s, 10s, ...
```

**不重试的场景**:
- 用户代码错误（语法错误、ImportError、NameError 等）
- 超时（timeout 状态）
- 显式取消（调用方主动终止）
- 重试次数已达上限

**重试执行流程**:
```python
async def retry_execution_if_needed(execution_id: str) -> bool:
    """判断并执行重试"""
    execution = await db.get_execution(execution_id)

    if execution.status != ExecutionStatus.CRASHED:
        return False

    if execution.retry_count >= MAX_RETRY_ATTEMPTS:
        await mark_failed(execution_id, reason="Max retries exceeded")
        return False

    # 计算退避延迟
    delay = RetryPolicy.get_delay(execution.retry_count + 1)
    await asyncio.sleep(delay)

    # 重新调度到相同 session（复用 workspace）
    await scheduler.resubmit(execution.session_id, execution_id)

    # 更新重试计数
    execution.retry_count += 1
    await db.commit()

    return True
```

#### 4.3.4 Executor 崩溃处理

**崩溃检测机制**:

1. **心跳检测**:
   ```python
   # Executor 每 5 秒发送一次心跳
   async def heartbeat_loop(execution_id: str):
       while True:
           await api.post(f"/internal/executions/{execution_id}/heartbeat")
           await asyncio.sleep(5)

   # Control Plane 15 秒未收到心跳则判定为崩溃
   HEARTBEAT_TIMEOUT = 15
   ```

2. **容器状态监控**:
   ```python
   # 健康探针检查容器状态
   async def check_container_health(container_id: str):
       container = docker.containers.get(container_id)
       status = container.status

       if status in {"exited", "dead"}:
           return "crashed"
       elif status == "running":
           return "healthy"
       else:
           return "unknown"
   ```

**崩溃恢复流程**:
```mermaid
flowchart TD
    A[检测到崩溃] --> B{崩溃类型}
    B -->|容器退出| C[标记为 crashed]
    B -->|心跳超时| D[检查容器状态]

    D -->|容器正常运行| E[恢复心跳]
    D -->|容器已退出| C

    C --> F{重试次数 < 3?}
    F -->|是| G[延迟后重试]
    F -->|否| H[标记为 failed]

    G --> I[创建新容器/复用 session]
    I --> J[重新执行相同代码]
    J --> K{执行成功?}
    K -->|是| L[标记为 completed]
    K -->|否| C
```

**数据一致性保证**:

1. **执行结果幂等上报**:
   ```python
   # Executor 使用幂等键上报结果
   async def report_result(execution_id: str, result: ExecutionResult):
       await api.post(
           f"/internal/executions/{execution_id}/result",
           json=result.dict(),
           headers={"Idempotency-Key": f"{execution_id}_result"}
       )
   ```

2. **Artifact 文件原子化**:
   - 文件先写入临时目录 `.tmp/{execution_id}/`
   - 执行完成后原子移动到 workspace
   - 崩溃时临时文件自动清理

3. **数据库事务隔离**:
   ```sql
   -- 使用乐观锁防止并发更新
   UPDATE executions
   SET status = 'completed',
       version = version + 1
   WHERE id = ? AND version = ?;
   ```

#### 4.3.5 执行结果查询

**最终一致性**:
- 执行完成后结果通常在 100ms 内可查询
- 在高负载下可能有 1-2 秒延迟
- 调用方应使用轮询或 Webhook 获取结果

**推荐查询模式**:
```python
async def wait_for_result(execution_id: str, timeout: int = 60) -> ExecutionResult:
    """等待执行结果（带超时）"""
    start = time.time()

    while True:
        result = await api.get(f"/api/v1/executions/{execution_id}")

        if result["status"] in {"completed", "failed", "timeout"}:
            return result

        if time.time() - start > timeout:
            raise TimeoutError(f"Execution {execution_id} query timeout")

        await asyncio.sleep(0.5)  # 退避轮询
```

#### 4.3.6 失败恢复路径

本节描述各种故障场景下的恢复机制，确保系统在各种异常情况下的可用性和数据一致性。

**故障分类**:

| 故障类型 | 影响范围 | 恢复策略 | 数据一致性 |
|----------|----------|----------|------------|
| Control Plane 重启 | 所有正在进行的请求 | 数据库状态恢复 + 运行时重连 | 强一致性 |
| Executor 崩溃 | 单个执行任务 | 自动重试（最多 3 次） | At-Least-Once |
| Pod Eviction | 整个沙箱 Pod | 透明重建 + 复用 workspace | At-Least-Once |
| 网络分区 | 部分节点不可达 | 自动重路由 + 超时重试 | 最终一致性 |
| 节点故障 | 节点上所有 Pod | 调度到其他节点 + 重建 | 最终一致性 |
| 数据库故障 | 所有元数据操作 | 只读模式 + 重试 | 强一致性 |

**场景 1: Control Plane 重启**

```mermaid
flowchart TD
    A[Control Plane 重启] --> B[从数据库恢复状态]
    B --> C{检查 running 状态的 executions}

    C --> D[查询 last_heartbeat_at]
    D --> E{心跳超时?}

    E -->|是| F[标记为 crashed]
    E -->|否| G[保持 running 状态]

    F --> H[触发重试逻辑]
    G --> I[等待 Executor 上报结果]

    H --> J[检查 session 容器状态]
    J --> K{容器存在?}
    K -->|是| L[复用现有容器]
    K -->|否| M[创建新容器]

    L --> N[重新执行代码]
    M --> N
```

**恢复流程**:

1. **启动时状态恢复**:
   ```python
   async def recover_on_startup():
       """Control Plane 启动时恢复状态"""

       # 1. 查找所有 running 状态的执行
       running_executions = await db.query(
           SELECT * FROM executions
           WHERE status = 'running'
       )

       for execution in running_executions:
           # 2. 检查心跳时间
           if execution.last_heartbeat_at < heartbeat_threshold():
               # 心跳超时，标记为崩溃
               await mark_crashed(execution.id)
               # 触发重试
               await retry_execution_if_needed(execution.id)

       # 3. 检查 session 容器状态
       sessions = await db.query(
           SELECT * FROM sessions
           WHERE status = 'running'
       )

       for session in sessions:
           is_alive = await check_container_status(session.container_id)
           if not is_alive:
               # 容器已消失，标记为待重建
               await mark_session_unhealthy(session.id)
   ```

2. **运行时连接恢复**:
   ```python
   async def reconnect_runtime_nodes():
       """重新连接所有容器节点"""
       nodes = await db.query(SELECT * FROM runtime_nodes)

       for node in nodes:
           try:
               # 发送健康检查
               await node.health_check()
               node.status = "healthy"
           except Exception:
               node.status = "unhealthy"

       await db.commit()
   ```

**场景 2: Pod Eviction / 节点 Drain**

当 Kubernetes 节点需要维护（如升级内核）时，Pod 会被主动驱逐。

```mermaid
flowchart TD
    A[Kubernetes 发出 Eviction 信号] --> B[Pod 收到 SIGTERM]
    B --> C[Executor 尝试优雅关闭]

    C --> D{正在执行的任务?}
    D -->|是| E[标记当前执行为 crashed]
    D -->|否| F[直接退出]

    E --> F
    F --> G[Pod 被删除]

    G --> H[Control Plane 检测到 Pod 消失]
    H --> I[从数据库查询 session 信息]

    I --> J[调度到新节点]
    J --> K[创建新 Pod + 挂载同一 S3 workspace]

    K --> L[恢复 crashed 状态的 executions]
    L --> M[自动重试执行]
```

**恢复机制**:

1. **优雅关闭处理**:
   ```python
   # Executor 收到 SIGTERM 时的处理
   async def handle_shutdown():
       # 1. 标记所有正在执行的任务为 crashed
       running_executions = get_running_executions()
       for exec_id in running_executions:
           await mark_crashed_via_callback(exec_id)

       # 2. 清理临时文件
       cleanup_temp_files()

       # 3. 最多等待 10 秒后强制退出
       await asyncio.sleep(10)
       sys.exit(143)  # SIGTERM exit code
   ```

2. **跨节点会话恢复**:
   ```python
   async def recover_session_on_eviction(session_id: str):
       """Pod 驱逐后恢复会话"""
       session = await db.get_session(session_id)

       # 1. 调度到新的健康节点
       new_node = await scheduler.select_best_node(session.template_id)

       # 2. 在新节点上创建容器，挂载同一 S3 workspace
       new_container_id = await new_node.create_container(
           session_id=session_id,
           workspace_path=session.workspace_path,  # 复用 S3 路径
           template_id=session.template_id
       )

       # 3. 更新 session 记录
       session.runtime_node = new_node.id
       session.container_id = new_container_id
       await db.commit()

       # 4. 恢复所有 crashed 状态的执行
       crashed_executions = await db.query(
           SELECT * FROM executions
           WHERE session_id = ? AND status = 'crashed'
       )

       for execution in crashed_executions:
           await retry_execution_if_needed(execution.id)
   ```

**场景 3: 网络分区**

网络分区可能导致 Control Plane 与 容器节点、Executor 之间通信中断。

```mermaid
flowchart TD
    A[网络分区发生] --> B{哪些节点受影响?}

    B -->|容器节点不可达| C[标记节点为 unhealthy]
    B -->|Executor 心跳丢失| D[标记执行为 crashed]
    B -->|Control Plane 不可达| E[Executor 本地持久化结果]

    C --> F[停止向该节点调度新任务]
    D --> G[触发重试逻辑]
    E --> H[网络恢复后重试上报]

    F --> I[等待网络恢复]
    G --> I
    H --> I

    I --> J{网络恢复?}
    J -->|是| K[恢复正常调度]
    J -->|否| L[超时后标记为 failed]
```

**处理策略**:

1. **超时与重试配置**:
   ```python
   class NetworkConfig:
       # HTTP 客户端配置
       connect_timeout: float = 5.0  # 连接超时
       read_timeout: float = 30.0    # 读取超时
       max_retries: int = 3          # 最大重试次数

       # 心跳配置
       heartbeat_interval: float = 5.0    # 心跳间隔
       heartbeat_timeout: float = 15.0    # 心跳超时

       # 节点健康检查
       health_check_interval: float = 10.0
       node_unhealthy_threshold: int = 3  # 连续失败次数阈值
   ```

2. **Executor 本地持久化**:
   ```python
   # Executor 在 Control Plane 不可达时本地保存结果
   async def report_result_with_fallback(execution_id: str, result: ExecutionResult):
       try:
           await api.post(f"/internal/executions/{execution_id}/result", json=result)
       except Exception as e:
           # 网络失败，本地持久化
           local_path = f"/tmp/results/{execution_id}.json"
           with open(local_path, 'w') as f:
               json.dump(result.dict(), f)

           # 后台重试任务
           asyncio.create_task(retry_report_when_available(execution_id, local_path))

   async def retry_report_when_available(execution_id: str, local_path: str):
       while True:
           try:
               with open(local_path, 'r') as f:
                   result = json.load(f)
               await api.post(f"/internal/executions/{execution_id}/result", json=result)
               os.remove(local_path)  # 上报成功，删除本地文件
               break
           except Exception:
               await asyncio.sleep(5)  # 5 秒后重试
   ```

**场景 4: 数据库故障**

```mermaid
flowchart TD
    A[检测到数据库故障] --> B{故障类型}

    B -->|连接失败| C[切换到备用数据库]
    B -->|主从切换| D[更新连接池指向新主库]
    B -->|完全不可用| E[进入只读降级模式]

    C --> F[重试失败的操作]
    D --> F
    E --> G[拒绝写操作<br/>允许读缓存]

    F --> H{服务恢复?}
    H -->|是| I[恢复正常服务]
    H -->|否| J[返回 503 Service Unavailable]

    G --> K[等待数据库恢复]
    K --> I
```

**降级策略**:

1. **只读模式**:
   ```python
   class DatabaseManager:
       def __init__(self):
           self.read_only_mode = False
           self.cache = TTLCache(maxsize=1000, ttl=60)  # 1 分钟缓存

       async def execute_write(self, query, params):
           if self.read_only_mode:
               raise ServiceUnavailable("Database in read-only mode")

           return await self.db.execute(query, params)

       async def execute_read(self, query, params):
           # 优先从缓存读取
           cache_key = f"{query}:{params}"
           if cached := self.cache.get(cache_key):
               return cached

           result = await self.db.execute(query, params)
           self.cache[cache_key] = result
           return result
   ```

**场景 5: S3 对象存储故障**

```mermaid
flowchart TD
    A[S3 上报/下载失败] --> B{操作类型}

    B -->|Executor 上报结果| C[本地持久化 + 重试]
    B -->|下载 artifact| D[返回预签名 URL<br/>客户端直接下载]
    B -->|创建 workspace| E[使用本地临时存储]

    C --> F{重试成功?}
    F -->|是| G[清理本地副本]
    F -->|否| H[保留 24 小时后删除]

    D --> I[绕过 Control Plane]
    E --> J[降级警告]
```

**容错机制**:

1. **本地临时存储**:
   ```python
   # S3 不可用时使用本地存储
   class ArtifactStorage:
       def __init__(self):
           self.s3_client = boto3.client('s3')
           self.fallback_path = "/tmp/artifacts"

       async def upload(self, file_path: str, s3_path: str):
           try:
               await self.s3_client.upload_file(file_path, bucket, s3_path)
           except Exception:
               # 降级到本地存储
               local_path = os.path.join(self.fallback_path, s3_path)
               os.makedirs(os.path.dirname(local_path), exist_ok=True)
               shutil.copy(file_path, local_path)
               logger.warning(f"S3 unavailable, using local storage: {local_path}")
   ```

2. **预签名 URL 直接下载**:
   ```python
   # 绕过 Control Plane，客户端直接从 S3 下载
   async def get_artifact_download_url(session_id: str, file_path: str) -> str:
       s3_path = f"sessions/{session_id}/{file_path}"
       url = s3_client.generate_presigned_url(
           'get_object',
           Params={'Bucket': S3_BUCKET, 'Key': s3_path},
           ExpiresIn=3600  # 1 小时有效期
       )
       return url
   ```

**恢复时间目标 (RTO)**:

| 故障场景 | RTO | RPO | 说明 |
|----------|-----|-----|------|
| Control Plane 重启 | < 30s | 0 | 内存状态可从数据库恢复 |
| Executor 崩溃 | < 10s | 0 | 自动重试，最多 3 次 |
| Pod Eviction | < 60s | 0 | 跨节点恢复，复用 S3 workspace |
| 网络分区 | < 30s | 0 | 超时重试 + 自动重路由 |
| 数据库故障 | < 60s | 0 | 主从切换 |
| S3 故障 | N/A | > 0 | 降级到本地存储 |

**最佳实践建议**:

1. **定期健康检查**:
   - 每 10 秒检查一次 容器节点健康状态
   - 每 5 秒检查一次 Executor 心跳
   - 使用 Kubernetes liveness/readiness probe

2. **优雅关闭**:
   - Control Plane 收到 SIGTERM 时：
     - 停止接受新请求
     - 等待正在处理的请求完成（最多 30 秒）
     - 持久化内存状态到数据库

3. **监控告警**:
   - 监控崩溃重试率（应 < 1%）
   - 监控心跳超时次数（应 < 0.1%）
   - 监控节点不健康比例（应 < 10%）
   - 告警阈值：连续 3 次重试失败

## 5. Python 依赖配置

### 5.1 核心依赖

使用 MariaDB 需要以下 Python 包：

```txt
# requirements.txt

# Web 框架
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
pydantic>=2.5.0
pydantic-settings>=2.1.0

# 数据库相关
sqlalchemy[asyncio]>=2.0.23
aiomysql>=0.2.0          # 异步 MySQL/MariaDB 驱动
alembic>=1.12.0          # 数据库迁移工具

# HTTP 客户端
httpx>=0.25.0

# 容器运行时
aiodocker>=0.21.0        # Docker API
kubernetes>=28.0.0       # K8s Python 客户端

# 对象存储
boto3>=1.29.0            # S3 兼容存储

# 工具库
python-jose[cryptography]>=3.3.0  # JWT
python-multipart>=0.0.6
structlog>=23.2.0        # 结构化日志
```

### 5.2 开发依赖

```txt
# requirements-dev.txt

# 测试
pytest>=7.4.0
pytest-asyncio>=0.21.0
pytest-cov>=4.1.0
httpx>=0.25.0            # 用于测试 API

# 代码质量
black>=23.11.0
flake8>=6.1.0
mypy>=1.7.0
isort>=5.12.0

# 类型存根
types-redis>=4.6.0.11    # 如果需要使用 Redis 作为缓存层
```

### 5.3 数据库迁移 (Alembic)

```python
# alembic/env.py
from asyncio import run
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context

# this is the Alembic Config object
config = context.config

# add your model's MetaData object here for 'autogenerate' support
from sandbox_control_plane.db.models import Base
target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations():
    """Run migrations in 'online' mode with async connection."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

### 5.4 数据库配置

```python
# config.py
from pydantic_settings import BaseSettings

class DatabaseSettings(BaseSettings):
    url: str = "mysql+aiomysql://sandbox:sandbox_pass@localhost:3306/sandbox"
    pool_size: int = 50
    max_overflow: int = 100
    pool_recycle: int = 3600
    pool_pre_ping: bool = True
    echo: bool = False

    class Config:
        env_prefix = "DB_"

class Settings(BaseSettings):
    database: DatabaseSettings = DatabaseSettings()
    s3_endpoint: str = "http://localhost:9000"
    runtime_mode: str = "docker"

    class Config:
        env_file = ".env"
```

## 6. 安全设计
### 6.1 多层隔离策略

1. **容器级隔离**
   - 每个会话独立容器
   - 禁用特权模式
   - 删除所有 Linux Capabilities
   - 非 root 用户运行

2. **进程级隔离 (Bubblewrap)**
   - Namespace 隔离（PID, NET, MNT, IPC, UTS）
   - 只读文件系统
   - 临时目录 tmpfs
   - 资源限制（ulimit）

3. **网络隔离**
   - 默认 NetworkMode=none
   - 可选白名单网络策略
   - 代理拦截敏感请求

4. **数据隔离**
   - 会话间完全隔离
   - 敏感数据环境变量传递
   - 执行结果加密存储

### 6.2 安全配置示例
```yaml
# Docker 安全配置
security_opt:
  - no-new-privileges
  - seccomp=default.json
cap_drop:
  - ALL
read_only_root_filesystem: true
user: "1000:1000"

# Bubblewrap 配置
bwrap_args:
  - --ro-bind /usr /usr
  - --ro-bind /lib /lib
  - --tmpfs /tmp
  - --proc /proc
  - --dev /dev
  - --unshare-all
  - --die-with-parent
  - --new-session

# 资源限制
resources:
  limits:
    cpu: "1"
    memory: "512Mi"
    ephemeral-storage: "1Gi"
  ulimits:
    nofile: 1024
    nproc: 128
```

## 7. 性能优化

### 7.1 启动优化

**两阶段镜像加载：**
```dockerfile
# Stage 1: 基础镜像（预热池使用）
FROM python:3.11-slim as base
RUN apt-get update && apt-get install -y bubblewrap
COPY sandbox-executor /usr/local/bin/

# Stage 2: 用户依赖（运行时加载）
FROM base
COPY requirements.txt /tmp/
RUN pip install -r /tmp/requirements.txt
```

**预热池配置：**
```python
WARM_POOL_CONFIG = {
    "default_template": {
        "target_size": 10,  # 目标池大小
        "min_size": 5,      # 最小保留
        "max_idle_time": 300,  # 最大空闲时间（秒）
    },
    "high_frequency_template": {
        "target_size": 50,
        "min_size": 20,
    }
}
```

### 7.2 并发优化

**异步处理：**
```python
# FastAPI 异步端点
@app.post("/api/v1/sessions/{session_id}/execute")
async def execute_code(session_id: str, request: ExecuteRequest):
    session = await session_manager.get_session(session_id)
    
    # 异步执行，立即返回
    execution_id = await executor.submit(session, request)
    
    return {"execution_id": execution_id, "status": "submitted"}

# 批量处理
async def batch_create_sessions(requests: List[CreateSessionRequest]):
    tasks = [session_manager.create_session(req) for req in requests]
    return await asyncio.gather(*tasks)
```

**连接池：**
```python
# HTTP 连接池
http_client = httpx.AsyncClient(
    limits=httpx.Limits(max_connections=1000, max_keepalive_connections=100),
    timeout=httpx.Timeout(10.0)
)

# MariaDB 连接池（SQLAlchemy 异步引擎）
from sqlalchemy.ext.asyncio import create_async_engine

db_engine = create_async_engine(
    "mysql+aiomysql://sandbox:password@mariadb:3306/sandbox",
    pool_size=50,              # 常驻连接池大小
    max_overflow=100,          # 最大溢出连接数
    pool_recycle=3600,         # 连接回收时间（防止连接被服务端关闭）
    pool_pre_ping=True,        # 连接前 ping 检测可用性
    pool_timeout=30,           # 获取连接超时时间
    echo=False                 # 不输出 SQL 日志
)
```

---

## 8. 监控与可观测性

### 8.1 指标定义

**系统指标：**
- `sandbox_sessions_total`: 会话总数
- `sandbox_sessions_active`: 活跃会话数
- `sandbox_executions_total`: 执行总数
- `sandbox_execution_duration_seconds`: 执行耗时
- `sandbox_warm_pool_size`: 预热池大小
- `sandbox_runtime_cpu_usage`: 运行时 CPU 使用率
- `sandbox_runtime_memory_usage`: 运行时内存使用率

**业务指标：**
- `sandbox_cold_start_duration`: 冷启动耗时
- `sandbox_warm_start_duration`: 热启动耗时
- `sandbox_failure_rate`: 失败率
- `sandbox_timeout_rate`: 超时率

### 8.2 监控集成

**日志结构化：**
```python
import structlog

logger = structlog.get_logger()

logger.info(
    "session_created",
    session_id=session.id,
    template_id=session.template_id,
    runtime_node=session.runtime_node,
    duration_ms=100
)
```

## 9. 部署方案

### 9.1 Docker Compose 部署（开发/小规模）
```yaml
version: '3.8'

services:
  control-plane:
    build: ./control-plane
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=mysql+aiomysql://sandbox:sandbox_pass@mariadb:3306/sandbox
      - S3_ENDPOINT=http://minio:9000
      - RUNTIME_MODE=docker
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    depends_on:
      - mariadb
      - minio

  mariadb:
    image: mariadb:11.2
    ports:
      - "3306:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=root_password
      - MYSQL_DATABASE=sandbox
      - MYSQL_USER=sandbox
      - MYSQL_PASSWORD=sandbox_pass
    volumes:
      - mariadb_data:/var/lib/mysql
      - ./init.sql:/docker-entrypoint-initdb.d/01-init.sql:ro
    command:
      - --character-set-server=utf8mb4
      - --collation-server=utf8mb4_unicode_ci
      - --max-connections=500
      - --innodb-buffer-pool-size=256M

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      - MINIO_ROOT_USER=admin
      - MINIO_ROOT_PASSWORD=password
    volumes:
      - minio_data:/data

volumes:
  mariadb_data:
  minio_data:
```

数据库初始化脚本 `init.sql`:
```sql
-- 创建数据库
CREATE DATABASE IF NOT EXISTS sandbox CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE sandbox;

-- 会话表
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(64) PRIMARY KEY,
    template_id VARCHAR(64) NOT NULL,
    status ENUM('creating', 'running', 'completed', 'failed', 'timeout', 'terminated') NOT NULL,
    runtime_type ENUM('docker', 'kubernetes') NOT NULL,
    runtime_node VARCHAR(128),           -- 当前运行的节点（可为空，支持会话迁移）
    container_id VARCHAR(128),           -- 当前容器 ID
    pod_name VARCHAR(128),               -- 当前 Pod 名称
    workspace_path VARCHAR(256),         -- S3 路径：s3://bucket/sessions/{session_id}/
    resources_cpu VARCHAR(16),
    resources_memory VARCHAR(16),
    resources_disk VARCHAR(16),
    env_vars JSON,
    timeout INT NOT NULL DEFAULT 300,
    last_activity_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- 最后活动时间（用于自动清理）
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    INDEX idx_status (status),
    INDEX idx_template (template_id),
    INDEX idx_created (created_at),
    INDEX idx_runtime_node (runtime_node),  -- 支持节点故障时查询会话
    INDEX idx_last_activity (last_activity_at)  -- 支持自动清理查询
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 执行记录表
CREATE TABLE IF NOT EXISTS executions (
    id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    code TEXT NOT NULL,
    language VARCHAR(16) NOT NULL,
    status ENUM('pending', 'running', 'completed', 'failed', 'timeout', 'crashed') NOT NULL,
    stdout MEDIUMTEXT,
    stderr MEDIUMTEXT,
    exit_code INT,
    execution_time FLOAT,
    artifacts JSON,  -- Artifact 对象数组: [{"path": "...", "size": 123, "mime_type": "...", ...}]
    retry_count INT DEFAULT 0,  -- 重试次数
    last_heartbeat_at TIMESTAMP NULL,  -- 最后心跳时间
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    INDEX idx_session (session_id),
    INDEX idx_status (status),
    INDEX idx_created (created_at),
    INDEX idx_last_heartbeat (last_heartbeat_at)  -- 支持心跳超时检测
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 模板表
CREATE TABLE IF NOT EXISTS templates (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL UNIQUE,
    image VARCHAR(256) NOT NULL,
    base_image VARCHAR(256),
    pre_installed_packages JSON,
    default_resources_cpu VARCHAR(16),
    default_resources_memory VARCHAR(16),
    default_resources_disk VARCHAR(16),
    security_context JSON,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认模板
INSERT INTO templates (id, name, image, base_image, default_resources_cpu, default_resources_memory, default_resources_disk) VALUES
('python-basic', 'Python Basic', 'sandbox-python:3.11-basic', 'python:3.11-slim', '1', '512Mi', '1Gi'),
('python-datascience', 'Python Data Science', 'sandbox-python:3.11-datascience', 'python:3.11-slim', '2', '2Gi', '5Gi'),
('nodejs-basic', 'Node.js Basic', 'sandbox-nodejs:20-basic', 'node:20-alpine', '1', '512Mi', '1Gi')
ON DUPLICATE KEY UPDATE name=VALUES(name);
```


### 9.2 Kubernetes 部署（生产环境）

**MariaDB 部署：**
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mariadb
  namespace: sandbox-system
spec:
  serviceName: mariadb
  replicas: 1
  selector:
    matchLabels:
      app: mariadb
  template:
    metadata:
      labels:
        app: mariadb
    spec:
      containers:
      - name: mariadb
        image: mariadb:11.2
        ports:
        - containerPort: 3306
          name: mysql
        env:
        - name: MYSQL_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mariadb-secret
              key: root-password
        - name: MYSQL_DATABASE
          value: sandbox
        - name: MYSQL_USER
          value: sandbox
        - name: MYSQL_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mariadb-secret
              key: user-password
        volumeMounts:
        - name: mariadb-storage
          mountPath: /var/lib/mysql
        - name: init-scripts
          mountPath: /docker-entrypoint-initdb.d
        resources:
          requests:
            cpu: "500m"
            memory: "1Gi"
          limits:
            cpu: "2"
            memory: "4Gi"
        livenessProbe:
          exec:
            command:
            - mysqladmin
            - ping
            - -h
            - localhost
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - mysql
            - -h
            - localhost
            - -u
            - sandbox
            - -p${MYSQL_PASSWORD}
            - -e
            - SELECT 1
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: init-scripts
        configMap:
          name: mariadb-init-scripts
  volumeClaimTemplates:
  - metadata:
      name: mariadb-storage
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 50Gi
---
apiVersion: v1
kind: Service
metadata:
  name: mariadb
  namespace: sandbox-system
spec:
  selector:
    app: mariadb
  ports:
  - port: 3306
    targetPort: 3306
  clusterIP: None
---
apiVersion: v1
kind: Secret
metadata:
  name: mariadb-secret
  namespace: sandbox-system
type: Opaque
data:
  root-password: cm9vdF9wYXNzd29yZF9jaGFuZ2VfbWU=  # Base64 encoded
  user-password: c2FuZGJveF9wYXNzd29yZF9jaGFuZ2VfbWU=
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: mariadb-init-scripts
  namespace: sandbox-system
data:
  01-init.sql: |
    CREATE DATABASE IF NOT EXISTS sandbox CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    USE sandbox;

    CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(64) PRIMARY KEY,
        template_id VARCHAR(64) NOT NULL,
        status ENUM('creating', 'running', 'completed', 'failed', 'timeout', 'terminated') NOT NULL,
        runtime_type ENUM('docker', 'kubernetes') NOT NULL,
        runtime_node VARCHAR(128),           -- 当前运行的节点（可为空，支持会话迁移）
        container_id VARCHAR(128),           -- 当前容器 ID
        pod_name VARCHAR(128),               -- 当前 Pod 名称
        workspace_path VARCHAR(256),         -- S3 路径：s3://bucket/sessions/{session_id}/
        resources_cpu VARCHAR(16),
        resources_memory VARCHAR(16),
        resources_disk VARCHAR(16),
        env_vars JSON,
        timeout INT NOT NULL DEFAULT 300,
        last_activity_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- 最后活动时间（用于自动清理）
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        INDEX idx_status (status),
        INDEX idx_template (template_id),
        INDEX idx_created (created_at),
        INDEX idx_runtime_node (runtime_node),  -- 支持节点故障时查询会话
        INDEX idx_last_activity (last_activity_at)  -- 支持自动清理查询
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**管理中心部署：**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sandbox-control-plane
  namespace: sandbox-system
spec:
  replicas: 3
  selector:
    matchLabels:
      app: control-plane
  template:
    metadata:
      labels:
        app: control-plane
    spec:
      serviceAccountName: sandbox-controller
      initContainers:
      - name: wait-for-mariadb
        image: mariadb:11.2
        command:
        - sh
        - -c
        - |
          until mysql -h mariadb -u sandbox -p${MYSQL_PASSWORD} -e "SELECT 1" 2>/dev/null; do
            echo "Waiting for MariaDB..."
            sleep 2
          done
        env:
        - name: MYSQL_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mariadb-secret
              key: user-password
      containers:
      - name: control-plane
        image: sandbox-control-plane:v1.0.0
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          value: "mysql+aiomysql://sandbox:$(MYSQL_PASSWORD)@mariadb:3306/sandbox"
        - name: MYSQL_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mariadb-secret
              key: user-password
        - name: RUNTIME_MODE
          value: "kubernetes"
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "2"
            memory: "2Gi"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: control-plane-service
  namespace: sandbox-system
spec:
  selector:
    app: control-plane
  ports:
  - port: 80
    targetPort: 8000
  type: LoadBalancer
```

**RBAC 配置：**
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: sandbox-controller
  namespace: sandbox-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: sandbox-controller-role
rules:
- apiGroups: ["sandbox.ai"]
  resources: ["sandboxes", "sandboxtemplates"]
  verbs: ["get", "list", "watch", "create", "update", "delete"]
- apiGroups: [""]
  resources: ["pods", "pods/log"]
  verbs: ["get", "list", "watch", "create", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: sandbox-controller-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: sandbox-controller-role
subjects:
- kind: ServiceAccount
  name: sandbox-controller
  namespace: sandbox-system
```

**HPA 自动扩缩容：**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: control-plane-hpa
  namespace: sandbox-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: sandbox-control-plane
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

---