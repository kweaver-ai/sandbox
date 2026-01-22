# 2.2 Container Scheduler 模块


> **文档导航**: [返回首页](index.md)


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

**Implementation Status**: ✅ Completed (2025-01-14)

The K8s scheduler is implemented in `sandbox_control_plane/src/infrastructure/container_scheduler/k8s_scheduler.py` following the design specification below.

Key implementation details:
- **File**: `k8s_scheduler.py` (~29KB, 750+ lines)
- **API Client**: Official Kubernetes Python client (`kubernetes` package)
- **Config Methods**: In-cluster config (ServiceAccount), kubeconfig file, or default config
- **Namespace**: Configurable (default: `sandbox-runtime`)
- **Interface**: Implements `IContainerScheduler` base interface

Pod 配置（第一层隔离）：
```python
class K8sScheduler:
    def _build_pod_spec(self, config: ContainerConfig) -> V1Pod:
        return V1Pod(
            metadata=V1ObjectMeta(
                name=config.name,
                labels={
                    "app": "sandbox",
                    "session": config.name,
                    **config.labels
                }
            ),
            spec=V1PodSpec(
                # 容器配置
                containers=[V1Container(
                    name="executor",
                    image=config.image,
                    command=["/usr/local/bin/sandbox-executor"],

                    # 环境变量
                    env=[V1EnvVar(name=k, value=v) for k, v in config.env_vars.items()],

                    # 资源限制
                    resources=V1ResourceRequirements(
                        limits={
                            "cpu": config.cpu_limit,
                            "memory": config.memory_limit,
                            "ephemeral-storage": config.disk_limit
                        },
                        requests={
                            "cpu": config.cpu_limit,
                            "memory": config.memory_limit
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

                # 卷定义 - 支持两种模式：
                # 1. S3 path (s3://...) - 使用 s3fs sidecar 或 PVC
                # 2. EmptyDir - 临时存储
                volumes=self._build_volumes(config),

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

    def _build_volumes(self, config: ContainerConfig) -> List[V1Volume]:
        """
        构建卷定义

        支持两种模式：
        1. S3 workspace - 创建 PVC 或使用 s3fs sidecar
        2. EmptyDir - 临时存储（用于本地测试）
        """
        workspace_path = config.workspace_path

        if workspace_path.startswith("s3://"):
            # S3 模式：创建 PVC（如果尚不存在）
            pvc_name = f"{config.name}-workspace"
            self._ensure_pvc_exists(pvc_name, workspace_path)

            return [
                V1Volume(
                    name="workspace",
                    persistent_volume_claim=V1PersistentVolumeClaimVolumeSource(
                        claim_name=pvc_name
                    )
                )
            ]
        else:
            # EmptyDir 模式（本地测试）
            return [
                V1Volume(
                    name="workspace",
                    empty_dir=V1EmptyDirVolumeSource(
                        medium="Memory",
                        size_limit=config.disk_limit
                    )
                )
            ]
```

**实际实现特性**:

1. **多配置加载方式**:
   - In-cluster config (ServiceAccount Token)
   - kubeconfig 文件 (本地开发)
   - 默认配置 (fallback)

2. **S3 Workspace 支持**:
   - 自动创建 PVC 用于 S3 挂载
   - 解析 S3 URL 获取 bucket 和路径
   - 支持 s3fs sidecar 容器模式

3. **Pod 生命周期管理**:
   - `create_container()` - 创建 Pod 并等待就绪
   - `start_container()` - 启动 Pod
   - `stop_container()` - 删除 Pod
   - `get_container_status()` - 获取 Pod 状态
   - `get_container_logs()` - 获取 Pod 日志
   - `is_container_running()` - 检查运行状态

4. **Python 依赖安装支持** (章节 5 设计):
   - 预装包列表 (template level)
   - 按需安装 (per-session)
   - 依赖安装状态持久化

**K8s 部署文件位置**:
- `deploy/manifests/00-namespace.yaml` - 命名空间定义
- `deploy/manifests/01-configmap.yaml` - 配置管理
- `deploy/manifests/02-secret.yaml` - 密钥管理
- `deploy/manifests/03-serviceaccount.yaml` - ServiceAccount
- `deploy/manifests/04-role.yaml` - RBAC 权限
- `deploy/manifests/05-control-plane-deployment.yaml` - Control Plane 部署
- `deploy/manifests/07-minio-deployment.yaml` - MinIO 部署
- `deploy/manifests/08-mariadb-deployment.yaml` - MariaDB 部署
- `deploy/manifests/deploy.sh` - 一键部署脚本

