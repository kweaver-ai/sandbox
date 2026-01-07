"""
执行 ORM 模型

SQLAlchemy 模型定义，用于数据库持久化。
"""
from datetime import datetime
from sqlalchemy import Column, String, Enum, DateTime, Integer, Text, JSON, Float
from sqlalchemy.orm import relationship

from sandbox_control_plane.src.infrastructure.persistence.models.session_model import Base


class ExecutionModel(Base):
    """
    执行 ORM 模型

    这是基础设施层的实现细节，映射到数据库表。
    """
    __tablename__ = "executions"

    id = Column(String(64), primary_key=True)
    session_id = Column(String(64), nullable=False, index=True)
    code = Column(Text, nullable=False)
    language = Column(String(16), nullable=False)
    status = Column(
        Enum("pending", "running", "completed", "failed", "timeout", "crashed"),
        nullable=False,
        index=True
    )
    stdout = Column(Text, nullable=True)
    stderr = Column(Text, nullable=True)
    exit_code = Column(Integer, nullable=True)
    execution_time = Column(Float, nullable=True)
    artifacts = Column(JSON)  # Artifact 对象数组
    retry_count = Column(Integer, default=0)
    last_heartbeat_at = Column(DateTime, nullable=True, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.now, index=True)
    completed_at = Column(DateTime, nullable=True)
    # 新增字段：handler 返回值和性能指标
    return_value = Column(JSON, nullable=True)  # handler 函数返回值（JSON 可序列化）
    metrics = Column(JSON, nullable=True)  # 性能指标（JSON 对象）

    def to_entity(self):
        """转换为领域实体"""
        from sandbox_control_plane.src.domain.entities.execution import Execution
        from sandbox_control_plane.src.domain.value_objects.execution_status import ExecutionStatus, ExecutionState
        from sandbox_control_plane.src.domain.value_objects.artifact import Artifact, ArtifactType

        return Execution(
            id=self.id,
            session_id=self.session_id,
            code=self.code,
            language=self.language,
            state=ExecutionState(
                status=ExecutionStatus(self.status),
                exit_code=self.exit_code,
            ),
            stdout=self.stdout or "",
            stderr=self.stderr or "",
            execution_time=self.execution_time,
            artifacts=[
                Artifact(
                    path=a["path"],
                    size=a["size"],
                    mime_type=a["mime_type"],
                    type=ArtifactType(a["type"]),
                    created_at=a["created_at"],
                    checksum=a.get("checksum"),
                )
                for a in (self.artifacts or [])
            ],
            retry_count=self.retry_count,
            last_heartbeat_at=self.last_heartbeat_at,
            created_at=self.created_at,
            completed_at=self.completed_at,
            return_value=self.return_value,  # handler 返回值
            metrics=self.metrics,  # 性能指标
        )

    @classmethod
    def from_entity(cls, execution):
        """从领域实体创建 ORM 模型"""
        return cls(
            id=execution.id,
            session_id=execution.session_id,
            code=execution.code,
            language=execution.language,
            status=execution.state.status.value,
            stdout=execution.stdout,
            stderr=execution.stderr,
            exit_code=execution.state.exit_code,
            execution_time=execution.execution_time,
            artifacts=[
                {
                    "path": a.path,
                    "size": a.size,
                    "mime_type": a.mime_type,
                    "type": a.type.value,
                    "created_at": a.created_at.isoformat(),
                    "checksum": a.checksum,
                }
                for a in execution.artifacts
            ],
            retry_count=execution.retry_count,
            last_heartbeat_at=execution.last_heartbeat_at,
            created_at=execution.created_at,
            completed_at=execution.completed_at,
            return_value=execution.return_value,  # handler 返回值
            metrics=execution.metrics,  # 性能指标
        )
