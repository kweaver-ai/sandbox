# Tasks: Runtime Executor (sandbox-executor)

**Input**: Design documents from `/specs/001-runtime-executor/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/executor-api.yaml

**Tests**: Tests are MANDATORY per Constitution Principle II (Test-Driven Quality). This is a security-critical component requiring comprehensive test coverage.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Single project structure per plan.md:
- **Source code**: `executor/src/`
- **Tests**: `executor/tests/`
- **Config**: `executor/pyproject.toml`, `executor/Dockerfile`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create executor directory structure with src/, tests/, tests/contract/, tests/integration/, tests/unit/ subdirectories
- [X] T002 Initialize Python project with pyproject.toml including FastAPI, uvicorn, httpx, psutil, structlog, pytest, pytest-asyncio dependencies
- [X] T003 [P] Create .dockerignore for executor container builds
- [X] T004 [P] Create Dockerfile for sandbox-executor with Python 3.11-slim base image, bubblewrap installation, and non-root user (UID:GID=1000:1000)
- [X] T005 [P] Configure black formatting and flake8 linting in pyproject.toml
- [X] T006 [P] Create README.md in executor/ with quickstart reference and architecture overview

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Create base Pydantic models in executor/src/models.py for ExecutionRequest, ExecutionResult, ExecutionMetrics, ArtifactMetadata, HeartbeatSignal, ContainerLifecycleEvent per data-model.md
- [X] T008 [P] Configure structlog for JSON logging in executor/src/logging_config.py with timestamp, level, execution_id, container_id, event_type fields
- [X] T009 [P] Create error response models in executor/src/models.py with error_code, description, error_detail, solution, request_id fields
- [X] T010 Implement environment configuration in executor/src/config.py for CONTROL_PLANE_URL, INTERNAL_API_TOKEN, EXECUTOR_PORT, LOG_LEVEL, WORKSPACE_PATH using pydantic-settings
- [X] T011 [P] Create base test fixtures in executor/tests/fixtures.py with sample execution requests and control plane mock server
- [X] T012 [P] Create test utilities in executor/tests/utils.py for mock HTTP servers, temporary workspace directories, and test execution helpers

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Execute Code with Result Capture (Priority: P1) 🎯 MVP

**Goal**: Receive code execution requests, execute in isolation, capture stdout/stderr/metrics/return value, return complete results

**Independent Test**: Send Python handler via POST to `/execute`, verify response contains status, stdout, stderr, exit_code, execution_time, return_value, metrics, artifacts

### Tests for User Story 1 (MANDATORY - Constitution Principle II)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T013 [P] [US1] Contract test for /execute endpoint request schema in executor/tests/contract/test_execute_endpoint.py (validates ExecutionRequest schema)
- [X] T014 [P] [US1] Contract test for /execute endpoint success response in executor/tests/contract/test_execute_endpoint.py (validates ExecutionResult schema with all fields)
- [X] T015 [P] [US1] Contract test for /execute endpoint error responses (400, 500) in executor/tests/contract/test_execute_endpoint.py
- [X] T016 [P] [US1] Contract test for /health endpoint in executor/tests/contract/test_health_endpoint.py
- [X] T017 [P] [US1] Integration test for Python execution success in executor/tests/integration/test_python_execution.py (handler with return value)
- [X] T018 [P] [US1] Integration test for Python execution failure in executor/tests/integration/test_python_execution.py (runtime error with traceback)
- [X] T019 [P] [US1] Integration test for timeout enforcement in executor/tests/integration/test_timeout.py (30s timeout, code sleeps 60s)
- [X] T020 [P] [US1] Integration test for metrics collection in executor/tests/integration/test_metrics.py (duration_ms, cpu_time_ms captured)

### Implementation for User Story 1

- [X] T021 [P] [US1] Create result parser in executor/src/result_parser.py to extract return value from stdout using ===SANDBOX_RESULT=== markers (parse_return_value function)
- [X] T022 [P] [US1] Create metrics collector in executor/src/metrics.py to measure wall-clock time (time.perf_counter) and CPU time (time.process_time)
- [X] T023 [US1] Implement Python wrapper code generator in executor/src/code_wrapper.py to inject Lambda-style handler wrapper around user code (reads event from stdin, calls handler(), prints markers)
- [X] T024 [US1] Implement core executor in executor/src/executor.py with execute_code() function that builds bwrap command, runs subprocess via subprocess.run() with timeout, captures stdout/stderr/exit_code (depends on T021, T022, T023)
- [X] T025 [US1] Implement /execute endpoint in executor/src/main.py FastAPI app that accepts ExecutionRequest, calls executor.execute_code(), returns ExecutionResult (depends on T024)
- [X] T026 [US1] Implement /health endpoint in executor/src/main.py that returns 200 OK with status=healthy, version, uptime_seconds, active_executions
- [X] T027 [US1] Add stdout/stderr truncation in executor/src/executor.py (10MB limit per stream with warning logged)
- [X] T028 [US1] Add request validation in executor/src/main.py (code size ≤1MB, timeout 1-3600s, language whitelist, execution_id pattern)
- [X] T029 [US1] Add execution state tracking in executor/src/executor.py (active_executions dict for /health endpoint)
- [X] T030 [US1] Add structured logging for execution lifecycle in executor/src/executor.py (execution_started, execution_completed, execution_failed events)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Report Results to Control Plane (Priority: P1)

**Goal**: Asynchronously report execution results to Control Plane via internal API with retry logic and local persistence fallback

**Independent Test**: Mock Control Plane /internal/executions/{id}/result endpoint, trigger execution, verify POST with correct auth headers and payload structure

### Tests for User Story 2 (MANDATORY - Constitution Principle II)

- [X] T031 [P] [US2] Contract test for Control Plane result reporting callback in executor/tests/contract/test_callback_client.py (validates POST to /internal/executions/{id}/result)
- [X] T032 [P] [US2] Integration test for successful result reporting in executor/tests/integration/test_result_reporting.py (mock Control Plane, verify POST within 5s)
- [X] T033 [P] [US2] Integration test for retry on 401 Unauthorized in executor/tests/integration/test_result_reporting.py (verify log and retry)
- [X] T034 [P] [US2] Integration test for retry on network timeout in executor/tests/integration/test_result_reporting.py (verify exponential backoff 1s, 2s, 4s, max 10s)
- [X] T035 [P] [US2] Integration test for local persistence fallback in executor/tests/integration/test_result_reporting.py (verify save to /tmp/results/{id}.json on final failure)

### Implementation for User Story 2

- [X] T036 [P] [US2] Create Control Plane callback client in executor/src/callback_client.py with httpx.AsyncClient, report_result() and report_heartbeat() methods (configure 5s connect timeout, 30s read timeout)
- [X] T037 [US2] Implement retry logic in executor/src/callback_client.py with exponential backoff (1s, 2s, 4s, 8s, max 10s) for network errors and 5xx responses (max 5 attempts)
- [X] T038 [US2] Implement local persistence fallback in executor/src/callback_client.py (save to /tmp/results/{execution_id}.json after max retries)
- [X] T039 [US2] Add Authorization header with INTERNAL_API_TOKEN in executor/src/callback_client.py (Bearer token format)
- [X] T040 [US2] Integrate callback client into executor/src/executor.py (call report_result() after execution completes, await but don't block response)
- [X] T041 [US2] Add callback error logging in executor/src/callback_client.py (log all retry attempts with context)
- [X] T042 [US2] Add idempotency support in executor/src/callback_client.py (Idempotency-Key header for retry requests)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Maintain Process Isolation with Bubblewrap (Priority: P1)

**Goal**: Run all user code in Bubblewrap sandbox with namespace isolation (PID/NET/MNT/IPC/UTS), read-only filesystem, resource limits

**Independent Test**: Submit code attempting escape (read /etc/passwd, network access, modify system dirs), verify all fail with appropriate errors

### Tests for User Story 3 (MANDATORY - Constitution Principle I - Security Review Required)

- [X] T043 [P] [US3] Security test for filesystem isolation in executor/tests/integration/test_isolation.py (attempt read /etc/passwd, verify permission error)
- [X] T044 [P] [US3] Security test for network isolation in executor/tests/integration/test_isolation.py (attempt HTTP request, verify "Network unreachable")
- [X] T045 [P] [US3] Security test for workspace write access in executor/tests/integration/test_isolation.py (write file in /workspace, verify accessible to artifact scanner)
- [X] T046 [P] [US3] Security test for process isolation in executor/tests/integration/test_isolation.py (verify executor process unaffected by user code crash)
- [X] T047 [P] [US3] Unit test for bwrap argument generation in executor/tests/unit/test_bwrap_args.py (verify all security flags present)
- [X] T048 [P] [US3] Integration test for privilege drop in executor/tests/integration/test_isolation.py (verify --cap-drop ALL, --no-new-privs flags)

### Implementation for User Story 3

- [X] T049 [P] [US3] Create Bubblewrap wrapper in executor/src/isolation.py with build_bwrap_command() function (constructs bwrap argument list per research.md)
- [X] T050 [US3] Implement read-only system mounts in executor/src/isolation.py (--ro-bind for /usr, /lib, /lib64, /bin, /sbin)
- [X] T051 [US3] Implement workspace bind mount in executor/src/isolation.py (--bind for workspace_path to /workspace, --chdir to /workspace)
- [X] T052 [US3] Implement namespace isolation flags in executor/src/isolation.py (--unshare-all, --unshare-net, --proc, --dev)
- [X] T053 [US3] Implement security flags in executor/src/isolation.py (--die-with-parent, --new-session, --cap-drop ALL, --no-new-privs)
- [X] T054 [US3] Implement resource limits in executor/src/isolation.py (--rlimit NPROC=128, --rlimit NOFILE=1024)
- [X] T055 [US3] Add bwrap availability check in executor/src/main.py startup (verify bwrap binary exists, exit 1 if missing)
- [X] T056 [US3] Add workspace availability check in executor/src/main.py startup (verify workspace directory exists and is writable, fail fast if not)
- [X] T057 [US3] Integrate bwrap wrapper into executor/src/executor.py (use build_bwrap_command() instead of direct subprocess call)

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: User Story 4 - Send Heartbeat Signals (Priority: P2)

**Goal**: Send heartbeat signals every 5 seconds during execution to Control Plane for crash detection

**Independent Test**: Start 30s execution, monitor heartbeat POSTs to /internal/executions/{id}/heartbeat, verify arrival every 5±1s

### Tests for User Story 4 (MANDATORY)

- [ ] T058 [P] [US4] Integration test for heartbeat transmission in executor/tests/integration/test_heartbeat.py (30s execution, verify heartbeat every 5±1s)
- [ ] T059 [P] [US4] Integration test for heartbeat on network partition in executor/tests/integration/test_heartbeat.py (Control Plane unresponsive, verify heartbeat continues with error logs)
- [ ] T060 [P] [US4] Integration test for heartbeat stops on completion in executor/tests/integration/test_heartbeat.py (verify no heartbeat after result reported)

### Implementation for User Story 4

- [ ] T061 [US4] Create heartbeat manager in executor/src/heartbeat.py with start_heartbeat() and stop_heartbeat() functions (asyncio background task)
- [ ] T062 [US4] Implement 5-second interval loop in executor/src/heartbeat.py (asyncio.sleep(5) between POSTs)
- [ ] T063 [US4] Add stop_event for graceful cancellation in executor/src/heartbeat.py (asyncio.Event for shutdown)
- [ ] T064 [US4] Add heartbeat payload in executor/src/heartbeat.py (timestamp field, optional progress dict)
- [ ] T065 [US4] Integrate heartbeat into executor/src/executor.py (start heartbeat before execution, stop after completion)
- [ ] T066 [US4] Add heartbeat error handling in executor/src/heartbeat.py (log errors but don't fail execution)

---

## Phase 7: User Story 5 - Handle Container Lifecycle Events (Priority: P2)

**Goal**: Report container_ready on startup and container_exited on shutdown to Control Plane for scheduler tracking

**Independent Test**: Start executor container, verify container_ready POST within 2s, send SIGTERM, verify container_exited POST with exit_code=143

### Tests for User Story 5 (MANDATORY)

- [ ] T067 [P] [US5] Integration test for container_ready callback in executor/tests/integration/test_lifecycle.py (start executor, verify POST within 2s with container_id, executor_port, ready_at)
- [ ] T068 [P] [US5] Integration test for container_exited on SIGTERM in executor/tests/integration/test_lifecycle.py (send SIGTERM, verify POST with exit_code=143, exit_reason=sigterm)
- [ ] T069 [P] [US5] Integration test for marking running executions as crashed in executor/tests/integration/test_lifecycle.py (active executions marked crashed on shutdown)

### Implementation for User Story 5

- [ ] T070 [P] [US5] Create lifecycle manager in executor/src/lifecycle.py with send_container_ready() and send_container_exited() functions
- [ ] T071 [US5] Implement container_ready payload in executor/src/lifecycle.py (container_id from env, pod_name from env, executor_port from config, ready_at timestamp)
- [ ] T072 [US5] Implement container_exited payload in executor/src/lifecycle.py (exit_code, exit_reason enum: normal/sigterm/sigkill/oom_killed/error, exited_at timestamp)
- [ ] T073 [US5] Register SIGTERM handler in executor/src/main.py using signal.signal() (calls lifecycle.shutdown())
- [ ] T074 [US5] Implement shutdown logic in executor/src/lifecycle.py (mark active executions as crashed via callback_client, send container_exited, exit with code 143)
- [ ] T075 [US5] Add container_id detection in executor/src/main.py (read from HOSTNAME or CONTAINER_ID env var)
- [ ] T076 [US5] Integrate container_ready into executor/src/main.py startup (call after HTTP server starts listening)
- [ ] T077 [US5] Add active_executions tracking in executor/src/executor.py (dict for lifecycle shutdown to mark crashed)

---

## Phase 8: User Story 6 - Collect and Report Generated Artifacts (Priority: P3)

**Goal**: Scan workspace after execution, detect generated files, extract metadata (size, mime_type), report in artifacts array

**Independent Test**: Execute code writing files to /workspace, verify artifacts array includes paths with correct metadata, excludes hidden files

### Tests for User Story 6 (MANDATORY)

- [ ] T078 [P] [US6] Unit test for artifact scanning in executor/tests/unit/test_artifact_scanner.py (create files in temp dir, verify all non-hidden files found)
- [ ] T079 [P] [US6] Unit test for hidden file exclusion in executor/tests/unit/test_artifact_scanner.py (verify files starting with . excluded)
- [ ] T080 [P] [US6] Unit test for relative path calculation in executor/tests/unit/test_artifact_scanner.py (verify paths relative to workspace root)
- [ ] T081 [P] [US6] Unit test for MIME type detection in executor/tests/unit/test_artifact_scanner.py (verify mimetypes.guess_type or application/octet-stream fallback)
- [ ] T082 [P] [US6] Integration test for nested directory scanning in executor/tests/integration/test_artifacts.py (create file in /workspace/outputs/january/report.pdf, verify path=outputs/january/report.pdf)

### Implementation for User Story 6

- [ ] T083 [P] [US6] Create artifact scanner in executor/src/artifact_scanner.py with collect_artifacts() function (recursive pathlib scan)
- [ ] T084 [US6] Implement hidden file filtering in executor/src/artifact_scanner.py (exclude files where name.startswith("."))
- [ ] T085 [US6] Implement relative path calculation in executor/src/artifact_scanner.py (path.relative_to(workspace))
- [ ] T086 [US6] Implement file metadata extraction in executor/src/artifact_scanner.py (size from stat().st_size, mime_type from mimetypes.guess_type())
- [ ] T087 [US6] Add artifact type classification in executor/src/artifact_scanner.py (map extensions to artifact/log/output types)
- [ ] T088 [US6] Integrate artifact scanning into executor/src/executor.py (call collect_artifacts() after execution completes, include in ExecutionResult.artifacts)

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T089 [P] Add JavaScript execution support in executor/src/executor.py (node command, write code to temp file, --ro-bind file to sandbox)
- [ ] T090 [P] Add Shell execution support in executor/src/executor.py (bash -c command)
- [ ] T091 [P] Add execution queue management in executor/src/main.py (track active executions, return 503 if queue exceeds 10)
- [ ] T092 [P] Improve error messages in executor/src/executor.py (actionable messages for common failures: bwrap not found, timeout, handler not defined)
- [ ] T093 [P] Add Prometheus metrics endpoint in executor/src/main.py (/metrics endpoint for execution_count, success_rate, latency_histogram, active_executions_gauge)
- [ ] T094 [P] Add request ID generation in executor/src/main.py (UUID for tracing, include in logs and error responses)
- [ ] T095 [P] Create Docker Compose setup in executor/docker-compose.yml (executor + mock Control Plane for local testing)
- [ ] T096 [P] Update executor/Dockerfile with production optimizations (multi-stage build, non-root user, minimal base image)
- [ ] T097 [P] Add development mode toggle in executor/src/config.py (DEBUG env var for verbose logging and error stack traces)
- [ ] T098 Run all tests with pytest and verify 100% pass rate
- [ ] T099 Run contract tests with pytest executor/tests/contract/ and verify OpenAPI schema compliance
- [ ] T100 Run integration tests with pytest executor/tests/integration/ and verify end-to-end execution flow
- [ ] T101 Run security tests with pytest executor/tests/integration/test_isolation.py and verify 100% escape attempt failure rate
- [ ] T102 Validate quickstart.md by following all steps in fresh container
- [ ] T103 Measure execution overhead with performance test (simple handler, verify ≤50ms p95)
- [ ] T104 Measure memory usage with performance test (verify base memory ≤100MB)
- [ ] T105 Code review for Constitution compliance (verify multi-layer isolation, least privilege, input validation, structured logging)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - User Story 1 (Phase 3), User Story 2 (Phase 4), User Story 3 (Phase 5) are all P1 and can proceed in parallel after Foundational
  - User Story 4 (Phase 6) and User Story 5 (Phase 7) are P2, can proceed in parallel after P1 stories
  - User Story 6 (Phase 8) is P3, can proceed in parallel with other stories after Foundational
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Integrates with US1 executor but independently testable
- **User Story 3 (P1)**: Can start after Foundational (Phase 2) - Integrates with US1 executor but independently testable
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - Integrates with US1 and US2 but independently testable
- **User Story 5 (P2)**: Can start after Foundational (Phase 2) - Integrates with US1 and US2 but independently testable
- **User Story 6 (P3)**: Can start after Foundational (Phase 2) - Integrates with US1 executor but independently testable

### Within Each User Story

- Tests MUST be written and FAIL before implementation (Constitution Principle II)
- Models/utilities before core implementation
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- All P1 user stories (US1, US2, US3) can be worked on in parallel by different team members after Foundational phase
- All tests for a user story marked [P] can run in parallel
- Utilities within a story marked [P] can run in parallel
- P2 user stories (US4, US5) can be worked on in parallel after P1 stories complete
- P3 user story (US6) can be worked on in parallel with any story after Foundational

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
echo "T013: Contract test for /execute request schema"
echo "T014: Contract test for /execute success response"
echo "T015: Contract test for /execute error responses"
echo "T016: Contract test for /health endpoint"
echo "T017: Integration test for Python execution success"
echo "T018: Integration test for Python execution failure"
echo "T019: Integration test for timeout enforcement"
echo "T020: Integration test for metrics collection"

# Launch all utilities for User Story 1 together:
echo "T021: Create result parser"
echo "T022: Create metrics collector"
echo "T023: Implement Python wrapper code generator"

# These run sequentially (dependencies):
echo "T024: Implement core executor (depends on T021-T023)"
echo "T025: Implement /execute endpoint (depends on T024)"
echo "T026: Implement /health endpoint (no dependencies)"
```

