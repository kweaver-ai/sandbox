# 沙箱多运行时架构技术可行性研究

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | v2.0 |
| 编写日期 | 2024-12 |
| 研究对象 | 沙箱多运行时架构 |
| 开源协议 | Apache-2.0 |

---

## 1. 概述

### 1.1 背景

当前沙箱系统基于 **Bubblewrap** 实现，提供轻量级的进程级隔离。随着业务场景的扩展，需要支持更多类型的运行时以满足不同需求：

- **简单计算** - 轻量级、快速响应
- **通用场景** - 灵活部署、多语言支持
- **AI/ML** - 预装依赖、高性能
- **阿里云集成** - 原生支持

### 1.2 目标

设计并实现**多运行时架构**，支持：

| 运行时 | 适用场景 | 隔离级别 |
|--------|----------|----------|
| **Bubblewrap** | 简单 Python 函数（默认） | 进程级 |
| **Docker** | 通用代码执行 | 容器级 |
| **DifySandbox** | AI/ML 数据处理 | 多层隔离 |
| **OpenSandbox** | 多语言/阿里云 | 容器级 |

### 1.3 核心需求

| 需求 | 优先级 | 说明 |
|------|--------|------|
| **完全离线/内网部署** | P0 | 必须支持本地化部署 |
| **简单的 Docker 部署** | P0 | 易于运维 |
| **开源且可控** | P0 | 避免供应商锁定 |
| **向后兼容** | P1 | 保持现有 API 不变 |
| **性能优化** | P1 | 热池模式 |

---

## 2. 方案对比

### 2.1 综合对比表

| 特性 | Bubblewrap | Docker | DifySandbox | OpenSandbox |
|------|-----------|--------|-------------|-------------|
| **开源协议** | GPL/LGPL | 开源 | Apache-2.0 | Apache-2.0 |
| **隔离级别** | 进程级 | 容器级 | 多层隔离 | 容器级 |
| **启动速度** | ⭐⭐⭐⭐⭐ (~50ms) | ⭐⭐⭐ (~200ms) | ⭐⭐⭐⭐ (~50ms) | ⭐⭐⭐⭐ (~50ms) |
| **执行延迟** | ⭐⭐⭐⭐⭐ (~2ms) | ⭐⭐⭐⭐ (~20ms) | ⭐⭐⭐⭐⭐ (~50ms) | ⭐⭐⭐⭐⭐ (~50ms) |
| **部署难度** | 低 | 低 | 低 | 低 |
| **AI/ML 支持** | ⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **多语言** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **中文文档** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **阿里云集成** | ❌ | ❌ | ❌ | ✅ |
| **内存占用** | ~10MB | ~50MB | ~50MB | ~100MB |
| **维护者** | 社区 | Docker | Dify.AI | 阿里巴巴 |

### 2.2 性能对比

| 指标 | Bubblewrap | Docker | DifySandbox | OpenSandbox |
|------|-----------|--------|-------------|-------------|
| 服务启动 | ~50ms | ~2秒 | ~2秒 | ~5秒 |
| 首次执行 | ~50ms | ~500ms | ~500ms | ~500ms |
| 热池执行 | ~2ms | ~50ms | ~50ms | ~50ms |
| 并发能力 | 中等 | 高 | 高 | 高 |
| 资源效率 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

### 2.3 场景推荐

| 场景 | 推荐运行时 | 原因 |
|------|-----------|------|
| **简单 Python 计算** | Bubblewrap | 最低延迟、最高性能 |
| **通用代码执行** | Docker | 灵活、易部署、支持多语言 |
| **AI/ML 数据处理** | DifySandbox | 预装依赖、专为 AI 优化 |
| **多语言需求** | Docker 或 OpenSandbox | 官方支持多语言 |
| **阿里云生态** | OpenSandbox | 原生集成 |
| **离线部署** | 全部支持 | Docker 镜像可离线部署 |

---

## 3. 技术架构设计

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                      RuntimeSelector                                │
│                   (运行时选择器)                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐│
│  │  Bubblewrap  │  │    Docker    │  │ DifySandbox  │  │OpenSandbox││
│  │  Runtime     │  │    Runtime   │  │    Runtime    │  │  Runtime ││
│  │  (默认)      │  │              │  │              │  │          ││
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────┘│
│         │                 │                 │               │      │
│         ▼                 ▼                 ▼               ▀      │
├─────────────────────────────────────────────────────────────────────┤
│                    SandboxInstance (抽象接口)                       │
│                                                                       │
│  • start()        • execute()        • is_alive()                   │
│  • should_retire() • terminate()     • get_metrics()                │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 核心接口定义

