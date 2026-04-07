"""
执行 REST API 映射单元测试

覆盖 ExecutionDTO -> ExecutionResponse 的关键字段映射。
"""
from datetime import datetime

from src.application.dtos.execution_dto import ArtifactDTO, ExecutionDTO
from src.interfaces.rest.api.v1.executions import _map_dto_to_response


class TestExecutionsAPI:
    """执行接口映射测试"""

    def test_map_dto_to_response_includes_runtime_fields(self):
        """确保 error_message/execution_time/artifacts/retry_count 被正确返回"""
        now = datetime.now()
        dto = ExecutionDTO(
            id="exec-123",
            session_id="sess-456",
            code="print('hello')",
            language="python",
            timeout=30,
            status="completed",
            exit_code=0,
            error_message="",
            execution_time=1.25,
            stdout="hello\n",
            stderr="",
            artifacts=[
                ArtifactDTO(
                    path="output/result.txt",
                    size=12,
                    mime_type="text/plain",
                    type="output",
                    created_at=now,
                    checksum="abc123",
                )
            ],
            retry_count=2,
            created_at=now,
            completed_at=now,
            return_value={"ok": True},
            metrics={"duration_ms": 1250},
        )

        resp = _map_dto_to_response(dto)

        assert resp.error_message == ""
        assert resp.execution_time == 1.25
        assert resp.retry_count == 2
        assert len(resp.artifacts) == 1
        assert resp.artifacts[0].path == "output/result.txt"
        assert resp.artifacts[0].mime_type == "text/plain"
        assert resp.artifacts[0].checksum == "abc123"
