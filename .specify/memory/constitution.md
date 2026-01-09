<!--
Sync Impact Report
==================
Version Change: 1.1.0 → 1.2.0
Constitution Status: Minor amendment - new principle added

Modified Principles:
  - II. Test-Driven Quality (expanded with code quality requirements)
  - III. Performance Standards (enhanced with specific benchmarks)
  - VI. User Experience Consistency (expanded with interface standards)

Added Sections:
  - VII. Hexagonal Architecture Compliance (NEW)
  - New quality gate: Architecture Compliance Review
  - Updated code review checklist with architecture verification

Removed Sections: None

Templates Requiring Updates:
  ⚠ plan-template.md - Must add hexagonal architecture section
  ⚠ spec-template.md - Must reference architecture requirements
  ⚠ tasks-template.md - Must include architecture validation tasks
  ⚠ agent-file-template.md - No updates needed (agent-agnostic)
  ⚠ checklist-template.md - Must add architecture compliance items

Follow-up TODOs:
  - Refactor existing sandbox_control_plane/ to hexagonal structure
  - Create architecture validation scripts
  - Update PROJECT_STRUCTURE.md with dependency diagrams

Date: 2026-01-06
-->

# Sandbox Platform Constitution

## Core Principles

### I. Security-First Development

Every component MUST adhere to defense-in-depth principles:

- **Multi-Layer Isolation MANDATORY**: All code execution MUST implement both container isolation AND process isolation (Bubblewrap). No exceptions.
- **Least Privilege Enforcement**: All containers MUST run with non-privileged users (UID:GID=1000:1000), dropped capabilities (`CAP_DROP=ALL`), and network isolation (`NetworkMode=none`).
- **Zero Trust Boundaries**: All inputs from Control Plane to Runtime MUST be validated. All user code MUST be treated as untrusted, regardless of source.
- **Security Review Gates**: Any changes to isolation layers, container configurations, or privilege escalation mechanisms MUST pass security review before merge.

**Rationale**: The platform's primary purpose is secure execution of untrusted code. Security failures are existential risks. Defense-in-depth ensures that if one layer fails, additional layers prevent exploitation.

### II. Test-Driven Quality & Code Excellence

Quality MUST be built into the development process through comprehensive testing and code standards:

- **Test-First Development**: For all user-facing features, tests MUST be written BEFORE implementation. Tests MUST fail initially, then pass after implementation.
- **Three-Tier Testing Strategy**:
  1. **Contract Tests**: MANDATORY for all API endpoints and inter-service communication. Verify request/response schemas, error codes, and protocol compliance.
  2. **Integration Tests**: MANDATORY for session lifecycle, scheduler decisions, timeout enforcement, and multi-component workflows.
  3. **Unit Tests**: MANDATORY for business logic, data transformations, and utility functions with cyclomatic complexity > 5.
- **Test Independence**: Each user story MUST be independently testable. Tests for User Story P1 MUST pass without implementing User Story P2.
- **Coverage Requirements**: Minimum 80% code coverage for critical security paths (isolation, resource limits, timeout enforcement). Minimum 60% for non-critical paths.
- **Code Quality Standards**:
  - **Complexity Limits**: Maximum cyclomatic complexity of 10 per function. Complex logic MUST be refactored into smaller, testable functions.
  - **Function Length**: Maximum 50 lines per function (excluding comments/blank lines). Longer functions MUST be split.
  - **Parameter Count**: Maximum 5 parameters per function. More parameters REQUIRE a parameter object or data class.
  - **Naming Conventions**: Functions MUST use verb-noun naming (e.g., `create_session`, `validate_input`). Classes MUST use PascalCase. Variables MUST use snake_case.
  - **Documentation**: All public functions MUST have docstrings explaining: purpose, parameters, return values, and exceptions raised.
  - **Error Handling**: All external calls MUST have explicit error handling. Silent failures ARE PROHIBITED.
  - **Code Duplication**: Duplicated code blocks (> 10 lines) MUST be extracted into reusable functions. DRY principle is MANDATORY.
  - **Type Hints**: All Python functions MUST use type hints for parameters and return values.
- **Linting Standards**: All code MUST pass flake8 (or equivalent) with:
  - Maximum line length: 100 characters
  - No unused imports
  - No undefined variables
  - No syntax errors
- **Formatting Standards**: All code MUST be formatted with black (or equivalent) using project standard configuration.

