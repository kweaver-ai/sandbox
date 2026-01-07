"""
REST API Interface

FastAPI application serving as the HTTP interface for the executor.
Runs inside the container and receives execution requests from Control Plane.
"""

import os
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

import structlog
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, ValidationError

from executor.application.commands.execute_code import ExecuteCodeCommand
from executor.application.dto.execute_request import ExecuteRequestDTO
from executor.application.services.heartbeat_service import HeartbeatService
from executor.application.services.lifecycle_service import LifecycleService
from executor.domain.value_objects import (
    ExecutionRequest as DomainExecutionRequest,
    ExecutionResult,
    ExecutionStatus,
)
from executor.infrastructure.config import settings
from executor.infrastructure.http.callback_client import CallbackClient
from executor.infrastructure.isolation.bwrap import BubblewrapRunner
from executor.infrastructure.logging import configure_logging, get_logger
from executor.infrastructure.monitoring.metrics import MetricsCollector
from executor.infrastructure.persistence.artifact_scanner import ArtifactScanner


# Configure structured logging
configure_logging(settings.log_level)
logger = get_logger()


# Track executor startup time
startup_time = time.time()


# Request/Response Models
class ExecuteRequest(BaseModel):
    """Request model for code execution."""

    execution_id: str = Field(..., description="Unique execution identifier")
    session_id: str = Field(..., description="Session identifier")
    code: str = Field(..., description="Code to execute")
    language: str = Field(..., description="Programming language")
    stdin: str = Field(default="", description="Standard input")
    timeout: int = Field(default=300, description="Timeout in seconds", ge=1, le=3600)
    env_vars: dict = Field(default_factory=dict, description="Environment variables")


class ErrorResponse(BaseModel):
    """Error response model."""

    error_code: str
    description: str
    error_detail: Optional[str] = None
    solution: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = "healthy"
    version: str = "1.0.0"
    uptime_seconds: Optional[float] = None
    active_executions: Optional[int] = None


# Global service instances
_execute_command: Optional[ExecuteCodeCommand] = None
_heartbeat_service: Optional[HeartbeatService] = None
_lifecycle_service: Optional[LifecycleService] = None
_callback_client: Optional[CallbackClient] = None
_metrics_collector: Optional[MetricsCollector] = None


