# Sandbox Runtime

> 安全的代码执行守护进程，使用 Bubblewrap 和 Docker 提供进程级隔离

[![Python Version](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**[English](README.md)** | **[中文文档](README_zh.md)**

## 概述

Sandbox Runtime 是一个高性能的代码执行服务，专为 AI Agent 应用场景设计。它提供了多层安全隔离机制，确保不受信任的代码在受控环境中安全执行。

## 核心特性

- **多层安全隔离** - Docker 容器 + Bubblewrap/sandbox-exec 双层隔离
- **异步高性能** - 基于 asyncio 的真正异步执行，支持高并发
- **Lambda 兼容** - 支持 AWS Lambda handler 规范
- **实时可观测** - 心跳上报、生命周期管理、执行指标

## 快速开始

```bash
# 安装依赖
cd sandbox-runtime
pip install -e ".[dev]"

# 启动服务
python -m sandbox_runtime.shared_env.server

# 验证服务
curl http://localhost:8000/health
```

**详细指南**: [快速开始](docs/getting-started.md)

## 技术栈

| 组件 | 技术 |
|------|------|
| HTTP 框架 | FastAPI + Uvicorn |
| 隔离技术 | Bubblewrap (Linux) / Docker |
| 异步运行时 | asyncio |
| 日志 | structlog |
| 数据验证 | Pydantic |

## 文档

| 文档 | 说明 |
|------|------|
| [快速开始](docs/getting-started.md) | 安装、配置和基本使用 |
| [架构设计](docs/architecture.md) | 系统架构和设计原理 |
| [API 文档](docs/api-reference.md) | RESTful API 端点和示例 |
| [配置说明](docs/configuration.md) | 环境变量和隔离配置 |
| [开发指南](docs/development.md) | 开发环境设置、测试、代码规范 |
| [部署指南](docs/deployment.md) | Docker、Docker Compose、Kubernetes 部署 |
| [故障排查](docs/troubleshooting.md) | 常见问题和解决方案 |

## 示例

### Python Handler

```python
def handler(event):
    name = event.get('name', 'World')
    return {'message': f'Hello, {name}!'}
```

### 通过 SDK 执行代码

```python
from sandbox_runtime.sdk import SandboxClient

client = SandboxClient(base_url="http://localhost:8000")

# 创建会话
session = await client.create_session(session_id="my_session")

# 执行代码
result = await client.execute_code(
    session_id="my_session",
    code="print('Hello from sandbox!')"
)

print(result.stdout)  # "Hello from sandbox!"
```

### 通过 REST API 执行代码

```bash
curl -X POST http://localhost:8000/workspace/se/execute_code/my_session \
  -H 'Content-Type: application/json' \
  -d '{
    "code": "def handler(event): return {\"message\": \"Hello!\"}",
    "timeout": 10
  }'
```

## 项目结构

```
sandbox-runtime/
├── src/sandbox_runtime/
│   ├── sandbox/          # 核心沙箱隔离实现
│   ├── shared_env/       # FastAPI 服务器和 REST API
│   ├── sdk/              # 客户端 SDK
│   └── core/             # 核心执行逻辑
├── helm/                 # Kubernetes Helm chart
├── tests/                # 测试套件
└── docs/                 # 文档
```

## 配置

环境变量控制沙箱行为：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `SANDBOX_CPU_QUOTA` | CPU 配额 | 2 |
| `SANDBOX_MEMORY_LIMIT` | 内存限制（KB） | 131072 |
| `SANDBOX_ALLOW_NETWORK` | 网络访问 | true |
| `SANDBOX_TIMEOUT_SECONDS` | 执行超时时间 | 300 |
| `SANDBOX_POOL_SIZE` | 预热池大小 | 2 |

## 开发

```bash
# 运行测试
cd sandbox-runtime
pytest

# 运行特定测试文件
pytest tests/test_sdk.py
pytest tests/test_http_api.py
```

## Docker

```bash
# 构建镜像（从仓库根目录）
docker build -t sandbox-runtime -f sandbox-runtime/Dockerfile sandbox-runtime

# 构建多平台镜像
docker buildx build -t sandbox-runtime --platform=linux/amd64,linux/arm64 -f sandbox-runtime/Dockerfile sandbox-runtime
```

## Kubernetes/Helm

```bash
# 安装 Helm chart
helm install sandbox-runtime ./sandbox-runtime/helm/sandbox-runtime

# 端口转发访问服务
kubectl port-forward svc/sandbox-runtime 8000:8000
```

## 贡献

这是一个展示最佳实践的开源项目。欢迎贡献：

- 提交 Issue 讨论改进建议
- Fork 并创建你自己的沙箱示例
- 改进文档和翻译

## 许可证

MIT License - 详见 [LICENSE](LICENSE)
