#!/usr/bin/env python3

import sys
import os
import pytest

# Add src to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))


def test_imports():
    """Test all imports to ensure they work with the new structure"""

    if sys.platform.startswith("win"):
        pytest.skip(
            "Skipping import smoke test on Windows (shared_env depends on fcntl)",
            allow_module_level=True,
        )

    # Test main package
    import sandbox_runtime

    # Test subpackages
    from sandbox_runtime import sandbox, sdk, utils

    # Test main modules
    from sandbox_runtime import errors, main, settings

    # Test specific classes
    from sandbox_runtime.sdk import SharedEnvSandbox
    from sandbox_runtime.sandbox.shared_env.shared_env import create_app
    from sandbox_runtime.utils.loggers import DEFAULT_LOGGER

    return True


if __name__ == "__main__":
    success = test_imports()
    sys.exit(0 if success else 1)
