## 使用示例

```
from core.executor import LambdaSandboxExecutor
from sandbox.async_pool import AsyncSandboxPool
from sandbox.config import SandboxConfig

# 自定义沙箱配置
config = SandboxConfig(
    cpu_quota=2,
    memory_limit=512,
    allow_network=True,
    max_task_count=50
)

# 创建异步沙箱池
import asyncio
async def main():
    pool = AsyncSandboxPool(pool_size=10, config=config)
    await pool.start()

    # 创建执行器
    executor = LambdaSandboxExecutor(pool=pool)

    # 批量执行任务
    for i in range(100):
        result = executor.invoke(
            handler_code=my_handler_code,
            event={'index': i}
        )
        print(f"Task {i}: {result.is_success()}")

    # 关闭
    await pool.shutdown()

asyncio.run(main())
```