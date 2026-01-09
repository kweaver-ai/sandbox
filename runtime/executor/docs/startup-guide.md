# Sandbox Runtime Executor 本地开发环境启动指南（使用 uv）

## 目标
使用 `uv` 快速启动 Runtime Executor 服务。

## 前置要求
- 已安装 `uv`：`curl -LsSf https://astral.sh/uv/install.sh | sh`
- 或使用 pip 安装：`pip install uv`

## 启动步骤

### 1. 进入项目目录
```bash
cd /Users/guochenguang/project/sandbox-v2/sandbox-runtime-executor/runtime/executor
```

### 2. 设置 PYTHONPATH
```bash
# 必须：设置 PYTHONPATH 到 runtime 目录
export PYTHONPATH=/Users/guochenguang/project/sandbox-v2/sandbox-runtime-executor/runtime
```

### 3. 使用 uv 创建虚拟环境并安装依赖
```bash
# uv 会自动创建虚拟环境并安装 pyproject.toml 中的依赖
uv sync
```

### 4. 使用 uv 运行服务
```bash
# 方式一：使用 uvicorn 启动（推荐，带自动重载）
uv run uvicorn executor.interfaces.http.rest:app --host 0.0.0.0 --port 8080 --reload

# 方式二：直接运行 Python 文件
uv run python interfaces/http/rest.py
```

### 5. 验证服务
```bash
# 健康检查
curl http://localhost:8080/health

# 访问 API 文档
open http://localhost:8080/docs
```

## uv 常用命令
```bash
# 同步依赖
uv sync

# 添加新依赖
uv add fastapi uvicorn

# 运行脚本
uv run python -m executor.interfaces.http.rest

# 激活虚拟环境（可选）
uv shell
```

## 关键文件
- 主入口：`runtime/executor/interfaces/http/rest.py`
- 依赖配置：`runtime/executor/pyproject.toml`

## 环境变量（可选）
```bash
export WORKSPACE_PATH=/tmp/sandbox_workspace
export CONTROL_PLANE_URL=http://localhost:8000
export EXECUTOR_PORT=8080
```

## 故障排查
- 如果 uv 未安装：`curl -LsSf https://astral.sh/uv/install.sh | sh`
- 如果依赖安装失败：运行 `uv sync --refresh`
- 如果模块导入失败：检查是否在正确的目录