**Rationale**: Secure isolation cannot be verified through manual testing alone. Automated tests ensure that security constraints, protocol compliance, and performance guarantees are maintained across all changes. Code quality standards prevent technical debt accumulation and ensure maintainability.

### III. Performance Standards

Performance is a feature, not an afterthought:

- **Latency SLAs**:
  - Persistent session reuse: ≤50ms (p95)
  - Warm pool allocation: ≤200ms (p95)
  - Cold start: ≤2s (p95)
  - API response time: ≤100ms (p95) for non-blocking operations
  - Execution result retrieval: ≤100ms (p95)
- **Resource Efficiency**:
  - Containers MUST enforce CPU and memory limits
  - Resource limits MUST be configurable per template
  - Default resource limits: 1 CPU core, 512MB memory per container
  - Maximum resource limits: 4 CPU cores, 2GB memory per container
- **Timeout Enforcement**: Timeout controls MUST be enforced at multiple levels (API, daemon, executor). Default timeout: 300s. Maximum timeout: 3600s.
- **Concurrency Support**:
  - Control Plane MUST support async operations (asyncio)
  - Runtime MUST handle concurrent execution requests without blocking
  - Minimum 100 concurrent sessions per Control Plane instance
  - Minimum 10 concurrent executions per session
- **Performance Testing**: MANDATORY for scheduler algorithms, warm pool management, and session lifecycle operations:
  - Performance tests MUST use realistic load patterns
  - Load tests MUST simulate 1000+ concurrent sessions
  - Stress tests MUST identify breaking points
  - Performance regression tests MUST run in CI/CD pipeline
- **Resource Monitoring**:
  - CPU usage MUST be monitored and alerted at > 80% sustained
  - Memory usage MUST be monitored and alerted at > 85% sustained
  - Container startup time MUST be tracked and optimized
  - Session reuse rate MUST be measured (target: > 80%)
- **Database Performance** (if applicable):
  - Connection pooling MUST be configured
  - Query execution time MUST be < 50ms (p95) for common queries
  - N+1 query problems MUST be eliminated
  - Database indexes MUST be optimized for query patterns

**Rationale**: The platform serves AI agent applications where latency directly impacts user experience. Performance regression can make the platform unusable for real-time agent workflows. Resource limits prevent runaway processes from affecting system stability.

### IV. Protocol-Driven Design

All communication MUST follow standardized, documented protocols:

- **RESTful API Compliance**: All Control Plane APIs MUST follow REST principles (appropriate HTTP verbs, resource-based URLs, standard status codes).
- **Versioned APIs**: APIs MUST be versioned (e.g., `/api/v1/`). Breaking changes require a new version. Old versions MUST be supported for at least one major release cycle.
- **Contract-First Development**: API contracts (request/response schemas) MUST be defined before implementation. OpenAPI/Swagger documentation MUST be kept in sync.
- **Runtime Protocol**: Communication between Control Plane and Runtime MUST use HTTP/HTTPS. WebSocket or gRPC MAY be used for streaming if justified.
- **Error Handling Standards**: All errors MUST return structured responses with error codes, messages, and request IDs. Internal details MUST NOT leak to external callers.
- **API Documentation Requirements**:
  - All endpoints MUST have OpenAPI/Swagger documentation
  - Request/response schemas MUST be explicitly defined
  - Error codes MUST be documented with possible causes
  - Example requests/responses MUST be provided
  - Authentication requirements MUST be clearly specified

**Rationale**: Protocol-driven design enables independent evolution of Control Plane and Runtime. Clear contracts prevent breaking changes and enable multi-language SDK development.

### V. Observability & Debugging

Debuggability is essential for operational excellence:

- **Structured Logging**: All components MUST use structured logging (JSON format). Logs MUST include: timestamp, level, request_id, component, and context.
- **Request Tracing**: All requests MUST have a trace ID. Trace IDs MUST propagate across Control Plane, Runtime, and Executor.
- **Metrics Collection**: Critical operations MUST emit Prometheus metrics:
  - Session creation/deletion rate
  - Execution success/failure rate
  - Latency percentiles (p50, p95, p99)
  - Resource utilization (CPU, memory, disk)
  - Cache hit rates (warm pool, session reuse)
- **Error Visibility**:
  - All errors MUST be logged with stack traces (in internal logs)
  - User-facing errors MUST be actionable and friendly
  - Error rates MUST be monitored and alerted
  - Error contexts MUST include request IDs for correlation
