import os
import sys
import time

src_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
print(src_dir)
sys.path.append(src_dir + "/src")

from sandbox_runtime.sandbox.core.executor import LambdaSandboxExecutor
from sandbox_runtime.sandbox.sandbox.pool import SandboxPool
from sandbox_runtime.sandbox.sandbox.instance import SandboxConfig

# 自定义沙箱配置
config = SandboxConfig(
    cpu_quota=2, memory_limit=32 * 1024, allow_network=True, max_task_count=50
)

# 创建沙箱池
pool = SandboxPool(pool_size=2, config=config)
pool.start()


# 创建执行器
executor = LambdaSandboxExecutor(pool=pool)

my_handler_code = """
def handler(event, context):
    return "Hello, World!, Bingo"
"""


time.sleep(5)
# # 批量执行任务
for i in range(1):
    result = executor.invoke(handler_code=my_handler_code, event={"index": i})
    print(f"Task {i}: {result}")

# 关闭
executor.shutdown()
