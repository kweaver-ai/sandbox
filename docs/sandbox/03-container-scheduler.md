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
- `deploy/manifests/06-juicefs-csi-driver.yaml` - JuiceFS CSI Driver (v0.25.2) 完整配置
- `deploy/manifests/07-minio-deployment.yaml` - MinIO 部署
- `deploy/manifests/08-mariadb-deployment.yaml` - MariaDB 部署
- `deploy/manifests/09-juicefs-setup.yaml` - JuiceFS 数据库初始化
- `deploy/manifests/09a-juicefs-storageclass.yaml` - JuiceFS StorageClass 定义
- `deploy/manifests/10-juicefs-hostpath-setup.yaml` - JuiceFS hostPath 挂载助手
- `deploy/manifests/deploy.sh` - 一键部署脚本

**Helm Chart 模板文件位置**:
- `deploy/helm/sandbox/templates/juicefs-csi-driver.yaml` - CSI Driver ConfigMap, RBAC, StatefulSet, DaemonSet, CSIDriver
- `deploy/helm/sandbox/templates/juicefs-storageclass.yaml` - JuiceFS Secret 和 StorageClass
- `deploy/helm/sandbox/values.yaml` - juicefs.csi 配置项 (image: v0.25.2, namespace: kube-system)

**S3 Workspace 挂载配置说明**：

**Implementation Status**: ✅ Fully Implemented (JuiceFS CSI Driver v0.25.2)

##### 2.2.2.1 Architecture Overview

The Sandbox Platform uses **JuiceFS** to provide high-performance, POSIX-compliant file system access to S3-compatible object storage (MinIO) for workspace files. This architecture enables executor pods to access shared workspace files across multiple executions while maintaining cloud-native portability.


```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                          Kubernetes Cluster                                         │
│                                                                                    │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │  Control Plane Deployment (FastAPI)                                          │  │
│  │  • Session Management • Template CRUD • Execution API                        │  │
│  │  • Storage Service (JuiceFS SDK → S3 API fallback)                           │  │
│  └───────────────────────────────────────┬──────────────────────────────────────┘  │
│                                          │ HTTP                                    │
│  ┌───────────────────────────────────────▼──────────────────────────────────────┐  │
│  │                   K8s Scheduler Volume Mounting                              │  │
│  │  ┌────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │  CSI Controller StatefulSet (kube-system)                              │  │  │
│  │  │  • juicefs-plugin + csi-provisioner + liveness-probe                   │  │  │
│  │  │  • Handles PVC → PV provisioning                                        │  │  │
│  │  └────────────────────────────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │  CSI Node DaemonSet (kube-system)                                      │  │  │
│  │  │  • juicefs-plugin + node-driver-registrar + liveness-probe            │  │  │
│  │  │  • Creates Mount Pods per namespace                                    │  │  │
│  │  └────────────────────────────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │  Mount Pod (sandbox-runtime namespace)                                 │  │  │
│  │  │  • FUSE mount: JuiceFS → /jfs/{pvc-uid}/                              │  │  │
│  │  │  • Mounts to MinIO + MariaDB                                           │  │  │
│  │  └──────────────────────────┬─────────────────────────────────────────────┘  │  │
│  │                             │ Volume Mount                                    │
│  │  ┌──────────────────────────▼─────────────────────────────────────────────┐  │  │
│  │  │       Executor Pod (PVC volume)                                         │  │  │
│  │  │  Volume: workspace → PVC (juicefs-sc)                                   │  │  │
│  │  │  Container Mount: /workspace → /jfs/{pvc-uid}/sessions/{id}/           │  │  │
│  │  │  Executor reads/writes files via standard POSIX I/O                     │  │  │
│  │  └────────────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
│                                          │                                           │
│  ┌───────────────────────────────────────▼──────────────────────────────────────┐  │
│  │                        Storage Layer (sandbox-system namespace)              │  │
│  │  ┌──────────────────────────────────┐  ┌──────────────────────────────────┐   │  │
│  │  │ MariaDB (juicefs_metadata)       │  │ MinIO (sandbox-workspace)       │   │  │
│  │  │ • directory table                │  │ • File data chunks              │   │  │
│  │  │ • chunk table                    │  │ • S3-compatible API             │   │  │
│  │  │ • inode/attribute metadata       │  │ • Access/Secret keys            │   │  │
│  │  └──────────────────────────────────┘  └──────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

##### 2.2.2.2 Component Breakdown

###### 2.2.2.2.1 MinIO (S3-Compatible Object Storage)

**Purpose**: Stores actual file data chunks for JuiceFS

**Configuration** (`07-minio-deployment.yaml`):
- Image: `minio/minio:latest`
- Port: 9000 (API), 9001 (Console)
- Default Bucket: `sandbox-workspace`
- Access Keys: `minioadmin` / `minioadmin` (change in production)

**What It Stores**:
- JuiceFS file data chunks (64MB default chunk size)
- Metadata: Chunk location, size, checksum
- Workspace files: User uploaded code, dependencies, output files

**Access URLs**:
- API: `http://minio.sandbox-system.svc.cluster.local:9000`
- Console: `http://localhost:9001` (via NodePort/PortForward)

