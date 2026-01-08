"""
执行 REST API 路由

定义执行相关的 HTTP 端点。
"""
import fastapi
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional

from sandbox_control_plane.src.application.services.session_service import SessionService
from sandbox_control_plane.src.application.commands.execute_code import ExecuteCodeCommand
from sandbox_control_plane.src.application.queries.get_execution import GetExecutionQuery
from sandbox_control_plane.src.application.dtos.execution_dto import ExecutionDTO
from sandbox_control_plane.src.interfaces.rest.schemas.request import ExecuteCodeRequest
from sandbox_control_plane.src.interfaces.rest.schemas.response import (
    ExecutionResponse,
    ExecuteCodeResponse,
    ErrorResponse
)
from sandbox_control_plane.src.infrastructure.dependencies import (
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
    try:
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

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{execution_id}/status", response_model=ExecutionResponse)
async def get_execution_status(
    execution_id: str,
    service: SessionService = Depends(_get_session_service)
):
    """获取执行状态"""
    try:
        query = GetExecutionQuery(execution_id=execution_id)
        execution_dto = await service.get_execution(query)

        return ExecutionResponse(
            id=execution_dto.id,
            session_id=execution_dto.session_id,
            status=execution_dto.status,
            code=execution_dto.code,
            language=execution_dto.language,
            timeout=execution_dto.timeout,
            created_at=execution_dto.created_at,
            started_at=execution_dto.started_at,
            completed_at=execution_dto.completed_at
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/{execution_id}/result", response_model=ExecutionResponse)
async def get_execution_result(
    execution_id: str,
    service: SessionService = Depends(_get_session_service)
):
    """获取执行结果"""
    try:
        query = GetExecutionQuery(execution_id=execution_id)
        execution_dto = await service.get_execution(query)

        return ExecutionResponse(
            id=execution_dto.id,
            session_id=execution_dto.session_id,
            status=execution_dto.status,
            code=execution_dto.code,
            language=execution_dto.language,
            timeout=execution_dto.timeout,
            stdout=execution_dto.stdout,
            stderr=execution_dto.stderr,
            exit_code=execution_dto.exit_code,
            return_value=execution_dto.return_value,
            metrics=execution_dto.metrics,
            created_at=execution_dto.created_at,
            started_at=execution_dto.started_at,
            completed_at=execution_dto.completed_at
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/sessions/{session_id}/executions")
async def list_executions(
    session_id: str,
    status_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    service: SessionService = Depends(_get_session_service)
):
    """列出会话的所有执行"""
    try:
        executions = await service.list_executions(
            session_id=session_id,
            status=status_filter,
            limit=limit,
            offset=offset
        )

        return {
            "items": executions,
            "total": len(executions),
            "limit": limit,
            "offset": offset
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
