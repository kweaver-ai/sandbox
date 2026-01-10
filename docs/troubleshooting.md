# Troubleshooting

This guide helps you diagnose and resolve common issues with the Sandbox Runtime.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Runtime Issues](#runtime-issues)
- [Performance Issues](#performance-issues)
- [Network Issues](#network-issues)
- [Resource Issues](#resource-issues)
- [Container Issues](#container-issues)

---

## Installation Issues

### Python Version Incompatible

**Problem:** `SyntaxError` or import errors after installation.

**Solution:**
```bash
# Check Python version
python --version  # Must be 3.11+

# Install correct version
# Ubuntu/Debian
sudo apt-get install python3.11

# macOS with pyenv
pyenv install 3.11
pyenv local 3.11
```

### Dependencies Won't Install

**Problem:** `pip install` fails with build errors.

**Solution:**
```bash
# Update pip and build tools
pip install --upgrade pip setuptools wheel

# Install system dependencies
# Ubuntu/Debian
sudo apt-get install -y build-essential python3-dev

# Alpine Linux
apk add --no-cache gcc musl-dev python3-dev
```

### Bubblewrap Not Found

**Problem:** `bubblewrap not found` error on Linux.

**Solution:**
```bash
# Ubuntu/Debian
sudo apt-get install bubblewrap

# RHEL/CentOS
sudo yum install bubblewrap

# Verify installation
bwrap --version
```

---

## Runtime Issues

### Server Won't Start

**Problem:** Server fails to start with "Address already in use".

**Solution:**
```bash
# Find process using port 8000
lsof -i :8000

# Kill the process
kill -9 <PID>

# Or use different port
export PORT=8080
python -m sandbox_runtime.shared_env.server
```

### Session Creation Fails

**Problem:** API returns error when creating session.

**Possible causes:**
1. Insufficient permissions
2. Resource limits reached
3. Invalid configuration

**Solution:**
```bash
# Check server logs for detailed error
export LOG_LEVEL=DEBUG
python -m sandbox_runtime.shared_env.server

# Verify permissions
# Ensure user can create namespaces
# Linux: check /etc/subuid and /etc/subgid
```

### Code Execution Times Out

**Problem:** All executions timeout immediately.

**Solution:**
```bash
# Increase timeout
export SANDBOX_TIMEOUT_SECONDS=600

# Check if isolation is working
# Try with simpler code first
echo "print('test')" | curl -X POST http://localhost:8000/workspace/se/execute_code/test \
  -H "Content-Type: application/json" \
  -d '{"code": "print(1 + 1)"}'
```

---

## Performance Issues

### Slow Session Creation

**Problem:** Creating sessions takes too long.

**Solutions:**

1. **Increase pool size:**
```bash
export SANDBOX_POOL_SIZE=10
```

2. **Use Docker isolation (faster warmup):**
```bash
export SANDBOX_ISOLATION_TYPE=docker
```

3. **Pre-warm pools:**
```python
# Warm up the pool on startup
pool = AsyncSandboxPool(size=10)
await pool.initialize()
```

### High Memory Usage

**Problem:** Server consumes excessive memory.

**Solutions:**

1. **Reduce pool size:**
```bash
export SANDBOX_POOL_SIZE=2
```

2. **Lower per-session memory:**
```bash
export SANDBOX_MEMORY_LIMIT=65536  # 64 MB
```

3. **Set session timeouts:**
```bash
export SANDBOX_SESSION_TTL=3600  # 1 hour
```

### High CPU Usage

**Problem:** Server CPU usage is consistently high.

**Solutions:**

1. **Lower CPU quota:**
```bash
export SANDBOX_CPU_QUOTA=1
```

2. **Reduce worker count:**
```bash
export WORKERS=2
```

3. **Profile the code:**
```python
import cProfile
cProfile.run('your_code_here()', 'output.prof')
```

---

## Network Issues

### Network Access Blocked

**Problem:** Code can't access external resources.

**Solution:**
```bash
# Enable network access
export SANDBOX_ALLOW_NETWORK=true
```

### Connection Refused

**Problem:** Can't connect to server.

**Solutions:**

1. **Check if server is running:**
```bash
curl http://localhost:8000/health
```

2. **Verify firewall rules:**
```bash
# Linux
sudo ufw allow 8000

# macOS
# System Preferences -> Security & Privacy -> Firewall
```

3. **Check Docker network (if using container):**
```bash
docker network ls
docker network inspect bridge
```

---

## Resource Issues

### Out of Memory Errors

**Problem:** Processes killed with `OOMKilled`.

**Solutions:**

1. **Increase memory limit:**
```bash
export SANDBOX_MEMORY_LIMIT=262144  # 256 MB
```

2. **Add swap space:**
```bash
# Linux
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

3. **Monitor usage:**
```bash
# Check memory usage
free -h

# Check process memory
ps aux --sort=-%mem | head
```

### CPU Throttling

**Problem:** Code execution is slow due to CPU limits.

**Solutions:**

1. **Increase CPU quota:**
```bash
export SANDBOX_CPU_QUOTA=4
```

2. **Reduce concurrent sessions:**
```bash
export SANDBOX_POOL_SIZE=2
```

---

## Container Issues

### Docker Daemon Not Running

**Problem:** `Cannot connect to Docker daemon`.

**Solution:**
```bash
# Start Docker
sudo systemctl start docker  # Linux
open -a Docker  # macOS

# Verify
docker ps
```

### Permission Denied (Docker)

**Problem:** `permission denied while trying to connect to the Docker daemon`.

**Solution:**
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Re-login or run
newgrp docker
```

### Container Image Not Found

**Problem:** `Image not found` error.

**Solution:**
```bash
# Build the image
docker build -t sandbox-runtime:latest -f sandbox-runtime/Dockerfile .

# Pull from registry
docker pull your-registry/sandbox-runtime:latest
```

---

## Kubernetes Issues

### Pod Keeps Restarting

**Problem:** Pods are in `CrashLoopBackOff`.

**Debug:**
```bash
# Check pod logs
kubectl logs -n sandbox-runtime deployment/sandbox-runtime

# Check pod status
kubectl describe pod -n sandbox-runtime <pod-name>
```

### Resource Limits Exceeded

**Problem:** Pods are OOMKilled or throttled.

**Solution:**
```yaml
# Increase resource limits in values.yaml
resources:
  limits:
    cpu: 2000m
    memory: 2Gi
  requests:
    cpu: 500m
    memory: 512Mi
```

### Service Not Accessible

**Problem:** Can't access service from outside.

**Solution:**
```bash
# Check service type
kubectl get svc -n sandbox-runtime

# Port forward for testing
kubectl port-forward -n sandbox-runtime svc/sandbox-runtime 8000:80

# Check ingress
kubectl get ingress -n sandbox-runtime
```

---

## Debug Mode

### Enable Debug Logging

```bash
# Set debug level
export LOG_LEVEL=DEBUG

# Run server
python -m sandbox_runtime.shared_env.server
```

### Enable Python Tracing

```bash
# Enable trace on all code execution
export PYTHONTRACEMALLOC=1

# Run with verbose output
python -v -m sandbox_runtime.shared_env.server
```

### Profile Performance

```python
import cProfile
import pstats

# Profile execution
profiler = cProfile.Profile()
profiler.enable()

# ... your code ...

profiler.disable()
stats = pstats.Stats(profiler)
stats.sort_stats('cumulative')
stats.print_stats(20)
```

---

## Getting Help

If you're still experiencing issues:

1. **Check the logs:**
   ```bash
   journalctl -u sandbox-runtime  # systemd
   kubectl logs deployment/sandbox-runtime  # Kubernetes
   docker logs sandbox-runtime  # Docker
   ```

2. **Search existing issues:**
   - GitHub Issues: https://github.com/your-org/sandbox-runtime/issues

3. **Create a minimal reproducible example:**
   - Document your environment (OS, Python version, etc.)
   - Include configuration
   - Share error messages and logs
   - Provide steps to reproduce

4. **Join the community:**
   - Discord/Slack: [link]
   - Discussion forum: [link]

---

## Common Error Codes

| Error Code | Description | Solution |
|------------|-------------|----------|
| `SESSION_NOT_FOUND` | Session doesn't exist | Create session first |
| `SESSION_EXPIRED` | Session timed out | Create new session |
| `EXECUTION_TIMEOUT` | Code exceeded timeout | Increase timeout |
| `RESOURCE_LIMIT` | CPU/memory exceeded | Increase limits |
| `ISOLATION_FAILED` | Sandbox setup failed | Check isolation config |
| `NETWORK_DISABLED` | Network access blocked | Enable if needed |

---

## See Also

- [Getting Started](getting-started.md) - Initial setup
- [Configuration](configuration.md) - Configuration options
- [Development](development.md) - Debugging tips
