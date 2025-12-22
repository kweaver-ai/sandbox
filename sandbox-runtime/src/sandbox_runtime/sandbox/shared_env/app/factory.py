from typing import Optional
import uvicorn
import shutil
from fastapi import FastAPI
from pathlib import Path
import logging

from sandbox_runtime.utils.loggers import DEFAULT_LOGGER
from sandbox_runtime.sandbox.shared_env.routes import register_routes
from sandbox_runtime.sandbox.shared_env.app.config import WORKSPACE_LIST_FILE
from sandbox_runtime.sandbox.shared_env.app.lifespan import (
    init_sandbox_pool,
    shutdown_sandbox_pool,
)
from sandbox_runtime.utils.clean_task import start_cleanup_task

# 全局应用实例
app: Optional[FastAPI] = None


def create_app() -> FastAPI:
    """创建 FastAPI 应用"""
    global app

    # 如果app已经创建，直接返回
    if app is not None:
        return app

    app = FastAPI(
        title="沙箱 API",
        description="用于安全运行 Python 代码的沙箱 API",
        version="1.0.0",
        openapi_url="/api.json",  # OpenAPI JSON 路径
    )

    # 注册应用启动事件
    @app.on_event("startup")
    async def startup_event():
        """应用启动时初始化沙箱池"""
        await init_sandbox_pool()

    # 注册应用关闭事件
    @app.on_event("shutdown")
    async def shutdown_event():
        """应用关闭时释放沙箱池资源"""
        await shutdown_sandbox_pool()

    # 注册路由
    register_routes(app)

    return app


def run(
    host: str = "0.0.0.0",
    port: int = 9101,
    workers: int = 1,
    log_level: str = "info",
    reload: bool = False,
    ssl_keyfile: Optional[str] = None,
    ssl_certfile: Optional[str] = None,
):
    """
    启动沙箱服务

    Args:
        host: 监听地址
        port: 监听端口
        workers: 工作进程数
        log_level: 日志级别
        reload: 是否启用热重载
        ssl_keyfile: SSL 密钥文件路径
        ssl_certfile: SSL 证书文件路径
    """
    # 检查 Bubblewrap 是否安装
    if not shutil.which("bwrap"):
        DEFAULT_LOGGER.error("Bubblewrap is not installed. Please install it first.")
        return

    # 检查运行脚本是否存在
    script_dir = Path(__file__).parent.parent
    run_script = script_dir / "run_isolated.sh"
    if not run_script.exists():
        DEFAULT_LOGGER.error(f"Run script not found: {run_script}")
        return

    # 确保运行脚本有执行权限
    run_script.chmod(0o755)

    # 启动线程清理过期会话
    start_cleanup_task(WORKSPACE_LIST_FILE)

    # 创建应用
    app = create_app()

    # 启动服务
    DEFAULT_LOGGER.info(f"Starting sandbox service on {host}:{port}")
    uvicorn.run(
        app,
        host=host,
        port=port,
        workers=workers,
        log_level=log_level,
        reload=reload,
        ssl_keyfile=ssl_keyfile,
        ssl_certfile=ssl_certfile,
    )
