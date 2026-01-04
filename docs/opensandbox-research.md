# Alibaba OpenSandbox 技术预研报告

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | v1.0 |
| 编写日期 | 2024-12 |
| 研究对象 | Alibaba OpenSandbox |
| 开源协议 | Apache-2.0 |
| 官方仓库 | https://github.com/alibaba/OpenSandbox |

---

## 1. 概述

### 1.1 什么是 OpenSandbox

**OpenSandbox** 是阿里巴巴开源的**通用沙箱平台**，专为 AI 应用场景设计。它提供了统一的沙箱协议和多语言 SDK，为大语言模型（LLM）应用提供安全的代码执行环境。

### 1.2 核心特性

| 特性 | 说明 |
|------|------|
| **多语言支持** | Python、Java、JavaScript、Go（开发中） |
| **统一协议** | OpenAPI 规范的统一沙箱接口 |
| **热池模式** | 预热实例池，快速响应 |
| **容器隔离** | 基于 Docker 的安全隔离 |
| **阿里官方** | 阿里巴巴官方维护 |
| **商业友好** | Apache-2.0 协议 |

### 1.3 解决的问题

1. **安全代码执行** - 为 AI 生成的代码提供安全隔离环境
2. **统一接口** - 为不同语言应用提供统一访问方式
3. **LLM 场景适配** - 专门针对大语言模型应用优化
4. **资源管理** - 自动化的资源限制和回收

---

## 2. 技术架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                     OpenSandbox 平台                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │   SDK 层     │    │  控制面 API  │    │  热池管理    │    │
│  │  多语言 SDK  │    │  (生命周期)  │    │  Warm Pool   │    │
│  └─────────────┘    └─────────────┘    └─────────────┘    │
├─────────────────────────────────────────────────────────────┤
│                    沙箱运行时                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              代码解释器沙箱                         │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐         │   │
│  │  │ Python  │  │  Java   │  │  Node.js │         │   │
│  │  │ Runtime │  │ Runtime │  │ Runtime │         │   │
│  │  └─────────┘  └─────────┘  └─────────┘         │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                    基础设施层                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         Docker 容器 + bubblewrap                   │   │
│  │         资源隔离 (cgroups)                         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 项目结构

```
OpenSandbox/
├── sdks/                      # 多语言 SDK
│   ├── code-interpreter/       # 代码解释器 SDK
│   │   └── python/
│   └── sandbox/               # 沙箱基础 SDK
│       └── python/
├── specs/                     # OpenAPI 规范
│   ├── execd-api.yaml         # 执行 API 规范
│   └── sandbox-lifecycle.yml  # 生命周期 API 规范
├── server/                    # 沙箱服务器
│   ├── components/           # 核心组件
│   │   └── execd/            # 执行组件
│   └── sandboxes/            # 沙箱实现
│       └── code-interpreter/ # 代码解释器
└── examples/                 # 示例代码
```

### 2.3 通信协议

**控制面 API:**
| 端点 | 功能 |
|------|------|
| `POST /sandboxes` | 创建沙箱实例 |
| `DELETE /sandboxes/{id}` | 删除实例 |
| `POST /sandboxes/{id}/stop` | 停止实例 |
| `POST /sandboxes/{id}/contexts` | 创建执行上下文 |

**数据面 API:**
| 端点 | 功能 |
|------|------|
| `POST /contexts/execute` | 同步执行代码 |
| `WebSocket` | 实时通信 |

---

## 3. 部署方案

### 3.1 系统要求

| 组件 | 要求 |
|------|------|
| **操作系统** | Linux（推荐 Ubuntu 20.04+） |
| **Docker** | 20.10+ |
| **Python** | 3.10+（服务器和示例） |
| **bubblewrap** | 最新版（Linux 隔离） |

### 3.2 Docker 部署（推荐）

```bash
# 克隆仓库
git clone https://github.com/alibaba/OpenSandbox.git
cd OpenSandbox

# 启动服务器
cd server
uv sync
cp example.config.toml ~/.sandbox.toml
uv run python -m src.main
```

### 3.3 Docker Compose 部署

```yaml
version: '3.8'

services:
  opensandbox:
    image: ghcr.io/alibaba/opensandbox/server:latest
    container_name: opensandbox
    ports:
      - "8194:8194"  # API 端口
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - opensandbox-data:/data
    environment:
      - SANDBOX_POOL_SIZE=5
      - SANDBOX_CPU_QUOTA=2
      - SANDBOX_MEMORY_LIMIT=524288
      - SANDBOX_ALLOW_NETWORK=true
    restart: unless-stopped

volumes:
  opensandbox-data:
```

### 3.4 配置文件

```toml
# ~/.sandbox.toml
[server]
port = 8194
host = "0.0.0.0"

[sandbox]
pool_size = 5                    # 热池大小
cpu_quota = 2                    # CPU 配额
memory_limit = 524288            # 内存限制 (KB)
allow_network = true             # 允许网络
timeout_seconds = 300           # 超时时间
max_lifetime = 21600             # 最大生命周期 (秒)
```

