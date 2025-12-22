# Sandbox Runtime CLI 设计文档

## 1. 文档概述

### 1.1 背景与目标
为了方便开发者直接在命令行中测试和运行符合 [AWS Lambda handler 规范](sandbox-runtime-v1.md) 的 Python 脚本，我们需要设计一个轻量级的命令行界面（CLI）。该 CLI 将作为 `sandbox-runtime` 项目的独立工具，允许开发者快速执行 handler 函数并查看执行结果，无需启动完整的 HTTP 服务。

### 1.2 核心价值
- **开发友好**: 提供简单直观的命令行接口，支持快速测试
- **标准兼容**: 严格遵循 sandbox-runtime-v1.md 中定义的 Handler 函数规范
- **本地执行**: 利用本地 sandbox-runtime 环境，无需远程服务
- **结果清晰**: 格式化输出执行结果，包括 stdout、stderr、返回值和性能指标

## 2. 功能需求

### 2.1 核心功能
1. **执行 Python 脚本**: 支持传入 Python 文件路径，执行其中的 `handler(event)` 函数
2. **事件数据传递**: 支持通过命令行参数或文件传递 `event` 数据
3. **结果展示**: 清晰展示执行结果，包括：
   - 标准输出 (stdout)
   - 标准错误 (stderr)
   - 函数返回值 (result)
   - 性能指标 (metrics)

### 2.2 高级功能
1. **上下文参数传递**: 支持传递额外的上下文参数
2. **性能模式**: 支持 --profile 模式，显示详细的性能分析
3. **日志级别控制**: 支持调整日志输出级别
4. **超时控制**: 支持设置执行超时时间
5. **批量执行**: 支持执行多个文件或目录

## 3. CLI 接口设计

### 3.1 命令格式
```bash
# 基本用法
sandbox-run <script_path> [options]

# 示例
sandbox-run ./handler.py
sandbox-run ./handler.py --event '{"name": "test"}'
sandbox-run ./handler.py --event-file event.json
sandbox-run ./handler.py --context '{"request_id": "123"}' --verbose
```

### 3.2 参数设计

| 参数 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| script_path | string | ✓ | - | Python 脚本文件路径 |
| --event, -e | string | ✗ | "{}" | 传递给 handler 的事件数据 (JSON 字符串) |
| --event-file, -f | string | ✗ | - | 从文件读取事件数据 (JSON 格式) |
| --context, -c | string | ✗ | "{}" | 上下文参数 (JSON 字符串) |
| --context-file | string | ✗ | - | 从文件读取上下文参数 |
| --timeout, -t | int | ✗ | 300 | 执行超时时间 (秒) |
| --verbose, -v | flag | ✗ | False | 显示详细日志 |
| --quiet, -q | flag | ✗ | False | 仅显示结果，隐藏其他信息 |
| --profile, -p | flag | ✗ | False | 显示性能分析信息 |
| --output, -o | string | ✗ | - | 将结果保存到文件 |
| --format | string | ✗ | "pretty" | 输出格式: pretty, json, yaml |
| --log-level | string | ✗ | "WARNING" | 日志级别: DEBUG, INFO, WARNING, ERROR |

### 3.3 退出码
| 退出码 | 含义 |
|--------|------|
| 0 | 执行成功 |
| 1 | 通用错误 |
| 2 | 文件不存在或无法读取 |
| 3 | 语法错误或 handler 函数未定义 |
| 4 | 执行超时 |
| 5 | 沙箱初始化失败 |

## 4. 实现设计

### 4.1 项目结构
```
sandbox-runtime/
├── src/sandbox_runtime/
│   ├── cli/                          # 新增 CLI 模块
│   │   ├── __init__.py
│   │   ├── main.py                   # CLI 主入口
│   │   ├── runner.py                 # 执行器封装
│   │   ├── formatter.py              # 结果格式化
│   │   └── config.py                 # CLI 配置
│   └── ...
├── scripts/
│   └── sandbox-run                   # CLI 可执行脚本
└── setup.py                          # 添加 console_scripts 入口
```

### 4.2 核心实现流程