**Helm Chart 模板文件位置**:
- `deploy/helm/sandbox/templates/s3fs-secret.yaml` - s3fs 密钥配置
- `deploy/helm/sandbox/values.yaml` - s3fs 配置项

**S3 Workspace 挂载配置说明**：

**Implementation Status**: ✅ Fully Implemented (s3fs + mount --bind)

##### 2.2.2.1 Architecture Overview

The Sandbox Platform uses **s3fs** to provide POSIX-compliant file system access to S3-compatible object storage (MinIO) for workspace files. The s3fs FUSE filesystem runs inside each executor container, mounting the S3 bucket directly to `/workspace`.

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                          Kubernetes Cluster                                         │
│                                                                                    │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │  Control Plane Deployment (FastAPI)                                          │  │
│  │  • Session Management • Template CRUD • Execution API                        │  │
│  │  • Storage Service (S3 API → MinIO)                                         │  │
│  └───────────────────────────────────────┬──────────────────────────────────────┘  │
│                                          │ HTTP                                    │
│  ┌───────────────────────────────────────▼──────────────────────────────────────┐  │
│  │                   K8s Scheduler Volume Mounting                              │  │
│  │  ┌────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │       Executor Pod (emptyDir volume)                                    │  │  │
│  │  │  Volume: workspace → emptyDir                                          │  │  │
│  │  │  Container Mount: /workspace (emptyDir)                                 │  │  │
│  │  │                                                                        │  │  │
│  │  │  Startup Script:                                                       │  │  │
│  │  │  1. s3fs mounts S3 bucket to /mnt/s3-root                              │  │  │
│  │  │  2. mount --bind /mnt/s3-root/sessions/{id} /workspace                 │  │  │
│  │  │  3. Executor reads/writes files via standard POSIX I/O                 │  │  │
│  │  └────────────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
│                                          │                                           │
│  ┌───────────────────────────────────────▼──────────────────────────────────────┐  │
│  │                        Storage Layer (sandbox-system namespace)              │  │
│  │  ┌──────────────────────────────────────────────────────────────────────┐   │  │
│  │  │ MinIO (sandbox-workspace)                                            │   │  │
│  │  │ • S3-compatible API                                                  │   │  │
│  │  │ • Access/Secret keys                                                 │   │  │
│  │  │ • Direct file storage (sessions/{id}/...)                            │   │  │
│  │  └──────────────────────────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

##### 2.2.2.2 Component Breakdown

###### 2.2.2.2.1 MinIO (S3-Compatible Object Storage)

**Purpose**: Stores workspace files directly via S3 API

**Configuration** (`07-minio-deployment.yaml`):
- Image: `minio/minio:latest`
- Port: 9000 (API), 9001 (Console)
- Default Bucket: `sandbox-workspace`
- Access Keys: `minioadmin` / `minioadmin` (change in production)

**What It Stores**:
- Workspace files: User uploaded code, dependencies, output files
- File path structure: `sessions/{session_id}/{filename}`

**Access URLs**:
- API: `http://minio.sandbox-system.svc.cluster.local:9000`
- Console: `http://localhost:9001` (via NodePort/PortForward)

---

###### 2.2.2.2.2 s3fs FUSE Mount

**Purpose**: Mount S3 bucket as a filesystem inside executor containers

**Implementation** (`k8s_scheduler.py`):

The executor container startup script performs these steps:

```bash
# 1. Mount entire S3 bucket to temporary location
mkdir -p /mnt/s3-root
s3fs {bucket} /mnt/s3-root \
    -o url={minio_url} \
    -o use_path_request_style \
    -o allow_other \
    -o uid=1000 \
    -o gid=1000 \
    -o passwd_file=/etc/s3fs-passwd/s3fs-passwd &

# 2. Wait for mount to complete
sleep 2

# 3. Create session workspace directory
SESSION_PATH="/mnt/s3-root/sessions/{session_id}"
mkdir -p "$SESSION_PATH"

# 4. Use bind mount to overlay session path onto /workspace
mount --bind "$SESSION_PATH" /workspace

# 5. Start executor as sandbox user
exec gosu sandbox python -m executor.interfaces.http.rest
```

**Key Points**:
- `/workspace` is an emptyDir volume (Kubernetes mount point)
- `mount --bind` overlays the S3 session directory onto the emptyDir
- Files are accessed at `/workspace/{filename}` (not `/workspace/sessions/{id}/{filename}`)

---

###### 2.2.2.2.3 Control Plane Storage Service

**Implementation** (`src/infrastructure/storage/s3_storage.py`):

