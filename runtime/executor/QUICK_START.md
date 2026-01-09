# Sandbox Executor - Quick Start Guide

## Overview

Sandbox Executor 是一个安全的代码执行守护进程，使用 Bubblewrap (Linux) 或 sandbox-exec (macOS) 提供进程隔离。

**核心特性**:
- 🔒 多层隔离：容器 + Bubblewrap/sandbox-exec
- ⚡ 异步执行：基于 FastAPI + asyncio 的高性能架构
- 🔄 支持 AWS Lambda handler 规范
- 📊 实时心跳和生命周期管理
- 🎯 支持 Python、JavaScript、Shell 执行

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     HTTP Interface (REST)                    │
│                      FastAPI + Uvicorn                       │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  Execute Code Command                        │
│         (Execution Orchestration & Timeout Control)          │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼──────┐  ┌────▼─────┐  ┌───────▼────────┐
│ Bubblewrap   │  │Seatbelt  │  │  Artifact      │
│   Runner     │  │ Runner   │  │   Scanner      │
│  (Linux)     │  │ (macOS)  │  │                │
└──────────────┘  └──────────┘  └────────────────┘
```

## Prerequisites

### 本地开发

- Python 3.11+
- macOS 或 Linux 系统
- Bubblewrap (Linux) 或 sandbox-exec (macOS，系统自带)

### Docker 部署

- Docker 20.10+
- Docker Compose 2.0+

## Installation

### 1. 克隆项目

```bash
cd /path/to/sandbox-runtime-executor/runtime
```

### 2. 安装依赖

```bash
# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate  # Linux/macOS
# 或
venv\Scripts\activate  # Windows

# 安装依赖
pip install -r executor/requirements.txt
```

### 3. 验证安装

```bash
# 检查 Bubblewrap/sandbox-exec
python3 -c "from executor.infrastructure.isolation.bwrap import get_bwrap_version; print(get_bwrap_version())"
```

## Running Locally

### 基本启动

```bash
# 方式 1: 使用 Python 模块
python3 -m executor.interfaces.http.rest

# 方式 2: 使用 Uvicorn 直接
uvicorn executor.interfaces.http.rest:app --host 0.0.0.0 --port 8080
```

### 配置环境变量

```bash
export CONTROL_PLANE_URL="http://localhost:8000"
export WORKSPACE_PATH="/workspace"
export EXECUTOR_PORT="8080"

python3 -m executor.interfaces.http.rest
```

### 验证服务运行

```bash
# 健康检查
curl http://localhost:8080/health

# 查看服务信息
curl http://localhost:8080/info
```

**期望输出**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "isolation": "bubblewrap|seatbelt",
  "platform": "Linux|Darwin"
}
```

## Docker Deployment

### 1. 构建镜像

```bash
cd /path/to/sandbox-runtime-executor

# 构建 Executor 镜像
docker build -f runtime/executor/Dockerfile -t sandbox-executor:v1.0 .
```

### 2. 单独运行 Executor

```bash
docker run -d \
  --name sandbox-executor \
  --privileged \
  -p 8080:8080 \
  -e CONTROL_PLANE_URL=http://host.docker.internal:8000 \
  sandbox-executor:v1.0
```

### 3. 使用 Docker Compose（推荐）

```bash
cd /path/to/sandbox-runtime-executor

# 启动所有服务（Control Plane + Executor）
docker-compose up -d

# 查看日志
docker-compose logs -f executor

# 停止服务
docker-compose down
```

**注意**:
- `--privileged` 模式是 Bubblewrap 创建命名空间所需
- 容器间通过自定义网络 `sandbox-network` 通信
- Executor 通过 `http://control-plane:8000` 访问 Control Plane

## API Usage

### 执行代码

```bash
curl -X POST http://localhost:8080/execute \
  -H 'Content-Type: application/json' \
  -d '{
    "execution_id": "exec_001",
    "session_id": "session_001",
    "code": "def handler(event):\n    return {\"message\": \"Hello World!\"}",
    "language": "python",
    "timeout": 10
  }'
```

**响应**:
```json
{
  "execution_id": "exec_001",
  "status": "completed",
  "message": "Execution completed"
}
```

### Python 代码示例

```python
import requests

# 简单执行
response = requests.post(
    'http://localhost:8080/execute',
    json={
        'execution_id': 'exec_002',
        'session_id': 'session_001',
        'code': '''
def handler(event):
    name = event.get('name', 'World')
    return {'greeting': f'Hello, {name}!'}
''',
        'language': 'python',
        'timeout': 10,
        'event': {'name': 'Alice'}
    }
)

print(response.json())
```

### JavaScript 代码示例

```bash
curl -X POST http://localhost:8080/execute \
  -H 'Content-Type: application/json' \
  -d '{
    "execution_id": "exec_js_001",
    "session_id": "session_001",
    "code": "module.exports.handler = (event) => ({ message: `Hello ${event.name}!` });",
    "language": "javascript",
    "timeout": 10,
    "event": {"name": "Bob"}
  }'
```

### Shell 代码示例

