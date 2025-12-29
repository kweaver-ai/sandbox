"""
Sandbox execution wrapper for CLI
"""

import json
import asyncio
from pathlib import Path
from typing import Dict, Any, Optional

from sandbox_runtime.sandbox.core.executor import LambdaSandboxExecutor
from sandbox_runtime.sandbox.sandbox.async_pool import AsyncSandboxPool
from sandbox_runtime.sandbox.sandbox.config import SandboxConfig
from sandbox_runtime.utils.loggers import get_logger
from sandbox_runtime.errors import SandboxError


class SandboxRunner:
    """
    Sandbox execution wrapper for CLI usage
    """

    def __init__(self):
        self.logger = get_logger(__name__)
        self.executor: Optional[LambdaSandboxExecutor] = None
        self.pool: Optional[AsyncSandboxPool] = None

    async def _ensure_executor(self):
        """Ensure the executor is initialized"""
        if self.executor is None:
            # Create sandbox config optimized for CLI usage
            # Note: Network must be enabled for daemon communication
            # When using --unshare-net, the daemon cannot be reached from outside
            config = SandboxConfig(
                allow_network=True,  # Required for daemon communication
                cpu_quota=300,  # 5 minutes CPU time
                memory_limit=256
                * 1024,  # 512MB memory in KB (minimum for pandas-like libraries)
                max_idle_time=60,  # 1 minute idle time
                max_user_progress=10,  # Max 100 processes (increased for pandas/numpy)
                max_task_count=10,  # Max 10 tasks per sandbox
            )

            # Create a small pool (single instance for CLI)
            self.pool = AsyncSandboxPool(pool_size=1, config=config)

            # Start the pool (await the async method)
            await self.pool.start()

            # Create the executor
            self.executor = LambdaSandboxExecutor(pool=self.pool)

    async def execute(
        self,
        script_path: str,
        event_data: str = "{}",
        context_data: str = "{}",
        timeout: int = 300,
        verbose: bool = False,
    ):
        """
        Execute a Python script containing a handler function

        Args:
            script_path: Path to the Python script
            event_data: Event data as JSON string
            context_data: Context data as JSON string
            timeout: Execution timeout in seconds
            verbose: Enable verbose logging

        Returns:
            Execution result object
        """
        # Ensure executor is initialized
        await self._ensure_executor()

        # Read and validate the script
        script_path = Path(script_path)
        if not script_path.exists():
            raise SandboxError(f"Script file not found: {script_path}")

        if not script_path.suffix == ".py":
            raise SandboxError(f"Script must be a Python file (.py): {script_path}")

        try:
            with open(script_path, "r", encoding="utf-8") as f:
                handler_code = f.read()
        except Exception as e:
            raise SandboxError(f"Failed to read script file: {e}")

        # Validate handler code format
        if not handler_code.strip():
            raise SandboxError("Script file is empty")

        # Parse event and context data
        try:
            event = json.loads(event_data) if event_data else {}
        except json.JSONDecodeError as e:
            raise SandboxError(f"Invalid event JSON: {e}")

        try:
            context = json.loads(context_data) if context_data else {}
        except json.JSONDecodeError as e:
            raise SandboxError(f"Invalid context JSON: {e}")

        # Script path is not a valid LambdaContext parameter, skip it

        # Execute with timeout
        try:
            if verbose:
                self.logger.info(f"Executing script: {script_path}")
                self.logger.info(f"Event: {json.dumps(event, indent=2)}")
                self.logger.info(f"Context: {json.dumps(context, indent=2)}")

            result = await asyncio.wait_for(
                self.executor.invoke(
                    handler_code=handler_code, event=event, context_kwargs=context
                ),
                timeout=timeout,
            )

            if verbose:
                self.logger.info(
                    f"Execution completed in {result.metrics.duration_ms:.2f}ms"
                )
                self.logger.info(f"Memory peak: {result.metrics.memory_peak_mb:.2f}MB")

            return result

        except asyncio.TimeoutError:
            raise TimeoutError(f"Execution timed out after {timeout} seconds")
        except Exception as e:
            # Re-raise known sandbox errors
            if isinstance(e, SandboxError):
                raise
            # Wrap unknown errors
            raise SandboxError(f"Execution failed: {e}")

    async def cleanup(self):
        """Clean up resources"""
        if self.pool and self.pool.is_running:
            # Stop the pool (if it has a stop method)
            if hasattr(self.pool, "stop"):
                if asyncio.iscoroutinefunction(self.pool.stop):
                    await self.pool.stop()
                else:
                    self.pool.stop()
            # Cleanup the pool
            if hasattr(self.pool, "cleanup"):
                await self.pool.cleanup()
        self.executor = None
        self.pool = None