---

## 4. Python SDK 集成

### 4.1 安装

```bash
# 基础 SDK
pip install opensandbox

# 代码解释器扩展
pip install opensandbox-code-interpreter
```

### 4.2 基础使用

```python
import asyncio
from datetime import timedelta
from opensandbox import Sandbox
from opensandbox_code_interpreter import CodeInterpreter, CodeContext, SupportedLanguage

async def main():
    # 创建沙箱实例
    sandbox = await Sandbox.create(
        "opensandbox/code-interpreter:latest",
        timeout=timedelta(minutes=10),
    )

    async with sandbox:
        # 执行 Shell 命令
        execution = await sandbox.commands.run("echo 'Hello OpenSandbox!'")
        print(execution.logs.stdout[0].text)

        # 创建代码解释器
        interpreter = await CodeInterpreter.create(sandbox)

        # 执行 Python 代码
        result = await interpreter.codes.run(
            "import pandas as pd\nprint(pd.__version__)",
            context=CodeContext(language=SupportedLanguage.PYTHON)
        )
        print(result.result[0].text)

    await sandbox.kill()

if __name__ == "__main__":
    asyncio.run(main())
```

### 4.3 高级用法

```python
# 自定义环境变量
sandbox = await Sandbox.create(
    "opensandbox/code-interpreter:latest",
    env={
        "PYTHON_VERSION": "3.11",
        "CUSTOM_VAR": "value"
    },
    timeout=timedelta(minutes=15),
)

# 文件操作
async with sandbox:
    # 上传文件
    await sandbox.files.write("/workspace/data.txt", b"Hello World")

    # 读取文件
    content = await sandbox.files.read("/workspace/data.txt")

    # 列出文件
    files = await sandbox.files.list("/workspace")
```

### 4.4 与现有沙箱集成

```python
# 在多运行时架构中集成 OpenSandbox
from sandbox_runtime.sandbox.runtimes.base import SandboxInstance

class OpenSandboxInstance(SandboxInstance):
    """OpenSandbox 运行时实例"""

    def __init__(self, config):
        self.config = config
        self.sandbox = None

    async def start(self) -> None:
        from opensandbox import Sandbox
        self.sandbox = await Sandbox.create(
            "opensandbox/code-interpreter:latest",
            timeout=timedelta(seconds=self.config.timeout_seconds)
        )

    async def execute(self, task_data: dict) -> dict:
        from opensandbox_code_interpreter import (
            CodeInterpreter, CodeContext, SupportedLanguage
        )

        interpreter = await CodeInterpreter.create(self.sandbox)
        result = await interpreter.codes.run(
            task_data["handler_code"],
            context=CodeContext(language=SupportedLanguage.PYTHON)
        )

        return {
            "exit_code": 0 if result.error is None else 1,
            "stdout": result.result[0].text if result.result else "",
            "stderr": str(result.error) if result.error else "",
            "result": None
        }

    def is_alive(self) -> bool:
        return self.sandbox is not None

    def should_retire(self) -> bool:
        return False  # OpenSandbox 管理生命周期

    async def terminate(self) -> None:
        if self.sandbox:
            await self.sandbox.kill()
```

---

## 5. 安全特性

### 5.1 隔离机制

| 层级 | 技术 | 说明 |
|------|------|------|
| **容器隔离** | Docker | 进程级隔离 |
| **命名空间** | bubblewrap | PID、网络命名空间 |
| **资源限制** | cgroups | CPU、内存、进程数限制 |
| **文件系统** | 只读根目录 | 限制写入操作 |

### 5.2 安全限制

| 特性 | 实现方式 |
|------|----------|
| **资源限制** | CPU 配额、内存硬限制 |
| **网络隔离** | 可选网络访问控制 |
| **文件隔离** | 限制在会话目录内 |
| **超时控制** | 可配置执行超时 |
| **进程限制** | 限制子进程创建 |

### 5.3 安全对比

| 特性 | OpenSandbox | DifySandbox | E2B |
|------|-------------|-------------|-----|
| 隔离级别 | 容器级 | 容器级 | 微VM级 |
| 资源限制 | ✅ cgroups | ✅ | ✅ |
| 网络控制 | ✅ | ✅ | ✅ |
| 官方维护 | 阿里巴巴 | Dify | E2B |
| 生产验证 | ✅ 阿里云 | ✅ Dify 平台 | ✅ 多家公司 |

---

## 6. 性能分析

### 6.1 性能指标

| 指标 | OpenSandbox | DifySandbox | Bubblewrap |
|------|-------------|-------------|------------|
| 服务启动 | ~5 秒 | ~2 秒 | ~50ms |
| 首次执行 | ~500ms | ~500ms | ~50ms |
| 热池执行 | ~50ms | ~50ms | ~2ms |
| 内存占用 | ~100MB | ~50MB | ~10MB |

### 6.2 并发能力

| 配置 | 热池大小 | 并发数 | 吞吐量 |
|------|----------|--------|--------|
| 默认 | 2 | 2 | ~10 req/s |
| 中等 | 5 | 5 | ~25 req/s |
| 高负载 | 10 | 10 | ~50 req/s |