#### 4.2.1 CLI 主入口 (cli/main.py)
```python
import argparse
import asyncio
import sys
from pathlib import Path

from sandbox_runtime.cli.runner import SandboxRunner
from sandbox_runtime.cli.formatter import ResultFormatter
from sandbox_runtime.utils.loggers import get_logger

def parse_args():
    """解析命令行参数"""
    parser = argparse.ArgumentParser(
        description="Sandbox Runtime CLI - Execute Lambda handler functions locally"
    )

    # 位置参数
    parser.add_argument(
        "script_path",
        type=str,
        help="Python script file path containing handler(event) function"
    )

    # 事件数据参数
    event_group = parser.add_mutually_exclusive_group()
    event_group.add_argument(
        "--event", "-e",
        type=str,
        default="{}",
        help="Event data as JSON string (default: {})"
    )
    event_group.add_argument(
        "--event-file", "-f",
        type=str,
        help="Read event data from JSON file"
    )

    # 上下文参数
    context_group = parser.add_mutually_exclusive_group()
    context_group.add_argument(
        "--context", "-c",
        type=str,
        default="{}",
        help="Context data as JSON string (default: {})"
    )
    context_group.add_argument(
        "--context-file",
        type=str,
        help="Read context data from JSON file"
    )

    # 执行控制
    parser.add_argument(
        "--timeout", "-t",
        type=int,
        default=300,
        help="Execution timeout in seconds (default: 300)"
    )

    # 输出控制
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose logging"
    )
    parser.add_argument(
        "--quiet", "-q",
        action="store_true",
        help="Quiet mode, only show results"
    )
    parser.add_argument(
        "--profile", "-p",
        action="store_true",
        help="Show performance profiling information"
    )

    # 格式化选项
    parser.add_argument(
        "--output", "-o",
        type=str,
        help="Save execution result to file"
    )
    parser.add_argument(
        "--format",
        choices=["pretty", "json", "yaml"],
        default="pretty",
        help="Output format (default: pretty)"
    )

    # 日志级别
    parser.add_argument(
        "--log-level",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        default="WARNING",
        help="Logging level (default: WARNING)"
    )

    return parser.parse_args()

async def main():
    """CLI 主函数"""
    args = parse_args()

    # 设置日志
    logger = get_logger(__name__, level=args.log_level)

    # 验证脚本文件
    script_path = Path(args.script_path)
    if not script_path.exists():
        print(f"Error: Script file not found: {args.script_path}", file=sys.stderr)
        sys.exit(2)

    # 读取事件数据
    try:
        if args.event_file:
            with open(args.event_file, 'r', encoding='utf-8') as f:
                event_data = f.read()
        else:
            event_data = args.event
    except Exception as e:
        print(f"Error reading event data: {e}", file=sys.stderr)
        sys.exit(2)

    # 读取上下文数据
    try:
        if args.context_file:
            with open(args.context_file, 'r', encoding='utf-8') as f:
                context_data = f.read()
        else:
            context_data = args.context
    except Exception as e:
        print(f"Error reading context data: {e}", file=sys.stderr)
        sys.exit(2)

    # 创建执行器
    runner = SandboxRunner()

    try:
        # 执行脚本
        if not args.quiet:
            print(f"Executing: {script_path}")
            if args.event_file:
                print(f"Using event file: {args.event_file}")
            print("-" * 50)

        result = await runner.execute(
            script_path=str(script_path),
            event_data=event_data,
            context_data=context_data,
            timeout=args.timeout
        )

        # 格式化输出
        formatter = ResultFormatter(
            format=args.format,
            show_profile=args.profile,
            verbose=args.verbose
        )

        output = formatter.format_result(result)

        # 输出结果
        print(output)

        # 保存到文件
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                f.write(output)
            if not args.quiet:
                print(f"\nResult saved to: {args.output}")

        # 根据执行状态设置退出码
        if result.exit_code == 0:
            sys.exit(0)
        else:
            sys.exit(1)

    except TimeoutError:
        print(f"Error: Execution timed out after {args.timeout} seconds", file=sys.stderr)
        sys.exit(4)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)

def entry_point():
    """CLI 入口点"""
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nInterrupted by user", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    entry_point()
```

