# Tasks: Sandbox Control Plane

**Input**: Design documents from `/specs/001-control-plane/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/
**Feature Branch**: `001-control-plane`
**Generated**: 2026-01-06

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- **File paths**: Included for implementation clarity

## Path Conventions

This is a single backend service project located at repository root:
- **Source code**: `sandbox_control_plane/`
- **Tests**: `sandbox_control_plane/tests/`
- **API contracts**: `specs/001-control-plane/contracts/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependency installation, and basic project structure

- [X] T001 Create project directory structure per plan.md in sandbox_control_plane/
- [X] T002 Create Python 3.11+ project with pyproject.toml and dependencies (FastAPI 0.104+, Uvicorn 0.24+, Pydantic 2.5+, SQLAlchemy 2.0+, aiomysql 0.2+, aiodocker 0.21+, kubernetes 28.0+, boto3 1.29+, httpx 0.25+, structlog 23.2+)
- [X] T003 [P] Configure pytest and pytest-asyncio for testing in pyproject.toml
- [X] T004 [P] Configure black (line length 100), flake8, and mypy for linting in pyproject.toml
- [X] T005 [P] Create .env.example file with required environment variables (DATABASE_URL, S3_ENDPOINT, INTERNAL_API_TOKEN, LOG_LEVEL)
- [X] T006 [P] Create .gitignore file for Python projects (__pycache__, .venv, .env, *.pyc)
- [X] T007 Create README.md with project overview, setup instructions, and quickstart reference

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Configuration & Logging

- [X] T008 [P] Create Pydantic settings in sandbox_control_plane/config/settings.py with environment-based configuration (database, S3, container runtime, logging)
- [X] T009 [P] Configure structlog JSON logging in sandbox_control_plane/config/logging.py with request_id propagation and context binding
- [X] T010 Create custom error classes in sandbox_control_plane/utils/errors.py (SandboxError, SessionNotFoundError, ExecutionNotFoundError, InvalidParameterError)

### Database Layer

- [X] T011 Create SQLAlchemy async engine and session management in sandbox_control_plane/db/session.py (pool_size=20, max_overflow=40, pool_recycle=3600)
- [X] T012 [P] Create base ORM model with timestamp fields in sandbox_control_plane/db/models.py
- [X] T013 [P] Create Template ORM model in sandbox_control_plane/db/models.py (id, name, image_url, runtime_type, default_resources, is_active, created_at, updated_at)
- [X] T014 [P] Create Session ORM model in sandbox_control_plane/db/models.py (id, template_id, status, mode, runtime_type, resources, env_vars JSON, container_id, node_id, workspace_s3_path, executor_url, created_at, started_at, terminated_at, last_activity_at, expires_at)
- [X] T015 [P] Create Execution ORM model in sandbox_control_plane/db/models.py (id, session_id FK, status, code, language, event_data JSON, timeout_sec, return_value JSON, stdout, stderr, exit_code, metrics JSON, created_at, started_at, completed_at)
- [X] T016 [P] Create Container ORM model in sandbox_control_plane/db/models.py (id PK, session_id FK, runtime_type, node_id, container_name, image_url, status, ip_address, executor_port, resources, created_at, started_at, exited_at)
- [X] T017 [P] Create Artifact ORM model in sandbox_control_plane/db/models.py (id, execution_id FK, artifact_type, name, s3_path, size_bytes, content_type, created_at)
- [X] T018 [P] Create RuntimeNode ORM model in sandbox_control_plane/db/models.py (node_id PK, hostname, runtime_type, ip_address, api_endpoint, status, total resources, allocated resources, cached_images JSON, labels JSON, last_heartbeat_at)
- [X] T019 Create database indexes for foreign keys and frequently queried fields (status, template_id, created_at, last_activity_at, expires_at)
- [X] T020 [P] Create Session repository in sandbox_control_plane/db/repositories/session.py (CRUD operations, status transitions, queries by agent_id for affinity)
- [X] T021 [P] Create Execution repository in sandbox_control_plane/db/repositories/execution.py (CRUD operations, status updates, idempotent result reporting)
- [X] T022 [P] Create Template repository in sandbox_control_plane/db/repositories/template.py (CRUD operations, active templates query)

### Storage Layer

- [X] T023 [P] Create S3 client wrapper in sandbox_control_plane/storage/s3.py (presigned URLs, file upload/download, bucket operations using boto3)
- [X] T024 [P] Create workspace operations in sandbox_control_plane/storage/workspace.py (upload workspace files, download workspace files, list artifacts, S3 path generation)

### FastAPI Application Structure

- [X] T025 Initialize FastAPI application in sandbox_control_plane/api/main.py with CORS middleware, global exception handler, and request ID middleware
- [X] T026 [P] Create request ID middleware in sandbox_control_plane/api/middleware/request_id.py (generate UUID, add to context, propagate to logging)
- [X] T027 [P] Create authentication middleware in sandbox_control_plane/api/middleware/auth.py (Bearer token validation for external API, INTERNAL_API_TOKEN for internal API)
- [X] T028 [P] Create global error handler in sandbox_control_plane/api/middleware/error_handler.py (structured error responses with error_code, description, error_detail, solution)
- [X] T029 [P] Create request Pydantic models in sandbox_control_plane/api/models/requests.py (CreateSessionRequest, ExecuteRequest, CreateTemplateRequest, UploadFileRequest)
- [X] T030 [P] Create response Pydantic models in sandbox_control_plane/api/models/responses.py (SessionResponse, ExecutionResponse, TemplateResponse, ContainerInfo, Error)
- [X] T031 Create utility functions in sandbox_control_plane/utils/id_generator.py (generate session_id: sess_[a-z0-9]{16}, generate execution_id: exec_[0-9]{8}_[a-z0-9]{8}, generate artifact_id: art_[a-z0-9]{16})
- [X] T032 Create input validation utilities in sandbox_control_plane/utils/validation.py (validate resource limits, validate timeout ranges, validate JSON fields)

### Internal API Sub-Application

- [X] T033 Initialize FastAPI sub-app for internal APIs in sandbox_control_plane/internal_api/app.py (mounted at /internal, INTERNAL_API_TOKEN authentication)
- [X] T034 Create internal API authentication in sandbox_control_plane/internal_api/auth.py (validate INTERNAL_API_TOKEN from environment)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Session Lifecycle Management (Priority: P1) 🎯 MVP

