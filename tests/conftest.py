"""Pytest configuration and fixtures."""

import pytest
import sys
from pathlib import Path
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

# Add src to path for imports
# Detect if running from sandbox_control_plane or project root
_current_file = Path(__file__).resolve()
if (_current_file.parent.parent / "sandbox_control_plane" / "src").exists():
    # Running from project root, add sandbox_control_plane to path
    src_path = _current_file.parent.parent / "sandbox_control_plane"
elif (_current_file.parent.parent / "src").exists():
    # Running from sandbox_control_plane, current dir is already correct
    src_path = _current_file.parent.parent
else:
    # Fallback: try to find src directory
    src_path = _current_file.parent

if str(src_path) not in sys.path:
    sys.path.insert(0, str(src_path))

from src.interfaces.rest.main import app
from src.infrastructure.config.settings import get_settings


@pytest.fixture
async def client() -> AsyncClient:
    """Get test HTTP client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def settings():
    """Get application settings."""
    return get_settings()


# Async database fixture for tests
@pytest.fixture
async def db_session() -> AsyncSession:
    """Get test database session."""
    # Use in-memory SQLite for testing
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
    )

    async_session = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    # Create tables
    from src.infrastructure.persistence.database import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        yield session

    # Cleanup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()
