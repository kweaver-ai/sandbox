# Feature Specification: Sandbox Control Plane

**Feature Branch**: `001-control-plane`
**Created**: 2026-01-06
**Status**: Draft
**Input**: User description: "sandbox_control_plane 构建，具体文档请参考 @docs/sandbox-design-v2.1.md  2.1 管理中心章节， 接口文档请参考 @docs/api/"

## User Scenarios & Testing

### User Story 1 - Session Lifecycle Management (Priority: P1)

As an AI Agent application developer, I need to create, manage, and terminate sandbox execution sessions so that I can securely execute untrusted code in isolated environments.

**Why this priority**: This is the core foundation of the sandbox platform. Without session management, no other features can function. It enables the primary value proposition: secure code execution.

**Independent Test**: Can be fully tested by creating a session, querying its status, and terminating it. Delivers a working sandbox session lifecycle that developers can integrate immediately.

**Acceptance Scenarios**:

1. **Given** the system is running, **When** a developer creates a session with template "python-basic" and resource limits, **Then** the system returns a unique session_id and the session status is "creating"
2. **Given** a session exists, **When** the developer queries the session details, **Then** the system returns complete session information including runtime_type, node assignment, and workspace path
3. **Given** a session is in "running" status, **When** the developer terminates the session, **Then** the system marks the session as "terminated" and releases all resources
4. **Given** a session has been idle for 30 minutes, **When** the automatic cleanup runs, **Then** the session is terminated and resources are freed
5. **Given** a non-existent session_id, **When** attempting to query or terminate, **Then** the system returns a clear "Session not found" error with actionable guidance

---

### User Story 2 - Code Execution & Result Retrieval (Priority: P1)

As an AI Agent application, I need to submit Python/Javascript/Shell code for execution and retrieve results (stdout, stderr, return value, metrics) so that I can process user code and get results back.

**Why this priority**: This is the primary functionality users need - executing code safely. Combined with session management (P1), this delivers a complete MVP for sandboxed code execution.

**Independent Test**: Can be fully tested by creating a session, submitting a simple handler function, polling for status, and retrieving results. Delivers end-to-end code execution capability.

**Acceptance Scenarios**:

1. **Given** a running session, **When** submitting Python code with a handler function and event data, **Then** the system returns an execution_id immediately and marks status as "submitted"
2. **Given** an execution in "submitted" status, **When** querying execution status after completion, **Then** the system returns status "completed" with execution_time and completion timestamp
3. **Given** a completed execution, **When** retrieving the result, **Then** the system returns stdout, stderr, exit_code, return_value (JSON), metrics (duration_ms, cpu_time_ms, peak_memory_mb), and artifacts list
4. **Given** a handler that writes files to workspace, **When** execution completes, **Then** the artifacts list contains the file paths relative to workspace
5. **Given** code execution exceeds timeout, **When** timeout occurs, **Then** the system marks execution as "timeout" and returns partial output with timeout error message
6. **Given** code with syntax errors, **When** execution fails, **Then** the system returns status "failed" with stderr containing the error traceback
7. **Given** multiple executions in the same session, **When** listing executions for a session, **Then** the system returns all executions with their status and timestamps

---

### User Story 3 - Template Management (Priority: P2)

As a platform administrator, I need to create and manage sandbox environment templates so that developers can choose appropriate execution environments (Python basic, data science, Node.js, etc.).

**Why this priority**: Important for platform flexibility but not blocking initial development. Developers can use default templates (python-basic, python-datascience) initially.

**Independent Test**: Can be fully tested by creating a custom template, listing templates, querying template details, and updating template configuration. Delivers template CRUD capabilities.

**Acceptance Scenarios**:

1. **Given** admin privileges, **When** creating a template with image, packages, and resource defaults, **Then** the system returns the template with a unique template_id
2. **Given** multiple templates exist, **When** listing templates, **Then** the system returns all templates with their names, images, and default resources
3. **Given** a template exists, **When** querying template details by ID, **Then** the system returns complete template configuration including pre-installed packages and security context
4. **Given** a template not used by active sessions, **When** updating the template image or resources, **Then** the system updates the template and increments updated_at timestamp
5. **Given** a template used by active sessions, **When** attempting to delete the template, **Then** the system returns an error preventing deletion and recommends deprecation instead