**Goal**: Create, manage, and terminate sandbox execution sessions with automatic cleanup

**Independent Test**: Create a session with template "python-basic", query its status (creating → running), and terminate it. Verify session is marked "terminated" and resources are released.

### Contract Tests for User Story 1

- [X] T035 [P] [US1] Contract test for POST /sessions in sandbox_control_plane/sandbox_control_plane/tests/integration/api/test_sessions_api.py (validate CreateSessionRequest, SessionResponse schema, 201 status)
- [X] T036 [P] [US1] Contract test for GET /sessions/{id} in sandbox_control_plane/sandbox_control_plane/tests/integration/api/test_sessions_api.py (validate SessionResponse schema, 404 for non-existent session)
- [X] T037 [P] [US1] Contract test for DELETE /sessions/{id} in sandbox_control_plane/sandbox_control_plane/tests/integration/api/test_sessions_api.py (validate termination response, 404 for non-existent session)
- [X] T038 [P] [US1] Contract test for GET /sessions with filters in sandbox_control_plane/sandbox_control_plane/tests/integration/api/test_sessions_api.py (validate pagination, status filter, template_id filter)
- [X] T039 [P] [US1] Contract test for POST /internal/sessions/{id}/container_ready in sandbox_control_plane/sandbox_control_plane/tests/integration/api/test_internal_api.py (validate container ready callback)
- [X] T040 [P] [US1] Contract test for POST /internal/sessions/{id}/container_exited in sandbox_control_plane/sandbox_control_plane/tests/integration/api/test_internal_api.py (validate container exit callback with exit_code)

### Integration Tests for User Story 1

- [X] T041 [P] [US1] Integration test for session lifecycle in sandbox_control_plane/tests/integration/test_session_lifecycle.py (create → creating status, container_ready callback → running status, terminate → terminated status)
- [X] T042 [P] [US1] Integration test for session timeout in sandbox_control_plane/tests/integration/test_session_lifecycle.py (create session with short timeout, verify auto-cleanup after expires_at)
- [X] T043 [P] [US1] Integration test for session not found errors in sandbox_control_plane/tests/integration/test_session_lifecycle.py (query non-existent session, verify structured error with actionable guidance)

### Implementation for User Story 1

#### Session Manager

- [X] T044 [P] [US1] Create Session lifecycle state machine in sandbox_control_plane/session_manager/lifecycle.py (creating → running → completed/failed/timeout/terminated transitions, validation rules)
- [X] T045 [P] [US1] Create Session CRUD operations in sandbox_control_plane/session_manager/manager.py (create session with template validation, update session status, get session by id, list sessions with filters)
- [X] T046 [US1] Implement session creation logic in sandbox_control_plane/session_manager/manager.py (generate session_id, assign runtime node, initialize S3 workspace path, set expires_at = created_at + timeout, validate resource limits)
- [X] T047 [US1] Implement session termination logic in sandbox_control_plane/session_manager/manager.py (destroy container via container scheduler, preserve S3 workspace for 24h, update status to terminated, set terminated_at timestamp)
- [X] T048 [US1] Create automatic session cleanup in sandbox_control_plane/session_manager/cleanup.py (background task to find sessions with last_activity_at < 30min or expires_at < now, terminate sessions, log cleanup actions)
- [X] T049 [US1] Implement session status query in sandbox_control_plane/session_manager/manager.py (get session with current status, runtime_node, container_id, workspace_path, resources, uptime calculation)

#### Container Scheduler Interface

- [X] T050 [P] [US1] Create ContainerScheduler base class in sandbox_control_plane/container_scheduler/base.py (abstract methods: create_container, destroy_container, get_container_status, get_container_logs)
- [X] T051 [P] [US1] Create Docker scheduler implementation in sandbox_control_plane/container_scheduler/docker_scheduler.py (aiodocker client, create container with image and env vars, start container, inspect status, stop/remove container, get logs)
- [X] T052 [P] [US1] Create Kubernetes scheduler implementation in sandbox_control_plane/container_scheduler/k8s_scheduler.py (python client, create pod with resource limits, delete pod, get pod status, get pod logs)
- [X] T053 [US1] Implement container creation flow in sandbox_control_plane/session_manager/manager.py (call scheduler.create_container, update session with container_id, wait for container_ready callback, set status to running)

#### API Routes

- [X] T054 [US1] Implement POST /sessions endpoint in sandbox_control_plane/api/routes/sessions.py (validate CreateSessionRequest, call session_manager.create, return SessionResponse with 201)
- [X] T055 [US1] Implement GET /sessions/{id} endpoint in sandbox_control_plane/api/routes/sessions.py (query session by id, return SessionResponse with 200, raise SessionNotFoundError with 404)
- [X] T056 [US1] Implement GET /sessions with filters endpoint in sandbox_control_plane/api/routes/sessions.py (parse status, template_id, limit, offset params, query sessions, return paginated list)
- [X] T057 [US1] Implement DELETE /sessions/{id} endpoint in sandbox_control_plane/api/routes/sessions.py (call session_manager.terminate, return success message with 200, raise SessionNotFoundError with 404)

#### Internal API Routes

- [X] T058 [US1] Implement POST /internal/sessions/{id}/container_ready in sandbox_control_plane/internal_api/routes/sessions.py (validate INTERNAL_API_TOKEN, update session.status = running, set started_at, store executor_url from request)
- [X] T059 [US1] Implement POST /internal/sessions/{id}/container_exited in sandbox_control_plane/internal_api/routes/sessions.py (validate INTERNAL_API_TOKEN, update session.status based on exit_code, set terminated_at, trigger cleanup if needed)

#### Unit Tests for User Story 1

- [X] T060 [P] [US1] Unit test for Session lifecycle in sandbox_control_plane/tests/unit/test_session_manager.py (validate state transitions, status update logic, expires_at calculation)
- [X] T061 [P] [US1] Unit test for Session cleanup in sandbox_control_plane/tests/unit/test_session_manager.py (validate idle session detection, expired session detection, cleanup invocation)
- [X] T062 [P] [US1] Unit test for Session repository in sandbox_control_plane/tests/unit/test_repositories.py (validate CRUD operations, status queries, agent_id queries for affinity)

**Checkpoint**: At this point, User Story 1 should be fully functional - users can create sessions, query status, and terminate sessions. Test independently before proceeding.

---

