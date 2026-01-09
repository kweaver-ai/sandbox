# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Sandbox Platform** designed for secure code execution in AI agent applications. The project provides isolated execution environments for running untrusted code, with multi-layer security isolation (container + Bubblewrap).

**Current State**: This is a design-phase repository. The codebase contains comprehensive technical documentation and architecture specifications, but no implementation code exists yet. The project is in the planning and research phase.

## Architecture

### High-Level Design

The system uses a **Control Plane + Container Scheduler** architecture:

- **Control Plane (管理中心)**: FastAPI-based management service handling API requests, scheduling, session management, and monitoring
- **Container Scheduler (容器调度器)**: Internal module that directly calls Docker/K8s APIs
  - **Docker Scheduler**: Accesses Docker socket directly via aiodocker SDK
  - **K8s Scheduler**: Accesses Kubernetes API via ServiceAccount and python client
- **Dual-Layer Isolation**: Container isolation (first layer) + Bubblewrap process isolation (second layer)

### Key Components

1. **Control Plane Components**:
   - API Gateway (FastAPI + Uvicorn)
   - Scheduler with intelligent task distribution (supports ephemeral and persistent session modes)
   - Session Manager with Redis-backed state
   - Template Manager for sandbox environment definitions
   - Health Probe for container monitoring
   - Warm Pool for fast instance startup

2. **Container Scheduler Components**:
   - Docker Scheduler for direct Docker socket access (aiodocker)
   - K8s Scheduler for Kubernetes API access (python client)
   - Executor (sandbox-executor) - HTTP daemon running inside containers that receives execution requests and spawns Bubblewrap-isolated processes

3. **CLI Tool** (`sandbox-run`):
   - Command-line interface for executing Lambda handler functions locally
   - Supports event/context data passing, timeout control, and performance profiling
   - Compatible with AWS Lambda handler specification

### Session Modes

The system supports two session modes with different scheduling strategies:

- **Ephemeral Mode**: One-time execution, container destroyed after completion. Optimal for isolated, stateless tasks.
- **Persistent Mode**: Long-running session that can accept multiple execution requests. Optimal for interactive workflows and stateful operations.

### Protocol Design

The Control Plane exposes RESTful API to external clients, while Container Scheduler directly calls Docker/K8s SDKs:

```
# Session Management
POST   /api/v1/sessions                 # Create session
GET    /api/v1/sessions/{id}            # Get session details
DELETE /api/v1/sessions/{id}            # Terminate session

# Execution
POST   /api/v1/sessions/{id}/execute    # Submit execution task
GET    /api/v1/sessions/{id}/status     # Query execution status
GET    /api/v1/sessions/{id}/result     # Get execution results

# Container Management
GET    /api/v1/containers               # List containers
GET    /api/v1/containers/{id}          # Get container details
GET    /api/v1/containers/{id}/logs     # Get container logs

# Template Management
POST   /api/v1/templates                # Create template
GET    /api/v1/templates                # List templates
```

### Security Model

Multi-layer isolation strategy:

1. **Container Layer**: `NetworkMode=none`, `CAP_DROP=ALL`, non-privileged user (UID:GID=1000:1000)
2. **Bubblewrap Layer**: Namespace isolation (PID/NET/MNT/IPC/UTS), read-only filesystem, seccomp filtering
3. **Resource Limits**: CPU/Memory quotas, process limits, ulimit constraints

### Tech Stack (Planned)

- **Language**: Python 3.11+
- **API Framework**: FastAPI + Uvicorn (async)
- **Container Management**:
  - Docker: aiodocker SDK with direct socket access
  - Kubernetes: official Python client with ServiceAccount authentication
- **State Storage**: Redis
- **Result Storage**: S3-compatible object storage
- **Configuration**: Etcd
- **Isolation**: Bubblewrap (bwrap)
- **Monitoring**: Prometheus metrics

## Key Documentation Files