```python
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class SandboxInstance(ABC):
    """沙箱实例抽象接口"""

    @abstractmethod
    async def start(self) -> None:
        """启动沙箱实例"""
        pass

    @abstractmethod
    async def execute(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        执行任务

        Args:
            task_data: 任务数据，包含:
                - handler_code: 要执行的代码
                - input_data: 输入数据
                - timeout: 超时时间

        Returns:
            执行结果，包含:
                - exit_code: 退出码
                - stdout: 标准输出
                - stderr: 标准错误
                - result: 返回值
                - metrics: 性能指标
        """
        pass

    @abstractmethod
    def is_alive(self) -> bool:
        """检查实例是否存活"""
        pass

    @abstractmethod
    def should_retire(self) -> bool:
        """检查实例是否应该退役"""
        pass

    @abstractmethod
    async def terminate(self) -> None:
        """终止实例"""
        pass

    @abstractmethod
    async def get_metrics(self) -> Dict[str, Any]:
        """获取实例指标"""
        pass
```

### 3.3 运行时选择策略

```python
class RuntimeSelector:
    """运行时选择器"""

    def __init__(self, config: RuntimeConfig):
        self.config = config
        self.factories = {
            "bubblewrap": BubblewrapFactory(),
            "docker": DockerFactory(),
            "dify": DifySandboxFactory(),
            "opensandbox": OpenSandboxFactory(),
        }

    def select_runtime(self, task_data: Dict[str, Any]) -> str:
        """
        选择运行时

        优先级:
        1. 任务显式指定
        2. 环境变量配置
        3. 根据任务特征自动选择
        4. 默认使用 bubblewrap
        """
        # 1. 任务显式指定
        if "runtime" in task_data:
            return task_data["runtime"]

        # 2. 环境变量配置
        if "SANDBOX_RUNTIME" in os.environ:
            return os.environ["SANDBOX_RUNTIME"]

        # 3. 自动选择
        if self._requires_ml_libs(task_data):
            return "dify"  # AI/ML 场景
        elif self._requires_other_language(task_data):
            return "docker"  # 多语言
        elif self._requires_aliyun(task_data):
            return "opensandbox"  # 阿里云

        # 4. 默认
        return "bubblewrap"

    def _requires_ml_libs(self, task_data: Dict) -> bool:
        """检测是否需要 ML 库"""
        code = task_data.get("handler_code", "")
        ml_keywords = ["import pandas", "import numpy", "import torch",
                      "import tensorflow", "from sklearn"]
        return any(kw in code for kw in ml_keywords)

    def _requires_other_language(self, task_data: Dict) -> bool:
        """检测是否需要其他语言"""
        return task_data.get("language") != "python"

    def _requires_aliyun(self, task_data: Dict) -> bool:
        """检测是否需要阿里云集成"""
        return task_data.get("aliyun_integration") is True
```

---

## 4. 各运行时实现方案

### 4.1 Bubblewrap (保持不变)

#### 特点
- ✅ 当前已实现，保持稳定
- ✅ 轻量级、最快
- ✅ 适合简单 Python 计算

#### 配置
```yaml
# 环境变量
SANDBOX_RUNTIME: bubblewrap
SANDBOX_POOL_SIZE: 2
SANDBOX_CPU_QUOTA: 2
SANDBOX_MEMORY_LIMIT: 131072  # 128MB
```

#### 使用场景
```python
# 默认运行时，无需配置
result = await execute_code("print('Hello')")
```

---

### 4.2 Docker Runtime

#### 特点
- ✅ 灵活部署
- ✅ 支持多语言
- ✅ 易于定制

#### 基础镜像选择
**用户决策**: 使用官方 `python:3.11-slim` 镜像

```dockerfile
FROM python:3.11-slim

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 创建工作目录
WORKDIR /workspace

# 非 root 用户
RUN useradd -m -u 65537 sandbox
USER sandbox

# 预装常用包
RUN pip install --no-cache-dir \
    requests \
    pydantic \
    pyyaml

CMD ["python", "-u"]
```

