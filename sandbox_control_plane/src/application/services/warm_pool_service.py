"""
预热池管理服务

负责定时清理和补充预热池，提供统计信息。
"""
import logging
from typing import Dict, Optional

from src.domain.entities.template import Template
from src.domain.repositories.template_repository import ITemplateRepository
from src.infrastructure.warm_pool.warm_pool_manager import WarmPoolManager

logger = logging.getLogger(__name__)


class WarmPoolService:
    """
    预热池管理服务

    职责：
    1. 定时清理空闲的预热容器
    2. 定时补充预热池到目标大小
    3. 提供预热池统计信息

    此服务供 BackgroundTaskManager 调用，执行周期性维护任务。
    """

    def __init__(
        self,
        warm_pool_manager: WarmPoolManager,
        template_repo: ITemplateRepository,
        default_node_id: str = "local",
        default_idle_timeout: int = 1800,  # 30 分钟
        default_target_size: int = 5,
        env_vars: Optional[Dict[str, str]] = None,
        workspace_path_template: str = "s3://bucket/sessions/{session_id}/",
    ):
        """
        初始化预热池管理服务

        Args:
            warm_pool_manager: 预热池管理器
            template_repo: 模板仓储
            default_node_id: 默认节点 ID
            default_idle_timeout: 默认空闲超时时间（秒）
            default_target_size: 默认目标池大小
            env_vars: 默认环境变量
            workspace_path_template: 工作空间路径模板
        """
        self._warm_pool_manager = warm_pool_manager
        self._template_repo = template_repo
        self._default_node_id = default_node_id
        self._default_idle_timeout = default_idle_timeout
        self._default_target_size = default_target_size
        self._env_vars = env_vars or {}
        self._workspace_path_template = workspace_path_template

    async def periodic_cleanup(self) -> Dict[str, int]:
        """
        定时清理空闲的预热实例

        清理超过空闲超时时间的预热容器，释放资源。

        Returns:
            dict: 清理统计信息
                - cleaned: 清理的容器数量
                - errors: 错误信息列表
        """
        logger.debug("Starting periodic warm pool cleanup")

        stats = {
            "cleaned": 0,
            "errors": []
        }

        try:
            cleaned_count = await self._warm_pool_manager.cleanup_idle(
                idle_timeout_seconds=self._default_idle_timeout
            )
            stats["cleaned"] = cleaned_count

            if cleaned_count > 0:
                logger.info(f"Periodic cleanup completed: cleaned={cleaned_count}")
            else:
                logger.debug("Periodic cleanup completed: no idle instances to clean")

        except Exception as e:
            error_msg = f"Error during periodic cleanup: {e}"
            logger.error(error_msg, exc_info=True)
            stats["errors"].append(error_msg)

        return stats

    async def periodic_replenish(self) -> Dict[str, any]:
        """
        定时补充预热池到目标大小

        查询所有模板，为每个模板补充预热池到目标大小。

        Returns:
            dict: 补充统计信息
                - templates_checked: 检查的模板数量
                - templates_replenished: 需要补充的模板数量
                - total_created: 创建的容器总数
                - errors: 错误信息列表
                - details: 每个模板的补充详情
        """
        logger.debug("Starting periodic warm pool replenishment")

        stats = {
            "templates_checked": 0,
            "templates_replenished": 0,
            "total_created": 0,
            "errors": [],
            "details": {}
        }

        try:
            # 查询所有模板
            templates = await self._template_repo.find_all()
            stats["templates_checked"] = len(templates)

            logger.debug(f"Found {len(templates)} templates to check for replenishment")

            for template in templates:
                try:
                    template_id = template.id

                    # 获取当前池大小
                    current_size = self._warm_pool_manager.get_pool_size(template_id)

                    # 计算需要创建的数量
                    needed = self._default_target_size - current_size

                    if needed <= 0:
                        stats["details"][template_id] = {
                            "current_size": current_size,
                            "created": 0,
                            "status": "already_full"
                        }
                        logger.debug(f"Template {template_id}: pool already at target size")
                        continue

                    # 补充预热池
                    created_count = await self._warm_pool_manager.replenish(
                        template_id=template_id,
                        target_size=self._default_target_size,
                        image=template.image,
                        node_id=self._default_node_id,
                        resource_limit=template.default_resources,
                        env_vars=self._env_vars,
                        workspace_path_template=self._workspace_path_template,
                    )

                    stats["templates_replenished"] += 1
                    stats["total_created"] += created_count
                    stats["details"][template_id] = {
                        "current_size": current_size,
                        "created": created_count,
                        "new_size": current_size + created_count,
                        "status": "replenished"
                    }

                    logger.info(
                        f"Replenished template {template_id}: "
                        f"created={created_count}, new_size={current_size + created_count}"
                    )

                except Exception as e:
                    error_msg = f"Error replenishing template {template.id}: {e}"
                    logger.error(error_msg, exc_info=True)
                    stats["errors"].append(error_msg)

            if stats["total_created"] > 0:
                logger.info(
                    f"Periodic replenishment completed: "
                    f"templates={stats['templates_checked']}, "
                    f"replenished={stats['templates_replenished']}, "
                    f"created={stats['total_created']}"
                )
            else:
                logger.debug("Periodic replenishment completed: no instances created")

        except Exception as e:
            error_msg = f"Fatal error during periodic replenishment: {e}"
            logger.error(error_msg, exc_info=True)
            stats["errors"].append(error_msg)

        return stats

    def get_statistics(self) -> Dict[str, any]:
        """
        获取预热池统计信息

        Returns:
            dict: 预热池统计信息
                - pool_sizes: 每个模板的池大小
                - total_instances: 总实例数
                - total_templates: 总模板数
        """
        pool_sizes = self._warm_pool_manager.get_all_pool_sizes()

        return {
            "pool_sizes": pool_sizes,
            "total_instances": sum(pool_sizes.values()),
            "total_templates": len(pool_sizes),
        }

    async def replenish_single_template(
        self,
        template_id: str,
        target_size: Optional[int] = None,
    ) -> Dict[str, any]:
        """
        补充单个模板的预热池

        供手动触发或特定场景使用。

        Args:
            template_id: 模板 ID
            target_size: 目标大小，默认使用配置的默认值

        Returns:
            dict: 补充结果
        """
        target = target_size or self._default_target_size

        template = await self._template_repo.find_by_id(template_id)
        if not template:
            return {
                "template_id": template_id,
                "status": "error",
                "error": "Template not found"
            }

        current_size = self._warm_pool_manager.get_pool_size(template_id)
        created_count = await self._warm_pool_manager.replenish(
            template_id=template_id,
            target_size=target,
            image=template.image,
            node_id=self._default_node_id,
            resource_limit=template.default_resources,
            env_vars=self._env_vars,
            workspace_path_template=self._workspace_path_template,
        )

        return {
            "template_id": template_id,
            "status": "success",
            "current_size": current_size,
            "created": created_count,
            "new_size": current_size + created_count,
            "target_size": target,
        }

    async def cleanup_single_template(
        self,
        template_id: str,
        idle_timeout: Optional[int] = None,
    ) -> Dict[str, any]:
        """
        清理单个模板的空闲实例

        供手动触发或特定场景使用。

        Args:
            template_id: 模板 ID
            idle_timeout: 空闲超时时间，默认使用配置的默认值

        Returns:
            dict: 清理结果
        """
        timeout = idle_timeout or self._default_idle_timeout

        # 注意：WarmPoolManager.cleanup_idle() 是全局清理
        # 如果需要针对单个模板清理，需要扩展其接口
        # 这里暂时调用全局清理，记录日志

        cleaned_count = await self._warm_pool_manager.cleanup_idle(
            idle_timeout_seconds=timeout
        )

        return {
            "template_id": template_id,
            "status": "success",
            "cleaned": cleaned_count,  # 全局清理数量
            "note": "Cleanup was performed globally, not for single template"
        }