---

###### 2.2.2.2.2 MariaDB (JuiceFS Metadata)

**Purpose**: Stores JuiceFS file system metadata (directory structure, inodes, chunk mappings)

**Database Schema** (initialized by `09-juicefs-setup.yaml`):

| Table | Purpose |
|-------|---------|
| `directory` | File/directory hierarchy, parent-child relationships |
| `chunk` | Chunk to S3 object mappings (64MB chunks) |
| `inode` | File attributes (size, mode, uid, gid, mtime) |
| `extended` | Extended attributes (xattrs) |

**Key Tables**:
```sql
-- directory: maps parent_id + name to inode_id
CREATE TABLE directory (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  parent_id BIGINT NOT NULL,
  name VARCHAR(255) NOT NULL,
  inode_id BIGINT NOT NULL,
  UNIQUE KEY (parent_id, name)
);

-- chunk: maps file offset to S3 chunk key
CREATE TABLE chunk (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  inode_id BIGINT NOT NULL,
  offset BIGINT NOT NULL,
  length BIGINT NOT NULL,
  chunk_key VARCHAR(255) NOT NULL,
  UNIQUE KEY (inode_id, offset)
);
```

**Connection**:
- URL: `mysql://root:password@mariadb.sandbox-system.svc.cluster.local:3306/juicefs_metadata`
- Database: `juicefs_metadata`

---

###### 2.2.2.2.3 JuiceFS CSI Driver

**CSI Driver Implementation** (JuiceFS CSI Driver v0.25.2)

- **Helm Template**: `juicefs-csi-driver.yaml` (ConfigMap, RBAC, StatefulSet, DaemonSet, CSIDriver)
- **Use Case**: Production multi-node clusters (EKS, GKE, AKS, K3s)
- **Implementation**: JuiceFS CSI Driver v0.25.2

**Version Selection Rationale**:
- **Selected Version**: v0.25.2
- **Reason**: v0.31.1 (latest) has POD_NAME/POD_NAMESPACE downward API issues in K3s environment
- **Key Difference**: Uses `--enable-manager=true` flag instead of v0.31.1's forced Mount Pod mode

**Component Architecture**:

The CSI Driver consists of two main deployments:

####### 2.2.2.2.3.1 CSI Controller StatefulSet (kube-system namespace)
3 containers running in a StatefulSet:

| Container | Image | Purpose |
|-----------|-------|---------|
| juicefs-plugin | juicedata/juicefs-csi-driver:v0.25.2 | Main CSI driver - handles volume provisioning |
| csi-provisioner | registry.k8s.io/sig-storage/csi-provisioner:v2.2.2 | Sidecar - creates/deletes PersistentVolumes |
| liveness-probe | registry.k8s.io/sig-storage/livenessprobe:v2.11.0 | Sidecar - health checking |

