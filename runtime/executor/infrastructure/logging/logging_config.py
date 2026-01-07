"""
Structured logging configuration for sandbox-executor.

Configures structlog for JSON logging with request tracing and execution context.
"""

import structlog
import logging
import sys
from typing import Any


def configure_logging(log_level: str = "INFO") -> None:
    """
    Configure structlog for JSON logging.

    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR)
    """
    # Configure standard logging to use structlog
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, log_level.upper(), logging.INFO),
    )

    # Configure structlog
    structlog.configure(
        processors=[
            structlog.stdlib.add_log_level,
            structlog.stdlib.add_logger_name,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer()
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(execution_id: str = None, container_id: str = None) -> structlog.stdlib.BoundLogger:
    """
    Get a logger instance with optional context.

    Args:
        execution_id: Execution identifier for tracing
        container_id: Container identifier for tracing

    Returns:
        Configured logger instance
    """
    context: dict[str, Any] = {}
    if execution_id:
        context["execution_id"] = execution_id
    if container_id:
        context["container_id"] = container_id

    return structlog.get_logger(**context)