- **Debug Mode**: Development mode MUST provide verbose logging. Production mode MUST limit sensitive information in logs.
- **Health Checks**:
  - All services MUST expose `/health` endpoints
  - Health checks MUST verify critical dependencies (database, Redis, etc.)
  - Readiness checks MUST verify service availability
  - Liveness checks MUST detect deadlocks and hangs
- **Dashboard Requirements**:
  - Grafana dashboards MUST be configured for all services
  - Dashboards MUST include: request rate, error rate, latency, resource usage
  - Alerts MUST be configured for critical metrics
  - Runbooks MUST exist for common failure scenarios

**Rationale**: Distributed systems (Control Plane + Runtime) require comprehensive observability to diagnose issues. Without proper logging and metrics, debugging production issues becomes impossible.

### VI. User Experience Consistency

Consistency across interfaces reduces cognitive load and ensures professional quality:

- **CLI Interface Standards**: The `sandbox-run` CLI MUST follow Unix conventions:
  - Standard input/output (stdin → event data, stdout → results, stderr → errors)
  - Exit codes: 0 (success), 1-5 (specific error scenarios)
  - Flags: `--event`, `--context`, `--timeout`, `--profile`
  - Help text MUST be clear and concise
  - Examples MUST be provided in `--help` output
- **SDK Design**:
  - Python SDK MUST provide high-level abstractions (e.g., `SandboxClient.execute()`)
  - Low-level controls MUST be available (e.g., session management)
  - SDK MUST be thread-safe and async-compatible
  - SDK MUST handle retries with exponential backoff
  - SDK MUST provide clear error messages with actionable guidance
- **Error Message Quality**:
  - Error messages MUST be actionable (include what went wrong, why, and how to fix)
  - Technical jargon MUST be avoided for user-facing errors
  - Error messages MUST include request IDs for support
  - Common errors MUST have documentation links
  - Validation errors MUST indicate which fields failed and why
- **Documentation Completeness**:
  - All APIs MUST have docstrings
  - All public features MUST have examples
  - Quickstart guide MUST be tested by new users
  - API reference MUST be auto-generated from docstrings
  - Architecture diagrams MUST be kept current
  - Runbooks MUST exist for operational procedures
- **Interface Consistency**:
  - All CLI tools MUST use consistent flag naming (`--timeout` not `-t`, `--verbose` not `-v`)
  - All SDK methods MUST follow consistent naming patterns
  - All APIs MUST use consistent error response structures
  - All timestamps MUST use ISO 8601 format
  - All IDs MUST use UUID format
- **Accessibility**:
  - CLI output MUST be screen-reader friendly (avoid excessive Unicode)
  - Error messages MUST be clear and non-technical where possible
  - Documentation MUST follow accessibility guidelines (WCAG 2.1 AA)

**Rationale**: The platform serves both developers (via SDK) and end users (via CLI). Inconsistent interfaces increase learning curve and support burden. Professional-quality UX builds user trust and reduces support costs.

### VII. Hexagonal Architecture Compliance

All code MUST strictly follow the hexagonal architecture (Ports and Adapters pattern) as defined in `docs/PROJECT_STRUCTURE.md`:

- **Mandatory Four-Layer Structure**:
  - **Domain Layer** (`src/domain/`): Core business logic, entities, value objects, repository interfaces (Ports), domain services, and domain events. This layer MUST NOT depend on any outer layer.
  - **Application Layer** (`src/application/`): Use case orchestration, commands, queries, DTOs, application services, and command/query handlers. Coordinates domain objects to fulfill use cases.
  - **Infrastructure Layer** (`src/infrastructure/`): Technical implementations including persistence (ORM models, repository implementations), messaging, external service adapters (runtime, storage, HTTP clients), logging, and configuration.
  - **Interfaces Layer** (`src/interfaces/`): External communication including REST API (FastAPI routes, schemas, middlewares), CLI, gRPC, WebSocket, and any other interface adapters.

- **Dependency Rule MANDATORY**: Dependencies MUST ONLY point inward toward the domain core:
  - Domain → ZERO dependencies (pure Python business logic)
  - Application → MAY depend on Domain
  - Infrastructure → MAY depend on Domain and Application
  - Interfaces → MAY depend on Domain and Application
  - **VIOLATION**: Domain MUST NEVER depend on Infrastructure or Interfaces
  - **VIOLATION**: Application MUST NEVER depend on Infrastructure or Interfaces

