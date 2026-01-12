# Sandbox Platform Feature Iteration Roadmap

**Version**: 1.0
**Last Updated**: 2025-01-11
**Status**: Active

---

## Executive Summary

This roadmap outlines the remaining features to implement for the Sandbox Platform based on:
- `docs/sandbox-design-v2.1.md` - Technical architecture specification
- `docs/e2e-integration-plan.md` - Business scenario requirements (PTC data analysis + Q&A)

**Current State**: ~70-80% complete for core Python execution functionality
**Target**: Production-ready platform supporting multi-language execution, Kubernetes deployment, and business-closed-loop scenarios

---

## 1. Implementation Status Summary

### ✅ Fully Implemented

| Component | Status | Location | Notes |
|-----------|--------|----------|-------|
| **Control Plane API** | ✅ Complete | `sandbox_control_plane/src/interfaces/rest/` | Sessions, Executions, Templates, Files, Health endpoints |
| **Database Layer** | ✅ Complete | `sandbox_control_plane/src/infrastructure/persistence/` | MariaDB with SQLAlchemy 2.0 async |
| **Session Manager** | ✅ Complete | `sandbox_control_plane/src/application/` | Lifecycle, CRUD, cleanup service |
| **Docker Scheduler** | ✅ Complete | `sandbox_control_plane/src/infrastructure/docker_scheduler.py` | Basic Docker operations |
| **Executor (Python)** | ✅ Complete | `runtime/executor/` | HTTP server, bwrap isolation, execution |
| **State Sync Service** | ✅ Complete | `sandbox_control_plane/src/application/` | Database-to-container state sync |
| **Background Tasks** | ✅ Complete | `sandbox_control_plane/src/application/` | Session cleanup, health checks |
| **Hexagonal Architecture** | ✅ Complete | Both components | Clean architecture, DI container |
| **Testing Framework** | ✅ Complete | `*/tests/` | Unit, integration, contract tests |
| **docker-compose** | ✅ Complete | `/docker-compose.yml` | Local development setup |

### ⚠️ Partially Implemented

| Component | Status | Gaps | Priority |
|-----------|--------|------|----------|
| **File Storage** | ⚠️ Local only | No actual S3 integration, no presigned URLs | P1 |
| **Container Monitoring** | ⚠️ Basic only | No Prometheus metrics, no detailed health probing | P2 |
| **Template System** | ⚠️ CRUD only | No advanced features (versioning, dependencies) | P2 |
| **Security** | ⚠️ Basic | No rate limiting, no audit logging | P1 |

### ❌ Not Implemented (Prioritized)

| Component | Business Impact | Priority | Est. Effort |
|-----------|----------------|----------|-------------|
| **MinIO File Storage** | No scalable file storage, no session-bound lifecycle | **P1 (Highest)** | 1 week |
| **Kubernetes Scheduler** | No K8s deployment support | **P1 (Highest)** | 1-2 weeks |
| **Runtime Abstraction** | Docker + K8s dual runtime not unified | **P1 (High)** | 1 week |
| **Security Hardening** | Rate limiting, audit logging missing | P1 | 3-5 days |
| **Prometheus Metrics** | No observability integration | **P2 (Lowest)** | 3-5 days |
| **Python Dependency Installation** | No third-party package support (pip install) | **P1 (Highest)** | TBD |

### Deferred (Not Planned)

| Component | Reason |
|-----------|--------|
| **Multi-language Support** | Python only - satisfies current requirements |
| **CLI Tool (sandbox-run)** | Lower priority, can be added on demand |
| **Agent SDK** | Lower priority, can be added on demand |
| **Warm Pool** | Removed based on user feedback |

---

## 2. Roadmap Phases

> **Priority Notes** (from user):
> - Python execution is the primary focus (multi-language support deprioritized)
> - **Docker + K8s Runtime support is HIGH PRIORITY**
> - **Python dependency installation (pip install) is HIGH PRIORITY** - implementation approach TBD
> - SDK/CLI tools are lower priority
> - Warm Pool removed (not implementing)
> - Observability is lowest priority
> - File lifecycle tied to session lifecycle

### Phase 1: Core Production (P1) - 3-4 weeks

