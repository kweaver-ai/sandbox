# 沙箱平台技术方案设计- V2.1
## 1. 架构设计
### 1.1 整体架构

**技术栈选择说明**：

本系统采用 MariaDB 作为主要数据存储，而非传统的 Redis 缓存方案。这一设计选择基于以下考虑：

1. **数据一致性与事务支持**
   - MariaDB 提供 ACID 事务保证，确保会话状态变更的原子性
   - 避免缓存与数据库不一致问题
   - 支持复杂的关系查询和 JOIN 操作

2. **关系型数据模型**
   - 会话 (sessions)、执行记录 (executions)、模板 (templates) 存在明确的外键关系
   - 支持级联删除、数据完整性约束
   - 便于跨表查询和数据分析

3. **持久化与可靠性**
   - 数据即时持久化到磁盘，无需担心内存数据丢失
   - 支持主从复制、备份恢复
   - InnoDB 引擎提供崩溃恢复能力

4. **性能考虑**
   - MariaDB 11.2+ 的 InnoDB 性能足以支撑高并发场景
   - 连接池机制减少连接开销
   - 合理的索引设计保证查询性能
   - 对于热点数据可应用 MySQL 查询缓存

5. **运维与扩展**
   - 成熟的监控、备份、高可用方案
   - 支持读写分离、分库分表等水平扩展方案
   - 丰富的工具链和社区支持

6. **成本效益**
   - 相比 Redis + 数据库的双重存储架构，简化了部署
   - 减少了缓存同步的复杂性
   - 降低总体拥有成本（TCO）

**性能优化策略**：

为弥补关系型数据库相比内存缓存的性能劣势，系统采用以下优化措施：

1. **连接池管理**：使用 SQLAlchemy 异步连接池（pool_size=50, max_overflow=100）
2. **索引优化**：在 status、agent_id、template_id、created_at 等高频查询字段建立索引
3. **查询优化**：使用 SELECT 指定字段而非 SELECT *，避免全表扫描
4. **批量操作**：支持事务批量插入，减少网络往返
5. **读写分离**：未来可扩展为主从架构，读操作分流到从库

**适用场景对比**：

| 场景 | Redis 方案 | MariaDB 方案 |
|------|-----------|--------------|
| 会话状态存储 | ❌ 需额外持久化 | ✅ 直接持久化 |
| 关系查询 | ❌ 不支持 | ✅ 天然支持 |
| 事务保证 | ❌ 有限支持 | ✅ 完整 ACID |
| 数据分析 | ❌ 需额外工具 | ✅ SQL 支持 |
| 部署复杂度 | ❌ 需 + DB | ✅ 单一存储 |
| 极致性能 | ✅ 内存优势 | ✅ 足够快速 |
| 数据一致性 | ❌ 需同步机制 | ✅ 单一数据源 |

系统采用管理中心（Control Plane）与运行时（Runtime）分离的云原生架构，支持 Docker 和 Kubernetes 两种部署模式。
核心设计原则：

- 控制平面无状态，支持水平扩展
- 运行时池化管理，动态伸缩
- 协议驱动的解耦设计
- 多层安全隔离
- 异步高并发处理


### 1.2 C4 架构模型
#### C4 Level 1: 系统上下文
![alt text](image.png)
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
        Runtime["运行时<br/>(Runtime)"]
    end
    
    上层服务 -->|执行代码请求| ControlPlane
    Dev -->|SDK/API 调用| ControlPlane
    ControlPlane -->|调度任务| Runtime
    ControlPlane -->|创建/管理 Pod| K8s
    ControlPlane -->|管理容器| Docker
    Runtime -->|上报结果| ControlPlane
    Runtime -->|运行在| K8s
    Runtime -->|运行在| Docker
    
    style SandboxPlatform fill:#e1f5ff
    style External fill:#fff4e6