---

## Parallel Example: All P1 Stories (Team of 3)

```bash
# After Foundational phase completes, team splits:

# Developer A works on User Story 1:
T021-T030 (Execute Code with Result Capture)

# Developer B works on User Story 2:
T031-T042 (Report Results to Control Plane)

# Developer C works on User Story 3:
T043-T057 (Maintain Process Isolation with Bubblewrap)

# All three P1 stories complete independently and can be tested separately
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T006)
2. Complete Phase 2: Foundational (T007-T012) - CRITICAL, blocks all stories
3. Complete Phase 3: User Story 1 (T013-T030)
4. **STOP and VALIDATE**: Test User Story 1 independently with curl or pytest
5. Deploy/demo executor with basic execution capability

**Deliverable**: Executor that can execute Python code and return results, without Control Plane callbacks or heartbeat

### Incremental Delivery (All P1 Stories)

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Has basic execution (MVP!)
3. Add User Story 2 → Test independently → Has Control Plane callbacks
4. Add User Story 3 → Test independently → Has Bubblewrap isolation (Production-ready!)
5. Each P1 story adds critical functionality without breaking previous stories

**Deliverable**: Production-ready executor with secure isolation and result persistence

### Full Feature Set (P1 + P2 + P3)

1. Complete P1 stories (US1, US2, US3) → Production executor
2. Add User Story 4 → Test independently → Has heartbeat for crash detection
3. Add User Story 5 → Test independently → Has lifecycle event reporting
4. Add User Story 6 → Test independently → Has artifact collection
5. Polish phase → Optimization, monitoring, documentation

**Deliverable**: Complete executor with all features from specification

### Parallel Team Strategy (Recommended for P1 Stories)

With multiple developers after Foundational phase:

1. Team completes Setup + Foundational together (T001-T012)
2. Once Foundational is done:
   - Developer A: User Story 1 (T013-T030) - Core execution
   - Developer B: User Story 2 (T031-T042) - Callback client
   - Developer C: User Story 3 (T043-T057) - Bubblewrap isolation
3. Stories complete and integrate independently
4. Team reviews integration points and runs cross-story tests
5. Move to P2 stories (US4, US5) in parallel or sequentially based on team capacity

**Time Savings**: P1 stories complete in ~1/3 the time vs sequential development

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Constitution Principle II: Tests MUST be written FIRST and FAIL before implementation
- Constitution Principle I: Security review REQUIRED for User Story 3 (isolation changes)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All P1 stories (US1, US2, US3) are security-critical and must pass security review
- Verify all tests pass before marking story complete
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

---

## Summary

- **Total Tasks**: 105
- **Setup Tasks**: 6 (T001-T006)
- **Foundational Tasks**: 6 (T007-T012) - BLOCKS all user stories
- **User Story 1 (P1)**: 18 tasks (T013-T030) - Core execution
- **User Story 2 (P1)**: 12 tasks (T031-T042) - Callback client
- **User Story 3 (P1)**: 15 tasks (T043-T057) - Bubblewrap isolation
- **User Story 4 (P2)**: 9 tasks (T058-T066) - Heartbeat
- **User Story 5 (P2)**: 11 tasks (T067-T077) - Lifecycle events
- **User Story 6 (P3)**: 11 tasks (T078-T088) - Artifact collection
- **Polish Tasks**: 17 tasks (T089-T105)

**Parallel Opportunities**: 42 tasks marked [P] can run in parallel within their phases

**Suggested MVP Scope**: User Story 1 only (T001-T030) - delivers basic code execution capability

**Suggested Production Scope**: All P1 stories (US1, US2, US3) - delivers secure, production-ready executor

**Suggested Full Scope**: All stories (P1 + P2 + P3) - delivers complete executor per specification