**Key Configuration**:
- **Socket Path**: `/var/lib/csi/sockets/pluginproxy/csi.sock`
- **Mount Path**: `/var/lib/juicefs/volume`
- **Config Path**: `/var/lib/juicefs/config`
- **Leader Election**: Enabled for HA

####### 2.2.2.2.3.2 CSI Node DaemonSet (kube-system namespace)
3 containers running as DaemonSet on each node:

| Container | Image | Purpose |
|-----------|-------|---------|
| juicefs-plugin | juicedata/juicefs-csi-driver:v0.25.2 | Mounts JuiceFS volumes on the node |
| node-driver-registrar | registry.k8s.io/sig-storage/csi-node-driver-registrar:v2.9.0 | Registers CSI driver with kubelet |
| liveness-probe | registry.k8s.io/sig-storage/livenessprobe:v2.11.0 | Health checking |

**Key Configuration**:
- **Socket Path**: `/csi/csi.sock`
- **hostNetwork**: true (v0.25.2 requirement)
- **Mount Propagation**: Bidirectional for `/jfs` and `/root/.juicefs`
- **Critical Flag**: `--enable-manager=true` (Mount Pod mode)

**RBAC Permissions**:
The CSI Driver requires extensive permissions:

**Controller ClusterRole** (`juicefs-external-provisioner-role`):
- `persistentvolumes`, `persistentvolumeclaims` (full CRUD)
- `storageclasses` (get/list/watch)
- `events` (create/update/patch)
- `csinodes` (get/list/watch)
- `nodes` (get/list/watch)
- `secrets` (full CRUD for authentication)
- `pods`, `pods/log` (for Mount Pod management)
- `jobs` (for Mount Pod cleanup)
- `leases` (leader election)
- `configmaps` (state management)
- `daemonsets` (get/list)

**Node ClusterRole** (`juicefs-csi-node-role`):
- `pods`, `pods/log`, `pods/exec` (Mount Pod lifecycle)
- `secrets` (get/create/update/delete/patch)
- `persistentvolumes`, `persistentvolumeclaims` (get/list)
- `nodes`, `nodes/proxy` (full access for kubelet communication)
- `events` (create/get)
- `jobs` (Mount Pod management)

**StorageClass Configuration** (`juicefs-storageclass.yaml`):
```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: juicefs-sc
provisioner: csi.juicefs.com
parameters:
  csi.storage.k8s.io/provisioner-secret-name: juicefs-secret
  csi.storage.k8s.io/provisioner-secret-namespace: sandbox-system
  csi.storage.k8s.io/controller-publish-secret-name: juicefs-secret
  csi.storage.k8s.io/controller-publish-secret-namespace: sandbox-system
  csi.storage.k8s.io/node-stage-secret-name: juicefs-secret
  csi.storage.k8s.io/node-stage-secret-namespace: sandbox-system
  csi.storage.k8s.io/node-publish-secret-name: juicefs-secret
  csi.storage.k8s.io/node-publish-secret-namespace: sandbox-system
reclaimPolicy: Delete
volumeBindingMode: Immediate
```

**Secret Configuration**:
The `juicefs-secret` contains authentication data:
- `metaurl`: MySQL connection string for metadata
- `storage`: Storage backend type (minio)
- `bucket`: S3 endpoint URL
- `access-key`: MinIO access key
- `secret-key`: MinIO secret key

**Advantages over hostPath**:
- Automatic mount propagation across all nodes
- No privileged DaemonSet containers on application nodes
- Better failure recovery with Mount Pod per-namespace isolation
- Dynamic provisioning support (PVC → PV creation)
- Production-ready for multi-node clusters

