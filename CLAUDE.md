# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Sandbox Runtime** platform - a secure, isolated code execution environment designed for running untrusted Python code safely. It is part of a Data Agent platform that needs to execute AI-generated or user-submitted code in isolation.

The project consists of two main components:
1. **Shared Environment Server** (FastAPI-based REST API) - manages sandbox sessions, file operations, and code execution
2. **SDK** (Python client library) - for interacting with the sandbox from external applications

## Architecture

### Core Design Patterns

**Two-Component Architecture:**
- `sandbox-runtime/` contains the main implementation with FastAPI server and isolation logic
- The system supports multiple isolation technologies: `bubblewrap` (lightweight, Linux namespaces) and Docker containers (stronger isolation)

**Key Modules:**
- `sandbox-runtime/src/sandbox_runtime/sandbox/` - Core sandbox isolation implementation
- `sandbox-runtime/src/sandbox_runtime/sandbox/shared_env/` - FastAPI server with REST API
- `sandbox-runtime/src/sandbox_runtime/sdk/` - Client SDK for sandbox interaction
- `sandbox-runtime/helm/` - Kubernetes Helm chart for deployment

### Execution Model

The sandbox uses a **warm pool pattern** for performance:
- `AsyncSandboxPool` (`sandbox/async_pool.py`) manages pre-warmed sandbox instances
- `LambdaSandboxExecutor` (`core/executor.py`) executes code in isolated environments
- Resource limits are enforced via cgroups (CPU quota, memory limits, timeout)
- Execution results follow a standardized format with `exit_code`, `stdout`, `stderr`, `result`, and `metrics`

### Configuration

Environment variables control sandbox behavior:
- `SANDBOX_CPU_QUOTA` - CPU quota (default: 2)
- `SANDBOX_MEMORY_LIMIT` - Memory limit in KB (default: 131072)
- `SANDBOX_ALLOW_NETWORK` - Network access (default: true)
- `SANDBOX_TIMEOUT_SECONDS` - Execution timeout (default: 300)
- `SANDBOX_POOL_SIZE` - Warm pool size (default: 2)

## Development Commands

### Installation

```bash
# Install dependencies
cd sandbox-runtime
pip install -e ".[dev]"

# Install system dependency for Linux
sudo apt-get install -y bubblewrap
```

### Running the Server

```bash
# Development mode
cd sandbox-runtime
python -m sandbox_runtime.shared_env.server

# Production mode (from sandbox-runtime directory)
uvicorn sandbox_runtime.shared_env.server:app --host 0.0.0.0 --port 8000 --workers 4
```

### Testing

```bash
# Run all tests (from sandbox-runtime directory)
pytest

# Run specific test file
pytest test/test_sdk.py
pytest test/test_http_api.py
```

### Docker

```bash
# Build image (from repository root)
docker build -t sandbox-runtime -f sandbox-runtime/Dockerfile sandbox-runtime

# Build multi-platform
docker buildx build -t sandbox-runtime --platform=linux/amd64,linux/arm64 -f sandbox-runtime/Dockerfile sandbox-runtime
```

### Kubernetes/Helm

```bash
# Install Helm chart
helm install sandbox-runtime ./sandbox-runtime/helm/sandbox-runtime

# Port forward to access service
kubectl port-forward svc/sandbox-runtime 8000:8000
```

## Important Implementation Details

### API Structure

All REST endpoints are prefixed with `/workspace/se/`:
- `POST /workspace/se/session/{session_id}` - Create session
- `POST /workspace/se/execute_code/{session_id}` - Execute Python code
- `POST /workspace/se/execute/{session_id}` - Execute shell command
- `POST /workspace/se/upload/{session_id}` - Upload file
- `GET /workspace/se/download/{session_id}/{filename}` - Download file

### Code Organization

- `lifespan.py` - FastAPI lifespan management, initializes the global `AsyncSandboxPool` on startup
- `routes/` - API endpoint handlers organized by function (execution, files, session management)
- `models/` - Pydantic models for request/response validation
- `core/executor.py` - Core execution logic that runs code in isolated environments

### Security Considerations

- Code execution is isolated using bubblewrap (Linux) or Docker containers
- Resource limits are enforced via cgroups to prevent resource exhaustion
- File operations are restricted to session directories
- Network access can be disabled per-session via configuration

### Version Management

- Project version is stored in `/VERSION` file
- Helm chart versioning follows semantic versioning with branch-based tags
- Docker images are built for both AMD64 and ARM64 architectures