## Phase 4: User Story 2 - Code Execution & Result Retrieval (Priority: P1) 🎯 MVP

**Goal**: Submit code for execution and retrieve results (stdout, stderr, return value, metrics)

**Independent Test**: Create a session, submit Python code with handler function, poll execution status (pending → running → completed), and retrieve results with stdout, stderr, exit_code, return_value, and metrics.

### Contract Tests for User Story 2

- [X] T063 [P] [US2] Contract test for POST /sessions/{id}/execute in sandbox_control_plane/sandbox_control_plane/tests/integration/api/test_executions_api.py (validate ExecuteRequest, ExecuteResponse schema, 200 status with execution_id)
- [X] T064 [P] [US2] Contract test for GET /executions/{id}/status in sandbox_control_plane/sandbox_control_plane/tests/integration/api/test_executions_api.py (validate ExecutionStatus schema, status values: pending/running/completed/failed/timeout)
- [X] T065 [P] [US2] Contract test for GET /executions/{id}/result in sandbox_control_plane/sandbox_control_plane/tests/integration/api/test_executions_api.py (validate ExecutionResult schema with stdout/stderr/exit_code/return_value/metrics/artifacts)
- [X] T066 [P] [US2] Contract test for GET /sessions/{id}/executions in sandbox_control_plane/sandbox_control_plane/tests/integration/api/test_executions_api.py (validate execution list with pagination and status filter)
- [X] T067 [P] [US2] Contract test for POST /internal/executions/{id}/result in sandbox_control_plane/sandbox_control_plane/tests/integration/api/test_internal_api.py (validate ExecutionResultReport, idempotency via Idempotency-Key header)
- [X] T068 [P] [US2] Contract test for POST /internal/executions/{id}/status in sandbox_control_plane/sandbox_control_plane/tests/integration/api/test_internal_api.py (validate ExecutionStatusReport for running/timeout/crashed)
- [X] T069 [P] [US2] Contract test for POST /internal/executions/{id}/heartbeat in sandbox_control_plane/sandbox_control_plane/tests/integration/api/test_internal_api.py (validate heartbeat timestamp update)
- [X] T070 [P] [US2] Contract test for POST /internal/executions/{id}/artifacts in sandbox_control_plane/sandbox_control_plane/tests/integration/api/test_internal_api.py (validate ArtifactMetadata list)

### Integration Tests for User Story 2

- [X] T071 [P] [US2] Integration test for code execution flow in sandbox_control_plane/tests/integration/test_code_execution.py (create session, submit execution, poll status until completed, retrieve results)
- [X] T072 [P] [US2] Integration test for execution timeout in sandbox_control_plane/tests/integration/test_code_execution.py (submit execution with 1s timeout, handler sleeps for 5s, verify status = timeout)
- [X] T073 [P] [US2] Integration test for execution failure in sandbox_control_plane/tests/integration/test_code_execution.py (submit code with syntax error, verify status = failed, stderr contains traceback)
- [X] T074 [P] [US2] Integration test for heartbeat timeout and crash detection in sandbox_control_plane/tests/integration/test_code_execution.py (submit execution, stop heartbeat, wait 15s, verify status = crashed)
- [X] T075 [P] [US2] Integration test for idempotent result reporting in sandbox_control_plane/tests/integration/test_code_execution.py (submit same result twice with Idempotency-Key, verify only one execution record created)

### Implementation for User Story 2

#### Execution Submission

- [X] T076 [US2] Implement execution submission logic in sandbox_control_plane/api/routes/executions.py (validate session exists and is running, generate execution_id, create execution record with status = pending, submit to executor via HTTP POST to {executor_url}/execute, return execution_id)
- [X] T077 [US2] Implement executor HTTP client in sandbox_control_plane/api/routes/executions.py (use httpx to POST execute request, include code, language, event_data, timeout, execution_id in request body, handle connection errors)
- [X] T078 [US2] Implement execution status query in sandbox_control_plane/api/routes/executions.py (query execution by id, return status, created_at, started_at, completed_at timestamps)

#### Execution Result Processing

- [X] T079 [US2] Implement result callback handler in sandbox_control_plane/internal_api/routes/executions.py (validate INTERNAL_API_TOKEN, check Idempotency-Key header for idempotency, update execution record with stdout/stderr/exit_code/return_value/metrics/artifacts, set status = completed/failed/timeout, set completed_at timestamp, return 200 or 201)
- [X] T080 [US2] Implement status callback handler in sandbox_control_plane/internal_api/routes/executions.py (validate INTERNAL_API_TOKEN, update execution status to running/timeout/crashed, set started_at/crashed_at/timeout_at, store error message if crashed)
- [X] T081 [US2] Implement heartbeat handler in sandbox_control_plane/internal_api/routes/executions.py (validate INTERNAL_API_TOKEN, update last_activity_at timestamp, store optional progress data)
- [X] T082 [US2] Implement artifact reporting handler in sandbox_control_plane/internal_api/routes/executions.py (validate INTERNAL_API_TOKEN, create artifact records with s3_path, size_bytes, mime_type, type)
- [X] T083 [US2] Implement execution result retrieval in sandbox_control_plane/api/routes/executions.py (query execution by id, return stdout/stderr/exit_code/return_value/metrics/artifacts, truncate stdout/stderr to 1MB if exceeded)
- [X] T084 [US2] Implement session executions list in sandbox_control_plane/api/routes/executions.py (query executions by session_id, filter by status, paginate, return execution summaries)

#### Crash Detection & Retry

- [X] T085 [US2] Implement heartbeat timeout detection in sandbox_control_plane/session_manager/cleanup.py (background task to find executions with last_activity_at < 15s and status in [pending, running], mark as crashed, retry up to 3 times with exponential backoff: 1s, 2s, 4s, 8s, max 10s)
- [X] T086 [US2] Implement execution retry logic in sandbox_control_plane/api/routes/executions.py (on crashed status, create new execution record with same code/event_data, link to original execution via parent_execution_id, increment retry_count)

#### API Routes