**Deployment Verification**:
```bash
# Check CSI Driver pods
kubectl get pods -n kube-system -l app=juicefs-csi-controller
kubectl get pods -n kube-system -l app=juicefs-csi-node

# Verify CSIDriver registration
kubectl get csidriver csi.juicefs.com

# Check StorageClass
kubectl get storageclass juicefs-sc

# Test PVC creation
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-juicefs-pvc
  namespace: sandbox-system
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: juicefs-sc
  resources:
    requests:
      storage: 1Gi
EOF

# Verify PVC bound
kubectl get pvc test-juicefs-pvc -n sandbox-system
```

**FUSE Mount Command**:
```bash
/usr/bin/juicefs mount \
  --meta="mysql://root:password@mariadb.sandbox-system.svc.cluster.local:3306/juicefs_metadata" \
  --storage="minio" \
  --bucket="http://minio.sandbox-system.svc.cluster.local:9000/sandbox-workspace" \
  /var/jfs/sandbox-workspace
```

---

###### 2.2.2.2.4 Control Plane Storage Service

**Priority Order** (from `src/infrastructure/dependencies.py`):

1. **JuiceFS SDK** (`juicefs_storage.py`):
   - Direct Python SDK writes to JuiceFS
   - Ensures metadata sync to MariaDB
   - Falls back to S3 if SDK not available

2. **S3 API** (`s3_storage.py`):
   - Standard boto3 S3 client
   - Bypasses JuiceFS metadata layer
   - Direct writes to MinIO

3. **Mock Storage** (`mock_storage.py`):
   - In-memory filesystem for testing
   - No external dependencies

**Environment Variables**:
```bash
# JuiceFS SDK (Priority 1)
JUICEFS_ENABLED=true
JUICEFS_METAURL=mysql://root:password@mariadb.sandbox-system.svc.cluster.local:3306/juicefs_metadata
JUICEFS_STORAGE_TYPE=minio
JUICEFS_BUCKET=http://minio.sandbox-system.svc.cluster.local:9000/sandbox-workspace
JUICEFS_ACCESS_KEY=minioadmin
JUICEFS_SECRET_KEY=minioadmin

# S3 Fallback (Priority 2)
S3_ENDPOINT_URL=http://minio.sandbox-system.svc.cluster.local:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET=sandbox-workspace
```

---

###### 2.2.2.2.5 K8s Scheduler (Volume Mounting)

**Code Location**: `src/infrastructure/container_scheduler/k8s_scheduler.py`

**Volume Creation Logic**:
```python
# Line 169-183: Create PVC for S3 workspace
def _ensure_pvc_exists(self, pvc_name: str, s3_path: str) -> None:
    """Ensure PVC exists for JuiceFS CSI mount"""
    pvc = self.core_v1.read_namespaced_persistent_volume_claim(pvc_name, self.namespace)
    if not pvc:
        pvc = V1PersistentVolumeClaim(
            metadata=V1ObjectMeta(name=pvc_name),
            spec=V1PersistentVolumeClaimSpec(
                access_modes=["ReadWriteMany"],
                storage_class_name="juicefs-sc",
                resources=V1ResourceRequirements(requests={"storage": "1Gi"}),
            ),
        )
        self.core_v1.create_namespaced_persistent_volume_claim(self.namespace, pvc)

# Line 366-377: Create PVC volume
if use_s3_mount and s3_workspace:
    pvc_name = f"{config.name}-workspace"
    self._ensure_pvc_exists(pvc_name, s3_workspace["prefix"])
    volumes.append(
        V1Volume(
            name="workspace",
            persistent_volume_claim=V1PersistentVolumeClaimVolumeSource(
                claim_name=pvc_name
            ),
        )
    )
```

**Executor Environment Variables** (Line 208-214):
```python
env_vars.extend([
    V1EnvVar(name="WORKSPACE_PATH", value="/workspace"),
    V1EnvVar(name="S3_BUCKET", value=s3_workspace["bucket"]),  # sandbox-workspace
    V1EnvVar(name="S3_PREFIX", value=s3_workspace["prefix"]),  # sessions/{id}/workspace
])
```

---

##### 2.2.2.3 Data Flow: File Upload → Executor Access

