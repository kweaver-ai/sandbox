"""
REST API Interface

FastAPI application serving as the HTTP interface for the executor.
Runs inside the container and receives execution requests from Control Plane.
"""

import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional
import structlog
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field

from executor.application.services import ExecutorService
from executor.domain.entities import Execution
from executor.domain.value_objects import (
    ExecutionContext,
    ExecutionResult,
    ResourceLimit,
)
from executor.infrastructure.bwrap import BubblewrapRunner
from executor.infrastructure.result_reporter import ResultReporter


# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer(),
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)


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


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = "healthy"
    version: str = "1.0.0"


# Global service instances
_executor_service: Optional[ExecutorService] = None


def get_executor_service() -> ExecutorService:
    """Get the executor service instance."""
    if _executor_service is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Executor service not initialized",
        )
    return _executor_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.

    Initializes services on startup and cleanup on shutdown.
    """
    global _executor_service

    # Environment variables
    workspace_path = Path(os.environ.get("WORKSPACE_PATH", "/workspace"))
    control_plane_url = os.environ.get("CONTROL_PLANE_URL", "http://localhost:8000")
    internal_api_token = os.environ.get("INTERNAL_API_TOKEN")

    logger.info(
        "Starting executor",
        workspace_path=str(workspace_path),
        control_plane_url=control_plane_url,
    )

    # Initialize services
    bwrap_runner = BubblewrapRunner(workspace_path=workspace_path)
    result_reporter = ResultReporter(
        control_plane_url=control_plane_url,
        internal_api_token=internal_api_token,
    )
    _executor_service = ExecutorService(
        bwrap_runner=bwrap_runner,
        result_reporter=result_reporter,
    )

    logger.info("Executor service initialized")

    yield

    # Cleanup
    logger.info("Shutting down executor")
    await result_reporter.close()


def create_app() -> FastAPI:
    """
    Create and configure the FastAPI application.

    Returns:
        Configured FastAPI application instance
    """
    app = FastAPI(
        title="Sandbox Executor",
        description="Code execution daemon with Bubblewrap isolation",
        version="1.0.0",
        lifespan=lifespan,
    )

    @app.get("/health", response_model=HealthResponse, tags=["health"])
    async def health_check():
        """
        Health check endpoint.

        Used by Control Plane to verify the executor is running.
        """
        return HealthResponse()

    @app.post("/execute", tags=["execution"])
    async def execute_code(request: ExecuteRequest):
        """
        Execute code within the sandbox.

        This is the main endpoint called by the Control Plane to execute code.
        """
        logger.info(
            "Received execution request",
            execution_id=request.execution_id,
            language=request.language,
        )

        service = get_executor_service()

        # Build execution context
        context = ExecutionContext(
            workspace_path=Path(os.environ.get("WORKSPACE_PATH", "/workspace")),
            session_id=request.session_id,
            execution_id=request.execution_id,
            control_plane_url=os.environ.get("CONTROL_PLANE_URL"),
            env_vars=request.env_vars,
            stdin=request.stdin,
        )

        # Create execution entity
        execution = Execution(
            execution_id=request.execution_id,
            session_id=request.session_id,
            code=request.code,
            language=request.language,
            context=context,
        )

        # Execute (async, result reported via callback)
        result = await service.execute(execution)

        return {
            "execution_id": request.execution_id,
            "status": result.status.value,
            "message": "Execution completed",
        }

    @app.exception_handler(Exception)
    async def global_exception_handler(request, exc):
        """Global exception handler."""
        logger.error("Unhandled exception", error=str(exc), exc_info=True)
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )

    return app


# CLI entry point
def main():
    """Main entry point for running the executor."""
    import uvicorn

    port = int(os.environ.get("EXECUTOR_PORT", "8080"))
    host = os.environ.get("EXECUTOR_HOST", "0.0.0.0")

    uvicorn.run(
        "executor.interfaces.rest:app",
        host=host,
        port=port,
        log_level="info",
        reload=False,
    )


# Create app instance for import
app = create_app()


if __name__ == "__main__":
    main()