#### 4.2.2 执行器封装 (cli/runner.py)
```python
import json
import asyncio
from pathlib import Path
from typing import Dict, Any, Optional

from sandbox_runtime.sandbox.core.executor import LambdaSandboxExecutor
from sandbox_runtime.sandbox.sandbox.async_pool import AsyncSandboxPool
from sandbox_runtime.sandbox.sandbox.instance import SandboxConfig
from sandbox_runtime.utils.loggers import get_logger
from sandbox_runtime.errors import SandboxError

class SandboxRunner:
    """Sandbox 执行器封装"""

    def __init__(self):
        self.logger = get_logger(__name__)
        self.executor: Optional[LambdaSandboxExecutor] = None

    async def _ensure_executor(self):
        """确保执行器已初始化"""
        if self.executor is None:
            # 创建沙箱配置（使用较小的资源限制，适合 CLI 使用）
            config = SandboxConfig(
                cpu_quota=1,
                memory_limit_mb=256,
                allow_network=False,
                max_task_count=10,
                max_idle_time=60
            )

            # 创建沙箱池（单实例即可）
            pool = AsyncSandboxPool(
                pool_size=1,
                config=config
            )

            # 初始化池
            await pool.initialize()

            # 创建执行器
            self.executor = LambdaSandboxExecutor(pool=pool)

    async def execute(
        self,
        script_path: str,
        event_data: str,
        context_data: str,
        timeout: int = 300
    ) -> "ExecutionResult":
        """
        执行 Python 脚本

        Args:
            script_path: 脚本文件路径
            event_data: 事件数据 (JSON 字符串)
            context_data: 上下文数据 (JSON 字符串)
            timeout: 超时时间（秒）

        Returns:
            ExecutionResult: 执行结果
        """
        # 确保执行器初始化
        await self._ensure_executor()

        # 读取并验证脚本
        script_path = Path(script_path)
        try:
            with open(script_path, 'r', encoding='utf-8') as f:
                handler_code = f.read()
        except Exception as e:
            raise SandboxError(f"Failed to read script file: {e}")

        # 解析事件和上下文数据
        try:
            event = json.loads(event_data) if event_data else {}
        except json.JSONDecodeError as e:
            raise SandboxError(f"Invalid event JSON: {e}")

        try:
            context = json.loads(context_data) if context_data else {}
        except json.JSONDecodeError as e:
            raise SandboxError(f"Invalid context JSON: {e}")

        # 执行代码（带超时控制）
        try:
            result = await asyncio.wait_for(
                self.executor.invoke(
                    handler_code=handler_code,
                    event=event,
                    context_kwargs=context
                ),
                timeout=timeout
            )
            return result
        except asyncio.TimeoutError:
            raise TimeoutError(f"Execution timed out after {timeout} seconds")

    async def cleanup(self):
        """清理资源"""
        if self.executor and self.executor.pool:
            await self.executor.pool.cleanup()
```

#### 4.2.3 结果格式化器 (cli/formatter.py)
```python
import json
import yaml
from typing import Any
from datetime import datetime

from sandbox_runtime.sandbox.core.result import StandardExecutionResult

class ResultFormatter:
    """执行结果格式化器"""

    def __init__(
        self,
        format: str = "pretty",
        show_profile: bool = False,
        verbose: bool = False
    ):
        self.format = format
        self.show_profile = show_profile
        self.verbose = verbose

    def format_result(self, result: StandardExecutionResult) -> str:
        """格式化执行结果"""
        if self.format == "json":
            return self._format_json(result)
        elif self.format == "yaml":
            return self._format_yaml(result)
        else:
            return self._format_pretty(result)

    def _format_pretty(self, result: StandardExecutionResult) -> str:
        """美化格式输出"""
        output = []

        # 执行状态
        if result.exit_code == 0:
            output.append("✅ Execution succeeded")
        else:
            output.append(f"❌ Execution failed (exit code: {result.exit_code})")

        output.append("")

        # 标准输出
        if result.stdout:
            output.append("📤 STDOUT:")
            output.append("-" * 40)
            output.append(result.stdout.strip())
            output.append("")

        # 标准错误
        if result.stderr:
            output.append("📥 STDERR:")
            output.append("-" * 40)
            output.append(result.stderr.strip())
            output.append("")

        # 函数返回值
        output.append("📄 RESULT:")
        output.append("-" * 40)
        if result.result is not None:
            if isinstance(result.result, (dict, list)):
                output.append(json.dumps(result.result, indent=2, ensure_ascii=False))
            else:
                output.append(str(result.result))
        else:
            output.append("None")
        output.append("")

        # 性能指标
        if self.show_profile or self.verbose:
            output.append("⚡ METRICS:")
            output.append("-" * 40)
            metrics = result.metrics
            output.append(f"  Duration:     {metrics.duration_ms:.2f} ms")
            output.append(f"  CPU Time:     {metrics.cpu_time_ms:.2f} ms")
            output.append(f"  Memory Peak:  {metrics.memory_peak_mb:.2f} MB")
            output.append("")

            if self.verbose:
                output.append("🔍 DETAILS:")
                output.append("-" * 40)
                output.append(f"  Timestamp:    {datetime.now().isoformat()}")
                output.append(f"  Exit Code:    {result.exit_code}")
                output.append("")

        return "\n".join(output)

    def _format_json(self, result: StandardExecutionResult) -> str:
        """JSON 格式输出"""
        data = {
            "exit_code": result.exit_code,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "result": result.result,
            "metrics": {
                "duration_ms": result.metrics.duration_ms,
                "cpu_time_ms": result.metrics.cpu_time_ms,
                "memory_peak_mb": result.metrics.memory_peak_mb,
            }
        }
        return json.dumps(data, indent=2, ensure_ascii=False, default=str)

    def _format_yaml(self, result: StandardExecutionResult) -> str:
        """YAML 格式输出"""
        data = {
            "exit_code": result.exit_code,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "result": result.result,
            "metrics": {
                "duration_ms": result.metrics.duration_ms,
                "cpu_time_ms": result.metrics.cpu_time_ms,
                "memory_peak_mb": result.metrics.memory_peak_mb,
            }
        }
        return yaml.dump(data, default_flow_style=False, allow_unicode=True)
```

