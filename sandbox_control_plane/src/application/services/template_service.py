"""
模板应用服务

编排模板相关的用例。
"""
from typing import List, Optional

from sandbox_control_plane.src.domain.entities.template import Template
from sandbox_control_plane.src.domain.repositories.template_repository import ITemplateRepository
from sandbox_control_plane.src.application.commands.create_template import CreateTemplateCommand
from sandbox_control_plane.src.application.commands.update_template import UpdateTemplateCommand
from sandbox_control_plane.src.application.queries.get_template import GetTemplateQuery
from sandbox_control_plane.src.application.dtos.template_dto import TemplateDTO
from sandbox_control_plane.src.shared.errors.domain import NotFoundError, ValidationError


class TemplateService:
    """
    模板应用服务

    编排模板创建、查询、更新、删除等用例。
    """

    def __init__(
        self,
        template_repo: ITemplateRepository,
    ):
        self._template_repo = template_repo

    async def create_template(self, command: CreateTemplateCommand) -> TemplateDTO:
        """
        创建模板用例

        流程：
        1. 验证模板名称唯一性
        2. 创建模板实体
        3. 保存到仓储
        """
        # 1. 验证名称唯一性
        existing = await self._template_repo.find_by_name(command.name)
        if existing:
            raise ValidationError(f"Template name already exists: {command.name}")

        # 2. 创建模板实体
        template = Template(
            id=command.template_id,
            name=command.name,
            image_url=command.image_url,
            runtime_type=command.runtime_type,
            default_cpu_cores=command.default_cpu_cores,
            default_memory_mb=command.default_memory_mb,
            default_disk_mb=command.default_disk_mb,
            default_timeout_sec=command.default_timeout_sec,
            default_env_vars=command.default_env_vars or {},
        )

        # 3. 保存到仓储
        await self._template_repo.save(template)

        return TemplateDTO.from_entity(template)

    async def get_template(self, query: GetTemplateQuery) -> TemplateDTO:
        """获取模板用例"""
        template = await self._template_repo.find_by_id(query.template_id)
        if not template:
            raise NotFoundError(f"Template not found: {query.template_id}")

        return TemplateDTO.from_entity(template)

    async def list_templates(
        self,
        limit: int = 50,
        offset: int = 0
    ) -> List[TemplateDTO]:
        """列出所有模板"""
        templates = await self._template_repo.find_all(
            limit=limit,
            offset=offset
        )

        return [TemplateDTO.from_entity(t) for t in templates]

    async def update_template(self, command: UpdateTemplateCommand) -> TemplateDTO:
        """
        更新模板用例

        流程：
        1. 查找模板
        2. 验证名称唯一性（如果更改名称）
        3. 更新模板字段
        4. 保存到仓储
        """
        # 1. 查找模板
        template = await self._template_repo.find_by_id(command.template_id)
        if not template:
            raise NotFoundError(f"Template not found: {command.template_id}")

        # 2. 验证名称唯一性
        if command.name and command.name != template.name:
            existing = await self._template_repo.find_by_name(command.name)
            if existing and existing.id != template.id:
                raise ValidationError(f"Template name already exists: {command.name}")

        # 3. 更新模板字段
        if command.name is not None:
            template.name = command.name
        if command.image_url is not None:
            template.image_url = command.image_url
        if command.default_cpu_cores is not None:
            template.default_cpu_cores = command.default_cpu_cores
        if command.default_memory_mb is not None:
            template.default_memory_mb = command.default_memory_mb
        if command.default_disk_mb is not None:
            template.default_disk_mb = command.default_disk_mb
        if command.default_timeout_sec is not None:
            template.default_timeout_sec = command.default_timeout_sec
        if command.default_env_vars is not None:
            template.default_env_vars = command.default_env_vars

        # 4. 保存到仓储
        await self._template_repo.save(template)

        return TemplateDTO.from_entity(template)

    async def delete_template(self, template_id: str) -> None:
        """
        删除模板用例

        流程：
        1. 查找模板
        2. 验证无活动会话使用
        3. 删除模板
        """
        # 1. 查找模板
        template = await self._template_repo.find_by_id(template_id)
        if not template:
            raise NotFoundError(f"Template not found: {template_id}")

        # 2. 验证无活动会话使用
        # TODO: 实现活动会话检查
        # active_sessions = await self._session_repo.find_active_by_template(template_id)
        # if active_sessions:
        #     raise ValidationError("Cannot delete template with active sessions")

        # 3. 删除模板
        await self._template_repo.delete(template_id)
