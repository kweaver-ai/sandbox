# MinIO-Only 架构方案 - 移除 JuiceFS

## 问题分析

### 当前 JuiceFS 架构的痛点

1. **复杂性高**: 需要同时维护 JuiceFS CSI Driver、MariaDB 元数据、MinIO 数据后端
2. **依赖多**: Python SDK 不在 PyPI，需要从源码编译或安装 CLI
3. **调试困难**: 文件上传后看不到问题，需要排查多个层级
4. **网络问题**: CLI 下载依赖 GitHub，国内访问不稳定

### 核心问题

```
用户上传文件 → Control Plane → S3 API 写入 MinIO
                                      ↓
                               ❌ 无 MariaDB 元数据
                                      ↓
                        CSI Mount Pod 无法看到文件
```

## MinIO-Only 方案设计

### 架构对比

#### 当前架构 (JuiceFS)
```
┌─────────────────┐     juicefs cp      ┌──────────────┐
│ Control Plane   │ ──────────────────▶ │ JuiceFS CLI  │
└─────────────────┘                     └──────┬───────┘
                                              ▼
                                    ┌─────────────────┐
                                    │    MariaDB      │ ← 元数据
                                    │  (juicefs_*)    │
                                    └────────┬────────┘
                                             │
                                    ┌────────▼────────┐
                                    │     MinIO       │ ← 数据
                                    └────────┬────────┘
                                             │
                              CSI Mount Pod ─┘ (FUSE 挂载)
                                             │
                                    ┌────────▼────────┐
                                    │  Executor Pod   │
                                    │  /workspace/    │
                                    └─────────────────┘
```

#### 新架构 (MinIO Only)
```
┌─────────────────┐     S3 API         ┌──────────────┐
│ Control Plane   │ ──────────────────▶ │    MinIO     │
└─────────────────┘                     └──────┬───────┘
                                              │
                              s3fs-fuse ──────┘ (直接挂载)
                                              │
                                    ┌────────▼────────┐
                                    │  Executor Pod   │
                                    │  /workspace/    │
                                    └─────────────────┘
```

### 方案选择

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **s3fs-fuse** | 简单、POSIX 兼容 | 性能略低 | ⭐⭐⭐⭐ |
| **S3 API 直连** | 高性能 | 需修改代码 | ⭐⭐⭐ |
| **rclone mount** | 功能丰富 | 配置复杂 | ⭐⭐ |

### 推荐: s3fs-fuse 方案

**s3fs-fuse** 允许将 S3 bucket 直接挂载为本地目录：

```bash
s3fs bucket-name /workspace -o url=http://minio:9000 \
    -o use_path_request_style -o allow_other
```

## 实现方案

### 1. 移除 JuiceFS 组件

#### Helm values.yaml 修改

```yaml
juicefs:
  enabled: false  # 禁用所有 JuiceFS
  csi:
    enabled: false
  hostPath:
    enabled: false
```

#### 删除的 Helm 模板

- `juicefs-csi-driver.yaml` - CSI Driver
- `juicefs-setup-job.yaml` - Setup Job
- `juicefs-hostpath.yaml` - hostPath DaemonSet
- `juicefs-storageclass.yaml` - StorageClass

### 2. 修改 Control Plane 配置

#### values.yaml 环境变量

```yaml
controlPlane:
  env:
    # 禁用 JuiceFS
    JUICEFS_ENABLED: "false"
    JUICEFS_CSI_ENABLED: "false"
    JUICEFS_SDK_ENABLED: "false"

    # 保持 S3 配置
    S3_ENDPOINT_URL: "http://minio.sandbox-system.svc.cluster.local:9000"
    S3_BUCKET: "sandbox-workspace"
    S3_ACCESS_KEY_ID: "minioadmin"
    S3_SECRET_ACCESS_KEY: "minioadmin"
    S3_REGION: "us-east-1"
```

### 3. 简化存储服务

#### dependencies.py 修改

```python
def get_storage_service():
    """
    获取存储服务（仅 S3）
    移除 JuiceFS 相关逻辑
    """
    global _storage_service_singleton

    if _storage_service_singleton is not None:
        return _storage_service_singleton

    settings = get_settings()

    # 直接使用 S3Storage
    if settings.s3_access_key_id:
        from src.infrastructure.storage.s3_storage import S3Storage
        _storage_service_singleton = S3Storage()
        logger.info(f"Using S3 storage: endpoint={settings.s3_endpoint_url}")
        return _storage_service_singleton

    # 降级到 Mock
    logger.warning("No storage backend configured, using MockStorageService")
    _storage_service_singleton = MockStorageService()
    return _storage_service_singleton
```