## 5. 使用示例

### 5.1 基本使用
```python
# handler.py
def handler(event):
    """简单的 Lambda handler 函数"""
    name = event.get("name", "World")
    message = f"Hello, {name}!"
    print(message)
    return {"message": message}
```

```bash
# 执行脚本
$ sandbox-run handler.py
✅ Execution succeeded

📤 STDOUT:
----------------------------------------
Hello, World!

📄 RESULT:
----------------------------------------
{"message": "Hello, World!"}
```

### 5.2 传递事件数据
```bash
# 使用命令行参数
$ sandbox-run handler.py --event '{"name": "Alice"}'
✅ Execution succeeded

📤 STDOUT:
----------------------------------------
Hello, Alice!

📄 RESULT:
----------------------------------------
{"message": "Hello, Alice!"}

# 使用事件文件
$ cat event.json
{"name": "Bob", "age": 30}

$ sandbox-run handler.py --event-file event.json
✅ Execution succeeded

📤 STDOUT:
----------------------------------------
Hello, Bob!

📄 RESULT:
----------------------------------------
{"message": "Hello, Bob!"}
```

### 5.3 性能分析
```bash
$ sandbox-run handler.py --profile
✅ Execution succeeded

📤 STDOUT:
----------------------------------------
Hello, World!

📄 RESULT:
----------------------------------------
{"message": "Hello, World!"}

⚡ METRICS:
----------------------------------------
  Duration:     45.23 ms
  CPU Time:     42.15 ms
  Memory Peak:  32.50 MB
```

### 5.4 JSON 格式输出
```bash
$ sandbox-run handler.py --format json
{
  "exit_code": 0,
  "stdout": "Hello, World!\n",
  "stderr": "",
  "result": {
    "message": "Hello, World!"
  },
  "metrics": {
    "duration_ms": 45.23,
    "cpu_time_ms": 42.15,
    "memory_peak_mb": 32.5
  }
}
```

## 6. 部署与安装

### 6.1 安装方式
```bash
# 从源码安装
pip install -e .

# 或者开发模式安装
pip install -e .[dev]
```

### 6.2 setup.py 配置
```python
setup(
    name="sandbox-runtime",
    version="1.0.0",
    packages=find_packages(where="src"),
    package_dir={"": "src"},

    # 添加 CLI 入口点
    entry_points={
        "console_scripts": [
            "sandbox-run=sandbox_runtime.cli.main:entry_point",
        ],
    },

    # 依赖项
    install_requires=[
        "fastapi",
        "uvicorn",
        "pydantic",
        "psutil",
        "aiofiles",
        "pyyaml",
    ],

    # 可选依赖
    extras_require={
        "dev": [
            "pytest",
            "pytest-asyncio",
            "black",
            "flake8",
        ],
    },
)
```

## 7. 测试计划

### 7.1 单元测试
- 测试 CLI 参数解析
- 测试事件/上下文数据读取和解析
- 测试结果格式化器
- 测试执行器封装

### 7.2 集成测试
- 测试完整的执行流程
- 测试各种输入格式
- 测试错误处理
- 测试超时控制

### 7.3 端到端测试
- 测试实际的 Python 脚本执行
- 测试性能分析功能
- 测试不同输出格式

## 8. 未来扩展

### 8.1 可能的增强功能
1. **交互模式**: 支持进入交互式 Python REPL
2. **调试模式**: 支持 pdb 断点调试
3. **热重载**: 监听文件变化自动重新执行
4. **批量测试**: 支持测试套件执行
5. **配置文件**: 支持 .sandboxrc 配置文件
6. **插件系统**: 支持自定义插件扩展

### 8.2 与其他工具集成
1. **IDE 插件**: VS Code / PyCharm 插件支持
2. **CI/CD 集成**: GitHub Actions / Jenkins 集成
3. **容器化**: Docker 镜像支持
4. **云服务集成**: AWS Lambda 本地调试

## 9. 总结

本文档详细设计了 sandbox-runtime 的 CLI 工具，该工具将：
- 提供简单易用的命令行接口
- 完全兼容 Lambda handler 规范
- 利用现有 sandbox-runtime 的安全隔离能力
- 提供灵活的输入和输出选项
- 支持性能分析和调试功能

通过这个 CLI，开发者可以快速测试和调试 Lambda 函数，提高开发效率，同时保持与生产环境的一致性。