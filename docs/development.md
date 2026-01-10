# Development Guide

This guide covers setting up a development environment and contributing to the Sandbox Runtime project.

## Development Environment Setup

### Prerequisites

- Python 3.11+
- Git
- Virtual environment tool (venv, conda, etc.)

### Clone and Install

```bash
# Clone the repository
git clone https://github.com/your-org/sandbox-runtime.git
cd sandbox-runtime

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install with development dependencies
pip install -e ".[dev]"
```

### Development Dependencies

The `[dev]` extra includes:
- `pytest` - Testing framework
- `pytest-asyncio` - Async test support
- `pytest-cov` - Coverage reporting
- `black` - Code formatter
- `ruff` - Fast linter
- `mypy` - Type checker

---

## Project Structure

```
sandbox-runtime/
├── src/sandbox_runtime/
│   ├── __init__.py
│   ├── sandbox/              # Core sandbox isolation
│   │   ├── __init__.py
│   │   ├── bubblewrap.py     # Bubblewrap isolation (Linux)
│   │   ├── docker.py         # Docker isolation
│   │   ├── pool.py           # Sandbox pool management
│   │   └── executor.py       # Code execution logic
│   ├── shared_env/           # FastAPI server
│   │   ├── __init__.py
│   │   ├── server.py         # Application entry point
│   │   ├── routes/           # API routes
│   │   ├── models/           # Pydantic models
│   │   └── lifespan.py       # Startup/shutdown logic
│   ├── sdk/                  # Client SDK
│   │   ├── __init__.py
│   │   └── client.py
│   └── core/                 # Core utilities
│       ├── __init__.py
│       └── config.py
├── tests/                    # Test suite
│   ├── test_sandbox.py
│   ├── test_api.py
│   └── test_sdk.py
├── docs/                     # Documentation
├── helm/                     # Kubernetes Helm chart
├── pyproject.toml           # Project config
└── Dockerfile               # Container image
```

---

## Running Tests

### Run All Tests

```bash
cd sandbox-runtime
pytest
```

### Run Specific Test File

```bash
pytest tests/test_sdk.py
pytest tests/test_api.py
```

### Run with Coverage

```bash
pytest --cov=sandbox_runtime --cov-report=html
```

Coverage report will be generated in `htmlcov/index.html`.

### Run Specific Test

```bash
pytest tests/test_sandbox.py::test_create_session
```

### Run with Verbose Output

```bash
pytest -v
```

---

## Code Style

### Formatting with Black

```bash
# Format all files
black src/ tests/

# Check formatting without modifying
black --check src/ tests/
```

### Linting with Ruff

```bash
# Lint all files
ruff check src/ tests/

# Auto-fix issues
ruff check --fix src/ tests/
```

### Type Checking with MyPy

```bash
mypy src/sandbox_runtime/
```

---

## Running the Development Server

### Start Server

```bash
# From sandbox-runtime directory
python -m sandbox_runtime.shared_env.server
```

### Auto-Reload Development Mode

```bash
uvicorn sandbox_runtime.shared_env.server:app \
  --host 0.0.0.0 \
  --port 8000 \
  --reload
```

---

## Writing Tests

### Example Test

```python
import pytest
from sandbox_runtime.sdk import SandboxClient

@pytest.mark.asyncio
async def test_execute_code():
    client = SandboxClient(base_url="http://localhost:8000")

    await client.create_session(session_id="test_session")

    result = await client.execute_code(
        session_id="test_session",
        code="print('Hello, World!')"
    )

    assert result.exit_code == 0
    assert "Hello, World!" in result.stdout

    await client.close_session(session_id="test_session")
```

### Test Fixtures

```python
import pytest
from sandbox_runtime.sdk import SandboxClient

@pytest.fixture
async def client():
    client = SandboxClient(base_url="http://localhost:8000")
    yield client
    await client.close()

@pytest.fixture
async def session(client):
    session_id = "test_session"
    await client.create_session(session_id=session_id)
    yield session_id
    await client.close_session(session_id=session_id)
```

---

## Debugging

### Enable Debug Logging

```bash
export LOG_LEVEL=DEBUG
python -m sandbox_runtime.shared_env.server
```

### Python Debugger

```python
import pdb; pdb.set_trace()  # Set breakpoint
```

### VS Code Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: FastAPI",
      "type": "debugpy",
      "request": "launch",
      "module": "uvicorn",
      "args": [
        "sandbox_runtime.shared_env.server:app",
        "--host", "0.0.0.0",
        "--port", "8000",
        "--reload"
      ],
      "console": "integratedTerminal",
      "justMyCode": false
    }
  ]
}
```

---

## Building Documentation

```bash
# Docs are in Markdown format - no build required
# Simply edit files in the docs/ directory
```

---

## Creating a Release

### Update Version

```bash
# Update VERSION file
echo "0.2.0" > VERSION
```

### Tag the Release

```bash
git tag -a v0.2.0 -m "Release version 0.2.0"
git push origin v0.2.0
```

### Build Docker Image

```bash
docker build -t sandbox-runtime:v0.2.0 -f sandbox-runtime/Dockerfile .
```

---

## Contributing

### Contribution Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linters
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

**Example:**
```
feat(sdk): add retry logic for failed requests

Implement automatic retry with exponential backoff
for transient network failures.

Closes #123
```

---

## Common Issues

### Tests Failing with Permission Errors

Make sure you have proper permissions for sandbox operations:

```bash
# On Linux with bubblewrap
# Ensure proper user namespace permissions
```

### Import Errors

Make sure the package is installed in development mode:

```bash
pip install -e ".[dev]"
```

### Port Already in Use

Change the port:

```bash
export PORT=8080
python -m sandbox_runtime.shared_env.server
```

---

## Resources

- [Architecture](architecture.md) - System design overview
- [API Reference](api-reference.md) - API documentation
- [Configuration](configuration.md) - Configuration options
- [Deployment](deployment.md) - Production deployment
