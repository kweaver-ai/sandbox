# Sandbox Executor

> 安全的代码执行守护进程，使用 Bubblewrap 和 macOS Seatbelt 提供进程级隔离

[![Python Version](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## 📋 目录

- [概述](#概述)
- [核心特性](#核心特性)
- [架构设计](#架构设计)
- [快速开始](#快速开始)
- [API 文档](#api-文档)
- [配置说明](#配置说明)
- [开发指南](#开发指南)
- [部署指南](#部署指南)
- [故障排查](#故障排查)

---

## 概述

Sandbox Executor 是一个高性能的代码执行服务，专为 AI Agent 应用场景设计。它提供了多层安全隔离机制，确保不受信任的代码在受控环境中安全执行。

### 设计目标

- **安全性第一**: 多层隔离（容器 + 进程隔离）
- **高性能**: 异步架构，支持高并发执行
- **兼容性**: 支持 AWS Lambda handler 规范
- **可观测性**: 实时心跳、生命周期管理、执行指标

### 技术栈

| 组件 | 技术 |
|------|------|
| HTTP 框架 | FastAPI + Uvicorn |
| 隔离技术 | Bubblewrap (Linux) / sandbox-exec (macOS) |
| 异步运行时 | asyncio |
| 日志 | structlog |
| 数据验证 | Pydantic |

---

## 核心特性

### 🔒 多层安全隔离

```
┌─────────────────────────────────────────────┐
│         Docker 容器隔离（第一层）             │
│  ┌───────────────────────────────────────┐  │
│  │   Bubblewrap/sandbox-exec（第二层）     │  │
│  │  ┌─────────────────────────────────┐  │  │
│  │  │      用户代码执行                │  │  │
│  │  │  • PID namespace               │  │  │
│  │  │  • Network namespace           │  │  │
│  │  │  • Mount namespace             │  │  │
│  │  │  • Seccomp 过滤                │  │  │
│  │  └─────────────────────────────────┘  │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### ⚡ 异步高性能

- 基于 `asyncio.create_subprocess_exec()` 的真正异步执行
- 不阻塞事件循环，支持高并发
- 超时能够正确终止子进程

### 🔄 支持 Lambda Handler 规范

```python
# Python
def handler(event):
    return {"result": "success"}

# JavaScript
module.exports.handler = (event) => {
    return {result: "success"};
};
```

### 📊 可观测性

- 实时心跳上报
- 容器生命周期事件
- 执行指标（CPU 时间、内存、I/O）
- 结构化日志输出

---

## 架构设计

### 六边形架构 (Hexagonal Architecture)

```
                    ┌─────────────────────┐
                    │   HTTP Interface    │
                    │   (FastAPI/REST)     │
                    └──────────┬───────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
┌───────▼────────┐    ┌───────▼───────┐    ┌───────▼────────┐
│ Execute Code   │    │  Isolation    │    │    Callback     │
│    Command     │◄──►│    Port       │    │     Port        │
│                │    │               │    │                │
│  • Orchestrate  │    │  • Bubblewrap │    │  • HTTP Client  │
│  • Timeout     │    │  • Seatbelt   │    │  • Retry Logic  │
│  • Heartbeat   │    │  • Abstraction│    │  • Fallback     │
└────────────────┘    └───────────────┘    └────────────────┘
        │                      │
        └──────────────────────┼──────────────────────┘
                               │
                    ┌──────────▼───────────┐
                    │  Value Objects      │
                    │  • ExecutionResult  │
                    │  • ExecutionStatus  │
                    │  • ExecutionContext│
                    └─────────────────────┘
```

### 模块结构

```
executor/
├── application/          # 应用层
│   ├── commands/        # 命令模式
│   │   └── execute_code.py
│   └── services/        # 应用服务
│       ├── heartbeat_service.py
│       └── lifecycle_service.py
├── domain/              # 领域层
│   ├── entities/        # 实体
│   │   └── execution.py
│   ├── value_objects/   # 值对象
│   │   ├── execution_result.py
│   │   ├── execution_status.py
│   │   └── ...
│   └── ports/           # 端口接口
│       ├── isolation_port.py
│       ├── callback_port.py
│       └── ...
├── infrastructure/      # 基础设施层
│   ├── http/           # HTTP 客户端
│   │   └── callback_client.py
│   ├── isolation/      # 隔离适配器
│   │   ├── bwrap.py    # Bubblewrap Runner
│   │   ├── macseatbelt.py  # macOS Seatbelt Runner
│   │   └── result_parser.py
│   └── persistence/    # 持久化
│       └── artifact_scanner.py
└── interfaces/         # 接口层
    └── http/
        └── rest.py     # FastAPI 端点
```

---

## 快速开始

### 前置要求

- Python 3.11+
- Linux 或 macOS 系统
- Bubblewrap (Linux) 或 sandbox-exec (macOS)

### 安装

```bash
# 克隆项目
git clone https://github.com/your-org/sandbox-runtime-executor.git

# 安装依赖
cd sandbox-runtime-executor/runtime
pip install -r executor/requirements.txt
```

### 运行

```bash
# 启动服务
python3 -m executor.interfaces.http.rest

# 服务运行在 http://localhost:8080
```

### 快速测试

```bash
curl -X POST http://localhost:8080/execute \
  -H 'Content-Type: application/json' \
  -d '{
    "execution_id": "test_001",
    "session_id": "session_001",
    "code": "def handler(event): return {\"message\": \"Hello!\"}",
    "language": "python",
    "timeout": 10
  }'
```

📖 **详细指南**: 查看 [QUICK_START.md](QUICK_START.md)

---

## API 文档

### 执行代码

**端点**: `POST /execute`

**请求体**:

```json
{
  "execution_id": "string (required)",
  "session_id": "string (required)",
  "code": "string (required)",
  "language": "python|javascript|shell (required)",
  "timeout": 1-3600 (optional, default: 300)",
  "event": "object (optional)",
  "env_vars": "object (optional)"
}
```

**响应**:

```json
{
  "execution_id": "string",
  "status": "completed|failed|timeout",
  "message": "string"
}
```

### 健康检查

**端点**: `GET /health`

**响应**:

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "isolation": "bubblewrap|seatbelt"
}
```

### 服务信息

**端点**: `GET /info`

**响应**:

```json
{
  "version": "1.0.0",
  "platform": "Linux|Darwin",
  "isolation": "bubblewrap|seatbelt",
  "workspace_path": "/workspace",
  "active_executions": 0
}
```

---

## 配置说明

### 环境变量

| 变量名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `CONTROL_PLANE_URL` | string | `http://localhost:8000` | Control Plane 地址 |
| `WORKSPACE_PATH` | string | `/workspace` | 代码执行工作目录 |
| `EXECUTOR_PORT` | int | `8080` | Executor 服务端口 |
| `INTERNAL_API_TOKEN` | string | - | 内部 API 认证令牌 |

### Python 代码执行配置

```python
# 工作目录
WORKSPACE_PATH = "/workspace"

# Bubblewrap 基础参数 (Linux)
BWRAP_ARGS = [
    "--ro-bind", "/usr", "/usr",
    "--ro-bind", "/lib", "/lib",
    "--bind", workspace_path, "/workspace",
    "--unshare-all",
    "--unshare-net",
    "--die-with-parent",
]

# Seatbelt 配置 (macOS)
SANDBOX_PROFILE = """
(version 1)
(deny default)
(allow process-exec)
(allow file-read*)
(allow file-write* (subpath "/tmp"))
(allow system*)
"""
```

---

## 开发指南

### 开发环境设置

```bash
# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装开发依赖
pip install -r executor/requirements.txt

# 安装 pre-commit hooks
pre-commit install
```

### 代码风格

```bash
# 代码格式化
black executor/

# 代码检查
flake8 executor/

# 类型检查
mypy executor/
```

### 运行测试

```bash
# 单元测试
pytest executor/tests/unit/ -v

# 集成测试
pytest executor/tests/integration/ -v

# 测试覆盖率
pytest executor/tests/ --cov=executor --cov-report=html
```

### 项目结构约定

```
executor/
├── application/          # 应用服务层
│   └── commands/        # 命令处理（Use Cases）
├── domain/              # 领域层
│   ├── entities/        # 领域实体
│   ├── value_objects/   # 值对象
│   └── ports/           # 端口接口（抽象）
├── infrastructure/      # 基础设施层
│   ├── http/           # HTTP 实现
│   ├── isolation/      # 隔离实现
│   └── persistence/    # 持久化实现
└── interfaces/         # 接口层（REST API）
```

### 添加新的隔离适配器

1. 实现 `IIsolationPort` 接口
2. 继承基类模式
3. 在 `interfaces/http/rest.py` 中注册

```python
from executor.domain.ports import IIsolationPort
from executor.domain.entities import Execution
from executor.domain.value_objects import ExecutionResult

class MyIsolationRunner(IIsolationPort):
    async def execute(self, execution: Execution) -> ExecutionResult:
        # 实现代码
        pass

    def is_available(self) -> bool:
        # 检查可用性
        pass

    def get_version(self) -> str:
        # 返回版本
        pass
```

---

## 部署指南

### Docker 部署

#### 构建镜像

```bash
docker build -f executor/Dockerfile -t sandbox-executor:v1.0 .
```

#### 运行容器

```bash
docker run -d \
  --name sandbox-executor \
  --privileged \
  -p 8080:8080 \
  -e CONTROL_PLANE_URL=http://control-plane:8000 \
  -v $(pwd)/workspace:/workspace \
  sandbox-executor:v1.0
```

**注意**: `--privileged` 是 Bubblewrap 创建命名空间所必需的。

### Docker Compose 部署

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f executor

# 停止服务
docker-compose down
```

### Kubernetes 部署

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sandbox-executor
spec:
  containers:
  - name: executor
    image: sandbox-executor:v1.0
    ports:
    - containerPort: 8080
    securityContext:
      privileged: true  # Bubblewrap 需要
    env:
    - name: CONTROL_PLANE_URL
      value: "http://control-plane-service:8000"
```

---

## 故障排查

### 常见问题

#### 1. Bubblewrap 权限错误

**错误**: `bwrap: No permissions to create new namespace`

**解决**:
- Docker: 添加 `--privileged` 标志
- Kubernetes: 设置 `privileged: true`

#### 2. 代码执行超时

**错误**: `asyncio.TimeoutError`

**解决**:
- 增加 `timeout` 参数值
- 检查代码是否有死循环
- 确认使用最新版本（已修复 subprocess 阻塞问题）

#### 3. 容器间网络不通

**错误**: `Failed to report result: Connection refused`

**解决**:
- 使用 Docker 自定义网络
- 确认 `CONTROL_PLANE_URL` 配置正确
- 使用 Docker Compose 管理服务

#### 4. macOS 上执行失败

**错误**: `RuntimeError: Bubblewrap not found`

**解决**: Executor 会自动切换到 macOS Seatbelt (sandbox-exec)

### 日志级别

```bash
# 开发模式（DEBUG 级别）
export LOG_LEVEL=DEBUG
python3 -m executor.interfaces.http.rest

# 生产模式（INFO 级别）
export LOG_LEVEL=INFO
python3 -m executor.interfaces.http.rest
```

---

## 性能优化

### 异步并发

Executor 使用完全异步架构，支持高并发：

```python
import asyncio
import httpx

async def execute_concurrent():
    async with httpx.AsyncClient() as client:
        tasks = [
            client.post('http://localhost:8080/execute', json={...})
            for _ in range(100)
        ]
        results = await asyncio.gather(*tasks)
```

### 资源限制

通过环境变量配置资源限制：

```bash
export MAX_MEMORY_MB=512
export MAX_EXECUTION_TIME=30
export MAX_CONCURRENT_EXECUTIONS=100
```

### 工作区管理

定期清理工作区：

```bash
# 清理所有执行结果
rm -rf /workspace/*

# 或保留最近的文件
find /workspace/ -type f -mtime +7 -delete
```

---

## 相关文档

- [快速开始指南](QUICK_START.md)
- [API 设计文档](../../docs/sandbox-design-v2.1.md)
- [超时功能文档](../../docs/timeout-feature.md)
- [CLI 工具文档](../../docs/sandbox-cli-design.md)
- [多运行时架构](../../docs/multi-runtime-feasibility.md)

---

## 许可证

MIT License - 详见 [LICENSE](../../LICENSE)

---

## 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](../../CONTRIBUTING.md)

---

## 联系方式

- 项目主页: [GitHub](https://github.com/your-org/sandbox-runtime-executor)
- 问题反馈: [Issues](https://github.com/your-org/sandbox-runtime-executor/issues)
- 文档: [Wiki](https://github.com/your-org/sandbox-runtime-executor/wiki)

---

**最后更新**: 2026-01-09
**版本**: 1.0.0
