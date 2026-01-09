"""
会话 REST API 路由

定义会话相关的 HTTP 端点。
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from sandbox_control_plane.src.application.services.session_service import SessionService
from sandbox_control_plane.src.application.commands.create_session import CreateSessionCommand
from sandbox_control_plane.src.application.commands.execute_code import ExecuteCodeCommand
from sandbox_control_plane.src.application.dtos.session_dto import SessionDTO
from sandbox_control_plane.src.interfaces.rest.schemas.request import CreateSessionRequest, ExecuteCodeRequest
from sandbox_control_plane.src.interfaces.rest.schemas.response import (
    SessionResponse,
    ExecuteCodeResponse,
    ErrorResponse
)
from sandbox_control_plane.src.infrastructure.dependencies import get_session_service_db

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    request: CreateSessionRequest,
    service: SessionService = Depends(get_session_service_db)
):
    """
    创建会话

    - **template_id**: 模板 ID
    - **timeout**: 超时时间（秒），默认 300，最大 3600
    - **cpu**: CPU 核心数，如 "1", "2"
    - **memory**: 内存限制，如 "512Mi", "1Gi"
    - **disk**: 磁盘限制，如 "1Gi", "10Gi"
    - **env_vars**: 环境变量字典
    """
    from sandbox_control_plane.src.domain.value_objects.resource_limit import ResourceLimit

    try:
        # 转换请求为命令
        resource_limit = ResourceLimit(
            cpu=request.cpu,
            memory=request.memory,
            disk=request.disk
        )

        command = CreateSessionCommand(
            template_id=request.template_id,
            timeout=request.timeout,
            resource_limit=resource_limit,
            env_vars=request.env_vars
        )

        # 调用应用服务
        session_dto = await service.create_session(command)

        return SessionResponse(
            id=session_dto.id,
            template_id=session_dto.template_id,
            status=session_dto.status,
            resource_limit=session_dto.resource_limit,
            workspace_path=session_dto.workspace_path,
            runtime_type=session_dto.runtime_type,
            runtime_node=session_dto.runtime_node,
            container_id=session_dto.container_id,
            pod_name=session_dto.pod_name,
            env_vars=session_dto.env_vars,
            timeout=session_dto.timeout,
            created_at=session_dto.created_at,
            updated_at=session_dto.updated_at,
            completed_at=session_dto.completed_at,
            last_activity_at=session_dto.last_activity_at
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: str,
    service: SessionService = Depends(get_session_service_db)
):
    """获取会话详情"""
    from sandbox_control_plane.src.application.queries.get_session import GetSessionQuery

    try:
        query = GetSessionQuery(session_id=session_id)
        session_dto = await service.get_session(query)

        return SessionResponse(
            id=session_dto.id,
            template_id=session_dto.template_id,
            status=session_dto.status,
            resource_limit=session_dto.resource_limit,
            workspace_path=session_dto.workspace_path,
            runtime_type=session_dto.runtime_type,
            runtime_node=session_dto.runtime_node,
            container_id=session_dto.container_id,
            pod_name=session_dto.pod_name,
            env_vars=session_dto.env_vars,
            timeout=session_dto.timeout,
            created_at=session_dto.created_at,
            updated_at=session_dto.updated_at,
            completed_at=session_dto.completed_at,
            last_activity_at=session_dto.last_activity_at
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.delete("/{session_id}", response_model=SessionResponse)
async def terminate_session(
    session_id: str,
    service: SessionService = Depends(get_session_service_db)
):
    """终止会话"""
    try:
        session_dto = await service.terminate_session(session_id)

        return SessionResponse(
            id=session_dto.id,
            template_id=session_dto.template_id,
            status=session_dto.status,
            resource_limit=session_dto.resource_limit,
            workspace_path=session_dto.workspace_path,
            runtime_type=session_dto.runtime_type,
            runtime_node=session_dto.runtime_node,
            container_id=session_dto.container_id,
            pod_name=session_dto.pod_name,
            env_vars=session_dto.env_vars,
            timeout=session_dto.timeout,
            created_at=session_dto.created_at,
            updated_at=session_dto.updated_at,
            completed_at=session_dto.completed_at,
            last_activity_at=session_dto.last_activity_at
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
