"""
Application Services

Orchestrates domain objects to execute use cases.
"""

import asyncio
import subprocess
import tempfile
from pathlib import Path
from typing import Optional
import structlog

from executor.domain.entities import Execution
from executor.domain.value_objects import ExecutionResult, ExecutionStatus
from executor.domain.services import ArtifactCollector
from executor.infrastructure.isolation.bwrap import BubblewrapRunner
from executor.infrastructure.result_reporter import ResultReporter


logger = structlog.get_logger(__name__)


class ExecutorService:
    """
    Main service for executing code in the sandbox.

    This service orchestrates the execution flow:
    1. Prepare execution environment
    2. Execute code via Bubblewrap
    3. Collect artifacts
    4. Report results to Control Plane
    """

    def __init__(
        self,
        bwrap_runner: BubblewrapRunner,
        result_reporter: ResultReporter,
    ):
        """
        Initialize the executor service.

        Args:
            bwrap_runner: Bubblewrap execution runner
            result_reporter: Result reporter for Control Plane callbacks
        """
        self._bwrap_runner = bwrap_runner
        self._result_reporter = result_reporter

    async def execute(self, execution: Execution) -> ExecutionResult:
        """
        Execute code within the sandbox.

        Args:
            execution: Execution entity with code and context

        Returns:
            ExecutionResult with stdout, stderr, exit code, and artifacts
        """
        logger.info(
            "Starting execution",
            execution_id=execution.execution_id,
            language=execution.language,
        )

        # Mark execution as running
        execution.mark_as_running()

        # Create snapshot before execution
        workspace_path = execution.context.workspace_path
        artifact_collector = ArtifactCollector(
            workspace_path=workspace_path,
            base_snapshot=artifact_collector.snapshot() if execution.retry_count == 0 else None,
        )

        try:
            # Execute code with timeout
            result = await self._execute_with_timeout(
                execution=execution,
                timeout_seconds=execution.context.resource_limit.timeout_seconds,
            )

            # Collect artifacts
            artifacts = artifact_collector.collect_artifacts()
            result.artifacts = artifacts

            # Mark as completed
            execution.mark_as_completed(result)

            # Report result to Control Plane
            await self._report_result(execution, result)

            return result

        except asyncio.TimeoutError:
            logger.warning("Execution timeout", execution_id=execution.execution_id)
            execution.mark_as_timeout()
            timeout_result = ExecutionResult(
                status=ExecutionStatus.TIMEOUT,
                stdout="",
                stderr=f"Execution timeout after {execution.context.resource_limit.timeout_seconds}s",
                exit_code=-1,
                execution_time_ms=execution.context.resource_limit.timeout_seconds * 1000,
            )
            await self._report_result(execution, timeout_result)
            return timeout_result

        except Exception as e:
            logger.error(
                "Execution failed",
                execution_id=execution.execution_id,
                error=str(e),
            )
            execution.mark_as_failed(str(e))
            failed_result = ExecutionResult(
                status=ExecutionStatus.FAILED,
                stdout="",
                stderr=str(e),
                exit_code=-1,
                execution_time_ms=0,
                error=str(e),
            )
            await self._report_result(execution, failed_result)
            return failed_result

    async def _execute_with_timeout(
        self, execution: Execution, timeout_seconds: int
    ) -> ExecutionResult:
        """
        Execute code with timeout enforcement.

        Args:
            execution: Execution entity
            timeout_seconds: Timeout in seconds

        Returns:
            ExecutionResult

        Raises:
            asyncio.TimeoutError: If execution exceeds timeout
        """
        return await asyncio.wait_for(
            self._bwrap_runner.execute(execution),
            timeout=timeout_seconds,
        )

    async def _report_result(
        self, execution: Execution, result: ExecutionResult
    ) -> None:
        """
        Report execution result to Control Plane.

        Args:
            execution: Execution entity
            result: Execution result
        """
        try:
            await self._result_reporter.report(execution.execution_id, result)
            logger.info(
                "Result reported successfully",
                execution_id=execution.execution_id,
            )
        except Exception as e:
            logger.error(
                "Failed to report result",
                execution_id=execution.execution_id,
                error=str(e),
            )
