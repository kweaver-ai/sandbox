"""
执行 ORM 模型

SQLAlchemy 模型定义，用于数据库持久化。
"""
from datetime import datetime

from sqlalchemy import Column, String, Enum, DateTime, Integer, Text, JSON, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import func

from sandbox_control_plane.src.infrastructure.persistence.database import Base


class ExecutionModel(Base):
    """
    执行 ORM 模型

    这是基础设施层的实现细节，映射到数据库表。
    """
    __tablename__ = "executions"

    # Primary fields
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    session_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False
    )

    # Status
    status = Column(
        Enum(
            "pending",
            "running",
            "completed",
            "failed",
            "timeout",
            "crashed",
            name="execution_status",
        ),
        nullable=False,
        default="pending",
    )

    # Code and execution
    code = Column(Text, nullable=False)
    language = Column(String(32), nullable=False)
    entrypoint = Column(String(255), nullable=True)
    event_data = Column(JSON, nullable=True)
    timeout_sec = Column(Integer, nullable=False)

    # Results
    return_value = Column(JSON, nullable=True)
    stdout = Column(Text, nullable=True)
    stderr = Column(Text, nullable=True)
    exit_code = Column(Integer, nullable=True)
    metrics = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)

    # Timestamps
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )
    updated_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Indexes
    __table_args__ = (
        Index("ix_executions_session_id", "session_id"),
        Index("ix_executions_status", "status"),
    )

    def to_entity(self):
        """转换为领域实体"""
        from sandbox_control_plane.src.domain.entities.execution import Execution
        from sandbox_control_plane.src.domain.value_objects.execution_status import ExecutionStatus, ExecutionState

        return Execution(
            id=self.id,
            session_id=self.session_id,
            code=self.code,
            language=self.language,
            state=ExecutionState(
                status=ExecutionStatus(self.status),
                exit_code=self.exit_code,
                error_message=self.error_message,
            ),
            created_at=self.created_at,
            completed_at=self.completed_at,
            execution_time=None,  # Can be calculated from started_at/completed_at
            stdout=self.stdout or "",
            stderr=self.stderr or "",
            artifacts=[],  # Loaded separately if needed
            retry_count=0,  # Not in database schema
            last_heartbeat_at=None,  # Not in database schema
            return_value=self.return_value,
            metrics=self.metrics,
        )

    @classmethod
    def from_entity(cls, execution):
        """从领域实体创建 ORM 模型"""
        return cls(
            id=execution.id,
            session_id=execution.session_id,
            status=execution.state.status.value,
            code=execution.code,
            language=execution.language,
            entrypoint=None,  # Not in domain entity
            event_data=None,  # Not in domain entity
            timeout_sec=300,  # Default, not in domain entity
            return_value=execution.return_value,
            stdout=execution.stdout,
            stderr=execution.stderr,
            exit_code=execution.state.exit_code,
            metrics=execution.metrics,
            error_message=execution.state.error_message,
            started_at=None,  # Not tracked in domain entity
            completed_at=execution.completed_at,
            created_at=execution.created_at,
            updated_at=None,  # Not tracked in domain entity
        )
