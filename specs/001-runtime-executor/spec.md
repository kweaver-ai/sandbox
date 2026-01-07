# Feature Specification: Runtime Executor (sandbox-executor)

**Feature Branch**: `001-runtime-executor`
**Created**: 2025-01-06
**Status**: Draft
**Input**: User description: "runtime/executor 构建 具体文档请参考 @docs/sandbox-design-v2.1.md 2.3 执行器 章节，api 文档参考 @docs/api/"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Execute Code with Result Capture (Priority: P1)

As a Control Plane operator, I need the executor to receive code execution requests and return complete execution results including stdout, stderr, exit code, performance metrics, and handler return values, so that AI agents can get comprehensive feedback from their code execution.

**Why this priority**: This is the core value proposition of the sandbox platform - enabling safe code execution with full observability. Without this, the platform cannot deliver its primary function.

**Independent Test**: Can be fully tested by sending a simple Python handler function via HTTP POST to the executor's `/execute` endpoint and verifying the response contains all required fields (status, stdout, stderr, exit_code, execution_time, return_value, metrics, artifacts).

**Acceptance Scenarios**:

1. **Given** a healthy executor container with HTTP API listening on port 8080, **When** a valid execution request is submitted with Python code defining a `handler(event)` function, **Then** the system returns a success response with execution results including handler return value parsed from stdout markers, performance metrics (duration_ms, cpu_time_ms), exit code 0, and any generated file artifacts.

2. **Given** an executor with valid authentication credentials, **When** code containing a runtime error (e.g., NameError) is submitted, **Then** the system returns a failed status with stderr containing the full traceback and exit code 1, with no return value.

3. **Given** an executor process running inside a container, **When** the execution request specifies a 30-second timeout and the code runs for longer than 30 seconds, **Then** the subprocess is terminated, a timeout status is returned, and stderr indicates timeout occurred.

---

### User Story 2 - Report Results to Control Plane (Priority: P1)

As a Control Plane system, I need the executor to asynchronously report execution results via internal API callbacks, so that results are persisted in the database and queryable by clients even if the executor container is destroyed.

**Why this priority**: Result persistence is essential for the platform's API contract with clients. Without this, clients cannot retrieve execution results asynchronously, breaking the fundamental request-response pattern.

**Independent Test**: Can be fully tested by mocking the Control Plane's internal API endpoint, triggering an execution, and verifying the executor POSTs results to `/internal/executions/{execution_id}/result` with correct authentication headers and payload structure.

**Acceptance Scenarios**:

1. **Given** an executor with INTERNAL_API_TOKEN configured and Control Plane endpoint accessible, **When** code execution completes successfully, **Then** the executor POSTs a result report to the internal API within 5 seconds with status=success, all metrics, and artifacts list.

2. **Given** an executor attempting to report results, **When** the Control Plane API returns 401 Unauthorized, **Then** the executor logs the authentication failure and locally persists the result for retry.

3. **Given** an executor experiencing network partition during result reporting, **When** the initial POST request times out, **Then** the executor saves results to `/tmp/results/{execution_id}.json` and initiates a background retry task with exponential backoff.

---

### User Story 3 - Maintain Process Isolation with Bubblewrap (Priority: P1)

As a platform security engineer, I need the executor to run all user code inside a Bubblewrap sandbox with namespace isolation, read-only filesystem, and resource limits, so that malicious or buggy code cannot escape the sandbox or affect the host system.

**Why this priority**: Security is the foundation of the entire platform. Without strong isolation guarantees, the platform cannot safely execute untrusted code from AI agents, which is its core purpose.

**Independent Test**: Can be fully tested by submitting code that attempts to escape the sandbox (e.g., reading host files, accessing network, modifying system directories) and verifying all attempts fail with appropriate errors, and that the executor process remains unaffected.

**Acceptance Scenarios**:

1. **Given** an executor with Bubblewrap configured, **When** user code attempts to read `/etc/passwd` on the host, **Then** the bwrap isolation prevents access and the code fails with a permission error, while the executor process continues running normally.

2. **Given** a workspace directory mounted at `/workspace`, **When** user code writes files to the current directory, **Then** files are created inside the bwrap sandbox's `/workspace` and are visible to the executor's artifact collection logic, but isolated from the host's filesystem.

3. **Given** bwrap executed with `--unshare-net` flag, **When** user code attempts to make HTTP requests or network connections, **Then** all network operations fail with "Network unreachable" errors, ensuring complete network isolation.

---

### User Story 4 - Send Heartbeat Signals (Priority: P2)