```
外部交互：

- DataAgent/Operator Platform 系统通过 RESTful API 发起代码执行请求
- 开发者通过 Python SDK 集成沙箱能力
- 依赖 Kubernetes/Docker 提供容器基础设施


#### C4 Level 2: 容器视图
![alt text](image-1.png)
```mermaid
graph TB
    subgraph ControlPlane["管理中心 (Control Plane)"]
        API["API Gateway<br/>(FastAPI)"]
        Scheduler["调度器<br/>(Scheduler)"]
        SessionMgr["会话管理器<br/>(Session Manager)"]
        TemplateMgr["模板管理器<br/>(Template Manager)"]
        Monitor["监控探针<br/>(Health Probe)"]
        ResultStore["结果存储<br/>(Result Store)"]
    end
    
    subgraph RuntimePool["运行时池 (Runtime Pool)"]
        DockerRuntime["Docker 运行时"]
        K8sRuntime["K8s 运行时"]
        WarmPool["预热池<br/>(Warm Pool)"]
    end
    
    subgraph Sandbox["沙箱实例"]
        Container["容器<br/>(Docker/Pod)"]
        BubbleWrap["Bubblewrap<br/>(进程隔离)"]
        Executor["执行器<br/>(Code Executor)"]
    end
    
    subgraph Storage["存储层"]
        MariaDB["MariaDB<br/>(会话状态/模板)"]
        S3["对象存储<br/>(执行结果)"]
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
    
    DockerRuntime --> Container
    K8sRuntime --> Container
    WarmPool --> Container
    Container --> BubbleWrap
    BubbleWrap --> Executor
    Executor -->|上报结果| API
    
    TemplateMgr --> Etcd
    
    style ControlPlane fill:#bbdefb
    style RuntimePool fill:#c8e6c9
    style Sandbox fill:#fff9c4
    style Storage fill:#f8bbd0
