"""
数据库管理器单元测试

测试 DatabaseManager 的功能。
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch

from src.infrastructure.persistence.database import DatabaseManager, Base


class TestDatabaseManager:
    """数据库管理器测试"""

    @pytest.fixture
    def mock_settings(self):
        """模拟设置"""
        settings = Mock()
        settings.effective_database_url = "mysql+aiomysql://root:password@localhost:3306/sandbox"
        settings.log_level = "INFO"
        settings.db_pool_size = 5
        settings.db_max_overflow = 10
        settings.db_pool_recycle = 3600
        return settings

    @pytest.fixture
    def db_manager(self):
        """创建数据库管理器"""
        return DatabaseManager()

    def test_init(self, db_manager):
        """测试初始化"""
        assert db_manager._engine is None
        assert db_manager._session_factory is None

    @pytest.mark.asyncio
    async def test_ensure_database_exists_integration(self, db_manager):
        """测试确保数据库存在（集成测试，需要实际连接）"""
        # This test requires actual database connection
        # Skip in unit tests
        pass

    @pytest.mark.asyncio
    async def test_initialize_integration(self, db_manager):
        """测试初始化数据库引擎（集成测试）"""
        # This test requires actual database connection
        # Skip in unit tests
        pass

    @pytest.mark.asyncio
    async def test_create_tables_not_initialized(self, db_manager):
        """测试未初始化时创建表"""
        with pytest.raises(RuntimeError, match="not initialized"):
            await db_manager.create_tables()

    @pytest.mark.asyncio
    async def test_run_startup_schema_migrations_not_initialized(self, db_manager):
        """测试未初始化时执行启动迁移。"""
        with pytest.raises(RuntimeError, match="not initialized"):
            await db_manager.run_startup_schema_migrations()

    @pytest.mark.asyncio
    async def test_initialize_with_seed_no_tables_no_seed(self, db_manager):
        """测试初始化不创建表和种子数据"""
        result = await db_manager.initialize_with_seed(
            create_tables=False,
            seed_data=False
        )

        assert result["tables_created"] is False
        assert result["seeded"] is False
        assert result["seed_stats"] == {}

    @pytest.mark.asyncio
    async def test_initialize_with_seed_create_tables(self, db_manager):
        """测试初始化创建表"""
        with patch.object(db_manager, 'create_tables', new_callable=AsyncMock):
            result = await db_manager.initialize_with_seed(
                create_tables=True,
                seed_data=False
            )

            assert result["tables_created"] is True
            assert result["seeded"] is False

    @pytest.mark.asyncio
    async def test_initialize_with_seed_with_seed(self, db_manager):
        """测试初始化带种子数据"""
        with patch.object(db_manager, 'create_tables', new_callable=AsyncMock):
            with patch('src.infrastructure.persistence.seed.seeder.seed_default_data',
                      new_callable=AsyncMock, return_value={"templates": 1, "runtime_nodes": 1}):
                result = await db_manager.initialize_with_seed(
                    create_tables=True,
                    seed_data=True
                )

                assert result["tables_created"] is True
                assert result["seeded"] is True
                assert result["seed_stats"]["templates"] == 1

    @pytest.mark.asyncio
    async def test_get_session_not_initialized(self, db_manager):
        """测试未初始化时获取会话"""
        with pytest.raises(RuntimeError, match="not initialized"):
            async with db_manager.get_session():
                pass

    @pytest.mark.asyncio
    async def test_close_no_engine(self, db_manager):
        """测试没有引擎时关闭"""
        # Should not raise error
        await db_manager.close()

    @pytest.mark.asyncio
    async def test_close_with_engine(self, db_manager):
        """测试有引擎时关闭"""
        mock_engine = Mock()
        mock_engine.dispose = AsyncMock()
        db_manager._engine = mock_engine

        await db_manager.close()

        mock_engine.dispose.assert_called_once()

    @pytest.mark.asyncio
    async def test_run_startup_schema_migrations_adds_missing_column(self, db_manager):
        """测试启动迁移会补齐缺失字段。"""
        mock_conn = AsyncMock()
        table_exists_result = Mock()
        table_exists_result.scalar.return_value = 1
        column_exists_result = Mock()
        column_exists_result.scalar.return_value = 0
        alter_result = Mock()
        mock_conn.execute = AsyncMock(
            side_effect=[table_exists_result, column_exists_result, alter_result]
        )

        mock_begin = AsyncMock()
        mock_begin.__aenter__.return_value = mock_conn
        mock_begin.__aexit__.return_value = None

        mock_engine = Mock()
        mock_engine.url.get_backend_name.return_value = "mysql"
        mock_engine.begin.return_value = mock_begin
        db_manager._engine = mock_engine

        await db_manager.run_startup_schema_migrations()

        assert mock_conn.execute.await_count == 3
        alter_stmt = str(mock_conn.execute.await_args_list[2].args[0])
        assert "ALTER TABLE `t_sandbox_session`" in alter_stmt
        assert "ADD COLUMN `f_python_package_index_url`" in alter_stmt

    @pytest.mark.asyncio
    async def test_run_startup_schema_migrations_skips_existing_column(self, db_manager):
        """测试启动迁移在字段已存在时跳过。"""
        mock_conn = AsyncMock()
        table_exists_result = Mock()
        table_exists_result.scalar.return_value = 1
        column_exists_result = Mock()
        column_exists_result.scalar.return_value = 1
        mock_conn.execute = AsyncMock(
            side_effect=[table_exists_result, column_exists_result]
        )

        mock_begin = AsyncMock()
        mock_begin.__aenter__.return_value = mock_conn
        mock_begin.__aexit__.return_value = None

        mock_engine = Mock()
        mock_engine.url.get_backend_name.return_value = "mysql"
        mock_engine.begin.return_value = mock_begin
        db_manager._engine = mock_engine

        await db_manager.run_startup_schema_migrations()

        assert mock_conn.execute.await_count == 2


class TestBase:
    """SQLAlchemy 基类测试"""

    def test_base_is_declarative_base(self):
        """测试 Base 是 DeclarativeBase"""
        from sqlalchemy.orm import DeclarativeBase
        assert issubclass(Base, DeclarativeBase)
