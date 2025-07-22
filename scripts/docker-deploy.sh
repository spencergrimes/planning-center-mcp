#!/bin/bash

# Docker deployment script for server
# This script is copied to and executed on the deployment server
# Usage: docker-deploy.sh [image_tag] [environment]

set -e

IMAGE_TAG=${1:-planning-center-mcp:latest}
ENVIRONMENT=${2:-production}
CONTAINER_NAME="planning-center-mcp-$ENVIRONMENT"

echo "🚀 Deploying Docker container: $CONTAINER_NAME"
echo "Image: $IMAGE_TAG"
echo "Environment: $ENVIRONMENT"

# Stop and remove existing container
echo "📦 Stopping existing container..."
docker stop "$CONTAINER_NAME" 2>/dev/null || echo "Container not running"
docker rm "$CONTAINER_NAME" 2>/dev/null || echo "Container not found"

# Pull latest image if using registry
if [[ "$IMAGE_TAG" == *"/"* ]]; then
    echo "📥 Pulling latest image..."
    docker pull "$IMAGE_TAG"
fi

# Load environment variables
ENV_FILE=""
if [ -f "/opt/planning-center-mcp/.env.$ENVIRONMENT" ]; then
    ENV_FILE="--env-file /opt/planning-center-mcp/.env.$ENVIRONMENT"
elif [ -f "/opt/planning-center-mcp/.env" ]; then
    ENV_FILE="--env-file /opt/planning-center-mcp/.env"
fi

# Start new container
echo "🔄 Starting new container..."
docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p 3001:3001 \
  $ENV_FILE \
  -e NODE_ENV="$ENVIRONMENT" \
  --network planning-center-network 2>/dev/null || docker network create planning-center-network && \
  docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    -p 3001:3001 \
    $ENV_FILE \
    -e NODE_ENV="$ENVIRONMENT" \
    --network planning-center-network \
    "$IMAGE_TAG"

# Wait for container to start
echo "⏳ Waiting for container to start..."
sleep 15

# Health check
echo "🏥 Running health check..."
for i in {1..10}; do
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ Container is healthy!"
        break
    else
        echo "⏳ Waiting for health check... ($i/10)"
        sleep 5
    fi
    
    if [ $i -eq 10 ]; then
        echo "❌ Health check failed after 10 attempts"
        echo "📋 Container logs:"
        docker logs "$CONTAINER_NAME" --tail 50
        exit 1
    fi
done

# Clean up old images (keep last 3)
echo "🧹 Cleaning up old images..."
docker images planning-center-mcp --format "table {{.Repository}}:{{.Tag}}\t{{.CreatedAt}}" | \
grep -v "latest" | \
tail -n +4 | \
awk '{print $1}' | \
xargs -r docker rmi 2>/dev/null || echo "No old images to clean"

echo "🎉 Deployment completed successfully!"
echo "Container: $CONTAINER_NAME"
echo "Status: $(docker ps --filter name=$CONTAINER_NAME --format 'table {{.Status}}')"
echo "Health: http://localhost:3001/health"