**Goal**: Production-ready platform with Docker + K8s dual runtime support and MinIO file storage

#### Sprint 1.1: MinIO File Storage (1 week)
- [ ] Add MinIO to docker-compose for local development
- [ ] Implement S3-compatible storage client (boto3)
- [ ] File upload API: POST /sessions/{id}/files/upload
- [ ] File download API: GET /sessions/{id}/files/{name}
- [ ] Presigned URL generation for downloads (>10MB files)
- [ ] **File lifecycle cleanup**: Delete files when session terminates
- [ ] Tests for file operations

**Files to create/modify**:
- `docker-compose.yml` - Add MinIO service
- `sandbox_control_plane/src/infrastructure/storage/s3_client.py` (new)
- `sandbox_control_plane/src/interfaces/rest/api/v1/files.py` - Implement upload/download
- `sandbox_control_plane/src/application/session_cleanup_service.py` - Add file cleanup on session termination

**Key Design**: File lifecycle is bound to session - when session is terminated, all associated files are automatically deleted from MinIO

#### Sprint 1.2: Kubernetes Runtime Scheduler (1-2 weeks)
- [ ] Implement K8s scheduler using official Python client
- [ ] Pod specification with resource limits and security context
- [ ] PVC for MinIO workspace mounting (via S3 CSI Driver or s3fs sidecar)
- [ ] Pod lifecycle: create, delete, status, logs
- [ ] ServiceAccount and RBAC configuration
- [ ] Runtime node registration (K8s nodes self-register to control plane)
- [ ] Tests for K8s scheduler

**Files to create**:
- `sandbox_control_plane/src/infrastructure/container_scheduler/k8s_scheduler.py`
- `deploy/k8s/control-plane-deployment.yaml`
- `deploy/k8s/executor-pod.yaml`
- `deploy/k8s/rbac.yaml`
- `deploy/k8s/minio-pvc.yaml` (for S3 storage)

**Key Design**: Docker and K8s schedulers share the same interface (`ContainerScheduler` base), allowing runtime selection via configuration

#### Sprint 1.3: Runtime Abstraction & Node Registration (1 week)
- [ ] Refactor Docker scheduler to use common interface
- [ ] Runtime node auto-registration on startup
- [ ] Node health check endpoint for both Docker and K8s
- [ ] Node status tracking in database
- [ ] Scheduler runtime selection logic
- [ ] Tests for dual runtime support

**Files to create/modify**:
- `sandbox_control_plane/src/infrastructure/container_scheduler/base.py` - Enhance abstract interface
- `sandbox_control_plane/src/infrastructure/container_scheduler/docker_scheduler.py` - Refactor to base interface
- `sandbox_control_plane/src/infrastructure/container_scheduler/k8s_scheduler.py` - Implement base interface
- `sandbox_control_plane/src/application/scheduler_service.py` - Runtime selection logic

#### Sprint 1.4: Security Hardening (3-5 days)
- [ ] Rate limiting middleware (slowapi)
- [ ] Audit logging for sensitive operations
- [ ] Input sanitization enhancement
- [ ] Secrets management validation
- [ ] Security tests

**Files to create/modify**:
- `sandbox_control_plane/src/interfaces/rest/middleware/rate_limit.py` (new)
- `sandbox_control_plane/config/logging.py` - Add audit logging

**Deliverable**: Production-ready platform with Docker + K8s dual runtime support

#### Sprint 1.5: Python Dependency Installation (P1 - Highest, Implementation TBD)
- [ ] **Design discussion required**: Implementation approach for pip install support
- [ ] Possible approaches to evaluate:
  - Per-session isolated virtual environments
  - Template-level pre-installed packages
  - Runtime pip install with persistence across executions
  - Hybrid approach (common packages in template + user packages per session)
- [ ] Security considerations:
  - Package verification and sandboxing
  - Dependency conflicts between sessions
  - Disk space management and cleanup
- [ ] API design for dependency management
- [ ] Tests for package installation and isolation

**Status**: HIGH PRIORITY - Implementation approach to be discussed