- [X] T087 [US2] Implement POST /sessions/{id}/execute endpoint in sandbox_control_plane/api/routes/executions.py (validate ExecuteRequest, call execution submission logic, return ExecuteResponse with execution_id)
- [X] T088 [US2] Implement GET /executions/{id}/status endpoint in sandbox_control_plane/api/routes/executions.py (query execution status, return ExecutionStatus)
- [X] T089 [US2] Implement GET /executions/{id}/result endpoint in sandbox_control_plane/api/routes/executions.py (query execution result, return ExecutionResult)
- [X] T090 [US2] Implement GET /sessions/{id}/executions endpoint in sandbox_control_plane/api/routes/executions.py (list executions for session, filter and paginate)
- [X] T091 [US2] Implement GET /executions/{id} endpoint in sandbox_control_plane/api/routes/executions.py (get full execution details with code and result)

#### Unit Tests for User Story 2

- [X] T092 [P] [US2] Unit test for execution submission in sandbox_control_plane/tests/unit/test_execution.py (validate execution_id generation, executor HTTP call, status = pending)
- [X] T093 [P] [US2] Unit test for result reporting in sandbox_control_plane/tests/unit/test_execution.py (validate idempotency check, status update, result storage)
- [X] T094 [P] [US2] Unit test for heartbeat timeout detection in sandbox_control_plane/tests/unit/test_execution.py (validate 15s timeout, crashed status, retry logic)
- [X] T095 [P] [US2] Unit test for Execution repository in sandbox_control_plane/tests/unit/test_repositories.py (validate CRUD operations, idempotent result updates, status queries)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Users can create sessions, execute code, retrieve results. Complete MVP functionality.

---

## Phase 5: User Story 3 - Template Management (Priority: P2)

**Goal**: Create and manage sandbox environment templates with custom images and resource defaults

**Independent Test**: Create a custom template with image URL, packages, and resources, list templates to verify creation, query template details by ID, update template configuration, and verify deletion prevention for active templates.

### Contract Tests for User Story 3

- [X] T096 [P] [US3] Contract test for POST /templates in sandbox_control_plane/sandbox_control_plane/tests/integration/api/test_templates_api.py (validate CreateTemplateRequest, Template schema, 201 status)
- [X] T097 [P] [US3] Contract test for GET /templates in sandbox_control_plane/sandbox_control_plane/tests/integration/api/test_templates_api.py (validate template list with pagination)
- [X] T098 [P] [US3] Contract test for GET /templates/{id} in sandbox_control_plane/sandbox_control_plane/tests/integration/api/test_templates_api.py (validate Template schema with all fields, 404 for non-existent template)
- [X] T099 [P] [US3] Contract test for PUT /templates/{id} in sandbox_control_plane/sandbox_control_plane/tests/integration/api/test_templates_api.py (validate UpdateTemplateRequest, updated template response, 404 for non-existent)
- [X] T100 [P] [US3] Contract test for DELETE /templates/{id} in sandbox_control_plane/sandbox_control_plane/tests/integration/api/test_templates_api.py (validate 204 on success, 400 if template has active sessions)

### Integration Tests for User Story 3

- [X] T101 [P] [US3] Integration test for template CRUD in sandbox_control_plane/tests/integration/test_template_crud.py (create template, list templates, get template by id, update template, delete template)
- [X] T102 [P] [US3] Integration test for template validation in sandbox_control_plane/tests/integration/test_template_crud.py (create template with invalid image, verify validation error; create template with privileged user, verify security rejection)
- [X] T103 [P] [US3] Integration test for template deletion prevention in sandbox_control_plane/tests/integration/test_template_crud.py (create session with template, attempt to delete template, verify 400 error with deprecation recommendation)

### Implementation for User Story 3

#### Template Manager

- [X] T104 [P] [US3] Create Template CRUD operations in sandbox_control_plane/template_manager/manager.py (create template with unique id validation, get template by id, list templates with pagination, update template, delete template)
- [X] T105 [P] [US3] Create Template validation logic in sandbox_control_plane/template_manager/validator.py (validate image URL format, validate pre_installed_packages format, validate default_resources ranges, validate security_context requires non-privileged user UID:GID=1000:1000)
- [X] T106 [US3] Implement template creation in sandbox_control_plane/template_manager/manager.py (validate template_id uniqueness, validate image and security requirements, store template with created_at timestamp, set is_active = True by default)
- [X] T107 [US3] Implement template update in sandbox_control_plane/template_manager/manager.py (validate template exists, update mutable fields: name, image, pre_installed_packages, default_resources, security_context, increment updated_at timestamp)
- [X] T108 [US3] Implement template deletion in sandbox_control_plane/template_manager/manager.py (check for active sessions referencing template, if active sessions exist raise error with deprecation recommendation, else set is_active = False or delete record)
- [X] T109 [US3] Implement template listing in sandbox_control_plane/template_manager/manager.py (query templates with is_active = True unless explicitly requested, support limit/offset pagination, return templates sorted by created_at desc)

#### API Routes

- [X] T110 [US3] Implement POST /templates endpoint in sandbox_control_plane/api/routes/templates.py (validate CreateTemplateRequest, call template_validator.validate, call template_manager.create, return Template with 201)
- [X] T111 [US3] Implement GET /templates endpoint in sandbox_control_plane/api/routes/templates.py (parse limit and offset params, call template_manager.list, return paginated template list)
- [X] T112 [US3] Implement GET /templates/{id} endpoint in sandbox_control_plane/api/routes/templates.py (query template by id, return Template with 200, raise TemplateNotFoundError with 404)
- [X] T113 [US3] Implement PUT /templates/{id} endpoint in sandbox_control_plane/api/routes/templates.py (validate UpdateTemplateRequest, call template_manager.update, return updated Template with 200, raise TemplateNotFoundError with 404)
- [X] T114 [US3] Implement DELETE /templates/{id} endpoint in sandbox_control_plane/api/routes/templates.py (call template_manager.delete, return 204 on success, return 400 with deprecation recommendation if active sessions exist, raise TemplateNotFoundError with 404)

#### Seed Default Templates

- [X] T115 [US3] Create database seed script in sandbox_control_plane/db/seeds.py (insert default templates: python-basic, python-datascience, nodejs-basic with pre-configured images and resources)
- [X] T116 [US3] Add CLI command to run seed script in sandbox_control_plane/api/main.py (sandbox-control-plane seed-templates)

#### Unit Tests for User Story 3

- [X] T117 [P] [US3] Unit test for Template validation in sandbox_control_plane/tests/unit/test_template_manager.py (validate image URL validation, security context validation, resource range validation)
- [X] T118 [P] [US3] Unit test for Template CRUD in sandbox_control_plane/tests/unit/test_template_manager.py (validate create, read, update, delete operations, uniqueness constraint, active session check)
- [X] T119 [P] [US3] Unit test for Template repository in sandbox_control_plane/tests/unit/test_repositories.py (validate CRUD operations, active templates query)

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently. Users can create custom templates, manage templates, and use templates for session creation.

