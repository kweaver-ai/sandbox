#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Workspace cleanup task for server side.
This module is responsible for cleaning up expired workspaces.
"""

import os
import time
import threading
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, List
import shutil
import json
import subprocess
from sandbox_runtime.utils.loggers import DEFAULT_LOGGER
from sandbox_runtime.settings import get_settings

logger = DEFAULT_LOGGER

settings = get_settings()


WORKSPACE_EXPIRATION_TIME = settings.WORKSPACE_EXPIRATION_TIME


class WorkspaceCleaner:
    """工作空间清理器"""

    def __init__(
        self,
        workspace_list_path: str,
        cleanup_interval: int,  # 默认每分钟检查一次
        expiration_time: int,
    ):  # 默认1小时过期
        """
        初始化工作空间清理器

        Args:
            workspace_list_path: workspace.list 文件路径
            cleanup_interval: 清理检查间隔（秒）
            expiration_time: 过期时间（秒）
        """
        self.workspace_list_path = workspace_list_path
        self.cleanup_interval = cleanup_interval
        self.expiration_time = expiration_time
        self._stop_event = threading.Event()
        self._cleanup_thread: Optional[threading.Thread] = None

    def _parse_workspace_list(self) -> Dict[str, Dict[str, any]]:
        """解析 workspace.list 文件（JSON格式）"""
        workspaces = {}
        if not os.path.exists(self.workspace_list_path):
            logger.warning(f"Workspace list file not found: {self.workspace_list_path}")
            return workspaces

        try:
            with open(self.workspace_list_path, "r") as f:
                workspaces = json.load(f)
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing workspace list JSON: {e}")
        except Exception as e:
            logger.error(f"Error reading workspace list: {e}")

        return workspaces

    def _is_workspace_expired(self, workspace_data: Dict[str, any]) -> bool:
        """检查工作空间是否过期"""
        try:
            # 使用JSON中的created_at时间戳
            creation_time = workspace_data.get("created_at", 0)
            # 计算时间差
            age = time.time() - creation_time
            # 检查是否超过过期时间
            return age > self.expiration_time
        except Exception as e:
            logger.error(f"Error checking workspace expiration: {e}")
            return False

    def _cleanup_expired_workspaces(self):
        """清理过期的工作空间"""
        workspaces = self._parse_workspace_list()
        expired_session_ids = []

        for session_id, workspace_data in workspaces.items():
            if self._is_workspace_expired(workspace_data):
                logger.info(f"workspace_data: {workspace_data}")

                now = time.time()
                age = now - workspace_data.get("created_at", 0)
                logger.info(
                    f"created at: {workspace_data.get('created_at', 0)}, now: {now}, age: {age}"
                )
                workspace_path = workspace_data.get("mount_point", "")
                if os.path.exists(workspace_path):
                    try:
                        logger.info(
                            f"Cleaning up expired workspace: {workspace_path} (session: {session_id})"
                        )
                        # 先 umount 挂载点
                        subprocess.run(["umount", workspace_path], check=True)
                        # 删除挂载点目录
                        shutil.rmtree(workspace_path)
                        expired_session_ids.append(session_id)
                    except Exception as e:
                        logger.error(
                            f"Error cleaning up workspace {workspace_path}: {e}"
                        )
                else:
                    # 如果目录不存在，也标记为需要从列表中移除
                    expired_session_ids.append(session_id)

        # 从workspace.list中移除已清理的条目
        if expired_session_ids:
            self._remove_expired_from_list(expired_session_ids)

    def _remove_expired_from_list(self, expired_session_ids: List[str]):
        """从workspace.list中移除过期的条目"""
        try:
            workspaces = self._parse_workspace_list()
            for session_id in expired_session_ids:
                if session_id in workspaces:
                    del workspaces[session_id]

            # 重写workspace.list文件
            with open(self.workspace_list_path, "w") as f:
                json.dump(workspaces, f, indent=2)

            logger.info(
                f"Removed {len(expired_session_ids)} expired entries from workspace list"
            )
        except Exception as e:
            logger.error(f"Error updating workspace list: {e}")

    def _cleanup_loop(self):
        """清理循环"""
        while not self._stop_event.is_set():
            try:
                self._cleanup_expired_workspaces()
            except Exception as e:
                logger.error(f"Error in cleanup loop: {e}")

            # 等待下一次清理，但允许快速停止
            for _ in range(self.cleanup_interval):
                if self._stop_event.is_set():
                    break
                time.sleep(1)

    def start(self):
        """启动清理线程"""
        if self._cleanup_thread is not None and self._cleanup_thread.is_alive():
            logger.warning("Cleanup thread is already running")
            return

        self._stop_event.clear()
        self._cleanup_thread = threading.Thread(target=self._cleanup_loop, daemon=True)
        self._cleanup_thread.start()
        logger.info("Workspace cleanup thread started")

    def stop(self):
        """停止清理线程"""
        if self._cleanup_thread is None or not self._cleanup_thread.is_alive():
            return

        self._stop_event.set()
        self._cleanup_thread.join()
        self._cleanup_thread = None
        logger.info("Workspace cleanup thread stopped")


def start_cleanup_task(
    workspace_list_path: str,
    cleanup_interval: int = 60 * 10,
    expiration_time: int = WORKSPACE_EXPIRATION_TIME,
) -> WorkspaceCleaner:
    """
    启动工作空间清理任务

    Args:
        workspace_list_path: workspace.list 文件路径
        cleanup_interval: 清理检查间隔（秒）
        expiration_time: 过期时间（秒）

    Returns:
        WorkspaceCleaner: 清理器实例
    """
    cleaner = WorkspaceCleaner(
        workspace_list_path=workspace_list_path,
        cleanup_interval=cleanup_interval,
        expiration_time=expiration_time,
    )
    cleaner.start()
    DEFAULT_LOGGER.info(f"Workspace cleanup task started for {workspace_list_path}")
    return cleaner
