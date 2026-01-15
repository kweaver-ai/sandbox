"""
状态同步服务

负责同步 Session 状态与实际容器状态，支持启动时同步和定时健康检查。
"""
from typing import Dict, List, Optional

from src.domain.entities.session import Session, SessionStatus
from src.domain.repositories.session_repository import ISessionRepository
from src.infrastructure.container_scheduler.base import IContainerScheduler
from src.infrastructure.logging import get_logger

logger = get_logger(__name__)


class StateSyncService:
    """
    状态同步服务

    职责：
    1. 启动时全量状态同步
    2. 定时健康检查（通过 Docker/K8s API）
    3. 状态不一致时更新 Session 表
    4. 恢复不健康的容器（创建新容器）

    核心原则：Docker/K8s 是容器状态的唯一真实来源，Session 表只保存关联关系。
    """

    def __init__(
        self,
        session_repo: ISessionRepository,
        container_scheduler: IContainerScheduler,
        scheduler=None,  # 可选的调度器，用于创建新容器
    ):
        """
        初始化状态同步服务

        Args:
            session_repo: Session 仓储
            container_scheduler: 容器调度器
            scheduler: 可选的调度器，用于恢复时创建新容器
        """
        self._session_repo = session_repo
        self._container_scheduler = container_scheduler
        self._scheduler = scheduler

    async def sync_on_startup(self) -> Dict[str, int]:
        """
        启动时全量同步

        查询所有 RUNNING/CREATING 状态的 Session，检查容器实际状态，
        尝试恢复不健康的容器或标记为失败。

        Returns:
            dict: 同步统计信息
                - healthy: 健康的容器数量
                - unhealthy: 不健康的容器数量
                - recovered: 成功恢复的容器数量
                - failed: 恢复失败标记为 FAILED 的数量
        """
        logger.info("Starting state synchronization on startup")

        stats = {
            "total": 0,
            "healthy": 0,
            "unhealthy": 0,
            "recovered": 0,
            "failed": 0,
            "errors": []
        }

        try:
            # 查询所有活跃 session
            running_sessions = await self._session_repo.find_by_status("running")
            creating_sessions = await self._session_repo.find_by_status("creating")
            active_sessions = running_sessions + creating_sessions

            stats["total"] = len(active_sessions)
            logger.info(f"Found {len(active_sessions)} active sessions to sync")

            for session in active_sessions:
                if not session.container_id:
                    logger.warning(f"Session {session.id} has no container_id, skipping")
                    continue

                try:
                    # 直接通过 Docker API 检查容器状态
                    is_running = await self._container_scheduler.is_container_running(
                        session.container_id
                    )

                    if is_running:
                        stats["healthy"] += 1
                        logger.debug(
                            f"Session {session.id}: container {session.container_id[:12]} is healthy"
                        )
                    else:
                        stats["unhealthy"] += 1
                        logger.warning(
                            f"Session {session.id}: container {session.container_id[:12]} is unhealthy"
                        )

                        # 尝试恢复
                        recovered = await self._attempt_recovery(session)
                        if recovered:
                            stats["recovered"] += 1
                        else:
                            stats["failed"] += 1

                except Exception as e:
                    error_msg = f"Error syncing session {session.id}: {e}"
                    logger.error(error_msg, exc_info=True)
                    stats["errors"].append(error_msg)

            logger.info(
                f"State sync completed: "
                f"total={stats['total']}, "
                f"healthy={stats['healthy']}, "
                f"unhealthy={stats['unhealthy']}, "
                f"recovered={stats['recovered']}, "
                f"failed={stats['failed']}"
            )

        except Exception as e:
            logger.error(f"Fatal error during state sync: {e}", exc_info=True)
            stats["errors"].append(f"Fatal error: {e}")

        return stats

    async def periodic_health_check(self) -> Dict[str, int]:
        """
        定时健康检查（每 30 秒）

        只检查 RUNNING 状态的 Session，减少查询范围。
        对不健康的容器尝试恢复。

        Returns:
            dict: 健康检查统计信息
        """
        logger.info("Starting periodic health check")

        stats = {
            "checked": 0,
            "healthy": 0,
            "unhealthy": 0,
            "recovered": 0,
            "failed": 0,
            "errors": []
        }

        try:
            # 只检查 RUNNING 状态的 Session
            running_sessions = await self._session_repo.find_by_status("running")

            logger.info(f"Checking {len(running_sessions)} running sessions")

            for session in running_sessions:
                if not session.container_id:
                    continue

                stats["checked"] += 1

                try:
                    is_running = await self._container_scheduler.is_container_running(
                        session.container_id
                    )

                    if is_running:
                        stats["healthy"] += 1
                    else:
                        stats["unhealthy"] += 1
                        logger.warning(f"Session {session.id} container {session.container_id[:12]} is unhealthy")
                        # 尝试恢复
                        recovered = await self._attempt_recovery(session)
                        if recovered:
                            stats["recovered"] += 1
                        else:
                            stats["failed"] += 1

                except Exception as e:
                    error_msg = f"Error checking session {session.id}: {e}"
                    logger.error(error_msg, exc_info=True)
                    stats["errors"].append(error_msg)

            if stats["checked"] > 0:
                logger.info(
                    f"Health check completed: "
                    f"checked={stats['checked']}, "
                    f"healthy={stats['healthy']}, "
                    f"unhealthy={stats['unhealthy']}, "
                    f"recovered={stats['recovered']}, "
                    f"failed={stats['failed']}"
                )

        except Exception as e:
            logger.error(f"Fatal error during health check: {e}", exc_info=True)
            stats["errors"].append(f"Fatal error: {e}")

        return stats

    async def _attempt_recovery(self, session: Session) -> bool:
        """
        尝试恢复 Session

        策略：创建新容器（不再使用预热池）

        Args:
            session: 需要恢复的 Session

        Returns:
            bool: 是否恢复成功
        """
        logger.info(f"Attempting recovery for session {session.id}")

        try:
            # 创建新容器
            logger.info(f"Creating new container for session {session.id}")

            # 直接使用 container_scheduler 创建容器
            # 暂时使用默认镜像
            from src.infrastructure.container_scheduler.base import ContainerConfig

            config = ContainerConfig(
                image="sandbox-template-python-basic:latest",  # 默认镜像，实际应从 template 获取
                name=f"sandbox-{session.id}",
                env_vars={
                    **(session.env_vars or {}),
                    "SESSION_ID": session.id,
                    "WORKSPACE_PATH": session.workspace_path,
                    "CONTROL_PLANE_URL": "http://control-plane:8000",
                    "DISABLE_BWRAP": "true",  # 本地开发禁用 Bubblewrap
                },
                cpu_limit=session.resource_limit.cpu if session.resource_limit else "1",
                memory_limit=session.resource_limit.memory if session.resource_limit else "512Mi",
                disk_limit=session.resource_limit.disk if session.resource_limit else "1Gi",
                workspace_path=session.workspace_path,
                labels={
                    "session_id": session.id,
                    "template_id": session.template_id,
                    "recovered": "true",
                },
            )

            # 创建容器
            container_id = await self._container_scheduler.create_container(config)
            await self._container_scheduler.start_container(container_id)

            # 更新 session
            session.container_id = container_id
            session.runtime_node = "docker-local"  # 默认节点
            session.status = SessionStatus.RUNNING
            await self._session_repo.save(session)

            logger.info(f"Session {session.id} recovered successfully with new container {container_id[:12]}")
            return True

        except Exception as e:
            logger.error(f"Failed to recover session {session.id}: {e}", exc_info=True)

            # 标记为失败
            try:
                session.mark_as_failed()
                await self._session_repo.save(session)
            except Exception as save_error:
                logger.error(f"Failed to mark session {session.id} as failed: {save_error}")

            return False

    async def check_session_health(self, session_id: str) -> Dict[str, any]:
        """
        检查单个 Session 的健康状态

        Args:
            session_id: Session ID

        Returns:
            dict: 健康状态信息
                - session_id: Session ID
                - container_id: 容器 ID
                - container_running: 容器是否运行中
                - status: 状态 (healthy/unhealthy)
        """
        session = await self._session_repo.find_by_id(session_id)
        if not session:
            return {
                "session_id": session_id,
                "status": "not_found",
                "error": "Session not found"
            }

        if not session.container_id:
            return {
                "session_id": session_id,
                "status": "no_container",
                "error": "Session has no container_id"
            }

        try:
            is_running = await self._container_scheduler.is_container_running(
                session.container_id
            )

            return {
                "session_id": session_id,
                "container_id": session.container_id,
                "container_running": is_running,
                "status": "healthy" if is_running else "unhealthy",
            }

        except Exception as e:
            return {
                "session_id": session_id,
                "container_id": session.container_id,
                "container_running": False,
                "status": "error",
                "error": str(e),
            }