```python
class S3Storage(IStorageService):
    async def upload_file(self, s3_path: str, content: bytes):
        # s3_path format: "sessions/{session_id}/{filename}"
        self.s3_client.put_object(
            Bucket=settings.s3_bucket,
            Key=s3_path,
            Body=content
        )
```

**Environment Variables**:
```bash
# S3 Configuration
S3_ENDPOINT_URL=http://minio.sandbox-system.svc.cluster.local:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET=sandbox-workspace
S3_REGION=us-east-1
```

---

###### 2.2.2.2.4 K8s Scheduler (Volume Mounting)

**Code Location**: `src/infrastructure/container_scheduler/k8s_scheduler.py`

**Volume Configuration**:
```python
# Create emptyDir volume for /workspace
volumes.append(
    V1Volume(
        name="workspace",
        empty_dir=V1EmptyDirVolumeSource(),
    )
)

# Mount emptyDir to /workspace (will be overlayed with bind mount)
volume_mounts.append(
    V1VolumeMount(
        name="workspace",
        mount_path="/workspace",
    )
)
```

**Executor Environment Variables**:
```python
env_vars.extend([
    V1EnvVar(name="WORKSPACE_PATH", value="/workspace"),
    V1EnvVar(name="S3_BUCKET", value=s3_workspace["bucket"]),
    V1EnvVar(name="S3_PREFIX", value=s3_workspace["prefix"]),
])
```

---

##### 2.2.2.3 Data Flow: File Upload → Executor Access

**Scenario**: User uploads `main.py` to session workspace

```
1. Client Request
   POST /api/v1/sessions/{session_id}/files
   Body: multipart/form-data { file: main.py }

2. Control Plane API Handler
   └─> FileService.upload_file()
       └─> S3Storage.upload_file("sessions/{id}/main.py", content)

3. S3 Storage Service
   └─> boto3.client.put_object(
           Bucket="sandbox-workspace",
           Key="sessions/{id}/main.py",
           Body=content
       )

4. MinIO stores the file
   └─> Path: sandbox-workspace/sessions/{id}/main.py

5. K8s Scheduler Creates Pod
   └─> k8s_scheduler.create_container()
       ├─> Creates emptyDir volume for /workspace
       └─> Includes s3fs startup script with S3 credentials

6. Executor Pod Starts
   └─> Startup script:
       ├─> s3fs mounts S3 bucket to /mnt/s3-root
       ├─> mount --bind /mnt/s3-root/sessions/{id} /workspace
       └─> /workspace now shows files from sessions/{id}/

7. Executor Reads File
   └─> Python open("/workspace/main.py", "r")
       └─> Standard POSIX read() syscall
           └─> s3fs FUSE driver
               └─> HTTP GET to MinIO
                   └─> Returns file content
```

---

##### 2.2.2.4 Key Configuration Files

| File | Purpose | Key Settings |
|------|---------|--------------|
| `deploy/helm/sandbox/templates/s3fs-secret.yaml` | s3fs credentials | S3 keys for mount |
| `deploy/helm/sandbox/values.yaml` | Helm values | s3fs configuration |
| `deploy/manifests/07-minio-deployment.yaml` | MinIO deployment | Bucket, access keys |
| `src/infrastructure/config/settings.py` | Environment config | S3 credentials |
| `src/infrastructure/storage/s3_storage.py` | S3 storage wrapper | boto3 client operations |
| `src/infrastructure/container_scheduler/k8s_scheduler.py` | Pod volume mounting | s3fs startup script |

---

##### 2.2.2.5 Summary

**Critical Insights**:

1. **Simple Architecture**: Files are stored directly in MinIO using S3 API. No metadata database is needed - the file path structure (`sessions/{id}/{filename}`) provides all necessary organization.

2. **s3fs + bind mount**: The s3fs FUSE filesystem runs inside each executor container, mounting the entire S3 bucket to `/mnt/s3-root`. A bind mount then overlays the session-specific subdirectory to `/workspace`.

3. **Privileged Mode Required**: s3fs requires FUSE mounting, which needs `privileged: true` and running as root in the container. The executor process switches to the sandbox user via `gosu`.

4. **Direct S3 Access**: The Control Plane writes files directly to MinIO via S3 API. The executor containers read files via s3fs, which translates POSIX I/O to S3 API calls.

5. **Path Mapping**:
   - MinIO path: `sessions/{session_id}/test.py`
   - s3fs mount: `/mnt/s3-root/sessions/{session_id}/test.py`
   - bind mount target: `/workspace/test.py` ✅

6. **Advantages**:
   - **No CSI Driver** needed - s3fs runs in-container
   - **No metadata database** - simpler deployment
   - **Direct S3 API** writes from Control Plane
   - **Per-container isolation** - each executor has its own s3fs process