As a Control Plane health monitor, I need the executor to send periodic heartbeat signals every 5 seconds during execution, so that the system can distinguish between long-running tasks and actual executor crashes.

**Why this priority**: Heartbeat signals enable accurate crash detection and automatic recovery. Without this, the system might incorrectly terminate healthy long-running executions or fail to detect actual crashes.

**Independent Test**: Can be fully tested by starting a long-running execution (e.g., 30-second sleep), monitoring heartbeat POST requests to `/internal/executions/{execution_id}/heartbeat`, and verifying they arrive every 5±1 seconds with current timestamps.

**Acceptance Scenarios**:

1. **Given** an active execution in progress, **When** 5 seconds elapse since the last heartbeat, **Then** the executor sends a POST request to the heartbeat endpoint with the current timestamp.

2. **Given** an executor sending heartbeats, **When** the Control Plane stops responding (network partition), **Then** the executor continues sending heartbeats for the duration of the execution but logs connection errors.

3. **Given** an execution completing successfully, **When** the final result is reported, **Then** heartbeat transmission stops immediately without sending further signals.

---

### User Story 5 - Handle Container Lifecycle Events (Priority: P2)

As a Control Plane scheduler, I need the executor to report when it starts listening (container_ready) and when it shuts down (container_exited), so that the scheduler can accurately track container availability and make routing decisions.

**Why this priority**: Accurate container state tracking enables intelligent scheduling and warm pool management. Without this, the scheduler might route requests to unready containers or fail to clean up terminated ones.

**Independent Test**: Can be fully tested by starting a new executor container and verifying it sends a `container_ready` POST within 2 seconds of startup, then sending SIGTERM and verifying a `container_exited` POST with exit_code=143.

**Acceptance Scenarios**:

1. **Given** a container starting with the executor as PID 1, **When** the HTTP API begins listening on port 8080, **Then** the executor sends a container_ready callback with container_id, pod_name (if in K8s), executor_port=8080, and ready_at timestamp.

2. **Given** a running executor container, **When** the container receives SIGTERM (Kubernetes pod eviction), **Then** the executor gracefully shuts down, marks any running executions as crashed via callback, and sends container_exited with exit_code=143 and exit_reason=sigterm.

3. **Given** an executor container experiencing OOM kill, **When** the process is terminated by the kernel, **Then** the container_exited callback includes exit_reason=oom_killed if the executor can catch the signal, or the Control Plane detects the container disappearance via health probes.

---

### User Story 6 - Collect and Report Generated Artifacts (Priority: P3)

As an AI agent using the platform, I need any files created during code execution to be automatically detected, metadata-extracted, and made available for download, so that I can retrieve generated outputs like charts, CSVs, or model files.

**Why this priority**: Artifact collection is a key value-add feature that makes the platform useful for data science and content generation workflows, but the core platform can function without it in v1.

**Independent Test**: Can be fully tested by executing code that writes multiple files to different directories in `/workspace`, then verifying the artifacts array in the result includes all file paths with correct metadata (size, mime_type, type).

**Acceptance Scenarios**:

1. **Given** an executor with an empty `/workspace` directory, **When** user code creates `output/result.csv` (1024 bytes), `plots/summary.png` (500KB), and `.hidden_file.txt`, **Then** the artifacts list includes `output/result.csv` and `plots/summary.png` with correct sizes and mime types, but excludes `.hidden_file.txt` and any temporary files.

2. **Given** an execution generating large files (>100MB), **When** the execution completes, **Then** the executor scans the workspace, records file metadata in the artifacts array, and either uploads files directly to S3 or ensures they're persisted in the workspace volume.

3. **Given** a user writing files to nested directories like `/workspace/outputs/january/report.pdf`, **When** artifact collection runs, **Then** the artifact path is recorded as `outputs/january/report.pdf` (relative to workspace root) for consistent downloading.

---

### Edge Cases

