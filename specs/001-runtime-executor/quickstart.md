# Quickstart: Runtime Executor (sandbox-executor)

**Feature**: 001-runtime-executor
**Last Updated**: 2025-01-06

## Overview

The **sandbox-executor** is a container-resident daemon that executes untrusted code in a secure, isolated environment. This guide will help you get started with running and testing the executor locally.

## Prerequisites

- Docker Desktop or Docker Engine installed
- Python 3.11+ installed locally (for development)
- Basic understanding of HTTP APIs and JSON

## Quick Start (5 Minutes)

### 1. Build the Executor Image

```bash
# Clone the repository
git clone <repository-url>
cd sandbox-runtime-executor/executor

# Build the Docker image
docker build -t sandbox-executor:dev .

# Verify the image
docker images | grep sandbox-executor
```

### 2. Run the Executor Container

```bash
# Start the executor container
docker run -d \
  --name sandbox-executor \
  -p 8080:8080 \
  -e CONTROL_PLANE_URL=http://localhost:8000 \
  -e INTERNAL_API_TOKEN=dev-token-change-me \
  sandbox-executor:dev

# Check logs
docker logs -f sandbox-executor

# Verify health
curl http://localhost:8080/health
```

Expected output:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime_seconds": 1.5,
  "active_executions": 0
}
```

### 3. Execute Your First Code

```bash
# Execute Python code
curl -X POST http://localhost:8080/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "def handler(event):\n    return {\"message\": \"Hello\", \"input\": event.get(\"name\", \"World\")}",
    "language": "python",
    "timeout": 10,
    "stdin": "{\"name\": \"Alice\"}",
    "execution_id": "exec_test_001"
  }'
```

Expected output:
```json
{
  "status": "success",
  "stdout": "\n===SANDBOX_RESULT===\n{\"message\": \"Hello\", \"input\": \"Alice\"}\n===SANDBOX_RESULT_END===\n",
  "stderr": "",
  "exit_code": 0,
  "execution_time": 0.082,
  "return_value": {
    "message": "Hello",
    "input": "Alice"
  },
  "metrics": {
    "duration_ms": 82.3,
    "cpu_time_ms": 76.1,
    "peak_memory_mb": 45.2
  },
  "artifacts": []
}
```

### 4. Test Error Handling

```bash
# Test syntax error
curl -X POST http://localhost:8080/health \
  -H "Content-Type: application/json" \
  -d '{
    "code": "def handler(event:\n    return x",
    "language": "python",
    "timeout": 10,
    "stdin": "{}",
    "execution_id": "exec_test_002"
  }'
```

Expected output (status: failed with traceback in stderr):
```json
{
  "status": "failed",
  "stdout": "",
  "stderr": "  File \"<string>\", line 1\n    def handler(event:\n                    ^\nSyntaxError: invalid syntax\n",
  "exit_code": 1,
  "execution_time": 0.015,
  "return_value": null,
  "metrics": {
    "duration_ms": 15.2
  },
  "artifacts": []
}
```

### 5. Cleanup

```bash
# Stop the container
docker stop sandbox-executor

# Remove the container
docker rm sandbox-executor

# Remove the image (optional)
docker rmi sandbox-executor:dev
```

## Development Workflow

### Local Development (Without Docker)

```bash
# Navigate to executor directory
cd executor

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -e ".[dev]"

# Run the executor
python -m src.main

# In another terminal, test with curl
curl http://localhost:8080/health
```

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run specific test category
pytest tests/contract/
pytest tests/integration/
pytest tests/unit/

# Run specific test file
pytest tests/unit/test_result_parser.py -v
```

### Code Quality Checks

```bash
# Format code
black src/ tests/

# Check linting
flake8 src/ tests/

# Type checking
mypy src/
```

## Common Use Cases

### Execute Python Code with File Output

```python
# Code that writes a file
code = """
import json

def handler(event):
    data = {"results": [1, 2, 3]}
    with open("output.json", "w") as f:
        json.dump(data, f)
    return {"status": "ok", "file": "output.json"}
"""

curl -X POST http://localhost:8080/execute \
  -H "Content-Type: application/json" \
  -d "{
    \"code\": \"$(echo "$code" | jq -Rs .)\",
    \"language\": \"python\",
    \"timeout\": 10,
    \"stdin\": \"{}\",
    \"execution_id\": \"exec_test_003\"
  }"
```

