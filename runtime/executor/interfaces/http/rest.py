"""
REST API Interface

FastAPI application serving as the HTTP interface for the executor.
Runs inside the container and receives execution requests from Control Plane.
"""

import os
import platform
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
    """Request model for code execution following AWS Lambda handler specification."""

    execution_id: str = Field(..., description="Unique execution identifier", example="exec_20240115_test0001")
    session_id: str = Field(..., description="Session identifier", example="sess_test_001")
    code: str = Field(
        ...,
        description="AWS Lambda handler function code",
        example='def handler(event):\n    name = event.get("name", "World")\n    return {"message": f"Hello, {name}!"}'
    )
    language: str = Field(..., description="Programming language", pattern="^(python|javascript|shell)$", example="python")
    event: dict = Field(
        default_factory=dict,
        description="Business data passed to handler function",
        example={"name": "World"}
    )
    timeout: int = Field(default=300, description="Timeout in seconds", ge=1, le=3600, example=10)
    env_vars: dict = Field(default_factory=dict, description="Environment variables", example={})

    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "execution_id": "exec_20240115_test0001",
                    "session_id": "sess_test_001",
                    "code": 'def handler(event):\n    name = event.get("name", "World")\n    return {"message": f"Hello, {name}!"}',
                    "language": "python",
                    "event": {"name": "World"},
                    "timeout": 10,
                    "env_vars": {}
                },
                {
                    "execution_id": "exec_20240115_abc12345",
                    "session_id": "sess_abc123def4567890",
                    "code": 'def handler(event):\n    name = event.get("name", "World")\n    age = event.get("age", 0)\n    return {"message": f"Hello, {name}!", "age_doubled": age * 2}',
                    "language": "python",
                    "event": {"name": "Alice", "age": 25},
                    "timeout": 30,
                    "env_vars": {}
                }
            ]
        }


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
    - Send container_ready

    On shutdown:
    - Log shutdown
    - Stop heartbeats
    - Send container_exited
    - Close connections

    Note: Uvicorn handles SIGINT/SIGTERM and triggers this shutdown automatically.
    """
    global _execute_command, _heartbeat_service, _lifecycle_service, _callback_client, _metrics_collector

    # Environment variables
    workspace_path = Path(os.environ.get("WORKSPACE_PATH", str(settings.workspace_path)))
    control_plane_url = os.environ.get("CONTROL_PLANE_URL", settings.control_plane_url)
    internal_api_token = os.environ.get("INTERNAL_API_TOKEN", settings.internal_api_token)
    container_id = os.environ.get("CONTAINER_ID", "unknown")
    pod_name = os.environ.get("POD_NAME", "unknown")
    executor_port = int(os.environ.get("EXECUTOR_PORT", str(settings.executor_port)))

    # Detect operating system
    is_macos = platform.system() == "Darwin"
    is_linux = platform.system() == "Linux"

    logger.info(
        "Executor starting",
        version="1.0.0",
        port=executor_port,
        workspace_path=str(workspace_path),
        control_plane_url=control_plane_url,
        container_id=container_id,
        pod_name=pod_name,
        platform=platform.system(),
        is_development_mode=is_macos,  # macOS is considered development mode
    )

    # T055 [US3]: Add bwrap availability check in startup
    # Only check Bubblewrap on Linux (not available on macOS)
    if is_linux:
        try:
            from executor.infrastructure.isolation.bwrap import check_bwrap_available, get_bwrap_version

            check_bwrap_available()
            bwrap_version = get_bwrap_version()
            logger.info("Bubblewrap verified", version=bwrap_version)

        except RuntimeError as e:
            logger.error("Bubblewrap check failed", error=str(e))
            # In production on Linux, this should exit with error
            logger.warning("Continuing without Bubblewrap (development mode)")
    else:
        logger.info("Skipping Bubblewrap check on macOS (Bubblewrap is Linux-only)")
        logger.warning("Code execution features will be limited on macOS")

    # T056 [US3]: Add workspace availability check
    # Create workspace if it doesn't exist
    if not workspace_path.exists():
        try:
            logger.info("Creating workspace directory", workspace_path=str(workspace_path))
            workspace_path.mkdir(parents=True, exist_ok=True)
        except OSError as e:
            logger.warning("Failed to create workspace directory", workspace_path=str(workspace_path), error=str(e))
            logger.warning("Continuing without workspace (development mode)")
    else:
        # Check workspace is writable
        if not os.access(workspace_path, os.W_OK):
            logger.warning("Workspace directory is not writable", workspace_path=str(workspace_path))
            logger.warning("Continuing with read-only workspace (development mode)")
        else:
            logger.info("Workspace directory verified", workspace_path=str(workspace_path))

    # Initialize infrastructure services
    # Linux uses Bubblewrap, macOS uses Seatbelt sandbox
    if is_linux:
        try:
            bwrap_runner = BubblewrapRunner(workspace_path=workspace_path)
            logger.info("Using BubblewrapRunner for Linux isolation")
        except Exception as e:
            logger.warning("Failed to initialize BubblewrapRunner", error=str(e))
            bwrap_runner = None
    else:
        # macOS: Use Seatbelt sandbox (sandbox-exec)
        try:
            from executor.infrastructure.isolation.macseatbelt import MacSeatbeltRunner
            bwrap_runner = MacSeatbeltRunner(workspace_path=workspace_path)
            logger.info("Using MacSeatbeltRunner with sandbox-exec", sandbox_version=bwrap_runner.get_version())
        except Exception as e:
            logger.error("Failed to initialize MacSeatbeltRunner", error=str(e))
            bwrap_runner = None

    # ArtifactScanner doesn't need workspace_path in constructor
    artifact_scanner = ArtifactScanner()

    metrics_collector = MetricsCollector()

    # Initialize callback client
    callback_client = CallbackClient(
        control_plane_url=control_plane_url,
        api_token=internal_api_token,
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
        executor_port=executor_port,
        heartbeat_port=heartbeat_service,
    )
    _lifecycle_service = lifecycle_service

    # Register signal handlers
    # Note: Uvicorn handles SIGINT/SIGTERM by default and will trigger lifespan shutdown
    # We don't need custom signal handlers - let Uvicorn handle it
    logger.info("Signal handlers will be managed by Uvicorn")

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
    # Use asyncio.wait_for to avoid long timeout in development mode
    import asyncio
    try:
        # Timeout after 2 seconds if control plane is not available
        await asyncio.wait_for(lifecycle_service.send_container_ready(), timeout=2.0)
        logger.info("Container ready signal sent")
    except asyncio.TimeoutError:
        logger.warning("Container ready signal timeout (control plane not available - development mode)")
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
        - Isolation mechanism is available:
          - Linux: Bubblewrap binary
          - macOS: sandbox-exec binary (Seatbelt)
        """
        try:
            # Calculate uptime
            uptime = time.time() - startup_time

            # Get active execution count
            active_count = _execute_command.get_active_count() if _execute_command else 0

            # Check isolation availability based on platform
            is_macos = platform.system() == "Darwin"
            if is_macos:
                # macOS: Check sandbox-exec availability
                from executor.infrastructure.isolation.macseatbelt import check_sandbox_available
                try:
                    check_sandbox_available()
                except RuntimeError:
                    logger.warning("Health check failed: sandbox-exec not available")
                    raise HTTPException(
                        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                        detail={
                            "status": "unhealthy",
                            "reason": "sandbox-exec binary not found",
                        },
                    )
            else:
                # Linux: Check bwrap availability
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

            # Check workspace availability (only on Linux)
            is_macos = platform.system() == "Darwin"
            if not is_macos:
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
            else:
                logger.debug("Skipping workspace health check on macOS")

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

        - Accepts ExecutionRequest with code, language, timeout, and event
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
            event_keys=list(request.event.keys()) if request.event else [],
        )

        command = get_execute_command()

        # Convert to domain request
        domain_request = DomainExecutionRequest(
            execution_id=request.execution_id,
            session_id=request.session_id,
            code=request.code,
            language=request.language,
            event=request.event,
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