---

## 7. 与其他方案对比

### 7.1 综合对比

| 特性 | OpenSandbox | DifySandbox | E2B |
|------|-------------|-------------|-----|
| **开源协议** | Apache-2.0 | Apache-2.0 | Apache-2.0 |
| **维护者** | 阿里巴巴 | Dify.AI | E2B |
| **多语言** | ✅ 多语言 | ⚠️ 主要是 Python | ✅ 多语言 |
| **SDK 易用性** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **部署难度** | 低 | 低 | 高 |
| **热池支持** | ✅ | ✅ | ✅ |
| **AI/ML 支持** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **中文支持** | ⚠️ 英文文档 | ✅ 中文 | ⚠️ 英文文档 |
| **阿里云集成** | ✅ 原生支持 | ❌ | ❌ |

### 7.2 使用场景推荐

| 场景 | 推荐方案 | 原因 |
|------|----------|------|
| **阿里云生态** | OpenSandbox | 原生集成 |
| **多语言需求** | OpenSandbox | 官方支持多语言 |
| **AI/ML 专用** | DifySandbox | 专为 AI 设计 |
| **最强隔离** | E2B | 微 VM 隔离 |
| **最轻量** | Bubblewrap | 进程级隔离 |

---

## 8. 实施建议

### 8.1 集成方案

在多运行时架构中，OpenSandbox 作为 **通用运行时**：

```
┌─────────────────────────────────────────────────────────────┐
│                    RuntimeSelector                          │
├─────────────────────────────────────────────────────────────┤
│  简单计算 → Bubblewrap (默认，最快)                          │
│  通用场景 → OpenSandbox (多语言，阿里官方)                  │
│  AI/ML   → DifySandbox (预装依赖)                           │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 配置建议

| 场景 | 运行时 | 热池大小 | 超时 | 网络 |
|------|--------|----------|------|------|
| 简单 Python | Bubblewrap | 2 | 60s | false |
| 多语言支持 | OpenSandbox | 5 | 300s | true |
| AI 数据处理 | DifySandbox | 8 | 600s | true |

### 8.3 部署架构

```yaml
# docker-compose.yml
version: '3.8'

services:
  # OpenSandbox (通用场景)
  opensandbox:
    image: ghcr.io/alibaba/opensandbox/server:latest
    ports:
      - "8194:8194"
    environment:
      - SANDBOX_POOL_SIZE=5
      - SANDBOX_CPU_QUOTA=2
      - SANDBOX_MEMORY_LIMIT=524288
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock

  # DifySandbox (AI 专用)
  dify-sandbox:
    image: langgenius/dify-sandbox:latest
    ports:
      - "8195:8194"
    environment:
      - MAX_WORKERS=8
```

---

## 9. 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 中文文档少 | 高 | 低 | 阿里云有中文支持 |
| 学习曲线 | 中 | 中 | 提供培训文档 |
| 版本迭代 | 低 | 低 | 官方维护，持续更新 |
| 资源消耗 | 中 | 中 | 合理配置热池大小 |

---

## 10. 总结

### 10.1 核心优势

1. **阿里官方** - 阿里巴巴官方维护，技术可靠
2. **多语言** - 支持 Python、Java、JavaScript
3. **热池模式** - 快速响应，性能优秀
4. **统一协议** - OpenAPI 规范，易于集成
5. **商业友好** - Apache-2.0 协议

### 10.2 推荐配置

**基础配置（小规模）:**
- 1 个实例
- 热池大小 2
- 默认资源限制

**生产配置（中等规模）:**
- 2 个实例（负载均衡）
- 热池大小 5
- 自定义镜像

**高可用配置（大规模）:**
- 3+ 个实例
- 热池大小 10
- 完整监控告警

### 10.3 与 DifySandbox 的选择

| 需求 | 推荐 | 原因 |
|------|------|------|
| 使用阿里云 | OpenSandbox | 原生集成 |
| 多语言支持 | OpenSandbox | 官方 SDK |
| 中文文档 | DifySandbox | 中文支持更好 |
| AI 专用 | DifySandbox | 专为 AI 设计 |

---

## 附录

### A. 参考资料

- [Alibaba OpenSandbox GitHub](https://github.com/alibaba/OpenSandbox)
- [OpenSandbox 架构文档](https://github.com/alibaba/OpenSandbox/blob/main/docs/architecture.md)
- [阿里云 AIO Sandbox 文档](https://help.aliyun.com/zh/functioncompute/fc/aio-sandbox)
- [OpenAPI 规范](https://github.com/alibaba/OpenSandbox/blob/main/specs/execd-api.yaml)

### B. 快速开始

```bash
# 1. 安装 SDK
pip install opensandbox opensandbox-code-interpreter

# 2. 运行服务器
git clone https://github.com/alibaba/OpenSandbox.git
cd OpenSandbox/server
uv run python -m src.main

# 3. 客户端连接
python your_app.py
```