```
关键容器：

- API Gateway: 统一入口，基于 FastAPI 实现
- 调度器: 智能任务分发和资源调度
- 会话管理器: 会话生命周期管理
- 运行时池: Docker/K8s 运行时实例管理
- 存储层: MariaDB（会话状态/模板）+ S3（结果）+ Etcd（配置）


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
    mode: Literal["ephemeral", "persistent"] = "ephemeral"
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
调度器负责为会话请求选择最优的运行时节点。根据会话模式（临时/持久）采用不同的调度策略，以优化性能和资源利用率。
会话模式说明：
1. 临时模式 (Ephemeral Mode)

- 每次执行创建新容器，执行完立即销毁
- 无状态保留，完全隔离

适用场景：

- 单次独立任务（如格式化文本、简单计算）
- 大规模并行处理（1000+ 并发独立任务）
- 高安全要求（执行不可信代码后立即销毁）
- 无需保持状态的批处理任务



2. 持久模式 (Persistent Mode)

- 创建后保持运行，可接受多次执行请求
- 保留变量、文件系统、已安装依赖

适用场景：

- 多轮交互式任务（数据分析、调试、迭代开发）
- 大型依赖安装（避免重复安装 TensorFlow 等）
- 状态保持需求（Agent 需要在多次执行间共享数据）
- 交互式编程体验



调度策略：
1. 临时模式调度策略
```python
# 临时模式：注重隔离性和并发能力
- 优先使用预热池实例（快速响应）
- 负载均衡优先（避免热点节点）
- 执行完立即回收资源
- 不考虑节点亲和性（每次全新环境）
```
2. 持久模式调度策略
```python
# 持久模式：注重状态保持和响应速度
- Agent 亲和性调度（同一 Agent 的请求调度到同一节点）
- 模板亲和性调度（优先选择已缓存镜像的节点）
- 会话复用（检查是否有可复用的活跃会话）
- 长期占用资源（需要超时回收机制）
```
3. 预热池调度

```
- 为常用模板维护预热实例池
- 临时模式优先使用预热池（快速启动）
- 持久模式在无可复用会话时使用预热池
- 动态调整预热池大小（根据负载）
```

调度流程实现：
```python
class Scheduler:
    def __init__(self):
        self.agent_session_map = {}  # Agent -> Session 映射
        self.session_node_map = {}   # Session -> Node 映射
        self.agent_node_history = {} # Agent -> [Node] 历史记录
    
    async def schedule(self, request: CreateSessionRequest) -> RuntimeNode:
        """根据会话模式选择调度策略"""
        
        if request.mode == "persistent":
            return await self._schedule_persistent(request)
        else:  # ephemeral
            return await self._schedule_ephemeral(request)
    
    async def _schedule_persistent(self, request: CreateSessionRequest) -> RuntimeNode:
        """持久模式调度：优先考虑会话复用和节点亲和性"""
        agent_id = request.agent_id
        
        # 1. 检查是否有该 Agent 的活跃持久会话
        if agent_id in self.agent_session_map:
            existing_session = self.agent_session_map[agent_id]
            if existing_session.status == SessionStatus.RUNNING:
                # 复用现有会话（最快，10-50ms）
                logger.info(f"Reusing existing session {existing_session.id} for agent {agent_id}")
                return self.session_node_map[existing_session.id]
        
        # 2. 检查该 Agent 最近使用的节点（镜像缓存命中率高）
        if agent_id in self.agent_node_history:
            recent_node = self.agent_node_history[agent_id][-1]
            if self._is_node_healthy(recent_node) and recent_node.has_capacity():
                logger.info(f"Agent affinity: scheduling to recent node {recent_node.id}")
                return recent_node
        
        # 3. 检查预热池（针对该模板的预热实例）
        if warm_instance := await self.warm_pool.acquire(request.template_id):
            logger.info(f"Using warm pool instance for template {request.template_id}")
            return warm_instance.node
        
        # 4. 亲和性评分 + 负载均衡
        nodes = await self.health_probe.get_healthy_nodes()
        best_node = await self._select_best_node_with_affinity(nodes, request)
        
        # 5. 记录 Agent 节点历史（用于后续亲和性调度）
        self._record_agent_node_history(agent_id, best_node)
        
        return best_node
    
    async def _schedule_ephemeral(self, request: CreateSessionRequest) -> RuntimeNode:
        """临时模式调度：优先考虑预热池和负载均衡"""
        
        # 1. 优先使用预热池（快速启动）
        if warm_instance := await self.warm_pool.acquire(request.template_id):
            logger.info(f"Ephemeral mode: using warm pool instance")
            # 临时模式使用后立即标记为待回收
            warm_instance.mark_ephemeral()
            return warm_instance.node
        
        # 2. 负载均衡选择节点（不考虑亲和性）
        nodes = await self.health_probe.get_healthy_nodes()
        best_node = await self._select_best_node_by_load(nodes, request)
        
        return best_node
    
    async def _select_best_node_with_affinity(
        self, 
        nodes: List[RuntimeNode], 
        req: CreateSessionRequest
    ) -> RuntimeNode:
        """持久模式：综合评分（负载 + 亲和性）"""
        scored_nodes = [
            (node, self._calculate_affinity_score(node, req))
            for node in nodes
        ]
        
        best_node = max(scored_nodes, key=lambda x: x[1])[0]
        
        logger.info(
            f"Selected node {best_node.id} with affinity score "
            f"{max(scored_nodes, key=lambda x: x[1])[1]:.2f}"
        )
        
        return best_node
    
    async def _select_best_node_by_load(
        self, 
        nodes: List[RuntimeNode], 
        req: CreateSessionRequest
    ) -> RuntimeNode:
        """临时模式：纯负载均衡"""
        scored_nodes = [
            (node, self._calculate_load_score(node))
            for node in nodes
        ]
        
        best_node = max(scored_nodes, key=lambda x: x[1])[0]
        return best_node
    
    def _calculate_affinity_score(self, node: RuntimeNode, req: CreateSessionRequest) -> float:
        """计算持久模式的综合评分（负载 + 亲和性）"""
        
        # 基础负载评分 (权重 0.6)
        cpu_score = (1 - node.cpu_usage) * 0.24  # 40% of 60%
        mem_score = (1 - node.mem_usage) * 0.24  # 40% of 60%
        session_score = (1 - node.session_count / node.max_sessions) * 0.12  # 20% of 60%
        load_score = cpu_score + mem_score + session_score
        
        # 亲和性评分 (权重 0.4)
        affinity_score = 0.0
        
        # 1. 模板亲和性（镜像已缓存）
        if req.template_id in node.cached_templates:
            affinity_score += 0.2
        
        # 2. Agent 历史节点亲和性
        if req.agent_id and node.id in self._get_agent_history_nodes(req.agent_id):
            affinity_score += 0.15
        
        # 3. 同模板会话亲和性（节点擅长此类任务）
        same_template_sessions = node.get_sessions_by_template(req.template_id)
        affinity_score += min(len(same_template_sessions) * 0.025, 0.05)
        
        return load_score + affinity_score
    
    def _calculate_load_score(self, node: RuntimeNode) -> float:
        """计算临时模式的纯负载评分"""
        cpu_score = (1 - node.cpu_usage) * 0.4
        mem_score = (1 - node.mem_usage) * 0.4
        session_score = (1 - node.session_count / node.max_sessions) * 0.2
        
        return cpu_score + mem_score + session_score
    
    def _record_agent_node_history(self, agent_id: str, node: RuntimeNode):
        """记录 Agent 使用节点的历史（用于亲和性调度）"""
        if agent_id not in self.agent_node_history:
            self.agent_node_history[agent_id] = []
        
        # 保留最近 5 个节点记录
        self.agent_node_history[agent_id].append(node)
        if len(self.agent_node_history[agent_id]) > 5:
            self.agent_node_history[agent_id].pop(0)
    
    def _get_agent_history_nodes(self, agent_id: str) -> List[str]:
        """获取 Agent 历史使用过的节点 ID 列表"""
        if agent_id not in self.agent_node_history:
            return []
        return [node.id for node in self.agent_node_history[agent_id]]
