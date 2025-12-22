#!/usr/bin/env python3

import sys
import os

# Add src to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))


def test_imports():
    """Test all imports to ensure they work with the new structure"""

    try:
        # Test main package
        import sandbox_runtime

        print("✅ sandbox_runtime imported successfully")

        # Test subpackages
        from sandbox_runtime import sandbox, sdk, utils, python_runner

        print("✅ All subpackages imported successfully")

        # Test main modules
        from sandbox_runtime import errors, main, settings

        print("✅ All main modules imported successfully")

        # Test specific classes
        from sandbox_runtime.sdk import SharedEnvSandbox

        print("✅ SharedEnvSandbox imported successfully")

        from sandbox_runtime.sandbox.shared_env.shared_env import create_app

        print("✅ create_app imported successfully")

        from sandbox_runtime.utils.loggers import DEFAULT_LOGGER

        print("✅ DEFAULT_LOGGER imported successfully")

        from sandbox_runtime.python_runner import ExecRunner

        print("✅ ExecRunner imported successfully")

        print(
            "\n🎉 All imports successful! New package structure is working correctly."
        )
        return True

    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


if __name__ == "__main__":
    success = test_imports()
    sys.exit(0 if success else 1)
