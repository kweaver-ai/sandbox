# Deployment Guide

This guide covers deploying the Sandbox Runtime to production using various methods.

## Table of Contents

- [Docker Deployment](#docker-deployment)
- [Docker Compose](#docker-compose)
- [Kubernetes (Helm)](#kubernetes-helm)
- [Cloud Platforms](#cloud-platforms)
- [Production Checklist](#production-checklist)

---

## Docker Deployment

### Build the Image

```bash
# From repository root
docker build -t sandbox-runtime:latest -f sandbox-runtime/Dockerfile .

# With version tag
docker build -t sandbox-runtime:v0.1.0 -f sandbox-runtime/Dockerfile .
```

### Run the Container

```bash
docker run -d \
  --name sandbox-runtime \
  -p 8000:8000 \
  -e SANDBOX_CPU_QUOTA=2 \
  -e SANDBOX_MEMORY_LIMIT=131072 \
  -e SANDBOX_POOL_SIZE=5 \
  sandbox-runtime:latest
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  sandbox-runtime:
    build:
      context: .
      dockerfile: sandbox-runtime/Dockerfile
    ports:
      - "8000:8000"
    environment:
      - SANDBOX_CPU_QUOTA=2
      - SANDBOX_MEMORY_LIMIT=131072
      - SANDBOX_ALLOW_NETWORK=false
      - SANDBOX_TIMEOUT_SECONDS=300
      - SANDBOX_POOL_SIZE=10
      - LOG_LEVEL=INFO
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

Run with Docker Compose:

```bash
docker-compose up -d
```

---

## Docker Compose

### Complete Setup with Reverse Proxy

Create `docker-compose.yml` with Nginx:

```yaml
version: '3.8'

services:
  sandbox-runtime:
    build:
      context: .
      dockerfile: sandbox-runtime/Dockerfile
    environment:
      - SANDBOX_CPU_QUOTA=2
      - SANDBOX_MEMORY_LIMIT=131072
      - SANDBOX_ALLOW_NETWORK=false
      - SANDBOX_POOL_SIZE=10
    expose:
      - "8000"
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - sandbox-runtime
    restart: unless-stopped
```

### Nginx Configuration

`nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream sandbox {
        server sandbox-runtime:8000;
    }

    server {
        listen 80;
        server_name example.com;

        location / {
            proxy_pass http://sandbox;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # For long-running requests
            proxy_read_timeout 300s;
            proxy_connect_timeout 300s;
        }
    }
}
```

---

## Kubernetes (Helm)

### Install Helm Chart

```bash
# Add the repository (if applicable)
helm repo add sandbox-runtime https://charts.example.com
helm repo update

# Install with default values
helm install sandbox-runtime ./sandbox-runtime/helm/sandbox-runtime

# Install with custom values
helm install sandbox-runtime ./sandbox-runtime/helm/sandbox-runtime \
  -f custom-values.yaml
```

### Custom Values

`custom-values.yaml`:

```yaml
replicaCount: 3

image:
  repository: sandbox-runtime
  tag: "v0.1.0"
  pullPolicy: IfNotPresent

env:
  SANDBOX_CPU_QUOTA: "2"
  SANDBOX_MEMORY_LIMIT: "131072"
  SANDBOX_ALLOW_NETWORK: "false"
  SANDBOX_TIMEOUT_SECONDS: "300"
  SANDBOX_POOL_SIZE: "10"

resources:
  limits:
    cpu: 2000m
    memory: 2Gi
  requests:
    cpu: 500m
    memory: 512Mi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

service:
  type: LoadBalancer
  port: 80
  targetPort: 8000

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  hosts:
    - host: sandbox.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: sandbox-tls
      hosts:
        - sandbox.example.com
```

### Deploy to Kubernetes

```bash
# Apply the deployment
helm upgrade --install sandbox-runtime \
  ./sandbox-runtime/helm/sandbox-runtime \
  -f custom-values.yaml \
  --namespace sandbox-runtime \
  --create-namespace

# Check status
kubectl get pods -n sandbox-runtime
kubectl get svc -n sandbox-runtime
```

### Port Forward for Testing

```bash
kubectl port-forward -n sandbox-runtime svc/sandbox-runtime 8000:80
```

---

## Cloud Platforms

### AWS ECS

Create task definition `task-definition.json`:

```json
{
  "family": "sandbox-runtime",
  "containerDefinitions": [
    {
      "name": "sandbox-runtime",
      "image": "your-registry/sandbox-runtime:v0.1.0",
      "memory": 2048,
      "cpu": 1024,
      "essential": true,
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "SANDBOX_CPU_QUOTA",
          "value": "2"
        },
        {
          "name": "SANDBOX_MEMORY_LIMIT",
          "value": "131072"
        },
        {
          "name": "SANDBOX_POOL_SIZE",
          "value": "10"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/sandbox-runtime",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ],
  "requiresCompatibilities": ["FARGATE"],
  "networkMode": "awsvpc",
  "cpu": "1024",
  "memory": "2048"
}
```

### Google Cloud Run

```bash
# Build and push image
gcloud builds submit --tag gcr.io/PROJECT_ID/sandbox-runtime

# Deploy
gcloud run deploy sandbox-runtime \
  --image gcr.io/PROJECT_ID/sandbox-runtime \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars SANDBOX_CPU_QUOTA=2,SANDBOX_POOL_SIZE=10
```

### Azure Container Instances

```bash
az container create \
  --resource-group sandbox-rg \
  --name sandbox-runtime \
  --image your-registry/sandbox-runtime:v0.1.0 \
  --cpu 2 \
  --memory 4 \
  --ports 8000 \
  --environment-variables \
    SANDBOX_CPU_QUOTA=2 \
    SANDBOX_POOL_SIZE=10
```

---

## Production Checklist

### Security

- [ ] Disable network access unless required (`SANDBOX_ALLOW_NETWORK=false`)
- [ ] Set appropriate resource limits (CPU, memory)
- [ ] Use HTTPS/TLS for all connections
- [ ] Implement authentication/authorization
- [ ] Set up firewall rules
- [ ] Regular security updates

### Configuration

- [ ] Set appropriate `SANDBOX_TIMEOUT_SECONDS`
- [ ] Configure `SANDBOX_POOL_SIZE` based on load
- [ ] Set `SANDBOX_CPU_QUOTA` and `SANDBOX_MEMORY_LIMIT`
- [ ] Configure logging (`LOG_LEVEL`)
- [ ] Set up monitoring and alerts

### High Availability

- [ ] Deploy multiple replicas
- [ ] Configure horizontal pod autoscaling
- [ ] Set up load balancer
- [ ] Configure health checks
- [ ] Implement graceful shutdown

### Monitoring

- [ ] Set up metrics collection (Prometheus, CloudWatch, etc.)
- [ ] Monitor resource usage (CPU, memory)
- [ ] Track execution success/failure rates
- [ ] Alert on error conditions
- [ ] Set up log aggregation

### Backup & Recovery

- [ ] Regular configuration backups
- [ ] Disaster recovery plan
- [ ] Documented rollback procedures

---

## Scaling Considerations

### Vertical Scaling

Increase resources per instance:

```bash
# More CPU and memory per pod
resources:
  limits:
    cpu: 4000m
    memory: 4Gi
```

### Horizontal Scaling

Run multiple instances:

```bash
# Kubernetes HPA
kubectl autoscale deployment sandbox-runtime \
  --cpu-percent=70 \
  --min=3 \
  --max=20
```

### Pool Size Tuning

Adjust `SANDBOX_POOL_SIZE` based on:

- Average request rate
- Session duration
- Available resources

Formula: `pool_size = (requests_per_second * avg_session_duration) / target_response_time`

---

## Health Checks

### Kubernetes Liveness Probe

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

### Kubernetes Readiness Probe

```yaml
readinessProbe:
  httpGet:
    path: /health
    port: 8000
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 2
```

---

## See Also

- [Configuration](configuration.md) - Configuration options
- [Development](development.md) - Development setup
- [API Reference](api-reference.md) - API documentation