- What happens when the user code spawns child processes that don't terminate when the parent process is killed? [Assumption: bwrap's `--die-with-parent` flag handles this by killing all child processes when the parent bwrap process terminates]
- How does the executor handle executions that generate gigabytes of stdout/stderr? [Assumption: Truncate at 10MB limit per stream and log warning to avoid memory exhaustion]
- What happens when the workspace volume is not mounted or is read-only? [Assumption: Executor fails fast with clear error message on startup]
- How does the executor behave when the Control Plane internal API is temporarily unavailable during result reporting? [Assumption: Implements retry with exponential backoff (1s, 2s, 4s, max 10s) and local persistence fallback]
- What happens when multiple execution requests arrive simultaneously to the same executor? [Assumption: Queue requests and execute sequentially, return 503 Service Unavailable if queue exceeds capacity]
- How does the executor handle malformed execution requests (missing required fields, invalid timeout values)? [Assumption: Return 400 Bad Request with specific validation error messages]
- What happens when the Bubblewrap binary is not present in the container? [Assumption: Executor logs critical error and exits with status 1, failing the container readiness check]

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The executor MUST provide an HTTP API listening on port 8080 with a `/execute` endpoint that accepts POST requests containing code, language, timeout, stdin, and execution_id parameters.
- **FR-002**: The executor MUST execute Python user code using AWS Lambda-style handler semantics (a `def handler(event: dict) -> dict:` function) and return the handler's JSON-serializable return value.
- **FR-003**: The executor MUST use Bubblewrap (bwrap) to execute all user code in an isolated environment with separate PID, network, mount, IPC, and UTS namespaces.
- **FR-004**: The executor MUST enforce a configurable timeout on user code execution, terminating the subprocess if it exceeds the specified duration.
- **FR-005**: The executor MUST capture stdout, stderr, exit code, execution time, CPU time, peak memory usage, and a list of generated files for each execution.
- **FR-006**: The executor MUST parse the handler return value from stdout by looking for `===SANDBOX_RESULT===` and `===SANDBOX_RESULT_END===` markers and extracting the JSON between them.
- **FR-007**: The executor MUST report execution results to the Control Plane via HTTP POST to `/internal/executions/{execution_id}/result` with an `Authorization: Bearer {INTERNAL_API_TOKEN}` header.
- **FR-008**: The executor MUST send heartbeat signals every 5 seconds during active executions via POST to `/internal/executions/{execution_id}/heartbeat`.
- **FR-009**: The executor MUST scan the `/workspace` directory recursively after execution and list all non-hidden files as artifacts with relative paths, file sizes, and detected MIME types.
- **FR-010**: The executor MUST send a `container_ready` callback when the HTTP API starts listening and a `container_exited` callback when the process terminates.
- **FR-011**: The executor MUST implement retry logic with exponential backoff (1s, 2s, 4s, max 10s) when Control Plane API calls fail.
- **FR-012**: The executor MUST provide a `/health` endpoint that returns 200 OK when the service is ready to accept execution requests.
- **FR-013**: The executor MUST log all operations in structured JSON format including timestamps, execution IDs, and error details.
- **FR-014**: The executor MUST support Python (via `python3 -c`), JavaScript (via `node`), and Shell (via `bash -c`) execution modes.
- **FR-015**: The executor MUST configure Bubblewrap with read-only mounts for system directories (`/usr`, `/lib`, `/bin`) and a writable bind mount for `/workspace`.
- **FR-016**: The executor MUST configure Bubblewrap with `--die-with-parent`, `--new-session`, `--unshare-all`, and `--cap-drop ALL` flags for maximum security.
- **FR-017**: The executor MUST handle SIGTERM gracefully by marking running executions as crashed, sending final callbacks, and exiting with code 143.
- **FR-018**: The executor MUST validate that the `handler` function exists in the global namespace before attempting to call it, and return a clear error if missing.

### Key Entities

- **Execution Request**: Represents a request to execute code in the sandbox. Contains code (string), language (enum), timeout (integer), stdin (string), execution_id (string), and event (optional JSON object for handler input).

- **Execution Result**: Represents the outcome of a code execution. Contains status (enum: success/failed/timeout/error), stdout (string), stderr (string), exit_code (integer), execution_time (float), return_value (JSON object or null), metrics (object with duration_ms, cpu_time_ms, peak_memory_mb), and artifacts (array of file paths).

- **Artifact Metadata**: Represents a file generated during execution. Contains path (relative to workspace), size (bytes), mime_type (string), type (enum: artifact/log/output), created_at (timestamp), and optional checksum.

- **Heartbeat Signal**: Represents a liveness signal during execution. Contains timestamp (ISO 8601) and optional progress information.

