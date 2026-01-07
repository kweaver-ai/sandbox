"""
FastAPI 主应用

沙箱控制中心的 FastAPI 应用入口。
"""
import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from structlog import get_logger

# 导入所有路由
from sandbox_control_plane.src.interfaces.rest.api.v1 import (
    sessions,
    executions,
    templates,
    containers,
    health,
    files,
)
from sandbox_control_plane.src.interfaces.rest.schemas.response import HealthResponse

logger = get_logger(__name__)


# 应用启动时间
_start_time = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    应用生命周期管理

    处理应用启动和关闭时的逻辑。
    """
    # 启动时执行
    logger.info("Starting Sandbox Control Plane")
    # TODO: 初始化数据库连接
    # TODO: 初始化调度器
    # TODO: 启动后台清理任务

    yield

    # 关闭时执行
    logger.info("Shutting down Sandbox Control Plane")
    # TODO: 关闭数据库连接
    # TODO: 停止后台任务


def create_app() -> FastAPI:
    """
    创建 FastAPI 应用

    使用工厂模式创建应用，便于测试和配置。
    """
    app = FastAPI(
        title="Sandbox Control Plane",
        description="代码沙箱管理平台 API",
        version="2.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # 配置 CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # 生产环境应配置具体域名
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 添加 Gzip 压缩
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # 注册异常处理器
    _register_exception_handlers(app)

    # 注册中间件
    _register_middleware(app)

    # 注册路由
    _register_routes(app)

    return app


def _register_exception_handlers(app: FastAPI) -> None:
    """注册异常处理器"""

    @app.exception_handler(Exception)
    async def global_exception_handler(
        request: Request,
        exc: Exception
    ) -> JSONResponse:
        """全局异常处理"""
        logger.error(
            "Unhandled exception",
            path=request.url.path,
            method=request.method,
            error=str(exc),
            exc_info=exc,
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "Internal Server Error",
                "message": "An unexpected error occurred",
                "detail": str(exc) if app.debug else None,
            },
        )


def _register_routes(app: FastAPI) -> None:
    """注册路由"""

    # 注册所有 API 路由
    app.include_router(health.router, prefix="/api/v1")
    app.include_router(sessions.router, prefix="/api/v1")
    app.include_router(executions.router, prefix="/api/v1")
    app.include_router(templates.router, prefix="/api/v1")
    app.include_router(containers.router, prefix="/api/v1")
    app.include_router(files.router, prefix="/api/v1")

    # 根端点
    @app.get("/", tags=["root"])
    async def root() -> dict:
        """根端点"""
        return {
            "name": "Sandbox Control Plane",
            "version": "2.1.0",
            "status": "operational",
            "features": [
                "session_management",
                "code_execution",
                "template_management",
                "file_operations",
                "container_monitoring",
            ],
            "documentation": {
                "swagger": "/docs",
                "redoc": "/redoc",
                "openapi": "/openapi.json",
            },
        }


def _register_middleware(app: FastAPI) -> None:
    """注册中间件"""

    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        """记录所有请求"""
        start_time = time.time()

        # 记录请求
        logger.info(
            "Incoming request",
            method=request.method,
            path=request.url.path,
            client=request.client.host if request.client else None,
        )

        # 处理请求
        response = await call_next(request)

        # 记录响应
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)

        logger.info(
            "Request completed",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            process_time=process_time,
        )

        return response


# 创建应用实例
app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.interfaces.rest.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
