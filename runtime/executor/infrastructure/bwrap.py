"""
Bubblewrap Execution Adapter

Implements secure code execution using Bubblewrap for process isolation.
"""

import subprocess
import tempfile
from pathlib import Path
from typing import List
import structlog

from executor.domain.entities import Execution
from executor.domain.value_objects import ExecutionResult, ExecutionStatus


logger = structlog.get_logger(__name__)


class BubblewrapRunner:
    """
    Executes code using Bubblewrap for process isolation.

    Provides the second layer of security isolation within the container,
    using Linux namespaces and seccomp filters.
    """

    def __init__(self, workspace_path: Path):
        """
        Initialize the Bubblewrap runner.

        Args:
            workspace_path: Path to the workspace directory
        """
        self.workspace_path = workspace_path
        self._base_args = self._build_base_args()

    def _build_base_args(self) -> List[str]:
        """
        Build base Bubblewrap arguments for isolation.

        Returns:
            List of bwrap command arguments
        """
        return [
            "bwrap",
            # Filesystem isolation
            "--ro-bind", "/usr", "/usr",
            "--ro-bind", "/lib", "/lib",
            "--ro-bind", "/lib64", "/lib64",
            "--ro-bind", "/bin", "/bin",
            "--ro-bind", "/sbin", "/sbin",
            # Workspace (writable)
            "--bind", str(self.workspace_path), "/workspace",
            "--chdir", "/workspace",
            # Temporary directory (tmpfs)
            "--tmpfs", "/tmp",
            # Minimal /proc and /dev
            "--proc", "/proc",
            "--dev", "/dev",
            # Namespace isolation
            "--unshare-all",
            "--unshare-net",  # Network isolation
            # Process management
            "--die-with-parent",
            "--new-session",
            # Environment
            "--clearenv",
            "--setenv", "PATH", "/usr/local/bin:/usr/bin:/bin",
            "--setenv", "HOME", "/workspace",
            "--setenv", "TMPDIR", "/tmp",
            # Security
            "--cap-drop", "ALL",
            "--no-new-privs",
        ]

    async def execute(self, execution: Execution) -> ExecutionResult:
        """
        Execute code within Bubblewrap isolation.

        Args:
            execution: Execution entity with code and context

        Returns:
            ExecutionResult with stdout, stderr, exit code, and timing
        """
        import time

        start_time = time.time()
        logger.info(
            "Executing code in bwrap",
            execution_id=execution.execution_id,
            language=execution.language,
        )

        try:
            # Build language-specific command
            cmd = self._build_command(execution)

            # Execute
            result = subprocess.run(
                cmd,
                input=execution.context.stdin,
                capture_output=True,
                text=True,
                timeout=None,  # Timeout handled by asyncio.wait_for
                cwd=str(self.workspace_path),
            )

            execution_time_ms = (time.time() - start_time) * 1000

            execution_result = ExecutionResult(
                status=ExecutionStatus.COMPLETED if result.returncode == 0 else ExecutionStatus.FAILED,
                stdout=result.stdout,
                stderr=result.stderr,
                exit_code=result.returncode,
                execution_time_ms=execution_time_ms,
            )

            logger.info(
                "Execution completed",
                execution_id=execution.execution_id,
                exit_code=result.returncode,
                duration_ms=execution_time_ms,
            )

            return execution_result

        except subprocess.TimeoutExpired as e:
            execution_time_ms = (time.time() - start_time) * 1000
            logger.warning("Bwrap execution timeout", execution_id=execution.execution_id)
            return ExecutionResult(
                status=ExecutionStatus.TIMEOUT,
                stdout=e.stdout if e.stdout else "",
                stderr=e.stderr if e.stderr else "Execution timeout",
                exit_code=-1,
                execution_time_ms=execution_time_ms,
            )

        except Exception as e:
            execution_time_ms = (time.time() - start_time) * 1000
            logger.error(
                "Bwrap execution error",
                execution_id=execution.execution_id,
                error=str(e),
            )
            return ExecutionResult(
                status=ExecutionStatus.FAILED,
                stdout="",
                stderr=str(e),
                exit_code=-1,
                execution_time_ms=execution_time_ms,
                error=str(e),
            )

    def _build_command(self, execution: Execution) -> List[str]:
        """
        Build the complete command for executing code.

        Args:
            execution: Execution entity

        Returns:
            Complete command list for subprocess
        """
        lang = execution.language.lower()

        if lang == "python":
            return self._build_python_command(execution)
        elif lang in ["javascript", "nodejs", "node"]:
            return self._build_node_command(execution)
        elif lang in ["bash", "shell"]:
            return self._build_shell_command(execution)
        else:
            raise ValueError(f"Unsupported language: {execution.language}")

    def _build_python_command(self, execution: Execution) -> List[str]:
        """Build command for Python execution."""
        # Write code to temporary file
        code_file = self.workspace_path / "user_code.py"
        code_file.write_text(execution.code)

        cmd = self._base_args + [
            "--ro-bind", str(code_file), "/workspace/user_code.py",
            "--",
            "python3",
            "/workspace/user_code.py",
        ]
        return cmd

    def _build_node_command(self, execution: Execution) -> List[str]:
        """Build command for Node.js execution."""
        # Write code to temporary file
        code_file = self.workspace_path / "user_code.js"
        code_file.write_text(execution.code)

        cmd = self._base_args + [
            "--ro-bind", str(code_file), "/workspace/user_code.js",
            "--",
            "node",
            "/workspace/user_code.js",
        ]
        return cmd

    def _build_shell_command(self, execution: Execution) -> List[str]:
        """Build command for shell execution."""
        cmd = self._base_args + [
            "--",
            "bash",
            "-c",
            execution.code,
        ]
        return cmd
