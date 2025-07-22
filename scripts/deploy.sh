#!/bin/bash

# Planning Center MCP Deployment Script
# Usage: ./scripts/deploy.sh [environment] [platform]
# Example: ./scripts/deploy.sh production render

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=${1:-development}
PLATFORM=${2:-render}

echo -e "${BLUE}🚀 Planning Center MCP Deployment Script${NC}"
echo -e "${BLUE}Environment: ${YELLOW}$ENVIRONMENT${NC}"
echo -e "${BLUE}Platform: ${YELLOW}$PLATFORM${NC}"
echo ""

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    echo -e "${RED}❌ Invalid environment: $ENVIRONMENT${NC}"
    echo -e "${YELLOW}Valid environments: development, staging, production${NC}"
    exit 1
fi

# Validate platform
if [[ ! "$PLATFORM" =~ ^(render|railway|vercel|docker)$ ]]; then
    echo -e "${RED}❌ Invalid platform: $PLATFORM${NC}"
    echo -e "${YELLOW}Valid platforms: render, railway, vercel, docker${NC}"
    exit 1
fi

# Check if required commands exist
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 is required but not installed${NC}"
        exit 1
    fi
}

# Pre-deployment checks
echo -e "${YELLOW}🔍 Running pre-deployment checks...${NC}"

# Check Node.js
check_command node
check_command npm

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json not found. Please run from project root.${NC}"
    exit 1
fi

# Check if environment file exists
if [ "$ENVIRONMENT" != "development" ] && [ ! -f ".env.$ENVIRONMENT" ]; then
    echo -e "${YELLOW}⚠️  .env.$ENVIRONMENT not found. Using environment variables.${NC}"
fi

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm ci

# Generate Prisma client
echo -e "${YELLOW}🔧 Generating Prisma client...${NC}"
npx prisma generate

# Run tests
echo -e "${YELLOW}🧪 Running tests...${NC}"
npm test

# Type checking
echo -e "${YELLOW}📝 Running type checking...${NC}"
npm run typecheck

# Linting
echo -e "${YELLOW}🔍 Running linter...${NC}"
npm run lint

# Build application
echo -e "${YELLOW}🏗️  Building application...${NC}"
npm run build

echo -e "${GREEN}✅ Pre-deployment checks passed!${NC}"
echo ""

# Platform-specific deployment
case $PLATFORM in
    "render")
        echo -e "${YELLOW}🚀 Deploying to Render...${NC}"
        
        if [ -z "$RENDER_DEPLOY_HOOK_URL" ]; then
            echo -e "${RED}❌ RENDER_DEPLOY_HOOK_URL environment variable not set${NC}"
            exit 1
        fi
        
        echo -e "${BLUE}Triggering Render deployment...${NC}"
        curl -X POST "$RENDER_DEPLOY_HOOK_URL" \
            -H "Content-Type: application/json" \
            -d '{"clearCache": false}'
        
        echo -e "${GREEN}✅ Render deployment triggered!${NC}"
        echo -e "${BLUE}Monitor deployment at: https://dashboard.render.com${NC}"
        ;;
        
    "railway")
        echo -e "${YELLOW}🚀 Deploying to Railway...${NC}"
        
        check_command railway
        
        if [ -z "$RAILWAY_TOKEN" ]; then
            echo -e "${RED}❌ RAILWAY_TOKEN environment variable not set${NC}"
            exit 1
        fi
        
        echo -e "${BLUE}Logging into Railway...${NC}"
        railway login --token "$RAILWAY_TOKEN"
        
        echo -e "${BLUE}Deploying to Railway...${NC}"
        railway up
        
        echo -e "${GREEN}✅ Railway deployment complete!${NC}"
        ;;
        
    "vercel")
        echo -e "${YELLOW}🚀 Deploying to Vercel...${NC}"
        
        check_command vercel
        
        if [ -z "$VERCEL_TOKEN" ]; then
            echo -e "${RED}❌ VERCEL_TOKEN environment variable not set${NC}"
            exit 1
        fi
        
        echo -e "${BLUE}Deploying to Vercel...${NC}"
        if [ "$ENVIRONMENT" = "production" ]; then
            vercel --token "$VERCEL_TOKEN" --prod --yes
        else
            vercel --token "$VERCEL_TOKEN" --yes
        fi
        
        echo -e "${GREEN}✅ Vercel deployment complete!${NC}"
        ;;
        
    "docker")
        echo -e "${YELLOW}🚀 Building and deploying Docker image...${NC}"
        
        check_command docker
        
        # Build Docker image
        IMAGE_TAG="planning-center-mcp:$ENVIRONMENT-$(date +%Y%m%d-%H%M%S)"
        echo -e "${BLUE}Building Docker image: $IMAGE_TAG${NC}"
        docker build -t "$IMAGE_TAG" .
        
        # Tag as latest for environment
        docker tag "$IMAGE_TAG" "planning-center-mcp:$ENVIRONMENT-latest"
        
        # Push to registry if configured
        if [ -n "$DOCKER_REGISTRY" ]; then
            echo -e "${BLUE}Pushing to registry: $DOCKER_REGISTRY${NC}"
            docker tag "$IMAGE_TAG" "$DOCKER_REGISTRY/planning-center-mcp:$ENVIRONMENT-latest"
            docker push "$DOCKER_REGISTRY/planning-center-mcp:$ENVIRONMENT-latest"
        fi
        
        echo -e "${GREEN}✅ Docker image built: $IMAGE_TAG${NC}"
        
        # Deploy to server if configured
        if [ -n "$DEPLOY_HOST" ] && [ -n "$DEPLOY_USER" ]; then
            echo -e "${BLUE}Deploying to server: $DEPLOY_HOST${NC}"
            
            # Copy deployment script to server and execute
            scp scripts/docker-deploy.sh "$DEPLOY_USER@$DEPLOY_HOST:/tmp/"
            ssh "$DEPLOY_USER@$DEPLOY_HOST" "bash /tmp/docker-deploy.sh $IMAGE_TAG $ENVIRONMENT"
            
            echo -e "${GREEN}✅ Docker deployment complete!${NC}"
        fi
        ;;
esac

# Health check
if [ -n "$APP_URL" ]; then
    echo ""
    echo -e "${YELLOW}🏥 Running health check...${NC}"
    sleep 10
    
    if curl -f "$APP_URL/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Health check passed!${NC}"
        echo -e "${BLUE}Application is live at: $APP_URL${NC}"
    else
        echo -e "${RED}❌ Health check failed. Check deployment logs.${NC}"
        exit 1
    fi
fi

# Success message
echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${BLUE}Environment: $ENVIRONMENT${NC}"
echo -e "${BLUE}Platform: $PLATFORM${NC}"

if [ -n "$APP_URL" ]; then
    echo -e "${BLUE}URL: $APP_URL${NC}"
fi

echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Monitor deployment logs"
echo -e "2. Test application functionality"
echo -e "3. Update DNS if needed"
echo -e "4. Monitor error logs and metrics"
echo ""