| File | Purpose |
|------|---------|
| `docs/sandbox-prd-v2.md` | Product Requirements Document - business requirements and goals |
| `docs/sandbox-design-v2.1.md` | Main technical design document - C4 architecture, component design, API specs |
| `docs/sandbox-cli-design.md` | CLI tool specification for local Lambda handler execution |
| `docs/timeout-feature.md` | Timeout control implementation details |
| `docs/sandbox-runtime-v1.md` | AWS Lambda-compatible runtime specification |
| `docs/opensandbox-research.md` | Research on Alibaba OpenSandbox platform |
| `docs/dify-sandbox-research.md` | Research on DifySandbox implementation |
| `docs/multi-runtime-feasibility.md` | Multi-runtime architecture feasibility analysis |

## Important Design Decisions

### Scheduler Behavior

The scheduler implements **Agent-affinity scheduling** for persistent sessions to optimize performance:
- Reuses existing sessions for the same Agent (fastest: 10-50ms)
- Routes to nodes with cached templates (Agent node history)
- Uses Warm Pool for common templates
- Falls back to load-balanced cold start

### Warm Pool Strategy

Pre-instantiated containers are maintained for high-frequency templates:
- Separate pools for ephemeral and persistent modes
- Dynamic sizing based on load patterns
- Idle timeout for resource reclamation

### Timeout Control

Timeout is enforced at multiple levels:
- API level: `asyncio.wait_for()` with configurable timeout
- Event parameter: `__timeout` key in event object (default: 300s, max: 3600s)
- Daemon level: Threading with timeout

The `__timeout` parameter uses double-underscore prefix to avoid conflicts with user business parameters (e.g., a user may have their own `timeout` parameter for business logic).

### CLI Exit Codes

```
0 = Success
1 = General error
2 = File not found or unreadable
3 = Syntax error or handler undefined
4 = Execution timeout
5 = Sandbox initialization failure
```

## When This Project Moves to Implementation

When implementation begins, the expected structure will be:

```
sandbox/
├── control-plane/          # FastAPI control plane service
│   ├── api/               # API route handlers
│   ├── scheduler/         # Task scheduling logic
│   ├── session_manager/   # Session lifecycle management
│   ├── template_manager/  # Template CRUD operations
│   └── container_scheduler/  # Container Scheduler module
│       ├── base.py        # Abstract scheduler interface
│       ├── docker_scheduler.py  # Docker SDK wrapper
│       ├── k8s_scheduler.py     # K8s client wrapper
│       └── warm_pool.py   # Warm pool management
├── executor/              # sandbox-executor daemon
│   ├── http_server.py     # HTTP API server
│   ├── executor.py        # Code execution logic
│   └── isolation.py       # Bubblewrap wrapper
├── cli/                   # CLI tool (sandbox-run)
│   ├── main.py           # CLI entry point
│   ├── runner.py         # Execution wrapper
│   └── formatter.py      # Result formatting
└── sdk/                   # Python SDK for integration
```

Common commands (when implemented):

```bash
# Development
sandbox-run handler.py --event '{"data": "test"}'
python -m control_plane.main

# Testing (expected)
pytest tests/
pytest tests/test_container_scheduler.py -v

# Linting (expected)
black control_plane/ executor/
flake8 control_plane/ executor/
```

## Design Philosophy

- **Protocol-Driven**: All communication via standardized RESTful API
- **Cloud-Native**: Designed for Kubernetes deployment with HPA
- **Security-First**: Multiple isolation layers, defense-in-depth
- **Performance**: Warm Pool, async processing, connection pooling
- **Compatibility**: AWS Lambda handler specification for easy migration

## Active Technologies
- Python 3.11+ + FastAPI (0.104+), Uvicorn (0.24+), Pydantic (2.5+), SQLAlchemy (2.0+ async), aiomysql (0.2+), aiodocker (0.21+), kubernetes (28.0+), boto3 (1.29+), httpx (0.25+), structlog (23.2+) (001-control-plane)
- MariaDB 11.2+ (sessions, executions, templates), S3-compatible object storage (workspace files) (001-control-plane)

## Recent Changes
- 001-control-plane: Added Python 3.11+ + FastAPI (0.104+), Uvicorn (0.24+), Pydantic (2.5+), SQLAlchemy (2.0+ async), aiomysql (0.2+), aiodocker (0.21+), kubernetes (28.0+), boto3 (1.29+), httpx (0.25+), structlog (23.2+)
- 001-runtime-executor: Added Python 3.11+ (aligned with Control Plane)