---

## Phase 6: User Story 4 - File Upload & Download (Priority: P2)

**Goal**: Upload input files to session workspace and download generated files

**Independent Test**: Create a session, upload a file to workspace path "data/input.csv", execute code that reads the file, execute code that generates "output/result.csv", and download the generated file.

### Contract Tests for User Story 4

- [X] T120 [P] [US4] Contract test for POST /sessions/{id}/files/upload in sandbox_control_plane/sandbox_control_plane/tests/integration/api/test_files_api.py (validate multipart/form-data, file path, size limit 100MB, 200 response with path and size)
- [X] T121 [P] [US4] Contract test for GET /sessions/{id}/files/{name} in sandbox_control_plane/sandbox_control_plane/tests/integration/api/test_files_api.py (validate file content download, 307 redirect to S3 presigned URL for large files, 404 for non-existent file)
- [X] T122 [P] [US4] Contract test for file size validation in sandbox_control_plane/sandbox_control_plane/tests/integration/api/test_files_api.py (upload file > 100MB, verify 400 error with size limit message)

### Integration Tests for User Story 4

- [X] T123 [P] [US4] Integration test for file upload and download in sandbox_control_plane/tests/integration/test_file_operations.py (upload file to workspace, download file by path, verify content matches)
- [X] T124 [P] [US4] Integration test for file access during execution in sandbox_control_plane/tests/integration/test_file_operations.py (upload file, execute code that reads /workspace/{file_path}, verify execution succeeds)
- [X] T125 [P] [US4] Integration test for artifact file download in sandbox_control_plane/tests/integration/test_file_operations.py (execute code that generates file, retrieve execution result with artifacts list, download artifact file, verify content)
- [X] T126 [P] [US4] Integration test for S3 presigned URL generation in sandbox_control_plane/tests/integration/test_file_operations.py (upload large file > 10MB, verify download returns 307 redirect to S3 presigned URL)

### Implementation for User Story 4

#### File Storage Operations

