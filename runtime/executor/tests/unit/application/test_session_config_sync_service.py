"""
Tests for session config sync service.
"""

from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

import pytest

from executor.application.services.session_config_sync_service import (
    InstalledDependency,
    SessionConfigSyncRequest,
    SessionConfigSyncService,
    SessionConfigValidationError,
)


class TestSessionConfigSyncService:
    """Tests for SessionConfigSyncService."""

    @pytest.fixture
    def service(self):
        with TemporaryDirectory() as tmpdir:
            install_path = Path(tmpdir) / "deps"
            cache_path = Path(tmpdir) / "pip-cache"
            yield SessionConfigSyncService(
                install_path=install_path,
                pip_cache_path=cache_path,
            )

    @pytest.mark.asyncio
    async def test_sync_empty_dependencies_resets_install_dir(self, service):
        request = SessionConfigSyncRequest(
            session_id="sess_1",
            language_runtime="python3.11",
            python_package_index_url="https://pypi.org/simple/",
            dependencies=[],
            sync_mode="replace",
        )

        result = await service.sync(request)

        assert result.status == "completed"
        assert result.installed_dependencies == []
        assert service._install_path.exists()

    @pytest.mark.asyncio
    async def test_sync_invokes_pip_and_scans_installed_distributions(self, service):
        request = SessionConfigSyncRequest(
            session_id="sess_1",
            language_runtime="python3.11",
            python_package_index_url="https://mirror.example/simple",
            dependencies=["requests==2.31.0"],
            sync_mode="replace",
        )

        class FakeProcess:
            returncode = 0

            async def communicate(self):
                return (b"ok", b"")

        fake_distribution = type(
            "FakeDistribution",
            (),
            {
                "metadata": {"Name": "requests"},
                "version": "2.31.0",
            },
        )()

        with patch(
            "executor.application.services.session_config_sync_service.asyncio.create_subprocess_exec",
            return_value=FakeProcess(),
        ) as subprocess_mock, patch(
            "executor.application.services.session_config_sync_service.importlib.metadata.distributions",
            return_value=[fake_distribution],
        ):
            result = await service.sync(request)

        assert subprocess_mock.await_count == 1
        assert len(result.installed_dependencies) == 1
        assert result.installed_dependencies[0].name == "requests"
        assert result.installed_dependencies[0].version == "2.31.0"

    @pytest.mark.asyncio
    async def test_sync_rejects_non_python_runtime(self, service):
        request = SessionConfigSyncRequest(
            session_id="sess_1",
            language_runtime="nodejs20",
            python_package_index_url="https://pypi.org/simple/",
            dependencies=["requests==2.31.0"],
            sync_mode="replace",
        )

        with pytest.raises(SessionConfigValidationError):
            await service.sync(request)