---

### User Story 4 - File Upload & Download (Priority: P2)

As an AI Agent application, I need to upload input files to a session workspace and download generated files so that code can process external data and output results.

**Why this priority**: Important for data processing workflows but not required for basic code execution. Code can generate artifacts without pre-uploaded files initially.

**Independent Test**: Can be fully tested by uploading a file to workspace, executing code that reads/writes files, and downloading the generated files. Delivers file I/O capabilities.

**Acceptance Scenarios**:

1. **Given** a running session, **When** uploading a file with path "data/input.csv", **Then** the system stores the file in session workspace and returns the file path and size
2. **Given** uploaded file "data/input.csv", **When** executing code that reads from "/workspace/data/input.csv", **Then** the code successfully reads the file
3. **Given** execution generates "output/result.csv", **When** downloading the file by name, **Then** the system returns the file content (or S3 presigned URL for large files)
4. **Given** file size exceeds 100MB, **When** attempting upload, **Then** the system returns an error explaining the size limit
5. **Given** non-existent file path, **When** attempting download, **Then** the system returns a clear "File not found" error with workspace path context

---

### User Story 5 - Container Monitoring & Health Checks (Priority: P3)

As a platform operator, I need to monitor container status, resource usage, and health so that I can ensure the platform is running smoothly and troubleshoot issues.

**Why this priority**: Operational visibility is important but not required for core functionality. Developers can use the platform without monitoring features initially.

**Independent Test**: Can be fully tested by listing containers, querying container details, and retrieving container logs. Delivers operational visibility.

**Acceptance Scenarios**:

1. **Given** multiple containers running, **When** listing containers with status filter "running", **Then** the system returns all running containers with their node assignments and resource usage
2. **Given** a container_id, **When** querying container details, **Then** the system returns session_id, template_id, uptime, resources, and status
3. **Given** a container with execution history, **When** retrieving container logs with tail=100, **Then** the system returns the last 100 lines of stdout/stderr
4. **Given** a container exits unexpectedly, **When** the health probe detects the exit, **Then** the system marks the container as unhealthy and triggers cleanup/recovery
5. **Given** a container exceeding resource limits, **When** metrics show CPU > 80% sustained, **Then** the system logs an alert and includes resource usage in container details

---

### Edge Cases

- **Concurrent executions**: What happens when multiple execution requests are submitted simultaneously for the same session?
- **Session limit exceeded**: How does the system behave when all runtime nodes are at capacity?
- **Network partition**: What happens to executions in progress when the control plane loses connection to runtime nodes?
- **Database connection loss**: How does the system handle temporary database unavailability during session creation?
- **Orphaned containers**: How are containers detected and cleaned up when the control plane restarts after a crash?
- **Malformed code**: What happens when submitted code exceeds size limits (100KB) or contains invalid UTF-8?
- **Workspace quota exceeded**: How does the system handle disk space exhaustion when writing to workspace?
- **Template deletion conflicts**: What happens when attempting to delete a template that has active sessions or historical references?
- **Heartbeat timeout**: How are executions marked when executor heartbeat stops (15 second timeout)?
- **Large file handling**: What happens when artifact files are too large for inline result response?

## Requirements

### Functional Requirements

#### Session Management
- **FR-001**: System MUST support creating sessions with template_id, resource limits (cpu: 0.5-4 cores, memory: 256Mi-8Gi, disk: 1Gi-50Gi), timeout (60-3600s), and custom environment variables
- **FR-002**: System MUST generate unique session_ids matching pattern `sess_[a-z0-9]{16}` for each new session
- **FR-003**: System MUST track session status through lifecycle: creating → running → completed/failed/timeout/terminated
- **FR-004**: System MUST assign sessions to runtime nodes based on warm pool availability, template affinity, and load balancing
- **FR-005**: System MUST store session metadata in MariaDB including runtime_node, container_id, pod_name, workspace_path (S3), resources, env_vars, timeout, and last_activity_at
- **FR-006**: System MUST support querying sessions by session_id, status, and template_id with pagination (limit: 1-200, default: 50)
- **FR-007**: System MUST terminate sessions by destroying containers/pods, preserving S3 workspace files for 24 hours, and updating status to "terminated"
- **FR-008**: System MUST automatically clean up idle sessions (no activity for 30 minutes) and sessions exceeding maximum lifetime (6 hours)
- **FR-009**: System MUST return clear error messages for non-existent sessions with actionable guidance

