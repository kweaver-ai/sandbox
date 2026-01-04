# DifySandbox 技术预研报告

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | v1.0 |
| 编写日期 | 2024-12 |
| 研究对象 | DifySandbox |
| 开源协议 | Apache-2.0 |

---

## 1. 概述

### 1.1 什么是 DifySandbox

**DifySandbox** 是由 Dify.AI 团队开发的轻量级、快速、安全的代码执行环境，专门用于在多租户环境中安全地执行不可信代码。它主要服务于 Dify Workflow 中的代码执行节点，解决 AI 工作流中需要执行用户提交代码的安全问题。

### 1.2 关键特性

| 特性 | 说明 |
|------|------|
| **轻量级** | 基于 Docker 容器，资源占用低 |
| **高性能** | Worker 池模式，避免每次启动新容器 |
| **多语言** | 支持 Python 3 和 Node.js |
| **安全隔离** | Seccomp + chroot + 容器多层隔离 |
| **易部署** | Docker 一键部署，支持 K8s |
| **可定制** | 支持自定义依赖和系统调用白名单 |

### 1.3 开源信息

- **GitHub**: https://github.com/langgenius/dify-sandbox
- **维护团队**: Dify.AI (langgenius)
- **开源时间**: 2024年7月
- **当前版本**: v0.2.9 (2024年9月)
- **开源协议**: Apache-2.0

---

## 2. 技术架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                     DifySandbox Service                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │   API Server│    │  Worker Pool │    │Dependency   │    │
│  │   (Gin/Go)  │    │  (并发执行)  │    │  Manager    │    │
│  └─────────────┘    └─────────────┘    └─────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Docker 容器隔离层                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │   Python    │    │   Node.js   │    │  Seccomp    │    │
│  │  Runtime    │    │   Runtime   │    │  Filter     │    │
│  └─────────────┘    └─────────────┘    └─────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Linux 系统层                            │
│              chroot + 非 root 用户 + 资源限制                │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 隔离机制

DifySandbox 采用**多层防御**的隔离策略：

#### 第一层：Docker 容器隔离
- 每个服务实例运行在独立容器中
- 容器内通过 Worker 池管理多个执行环境

#### 第二层：Seccomp 系统调用过滤
```go
// 系统调用白名单示例
allowedSyscalls = []uint{
    syscall.SYS_READ,
    syscall.SYS_WRITE,
    syscall.SYS_OPENAT,
    syscall.SYS_EXIT,
    // ... 更多安全系统调用
}
```

#### 第三层：chroot 文件系统隔离
- 创建虚拟化的根目录
- 限制对宿主机文件系统的访问

#### 第四层：进程权限隔离
- 非 root 用户执行 (UID=65537, GID=1000)
- 禁止特权操作

### 2.3 通信协议

**HTTP REST API** (基于 Go Gin 框架)

| 端点 | 方法 | 功能 |
|------|------|------|
| `/v1/sandbox/run` | POST | 执行代码 |
| `/v1/sandbox/dependencies` | GET | 获取依赖列表 |
| `/v1/sandbox/dependencies/update` | POST | 更新依赖 |

---

## 3. 部署方案

### 3.1 Docker 部署（推荐）

```bash
# 拉取官方镜像
docker pull langgenius/dify-sandbox:latest

# 启动服务
docker run -d \
  --name dify-sandbox \
  -p 8194:8194 \
  -e ENABLE_NETWORK=true \
  langgenius/dify-sandbox:latest
```

### 3.2 Docker Compose 部署

```yaml
version: '3.8'

services:
  dify-sandbox:
    image: langgenius/dify-sandbox:latest
    container_name: dify-sandbox
    ports:
      - "8194:8194"
    environment:
      - ENABLE_NETWORK=true
      - MAX_WORKERS=8
      - MAX_REQUESTS=100
      - WORKER_TIMEOUT=10
    restart: unless-stopped
```

### 3.3 自定义镜像