```

性能优化说明：

1. 持久模式的优化路径

```

最优：会话复用（10-50ms）
     ↓ 无可复用会话
   次优：Agent 亲和节点（100-500ms，镜像已缓存）
     ↓ 节点无容量
   良好：预热池实例（500ms-1s）
     ↓ 预热池耗尽
   可接受：冷启动（2-5s）
```

2. 临时模式的优化路径

```
最优：预热池实例（100ms）
     ↓ 预热池耗尽
   可接受：负载均衡冷启动（2-5s）
```

3. 预热池策略

```
WARM_POOL_CONFIG = {
       # 高频模板（如 Python 数据分析）
       "python-datascience": {
           "ephemeral_pool_size": 20,   # 临时模式预留
           "persistent_pool_size": 10,   # 持久模式预留
           "min_size": 15,
           "max_idle_time": 300
       },
       # 低频模板
       "nodejs-basic": {
           "ephemeral_pool_size": 5,
           "persistent_pool_size": 3,
           "min_size": 3,
           "max_idle_time": 180
       }
   }
```

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
    agent_id VARCHAR(128),
    status ENUM('creating', 'running', 'completed', 'failed', 'timeout', 'terminated') NOT NULL,
    mode ENUM('ephemeral', 'persistent') NOT NULL DEFAULT 'ephemeral',
    runtime_type ENUM('docker', 'kubernetes') NOT NULL,
    runtime_node VARCHAR(128),
    container_id VARCHAR(128),
    pod_name VARCHAR(128),
    resources_cpu VARCHAR(16),
    resources_memory VARCHAR(16),
    resources_disk VARCHAR(16),
    env_vars JSON,
    timeout INT NOT NULL DEFAULT 300,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    INDEX idx_status (status),
    INDEX idx_agent (agent_id),
    INDEX idx_template (template_id),
    INDEX idx_created (created_at)
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
    agent_id = Column(String(128))
    status = Column(Enum("creating", "running", "completed", "failed", "timeout", "terminated"), nullable=False)
    mode = Column(Enum("ephemeral", "persistent"), nullable=False, default="ephemeral")
    runtime_type = Column(Enum("docker", "kubernetes"), nullable=False)
    runtime_node = Column(String(128))
    container_id = Column(String(128))
    pod_name = Column(String(128))
    resources_cpu = Column(String(16))
    resources_memory = Column(String(16))
    resources_disk = Column(String(16))
    env_vars = Column(JSON)
    timeout = Column(Integer, default=300)
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

        # 3. 创建数据库事务
        async with self.async_session() as db:
            # 创建会话记录
            session_db = SessionDB(
                id=session_id,
                template_id=request.template_id,
                agent_id=request.agent_id,
                status=SessionStatus.CREATING,
                mode=request.mode,
                runtime_type=runtime_node.type,
                runtime_node=runtime_node.id,
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

            # 获取运行时节点信息
            runtime_node = await self.scheduler.get_node(session_db.runtime_node)

            # 调用运行时清理资源
            await runtime_node.destroy_container(session_id, session_db.container_id)

            # 更新数据库状态
            session_db.status = SessionStatus.TERMINATED
            session_db.completed_at = datetime.now()
            await db.commit()

            # 回收到 Warm Pool（如果是持久模式）
            if session_db.mode == "persistent":
                await self.warm_pool.recycle(self._db_to_pydantic(session_db))

    async def get_active_sessions_by_agent(self, agent_id: str) -> List[Session]:
        """获取指定 Agent 的所有活跃会话（用于持久模式会话复用）"""
        async with self.async_session() as db:
            result = await db.execute(
                select(SessionDB)
                .where(SessionDB.agent_id == agent_id)
                .where(SessionDB.status == SessionStatus.RUNNING)
                .where(SessionDB.mode == "persistent")
                .order_by(SessionDB.created_at.desc())
            )
            sessions_db = result.scalars().all()
            return [self._db_to_pydantic(s) for s in sessions_db]

    def _db_to_pydantic(self, session_db: SessionDB) -> Session:
        """将 SQLAlchemy 模型转换为 Pydantic 模型"""
        return Session(
            id=session_db.id,
            template_id=session_db.template_id,
            agent_id=session_db.agent_id,
            status=SessionStatus(session_db.status),
            mode=session_db.mode,
            runtime_type=session_db.runtime_type,
            runtime_node=session_db.runtime_node,
            container_id=session_db.container_id,
            pod_name=session_db.pod_name,
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

    async def cleanup_expired_sessions(self):
        """定期清理过期会话（后台任务）"""
        async with self.async_session() as db:
            expiry_threshold = datetime.now() - timedelta(hours=24)
            await db.execute(
                update(SessionDB)
                .where(SessionDB.status == SessionStatus.COMPLETED)
                .where(SessionDB.completed_at < expiry_threshold)
                .values(status=SessionStatus.ARCHIVED)
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

### 2.2 运行时 (Runtime)

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
                        empty_dir=V1EmptyDirVolumeSource(
                            size_limit="1Gi"
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

### 2.3 执行器 (Executor)

执行器是运行在容器内的守护进程，负责接收执行请求并通过 Bubblewrap 启动用户代码，实现第二层隔离。

2.3.1 执行器架构
执行器职责：

- 在容器启动时作为主进程运行
- 监听 HTTP 请求（来自管理中心）
- 接收用户代码和执行参数
- 调用 bwrap 命令隔离执行用户代码
- 收集执行结果（stdout、stderr、生成文件）
- 上报结果到管理中心

核心实现：

```python
# sandbox-executor.py
# 运行在容器内的执行器进程

