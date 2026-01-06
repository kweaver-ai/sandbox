# Sandbox API 文档

本目录包含沙箱平台的 OpenAPI 3.0.2 规范文档。

## 文档列表

### 1. [control-plane-api.yaml](./control-plane-api.yaml)
**控制平面 API** - 由 AI Agent 或上层服务调用的公开接口

**主要功能**:
- 会话管理：创建、查询、终止会话
- 代码执行：提交执行任务并获取结果
- 文件操作：上传/下载会话工作目录中的文件
- 模板管理：管理沙箱环境模板
- 容器管理：监控容器状态和资源使用

**调用方**:
- AI Agent 应用
- Data Agent 系统
- Operator Platform
- 其他上层服务

**基础路径**: `/api/v1`

### 2. [internal-api.yaml](./internal-api.yaml)
**内部回调 API** - 由 Executor (容器内 sandbox-executor) 调用的内部接口

**主要功能**:
- 执行结果上报：上报执行结果到控制平面
- 状态变更上报：上报执行状态变化
- 心跳上报：定时上报心跳以防止被误判为崩溃
- 容器生命周期事件：上报容器就绪、退出等事件

**调用方**:
- sandbox-executor (容器内守护进程)

**基础路径**: `/internal`

**安全要求**:
- 仅限内网访问
- 使用 INTERNAL_API_TOKEN 认证
- 建议配置 NetworkPolicy 限制访问

## 架构说明

### 容器调度架构

沙箱平台采用 **Container Scheduler** 作为 Control Plane 的内部模块，直接调用 Docker/K8s API 管理容器生命周期：

```
Control Plane
  └─ Container Scheduler (模块)
      ├─ K8s Scheduler (kubernetes python client)
      └─ Docker Scheduler (aiodocker SDK)
          ↓ 直接调用
      Container Runtime (K8s Pod / Docker Container)
          ↓
      Executor (sandbox-executor 守护进程)
          ↓ HTTP
      Control Plane (结果上报)
```

### 关键组件

- **Container Scheduler**: 容器调度器模块，负责根据模板选择运行时类型并构造容器配置
- **Container Runtime**: 真正的运行时环境（K8s Pod 或 Docker Container）
- **Executor**: 运行在容器内的 HTTP 守护进程，接收执行请求并调用 Bubblewrap 隔离用户代码

## 接口分类

### 按调用方分类

| 接口分类 | 文档 | 调用方 | 用途 |
|---------|------|--------|------|
| 控制平面 API | control-plane-api.yaml | AI Agent / 上层服务 | 提交执行任务、管理会话 |
| 内部 API | internal-api.yaml | Executor | 上报执行结果和状态 |

### 按功能分类

#### 会话管理
- `POST /api/v1/sessions` - 创建会话
- `GET /api/v1/sessions/{id}` - 获取会话详情
- `DELETE /api/v1/sessions/{id}` - 终止会话
- `GET /api/v1/sessions` - 列出会话

#### 代码执行
- `POST /api/v1/sessions/{session_id}/execute` - 提交执行任务
- `GET /api/v1/executions/{execution_id}/status` - 获取执行状态
- `GET /api/v1/executions/{execution_id}/result` - 获取执行结果

#### 文件操作
- `POST /api/v1/sessions/{id}/files/upload` - 上传文件
- `GET /api/v1/sessions/{id}/files/{name}` - 下载文件

#### 模板管理
- `POST /api/v1/templates` - 创建模板
- `GET /api/v1/templates` - 列出模板
- `GET /api/v1/templates/{id}` - 获取模板详情
- `PUT /api/v1/templates/{id}` - 更新模板
- `DELETE /api/v1/templates/{id}` - 删除模板

#### 容器监控
- `GET /api/v1/containers` - 列出容器
- `GET /api/v1/containers/{id}/status` - 获取容器状态
- `GET /api/v1/containers/{id}/logs` - 获取容器日志

## 公共规范

### 认证方式

#### 控制平面 API
```
Authorization: Bearer ACCESS_TOKEN
```

#### 内部 API
```
Authorization: Bearer INTERNAL_API_TOKEN
```

### 公共请求头

| Header | 类型 | 必填 | 说明 |
|--------|------|------|------|
| Authorization | string | 是 | Bearer Token 认证 |
| x-business-domain | string | 否 | 业务域标识 |
| Content-Type | string | 是 | application/json |
| x-request-id | string | 否 | 请求追踪 ID |

### 错误码规范

所有 API 使用统一的错误响应格式：

```json
{
  "error_code": "Sandbox.InvalidParameter",
  "description": "Invalid parameter",
  "error_detail": "Field 'timeout' must be between 1 and 3600",
  "error_link": "https://docs.example.com/errors/invalid-parameter",
  "solution": "Please check your request parameters"
}
```

#### 控制平面 API 错误码
- `Sandbox.InvalidParameter` - 请求参数错误
- `Sandbox.SessionNotFound` - 会话不存在
- `Sandbox.ExecutionNotFound` - 执行记录不存在
- `Sandbox.ExecException` - handler 执行异常
- `Sandbox.TooManyRequestsExection` - 无可用沙箱
- `Sandbox.ExecTimeout` - 执行超时
- `Sandbox.InternalError` - 内部错误

#### 内部 API 错误码
- `Internal.Unauthorized` - 认证失败
- `Internal.InvalidExecution` - 执行记录不存在
- `Internal.StateConflict` - 状态冲突
- `Internal.InternalError` - 内部错误

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 204 | 删除成功（无返回内容） |
| 307 | 临时重定向（如文件下载） |
| 400 | 请求参数错误 |
| 401 | 认证失败 |
| 403 | 禁止访问（如生产环境禁用调试接口） |
| 404 | 资源不存在 |
| 409 | 状态冲突 |
| 500 | 服务器内部错误 |
| 503 | 服务暂时不可用（如容量不足） |

## 使用示例

### 查看文档

建议使用以下工具查看 OpenAPI 文档：

1. **Swagger Editor**: https://editor.swagger.io/
2. **Redoc**: https://redocly.github.io/redoc/
3. **Swagger UI**: 本地部署或在线使用

### 使用 curl 示例

#### 创建会话
```bash
curl -X POST https://api.sandbox.example.com/api/v1/sessions \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "python-datascience",
    "mode": "ephemeral",
    "timeout": 300,
    "resources": {
      "cpu": "2",
      "memory": "2Gi",
      "disk": "5Gi"
    }
  }'
```

#### 提交执行任务
```bash
curl -X POST https://api.sandbox.example.com/api/v1/sessions/sess_abc123def4567890/execute \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "def handler(event):\n    return {\"status\": \"ok\", \"data\": event}",
    "language": "python",
    "timeout": 30,
    "event": {"name": "Alice"}
  }'
```

#### 获取执行结果
```bash
curl -X GET https://api.sandbox.example.com/api/v1/executions/exec_20240115_abc12345/result \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 相关文档

- [技术设计文档](../sandbox-design-v2.1.md) - 完整的系统设计文档
- [产品需求文档](../sandbox-prd-v2.md) - 产品需求和目标
- [CLI 工具文档](../sandbox-cli-design.md) - 本地执行工具说明

## 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.0 | 2025-01-05 | 初始版本，基于 sandbox-design-v2.1.md 创建 |
