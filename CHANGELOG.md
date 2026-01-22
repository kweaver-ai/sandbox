# Changelog

All new features and capabilities added in this branch (`feature/803264`) are documented below.

## [Unreleased]

### 🚀 New Features

#### Storage & Workspace
- **S3 Storage Integration with MinIO**
  - S3-compatible object storage backend
  - Direct file upload/download API
  - Workspace path management (`s3://bucket/sessions/{id}/`)
  - Multi-format file support

- **s3fs Workspace Mounting (Kubernetes)**
  - Container-level S3 bucket mounting via s3fs FUSE
  - Bind mount session directory to `/workspace`
  - No additional metadata database required
  - Production-ready for multi-node K8s clusters

- **Docker Volume Mounting**
  - Local development volume mounting
  - Workspace file persistence
  - Seamless S3 integration

#### Session Management
- **List Sessions API**
  - `GET /api/v1/sessions` with filtering support
  - Filter by: `status`, `template_id`, `created_after`, `created_before`
  - Pagination with `limit` and `offset` parameters
  - Optimized with database indexing

- **Session Cleanup Service**
  - Automatic cleanup of idle sessions
  - Configurable idle threshold (`IDLE_THRESHOLD_MINUTES`, default: 30)
  - Maximum lifetime enforcement (`MAX_LIFETIME_HOURS`, default: 6)
  - Background task with configurable interval (`CLEANUP_INTERVAL_SECONDS`, default: 300)
  - Set to `-1` to disable cleanup

- **State Sync Service**
  - Startup synchronization with runtime containers
  - Orphaned session recovery
  - Automatic status correction based on container health
  - Health check integration

#### Kubernetes Support
- **Helm Chart Deployment**
  - Complete Helm chart for production deployment
  - Configurable services: Control Plane, Web Console, MariaDB, MinIO
  - RBAC, ServiceAccount, and network policies
  - Values-based configuration for different environments

- **Kubernetes Scheduler**
  - Full K8s runtime support
  - Pod creation and lifecycle management
  - S3 workspace mounting via s3fs
  - Support for ephemeral and persistent session modes

- **Native K8s Manifests**
  - Standalone YAML manifests for K8s deployment
  - Namespace, ConfigMap, Secret, ServiceAccount, Role definitions
  - MariaDB and MinIO deployment configurations
  - s3fs password secret management

#### Runtime Executor
- **Python Dependency Installation**
  - Automatic `requirements.txt` installation from workspace
  - Dependencies installed to local filesystem (isolated from `/workspace`)
  - Pre-execution dependency setup
  - Support for custom package indexes (mirrors)

- **Hexagonal Architecture**
  - Clean separation: Domain, Application, Infrastructure, Interfaces layers
  - Port-Adapter pattern for external dependencies
  - Improved testability with dependency injection
  - Executor ports: IExecutorPort, ICallbackPort, IIsolationPort, IArtifactScannerPort, IHeartbeatPort, ILifecyclePort

- **Enhanced Execution Model**
  - Return value storage and retrieval
  - Metrics collection (CPU, memory, execution time)
  - Error message capturing
  - Dependency installation status tracking

#### Development Tools
- **Docker Compose Setup**
  - Complete development environment
  - One-command deployment: `docker-compose up -d`
  - Runtime node registration
  - Health check integration

- **Build System**
  - UV package manager integration
  - Configurable base image arguments
  - Mirror source support for faster Chinese downloads
  - Multi-stage Docker builds

### 📚 Documentation

- **Architecture Documentation**
  - Complete system architecture overview
  - Control Plane design and components
  - Storage architecture (MinIO + s3fs)
  - Kubernetes deployment guides

- **API Documentation**
  - RESTful API endpoint reference
  - Request/response schemas
  - Authentication and security

- **Technical Specifications**
  - Python dependency installation spec
  - S3 workspace mounting architecture
  - Kubernetes runtime design
  - Container scheduler architecture

- **Project Structure**
  - PROJECT_STRUCTURE.md with hexagonal architecture details
  - Updated architecture diagrams with Mermaid
  - Service access documentation

### 🎯 Key Capabilities

| Capability | Description |
|------------|-------------|
| **Multi-Runtime** | Docker and Kubernetes runtime support |
| **S3 Storage** | MinIO with s3fs mounting for workspace persistence |
| **Session Lifecycle** | Creation, execution, monitoring, cleanup |
| **Dependency Management** | Automatic Python package installation |
| **Health Monitoring** | Container health checks and state synchronization |
| **Production Ready** | Helm chart for K8s, Docker Compose for local |

### 📦 Configuration

#### New Environment Variables

```bash
# S3 Storage
S3_BUCKET=sandbox-workspace
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_ENDPOINT_URL=http://minio:9000

# Session Cleanup
IDLE_THRESHOLD_MINUTES=30      # -1 to disable idle cleanup
MAX_LIFETIME_HOURS=6           # -1 to disable lifetime limit
CLEANUP_INTERVAL_SECONDS=300

# Kubernetes
KUBERNETES_NAMESPACE=sandbox-runtime
KUBECONFIG=/path/to/kubeconfig

# Executor
CONTROL_PLANE_URL=http://control-plane:8000
EXECUTOR_PORT=8080
DISABLE_BWRAP=true
```

### 🔜 Service Access

| Service | URL | Credentials |
|---------|-----|-------------|
| **API Documentation** | http://localhost:8000/docs | - |
| **Control Plane API** | http://localhost:8000/api/v1 | - |
| **Web Console** | http://localhost:1101 | - |
| **MinIO Console** | http://localhost:9001 | minioadmin/minioadmin |

---

*This changelog covers new features from `main` to `feature/803264`.*