- [X] T127 [US4] Implement file upload logic in sandbox_control_plane/api/routes/files.py (validate session exists and is running, validate file size ≤ 100MB, generate S3 path: s3://{bucket}/workspace/{session_id}/{path}, upload file to S3 via storage.workspace.upload_file, return path and size with 200)
- [X] T128 [US4] Implement file download logic in sandbox_control_plane/api/routes/files.py (validate session exists, check file exists in S3, if file size < 10MB return content directly with application/octet-stream, else generate S3 presigned URL with 1-hour expiry and return 307 redirect)
- [X] T129 [US4] Implement file not found handling in sandbox_control_plane/api/routes/files.py (if S3 key not found, raise FileNotFoundError with structured error: "File not found in workspace: {path}", return 404)
- [X] T130 [US4] Implement S3 presigned URL generation in sandbox_control_plane/storage/workspace.py (use boto3 generate_presigned_url with GET operation, set expiry=3600s, include response-content-disposition header for filename)

#### API Routes

- [X] T131 [US4] Implement POST /sessions/{id}/files/upload endpoint in sandbox_control_plane/api/routes/files.py (parse multipart/form-data with file and path fields, call file upload logic, return path and size)
- [X] T132 [US4] Implement GET /sessions/{id}/files/{name} endpoint in sandbox_control_plane/api/routes/files.py (extract file path from name parameter, call file download logic, return file content or redirect to S3)

#### Artifact Integration

- [X] T133 [US4] Update execution result reporting to include artifacts in sandbox_control_plane/internal_api/routes/executions.py (parse artifacts list from executor callback, create artifact records with s3_path, size_bytes, mime_type, type = artifact, link to execution_id)
- [X] T134 [US4] Update execution result retrieval to include artifacts in sandbox_control_plane/api/routes/executions.py (query artifacts by execution_id, return list with paths, sizes, mime_types)

#### Unit Tests for User Story 4

- [X] T135 [P] [US4] Unit test for file upload in sandbox_control_plane/tests/unit/test_file_operations.py (validate file size validation, S3 upload invocation, path generation)
- [X] T136 [P] [US4] Unit test for file download in sandbox_control_plane/tests/unit/test_file_operations.py (validate S3 check invocation, presigned URL generation for large files, direct content return for small files)
- [X] T137 [P] [US4] Unit test for workspace operations in sandbox_control_plane/tests/unit/test_storage.py (validate upload_file, download_file, generate_presigned_url, list_files)

**Checkpoint**: At this point, User Stories 1-4 should all work independently. Users can upload files, execute code with file I/O, and download generated files.

---

## Phase 7: User Story 5 - Container Monitoring & Health Checks (Priority: P3)

**Goal**: Monitor container status, resource usage, and health for operational visibility

**Independent Test**: Create multiple sessions, list containers with status filter "running", query specific container details with resource usage, retrieve container logs, and verify health check detection.

### Contract Tests for User Story 5

- [X] T138 [P] [US5] Contract test for GET /containers in sandbox_control_plane/sandbox_control_plane/tests/integration/api/test_containers_api.py (validate container list with status and runtime_type filters, pagination)
- [X] T139 [P] [US5] Contract test for GET /containers/{id} in sandbox_control_plane/sandbox_control_plane/tests/integration/api/test_containers_api.py (validate ContainerInfo schema with session_id, template_id, resources, uptime_seconds, 404 for non-existent)
- [X] T140 [P] [US5] Contract test for GET /containers/{id}/logs in sandbox_control_plane/sandbox_control_plane/tests/integration/api/test_containers_api.py (validate log content, tail parameter, time filtering)
- [X] T141 [P] [US5] Contract test for GET /health endpoint in sandbox_control_plane/sandbox_control_plane/tests/integration/api/test_health.py (validate health check response with database, S3, runtime connectivity status)

### Integration Tests for User Story 5

- [X] T142 [P] [US5] Integration test for container listing in sandbox_control_plane/tests/integration/test_container_monitoring.py (create multiple sessions, list containers, verify status filter works, verify runtime_type filter works)
- [X] T143 [P] [US5] Integration test for container details in sandbox_control_plane/tests/integration/test_container_monitoring.py (create session, get container details, verify session_id, template_id, uptime_seconds calculation)
- [X] T144 [P] [US5] Integration test for container logs retrieval in sandbox_control_plane/tests/integration/test_container_monitoring.py (create session, execute code that writes to stdout/stderr, get container logs with tail=100, verify log content)
- [X] T145 [P] [US5] Integration test for health checks in sandbox_control_plane/tests/integration/test_container_monitoring.py (start control plane, call /health, verify database connectivity, verify S3 connectivity, verify runtime node connectivity)
- [X] T146 [P] [US5] Integration test for unhealthy node detection in sandbox_control_plane/tests/integration/test_container_monitoring.py (mark runtime node as unhealthy after 3 consecutive health check failures, verify node status = unhealthy, verify new sessions not routed to unhealthy node)

### Implementation for User Story 5

#### Health Probe

- [X] T147 [P] [US5] Create health check logic in sandbox_control_plane/health_probe/probe.py (check database connectivity via ping, check S3 connectivity via list_buckets, check runtime node connectivity via Docker/K8s API)
- [X] T148 [P] [US5] Create metrics collection in sandbox_control_plane/health_probe/metrics.py (Prometheus metrics: Counter for session creation/deletion, Gauge for active sessions, Histogram for latency percentiles p50/p95/p99, Gauge for resource utilization CPU/memory/disk)
- [X] T149 [P] [US5] Create node status tracking in sandbox_control_plane/health_probe/status.py (track runtime node health, update node status based on health checks, track consecutive failures, mark node unhealthy after 3 failures)
- [X] T150 [US5] Implement background health check task in sandbox_control_plane/health_probe/probe.py (run every 10 seconds, check all runtime nodes, update node status in database, log unhealthy nodes, trigger alert if node becomes unhealthy)
- [X] T151 [US5] Implement /health endpoint in sandbox_control_plane/api/routes/health.py (call health_probe.check_health, return status: healthy/degraded, include database/S3/runtime status, include uptime timestamp)
- [X] T152 [US5] Implement /metrics endpoint in sandbox_control_plane/api/routes/health.py (expose Prometheus metrics at /metrics, include all metrics from health_probe/metrics.py)

#### Container Monitoring

- [X] T153 [US5] Implement container listing in sandbox_control_plane/api/routes/containers.py (query containers from database, filter by status and runtime_type, paginate, return container list with session_id, template_id, node_name, resources, uptime_seconds)
- [X] T154 [US5] Implement container details retrieval in sandbox_control_plane/api/routes/containers.py (query container by id, include session_id, template_id, runtime_type, node_name, resources, status, created_at, uptime_seconds calculation, raise ContainerNotFoundError with 404)
- [X] T155 [US5] Implement container logs retrieval in sandbox_control_plane/api/routes/containers.py (query container by id, call scheduler.get_container_logs with tail and since parameters, return logs as text/plain, raise ContainerNotFoundError with 404)
- [X] T156 [US5] Implement uptime calculation in sandbox_control_plane/api/routes/containers.py (calculate uptime_seconds = now - created_at for running containers, uptime_seconds = exited_at - created_at for stopped containers)

#### Unit Tests for User Story 5

- [X] T157 [P] [US5] Unit test for health check logic in sandbox_control_plane/tests/unit/test_health_probe.py (validate database/S3/runtime connectivity checks, health status aggregation)
- [X] T158 [P] [US5] Unit test for metrics collection in sandbox_control_plane/tests/unit/test_health_probe.py (validate Prometheus metric types, counter increments, gauge updates, histogram recordings)
- [X] T159 [P] [US5] Unit test for node status tracking in sandbox_control_plane/tests/unit/test_health_probe.py (validate consecutive failure tracking, unhealthy status transition after 3 failures)

**Checkpoint**: All user stories should now be independently functional. Platform has complete observability and monitoring capabilities.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final production readiness

### Scheduler & Warm Pool (Performance Optimization)

- [X] T160 [P] Create scheduler base interface in sandbox_control_plane/scheduler/scheduler.py (abstract schedule method, takes session request, returns node assignment)
- [X] T161 [P] Create warm pool strategy in sandbox_control_plane/scheduler/strategies/warm_pool.py (maintain pool of pre-instantiated containers for common templates, allocate from pool if available, replenish pool asynchronously)
- [X] T162 [P] Create template affinity strategy in sandbox_control_plane/scheduler/strategies/affinity.py (score nodes by cached template images, track node history for session agent_id, prioritize nodes with cached images)
- [X] T163 [P] Create load balancing strategy in sandbox_control_plane/scheduler/strategies/load_balance.py (score nodes by resource utilization, calculate available capacity: total - allocated, select least-loaded node)
- [X] T164 [P] Create node scoring algorithm in sandbox_control_plane/scheduler/scoring.py (combine warm pool, affinity, and load balance scores, apply weights: warm_pool=100, affinity=50, load_balance=30, return sorted node list)
- [X] T165 Implement scheduler in sandbox_control_plane/scheduler/scheduler.py (check warm pool first, if no match check affinity, if no match load balance, select node, call container_scheduler.create_container on selected node)
- [X] T166 Implement warm pool management in sandbox_control_plane/container_scheduler/warm_pool.py (pre-create containers for common templates: python-datascience=20, python-basic=10, nodejs-basic=5, track pool size, allocate pool container on session creation, replenish pool in background)
- [X] T167 Update session creation to use scheduler in sandbox_control_plane/session_manager/manager.py (call scheduler.schedule with template_id and resources, get node assignment, create container on assigned node, update session with node_id)

### Documentation & Examples

- [X] T168 [P] Update README.md with architecture overview, API documentation links, quickstart reference
- [X] T169 [P] Create API documentation in docs/api/control-plane-api.md (describe all endpoints, request/response examples, error codes)
- [X] T170 [P] Create deployment guide in docs/deployment.md (local development setup with Docker, production deployment with Kubernetes, environment configuration)
- [X] T171 [P] Create troubleshooting guide in docs/troubleshooting.md (common errors and solutions, debugging tips, log analysis)
- [X] T172 [P] Update quickstart.md with additional examples for all user stories (session lifecycle, code execution, template management, file operations, container monitoring)

### Security Hardening

- [X] T173 Add input sanitization for all user inputs in sandbox_control_plane/utils/validation.py (sanitize file paths to prevent directory traversal, validate JSON fields for max size, validate env_vars for key names)
- [X] T174 Add secrets management for S3 and database credentials in sandbox_control_plane/config/settings.py (load credentials from environment variables, never log credentials, use secretsmanager if available)
- [X] T175 Add rate limiting middleware in sandbox_control_plane/api/middleware/rate_limit.py (optional: implement per-IP rate limiting using slowapi, configure limits in settings)
- [X] T176 Add audit logging for sensitive operations in sandbox_control_plane/config/logging.py (log session creations, executions, failures with request_id, user_id, timestamp, operation details)

### Performance Optimization

- [X] T177 Add database query optimization in sandbox_control_plane/db/repositories/ (use selectinload for eager loading, avoid N+1 queries, add composite indexes for common query patterns)
- [X] T178 Add connection pooling configuration in sandbox_control_plane/db/session.py (tune pool_size and max_overflow based on load testing, configure pool_recycle to prevent stale connections)
- [X] T179 Add async operations for parallel independent tasks in sandbox_control_plane/api/routes/ (use asyncio.gather for parallel API calls, use asyncio.create_task for background operations)
- [X] T180 Add caching for frequently accessed data in sandbox_control_plane/session_manager/manager.py (cache template lookups, cache runtime node status, use TTL cache with 60s expiry)

### Testing & Quality

- [X] T181 [P] Add unit tests for scheduler in sandbox_control_plane/tests/unit/test_scheduler.py (test warm pool selection, affinity scoring, load balancing logic)
- [X] T182 [P] Add integration test for warm pool in sandbox_control_plane/tests/integration/test_warm_pool.py (create session with warm pool template, verify allocation from pool < 100ms, verify pool replenishment)
- [X] T183 [P] Add integration test for scheduler in sandbox_control_plane/tests/integration/test_scheduler.py (create sessions with different templates, verify node assignment follows warm pool → affinity → load balance strategy)
- [X] T184 Run all contract tests and verify 100% pass rate in sandbox_control_plane/sandbox_control_plane/tests/integration/api/
- [X] T185 Run all integration tests and verify 100% pass rate in sandbox_control_plane/tests/integration/
- [X] T186 Run all unit tests and verify minimum 80% coverage for session_manager, 70% for api handlers, 60% for utilities

### Final Validation

- [X] T187 Validate all examples in quickstart.md work end-to-end (create session, execute code, retrieve results, upload/download files, list containers)
- [X] T188 Run performance tests and verify SLAs (session creation ≤ 2s warm pool, ≤ 5s cold start; execution submission ≤ 100ms p95; support 1000 concurrent sessions)
- [X] T189 Run security audit and verify all security requirements (input validation, authentication, isolation, resource limits, secrets management)
- [X] T190 Update CLAUDE.md with implementation notes and architecture decisions

**Checkpoint**: Production-ready Sandbox Control Plane service complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1 - Session Lifecycle)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1 - Code Execution)**: Can start after Foundational (Phase 2) - Integrates with US1 (executions run within sessions) but independently testable
- **User Story 3 (P2 - Template Management)**: Can start after Foundational (Phase 2) - Integrates with US1 (sessions use templates) but independently testable
- **User Story 4 (P2 - File Operations)**: Can start after Foundational (Phase 2) - Integrates with US1 (files stored in session workspaces) and US2 (artifacts from executions) but independently testable
- **User Story 5 (P3 - Container Monitoring)**: Can start after Foundational (Phase 2) - Integrates with US1 (containers host sessions) but independently testable

