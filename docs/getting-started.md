# Getting Started

This guide will help you install, configure, and run the Sandbox Runtime for the first time.

## Prerequisites

- **Python 3.11+** - The project requires Python 3.11 or higher
- **Linux System** - For Bubblewrap isolation (recommended for production)
- **Docker** (optional) - For container-based isolation

### System Dependencies

#### Linux (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install -y bubblewrap
```

#### macOS

```bash
# No additional dependencies required - uses native sandbox-exec
```

## Installation

### Clone the Repository

```bash
git clone https://github.com/your-org/sandbox-runtime.git
cd sandbox-runtime
```

### Install Python Dependencies

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install with dev dependencies
pip install -e ".[dev]"
```

## Configuration

The Sandbox Runtime can be configured via environment variables. Create a `.env` file or export these variables:

```bash
# CPU quota per sandbox (default: 2)
export SANDBOX_CPU_QUOTA=2

# Memory limit in KB (default: 131072 = 128MB)
export SANDBOX_MEMORY_LIMIT=131072

# Allow network access (default: true)
export SANDBOX_ALLOW_NETWORK=true

# Execution timeout in seconds (default: 300)
export SANDBOX_TIMEOUT_SECONDS=300

# Warm pool size (default: 2)
export SANDBOX_POOL_SIZE=2

# Server port (default: 8000)
export PORT=8000
```

## Running the Server

### Development Mode

```bash
# From sandbox-runtime directory
python -m sandbox_runtime.shared_env.server
```

The server will start on `http://localhost:8000`

### Production Mode

```bash
uvicorn sandbox_runtime.shared_env.server:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 4
```

## Verification

Test that the server is running correctly:

```bash
# Health check
curl http://localhost:8000/health

# Should return: {"status": "healthy"}
```

## Quick Test with SDK

Create a test script `test_sandbox.py`:

```python
import asyncio
from sandbox_runtime.sdk import SandboxClient

async def main():
    client = SandboxClient(base_url="http://localhost:8000")

    # Create a session
    session = await client.create_session(session_id="test_session")

    # Execute Python code
    result = await client.execute_code(
        session_id="test_session",
        code="""
def handler(event):
    name = event.get('name', 'World')
    return {'message': f'Hello, {name}!'}

result = handler({'name': 'Sandbox'})
print(result)
"""
    )

    print("Exit Code:", result.exit_code)
    print("Output:", result.stdout)

    # Clean up
    await client.close_session(session_id="test_session")

if __name__ == "__main__":
    asyncio.run(main())
```

Run the test:

```bash
python test_sandbox.py
```

## Next Steps

- Read the [Architecture](architecture.md) to understand the system design
- Check the [API Reference](api-reference.md) for all available endpoints
- See [Configuration](configuration.md) for advanced setup options
- Review [Deployment](deployment.md) for production deployment

## Troubleshooting

### Port Already in Use

If port 8000 is already in use:

```bash
export PORT=8080
python -m sandbox_runtime.shared_env.server
```

### Bubblewrap Not Found (Linux)

```bash
sudo apt-get install bubblewrap
```

### Permission Denied Errors

Make sure the user running the server has permissions to create sandbox environments:

```bash
# May need appropriate user permissions
# For production, consider running with proper user/group settings
```

### For More Help

See [Troubleshooting](troubleshooting.md) for common issues and solutions.