**Files to create**:
- `runtime/executor/application/dependency_manager.py` (new) - Package installation logic
- `sandbox_control_plane/src/interfaces/rest/api/v1/dependencies.py` (new) - Dependency management API
- Template enhancement to support pre-installed packages

**Deliverable**: Support for third-party Python package installation in sandboxed executions

---

### Phase 2: Observability (P2 - Lowest Priority) - 1-2 weeks

**Goal**: Basic monitoring and operational visibility (can be deferred)

#### Sprint 2.1: Basic Metrics & Health (1 week)
- [ ] Prometheus endpoint `/metrics`
- [ ] Session/execution counters
- [ ] Active sessions gauge
- [ ] Enhanced health check endpoint
- [ ] Component health status (DB, MinIO, runtime nodes)

**Files to create**:
- `sandbox_control_plane/src/interfaces/rest/metrics.py` (new)
- `sandbox_control_plane/src/application/metrics_service.py` (new)
- Update `sandbox_control_plane/src/interfaces/rest/api/v1/health.py`

**Deliverable**: Basic observability for production operations

---

## Future / Optional (Lower Priority)

These items are deprioritized and can be implemented later based on actual user demand:

### Multi-Language Support (Python Only Currently)
- JavaScript/Node.js execution
- Shell script execution
- Language-specific templates
- **Status**: Not planned - Python satisfies current requirements

### Agent SDK
- Python SDK for simplified integration
- Synchronous API wrapper (async polling)
- Session management helpers
- **Status**: Can be added if users request it

### CLI Tool (sandbox-run)
- Command-line interface for local testing
- Event/context data passing
- AWS Lambda compatibility
- **Status**: Can be added if users request it

### Warm Pool
- Pre-warmed container pool for fast startup
- **Status**: Removed - not implementing based on user feedback

---

## 3. Feature vs Business Scenario Mapping

### PTC Data Analysis Scenario (e2e-integration-plan.md §3.1)

| Required Capability | Status | Phase |
|--------------------|--------|-------|
| Session creation & reuse | ✅ Done | - |
| Python code execution (pandas/numpy) | ✅ Done | - |
| File upload to workspace | ⚠️ Local only | 1.1 |
| Multi-step execution | ✅ Done | - |
| Result retrieval | ✅ Done | - |
| Generated file download | ⚠️ Local only | 1.1 |
| Agent SDK (sync wrapper) | ❌ Todo | 2.1 |

### Non-PTC Q&A Scenario (e2e-integration-plan.md §3.2)

| Required Capability | Status | Phase |
|--------------------|--------|-------|
| File upload (PDF/CSV) | ⚠️ Local only | 1.1 |
| File parsing libraries | ⚠️ Python only | 1.3 |
| Multi-round file reading | ✅ Done | - |
| Session persistence | ✅ Done | - |
| Agent SDK | ❌ Todo | 2.1 |

### Unified Temporary Area (e2e-integration-plan.md §4)

| Requirement | Status | Phase |
|-------------|--------|-------|
| File persistence (S3 workspace) | ⚠️ Local only | 1.1 |
| Complex dependency compatibility | ✅ Done | - |
| Dual-layer isolation | ✅ Done | - |
| Session model | ✅ Done | - |

---

## 4. Critical Dependencies

| Feature | Depends On | Blocked |
|---------|-----------|---------|
| K8s Scheduler | S3 workspace mounting | No |
| Agent SDK | Stable API | No |
| Warm Pool | K8s Scheduler | Partially |
| Multi-language | Executor language support | No |
| Metrics | Base implementation | No |

---

## 5. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| S3 mounting performance | High | Evaluate s3fs/geesefs/goofys, implement local cache |
| K8s scheduler complexity | Medium | Reuse existing patterns, incremental testing |
| Multi-language isolation | Medium | Language-specific bwrap configurations |
| Warm pool resource waste | Low | Configurable pool sizes, auto-scaling |

---

## 6. Success Criteria

### Phase 1 Complete When (Core Production):
- [ ] MinIO storage operational with file upload/download
- [ ] Files are automatically deleted when session terminates
- [ ] K8s scheduler creates/manages pods correctly
- [ ] Docker and K8s schedulers share common interface
- [ ] Runtime nodes can be Docker or K8s (selectable via config)
- [ ] Security tests pass (rate limiting, audit logging)
- [ ] **Python dependency installation supported** (implementation approach defined)