```bash
curl -X POST http://localhost:8080/execute \
  -H 'Content-Type: application/json' \
  -d '{
    "execution_id": "exec_shell_001",
    "session_id": "session_001",
    "code": "echo \"Hello from shell!\" && ls -la /tmp",
    "language": "shell",
    "timeout": 10
  }'
```

## Configuration

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `CONTROL_PLANE_URL` | Control Plane 地址 | `http://localhost:8000` |
| `WORKSPACE_PATH` | 工作目录路径 | `/workspace` |
| `EXECUTOR_PORT` | Executor 服务端口 | `8080` |
| `INTERNAL_API_TOKEN` | 内部 API 认证令牌 | 无 |

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `execution_id` | string | 是 | 唯一执行标识符 |
| `session_id` | string | 是 | 会话标识符 |
| `code` | string | 是 | 要执行的代码 |
| `language` | string | 是 | `python`, `javascript`, `shell` |
| `timeout` | int | 否 | 超时时间（秒），默认 300 |
| `event` | dict | 否 | 传递给 handler 的事件数据 |
| `env_vars` | dict | 否 | 额外的环境变量 |

## Handler 规范

### Python Handler

```python
def handler(event):
    """
    AWS Lambda 风格的 handler 函数

    Args:
        event: 包含输入数据的字典

    Returns:
        任意可 JSON 序列化的对象
    """
    # 处理业务逻辑
    result = process(event)

    # 返回结果
    return result
```

**完整示例**:

```python
def handler(event):
    name = event.get('name', 'World')
    count = event.get('count', 1)

    # 打印到 stdout（会返回给调用者）
    print(f"Processing {count} items...")

    # 返回结果
    return {
        'message': f'Hello, {name}!',
        'processed': count,
        'success': True
    }
}
```

### JavaScript Handler

```javascript
// CommonJS
module.exports.handler = (event, context) => {
    return {
        message: `Hello ${event.name}!`,
        timestamp: Date.now()
    };
};

// 或 ES6
export const handler = (event, context) => {
    return { result: 'ok' };
};
```

## Testing

### 运行单元测试

```bash
cd runtime
pytest executor/tests/unit/ -v
```

### 运行集成测试

```bash
pytest executor/tests/integration/ -v
```

### 运行所有测试

```bash
pytest executor/tests/ -v --cov=executor
```

### 并发测试

测试异步执行能力：

```bash
# 并发执行 5 个请求（每个耗时 2 秒）
for i in {1..5}; do
  curl -X POST http://localhost:8080/execute \
    -H 'Content-Type: application/json' \
    -d "{
      \"execution_id\": \"concurrent_$i\",
      \"session_id\": \"test\",
      \"code\": \"import time; time.sleep(2); def handler(e): return {'done': True}\",
      \"language\": \"python\",
      \"timeout\": 10
    }" &
done
wait

# 如果真正异步，所有请求应该在 ~2 秒内完成（而不是 10 秒）
```

## Troubleshooting

### 问题 1: Bubblewrap 权限错误

**错误信息**:
```
bwrap: No permissions to create new namespace
```

**解决方案**: 使用 `--privileged` 模式运行容器

```bash
docker run --privileged sandbox-executor:v1.0
```

### 问题 2: 连接 Control Plane 失败

**错误信息**:
```
Failed to report result: Connection refused
```

**解决方案**:
- 确保 Control Plane 正在运行
- 检查 `CONTROL_PLANE_URL` 配置正确
- 如果使用 Docker，确保容器在同一网络中

### 问题 3: macOS 上 Bubblewrap 不可用

**错误信息**:
```
RuntimeError: Bubblewrap (bwrap) is not installed
```

**解决方案**: Executor 会自动切换到 macOS Seatbelt (sandbox-exec)

### 问题 4: 超时执行未终止

**解决方案**: 已在最新版本中修复，使用 `asyncio.create_subprocess_exec()` 确保超时能够正确终止子进程

## Performance Tips

### 1. 异步优势

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
        print(f"Executed {len(results)} requests concurrently")

asyncio.run(execute_concurrent())
```

### 2. 资源限制

通过 `ResourceLimit` 设置执行资源：

```python
from executor.domain.value_objects import ResourceLimit

limits = ResourceLimit(
    max_memory_mb=512,
    max_cpu_time_ms=5000,
    max_wall_time_ms=10000
)
```

### 3. 工作区清理

定期清理工作区以避免磁盘空间耗尽：

```bash
# 清理工作区
docker exec sandbox-executor rm -rf /workspace/*
```

## Next Steps

- 📖 阅读 [设计文档](../../docs/sandbox-design-v2.1.md)
- 🔧 查看 [配置选项](../../docs/timeout-feature.md)
- 🐳 了解 [容器部署](../../docs/multi-runtime-feasibility.md)
- 🚀 探索 [CLI 工具](../../docs/sandbox-cli-design.md)

## Support

- 提交 Issue: [GitHub Issues](https://github.com/your-org/sandbox-runtime-executor/issues)
- 文档: [项目文档](../../docs/)
- 许可证: MIT License
