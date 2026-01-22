# 3. 关键流程设计 + 4. 数据模型设计


> **文档导航**: [返回首页](index.md)


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

### 4.4 S3 Workspace 挂载架构

**Implementation Status**: ✅ Fully Implemented

S3 workspace 挂载使容器内的用户代码能够像访问本地文件系统一样访问 S3 对象存储（MinIO）。

> **详细文档**: 完整的 S3 workspace 挂载架构、配置和实现细节请参考 [10-minio-only-architecture.md](10-minio-only-architecture.md)。

#### 快速概览

Kubernetes 环境使用 **s3fs + bind mount** 方式实现 S3 workspace 挂载：

- **挂载方式**: 容器内启动脚本挂载 s3fs，使用 bind mount 覆盖 /workspace
- **挂载时机**: 容器启动时通过启动脚本自动完成
- **存储后端**: MinIO（S3-compatible 对象存储）

**关键组件**:
- Control Plane: Session Service + K8s Scheduler (s3fs mode)
- Executor Pod: 启动脚本挂载 s3fs → /mnt/s3-root → bind mount → /workspace
- Storage Layer: MinIO (sandbox-workspace bucket)

**配置要求**:
- S3 credentials (access key, secret key, endpoint URL)
- s3fs secret for executor pods
- S3-compatible storage (MinIO or AWS S3)

**文件操作流程**:
1. **上传**: Client → File API → S3Storage Service → MinIO
2. **容器内访问**: Executor → POSIX I/O → /workspace → s3fs → MinIO
3. **下载**: Client → File API → presigned URL → MinIO (direct)

**安全考虑**:
- SYS_ADMIN capability 仅在 S3 workspace 模式下启用
- 用户降权 (UID:GID 1000:1000)
- 网络隔离 (NetworkMode=none 或独立网络)

有关部署、验证、故障处理和性能优化的详细信息，请参考 [10-minio-only-architecture.md](10-minio-only-architecture.md)。

## 5. Python 三方依赖安装技术方案

### 5.1 概述

本章节描述沙箱平台的 **Python 三方依赖自动安装功能**。该功能允许在创建会话时指定需要安装的 Python 包，系统会在容器启动时自动安装这些依赖，并持久化到 S3 workspace。

#### 5.1.1 核心需求

| 需求项 | 说明 |
|-------|------|
| **安装时机** | 容器启动时（在 entrypoint 脚本中自动完成） |
| **作用域** | 会话级别（安装到容器本地文件系统） |
| **安装位置** | `/opt/sandbox-venv/`（本地磁盘，非持久化） |
| **网络访问** | 容器使用 `sandbox_network`（bridge），可访问 PyPI |
| **用户代码隔离** | 用户代码仍然通过 Bubblewrap 执行（`--unshare-net` 无网络） |

#### 5.1.2 架构兼容性

**保持不变的现有逻辑**：
- ✅ `sandbox_network` (bridge)：容器间通信，executor ↔ control_plane
- ✅ `_build_s3_mount_entrypoint()`：S3 bucket 挂载逻辑
- ✅ `gosu sandbox`：用户切换逻辑
- ✅ Bubblewrap：用户代码执行隔离（`--unshare-net`）

**新增逻辑**：
- ✅ 在 `gosu` 切换前，以 root 身份安装依赖到 `/opt/sandbox-venv/`（本地磁盘）
- ✅ 安装完成后 `chown -R sandbox:sandbox /opt/sandbox-venv/`
- ✅ 然后执行 `gosu sandbox` 启动 executor
- ✅ 设置 `PYTHONPATH=/opt/sandbox-venv:/app:/workspace` 使依赖可导入

### 5.2 核心流程