- **Repository Pattern ENFORCEMENT**:
  - Repository interfaces MUST be defined in `src/domain/repositories/`
  - Repository implementations MUST be in `src/infrastructure/persistence/repositories/`
  - Domain layer interacts ONLY with repository interfaces, never concrete implementations
  - Infrastructure layer implements domain interfaces using specific technologies (SQLAlchemy, aiodocker, etc.)

- **Separation of Concerns**:
  - **Domain**: Business rules, invariants, entity behaviors (no FastAPI, no SQLAlchemy, no aiodocker)
  - **Application**: Use case workflows, transaction coordination, DTO transformations (no HTTP, no database specifics)
  - **Infrastructure**: External systems integration, persistence, messaging (no business logic)
  - **Interfaces**: Request/response handling, serialization, middleware (no business logic, no direct database access)

- **Package Organization MANDATORY**:
  ```
  src/
  ├── domain/
  │   ├── entities/          # Business entities (e.g., Session, Template, Execution)
  │   ├── value_objects/     # Immutable value types (e.g., ResourceLimits, Timeout)
  │   ├── repositories/      # Repository interfaces (Ports)
  │   ├── services/          # Domain services (business logic not fitting in entities)
  │   └── events/            # Domain events (e.g., SessionCreated, ExecutionCompleted)
  ├── application/
  │   ├── commands/          # Command DTOs (write operations)
  │   ├── queries/           # Query DTOs (read operations)
  │   ├── dtos/              # Data transfer objects
  │   ├── services/          # Application services (use case orchestration)
  │   └── handlers/          # Command/query handlers
  ├── infrastructure/
  │   ├── persistence/
  │   │   ├── models/        # ORM models (SQLAlchemy, etc.)
  │   │   └── repositories/  # Repository implementations
  │   ├── messaging/         # Message brokers, event handlers
  │   ├── external/          # External service adapters (runtime, storage, http)
  │   ├── logging/           # Logging configuration and handlers
  │   └── config/            # Configuration loading (env vars, config files)
  └── interfaces/
      ├── rest/
      │   ├── api/           # FastAPI routes
      │   ├── schemas/       # Pydantic request/response models
      │   └── middlewares/   # Custom middleware
      ├── cli/               # CLI commands
      ├── grpc/              # gRPC service implementations
      └── websocket/         # WebSocket handlers
  ```

- **Testing Structure MANDATORY**: Tests MUST mirror the source structure:
  - `tests/unit/domain/` - Test domain entities, value objects, domain services
  - `tests/unit/application/` - Test application services, handlers
  - `tests/integration/infrastructure/` - Test repository implementations, external adapters
  - `tests/integration/interfaces/` - Test API endpoints, CLI commands
  - `tests/contract/` - Contract tests for API schemas, protocol compliance

- **Import Restrictions ENFORCED**:
  - Domain entities MUST NOT import from `infrastructure` or `interfaces`
  - Application services MUST NOT import from `infrastructure` or `interfaces`
  - Infrastructure MAY import from `domain` and `application`
  - Interfaces MAY import from `domain` and `application`
  - Use dependency injection to provide infrastructure implementations to application layer

- **Module Boundaries**:
  - Each module MUST have clear responsibility per hexagonal architecture
  - No bypassing layers (e.g., interfaces directly calling infrastructure without application layer)
  - No business logic in interfaces or infrastructure layers
  - No technical details (FastAPI, SQLAlchemy) in domain or application layers

**Rationale**: Hexagonal architecture enables independent evolution of business logic, technical infrastructure, and external interfaces. Clear layer boundaries prevent coupling between business rules and implementation details, making the codebase testable, maintainable, and adaptable to change. Violating these boundaries creates technical debt that accumulates exponentially.

## Quality Gates

### Pre-Commit Requirements

- All code MUST pass linter checks (flake8 for Python, or equivalent for other languages)
- All code MUST be formatted (black for Python, or equivalent)
- All affected tests MUST pass locally
- Type hints MUST be complete (Python)
- No TODO or FIXME comments without associated issues

### Pre-Merge Requirements

- All contract tests MUST pass (100% compliance)
- All integration tests MUST pass (100% compliance)
- Unit test coverage MUST meet thresholds (80% critical, 60% non-critical)
- Security review MUST approve any changes to isolation layers
- API documentation MUST be updated if contracts changed
- Performance tests MUST pass if latency or resource usage affected
- Code complexity MUST be within limits (cyclomatic complexity ≤ 10)
- All new features MUST have associated documentation
- Architecture compliance MUST be verified (hexagonal layers, dependency direction)

