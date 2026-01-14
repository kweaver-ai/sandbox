#!/bin/bash
# Kubernetes 本地部署脚本
# 用于在本地 Kind/Minikube/K3s 环境中快速部署和测试

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 函数：打印信息
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 kubectl 是否安装
check_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        error "kubectl not found. Please install kubectl first."
        exit 1
    fi
    info "kubectl found: $(kubectl version --client --short 2>/dev/null || echo 'unknown')"
}

# 检查 Docker 是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        error "Docker not found. Please install Docker first."
        exit 1
    fi
    info "Docker found: $(docker --version)"
}

# 检测 K8s 环境
detect_k8s_env() {
    if kubectl cluster-info &> /dev/null; then
        info "Kubernetes cluster is accessible"
        kubectl cluster-info
    else
        error "Cannot access Kubernetes cluster. Please start your K8s environment first."
        info ""
        info "For Kind:"
        info "  kind create cluster --name sandbox"
        info ""
        info "For Minikube:"
        info "  minikube start --cpus=4 --memory=8192"
        info ""
        info "For K3s:"
        info "  curl -sfL https://get.k3s.io | sh"
        info "  export KUBECONFIG=/etc/rancher/k3s/k3s.yaml"
        exit 1
    fi
}

# 构建 Docker 镜像
build_image() {
    info "Building Docker image..."
    docker build -t sandbox-control-plane:latest .
    info "Docker image built successfully"
}

# 加载镜像到 K8s
load_image() {
    local cluster_type=$1

    info "Loading image to Kubernetes..."

    case $cluster_type in
        kind)
            if kind load docker-image sandbox-control-plane:latest 2>/dev/null; then
                info "Image loaded to Kind"
            else
                error "Failed to load image to Kind"
                exit 1
            fi
            ;;
        minikube)
            if minikube image load sandbox-control-plane:latest 2>/dev/null; then
                info "Image loaded to Minikube"
            else
                error "Failed to load image to Minikube"
                exit 1
            fi
            ;;
        k3s)
            info "K3s uses Docker images directly, no need to load"
            ;;
        *)
            warn "Unknown cluster type: $cluster_type, skipping image load"
            ;;
    esac
}

# 部署 K8s 资源
deploy_resources() {
    info "Deploying Kubernetes resources..."

    # 按顺序部署
    kubectl apply -f deploy/k8s/00-namespace.yaml
    kubectl apply -f deploy/k8s/01-configmap.yaml
    kubectl apply -f deploy/k8s/02-secret.yaml
    kubectl apply -f deploy/k8s/03-serviceaccount.yaml
    kubectl apply -f deploy/k8s/04-role.yaml
    kubectl apply -f deploy/k8s/08-mariadb-deployment.yaml
    kubectl apply -f deploy/k8s/07-minio-deployment.yaml

    info "Waiting for MariaDB to be ready..."
    kubectl wait --for=condition=ready pod -l app=mariadb -n sandbox-system --timeout=120s

    info "Waiting for MinIO to be ready..."
    kubectl wait --for=condition=ready pod -l app=minio -n sandbox-system --timeout=120s

    kubectl apply -f deploy/k8s/05-control-plane-deployment.yaml
    # HPA 已禁用 - 本地开发环境使用固定 1 个副本

    info "Kubernetes resources deployed successfully"
}

# 等待 Control Plane 就绪
wait_for_control_plane() {
    info "Waiting for Control Plane to be ready..."
    kubectl wait --for=condition=available deployment/sandbox-control-plane -n sandbox-system --timeout=300s

    info "Control Plane is ready!"
}

# 显示部署状态
show_status() {
    info ""
    info "=== Deployment Status ==="
    info ""
    info "Pods in sandbox-system:"
    kubectl get pods -n sandbox-system
    info ""
    info "Services:"
    kubectl get svc -n sandbox-system
    info ""
    info "HPA:"
    kubectl get hpa -n sandbox-system
    info ""
}

# 设置端口转发
setup_port_forward() {
    info "Setting up port forwarding..."
    info "Run the following command to forward Control Plane port:"
    info ""
    echo -e "${YELLOW}kubectl port-forward svc/sandbox-control-plane 8000:8000 -n sandbox-system${NC}"
    info ""
    info "Then access the API at http://localhost:8000"
}

# 主函数
main() {
    local cluster_type=${1:-auto}
    local skip_build=${2:-false}

    info "=== Sandbox Control Plane K8s Deployment ==="
    info ""

    # 检测 K8s 类型
    if [ "$cluster_type" = "auto" ]; then
        if kind get clusters 2>/dev/null | grep -q "kind"; then
            cluster_type="kind"
        elif pgrep -f "minikube" > /dev/null; then
            cluster_type="minikube"
        elif [ -f /etc/rancher/k3s/k3s.yaml ]; then
            cluster_type="k3s"
        else
            cluster_type="generic"
        fi
    fi

    info "Detected cluster type: $cluster_type"
    info ""

    # 执行部署步骤
    check_kubectl
    check_docker
    detect_k8s_env

    if [ "$skip_build" != "true" ]; then
        build_image
        load_image "$cluster_type"
    else
        info "Skipping image build"
    fi

    deploy_resources
    wait_for_control_plane
    show_status
    setup_port_forward

    info ""
    info "=== Deployment Complete! ==="
    info ""
}

# 帮助信息
show_help() {
    echo "Usage: $0 [cluster_type] [skip_build]"
    echo ""
    echo "Arguments:"
    echo "  cluster_type  Type of Kubernetes cluster (kind|minikube|k3s|auto)"
    echo "                Default: auto (automatically detect)"
    echo "  skip_build    Skip Docker image build (true|false)"
    echo "                Default: false"
    echo ""
    echo "Examples:"
    echo "  $0                    # Auto-detect cluster and build image"
    echo "  $0 kind               # Deploy to Kind cluster"
    echo "  $0 minikube true      # Deploy to Minikube without rebuilding"
    echo ""
}

# 处理帮助参数
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

# 执行主函数
main "$@"
