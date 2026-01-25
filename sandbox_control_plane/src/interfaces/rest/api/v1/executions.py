"""
执行 REST API 路由

定义执行相关的 HTTP 端点。
"""
import fastapi
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional

from src.application.services.session_service import SessionService
from src.application.commands.execute_code import ExecuteCodeCommand
from src.application.queries.get_execution import GetExecutionQuery
from src.application.dtos.execution_dto import ExecutionDTO
from src.interfaces.rest.schemas.request import ExecuteCodeRequest
from src.interfaces.rest.schemas.response import (
    ExecutionResponse,
    ExecuteCodeResponse,
    ErrorResponse
)
from src.infrastructure.dependencies import (
    USE_SQL_REPOSITORIES,
    get_session_service_db,
    get_session_service as get_mock_session_service,
)

router = APIRouter(prefix="/executions", tags=["executions"])


# 根据模式选择依赖注入函数
# SQL 模式：使用 get_session_service_db（带 Depends() 注入仓储）
# Mock 模式：使用 get_mock_session_service（从 app.state 获取）
_get_session_service = get_session_service_db if USE_SQL_REPOSITORIES else get_mock_session_service


@router.post("/sessions/{session_id}/execute", response_model=ExecuteCodeResponse, status_code=status.HTTP_201_CREATED)
async def submit_execution(
    session_id: str,
    request: ExecuteCodeRequest,
    service: SessionService = Depends(_get_session_service)
):
    """
    提交代码执行

    - **code**: 要执行的代码
    - **language**: 编程语言 (python, javascript, shell)
    - **timeout**: 超时时间（秒），默认 30
    - **event**: 事件数据
    """
    command = ExecuteCodeCommand(
        session_id=session_id,
        code=request.code,
        language=request.language,
        timeout=request.timeout,
        event_data=request.event
    )

    execution_dto = await service.execute_code(command)

    return ExecuteCodeResponse(
        execution_id=execution_dto.id,
        session_id=execution_dto.session_id,
        status=execution_dto.status,
        created_at=execution_dto.created_at
    )


@router.get("/{execution_id}/status", response_model=ExecutionResponse)
async def get_execution_status(
    execution_id: str,
    service: SessionService = Depends(_get_session_service)
):
    """获取执行状态"""
    query = GetExecutionQuery(execution_id=execution_id)
    execution_dto = await service.get_execution(query)
    return _map_dto_to_response(execution_dto)


@router.get("/{execution_id}/result", response_model=ExecutionResponse)
async def get_execution_result(
    execution_id: str,
    service: SessionService = Depends(_get_session_service)
):
    """获取执行结果"""
    query = GetExecutionQuery(execution_id=execution_id)
    execution_dto = await service.get_execution(query)
    return _map_dto_to_response(execution_dto)


@router.get("/sessions/{session_id}/executions")
async def list_executions(
    session_id: str,
    limit: int = 50,
    offset: int = 0,
    service: SessionService = Depends(_get_session_service)
):
    """列出会话的所有执行"""
    executions = await service.list_executions(session_id=session_id, limit=limit)

    return {
        "items": executions,
        "total": len(executions),
        "limit": limit,
        "offset": offset
    }


def _map_dto_to_response(dto: ExecutionDTO) -> ExecutionResponse:
    """将 ExecutionDTO 映射为 ExecutionResponse"""
    return ExecutionResponse(
        id=dto.id,
        session_id=dto.session_id,
        status=dto.status,
        code=dto.code,
        language=dto.language,
        timeout=dto.timeout,
        stdout=dto.stdout,
        stderr=dto.stderr,
        exit_code=dto.exit_code,
        return_value=dto.return_value,
        metrics=dto.metrics,
        created_at=dto.created_at,
        started_at=dto.started_at,
        completed_at=dto.completed_at
    )