import asyncio
import json
import subprocess
import tempfile
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

class ExecutionResult(BaseModel):
    status: str
    stdout: str
    stderr: str
    exit_code: int
    execution_time: float
    artifacts: list[str] = []

class SandboxExecutor:
    def __init__(self):
        self.workspace = Path("/workspace")
        self.workspace.mkdir(exist_ok=True)
        
        self.session_id = os.environ.get("SESSION_ID")
        self.control_plane_url = os.environ.get("CONTROL_PLANE_URL")
        
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
            "--share-net",  # 可选：根据需求决定是否共享网络
            
            # 进程管理
            "--die-with-parent",  # 父进程死亡时自动终止
            "--new-session",
            
            # 环境变量清理
            "--clearenv",
            "--setenv", "PATH", "/usr/local/bin:/usr/bin:/bin",
            "--setenv", "HOME", "/workspace",
            "--setenv", "TMPDIR", "/tmp",
            
            # 安全选项
            "--cap-drop", "ALL",  # 删除所有 capabilities
        ]
    
    async def execute_code(self, request: ExecuteRequest) -> ExecutionResult:
        """执行用户代码（通过 bwrap 隔离）"""
        
        start_time = time.time()
        
        try:
            # 1. 根据语言构建执行命令
            if request.language == "python":
                code_file = self.workspace / "user_code.py"
                code_file.write_text(request.code)
                
                exec_cmd = self.bwrap_base_args + [
                    "--ro-bind", str(code_file), "/workspace/user_code.py",
                    "--",
                    "python3", "/workspace/user_code.py"
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
            
            execution_time = time.time() - start_time
            
            # 3. 收集执行结果
            execution_result = ExecutionResult(
                status="success" if result.returncode == 0 else "failed",
                stdout=result.stdout,
                stderr=result.stderr,
                exit_code=result.returncode,
                execution_time=execution_time,
                artifacts=self._collect_artifacts()
            )
            
        except subprocess.TimeoutExpired:
            execution_time = time.time() - start_time
            execution_result = ExecutionResult(
                status="timeout",
                stdout="",
                stderr=f"Execution timeout after {request.timeout} seconds",
                exit_code=-1,
                execution_time=execution_time,
                artifacts=[]
            )
            
        except Exception as e:
            execution_time = time.time() - start_time
            execution_result = ExecutionResult(
                status="error",
                stdout="",
                stderr=str(e),
                exit_code=-1,
                execution_time=execution_time,
                artifacts=[]
            )
        
        # 4. 上报结果到管理中心
        await self._report_result(execution_result)
        
        return execution_result
    
    def _collect_artifacts(self) -> list[str]:
        """收集生成的文件"""
        artifacts = []
        for file_path in self.workspace.rglob("*"):
            if file_path.is_file() and not file_path.name.startswith("."):
                artifacts.append(str(file_path.relative_to(self.workspace)))
        return artifacts
    
    async def _report_result(self, result: ExecutionResult):
        """上报执行结果到管理中心"""
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"{self.control_plane_url}/api/v1/sessions/{self.session_id}/result",
                    json=result.dict(),
                    timeout=10.0
                )
        except Exception as e:
            logger.error(f"Failed to report result: {e}")

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