#### 可删除的文件

- `juicefs_storage.py` - FUSE 挂载实现
- `juicefs_sdk_storage.py` - CLI 实现

### 4. 修改 Executor Pod 挂载方式

#### k8s_scheduler.py 修改

```python
# 移除 CSI 和 hostPath 逻辑，直接使用 s3fs

# 方案 A: Init Container + s3fs (推荐)
def _build_executor_pod_s3fs(self, config, s3_workspace):
    """使用 s3fs 挂载 S3 bucket"""

    # Init Container: 安装 s3fs 并挂载
    init_container = V1Container(
        name="s3fs-init",
        image="alpine:latest",
        command=["sh", "-c"],
        args=[
            """
            apk add --no-cache s3fs-fuse &&
            mkdir -p /workspace &&
            s3fs sandbox-workspace /workspace \
                -o url=http://minio.sandbox-system.svc.cluster.local:9000 \
                -o use_path_request_style \
                -o allow_other \
                -o passwd_file=/etc/s3fs-passwd \
                -o nonempty &&
            echo "S3 mounted successfully" &&
            sleep infinity
            """
        ],
        volume_mounts=[
            V1VolumeMount(name="workspace", mount_path="/workspace")
        ],
        env=[
            V1EnvVar(
                name="S3FS_PASSWD",
                value_from=V1EnvVarSource(
                    secret_key_ref=V1SecretKeySelector(
                        name="sandbox-secrets",
                        key="s3fs-passwd"
                    )
                )
            )
        ]
    )

    # 主容器直接使用挂载
    volumes = [
        V1Volume(
            name="workspace",
            empty_dir=V1EmptyDirVolumeSource()
        )
    ]
```

### 5. 添加 s3fs 密钥 Secret

#### 模板: s3fs-secret.yaml

```yaml
{{- if .Values.minio.enabled }}
apiVersion: v1
kind: Secret
metadata:
  name: s3fs-passwd
  namespace: {{ .Values.global.namespace }}
type: Opaque
stringData:
  s3fs-passwd: |
    {{ .Values.minio.auth.rootUser }}:{{ .Values.minio.auth.rootPassword }}
{{- end }}
```

### 6. Dockerfile 修改

#### 移除 JuiceFS CLI 安装

```dockerfile
# 删除以下行
# ENV JUICEFS_VERSION=1.1.0
# RUN wget -q ...
```

#### 移除 juicefs 依赖

```toml
# pyproject.toml - 删除或注释
# "juicefs>=0.0.4",
```

### 7. 更新 Settings 配置

#### settings.py 修改

```python
# 可以保留 JuiceFS 配置字段（向后兼容），但标记为 deprecated

# ============== JuiceFS 配置 (已废弃) ==============
# 以下配置保留用于向后兼容，但不再使用
juicefs_host_path: str = Field(
    default="/var/jfs/sandbox-workspace",
    deprecated=True
)
# ... 其他 JuiceFS 字段
```

## 迁移步骤

### Phase 1: 准备 (在开发环境测试)

```bash
# 1. 更新代码
git checkout -b feature/minio-only

# 2. 修改 values.yaml
juicefs.enabled = false

# 3. 本地测试存储服务
python -c "from src.infrastructure.storage.s3_storage import S3Storage; ..."

# 4. 测试文件上传
curl -X POST http://localhost:8000/api/v1/sessions/{id}/files \
  -F "file=@test.py"

# 5. 验证 MinIO 中文件存在
mc ls local/sandbox-workspace/sessions/{id}/
```

### Phase 2: 部署 (在 K3s 集群)

```bash
# 1. 删除现有 JuiceFS 资源
kubectl delete csi.driver csi.juicefs.com
kubectl delete statefulset juicefs-csi-controller -n kube-system
kubectl delete daemonset juicefs-csi-node -n kube-system
kubectl delete storageclass juicefs-sc

# 2. 删除 MariaDB JuiceFS 数据库（可选）
kubectl exec -n sandbox-system mariadb -- mysql -u root -ppassword \
  -e "DROP DATABASE IF EXISTS juicefs_metadata;"

# 3. 更新 Helm 部署
helm upgrade sandbox ./deploy/helm/sandbox \
  --namespace sandbox-system \
  --reuse-values \
  --set juicefs.enabled=false \
  --set juicefs.csi.enabled=false \
  --set juicefs.hostPath.enabled=false \
  --set controlPlane.env.JUICEFS_ENABLED=false \
  --set controlPlane.env.JUICEFS_SDK_ENABLED=false

# 4. 重启 Control Plane
kubectl rollout restart deployment/sandbox-control-plane -n sandbox-system
```