```mermaid
sequenceDiagram
    participant Client as 👤 Client
    participant API as 🌐 API Gateway
    participant SM as 📦 Session Manager
    participant Scheduler as ⚙️ Scheduler
    participant Docker as 🐳 Docker Scheduler
    participant Entrypoint as 📜 Entrypoint Script
    participant Pip as 📦 pip install
    participant Executor as ⚡ sandbox-executor
    participant S3 as 📦 S3 Workspace

    Client->>API: POST /api/v1/sessions<br/>{dependencies: [{"name": "requests", "version": "==2.31.0"}]}
    API->>SM: create_session(command)

    SM->>SM: 解析依赖列表<br/>dependencies = ["requests==2.31.0"]
    SM->>SM: 版本冲突检测（Template vs 用户请求）

    SM->>Scheduler: schedule(config)
    Scheduler-->>SM: runtime_node

    SM->>Docker: create_container(config)<br/>config.labels["dependencies"] = ["requests==2.31.0"]

    Note over Docker: 容器启动（root 用户）
    Docker->>Entrypoint: 执行 entrypoint 脚本

    Entrypoint->>Entrypoint: 1. 挂载 S3 bucket（s3fs）
    Entrypoint->>Entrypoint: 2. 创建 /workspace 符号链接
    Entrypoint->>Entrypoint: 3. 检查 dependencies 环境变量

    alt 有依赖需要安装
        Entrypoint->>Entrypoint: mkdir -p /opt/sandbox-venv/
        Entrypoint->>Pip: pip3 install --target /opt/sandbox-venv/ requests==2.31.0
        Pip->>Pip: 从 PyPI 下载并安装
        Pip->>Entrypoint: 写入到 /opt/sandbox-venv/（本地磁盘）
        Pip-->>Entrypoint: 安装成功
        Entrypoint->>Entrypoint: chown -R sandbox:sandbox /opt/sandbox-venv/
    end

    Entrypoint->>Entrypoint: 4. gosu sandbox 启动 executor
    Entrypoint->>Executor: exec gosu sandbox python -m executor.interfaces.http.rest

    Executor->>API: 上报 ready（依赖已安装完成）
    API-->>Client: Session created (status: running)

    Note over Client,S3: 用户代码执行时，可通过 import<br/>import requests  # 已安装到 .venv/
```

### 5.3 API 设计

#### 5.3.1 扩展创建会话接口

**请求模型**：

```python
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

class DependencySpec(BaseModel):
    """依赖包规范"""
    name: str = Field(..., min_length=1, max_length=100, description="包名称")
    version: Optional[str] = Field(None, description="版本约束 (如: ==2.31.0, >=1.0)")

    @field_validator("name")
    @classmethod
    def validate_package_name(cls, v: str) -> str:
        import re
        # 禁止路径穿越
        if ".." in v or v.startswith("/"):
            raise ValueError("Package name cannot contain path traversal characters")
        # 禁止 URL
        if "://" in v:
            raise ValueError("Package name cannot contain URL")
        # PyPI 包名规范
        if not re.match(r"^[a-zA-Z0-9._-]+$", v):
            raise ValueError("Invalid package name format")
        return v

    def to_pip_spec(self) -> str:
        """转换为 pip 安装规范"""
        if self.version:
            return f"{self.name}{self.version}"
        return self.name

class CreateSessionRequest(BaseModel):
    """创建会话请求（扩展版）"""
    template_id: str
    timeout: int = 300
    cpu: str = "1"
    memory: str = "512Mi"
    disk: str = "1Gi"
    env_vars: Dict[str, str] = {}

    # 新增字段
    dependencies: List[DependencySpec] = Field(
        default_factory=list,
        max_length=50,
        description="会话级依赖包列表"
    )
    install_timeout: int = Field(
        300,
        ge=30,
        le=1800,
        description="依赖安装超时时间（秒）"
    )
    fail_on_dependency_error: bool = Field(
        True,
        description="依赖安装失败时是否终止会话创建"
    )
    allow_version_conflicts: bool = Field(
        False,
        description="是否允许版本冲突（Template 预装包 vs 用户请求包）"
    )
```

**请求示例**：

```bash
curl -X POST http://localhost:8000/api/v1/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "python3.11-baseline",
    "dependencies": [
      {"name": "requests", "version": "==2.31.0"},
      {"name": "pandas", "version": ">=2.0"},
      {"name": "numpy"}
    ],
    "install_timeout": 600,
    "fail_on_dependency_error": true
  }'
```

### 5.4 Docker Scheduler 实现

#### 5.4.1 修改 `_build_s3_mount_entrypoint()` 方法

**文件**: `sandbox_control_plane/src/infrastructure/container_scheduler/docker_scheduler.py`

**现有签名**：

```python
def _build_s3_mount_entrypoint(
    self,