#### Code Execution
- **FR-010**: System MUST support executing code in Python, JavaScript, and Shell languages
- **FR-011**: System MUST generate unique execution_ids matching pattern `exec_[0-9]{8}_[a-z0-9]{8}` for each execution request
- **FR-012**: System MUST require Python code to define a `handler(event)` function that accepts JSON-serializable input and returns JSON-serializable output
- **FR-013**: System MUST use fileless execution for Python (python3 -c) to avoid disk I/O and improve security
- **FR-014**: System MUST support per-execution timeout (1-3600s, default: 30s) enforced at API and executor levels
- **FR-015**: System MUST execute code in Bubblewrap isolation with namespace isolation, read-only filesystem, tmpfs workspace, and seccomp filtering
- **FR-016**: System MUST return execution_id immediately upon submission with status "submitted"
- **FR-017**: System MUST track execution status through lifecycle: pending → running → completed/failed/timeout/crashed
- **FR-018**: System MUST store execution results including stdout, stderr, exit_code, execution_time, return_value (JSON), metrics (duration_ms, cpu_time_ms, peak_memory_mb), and artifacts list
- **FR-019**: System MUST support querying execution status by execution_id
- **FR-020**: System MUST support retrieving full execution results by execution_id
- **FR-021**: System MUST list all executions for a session with filtering by status and pagination
- **FR-022**: System MUST detect executor crashes via heartbeat timeout (15 seconds) and mark executions as "crashed"
- **FR-023**: System MUST automatically retry crashed executions up to 3 times with exponential backoff (1s, 2s, 4s, 8s, max 10s)
- **FR-024**: System MUST ensure idempotent result reporting using Idempotency-Key headers

#### File Operations
- **FR-025**: System MUST support uploading files to session workspace via multipart/form-data with path specification
- **FR-026**: System MUST enforce single file size limit of 100MB and total session disk quota
- **FR-027**: System MUST support downloading workspace files by path
- **FR-028**: System MUST return file content directly for small files or S3 presigned URL for large files
- **FR-029**: System MUST track generated files in artifacts list with path, size, mime_type, and type (artifact/log/output)

#### Template Management
- **FR-030**: System MUST support creating templates with unique id, name, image URL, base_image, pre_installed_packages list, default_resources, and security_context
- **FR-031**: System MUST validate that template images include sandbox-executor and run as non-privileged user (UID:GID=1000:1000)
- **FR-032**: System MUST list all templates with pagination (limit: 1-200, default: 50, offset: 0+)
- **FR-033**: System MUST support querying template details by template_id
- **FR-034**: System MUST support updating template name, image, pre_installed_packages, default_resources, and security_context
- **FR-035**: System MUST prevent deletion of templates with active sessions and recommend deprecation instead
- **FR-036**: System MUST provide default templates: python-basic, python-datascience, nodejs-basic

#### Container Monitoring
- **FR-037**: System MUST list all containers with filtering by status and runtime_type and pagination
- **FR-038**: System MUST provide container details including container_id, pod_name, runtime_type, session_id, template_id, node_name, resources, status, created_at, and uptime_seconds
- **FR-039**: System MUST retrieve container logs (stdout/stderr) with tail limit (default: 100 lines) and time filtering
- **FR-040**: System MUST monitor container health via /health endpoint every 10 seconds
- **FR-041**: System MUST mark nodes as unhealthy after 3 consecutive health check failures
- **FR-042**: System MUST collect and expose metrics: session creation/deletion rate, execution success/failure rate, latency percentiles (p50, p95, p99), resource utilization (CPU, memory, disk), cache hit rates (warm pool, session reuse)