### Phase 3: 验证

```bash
# 1. 创建会话
SESSION_ID=$(curl -s -X POST http://<ip>:8000/api/v1/sessions \
  -H "Content-Type: application/json" \
  -d '{"template_id": "python311"}' | jq -r '.session_id')

# 2. 上传文件
echo "print('test')" > test.py
curl -X POST http://<ip>:8000/api/v1/sessions/$SESSION_ID/files \
  -F "file=@test.py"

# 3. 检查 MinIO
kubectl exec -n sandbox-system minio-0 -- mc ls /data/sandbox-workspace/sessions/$SESSION_ID/

# 4. 检查 Executor Pod
EXECUTOR_POD=$(kubectl get pods -n sandbox-runtime -l app=sandbox-executor -o name | head -1)
kubectl exec -n sandbox-runtime $EXECUTOR_POD -- ls -la /workspace/

# 5. 执行代码验证文件可访问
curl -X POST http://<ip>:8000/api/v1/sessions/$SESSION_ID/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "import os; print(os.listdir(\"/workspace\"))"}'
```

## 文件修改清单

### 需要修改的文件

| 文件 | 操作 |
|------|------|
| `deploy/helm/sandbox/values.yaml` | 禁用 juicefs, 修改环境变量 |
| `deploy/helm/sandbox/templates/control-plane-deployment.yaml` | 移除 JuiceFS volume |
| `deploy/helm/sandbox/templates/configmap.yaml` | 更新配置 |
| `sandbox_control_plane/src/infrastructure/dependencies.py` | 简化存储服务选择 |
| `sandbox_control_plane/src/infrastructure/config/settings.py` | 标记废弃 |
| `sandbox_control_plane/src/infrastructure/container_scheduler/k8s_scheduler.py` | 改用 s3fs |
| `sandbox_control_plane/pyproject.toml` | 移除 juicefs 依赖 |
| `sandbox_control_plane/Dockerfile` | 移除 CLI 安装 |

### 需要删除的文件

| 文件 | 原因 |
|------|------|
| `deploy/helm/sandbox/templates/juicefs-csi-driver.yaml` | 不再需要 CSI |
| `deploy/helm/sandbox/templates/juicefs-setup-job.yaml` | 不再需要 Setup |
| `deploy/helm/sandbox/templates/juicefs-hostpath.yaml` | 不再需要 hostPath |
| `deploy/helm/sandbox/templates/juicefs-storageclass.yaml` | 不再需要 SC |
| `sandbox_control_plane/src/infrastructure/storage/juicefs_storage.py` | 不再使用 |
| `sandbox_control_plane/src/infrastructure/storage/juicefs_sdk_storage.py` | 不再使用 |

### 需要新增的文件

| 文件 | 用途 |
|------|------|
| `deploy/helm/sandbox/templates/s3fs-secret.yaml` | s3fs 凭证 |
| `deploy/helm/sandbox/templates/s3fs-config.yaml` | s3fs 配置 (可选) |

## 风险评估

### 低风险

- ✅ S3Storage 已经实现且稳定
- ✅ MinIO 继续保留
- ✅ 不影响数据库

### 中风险

- ⚠️ s3fs-fuse 性能低于 JuiceFS FUSE
- ⚠️ 大文件上传/下载可能变慢
- ⚠️ 需要测试并发场景

### 缓解措施

1. **性能监控**: 添加文件操作延迟监控
2. **回滚计划**: 保留 JuiceFS 配置代码，可快速切换
3. **渐进迁移**: 先在开发环境验证，再上生产

## 优势总结

### 简化性

- 减少组件: 从 4 个组件 (CSI、Setup、hostPath、MariaDB) 减少到 1 个 (s3fs)
- 减少依赖: 不再需要 JuiceFS CLI/SDK
- 减少配置: 只需配置 MinIO 连接信息

### 可维护性

- 调试简单: 文件上传后直接在 MinIO 查看
- 网络友好: 不依赖 GitHub 下载
- 版本稳定: s3fs-fuse 在各大发行版包管理器中

### 可靠性

- 无单点: 不依赖 MariaDB 元数据
- 一致性: S3 是最终真理来源
- 可恢复: MinIO 数据可直接访问
