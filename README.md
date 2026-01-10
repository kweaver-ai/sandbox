# Sandbox Runtime

> A secure, isolated code execution daemon providing process-level isolation using Bubblewrap and Docker

[![Python Version](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**[English](README.md)** | **[中文文档](README_zh.md)**

## Overview

Sandbox Runtime is a high-performance code execution service designed for AI Agent applications. It provides multi-layered security isolation mechanisms to ensure untrusted code executes safely in controlled environments.

## Core Features

- **Multi-layer Security Isolation** - Docker container + Bubblewrap/sandbox-exec dual-layer isolation
- **Asynchronous High Performance** - Truly async execution based on asyncio with high concurrency support
- **Lambda Compatible** - Supports AWS Lambda handler specification
- **Real-time Observability** - Heartbeat reporting, lifecycle management, execution metrics

## Quick Start

```bash
# Install dependencies
cd sandbox-runtime
pip install -e ".[dev]"

# Start server
python -m sandbox_runtime.shared_env.server

# Verify service
curl http://localhost:8000/health
```

**Detailed Guide**: [Getting Started](docs/getting-started.md)

## Tech Stack

| Component | Technology |
|-----------|------------|
| HTTP Framework | FastAPI + Uvicorn |
| Isolation Technology | Bubblewrap (Linux) / Docker |
| Async Runtime | asyncio |
| Logging | structlog |
| Data Validation | Pydantic |

## Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](docs/getting-started.md) | Installation, configuration and basic usage |
| [Architecture](docs/architecture.md) | System architecture and design principles |
| [API Reference](docs/api-reference.md) | RESTful API endpoints and examples |
| [Configuration](docs/configuration.md) | Environment variables and isolation configuration |
| [Development](docs/development.md) | Development environment setup, testing, code standards |
| [Deployment](docs/deployment.md) | Docker, Docker Compose, Kubernetes deployment |
| [Troubleshooting](docs/troubleshooting.md) | Common issues and solutions |

## Examples

### Python Handler

```python
def handler(event):
    name = event.get('name', 'World')
    return {'message': f'Hello, {name}!'}
```

### Execute Code via SDK

```python
from sandbox_runtime.sdk import SandboxClient

client = SandboxClient(base_url="http://localhost:8000")

# Create session
session = await client.create_session(session_id="my_session")

# Execute code
result = await client.execute_code(
    session_id="my_session",
    code="print('Hello from sandbox!')"
)

print(result.stdout)  # "Hello from sandbox!"
```

### Execute Code via REST API

```bash
curl -X POST http://localhost:8000/workspace/se/execute_code/my_session \
  -H 'Content-Type: application/json' \
  -d '{
    "code": "def handler(event): return {\"message\": \"Hello!\"}",
    "timeout": 10
  }'
```

## Project Structure

```
sandbox-runtime/
├── src/sandbox_runtime/
│   ├── sandbox/          # Core sandbox isolation implementation
│   ├── shared_env/       # FastAPI server with REST API
│   ├── sdk/              # Client SDK for sandbox interaction
│   └── core/             # Core execution logic
├── helm/                 # Kubernetes Helm chart
├── tests/                # Test suites
└── docs/                 # Documentation
```

## Configuration

Environment variables control sandbox behavior:

| Variable | Description | Default |
|----------|-------------|---------|
| `SANDBOX_CPU_QUOTA` | CPU quota | 2 |
| `SANDBOX_MEMORY_LIMIT` | Memory limit in KB | 131072 |
| `SANDBOX_ALLOW_NETWORK` | Network access | true |
| `SANDBOX_TIMEOUT_SECONDS` | Execution timeout | 300 |
| `SANDBOX_POOL_SIZE` | Warm pool size | 2 |

## Development

```bash
# Run tests
cd sandbox-runtime
pytest

# Run specific test file
pytest tests/test_sdk.py
pytest tests/test_http_api.py
```

## Docker

```bash
# Build image (from repository root)
docker build -t sandbox-runtime -f sandbox-runtime/Dockerfile sandbox-runtime

# Build multi-platform
docker buildx build -t sandbox-runtime --platform=linux/amd64,linux/arm64 -f sandbox-runtime/Dockerfile sandbox-runtime
```

## Kubernetes/Helm

```bash
# Install Helm chart
helm install sandbox-runtime ./sandbox-runtime/helm/sandbox-runtime

# Port forward to access service
kubectl port-forward svc/sandbox-runtime 8000:8000
```

## Contributing

This is an open source project demonstrating best practices. Contributions are welcome:

- Submit Issues to discuss improvement suggestions
- Fork and create your own sandbox examples
- Improve documentation and translations

## License

MIT License - see [LICENSE](LICENSE) for details