### Within Each User Story

- Contract tests MUST be written and FAIL before implementation
- Integration tests MUST be written and FAIL before implementation
- Models before repositories
- Repositories before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- **Setup Phase**: T003, T004, T005, T006 can run in parallel (different files, no dependencies)
- **Foundational Phase**:
  - T008, T009, T010 (config & logging) can run in parallel
  - T013-T018 (all ORM models) can run in parallel
  - T020-T022 (all repositories) can run in parallel
  - T023, T024 (storage layer) can run in parallel
  - T026-T030 (middleware and models) can run in parallel
- **User Story 1**: T035-T040 (contract tests) can run in parallel; T041-T043 (integration tests) can run in parallel; T044, T045 (lifecycle and manager) can run in parallel; T050, T051 (Docker and K8s schedulers) can run in parallel
- **User Story 2**: T063-T070 (contract tests) can run in parallel; T071-T075 (integration tests) can run in parallel; T060, T061 (unit tests) can run in parallel
- **User Story 3**: T096-T100 (contract tests) can run in parallel; T101-T103 (integration tests) can run in parallel; T104, T105 (manager and validator) can run in parallel
- **User Story 4**: T120-T122 (contract tests) can run in parallel; T123-T126 (integration tests) can run in parallel; T135-T137 (unit tests) can run in parallel
- **User Story 5**: T138-T141 (contract tests) can run in parallel; T142-T146 (integration tests) can run in parallel; T147-T149 (health probe components) can run in parallel; T157-T159 (unit tests) can run in parallel
- **Polish Phase**: T160-T166 (scheduler components) can run in parallel; T168-T172 (documentation) can run in parallel; T181-T183 (tests) can run in parallel

---

## Parallel Example: User Story 1 (Session Lifecycle)