#### Internal API (Executor Callback)
- **FR-043**: System MUST provide internal API endpoints at `/internal/*` for executor callbacks
- **FR-044**: System MUST authenticate internal API requests using Bearer token (INTERNAL_API_TOKEN from environment)
- **FR-045**: System MUST support executor result reporting at `/internal/executions/{execution_id}/result` with idempotency
- **FR-046**: System MUST support executor status updates at `/internal/executions/{execution_id}/status`
- **FR-047**: System MUST support executor heartbeat at `/internal/executions/{execution_id}/heartbeat` (recommended: every 5 seconds)
- **FR-048**: System MUST support container ready notification at `/internal/sessions/{session_id}/container_ready`
- **FR-049**: System MUST support container exit events at `/internal/sessions/{session_id}/container_exited` with exit_code and exit_reason
- **FR-050**: System MUST support artifact reporting at `/internal/executions/{execution_id}/artifacts` for async file uploads

#### Error Handling
- **FR-051**: System MUST return structured error responses with error_code, description, error_detail, and solution fields
- **FR-052**: System MUST use defined error codes: Sandbox.InvalidParameter, Sandbox.SessionNotFound, Sandbox.ExecutionNotFound, Sandbox.ExecException, Sandbox.TooManyRequestsExection, Sandbox.ExecTimeout, Sandbox.InternalError
- **FR-053**: System MUST log all errors with stack traces internally and user-friendly messages externally
- **FR-054**: System MUST include request_id in all error responses for support correlation

### Key Entities

- **Session**: Represents a sandbox execution environment with unique ID, template, resource limits, runtime assignment, S3 workspace, and lifecycle status
- **Execution**: Represents a single code execution request within a session with code, language, timeout, status, results, and metrics
- **Template**: Defines a reusable sandbox environment configuration with image, packages, resources, and security settings
- **Container**: Represents the runtime instance (Docker container or Kubernetes pod) hosting a session
- **Artifact**: Represents a file generated during execution with path, size, mime_type, and metadata
- **RuntimeNode**: Represents a container runtime node (Docker or Kubernetes) with health status, resource capacity, and cached templates

### Assumptions

1. **Database**: MariaDB 11.2+ with async driver support (aiomysql) is available and configured
2. **Object Storage**: S3-compatible object storage (MinIO/AWS S3) is available for workspace persistence
3. **Container Runtime**: Docker Engine (local dev) or Kubernetes cluster (production) is accessible
4. **Network**: Control plane can communicate with container runtime nodes via HTTP/HTTPS
5. **Authentication**: External API uses Bearer token authentication (implementation defined by user)
6. **Default Templates**: System is initialized with python-basic, python-datascience, and nodejs-basic templates
7. **Resource Limits**: Maximum concurrent sessions per control plane instance: 1000 (configurable)
8. **Session Isolation**: Sessions are fully isolated with no shared state between containers
9. **Workspace Persistence**: Files written to workspace are persisted to S3 and survive container restarts
10. **Cleanup Policy**: S3 workspace files are retained for 24 hours after session termination
11. **Warm Pool**: Warm pool is pre-configured with common templates (python-datascience: 20 instances, python-basic: 10 instances, nodejs-basic: 5 instances)
12. **Executor Availability**: sandbox-executor daemon is pre-installed in all template images and listens on port 8080
13. **Internal API Security**: INTERNAL_API_TOKEN is securely injected into containers via environment variables
14. **Logging**: Structured JSON logging is configured for all components
15. **Monitoring**: Prometheus metrics endpoint is exposed at /metrics for scraping

## Success Criteria

### Measurable Outcomes

- **SC-001**: Developers can create a sandbox session and receive a valid session_id within 2 seconds (p95) for warm pool, 5 seconds (p95) for cold start
- **SC-002**: Code execution requests return execution_id within 100ms (p95) of submission
- **SC-003**: Execution results are queryable within 1 second (p95) of completion
- **SC-004**: System supports 1000 concurrent sessions per control plane instance without degradation
- **SC-005**: 99.9% of execution results are successfully stored and retrievable
- **SC-006**: Automatic session cleanup recovers resources within 60 seconds of idle timeout
- **SC-007**: File uploads complete successfully for files under 100MB within 10 seconds (p95)
- **SC-008**: Template CRUD operations complete within 500ms (p95)
- **SC-009**: Container health checks detect and mark unhealthy nodes within 30 seconds
- **SC-010**: API error responses are actionable and include resolution steps in 95% of cases
- **SC-011**: 95% of developers can successfully create a session and execute code on first attempt using provided examples
- **SC-012**: System uptime exceeds 99.5% excluding scheduled maintenance

