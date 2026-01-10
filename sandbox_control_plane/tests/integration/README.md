# Integration Tests

Integration tests for the Sandbox Control Plane. These tests run against a live docker-compose stack to validate end-to-end functionality.

## Prerequisites

- Docker (20.10+)
- docker-compose (v2.0+)
- Python 3.11+
- uv (Python package manager) - Install via: `curl -LsSf https://astral.sh/uv/install.sh | sh`

## Test Structure

```
tests/integration/
├── conftest.py                 # Shared fixtures and configuration
├── test_templates_api.py       # Template CRUD operations
├── test_sessions_api.py        # Session management (legacy location)
├── test_executions_api.py      # Code execution endpoints
├── test_containers_api.py      # Container monitoring
├── test_e2e_workflow.py        # End-to-end workflows
└── README.md                   # This file
```

## Setup

### 1. Build Template Images

Before running tests, build the required Docker images:

```bash
cd /path/to/sandbox

# Build python-basic template (includes executor code)
docker build -t sandbox-template-python-basic:latest -f runtime/executor/Dockerfile .
```

### 2. Start Services

Start the docker-compose stack:

```bash
# From project root
docker-compose up -d

# Verify services are running
docker-compose ps

# Check control plane is healthy
curl http://localhost:8000/api/v1/health
```

Expected output:
```json
{
  "status": "healthy",
  "version": "2.1.0",
  "uptime": ...
}
```

### 3. Install Test Dependencies

```bash
cd sandbox_control_plane

# Install dependencies with uv
uv sync

# Install dev dependencies (includes pytest, httpx, etc.)
uv sync --extra dev
```

## Running Tests

### Run All Integration Tests

```bash
# From sandbox_control_plane directory
uv run pytest tests/integration/ -v
```

### Run Specific Test File

```bash
uv run pytest tests/integration/test_templates_api.py -v
```

### Run Specific Test

```bash
uv run pytest tests/integration/test_executions_api.py::TestExecutionsAPI::test_execute_python_code -v
```

### Run with Coverage

```bash
uv run pytest tests/integration/ --cov=src --cov-report=html --cov-report=term-missing
```

### Run with Verbose Output

```bash
uv run pytest tests/integration/ -vv -s
```

## Test Configuration

Tests use environment variables for configuration:

```bash
# Control plane URL (default: http://localhost:8000)
export CONTROL_PLANE_URL="http://localhost:8000"
```

## Test Data Cleanup

Tests automatically clean up created resources:
- Test sessions are terminated after each test
- Test templates created during tests are deleted
- The `cleanup_test_data` fixture handles cleanup

To manually clean up test data:

```bash
# List all sessions
curl http://localhost:8000/api/v1/sessions

# Delete a specific session
curl -X DELETE http://localhost:8000/api/v1/sessions/{session_id}

# Delete all test sessions (example)
curl http://localhost:8000/api/v1/sessions | jq -r '.[].id' | grep test | xargs -I {} curl -X DELETE http://localhost:8000/api/v1/sessions/{}
```

## Test Fixtures

Key fixtures in `conftest.py`:

| Fixture | Scope | Description |
|---------|-------|-------------|
| `http_client` | session | AsyncClient for API calls |
| `control_plane_ready` | session | Waits for control plane to be healthy |
| `test_template_id` | function | Creates/gets test template |
| `test_session_id` | function | Creates test session (ephemeral) |
| `persistent_session_id` | function | Creates persistent test session |
| `wait_for_execution_completion` | function | Waits for execution to finish |
| `cleanup_test_data` | function | Cleans up test data after test |

## API Endpoints Tested

### Templates (`/api/v1/templates`)
- `POST /templates` - Create template
- `GET /templates` - List templates
- `GET /templates/{id}` - Get template details
- `PUT /templates/{id}` - Update template
- `DELETE /templates/{id}` - Delete template

### Sessions (`/api/v1/sessions`)
- `POST /sessions` - Create session
- `GET /sessions` - List sessions
- `GET /sessions/{id}` - Get session details
- `DELETE /sessions/{id}` - Terminate session

### Executions (`/api/v1/executions`)
- `POST /executions/sessions/{session_id}/execute` - Execute code
- `GET /executions/{execution_id}/status` - Get execution status
- `GET /executions/{execution_id}/result` - Get execution result
- `GET /executions/sessions/{session_id}/executions` - List session executions

### Containers (`/api/v1/containers`)
- `GET /containers` - List containers
- `GET /containers/{id}` - Get container details
- `GET /containers/{id}/logs` - Get container logs

### Health (`/api/v1/health`)
- `GET /health` - Health check

## Troubleshooting

### Control Plane Not Starting

```bash
# Check logs
docker-compose logs control-plane

# Restart service
docker-compose restart control-plane
```

### Database Connection Issues

```bash
# Check MariaDB is running
docker-compose logs mariadb

# Verify database is accessible
docker-compose exec mariadb mysql -uroot -ppassword -e "SHOW DATABASES;"
```

### Template Image Not Found

```bash
# List available images
docker images | grep sandbox

# Rebuild template image (from project root)
docker build -t sandbox-template-python-basic:latest -f runtime/executor/Dockerfile .
```

### Container Network Issues

```bash
# Check network
docker network inspect sandbox_network

# Verify containers can communicate
docker-compose exec control-plane ping mariadb
```

### Tests Timing Out

```bash
# Increase timeout in test (default is 30 seconds for session ready)
# Or check if control plane is under load
curl http://localhost:8000/api/v1/health/detailed
```

### Permission Denied (Docker Socket)

```bash
# Ensure Docker socket is mounted correctly
docker-compose exec control-plane ls -la /var/run/docker.sock

# Check control plane container has Docker access
docker-compose exec control-plane docker ps
```

## Stopping Services

```bash
# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Manual API Testing

### Create Template

```bash
curl -X POST http://localhost:8000/api/v1/templates \
  -H "Content-Type: application/json" \
  -d '{
    "id": "python-basic",
    "name": "Python Basic",
    "image_url": "sandbox-template-python-basic:latest",
    "runtime_type": "python3.11",
    "default_cpu_cores": 1.0,
    "default_memory_mb": 512,
    "default_disk_mb": 1024,
    "default_timeout": 300
  }'
```

### Create Session

```bash
curl -X POST http://localhost:8000/api/v1/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "python-basic",
    "timeout": 300,
    "cpu": "1",
    "memory": "512Mi",
    "disk": "1Gi"
  }'
```

### Execute Code

Note: The sandbox expects AWS Lambda handler syntax.

```bash
SESSION_ID="your_session_id"
curl -X POST http://localhost:8000/api/v1/executions/sessions/$SESSION_ID/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "def handler(event):\n    return {\"message\": \"Hello, World!\"}",
    "language": "python",
    "timeout": 10
  }'
```

### Get Execution Result

```bash
EXECUTION_ID="your_execution_id"
curl http://localhost:8000/api/v1/executions/$EXECUTION_ID/result
```

## CI/CD Integration

For CI/CD pipelines, use the following commands:

```bash
# Build and start services
docker-compose up -d --build

# Wait for services to be healthy
sleep 30

# Run tests
pytest tests/integration/ -v --junitxml=test-results.xml

# Stop services
docker-compose down -v
```
