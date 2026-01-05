"""
Execution Value Objects

Immutable value objects for execution-related concepts.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from pathlib import Path


class ExecutionStatus(str, Enum):
    """Status of a code execution."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"
    CRASHED = "crashed"


class ArtifactType(str, Enum):
    """Type of artifact generated during execution."""

    OUTPUT = "output"
    LOG = "log"
    ARTIFACT = "artifact"
    TEMP = "temp"


@dataclass(frozen=True)
class Artifact:
    """
    Represents a file generated during execution.

    Attributes:
        path: Relative path from workspace root
        size: File size in bytes
        mime_type: MIME type of the file
        type: Category of artifact
        created_at: Timestamp when file was created
        checksum: Optional SHA256 checksum
    """

    path: str
    size: int
    mime_type: str
    type: ArtifactType
    created_at: datetime
    checksum: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "path": self.path,
            "size": self.size,
            "mime_type": self.mime_type,
            "type": self.type.value,
            "created_at": self.created_at.isoformat(),
            "checksum": self.checksum,
        }


@dataclass(frozen=True)
class ResourceLimit:
    """
    Resource limits for execution.

    Attributes:
        timeout_seconds: Maximum execution time in seconds
        max_memory_mb: Maximum memory in megabytes
        max_processes: Maximum number of processes
        max_file_size_mb: Maximum file size in megabytes
    """

    timeout_seconds: int = 300
    max_memory_mb: int = 512
    max_processes: int = 128
    max_file_size_mb: int = 100

    def validate(self) -> None:
        """Validate resource limits."""
        if self.timeout_seconds <= 0:
            raise ValueError("timeout_seconds must be positive")
        if self.timeout_seconds > 3600:
            raise ValueError("timeout_seconds cannot exceed 3600 (1 hour)")
        if self.max_memory_mb <= 0:
            raise ValueError("max_memory_mb must be positive")


@dataclass
class ExecutionResult:
    """
    Result of a code execution.

    Attributes:
        status: Final execution status
        stdout: Standard output from execution
        stderr: Standard error from execution
        exit_code: Process exit code
        execution_time_ms: Execution duration in milliseconds
        artifacts: List of generated files
        error: Optional error message if failed
    """

    status: ExecutionStatus
    stdout: str
    stderr: str
    exit_code: int
    execution_time_ms: float
    artifacts: List[Artifact] = field(default_factory=list)
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "status": self.status.value,
            "stdout": self.stdout,
            "stderr": self.stderr,
            "exit_code": self.exit_code,
            "execution_time_ms": self.execution_time_ms,
            "artifacts": [a.to_dict() for a in self.artifacts],
            "error": self.error,
        }


@dataclass(frozen=True)
class ExecutionContext:
    """
    Context information for an execution.

    Attributes:
        workspace_path: Path to workspace directory
        session_id: Session identifier
        execution_id: Execution identifier
        control_plane_url: URL of control plane for callbacks
        env_vars: Environment variables to inject
        stdin: Standard input for the execution
    """

    workspace_path: Path
    session_id: str
    execution_id: str
    control_plane_url: str
    env_vars: Dict[str, str] = field(default_factory=dict)
    stdin: str = ""