### Quality & Performance Requirements

#### Testing Requirements
- **Contract Tests**: All API endpoints MUST have contract tests verifying request/response schemas, error codes, and HTTP status codes
- **Integration Tests**: Session lifecycle, code execution, file operations, and template management MUST be tested end-to-end
- **Unit Test Coverage**: Minimum 80% coverage for session management logic, 70% for API handlers, 60% for utilities
- **Test Independence**: Each user story MUST be independently testable without implementing other stories

#### Performance Requirements
- **API Latency**: Session creation ≤ 2s (p95 warm pool), ≤ 5s (p95 cold start); Execution submission ≤ 100ms (p95)
- **Concurrent Sessions**: Support 1000 concurrent sessions per control plane instance
- **Throughput**: Handle 500 session creations per minute
- **Database Queries**: Common queries (session lookup, execution status) ≤ 50ms (p95)
- **Resource Limits**: Maximum 4 CPU cores, 8GB memory, 50GB disk per session

#### Security Requirements
- **Isolation**: Multi-layer isolation maintained (container + Bubblewrap) for all executions
- **Input Validation**: All request parameters validated before processing
- **Authentication**: Internal API uses Bearer token; External API uses configurable auth
- **Privilege Constraints**: Containers run as non-privileged user (UID:GID=1000:1000)
- **Network Isolation**: Default network isolation (NetworkMode=none) unless explicitly enabled
- **Resource Limits**: CPU, memory, disk, and process limits enforced for all sessions
- **Secret Management**: S3 credentials and database credentials injected via environment variables
- **Audit Logging**: All session creations, executions, and failures logged with request_id

#### Observability Requirements
- **Structured Logging**: JSON logging with timestamp, level, request_id, component, and context
- **Metrics**: Prometheus metrics for session operations, execution success rate, latency percentiles, resource utilization
- **Health Checks**: /health endpoint returning system status and dependency health
- **Error Tracking**: All errors logged with stack traces and request correlation IDs
- **Performance Monitoring**: Response time tracking for all API endpoints

### Out of Scope

The following features are explicitly out of scope for this implementation:

- **User Authentication/Authorization**: External API authentication mechanism is not implemented (assumes reverse proxy or API gateway handles auth)
- **Multi-Tenancy**: Single-tenant architecture; no per-user resource isolation or quotas
- **Webhook Notifications**: Execution result callbacks via webhook are not included (polling-based only)
- **Session Migration**: Live migration of running sessions between nodes is not supported
- **Real-time Streaming**: Real-time stdout/stderr streaming during execution is not included
- **Custom Runtime Plugins**: Pluggable runtime backends beyond Docker and Kubernetes are not supported
- **Advanced Scheduling Policies**: Custom scheduling algorithms beyond warm pool + affinity + load balancing
- **Session Cloning**: Copying workspace from one session to another is not implemented
- **Execution Versioning**: Version control or history tracking for executed code is not included
- **Dynamic Resource Scaling**: Auto-scaling session resources during execution is not supported
- **Distributed Tracing**: OpenTelemetry/distributed tracing integration is not included
- **Rate Limiting**: Per-IP or per-user rate limiting is not implemented (assumes upstream handles this)
- **API Versioning**: Only /api/v1 is implemented; no version negotiation or backward compatibility
- **Internationalization**: All messages and errors are in English only
- **Advanced File Operations**: File renaming, moving, or directory operations are not supported
- **Session Debugging**: Interactive debugging or breakpoint support is not included
- **Code Analysis**: Static analysis or security scanning of submitted code is not performed
- **Execution Queuing**: When all nodes are at capacity, requests fail immediately (no queue)
