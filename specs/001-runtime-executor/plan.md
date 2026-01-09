# Implementation Plan: Runtime Executor (sandbox-executor)

**Branch**: `001-runtime-executor` | **Date**: 2025-01-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-runtime-executor/spec.md`

## Summary

Build the **sandbox-executor** - a container-resident daemon that receives code execution requests, executes them in a Bubblewrap sandbox, captures results, and reports them to the Control Plane via internal API callbacks. The executor is the security-critical component that enforces multi-layer isolation (container + process namespace) for untrusted code execution from AI agents.

## Technical Context

**Language/Version**: Python 3.11+ (aligned with Control Plane)
**Primary Dependencies**:
- FastAPI (HTTP API server)
- httpx (async HTTP client for Control Plane callbacks)
- Bubblewrap (bwrap) - system dependency for process isolation
- psutil (resource metrics collection)
- pytest + pytest-asyncio (testing)

**Storage**:
- `/workspace` (mounted volume, typically S3 via CSI Driver in production)
- `/tmp/results/` (local fallback for result persistence during network partitions)

**Testing**: pytest with asyncio support, contract testing via schemathesis or manually

**Target Platform**: Linux containers (Docker or Kubernetes), running as non-root user (UID:GID=1000:1000)

**Project Type**: Single project (executor service)

**Performance Goals**:
- Execution overhead ≤50ms (p95) for simple handlers
- Result reporting ≤200ms (p95) to Control Plane
- Handle 10 concurrent queued executions sequentially
- Base memory ≤100MB

**Constraints**:
- MUST run inside container with pre-installed Bubblewrap binary
- MUST communicate with Control Plane via internal HTTP API
- MUST enforce timeout limits (1-3600s, default 30s)
- MUST NOT spawn threads/processes that escape bwrap isolation

**Scale/Scope**:
- Single executor per container (1:1 mapping)
- ~1000 LOC estimated for core executor logic
- Supports 3 languages: Python, JavaScript, Shell
- 6 user stories (3 P1, 2 P2, 1 P3)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Review the proposed implementation against these core principles from `.specify/memory/constitution.md`:

- **I. Security-First Development**: Does this feature affect isolation layers, container security, or privilege boundaries?
  - [x] Multi-layer isolation maintained (container + Bubblewrap)
  - [x] Least privilege enforced (non-privileged user, dropped capabilities)
  - [x] Input validation for all external inputs
  - [x] Security review required if isolation mechanisms change

- **II. Test-Driven Quality**: Are tests planned for all user-facing functionality?
  - [x] Contract tests defined for API endpoints and inter-service communication
  - [x] Integration tests planned for session lifecycle and multi-component workflows
  - [x] Unit tests planned for business logic
  - [x] Test independence verified (each user story independently testable)

- **III. Performance Standards**: Does this feature have performance requirements?
  - [x] Latency targets defined (if user-facing)
  - [x] Resource limits specified (if applicable)
  - [x] Performance testing planned for critical paths
  - [x] Timeout controls considered

- **IV. Protocol-Driven Design**: Are communication protocols clearly defined?
  - [x] API contracts documented (request/response schemas)
  - [x] RESTful compliance verified
  - [x] Versioning strategy defined (if breaking changes)
  - [x] Error handling follows structured format

- **V. Observability & Debugging**: Is the feature observable in production?
  - [x] Structured logging planned (JSON format with trace IDs)
  - [x] Metrics collection defined (Prometheus)
  - [x] Error messages actionable and user-friendly
  - [x] Debug mode considered

- **VI. User Experience Consistency**: Is the interface consistent with platform standards?
  - [N/A] CLI follows Unix conventions (not applicable - executor is internal service)
  - [N/A] SDK provides high-level and low-level APIs (not applicable)
  - [x] Documentation complete (docstrings, examples, quickstart)
  - [x] Error messages actionable

**Complexity Tracking**: No constitution violations. All principles can be fully satisfied.

## Project Structure

### Documentation (this feature)

```text
specs/001-runtime-executor/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── executor-api.yaml        # Executor HTTP API (OpenAPI 3.0)
│   └── internal-callbacks.yaml  # Control Plane internal API (already exists, reference)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
executor/
├── src/
│   ├── __init__.py
│   ├── main.py              # FastAPI app entry point
│   ├── executor.py          # Core execution logic
│   ├── isolation.py         # Bubblewrap wrapper
│   ├── result_parser.py     # Parse return value from stdout
│   ├── artifact_scanner.py  # Workspace file scanning
│   ├── callback_client.py   # Control Plane API client with retry
│   ├── heartbeat.py         # Heartbeat loop management
│   ├── lifecycle.py         # Container lifecycle hooks
│   └── models.py            # Pydantic models for requests/responses
├── tests/
│   ├── contract/
│   │   ├── test_execute_endpoint.py
│   │   └── test_health_endpoint.py
│   ├── integration/
│   │   ├── test_execution_flow.py
│   │   ├── test_isolation.py
│   │   └── test_callback_retry.py
│   └── unit/
│       ├── test_bwrap_args.py
│       ├── test_result_parser.py
│       └── test_artifact_scanner.py
├── Dockerfile
├── pyproject.toml
└── README.md
```

**Structure Decision**: Single project structure selected. The executor is a self-contained service with clear separation between HTTP API layer (`main.py`), business logic (`executor.py`, `isolation.py`), and supporting utilities. Tests are organized by type (contract/integration/unit) following the constitution's three-tier testing strategy.

## Complexity Tracking

> **No violations - table empty**

All constitution principles can be fully satisfied without introducing unnecessary complexity.
