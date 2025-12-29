import os
from typing import Optional
from sandbox_runtime.sandbox.sandbox.async_pool import AsyncSandboxPool
from sandbox_runtime.sandbox.core.executor import LambdaSandboxExecutor
from sandbox_runtime.sandbox.sandbox.config import SandboxConfig


def _get_env_int(key: str, default: int) -> int:
    """Get integer value from environment variable with fallback to default."""
    value = os.getenv(key)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def _get_env_bool(key: str, default: bool) -> bool:
    """Get boolean value from environment variable with fallback to default."""
    value = os.getenv(key)
    if value is None:
        return default
    return value.lower() in ("true", "1", "yes", "on")

# 全局executor实例
executor: Optional[LambdaSandboxExecutor] = None


async def init_sandbox_pool():
    """
    初始化异步沙箱池和全局executor

    Returns:
        LambdaSandboxExecutor: 全局executor实例
    """
    global executor

    # 如果已经初始化，则直接返回
    if executor is not None:
        return executor

    # 创建沙箱配置（支持从环境变量读取）
    config = SandboxConfig(
        cpu_quota=_get_env_int("SANDBOX_CPU_QUOTA", 2),
        memory_limit=_get_env_int("SANDBOX_MEMORY_LIMIT", 128 * 1024),
        allow_network=_get_env_bool("SANDBOX_ALLOW_NETWORK", True),
        timeout_seconds=_get_env_int("SANDBOX_TIMEOUT_SECONDS", 300),
        max_user_progress=_get_env_int("SANDBOX_MAX_USER_PROGRESS", 10),
    )

    # 创建沙箱池（支持从环境变量读取池大小）
    pool = AsyncSandboxPool(
        pool_size=_get_env_int("SANDBOX_POOL_SIZE", 2),
        config=config
    )
    await pool.start()

    # 创建执行器
    executor = LambdaSandboxExecutor(pool=pool)


async def shutdown_sandbox_pool():
    """
    关闭异步沙箱池和全局executor
    """
    global executor

    if executor:
        executor.shutdown()
        executor = None
