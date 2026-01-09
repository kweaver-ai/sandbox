# Sandbox Control Plane

A FastAPI-based management service for secure code execution in isolated container environments.

## Overview

The Sandbox Control Plane is a core component of the Sandbox Platform that manages:
- **Session Lifecycle**: Create, monitor, and terminate sandbox execution sessions
- **Code Execution**: Submit Python/JavaScript/Shell code for execution with result retrieval
- **Template Management**: Define and manage sandbox environment templates
- **File Operations**: Upload input files and download execution artifacts
- **Container Monitoring**: Track container health, resource usage, and logs

## Architecture

The system uses a stateless architecture with:
- **MariaDB**: Session and execution state storage
- **S3-compatible storage**: Workspace file persistence
- **Docker/Kubernetes**: Container runtime orchestration
- **Warm Pool**: Pre-instantiated containers for fast session allocation

## Quick Start

### Prerequisites

- Python 3.11+
- MariaDB 11.2+ or MySQL 8.0+
- S3-compatible storage (MinIO or AWS S3)
- Docker Engine (local) or Kubernetes cluster (production)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd sandbox

# Create virtual environment
python3.11 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -e ".[dev]"

# Copy environment configuration
cp .env.example .env
# Edit .env with your configuration

# Run database migrations (when implemented)
# python -m sandbox_control_plane.db migrate

# Start the service
uvicorn sandbox_control_plane.api.main:app --reload
```

### API Documentation

Once running, access the API documentation at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Quick Example

```bash
# Create a session
curl -X POST http://localhost:8000/api/v1/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "python-basic",
    "timeout": 300,
    "resources": {
      "cpu": "1",
      "memory": "512Mi",
      "disk": "1Gi"
    }
  }'

# Execute code
curl -X POST http://localhost:8000/api/v1/sessions/{session_id}/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "def handler(event):\n    return {\"result\": \"hello world\"}",
    "language": "python",
    "timeout": 30
  }'
```

## Development

### Running Tests

```bash
# Run all tests
pytest

# Run specific test categories
pytest tests/contract/
pytest tests/integration/
pytest tests/unit/

# Run with coverage
pytest --cov=sandbox_control_plane --cov-report=html
```

### Code Quality

```bash
# Format code
black sandbox_control_plane/ tests/

# Lint code
flake8 sandbox_control_plane/ tests/

# Type check
mypy sandbox_control_plane/
```

## Project Structure

```
sandbox_control_plane/
├── api/                    # REST API endpoints
│   ├── routes/            # Route handlers
│   ├── middleware/        # Auth, error handling, request ID
│   └── models/            # Pydantic request/response models
├── scheduler/             # Intelligent task distribution
│   └── strategies/        # Warm pool, affinity, load balancing
├── session_manager/       # Session lifecycle management
├── template_manager/      # Template CRUD operations
├── container_scheduler/   # Docker/K8s integration
├── health_probe/          # Container monitoring and metrics
├── db/                    # Database layer
│   └── repositories/      # Data access layer
├── storage/               # S3 integration
├── internal_api/          # Executor callback endpoints
├── config/                # Configuration and logging
└── utils/                 # Utilities (ID generation, validation)

tests/
├── contract/              # API contract tests
├── integration/           # End-to-end workflow tests
└── unit/                  # Unit tests
```

## Documentation

- [Implementation Plan](specs/001-control-plane/plan.md)
- [Data Model](specs/001-control-plane/data-model.md)
- [API Contracts](specs/001-control-plane/contracts/)
- [Quickstart Guide](specs/001-control-plane/quickstart.md)
- [Research Decisions](specs/001-control-plane/research.md)

## License

[Your License Here]

## Contributing

[Your Contributing Guidelines Here]
