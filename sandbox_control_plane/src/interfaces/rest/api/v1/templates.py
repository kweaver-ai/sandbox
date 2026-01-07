"""
模板 REST API 路由

定义模板相关的 HTTP 端点。
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from sandbox_control_plane.src.application.services.template_service import TemplateService
from sandbox_control_plane.src.application.commands.create_template import CreateTemplateCommand
from sandbox_control_plane.src.application.commands.update_template import UpdateTemplateCommand
from sandbox_control_plane.src.application.queries.get_template import GetTemplateQuery
from sandbox_control_plane.src.application.dtos.template_dto import TemplateDTO
from sandbox_control_plane.src.interfaces.rest.schemas.request import CreateTemplateRequest, UpdateTemplateRequest
from sandbox_control_plane.src.interfaces.rest.schemas.response import TemplateResponse, ErrorResponse
from sandbox_control_plane.src.infrastructure.dependencies import get_template_service_db

router = APIRouter(prefix="/templates", tags=["templates"])


@router.post("", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    request: CreateTemplateRequest,
    service: TemplateService = Depends(get_template_service_db)
):
    """
    创建模板

    - **id**: 模板 ID
    - **name**: 模板名称
    - **image_url**: 镜像 URL
    - **runtime_type**: 运行时类型 (python3.11, nodejs20, java17, go1.21)
    - **default_cpu_cores**: 默认 CPU 核心数
    - **default_memory_mb**: 默认内存（MB）
    - **default_disk_mb**: 默认磁盘（MB）
    - **default_timeout_sec**: 默认超时时间（秒）
    - **default_env_vars**: 默认环境变量
    """
    try:
        command = CreateTemplateCommand(
            template_id=request.id,
            name=request.name,
            image_url=request.image_url,
            runtime_type=request.runtime_type,
            default_cpu_cores=request.default_cpu_cores,
            default_memory_mb=request.default_memory_mb,
            default_disk_mb=request.default_disk_mb,
            default_timeout_sec=request.default_timeout,
            default_env_vars=request.default_env_vars
        )

        template_dto = await service.create_template(command)

        return TemplateResponse(
            id=template_dto.id,
            name=template_dto.name,
            image_url=template_dto.image_url,
            runtime_type=template_dto.runtime_type,
            default_cpu_cores=template_dto.default_cpu_cores,
            default_memory_mb=template_dto.default_memory_mb,
            default_disk_mb=template_dto.default_disk_mb,
            default_timeout_sec=template_dto.default_timeout_sec,
            default_env_vars=template_dto.default_env_vars,
            is_active=template_dto.is_active,
            created_at=template_dto.created_at,
            updated_at=template_dto.updated_at
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("", response_model=List[TemplateResponse])
async def list_templates(
    limit: int = 50,
    offset: int = 0,
    service: TemplateService = Depends(get_template_service_db)
):
    """列出所有模板"""
    try:
        templates = await service.list_templates(
            limit=limit,
            offset=offset
        )

        return [
            TemplateResponse(
                id=t.id,
                name=t.name,
                image_url=t.image_url,
                runtime_type=t.runtime_type,
                default_cpu_cores=t.default_cpu_cores,
                default_memory_mb=t.default_memory_mb,
                default_disk_mb=t.default_disk_mb,
                default_timeout_sec=t.default_timeout_sec,
                default_env_vars=t.default_env_vars,
                is_active=t.is_active,
                created_at=t.created_at,
                updated_at=t.updated_at
            )
            for t in templates
        ]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: str,
    service: TemplateService = Depends(get_template_service_db)
):
    """获取模板详情"""
    try:
        query = GetTemplateQuery(template_id=template_id)
        template_dto = await service.get_template(query)

        return TemplateResponse(
            id=template_dto.id,
            name=template_dto.name,
            image_url=template_dto.image_url,
            runtime_type=template_dto.runtime_type,
            default_cpu_cores=template_dto.default_cpu_cores,
            default_memory_mb=template_dto.default_memory_mb,
            default_disk_mb=template_dto.default_disk_mb,
            default_timeout_sec=template_dto.default_timeout_sec,
            default_env_vars=template_dto.default_env_vars,
            is_active=template_dto.is_active,
            created_at=template_dto.created_at,
            updated_at=template_dto.updated_at
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: str,
    request: UpdateTemplateRequest,
    service: TemplateService = Depends(get_template_service_db)
):
    """更新模板"""
    try:
        command = UpdateTemplateCommand(
            template_id=template_id,
            name=request.name,
            image_url=request.image_url,
            default_cpu_cores=request.default_cpu_cores,
            default_memory_mb=request.default_memory_mb,
            default_disk_mb=request.default_disk_mb,
            default_timeout_sec=request.default_timeout,
            default_env_vars=request.default_env_vars
        )

        template_dto = await service.update_template(command)

        return TemplateResponse(
            id=template_dto.id,
            name=template_dto.name,
            image_url=template_dto.image_url,
            runtime_type=template_dto.runtime_type,
            default_cpu_cores=template_dto.default_cpu_cores,
            default_memory_mb=template_dto.default_memory_mb,
            default_disk_mb=template_dto.default_disk_mb,
            default_timeout_sec=template_dto.default_timeout_sec,
            default_env_vars=template_dto.default_env_vars,
            is_active=template_dto.is_active,
            created_at=template_dto.created_at,
            updated_at=template_dto.updated_at
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.delete("/{template_id}")
async def delete_template(
    template_id: str,
    service: TemplateService = Depends(get_template_service_db)
):
    """删除模板"""
    try:
        await service.delete_template(template_id)
        return {"message": "Template deleted successfully"}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
