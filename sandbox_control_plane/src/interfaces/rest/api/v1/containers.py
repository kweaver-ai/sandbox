"""
容器 REST API 路由

定义容器监控相关的 HTTP 端点。
"""
import fastapi
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, List

from src.application.services.container_service import ContainerService
from src.application.queries.list_containers import ListContainersQuery
from src.application.dtos.container_dto import ContainerDTO
from src.interfaces.rest.schemas.response import ContainerResponse, ErrorResponse

router = APIRouter(prefix="/containers", tags=["containers"])


async def get_container_service(
    request: fastapi.Request
) -> ContainerService:
    """依赖注入：获取容器服务"""
    return request.app.state.container_service


@router.get("", response_model=List[ContainerResponse])
async def list_containers(
    status_filter: Optional[str] = None,
    runtime_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    service: ContainerService = Depends(get_container_service)
):
    """
    列出所有容器

    - **status_filter**: 按状态过滤 (created, running, paused, exited, deleting)
    - **runtime_type**: 按运行时类型过滤 (docker, kubernetes)
    - **limit**: 最大返回数量
    - **offset**: 偏移量
    """
    try:
        query = ListContainersQuery(
            status=status_filter,
            runtime_type=runtime_type,
            limit=limit,
            offset=offset
        )

        containers = await service.list_containers(query)

        return [
            ContainerResponse(
                id=c.id,
                session_id=c.session_id,
                runtime_type=c.runtime_type,
                node_id=c.node_id,
                container_name=c.container_name,
                image_url=c.image_url,
                status=c.status,
                ip_address=c.ip_address,
                cpu_cores=c.cpu_cores,
                memory_mb=c.memory_mb,
                disk_mb=c.disk_mb,
                created_at=c.created_at,
                started_at=c.started_at,
                exited_at=c.exited_at
            )
            for c in containers
        ]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{container_id}", response_model=ContainerResponse)
async def get_container(
    container_id: str,
    service: ContainerService = Depends(get_container_service)
):
    """获取容器详情"""
    try:
        container_dto = await service.get_container(container_id)

        return ContainerResponse(
            id=container_dto.id,
            session_id=container_dto.session_id,
            runtime_type=container_dto.runtime_type,
            node_id=container_dto.node_id,
            container_name=container_dto.container_name,
            image_url=container_dto.image_url,
            status=container_dto.status,
            ip_address=container_dto.ip_address,
            cpu_cores=container_dto.cpu_cores,
            memory_mb=container_dto.memory_mb,
            disk_mb=container_dto.disk_mb,
            created_at=container_dto.created_at,
            started_at=container_dto.started_at,
            exited_at=container_dto.exited_at
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/{container_id}/logs")
async def get_container_logs(
    container_id: str,
    tail: int = 100,
    service: ContainerService = Depends(get_container_service)
):
    """
    获取容器日志

    - **tail**: 返回最后 N 行日志
    """
    try:
        logs = await service.get_container_logs(container_id, tail)

        return {
            "container_id": container_id,
            "logs": logs,
            "tail": tail
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