```bash
# Launch all contract tests for User Story 1 together (6 parallel tasks):
Task T035: Contract test for POST /sessions
Task T036: Contract test for GET /sessions/{id}
Task T037: Contract test for DELETE /sessions/{id}
Task T038: Contract test for GET /sessions with filters
Task T039: Contract test for POST /internal/sessions/{id}/container_ready
Task T040: Contract test for POST /internal/sessions/{id}/container_exited

# Launch all integration tests for User Story 1 together (3 parallel tasks):
Task T041: Integration test for session lifecycle
Task T042: Integration test for session timeout
Task T043: Integration test for session not found errors

# Launch all ORM models together (already done in Foundational phase, but example):
Task T014: Create Session ORM model
Task T016: Create Container ORM model
Task T018: Create RuntimeNode ORM model

# Launch scheduler implementations together:
Task T051: Create Docker scheduler implementation
Task T052: Create Kubernetes scheduler implementation
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only - P1 Stories)

Complete MVP with core session and execution functionality:

1. Complete Phase 1: Setup (T001-T007) - Project structure and dependencies
2. Complete Phase 2: Foundational (T008-T034) - Database, storage, API framework
3. Complete Phase 3: User Story 1 (T035-T062) - Session lifecycle management
4. Complete Phase 4: User Story 2 (T063-T095) - Code execution and result retrieval
5. **STOP and VALIDATE**: Test User Stories 1 + 2 independently
6. Deploy/demo MVP if ready

**MVP Delivers**: Complete sandboxed code execution platform with session management and code execution

### Incremental Delivery (Add P2 Stories)

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (P1) → Test independently → Deploy/Demo (Session Management)
3. Add User Story 2 (P1) → Test independently → Deploy/Demo (MVP!)
4. Add User Story 3 (P2) → Test independently → Deploy/Demo (Template Management)
5. Add User Story 4 (P2) → Test independently → Deploy/Demo (File Operations)
6. Each story adds value without breaking previous stories

### Full Feature Delivery (Add P3 Story)

1. Complete MVP (User Stories 1-2)
2. Add User Story 3 (P2) - Template Management
3. Add User Story 4 (P2) - File Operations
4. Add User Story 5 (P3) - Container Monitoring
5. Complete Phase 8: Polish & Cross-Cutting Concerns
6. **PRODUCTION READY**

### Parallel Team Strategy

With multiple developers (recommended for faster delivery):

1. **Team completes Setup + Foundational together** (Foundation is critical blocking dependency)
2. Once Foundational (Phase 2) is done, split into parallel streams:
   - **Developer A**: User Story 1 (Session Lifecycle) - T035-T062
   - **Developer B**: User Story 2 (Code Execution) - T063-T095 (can start after US1 session creation is done)
   - **Developer C**: User Story 3 (Template Management) - T096-T119 (independent, can proceed in parallel)
   - **Developer D**: User Story 4 (File Operations) - T120-T137 (independent, can proceed in parallel)
   - **Developer E**: User Story 5 (Container Monitoring) - T138-T159 (independent, can proceed in parallel)
3. Stories complete and integrate independently
4. **Team completes Phase 8: Polish together** (scheduler, docs, testing, security)

---

## Task Summary

### Total Tasks: 190

- **Phase 1 (Setup)**: 7 tasks (T001-T007)
- **Phase 2 (Foundational)**: 27 tasks (T008-T034)
- **Phase 3 (User Story 1 - P1)**: 28 tasks (T035-T062)
- **Phase 4 (User Story 2 - P1)**: 33 tasks (T063-T095)
- **Phase 5 (User Story 3 - P2)**: 24 tasks (T096-T119)
- **Phase 6 (User Story 4 - P2)**: 18 tasks (T120-T137)
- **Phase 7 (User Story 5 - P3)**: 22 tasks (T138-T159)
- **Phase 8 (Polish)**: 31 tasks (T160-T190)

### Task Count by User Story

- **User Story 1 (Session Lifecycle)**: 28 tasks (6 contract tests, 3 integration tests, 16 implementation, 3 unit tests)
- **User Story 2 (Code Execution)**: 33 tasks (8 contract tests, 5 integration tests, 17 implementation, 3 unit tests)
- **User Story 3 (Template Management)**: 24 tasks (5 contract tests, 3 integration tests, 11 implementation, 5 unit tests)
- **User Story 4 (File Operations)**: 18 tasks (3 contract tests, 4 integration tests, 8 implementation, 3 unit tests)
- **User Story 5 (Container Monitoring)**: 22 tasks (4 contract tests, 5 integration tests, 9 implementation, 4 unit tests)

### Parallel Opportunities Identified

- **Setup**: 4 tasks can run in parallel (T003-T006)
- **Foundational**: 15 tasks can run in parallel (T008-T009, T013-T018, T020-T024, T026-T030)
- **User Story 1**: 9 tasks can run in parallel (6 contract tests, 2 lifecycle components, 2 schedulers)
- **User Story 2**: 13 tasks can run in parallel (8 contract tests, 4 integration tests, 2 unit tests)
- **User Story 3**: 10 tasks can run in parallel (5 contract tests, 3 integration tests, 2 components, 2 unit tests)
- **User Story 4**: 9 tasks can run in parallel (3 contract tests, 4 integration tests, 2 unit tests)
- **User Story 5**: 12 tasks can run in parallel (4 contract tests, 5 integration tests, 3 components, 3 unit tests)
- **Polish**: 10 tasks can run in parallel (7 scheduler/docs/tests)

### Independent Test Criteria

- **User Story 1**: Create session → query status → terminate session. Verify session lifecycle works end-to-end.
- **User Story 2**: Create session → submit code → poll status → retrieve results. Verify code execution works end-to-end.
- **User Story 3**: Create template → list templates → get template → update template → delete template. Verify template CRUD works.
- **User Story 4**: Create session → upload file → execute code with file I/O → download generated file. Verify file operations work.
- **User Story 5**: Create sessions → list containers → get container details → retrieve logs → check health endpoint. Verify monitoring works.

### Suggested MVP Scope

**MVP = User Stories 1 + 2 (P1 stories only)**: 88 tasks (T001-T095)
- Delivers complete session management and code execution
- Independent testable end-to-end
- Production-ready for basic sandbox use cases
- Template management can use hardcoded default templates initially
- File operations can be added later if needed
- Container monitoring can use basic logging initially

**Time Estimate (MVP)**:
- 1 developer: ~2-3 weeks (assuming familiarity with FastAPI, Docker, Kubernetes)
- 2 developers: ~1-2 weeks (parallel work on US1 and US2 after Foundational)

**Full Feature (User Stories 1-5)**: 159 tasks (T001-T159)
- Complete template management with CRUD operations
- Complete file upload/download with S3 integration
- Complete container monitoring with health checks
- Production-ready for enterprise use cases

**Time Estimate (Full Feature)**:
- 1 developer: ~4-6 weeks
- 3-5 developers (parallel after Foundational): ~2-3 weeks

---

## Notes

- **[P] tasks** = different files, no dependencies, safe for parallel execution
- **[Story] label** = maps task to specific user story for traceability and independent testing
- Each user story should be independently completable and testable
- Contract/integration tests should FAIL before implementation (TDD approach)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Avoid**: vague tasks, same file conflicts, cross-story dependencies that break independence
- **Tests are optional**: Tests are included as the specification requires comprehensive testing (see "Testing Requirements" in spec.md)
- **Database migrations**: Not explicitly included but should be added if using Alembic or similar migration tool
- **Docker/Kubernetes deployment**: Not included in tasks but should be added for production deployment
