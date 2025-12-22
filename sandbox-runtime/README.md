# 沙箱环境

一个用于安全运行代码和命令的隔离环境。

## 目录结构

```
.
├── README.md                           # 项目说明文档
├── Dockerfile                          # Docker镜像构建文件
├── requirements.txt                    # Python依赖包列表
├── pyproject.toml                      # Python项目配置文件
├── azure-pipelines.yml                 # Azure DevOps CI/CD流水线配置
├── load_env.sh                         # 环境变量加载脚本
├── src/                                # 源代码目录
│   ├── sandbox_runtime/                # 主要源代码目录
│   │   ├── __init__.py                 # Python包初始化文件
│   │   ├── errors.py                   # 全局错误定义
│   │   ├── main.py                     # 程序入口点
│   │   ├── python_runner/              # Python运行器相关代码
│   │   ├── sandbox/                    # 沙箱核心实现
│   │   │   ├── README.md               # 沙箱模块说明
│   │   │   ├── config/                 # 配置相关
│   │   │   ├── core/                   # 核心执行逻辑
│   │   │   │   ├── context.py          # 执行上下文
│   │   │   │   ├── errors.py           # 核心错误定义
│   │   │   │   ├── executor.py         # 执行器实现
│   │   │   │   ├── result.py           # 结果处理
│   │   │   ├── sandbox/                # 沙箱实例管理
│   │   │   │   ├── daemon.py           # 沙箱守护进程
│   │   │   │   ├── instance.py         # 沙箱实例
│   │   │   │   ├── pool.py             # 沙箱池管理
│   │   │   ├── shared_env/             # 共享环境实现
│   │   │   │   ├── shared_env.py       # 共享环境主模块
│   │   │   │   ├── run_isolated.sh     # 隔离环境运行脚本
│   │   │   │   ├── cleanup.sh          # 清理脚本
│   │   │   │   ├── api_doc.yaml        # API文档
│   │   │   │   ├── app/                # 应用工厂和生命周期管理
│   │   │   │   │   ├── factory.py      # FastAPI应用工厂
│   │   │   │   │   ├── lifespan.py     # 生命周期管理
│   │   │   │   │   ├── config.py       # 配置定义
│   │   │   │   ├── models/             # 数据模型
│   │   │   │   ├── routes/             # API路由
│   │   │   │   │   ├── execution.py    # 代码执行相关路由
│   │   │   │   │   ├── file_operations.py # 文件操作路由
│   │   │   │   │   ├── management.py   # 管理相关路由
│   │   │   │   │   ├── session.py      # 会话管理路由
│   │   │   │   ├── utils/              # 工具函数
│   │   │   │   │   ├── session_utils.py # 会话工具
│   │   │   ├── ssh/                    # SSH相关实现
│   │   │   ├── utils/                  # 沙箱工具函数
│   │   ├── sdk/                        # SDK客户端
│   │   │   ├── base.py                 # SDK基类
│   │   │   ├── shared_env.py           # 共享环境SDK
│   │   │   ├── utils/                  # SDK工具函数
│   │   ├── settings.py                 # 全局设置
│   │   ├── utils/                      # 通用工具函数
│   │   │   ├── clean_task.py           # 清理任务
│   │   │   ├── common.py               # 通用工具
│   │   │   ├── efast_downloader.py     # EFAST下载器
│   │   │   ├── http_api.py             # HTTP API工具
│   │   │   ├── loggers.py              # 日志工具
├── examples/                           # 使用示例
│   ├── download_example.py             # 下载示例
│   ├── efast_download_example.py       # EFAST下载示例
│   ├── jupyter_gateway_example.py      # Jupyter网关示例
│   ├── jupyter_gateway_ws_example.py   # Jupyter网关WebSocket示例
│   ├── shared_env_example.py           # 共享环境使用示例
├── test/                               # 测试代码
│   ├── test_sdk.py                     # SDK测试
│   ├── test_shared_env_server.py       # 共享环境服务测试
├── sandbox_runtime/                    # Helm Chart相关
│   ├── Chart.yaml                      # Helm Chart元数据
│   ├── values.yaml                     # Helm Chart默认配置
│   ├── _componentMeta.json             # 组件元数据
│   ├── templates/                      # Helm模板
│   │   ├── deployment.yaml             # Deployment模板
│   │   ├── service.yaml                # Service模板
```

## 特性

- 在隔离环境中安全执行代码
- 文件系统操作与权限管理
- 命令执行与资源限制
- 会话管理
- 文件上传/下载功能
- 健康监控
- Kubernetes 和 Docker 支持

## 架构

系统包含两个主要组件：

1. **SDK（客户端库）**
   - 用于与沙箱环境交互的 Python 客户端库
   - 处理会话管理、文件操作和命令执行
   - 为开发者提供简单的接口