**Scenario**: User uploads `main.py` to session workspace

```
1. Client Request
   POST /api/v1/sessions/{session_id}/files
   Body: multipart/form-data { file: main.py }

2. Control Plane API Handler (src/interfaces/http/routes/files.py)
   └─> UploadFileUseCase (application/use_cases/file_upload.py)
       └─> IStorageService.upload_file()

3. Storage Service (src/infrastructure/storage/juicefs_storage.py)
   ├─> JuiceFS SDK: client.write_file("sessions/{id}/workspace/main.py", content)
   │   └─> FUSE writes to /var/jfs/sandbox-workspace/sessions/{id}/workspace/main.py
   │       └─> JuiceFS driver:
   │           ├─> MariaDB: INSERT INTO directory (parent_id, name, inode_id)
   │           ├─> MariaDB: INSERT INTO chunk (inode_id, offset, chunk_key)
   │           └─> MinIO: PUT object to chunk_key (s3://sandbox-workspace/chunks/...)
   └─> OR S3 Fallback: boto3.client.put_object(Bucket="sandbox-workspace", Key=...)

4. K8s Scheduler Creates Pod
   └─> k8s_scheduler.create_container()
       ├─> Creates PVC: {session-id}-workspace (uses juicefs-sc StorageClass)
       ├─> CSI Controller provisions PV from PVC
       └─> V1Volume with PVC reference

5. CSI Driver Mounts Volume
   ├─> CSI Node DaemonSet creates Mount Pod in sandbox-runtime namespace
   ├─> Mount Pod FUSE mounts JuiceFS → /jfs/{pvc-uid}/
   └─> Executor Pod PVC binds to Mount Pod volume

6. Executor Pod Starts
   └─> VolumeMount: /workspace → PVC (via CSI mount point /jfs/{pvc-uid}/)
       └─> FUSE mount visible at /workspace/main.py

7. Executor Reads File
   └─> Python open("/workspace/main.py", "r")
       └─> Standard POSIX read() syscall
           └─> FUSE driver:
               ├─> MariaDB: SELECT chunk FROM chunk WHERE inode_id=... AND offset=...
               └─> MinIO: GET object chunks/...
                   └─> Reassemble file and return to application
```

---

##### 2.2.2.4 Key Configuration Files

| File | Purpose | Key Settings |
|------|---------|--------------|
| `deploy/manifests/06-juicefs-csi-driver.yaml` | JuiceFS CSI Driver | CSI Controller StatefulSet, CSI Node DaemonSet, RBAC |
| `deploy/manifests/09-juicefs-storageclass.yaml` | JuiceFS StorageClass | StorageClass definition, Secret reference |
| `deploy/manifests/07-minio-deployment.yaml` | MinIO deployment | Bucket, access keys, persistence |
| `deploy/manifests/08-mariadb-deployment.yaml` | MariaDB deployment | Database credentials, storage |
| `deploy/manifests/09-juicefs-setup.yaml` | JuiceFS format job | Database init, filesystem format |
| `deploy/helm/sandbox/templates/juicefs-csi-driver.yaml` | CSI Driver Helm template | ConfigMap, RBAC, StatefulSet, DaemonSet, CSIDriver |
| `deploy/helm/sandbox/templates/juicefs-storageclass.yaml` | StorageClass Helm template | Secret and StorageClass definitions |
| `deploy/helm/sandbox/values.yaml` | Helm chart values | juicefs.csi configuration (image: v0.25.2) |
| `src/infrastructure/config/settings.py` | Environment config | JuiceFS URLs, S3 credentials |
| `src/infrastructure/storage/juicefs_storage.py` | JuiceFS SDK wrapper | Write operations via Python SDK |
| `src/infrastructure/storage/s3_storage.py` | S3 fallback wrapper | boto3 client operations |
| `src/infrastructure/container_scheduler/k8s_scheduler.py` | Pod volume mounting | PVC volume creation and management |

---