#### 2.3.2 Bubblewrap 安全配置详解
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
        Scheduler-->>SessionMgr: 返回运行时节点
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
![alt text](image-3.png)
```mermaid
sequenceDiagram
    participant Agent as AI Agent
    participant API as API Gateway
    participant SessionMgr as 会话管理器
    participant Runtime as 运行时
    participant Executor as 执行器
    participant DB as MariaDB
    participant S3 as 对象存储

    Agent->>API: POST /sessions/{id}/execute (code, language)
    API->>SessionMgr: get_session(id)
    SessionMgr->>DB: SELECT * FROM sessions WHERE id=?
    DB-->>SessionMgr: 返回会话信息
    SessionMgr-->>API: 返回会话信息

    API->>Runtime: execute_code(session_id, request)
    Runtime->>Executor: 注入代码并执行

    par 异步执行
        Executor->>Executor: 运行代码 (subprocess)
        Executor->>Executor: 收集 stdout/stderr
        Executor->>Executor: 扫描生成的文件
    end

    Executor->>API: POST /sessions/{id}/result (execution_result)
    API->>DB: INSERT INTO executions ...
    API->>S3: 上传大文件结果
    DB-->>API: 确认保存
    S3-->>API: 上传完成
    API-->>Executor: 200 OK

    Runtime-->>API: 返回执行 ID
    API-->>Agent: 返回执行状态

    Agent->>API: GET /sessions/{id}/result
    API->>DB: SELECT * FROM executions WHERE session_id=?
    DB-->>API: 返回结果数据
    API-->>Agent: 返回执行结果
```
### 3.3 健康检查与故障恢复流程
![alt text](image-4.png)
```mermaid
sequenceDiagram
    participant Probe as 监控探针
    participant Runtime as 运行时节点
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
    mode: str  # "ephemeral" or "persistent"
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
    artifacts: List[str]  # 生成的文件路径
    created_at: datetime
    completed_at: Optional[datetime]

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

#### 4.2.1 控制平面 API

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
    agent_id VARCHAR(128),
    status ENUM('creating', 'running', 'completed', 'failed', 'timeout', 'terminated') NOT NULL,
    mode ENUM('ephemeral', 'persistent') NOT NULL DEFAULT 'ephemeral',
    runtime_type ENUM('docker', 'kubernetes') NOT NULL,
    runtime_node VARCHAR(128),
    container_id VARCHAR(128),
    pod_name VARCHAR(128),
    resources_cpu VARCHAR(16),
    resources_memory VARCHAR(16),
    resources_disk VARCHAR(16),
    env_vars JSON,
    timeout INT NOT NULL DEFAULT 300,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    INDEX idx_status (status),
    INDEX idx_agent (agent_id),
    INDEX idx_template (template_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 执行记录表
CREATE TABLE IF NOT EXISTS executions (
    id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    code TEXT NOT NULL,
    language VARCHAR(16) NOT NULL,
    status ENUM('pending', 'running', 'completed', 'failed', 'timeout') NOT NULL,
    stdout MEDIUMTEXT,
    stderr MEDIUMTEXT,
    exit_code INT,
    execution_time FLOAT,
    artifacts JSON,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    INDEX idx_session (session_id),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
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
        agent_id VARCHAR(128),
        status ENUM('creating', 'running', 'completed', 'failed', 'timeout', 'terminated') NOT NULL,
        mode ENUM('ephemeral', 'persistent') NOT NULL DEFAULT 'ephemeral',
        runtime_type ENUM('docker', 'kubernetes') NOT NULL,
        runtime_node VARCHAR(128),
        container_id VARCHAR(128),
        pod_name VARCHAR(128),
        resources_cpu VARCHAR(16),
        resources_memory VARCHAR(16),
        resources_disk VARCHAR(16),
        env_vars JSON,
        timeout INT NOT NULL DEFAULT 300,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        INDEX idx_status (status),
        INDEX idx_agent (agent_id),
        INDEX idx_template (template_id),
        INDEX idx_created (created_at)
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