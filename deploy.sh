#!/bin/bash
set -e

# TBVH Phala Cloud Deployment Script
# -----------------------------------
# Prerequisites:
#   - Docker installed and running
#   - Phala Cloud CLI: npx @phala/phala-cli
#   - Docker Hub account (or other registry) for pushing images
#   - .env file with required environment variables

# Configuration
IMAGE_NAME="${DOCKER_IMAGE_NAME:-tbvh-tee-core}"
IMAGE_TAG="${DOCKER_IMAGE_TAG:-latest}"
REGISTRY="${DOCKER_REGISTRY:-}"  # e.g., "docker.io/yourusername" or leave empty for local
PHALA_APP_NAME="${PHALA_APP_NAME:-tbvh-tee-core}"
PHALA_VCPU="${PHALA_VCPU:-2}"
PHALA_MEMORY="${PHALA_MEMORY:-4096}"
PHALA_DISK="${PHALA_DISK:-20}"
PHALA_TEEPOD_ID="${PHALA_TEEPOD_ID:-3}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if [ ! -f ".env" ]; then
        log_error ".env file not found. Copy .env.example and fill in your values."
        exit 1
    fi

    # Check required env vars
    source .env
    if [ -z "$PHALA_API_KEY" ]; then
        log_error "PHALA_API_KEY is not set in .env"
        exit 1
    fi

    if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "dev-secret-change-in-production" ]; then
        log_warn "JWT_SECRET should be set to a secure random value for production"
    fi

    log_info "Prerequisites check passed"
}

# Build Docker image
build_image() {
    log_info "Building Docker image: ${IMAGE_NAME}:${IMAGE_TAG}"
    docker build -t "${IMAGE_NAME}:${IMAGE_TAG}" .
    log_info "Build complete"
}

# Push to registry (if configured)
push_image() {
    if [ -n "$REGISTRY" ]; then
        local full_image="${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
        log_info "Tagging image as ${full_image}"
        docker tag "${IMAGE_NAME}:${IMAGE_TAG}" "${full_image}"

        log_info "Pushing to registry..."
        docker push "${full_image}"
        log_info "Push complete"
        echo "${full_image}"
    else
        log_warn "No registry configured. Using local image."
        echo "${IMAGE_NAME}:${IMAGE_TAG}"
    fi
}

# Deploy to Phala Cloud
deploy_to_phala() {
    local image_ref="$1"

    log_info "Deploying to Phala Cloud..."
    log_info "  App Name: ${PHALA_APP_NAME}"
    log_info "  Image: ${image_ref}"
    log_info "  vCPU: ${PHALA_VCPU}"
    log_info "  Memory: ${PHALA_MEMORY}MB"
    log_info "  Disk: ${PHALA_DISK}GB"
    log_info "  TEEPod ID: ${PHALA_TEEPOD_ID}"

    # Create or update CVM
    npx @phala/phala-cli cvms create \
        --name "${PHALA_APP_NAME}" \
        --vcpu "${PHALA_VCPU}" \
        --memory "${PHALA_MEMORY}" \
        --diskSize "${PHALA_DISK}" \
        --teepod-id "${PHALA_TEEPOD_ID}" \
        --image "${image_ref}" \
        --env-file ./.env

    log_info "Deployment complete!"
}

# Run locally with docker-compose
run_local() {
    log_info "Starting local development server with docker-compose..."
    docker-compose up --build
}

# Show usage
usage() {
    echo "TBVH Phala Cloud Deployment Script"
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  build       Build Docker image locally"
    echo "  push        Build and push to registry"
    echo "  deploy      Build, push, and deploy to Phala Cloud"
    echo "  local       Run locally with docker-compose"
    echo "  help        Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  DOCKER_IMAGE_NAME    Docker image name (default: tbvh-tee-core)"
    echo "  DOCKER_IMAGE_TAG     Docker image tag (default: latest)"
    echo "  DOCKER_REGISTRY      Docker registry (e.g., docker.io/username)"
    echo "  PHALA_APP_NAME       Phala Cloud app name (default: tbvh-tee-core)"
    echo "  PHALA_VCPU           vCPUs for TEE (default: 2)"
    echo "  PHALA_MEMORY         Memory in MB (default: 4096)"
    echo "  PHALA_DISK           Disk in GB (default: 20)"
    echo "  PHALA_TEEPOD_ID      TEEPod ID (default: 3)"
}

# Main
case "${1:-help}" in
    build)
        check_prerequisites
        build_image
        ;;
    push)
        check_prerequisites
        build_image
        push_image
        ;;
    deploy)
        check_prerequisites
        build_image
        IMAGE_REF=$(push_image)
        deploy_to_phala "${IMAGE_REF}"
        ;;
    local)
        check_prerequisites
        run_local
        ;;
    help|*)
        usage
        ;;
esac
