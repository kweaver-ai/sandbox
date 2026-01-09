# Implementation Plan: Sandbox Control Plane

**Branch**: `001-control-plane` | **Date**: 2026-01-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-control-plane/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build the Control Plane service for the Sandbox Platform - a FastAPI-based management service that handles API requests, session scheduling, template management, and monitoring. The system uses a stateless architecture with MariaDB for state storage and S3 for workspace persistence, supporting both Docker and Kubernetes container runtimes with intelligent task distribution and warm pool optimization.

## Technical Context

**Language/Version**: Python 3.11+
**Primary Dependencies**: FastAPI (0.104+), Uvicorn (0.24+), Pydantic (2.5+), SQLAlchemy (2.0+ async), aiomysql (0.2+), aiodocker (0.21+), kubernetes (28.0+), boto3 (1.29+), httpx (0.25+), structlog (23.2+)
**Storage**: MariaDB 11.2+ (sessions, executions, templates), S3-compatible object storage (workspace files)
**Testing**: pytest (7.4+), pytest-asyncio (0.21+), httpx for API testing
**Target Platform**: Linux server (Ubuntu 22.04 or Debian 12), Kubernetes cluster (production)
**Project Type**: single (backend service with container scheduler modules)
**Performance Goals**: Session creation ≤ 2s (warm pool), ≤ 5s (cold start); Execution submission ≤ 100ms (p95); 1000 concurrent sessions per instance
**Constraints**: API response ≤ 100ms (p95) for non-blocking ops; Database queries ≤ 50ms (p95); Resource limits: 4 CPU cores, 8GB memory, 50GB disk per session
**Scale/Scope**: 5 user stories (2 P1, 2 P2, 1 P3), 54 functional requirements, 12 success criteria, supports 1000 concurrent sessions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Review the proposed implementation against these core principles from `.specify/memory/constitution.md`:

- **I. Security-First Development**: Does this feature affect isolation layers, container security, or privilege boundaries?
  - [x] Multi-layer isolation maintained (container + Bubblewrap) - System design includes container isolation via Docker/K8s and process isolation via Bubblewrap in executor (not part of this feature but maintained)
  - [x] Least privilege enforced (non-privileged user, dropped capabilities) - Container configs enforce UID:GID=1000:1000, CAP_DROP=ALL
  - [x] Input validation for all external inputs - All API requests validated via Pydantic schemas; template image validation ensures non-privileged user
  - [x] Security review required if isolation mechanisms change - Any changes to container configurations or scheduler require review

- **II. Test-Driven Quality**: Are tests planned for all user-facing functionality?
  - [x] Contract tests defined for API endpoints and inter-service communication - Contract tests for all REST APIs (session, execution, template, file, container management)
  - [x] Integration tests planned for session lifecycle and multi-component workflows - Integration tests for session creation, execution flow, template CRUD, file operations
  - [x] Unit tests planned for business logic - Unit tests for session manager, scheduler, template manager, health probe
  - [x] Test independence verified (each user story independently testable) - Each of 5 user stories can be tested independently; P1 stories provide complete MVP

- **III. Performance Standards**: Does this feature have performance requirements?
  - [x] Latency targets defined (if user-facing) - Session creation ≤ 2s (warm pool), ≤ 5s (cold start); Execution submission ≤ 100ms (p95)
  - [x] Resource limits specified (if applicable) - CPU: 0.5-4 cores, Memory: 256Mi-8Gi, Disk: 1Gi-50Gi per session; 1000 concurrent sessions
  - [x] Performance testing planned for critical paths - Performance tests for scheduler, warm pool, session lifecycle operations
  - [x] Timeout controls considered - Session timeout: 60-3600s; Execution timeout: 1-3600s; enforced at API and executor levels

- **IV. Protocol-Driven Design**: Are communication protocols clearly defined?
  - [x] API contracts documented (request/response schemas) - OpenAPI specs in docs/api/control-plane-api.yaml and internal-api.yaml
  - [x] RESTful compliance verified - All endpoints follow REST principles (appropriate verbs, resource URLs, standard status codes)
  - [x] Versioning strategy defined (if breaking changes) - APIs versioned as /api/v1/; breaking changes require new version
  - [x] Error handling follows structured format - Structured error responses with error_code, description, error_detail, solution

- **V. Observability & Debugging**: Is the feature observable in production?
  - [x] Structured logging planned (JSON format with trace IDs) - structlog for JSON logging; request_id propagation across all operations
  - [x] Metrics collection defined (Prometheus) - Metrics for sessions, executions, latency (p50/p95/p99), resource utilization, cache hit rates
  - [x] Error messages actionable and user-friendly - All errors include error_code, description, error_detail, and solution field
  - [x] Debug mode considered - Configurable log levels; verbose logging for development

- **VI. User Experience Consistency**: Is the interface consistent with platform standards?
  - [x] CLI follows Unix conventions (if applicable) - Not applicable (control plane is REST API only; CLI is separate feature)
  - [x] SDK provides high-level and low-level APIs (if applicable) - Not applicable (SDK is separate feature; control plane provides REST API)
  - [x] Documentation complete (docstrings, examples, quickstart) - All API endpoints documented with docstrings; quickstart.md provides examples
  - [x] Error messages actionable - All errors include resolution guidance; documentation links for common errors