### Phase 2 Complete When (Observability - Optional):
- [ ] Prometheus metrics exported at `/metrics`
- [ ] Enhanced health checks show all components (DB, MinIO, runtime nodes)

---

## 7. File Changes Summary

### New Files to Create (Phase 1 - Core Production)

```
# Sprint 1.1: MinIO File Storage
sandbox_control_plane/src/infrastructure/storage/s3_client.py

# Sprint 1.2: Kubernetes Scheduler
sandbox_control_plane/src/infrastructure/container_scheduler/k8s_scheduler.py
deploy/k8s/control-plane-deployment.yaml
deploy/k8s/executor-pod.yaml
deploy/k8s/rbac.yaml
deploy/k8s/minio-pvc.yaml

# Sprint 1.3: Runtime Abstraction
sandbox_control_plane/src/application/scheduler_service.py

# Sprint 1.4: Security
sandbox_control_plane/src/interfaces/rest/middleware/rate_limit.py

# Sprint 1.5: Python Dependency Installation (Implementation TBD)
runtime/executor/application/dependency_manager.py
sandbox_control_plane/src/interfaces/rest/api/v1/dependencies.py

# Phase 2: Observability (Optional)
sandbox_control_plane/src/interfaces/rest/metrics.py
sandbox_control_plane/src/application/metrics_service.py
```

### Key Files to Modify

```
docker-compose.yml                                   # Add MinIO service
sandbox_control_plane/src/interfaces/rest/api/v1/files.py           # Implement upload/download with MinIO
sandbox_control_plane/src/application/session_cleanup_service.py     # Add file cleanup on session termination
sandbox_control_plane/src/infrastructure/container_scheduler/base.py         # Enhance abstract interface
sandbox_control_plane/src/infrastructure/container_scheduler/docker_scheduler.py  # Refactor to base interface
sandbox_control_plane/config/logging.py                                   # Add audit logging
sandbox_control_plane/src/interfaces/rest/api/v1/health.py                 # Enhanced health checks
```

---

## 8. Verification Plan

### E2E Test Scenarios

#### Test 1: PTC Data Analysis (After Phase 1.1 + 2.1)
```python
# 1. Create session
# 2. Upload CSV file to S3 workspace
# 3. Execute pandas data cleaning
# 4. Execute statistical analysis
# 5. Generate matplotlib chart
# 6. Download generated file via presigned URL
```

#### Test 2: Non-PTC File Q&A (After Phase 1.1 + 2.1)
```python
# 1. Create session
# 2. Upload PDF to S3 workspace
# 3. Execute PDF parsing (first 10 pages)
# 4. Execute PDF parsing (next 10 pages) - session reuse
# 5. Verify results accessible
```

#### Test 3: K8s Deployment (After Phase 1.2)
```bash
# 1. Deploy to Minikube/K3s
# 2. Create session
# 3. Verify pod creation
# 4. Execute code
# 5. Verify execution in pod
# 6. Delete session
# 7. Verify pod cleanup
```

---

## 9. Next Actions (Immediate)

1. **Sprint 1.1 (MinIO File Storage)**: Start with highest priority
   - Add MinIO service to `docker-compose.yml`
   - Create S3-compatible storage client
   - Implement file upload/download APIs
   - Add file cleanup on session termination

2. **Sprint 1.2 (K8s Scheduler)**: Begin after MinIO is complete
   - Implement K8s scheduler using official Python client
   - Create K8s deployment manifests
   - Set up PVC for workspace mounting

3. **Sprint 1.3 (Runtime Abstraction)**: Unify Docker and K8s schedulers
   - Enhance base scheduler interface
   - Refactor Docker scheduler to common interface
   - Implement runtime selection logic

4. **Sprint 1.5 (Python Dependency Installation)**: HIGH PRIORITY - Design Discussion Required
   - Evaluate implementation approaches (per-session venv vs template-level vs hybrid)
   - Define API for dependency management
   - Consider security and isolation implications

5. **Documentation**: This roadmap is saved at `docs/roadmap.md` for reference
