# Research: Sandbox Control Plane

**Feature**: Sandbox Control Plane
**Date**: 2026-01-06
**Status**: Complete

## Overview

This document captures research findings and technical decisions for building the Sandbox Control Plane service. All technical choices are derived from the design document (docs/sandbox-design-v2.1.md) and industry best practices for building scalable, secure container orchestration platforms.

## Technology Decisions

### Web Framework

**Decision**: FastAPI with Uvicorn

**Rationale**:
- Native async/await support for high concurrency (1000+ sessions)
- Automatic OpenAPI documentation generation
- Pydantic integration for request/response validation
- Excellent performance (comparable to NodeJS/Go)
- Type hints and Python 3.11+ support

**Alternatives Considered**:
- Flask + Gunicorn: Lacks native async support, requires additional libraries
- Django REST Framework: Heavier weight, more boilerplate, slower performance
- NodeJS (Express/Fastify): Good performance but would split language stack (executor is Python)

### Database

**Decision**: MariaDB 11.2+ with async driver (aiomysql)

**Rationale**:
- Proven reliability for transactional workloads
- ACID compliance for session/execution state consistency
- JSON field support for flexible metadata (env_vars, artifacts, metrics)
- Connection pooling for high concurrency
- Async driver (aiomysql) for non-blocking database operations

**Alternatives Considered**:
- PostgreSQL: Also excellent choice; MariaDB chosen due to existing deployment experience
- MongoDB: No transaction support, weaker consistency guarantees
- Redis: Not suitable for complex queries and relational data

### Object Storage

**Decision**: S3-compatible object storage (MinIO for local, AWS S3 for production)

**Rationale**:
- Workspace files must persist beyond container lifecycle
- S3 API standard with multiple compatible implementations
- Built-in presigned URL support for file downloads
- Scalable to petabyte-scale data
- Cost-effective for infrequently accessed workspace files

**Alternatives Considered**:
- NFS: Complex to manage at scale, no native cloud integration
- Local disk with rsync: Data loss risk, complex synchronization
- Database BLOB storage: Poor performance for large files, database bloat

### Container Runtime

**Decision**: Support both Docker (local dev) and Kubernetes (production)

**Rationale**:
- Docker: Simplest for local development and testing
- Kubernetes: Production-grade orchestration with HPA, self-healing, rolling updates
- Unified abstraction via scheduler interface (ContainerScheduler base class)
- Aiodocker for Docker API access
- Official Python client for Kubernetes API

**Alternatives Considered**:
- Docker only: Not production-ready for high availability
- Containerd: Lower-level API, more complex, less mature Python bindings
- Nomad: Less adoption, smaller ecosystem

### HTTP Client

**Decision**: httpx with async support

**Rationale**:
- Async/await support for non-blocking HTTP calls
- HTTP/2 support for better performance
- Connection pooling and keep-alive
- Timeout and retry configuration
- Better type hints than requests

**Alternatives Considered**:
- aiohttp: More mature but less intuitive API
- requests: Blocking only, not suitable for async services

### Logging

**Decision**: structlog for structured JSON logging

**Rationale**:
- Structured logging with context binding
- JSON output for log aggregation (ELK, Loki, CloudWatch)
- Request ID propagation
- Filterable log levels in production
- Easy integration with Prometheus metrics

**Alternatives Considered**:
- standard library logging: No structured output by default
- Loguru: More features but heavier dependency

## Architecture Patterns

### Session Scheduling

**Decision**: Multi-tier scheduling strategy

**Pattern**: Priority-based scheduling with fallback tiers:
1. Warm Pool: Pre-instantiated containers (fastest: 100ms)
2. Template Affinity: Nodes with cached images (fast: 1-2s)
3. Load Balancing: Select least-loaded node (acceptable: 2-5s)

**Rationale**: Optimizes for common case (high-frequency templates) while maintaining flexibility for edge cases

### Stateless Architecture

**Decision**: Stateless control plane with external state storage

**Pattern**:
- Control plane: No in-memory session state
- MariaDB: All session/execution state
- S3: All workspace files
- Containers can be recreated on any node without data loss

**Rationale**: Enables horizontal scaling, fault tolerance, and graceful restarts

### Idempotent Result Reporting

**Decision**: Idempotency keys for executor result callbacks

**Pattern**:
- Executor includes `Idempotency-Key: {execution_id}_result` header
- Control plane returns existing result on duplicate submission
- Prevents duplicate execution records on network retries

**Rationale**: Executor callbacks may fail due to network issues; idempotency prevents data inconsistency

## Database Schema

**Decision**: Relational schema with JSON extensions

**Pattern**:
- Core fields in typed columns (status, runtime_type, resources)
- Flexible metadata in JSON columns (env_vars, artifacts, metrics, return_value)
- Indexes on frequently queried fields (status, template_id, created_at, last_activity_at)
- Foreign key constraints with CASCADE deletion

**Rationale**: Balance between query performance and schema flexibility

## Error Handling Strategy

**Decision**: Structured error responses with actionable guidance

**Pattern**:
```python
{
    "error_code": "Sandbox.SessionNotFound",
    "description": "Session not found",
    "error_detail": "Session 'sess_abc123' does not exist or has been terminated",
    "solution": "Please check the session_id or create a new session"
}
```

**Rationale**: Clear error messages reduce support burden and improve developer experience

## Testing Strategy

**Decision**: Three-tier testing pyramid

**Pattern**:
1. Contract Tests: Verify API contracts (request/response schemas, status codes)
2. Integration Tests: Verify end-to-end workflows (session lifecycle, execution flow)
3. Unit Tests: Verify business logic (scheduler scoring, template validation)

**Rationale**: Balances test coverage with maintenance cost; catches bugs at appropriate level

## Performance Optimization

**Decision**: Connection pooling + async operations

**Pattern**:
- Database: SQLAlchemy async engine with connection pool (pool_size=20, max_overflow=40)
- HTTP: httpx with connection limits and keep-alive
- All I/O operations: Async/await with asyncio.gather for parallel operations

**Rationale**: Enables handling 1000+ concurrent sessions without thread overhead

## Security Considerations

**Decision**: Defense-in-depth with least privilege

**Pattern**:
- API authentication: Bearer token (pluggable middleware)
- Internal API: INTERNAL_API_TOKEN (environment variable)
- Container isolation: Non-privileged user (UID:GID=1000:1000), dropped capabilities
- Network isolation: NetworkMode=none unless explicitly enabled
- Input validation: Pydantic schemas for all requests

**Rationale**: Multiple security layers prevent single point of failure

## Observability

**Decision**: Structured logging + Prometheus metrics + health checks

**Pattern**:
- Logs: JSON format with timestamp, level, request_id, component, context
- Metrics: Counter (session creation rate), Gauge (active sessions), Histogram (latency)
- Health: /health endpoint checking database, S3, and runtime connectivity

**Rationale**: Provides complete operational visibility for debugging and monitoring

## Conclusion

All technical decisions align with industry best practices for building scalable, secure, and observable container orchestration platforms. The chosen technology stack (FastAPI, MariaDB, S3, Docker/Kubernetes) provides a solid foundation for the Sandbox Control Plane service.