```dockerfile
FROM langgenius/dify-sandbox:latest

# 添加自定义 Python 依赖
RUN echo "pandas>=1.3.0" >> dependencies/python-requirements.txt
RUN echo "numpy>=1.21.0" >> dependencies/python-requirements.txt
RUN echo "scikit-learn>=1.0.0" >> dependencies/python-requirements.txt
```

---

## 4. API 集成

### 4.1 Python 客户端示例

```python
import requests

class DifySandboxClient:
    def __init__(self, endpoint: str, api_key: str = "dify-sandbox"):
        self.endpoint = endpoint.rstrip('/')
        self.api_key = api_key
        self.headers = {
            "X-API-Key": api_key,
            "Content-Type": "application/json"
        }

    def execute(self, code: str, language: str = "python3") -> dict:
        url = f"{self.endpoint}/v1/sandbox/run"
        payload = {
            "language": language,
            "code": code,
            "enable_network": False
        }
        response = requests.post(url, json=payload, headers=self.headers)
        return response.json()

# 使用示例
client = DifySandboxClient("http://localhost:8194")
result = client.execute("print('Hello, DifySandbox!')")
print(result)
```

### 4.2 请求/响应格式

**请求:**
```json
{
  "language": "python3",
  "code": "print('Hello')",
  "enable_network": false
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "stdout": "Hello\n",
    "stderr": ""
  }
}
```

---

## 5. 性能分析

### 5.1 性能指标

| 指标 | DifySandbox | Docker per-request | Bubblewrap |
|------|-------------|-------------------|------------|
| 服务启动 | ~2 秒 | - | ~50ms |
| 首次执行 | ~500ms | ~2 秒 | ~50ms |
| 后续执行 | ~50ms | ~2 秒 | ~2ms |
| 内存占用 | ~50MB | ~200MB | ~10MB |

### 5.2 并发能力

| 配置 | Worker 数 | 并发数 | 吞吐量 |
|------|----------|--------|--------|
| 默认 | 4 | 4 | ~20 req/s |
| 中等 | 8 | 8 | ~40 req/s |
| 高负载 | 16 | 16 | ~80 req/s |

---

## 6. 与其他方案对比

| 特性 | DifySandbox | E2B | Docker | Bubblewrap |
|------|-------------|-----|--------|------------|
| 开源协议 | Apache-2.0 | Apache-2.0 | 开源 | GPL/LGPL |
| 隔离级别 | 多层隔离 | 微VM | 容器 | 进程 |
| 启动速度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| 执行延迟 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| AI/ML 支持 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| 离线部署 | ✅ | ⚠️ | ✅ | ✅ |
| 部署难度 | 低 | 高 | 低 | 低 |

---

## 7. 实施建议

### 7.1 适用场景

✅ **使用 DifySandbox 当:**
- 需要执行 AI/ML 相关代码
- 对性能有较高要求
- 需要简单的部署方案
- 多租户环境
- 需要 HTTP API 接口

### 7.2 集成方案

在多运行时架构中，DifySandbox 作为 **AI/ML 专用运行时**：

```
┌─────────────────────────────────────────────────────────────┐
│                    RuntimeSelector                          │
├─────────────────────────────────────────────────────────────┤
│  可信代码 → Bubblewrap (默认，最低延迟)                      │
│  通用场景 → Docker (灵活，易部署)                            │
│  AI/ML   → DifySandbox (预装依赖，高性能)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. 总结

### 8.1 核心优势

1. **部署简单** - Docker 一键部署
2. **性能优秀** - Worker 池避免频繁启动
3. **AI 友好** - 预装 ML 依赖
4. **安全可控** - 多层隔离机制
5. **开源协议** - Apache-2.0，可自由使用

### 8.2 推荐配置

**基础配置:**
- 1 个实例
- 4 Workers
- 默认超时

**生产配置:**
- 2 个实例（负载均衡）
- 8 Workers/实例
- 300s 超时
- 启用网络代理

---

## 附录

### A. 参考资料

- [DifySandbox GitHub](https://github.com/langgenius/dify-sandbox)
- [Dify 官方文档](https://docs.dify.ai/)