**Complexity Tracking**: No violations - all constitution principles satisfied.

## Project Structure

### Documentation (this feature)

```text
specs/001-control-plane/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── control-plane-api.yaml
│   └── internal-api.yaml
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
sandbox_control_plane/           # Control Plane service (FastAPI application)
├── api/                         # API Gateway - REST endpoint handlers
│   ├── __init__.py
│   ├── main.py                  # FastAPI app initialization
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── sessions.py          # Session management endpoints
│   │   ├── executions.py        # Execution submission and query endpoints
│   │   ├── templates.py         # Template CRUD endpoints
│   │   ├── files.py             # File upload/download endpoints
│   │   ├── containers.py        # Container monitoring endpoints
│   │   └── health.py            # Health check endpoints
│   ├── middleware/
│   │   ├── __init__.py
│   │   ├── auth.py              # Authentication middleware (Bearer token)
│   │   ├── error_handler.py     # Global error handling
│   │   └── request_id.py        # Request ID generation and propagation
│   └── models/
│       ├── __init__.py
│       ├── requests.py          # Request Pydantic models
│       └── responses.py         # Response Pydantic models
│
├── scheduler/                   # Scheduler - intelligent task distribution
│   ├── __init__.py
│   ├── scheduler.py             # Main scheduler logic
│   ├── strategies/
│   │   ├── __init__.py
│   │   ├── warm_pool.py         # Warm pool management
│   │   ├── affinity.py          # Template affinity scoring
│   │   └── load_balance.py      # Load balancing logic
│   └── scoring.py               # Node scoring algorithm
│
├── session_manager/             # Session Manager - session lifecycle management
│   ├── __init__.py
│   ├── manager.py               # Session CRUD operations
│   ├── lifecycle.py             # Session state machine
│   └── cleanup.py               # Automatic session cleanup (background task)
│
├── template_manager/            # Template Manager - template CRUD operations
│   ├── __init__.py
│   ├── manager.py               # Template CRUD operations
│   └── validator.py             # Template validation logic
│
├── container_scheduler/         # Container Scheduler module
│   ├── __init__.py
│   ├── base.py                  # Abstract scheduler interface
│   ├── docker_scheduler.py      # Docker SDK wrapper
│   ├── k8s_scheduler.py         # Kubernetes client wrapper
│   └── warm_pool.py             # Warm pool management
│
├── health_probe/                # Health Probe - container monitoring
│   ├── __init__.py
│   ├── probe.py                 # Health check logic
│   ├── metrics.py               # Metrics collection
│   └── status.py                # Node status tracking
│
├── db/                          # Database layer
│   ├── __init__.py
│   ├── models.py                # SQLAlchemy ORM models
│   ├── session.py               # Database session management
│   └── repositories/
│       ├── __init__.py
│       ├── session.py           # Session repository
│       ├── execution.py         # Execution repository
│       └── template.py          # Template repository
│
├── storage/                     # Storage layer
│   ├── __init__.py
│   ├── s3.py                    # S3 client wrapper
│   └── workspace.py             # Workspace operations
│
├── internal_api/                # Internal API - executor callbacks
│   ├── __init__.py
│   ├── app.py                   # FastAPI sub-app for internal APIs
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── executions.py        # Result/status/heartbeat callbacks
│   │   └── sessions.py          # Container ready/exited callbacks
│   └── auth.py                  # Internal API authentication (INTERNAL_API_TOKEN)
│
├── config/                      # Configuration
│   ├── __init__.py
│   ├── settings.py              # Pydantic settings (environment-based)
│   └── logging.py               # Structured logging configuration
│
└── utils/                       # Utilities
    ├── __init__.py
    ├── id_generator.py          # Session/Execution ID generation
    ├── errors.py                # Custom error classes
    └── validation.py            # Input validation utilities

tests/                             # Test suite
├── contract/                     # Contract tests
│   ├── __init__.py
│   ├── test_sessions_api.py
│   ├── test_executions_api.py
│   ├── test_templates_api.py
│   ├── test_files_api.py
│   └── test_containers_api.py
├── integration/                  # Integration tests
│   ├── __init__.py
│   ├── test_session_lifecycle.py
│   ├── test_code_execution.py
│   ├── test_template_crud.py
│   ├── test_file_operations.py
│   └── test_container_monitoring.py
└── unit/                         # Unit tests
    ├── __init__.py
    ├── test_scheduler.py
    ├── test_session_manager.py
    ├── test_template_manager.py
    ├── test_health_probe.py
    └── test_repositories.py
```

**Structure Decision**: Single backend service (sandbox_control_plane) with modular components. The structure follows the design document's architecture with clear separation of concerns: API layer, business logic (scheduler, managers), container scheduling, database, storage, and utilities. This enables independent development and testing of each component while maintaining a cohesive FastAPI application.