### Execute JavaScript Code

```bash
curl -X POST http://localhost:8080/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "console.log(\"Hello from Node.js\"); process.exit(0);",
    "language": "javascript",
    "timeout": 5,
    "stdin": "",
    "execution_id": "exec_test_004"
  }'
```

### Execute Shell Script

```bash
curl -X POST http://localhost:8080/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "echo \"Hello from Bash\" && date",
    "language": "shell",
    "timeout": 5,
    "stdin": "",
    "execution_id": "exec_test_005"
  }'
```

### Test Timeout Enforcement

```bash
# Code that sleeps for 60 seconds (timeout is 10s)
curl -X POST http://localhost:8080/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "import time; time.sleep(60); print(\"Done\")",
    "language": "python",
    "timeout": 10,
    "stdin": "{}",
    "execution_id": "exec_test_006"
  }'
```

Expected: Returns after 10 seconds with status: timeout

### Test Isolation (Escape Attempts)

```bash
# Try to read /etc/passwd (should fail)
curl -X POST http://localhost:8080/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "with open(\"/etc/passwd\", \"r\") as f: print(f.read())",
    "language": "python",
    "timeout": 5,
    "stdin": "{}",
    "execution_id": "exec_test_007"
  }'
```

Expected: Fails with permission error (file not accessible due to bwrap isolation)

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CONTROL_PLANE_URL` | Yes | - | Control Plane base URL for callbacks |
| `INTERNAL_API_TOKEN` | Yes | - | API token for internal callbacks |
| `EXECUTOR_PORT` | No | 8080 | HTTP API port |
| `LOG_LEVEL` | No | INFO | Logging level (DEBUG, INFO, WARNING, ERROR) |
| `WORKSPACE_PATH` | No | /workspace | Workspace directory for file operations |

## Troubleshooting

### Executor Fails to Start

**Problem**: Container exits immediately after starting

**Solution**:
```bash
# Check logs
docker logs sandbox-executor

# Common issues:
# 1. Bubblewrap not installed → Verify Dockerfile includes bwrap
# 2. Port already in use → Change port mapping: -p 8081:8080
# 3. Missing environment variables → Verify CONTROL_PLANE_URL and INTERNAL_API_TOKEN
```

### Health Check Returns 503

**Problem**: `/health` endpoint returns unhealthy status

**Solution**:
```bash
# Check logs for specific reason
curl http://localhost:8080/health

# Common reasons:
# 1. Bubblewrap binary not found → Install bubblewrap in container
# 2. Workspace directory not accessible → Check volume mounts
# 3. Control Plane unreachable → Verify CONTROL_PLANE_URL
```

### Execution Stuck/Timeout

**Problem**: Execution hangs or exceeds timeout

**Solution**:
```bash
# Check active executions
curl http://localhost:8080/health | jq '.active_executions'

# Verify timeout enforcement
# - Process should be killed after timeout
# - Status should be "timeout" with exit_code -1

# If hanging:
# 1. Check if bwrap process is still running: docker exec sandbox-executor ps aux
# 2. Check container resource limits: docker inspect sandbox-executor
# 3. Increase timeout if code legitimately needs more time
```

### Callback Failures

**Problem**: Results not reaching Control Plane

**Solution**:
```bash
# Check executor logs for callback errors
docker logs sandbox-executor | grep "callback\|report_result"

# Verify Control Plane accessibility
docker exec sandbox-executor curl $CONTROL_PLANE_URL/health

# Check local fallback
docker exec sandbox-executor ls -la /tmp/results/

# Common issues:
# 1. Network partition → Wait for recovery, executor will retry
# 2. Invalid token → Verify INTERNAL_API_TOKEN matches Control Plane
# 3. Control Plane down → Check Control Plane logs
```

## Next Steps

- **Integration**: See [Internal API Reference](../api/internal-api.yaml) for callback endpoints
- **Architecture**: Read [Architecture Design](../../docs/sandbox-design-v2.1.md#23-执行器-executor) for details
- **Testing**: Review [Test Strategy](plan.md#testing-requirements) for comprehensive testing
- **Security**: Consult [Security Design](../../docs/sandbox-design-v2.1.md#6-安全设计) for isolation details

## Getting Help

- **Documentation**: See `/docs` directory for design documents
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Use GitHub Discussions for questions