- **Container Lifecycle Event**: Represents executor container state changes. Contains event_type (enum: ready/exited), container_id, pod_name (optional), exit_code (for exited events), exit_reason (for exited events), and timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Executors can execute a simple Python "hello world" handler and return results within 100ms (p95) after receiving the request.
- **SC-002**: Executors successfully report 99.9% of execution results to the Control Plane within 5 seconds of execution completion.
- **SC-003**: Bubblewrap isolation prevents 100% of escape attempts (file access outside workspace, network operations, privilege escalation) in automated security tests.
- **SC-004**: Executors send heartbeat signals every 5±1 seconds during executions, with 99.9% reliability.
- **SC-005**: Executors can execute code for at least 10 minutes without leaking memory or file descriptors (memory usage stable, no increase in open FDs).
- **SC-006**: Executors gracefully handle SIGTERM and report container_exited within 2 seconds of receiving the signal.
- **SC-007**: Executors can queue and execute up to 10 concurrent requests sequentially without dropping requests or crashing.
- **SC-008**: Artifact collection correctly identifies 100% of non-hidden files in the workspace with accurate metadata (size, mime type) within 1 second of execution completion.

### Quality & Performance Requirements

#### Testing Requirements

- **Contract Tests**: All executor HTTP endpoints (`/execute`, `/health`) MUST have contract tests verifying request/response schemas match the OpenAPI specification.
- **Integration Tests**: End-to-end tests MUST verify the full execution flow: request → bwrap isolation → result capture → Control Plane callback.
- **Unit Test Coverage**: Minimum 80% coverage for security-critical code (bwrap argument generation, input validation, artifact scanning), 60% for other code.
- **Security Tests**: Automated tests MUST attempt common escape techniques (path traversal, symlink attacks, environment variable injection) and verify all fail.
- **Test Independence**: Each user story MUST be independently testable with mocked Control Plane endpoints.

#### Performance Requirements

- **Latency Targets**: Code execution overhead (excluding actual user code runtime) ≤50ms (p95) for simple handlers; result reporting to Control Plane ≤200ms (p95).
- **Resource Limits**: Base executor process memory ≤100MB; each bwrap child process limited to container-specified CPU/memory quotas.
- **Throughput**: Single executor instance MUST handle 10 concurrent queued executions without dropping requests or exceeding resource limits.
- **Timeout Behavior**: Default execution timeout: 30s; Maximum timeout: 3600s; Timeout enforcement accuracy: ±100ms.

#### Security Requirements

- **Isolation**: Multi-layer isolation MUST be maintained: (1) Container-level isolation (NetworkMode=none, non-privileged user), (2) Bubblewrap namespace isolation (PID/NET/MNT/IPC/UTS), (3) Read-only system filesystems, (4) Resource limits via ulimits.
- **Input Validation**: All HTTP request inputs MUST be validated: code size ≤1MB, timeout range 1-3600s, execution_id format validation, language whitelist (python/javascript/shell).
- **Privilege Constraints**: Executor MUST run as non-root user (UID:GID=1000:1000); Bubblewrap child processes MUST drop all Linux capabilities; `--no-new-privs` flag MUST be set.
- **Secrets Management**: INTERNAL_API_TOKEN MUST be passed via environment variable (not command-line args); token MUST NOT appear in logs or error messages.

#### Observability Requirements

- **Logging**: Structured JSON logging for all operations with fields: timestamp, level, execution_id, container_id, event_type, error details, metrics. Log level MUST be configurable (default: INFO).
- **Metrics**: Self-reporting metrics: execution_count, success_rate, failure_reasons (breakdown by error type), latency_histogram (execution time, result reporting time), active_executions_gauge.
- **Error Handling**: All errors MUST return actionable error messages with request IDs; internal errors MUST include stack traces in logs but not in HTTP responses.

### Out of Scope

- **Control Plane Implementation**: The Control Plane API endpoints, database persistence, and scheduling logic are separate features (handled by `control-plane` component).
- **Container Orchestration**: Docker/Kubernetes integration, pod creation, and volume mounting are handled by the Container Scheduler module.
- **Template Management**: Pre-installed packages, custom base images, and template versioning are out of scope for the executor (managed by Control Plane).
- **File Upload/Download APIs**: The client-facing file upload and download endpoints are Control Plane responsibilities; executor only reports file metadata.
- **Authentication/Authorization**: The executor only validates the INTERNAL_API_TOKEN for outbound requests; user authentication is handled by the Control Plane's external API.
- **Multi-Language Runtime Support Beyond Python/JavaScript/Shell**: Additional languages (Go, Java, Ruby, etc.) are deferred to future releases.
- **Network-Aware Executions**: All executions run with `--unshare-net` (network isolation); allowing selective network access is a future enhancement.
- **GPU/Accelerator Support**: GPU passthrough and hardware acceleration are out of scope for v1.
- **Distributed Execution**: Single executor per container; distributed/parallel execution frameworks (Dask, Ray) are not supported.
