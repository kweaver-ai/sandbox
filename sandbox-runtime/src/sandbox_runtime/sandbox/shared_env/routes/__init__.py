from fastapi import FastAPI
from sandbox_runtime.sandbox.shared_env.routes.session import router as session_router
from sandbox_runtime.sandbox.shared_env.routes.file_operations import (
    router as file_operations_router,
)
from sandbox_runtime.sandbox.shared_env.routes.execution import (
    router as execution_router,
)
from sandbox_runtime.sandbox.shared_env.routes.management import (
    router as management_router,
)
from sandbox_runtime.sandbox.shared_env.app.config import URL_PREFIX


def register_routes(app: FastAPI):
    """注册所有路由到 FastAPI 应用"""
    # 创建主路由器
    from fastapi import APIRouter

    main_router = APIRouter(prefix=URL_PREFIX)

    # 包含所有子路由
    main_router.include_router(session_router)
    main_router.include_router(file_operations_router)
    main_router.include_router(execution_router)
    main_router.include_router(management_router)

    # 注册主路由到应用
    app.include_router(main_router)