#### 实现示例

```python
import asyncio
import docker
from typing import Dict, Any

class DockerSandboxInstance(SandboxInstance):
    """Docker 沙箱实例"""

    def __init__(self, config: DockerConfig):
        self.config = config
        self.client = docker.from_env()
        self.container = None

    async def start(self) -> None:
        """启动容器"""
        self.container = self.client.containers.run(
            self.config.image,
            detach=True,
            cpu_quota=self.config.cpu_quota * 100000,
            mem_limit=self.config.memory_limit,
            network_mode="none" if not self.config.allow_network else "bridge",
            auto_remove=False,
        )

    async def execute(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """执行代码"""
        code = task_data["handler_code"]

        # 通过 exec 执行
        result = self.container.exec_run(
            f'python -c "{code}"',
            workdir="/workspace",
        )

        return {
            "exit_code": result.exit_code,
            "stdout": result.output.decode('utf-8'),
            "stderr": "",
            "result": None,
            "metrics": {}
        }

    def is_alive(self) -> bool:
        return self.container and self.container.status == "running"

    def should_retire(self) -> bool:
        # 容器不退役，由外部管理
        return False

    async def terminate(self) -> None:
        if self.container:
            self.container.stop()
            self.container.remove()
```

#### 配置
```yaml
# 环境变量
SANDBOX_RUNTIME: docker
DOCKER_IMAGE: python:3.11-slim
DOCKER_POOL_SIZE: 5
```

---

### 4.3 DifySandbox Runtime

#### 特点
- ✅ AI/ML 专用
- ✅ 预装依赖
- ✅ 高性能 Worker 池

#### 部署方案

**用户决策**: 自己构建镜像（控制依赖版本）

```dockerfile
FROM langgenius/dify-sandbox:latest

# 添加自定义依赖
RUN echo "pandas>=2.0.0" >> dependencies/python-requirements.txt
RUN echo "numpy>=1.24.0" >> dependencies/python-requirements.txt
RUN echo "scikit-learn>=1.3.0" >> dependencies/python-requirements.txt
RUN echo "torch>=2.0.0" >> dependencies/python-requirements.txt
```

#### 实现示例

```python
import requests
from typing import Dict, Any

class DifySandboxInstance(SandboxInstance):
    """DifySandbox 实例"""

    def __init__(self, config: DifyConfig):
        self.config = config
        self.endpoint = config.endpoint
        self.session_id = str(uuid.uuid4())

    async def start(self) -> None:
        """DifySandbox 使用 Worker 池，无需显式启动"""
        pass

    async def execute(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """执行代码"""
        url = f"{self.endpoint}/v1/sandbox/run"
        payload = {
            "language": "python3",
            "code": task_data["handler_code"],
            "enable_network": self.config.allow_network
        }

        response = requests.post(
            url,
            json=payload,
            headers={"X-API-Key": self.config.api_key},
            timeout=task_data.get("timeout", 300)
        )

        data = response.json()
        return {
            "exit_code": 0 if data["success"] else 1,
            "stdout": data["data"]["stdout"],
            "stderr": data["data"]["stderr"],
            "result": None,
            "metrics": {}
        }

    def is_alive(self) -> bool:
        return True  # DifySandbox 管理连接

    def should_retire(self) -> bool:
        return False  # DifySandbox 管理生命周期

    async def terminate(self) -> None:
        pass  # 无需清理
```

#### 配置
```yaml
# 环境变量
SANDBOX_RUNTIME: dify
DIFY_ENDPOINT: http://dify-sandbox:8194
DIFY_API_KEY: dify-sandbox
```

---

### 4.4 OpenSandbox Runtime

#### 特点
- ✅ 阿里巴巴官方
- ✅ 多语言 SDK
- ✅ 热池模式

#### 部署方案

```yaml
# docker-compose.yml
services:
  opensandbox:
    image: ghcr.io/alibaba/opensandbox/server:latest
    ports:
      - "8194:8194"
    environment:
      - SANDBOX_POOL_SIZE=5
      - SANDBOX_CPU_QUOTA=2
      - SANDBOX_MEMORY_LIMIT=524288
      - SANDBOX_ALLOW_NETWORK=true
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

#### 实现示例

```python
import asyncio
from datetime import timedelta
from opensandbox import Sandbox
from opensandbox_code_interpreter import (
    CodeInterpreter, CodeContext, SupportedLanguage
)