2. **服务器（FastAPI 应用）**
   - 基于 FastAPI 的服务器，管理沙箱环境
   - 处理来自 SDK 的 HTTP 请求
   - 管理文件系统操作和命令执行
   - 提供健康监控端点

## 安装

### 环境要求

- Python 3.8+
- Docker
- Kubernetes 集群（用于生产环境部署）

### Python 包

#### 服务器端
```bash
pip install sandbox_runtime
```

#### 客户端
```bash
pip install sandbox_runtime[sdk]
```

### Docker

构建 Docker 镜像：
```bash
docker build -t sandbox-runtime .
```

运行容器：
```bash
docker run -d -p 9101:9101 --name sandbox-runtime sandbox-runtime
```

### Kubernetes

1. 添加 Helm 仓库：
```bash
helm repo add sandbox-runtime https://your-helm-repo-url
helm repo update
```

2. 安装 Chart：
```bash
helm install sandbox-runtime sandbox-runtime/sandbox_runtime
```

3. 在 `values.yaml` 中配置：
```yaml
# 服务配置
service:
  type: ClusterIP  # 或 LoadBalancer、NodePort
  port: 8000
  headless: true   # 启用 headless 服务以直接访问 Pod

# 部署配置
deployment:
  replicas: 3
  resources:
    requests:
      memory: "256Mi"
      cpu: "200m"
    limits:
      memory: "512Mi"
      cpu: "500m"

# 会话配置
session:
  size: "50M"      # 默认会话大小
  timeout: 3600    # 会话超时时间（秒）
```

## 使用

### 基本用法

```python
from sdk.shared_env import SharedEnvSandbox

# 初始化
sandbox = SharedEnvSandbox(session_id="test-session", servers=["http://localhost:9101"])

# 执行代码
result = await sandbox.execute_code("print('Hello, World!')", filename="test.py")
print(result["stdout"])  # 输出: Hello, World!

# 执行命令
result = await sandbox.execute("ls", "-l")
print(result["stdout"])

# 清理
await sandbox.close()
```

### 文件操作

```python
# 上传文件
with open("local_file.txt", "rb") as f:
    env.upload_file(session_id, f, "remote_file.txt")

# 下载文件
content = env.download_file(session_id, "remote_file.txt")

# 列出文件
files = env.list_files(session_id)
```

## API 参考

### SDK 方法

- `create_session(size: str) -> str` - 创建会话
- `delete_session(session_id: str) -> None` - 删除会话
- `create_file(session_id: str, content: str, filename: str, mode: int) -> dict` - 创建文件
- `list_files(session_id: str) -> list` - 列出文件
- `upload_file(session_id: str, file: BinaryIO, filename: str) -> dict` - 上传文件
- `download_file(session_id: str, filename: str) -> bytes` - 下载文件
- `execute_command(session_id: str, command: str, args: list) -> dict` - 执行命令
- `execute_code(session_id: str, code: str, filename: str, script_type: str) -> dict` - 执行代码
- `get_status(session_id: str) -> dict` - 获取状态
- `cleanup_all(force: bool = False) -> dict` - 清理所有环境

### 服务器端点

- `GET /workspace/se/healthy` - 健康检查
- `POST /workspace/se/session/{session_id}` - 创建会话
- `DELETE /workspace/se/session/{session_id}` - 删除会话
- `POST /workspace/se/create/{session_id}` - 创建文件
- `GET /workspace/se/files/{session_id}` - 列出文件
- `POST /workspace/se/upload/{session_id}` - 上传文件
- `GET /workspace/se/download/{session_id}/{filename}` - 下载文件
- `POST /workspace/se/execute/{session_id}` - 执行命令
- `POST /workspace/se/execute_code/{session_id}` - 执行代码
- `GET /workspace/se/status/{session_id}` - 获取会话状态
- `POST /workspace/se/cleanup-all` - 清理所有会话

## 开发

### 本地开发

1. 克隆仓库：
```bash
git clone https://github.com/your-org/sandbox_runtime.git
cd sandbox_runtime
```

2. 安装开发依赖：
```bash
pip install -e ".[dev]"
```

3. 运行测试：
```bash
pytest
```

### Docker 开发

1. 构建开发镜像：
```bash
docker build -t sandbox-runtime-dev -f Dockerfile.dev .
```

2. 运行开发容器：
```bash
docker run -it --rm -v $(pwd):/app sandbox-runtime-dev
```

### Kubernetes 开发

1. 安装开发 Chart：
```bash
helm install sandbox-runtime-dev ./helm/sandbox-runtime --set environment=dev
```

2. 端口转发访问服务：
```bash
kubectl port-forward svc/sandbox-runtime 8000:8000
```

## 安全特性

- 每个会话在隔离环境中运行
- 文件系统操作限制在会话目录内
- 命令执行限制在允许的命令范围内
- 每个会话的资源使用限制
- 输入验证和净化
- 适当的错误处理和日志记录

## 贡献

1. Fork 仓库
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证 - 详见 LICENSE 文件。