##### 2.2.2.5 Environment Variables

**Complete Configuration** (`.env` or ConfigMap):

```bash
# ============== MinIO Configuration ==============
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
S3_ENDPOINT_URL=http://minio.sandbox-system.svc.cluster.local:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET=sandbox-workspace
S3_REGION=us-east-1

# ============== MariaDB Configuration ==============
MARIADB_ROOT_PASSWORD=password
JUICEFS_METAURL=mysql://root:password@mariadb.sandbox-system.svc.cluster.local:3306/juicefs_metadata

# ============== JuiceFS Configuration ==============
JUICEFS_ENABLED=true                    # Enable JuiceFS SDK
JUICEFS_CSI_ENABLED=true                # Enable CSI Driver mode
JUICEFS_STORAGE_TYPE=minio              # Storage backend
JUICEFS_BUCKET=http://minio.sandbox-system.svc.cluster.local:9000/sandbox-workspace
JUICEFS_ACCESS_KEY=minioadmin
JUICEFS_SECRET_KEY=minioadmin
JUICEFS_METAURL=mysql://root:password@mariadb.sandbox-system.svc.cluster.local:3306/juicefs_metadata

# ============== Control Plane Configuration ==============
DATABASE_URL=mysql+aiomysql://sandbox:password@mariadb.sandbox-system.svc.cluster.local:3306/sandbox
KUBERNETES_NAMESPACE=sandbox-runtime
```

---

##### 2.2.2.6 Summary

**Critical Insights**:

1. **JuiceFS = Metadata (MariaDB) + Data (MinIO)**: File metadata is stored in MariaDB for fast lookups, while actual file chunks are stored in MinIO. This hybrid architecture provides both metadata performance and scalable object storage.

2. **CSI Driver + FUSE = POSIX Bridge**: The JuiceFS CSI Driver creates Mount Pods that use FUSE to present S3 object storage as a standard POSIX filesystem. Executor pods see `/workspace` as a normal directory and use standard `open()`, `read()`, `write()` calls.

3. **CSI Driver Architecture**: The CSI Driver (v0.25.2) provides production-grade volume management with automatic mount propagation, dynamic PV provisioning, and per-namespace Mount Pod isolation. It consists of:
   - CSI Controller StatefulSet (kube-system) - handles PVC → PV provisioning
   - CSI Node DaemonSet (kube-system) - creates Mount Pods on each node
   - Mount Pods (per-namespace) - FUSE mount JuiceFS to `/jfs/{pvc-uid}/`

4. **Storage Service Abstraction**: The Control Plane's storage service (`IStorageService`) abstracts the underlying storage implementation. It tries JuiceFS SDK first (for metadata-aware writes), then falls back to direct S3 API, then to in-memory mock for testing.

5. **File Upload Flow**: When files are uploaded via API, they go through the Storage Service → JuiceFS SDK → FUSE mount → MariaDB (metadata) + MinIO (data). When executors read files, they use standard POSIX I/O → FUSE driver → MariaDB (chunk lookup) + MinIO (chunk data).

6. **CSI Driver Advantages**: 
   - **No privileged containers** required on application nodes
   - **Automatic mount management** across multi-node clusters
   - **Dynamic provisioning** - PVCs automatically provision PVs
   - **Better failure recovery** with per-namespace Mount Pod isolation
   - **Cloud-native** - follows Kubernetes CSI specification

**Performance Comparison** (JuiceFS CSI vs. s3fs Sidecar):

| Metric | s3fs Sidecar | JuiceFS CSI | Improvement |
|--------|-------------|-------------|-------------|
| Pod Startup | 8-12s | 2-3s | **60-75%** |
| File Read | 100-200ms | 20-50ms | **60-75%** |
| File Write | 150-300ms | 30-80ms | **60-73%** |
| CPU Usage | 5-10% | 1-2% | **80%** |
| Memory Usage | 50-100MB | 20-40MB | **60%** |
| Privileged Mode | Required | Not Required | ✅ |