def get_execute_command() -> ExecuteCodeCommand:
    """Get the execute command instance."""
    if _execute_command is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Executor service not initialized",
        )
    return _execute_command


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.

    On startup:
    - Log startup
    - Verify bwrap availability
    - Verify workspace directory
    - Initialize services
    - Register signal handlers
    - Send container_ready

    On shutdown:
    - Log shutdown
    - Stop heartbeats
    - Send container_exited
    - Close connections
    """
    global _execute_command, _heartbeat_service, _lifecycle_service, _callback_client, _metrics_collector

    # Environment variables
    workspace_path = Path(os.environ.get("WORKSPACE_PATH", str(settings.workspace_path)))
    control_plane_url = os.environ.get("CONTROL_PLANE_URL", settings.control_plane_url)
    internal_api_token = os.environ.get("INTERNAL_API_TOKEN", settings.internal_api_token)
    container_id = os.environ.get("CONTAINER_ID", "unknown")
    pod_name = os.environ.get("POD_NAME", "unknown")
    executor_port = int(os.environ.get("EXECUTOR_PORT", str(settings.executor_port)))

    logger.info(
        "Executor starting",
        version="1.0.0",
        port=executor_port,
        workspace_path=str(workspace_path),
        control_plane_url=control_plane_url,
        container_id=container_id,
        pod_name=pod_name,
    )

    # T055 [US3]: Add bwrap availability check in startup
    try:
        from executor.infrastructure.isolation.bwrap import check_bwrap_available, get_bwrap_version

        check_bwrap_available()
        bwrap_version = get_bwrap_version()
        logger.info("Bubblewrap verified", version=bwrap_version)

    except RuntimeError as e:
        logger.error("Bubblewrap check failed", error=str(e))
        # For development, continue without bwrap
        # In production, this should exit with error
        logger.warning("Continuing without Bubblewrap (development mode)")

    # T056 [US3]: Add workspace availability check
    # Create workspace if it doesn't exist
    if not workspace_path.exists():
        logger.info("Creating workspace directory", workspace_path=str(workspace_path))
        workspace_path.mkdir(parents=True, exist_ok=True)

    # Check workspace is writable
    if not os.access(workspace_path, os.W_OK):
        logger.error("Workspace directory is not writable", workspace_path=str(workspace_path))
        # In production, this should exit with error
        logger.warning("Continuing with read-only workspace (development mode)")
    else:
        logger.info("Workspace directory verified", workspace_path=str(workspace_path))

    # Initialize infrastructure services
    bwrap_runner = BubblewrapRunner(workspace_path=workspace_path)
    artifact_scanner = ArtifactScanner(workspace_path=workspace_path)
    metrics_collector = MetricsCollector()

    # Initialize callback client
    callback_client = CallbackClient(
        base_url=control_plane_url,
        internal_api_token=internal_api_token,
    )
    _callback_client = callback_client

    # Initialize application services
    heartbeat_service = HeartbeatService(
        callback_port=callback_client,
        interval=5.0,
    )
    _heartbeat_service = heartbeat_service

    lifecycle_service = LifecycleService(
        callback_port=callback_client,
        container_id=container_id,
        pod_name=pod_name,
        executor_port=executor_port,
        heartbeat_port=heartbeat_service,
    )
    _lifecycle_service = lifecycle_service

    # Register signal handlers
    import signal

    def signal_handler(signum, frame):
        logger.info("Signal received", signal=signum)
        # Create asyncio task to handle shutdown
        import asyncio

        try:
            loop = asyncio.get_running_loop()
            loop.create_task(lifecycle_service.shutdown(signum))
        except RuntimeError:
            # No event loop running
            asyncio.run(lifecycle_service.shutdown(signum))

    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)
    logger.info("Signal handlers registered")

    # Initialize execute command
    execute_command = ExecuteCodeCommand(
        isolation_port=bwrap_runner,
        artifact_scanner_port=artifact_scanner,
        callback_port=callback_client,
        heartbeat_port=heartbeat_service,
        workspace_path=workspace_path,
        control_plane_url=control_plane_url,
    )
    _execute_command = execute_command

    logger.info("Executor startup complete")

    # T076 [US5]: Send container_ready after HTTP server starts listening
    try:
        await lifecycle_service.send_container_ready()
        logger.info("Container ready signal sent")
    except Exception as e:
        logger.error("Failed to send container_ready", error=str(e))

    yield

    # Shutdown
    logger.info("Executor shutting down")

    # Stop all heartbeats
    await heartbeat_service.stop_all()

    # Send container_exited
    try:
        await lifecycle_service.shutdown()
        logger.info("Container exited signal sent")
    except Exception as e:
        logger.error("Failed to send container_exited", error=str(e))

    # Close callback client
    await callback_client.close()

    logger.info("Executor shutdown complete")


def create_app() -> FastAPI:
    """
    Create and configure the FastAPI application.

    Returns:
        Configured FastAPI application instance
    """
    app = FastAPI(
        title="Sandbox Executor API",
        description="HTTP API for executing code in secure sandbox environments",
        version="1.0.0",
        lifespan=lifespan,
    )

    # Exception handlers
    @app.exception_handler(ValidationError)
    async def validation_exception_handler(request: Request, exc: ValidationError):
        """Handle Pydantic validation errors."""
        logger.warning(
            "Request validation failed",
            errors=exc.errors(),
            path=request.url.path,
        )
        error_response = ErrorResponse(
            error_code="Executor.ValidationError",
            description="Request validation failed",
            error_detail=str(exc.errors()),
            solution="Check request format and required fields",
        )
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=error_response.model_dump(),
        )

    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError):
        """Handle ValueError exceptions."""
        logger.warning("Value error", error=str(exc), path=request.url.path)
        error_response = ErrorResponse(
            error_code="Executor.ValidationError",
            description="Invalid value provided",
            error_detail=str(exc),
            solution="Check request parameters",
        )
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=error_response.model_dump(),
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """Handle unexpected exceptions."""
        logger.error(
            "Unexpected error",
            error=str(exc),
            error_type=type(exc).__name__,
            path=request.url.path,
        )
        error_response = ErrorResponse(
            error_code="Executor.InternalError",
            description="Executor encountered an unexpected error",
            error_detail=str(exc),
            solution="Check executor logs for details",
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=error_response.model_dump(),
        )

    @app.get(
        "/",
        include_in_schema=False,
    )
    async def root():
        """Root endpoint with API information."""
        return {
            "service": "sandbox-executor",
            "version": "1.0.0",
            "docs": "/docs",
            "health": "/health",
            "execute": "/execute",
        }

    @app.get(
        "/health",
        response_model=HealthResponse,
        responses={
            200: {"description": "Executor is healthy"},
            503: {"model": ErrorResponse, "description": "Executor is unhealthy"},
        },
        summary="Health check",
        description="Returns executor health status for readiness probes and load balancers",
        tags=["health"],
    )
    async def health_check():
        """
        Health check endpoint for container readiness probes.

        Returns:
            - status: "healthy" if all checks pass, "unhealthy" otherwise
            - version: Executor version
            - uptime_seconds: Time since executor started
            - active_executions: Number of currently active executions

        ## Health checks:
        - HTTP API is listening
        - Workspace directory is accessible
        - Bubblewrap binary is available
        """
        try:
            # Calculate uptime
            uptime = time.time() - startup_time

            # Get active execution count
            active_count = _execute_command.get_active_count() if _execute_command else 0

            # Check bwrap availability
            from executor.infrastructure.isolation.bwrap import check_bwrap_available

            try:
                check_bwrap_available()
            except RuntimeError:
                logger.warning("Health check failed: bwrap not available")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail={
                        "status": "unhealthy",
                        "reason": "Bubblewrap binary not found",
                    },
                )

            # Check workspace availability
            workspace_path = Path(os.environ.get("WORKSPACE_PATH", str(settings.workspace_path)))
            workspace_accessible = workspace_path.exists() and os.access(workspace_path, os.W_OK)

            if not workspace_accessible:
                logger.warning("Health check failed: workspace not accessible")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail={
                        "status": "unhealthy",
                        "reason": f"Workspace directory {workspace_path} is not accessible",
                    },
                )

            return HealthResponse(
                status="healthy",
                version="1.0.0",
                uptime_seconds=uptime,
                active_executions=active_count,
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error("Health check failed", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={
                    "status": "unhealthy",
                    "reason": f"Health check failed: {str(e)}",
                },
            )

    @app.post(
        "/execute",
        response_model=dict,
        responses={
            200: {"description": "Execution completed"},
            400: {"model": ErrorResponse, "description": "Invalid request"},
            500: {"model": ErrorResponse, "description": "Internal error"},
            503: {"model": ErrorResponse, "description": "Executor queue full"},
        },
        summary="Execute code in sandbox",
        description="Executes code in a sandboxed environment and returns the result",
        tags=["execution"],
    )
    async def execute_endpoint(request: ExecuteRequest, http_request: Request) -> dict:
        """
        Execute code in a sandboxed environment.

        - Accepts ExecutionRequest with code, language, timeout, and stdin
        - Executes code in isolation (with or without Bubblewrap)
        - Returns ExecutionResult with status, output, metrics, and artifacts
        - Supports Python Lambda handlers, JavaScript, and Shell scripts

        ## Validation
        - code size ≤ 1MB
        - timeout between 1-3600 seconds
        - language in {python, javascript, shell}
        - execution_id pattern: exec_[0-9]{8}_[a-z0-9]{8}
        """
        logger.info(
            "Execution request received",
            execution_id=request.execution_id,
            language=request.language,
            timeout=request.timeout,
            code_length=len(request.code),
        )

        command = get_execute_command()

        # Convert to domain request
        domain_request = DomainExecutionRequest(
            execution_id=request.execution_id,
            session_id=request.session_id,
            code=request.code,
            language=request.language,
            stdin=request.stdin,
            timeout=request.timeout,
            env_vars=request.env_vars,
        )

        # Execute
        result = await command.execute(domain_request)

        return {
            "execution_id": request.execution_id,
            "status": result.status.value,
            "message": "Execution completed",
        }

    return app


# Create app instance for import
app = create_app()


# CLI entry point
def main():
    """Main entry point for running the executor."""
    import uvicorn

    port = int(os.environ.get("EXECUTOR_PORT", str(settings.executor_port)))
    host = os.environ.get("EXECUTOR_HOST", "0.0.0.0")

    uvicorn.run(
        "executor.interfaces.http.rest:app",
        host=host,
        port=port,
        log_level=settings.log_level.lower(),
        reload=False,
    )


if __name__ == "__main__":
    main()