class OpenSandboxInstance(SandboxInstance):
    """OpenSandbox 实例"""

    def __init__(self, config: OpenSandboxConfig):
        self.config = config
        self.sandbox = None
        self.interpreter = None

    async def start(self) -> None:
        """创建沙箱实例"""
        self.sandbox = await Sandbox.create(
            "opensandbox/code-interpreter:latest",
            timeout=timedelta(seconds=self.config.timeout_seconds),
        )
        self.interpreter = await CodeInterpreter.create(self.sandbox)

    async def execute(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """执行代码"""
        result = await self.interpreter.codes.run(
            task_data["handler_code"],
            context=CodeContext(language=SupportedLanguage.PYTHON)
        )

        return {
            "exit_code": 0 if result.error is None else 1,
            "stdout": result.result[0].text if result.result else "",
            "stderr": str(result.error) if result.error else "",
            "result": None,
            "metrics": {}
        }

    def is_alive(self) -> bool:
        return self.sandbox is not None

    def should_retire(self) -> bool:
        return False  # OpenSandbox 管理生命周期

    async def terminate(self) -> None:
        if self.sandbox:
            await self.sandbox.kill()
```

#### 配置
```yaml
# 环境变量
SANDBOX_RUNTIME: opensandbox
OPENSANDBOX_ENDPOINT: http://opensandbox:8194
OPENSANDBOX_IMAGE: opensandbox/code-interpreter:latest
```

---

## 5. 集成方案

### 5.1 统一池管理

```python
class MultiRuntimePool:
    """多运行时池管理"""

    def __init__(self, config: MultiRuntimeConfig):
        self.config = config
        self.selector = RuntimeSelector(config)
        self.pools = {
            "bubblewrap": AsyncSandboxPool(config.bubblewrap),
            "docker": DockerPool(config.docker),
            # DifySandbox 和 OpenSandbox 不需要池
        }

    async def acquire(self, task_data: Dict) -> SandboxInstance:
        """获取实例"""
        runtime = self.selector.select_runtime(task_data)

        if runtime in ["bubblewrap", "docker"]:
            return await self.pools[runtime].acquire()
        elif runtime == "dify":
            return DifySandboxInstance(self.config.dify)
        elif runtime == "opensandbox":
            return await OpenSandboxInstance(self.config.opensandbox).start()

    async def release(self, instance: SandboxInstance):
        """释放实例"""
        if isinstance(instance, (BubblewrapInstance, DockerInstance)):
            await self.pools[instance.runtime].release(instance)
        # 其他类型无需释放
```

### 5.2 配置文件

```yaml
# config/runtime.yaml
defaults:
  runtime: bubblewrap  # 默认运行时

runtimes:
  bubblewrap:
    enabled: true
    pool_size: 2
    cpu_quota: 2
    memory_limit: 131072  # 128MB
    timeout_seconds: 300

  docker:
    enabled: true
    pool_size: 5
    image: python:3.11-slim
    cpu_quota: 2
    memory_limit: 524288  # 512MB
    timeout_seconds: 300

  dify:
    enabled: true
    endpoint: http://dify-sandbox:8194
    api_key: dify-sandbox
    allow_network: true
    timeout_seconds: 600

  opensandbox:
    enabled: false  # 按需启用
    endpoint: http://opensandbox:8194
    image: opensandbox/code-interpreter:latest
    timeout_seconds: 300
```

### 5.3 部署架构

```yaml
# docker-compose.yml
version: '3.8'

services:
  # 主服务
  sandbox-runtime:
    build: ./sandbox-runtime
    ports:
      - "8000:8000"
    environment:
      - SANDBOX_RUNTIME=bubblewrap  # 默认
      - DOCKER_HOST=docker
      - DIFY_ENDPOINT=http://dify-sandbox:8194
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    depends_on:
      - docker
      - dify-sandbox

  # Docker 运行时 (使用 Docker-in-Docker)
  docker:
    image: docker:24-dind
    privileged: true
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock

  # DifySandbox (AI/ML)
  dify-sandbox:
    image: langgenius/dify-sandbox:latest
    ports:
      - "8194:8194"
    environment:
      - ENABLE_NETWORK=true
      - MAX_WORKERS=8

  # OpenSandbox (可选)
  # opensandbox:
  #   image: ghcr.io/alibaba/opensandbox/server:latest
  #   ports:
  #     - "8195:8194"
  #   environment:
  #     - SANDBOX_POOL_SIZE=5
  #   volumes:
  #     - /var/run/docker.sock:/var/run/docker.sock
```

---

## 6. 实施计划

### 6.1 开发阶段（8周）

| 阶段 | 任务 | 周期 |
|------|------|------|
| **Phase 1** | 抽象接口设计 | 1周 |
| **Phase 2** | 重构 Bwrap 实现 | 1周 |
| **Phase 3** | Docker 运行时 | 2周 |
| **Phase 4** | DifySandbox 集成 | 1周 |
| **Phase 5** | OpenSandbox 集成 | 1周 |
| **Phase 6** | 配置和选择器 | 1周 |
| **Phase 7** | 测试和文档 | 1周 |

### 6.2 目录结构

```
sandbox-runtime/src/sandbox_runtime/sandbox/
├── runtimes/                    # 运行时实现
│   ├── __init__.py
│   ├── base.py                  # 抽象基类
│   ├── selector.py              # 运行时选择器
│   ├── bubblewrap/              # Bubblewrap 实现
│   │   ├── __init__.py
│   │   ├── instance.py
│   │   └── pool.py
│   ├── docker/                  # Docker 实现
│   │   ├── __init__.py
│   │   ├── instance.py
│   │   └── pool.py
│   ├── dify/                    # DifySandbox 实现
│   │   ├── __init__.py
│   │   └── instance.py
│   └── opensandbox/             # OpenSandbox 实现
│       ├── __init__.py
│       └── instance.py
└── pool.py                      # 多运行时池
```

---

## 7. 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| **API 兼容性** | 中 | 高 | 保持现有 API，添加可选参数 |
| **性能下降** | 低 | 中 | 保持 Bwrap 为默认 |
| **部署复杂度** | 中 | 中 | Docker Compose 一键部署 |
| **依赖管理** | 中 | 低 | 自己构建镜像 |
| **维护成本** | 中 | 中 | 优先级排序，逐步实现 |

---

## 8. 总结

### 8.1 推荐方案

**阶段一（MVP）**:
- 保持 Bubblewrap 作为默认
- 添加 Docker 运行时支持
- 实现运行时选择器

**阶段二（增强）**:
- 集成 DifySandbox (AI/ML 场景)
- 完善监控和指标

**阶段三（可选）**:
- 集成 OpenSandbox (阿里云场景)
- 支持更多运行时

### 8.2 核心优势

1. **向后兼容** - 保持现有 API 不变
2. **灵活选择** - 根据场景自动选择最优运行时
3. **易于扩展** - 插件化架构，易于添加新运行时
4. **性能优化** - 热池模式，低延迟
5. **生产就绪** - 支持离线部署、Docker、K8s

### 8.3 下一步

1. **评审技术方案** - 团队评审可行性
2. **原型验证** - 实现 Docker 运行时原型
3. **性能测试** - 对比各运行时性能
4. **详细设计** - API 设计、配置方案
5. **开始实施** - 按 8 周计划逐步实现

---

## 附录

### A. 相关文档

- [DifySandbox 技术预研](./dify-sandbox-research.md)
- [OpenSandbox 技术预研](./opensandbox-research.md)
- [架构设计文档](./architecture.md)

### B. 参考资料

- [Docker SDK for Python](https://docker-py.readthedocs.io/)
- [DifySandbox GitHub](https://github.com/langgenius/dify-sandbox)
- [OpenSandbox GitHub](https://github.com/alibaba/OpenSandbox)

### C. 快速开始

```bash
# 1. 启动所有运行时
docker-compose up -d

# 2. 测试 Bubblewrap
curl -X POST http://localhost:8000/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "print(\"Hello Bwrap\")"}'

# 3. 测试 Docker
curl -X POST http://localhost:8000/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "print(\"Hello Docker\")", "runtime": "docker"}'

# 4. 测试 DifySandbox
curl -X POST http://localhost:8000/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "import pandas as pd; print(pd.__version__)", "runtime": "dify"}'
```