### Code Review Standards

- At least one reviewer MUST approve all changes
- Reviewers MUST check for security violations (isolation, privilege escalation, input validation)
- Reviewers MUST verify test coverage and quality
- Reviewers MUST check for protocol compliance and error handling
- Reviewers MUST reject changes that lack sufficient logging or metrics
- Reviewers MUST verify code quality standards (complexity, length, naming)
- Reviewers MUST verify hexagonal architecture compliance (layer boundaries, dependency direction)
- Complex code MUST be justified against constitution principles
- All comments MUST be clear and add value (no "what" comments, only "why")

### Deployment Requirements

- All tests MUST pass in CI/CD pipeline
- No critical security vulnerabilities in dependency scans
- No high-severity security vulnerabilities without mitigation plan
- Rollback plan MUST be documented for breaking changes
- Metrics dashboards MUST be configured for new features
- Runbooks MUST exist for operational procedures
- Performance baseline MUST be established for new services

## Development Workflow

### Feature Development Process

1. **Specification**: Write feature spec with user stories, acceptance criteria, and success metrics
2. **Planning**: Create implementation plan with technical context and constitution compliance check
3. **Architecture Design**: Design hexagonal layer structure before implementation
4. **Testing**: Write contract and integration tests FIRST. Verify tests FAIL.
5. **Implementation**: Write code to make tests pass
   - Follow hexagonal architecture (domain → application → infrastructure → interfaces)
   - Follow code quality standards (complexity, length, naming)
   - Add type hints and docstrings
   - Add logging and metrics
6. **Review**: Code review MUST verify constitution compliance
7. **Documentation**: Update API docs, runbooks, and architecture diagrams
8. **Validation**: Run quickstart guide to verify user experience

### Code Review Checklist

- [ ] Security: No violations of isolation, privilege, or input validation principles
- [ ] Tests: Contract, integration, and unit tests present and passing
- [ ] Coverage: Meets minimum thresholds (80% critical, 60% non-critical)
- [ ] Performance: No regressions, performance tests pass if applicable
- [ ] Quality: Code complexity ≤ 10, function length ≤ 50 lines, proper naming
- [ ] Architecture: Hexagonal layers respected, dependencies point inward, no layer violations
- [ ] Documentation: Docstrings present, API docs updated, examples provided
- [ ] Observability: Structured logging, metrics collection, error handling
- [ ] Protocol: RESTful compliance, versioned APIs, structured errors
- [ ] UX: Consistent interface, actionable error messages, clear documentation

### Technical Debt Management

- Technical debt MUST be tracked in issues with severity labels
- Technical debt MUST be reviewed monthly and prioritized
- Technical debt MUST have estimated remediation cost
- New technical debt MUST be justified in code review
- Technical debt MUST be repaid before it accumulates to critical levels

## Governance

### Amendment Process

1. Propose amendment with rationale and impact analysis
2. Document how amendment affects existing templates and workflows
3. Update constitution with version bump according to semantic versioning:
   - MAJOR: Backward-incompatible changes (principle removal or redefinition)
   - MINOR: New principle or section added, or materially expanded guidance
   - PATCH: Clarifications, wording improvements, non-semantic refinements
4. Update all dependent templates to align with new principles
5. Communicate changes to all contributors
6. Update all documentation to reference new version

### Compliance Review

- All pull requests MUST reference applicable constitution principles
- Reviewers MAY reject changes that violate core principles without exception
- Violations MAY be accepted ONLY if:
  - Explicitly justified in complexity tracking table
  - No simpler alternative exists
  - Security review approves
  - Team agrees to accept technical debt
  - Remediation plan is documented

### Versioning Policy

- This constitution follows semantic versioning (MAJOR.MINOR.PATCH)
- Current version: 1.1.0 (enhanced quality and performance principles)
- All templates and documentation MUST reference constitution version
- Changes to constitution MUST trigger review of dependent artifacts
- Version history MUST be maintained in this document

### Living Document

- This constitution evolves with the project
- Team members MAY propose amendments at any time
- Amendments require team discussion and consensus
- This document MUST be reviewed quarterly for relevance
- This document MUST be taught to all new contributors
- Compliance MUST be verified in regular code audits

**Version**: 1.2.0 | **Ratified**: 2026-01-06 | **Last Amended**: 2026-01-06
