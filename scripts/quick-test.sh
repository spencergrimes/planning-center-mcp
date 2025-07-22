#!/bin/bash

# Quick test to verify local CI setup works
set -e

# Cleanup function
cleanup() {
    echo "🧹 Cleaning up..."
    docker-compose -f docker-compose.test.yml down > /dev/null 2>&1 || true
    
    # Restore .env file if we backed it up
    if [ -n "$BACKUP_ENV" ] && [ -f "$BACKUP_ENV" ]; then
        echo "🔄 Restoring .env file..."
        mv "$BACKUP_ENV" .env
    fi
    
    # Restart local PostgreSQL if we stopped it
    if [ -n "$LOCAL_PG_STOPPED" ]; then
        echo "🔄 Restarting local PostgreSQL..."
        brew services start postgresql@15 > /dev/null 2>&1 || true
    fi
}

# Set trap to cleanup on exit or error
trap cleanup EXIT

echo "🚀 Running quick authentication test..."

# Check if Docker is running
echo "🔍 Checking Docker status..."
if ! docker ps > /dev/null 2>&1; then
    echo "❌ Docker daemon is not running."
    echo ""
    echo "🔧 To start Docker:"
    echo "  • On macOS: Open Docker Desktop from Applications"
    echo "  • On Linux: sudo systemctl start docker"
    echo "  • On Windows: Start Docker Desktop"
    echo ""
    echo "💡 Wait for Docker Desktop to fully start (whale icon in menu bar)"
    echo "💡 Then try again with: npm run test:quick"
    echo ""
    echo "🚀 Alternative: Run syntax checks only (no Docker needed):"
    echo "   npm run test:syntax"
    exit 1
fi
echo "✅ Docker is running"

# Stop local PostgreSQL if running to avoid port conflicts
echo "🔍 Checking for local PostgreSQL conflicts..."
LOCAL_PG_STOPPED=""
if brew services list | grep -q "postgresql.*started"; then
    echo "🛑 Stopping local PostgreSQL to avoid port conflicts..."
    brew services stop postgresql@15 > /dev/null 2>&1 || true
    brew services stop postgresql@14 > /dev/null 2>&1 || true
    brew services stop postgresql > /dev/null 2>&1 || true
    LOCAL_PG_STOPPED="true"
    sleep 2
fi

# Clean up any existing containers  
echo "🧹 Cleaning up existing containers..."
docker-compose -f docker-compose.test.yml down > /dev/null 2>&1 || true

# Kill any processes using our test ports
echo "🚫 Checking for port conflicts..."
if lsof -Pi :5432 -sTCP:LISTEN -t >/dev/null ; then
    echo "  Stopping processes on port 5432..."
    lsof -ti:5432 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

if lsof -Pi :6379 -sTCP:LISTEN -t >/dev/null ; then
    echo "  Stopping processes on port 6379..."
    lsof -ti:6379 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Use Docker Compose for reliable setup
echo "📦 Starting test services with Docker Compose..."
docker-compose -f docker-compose.test.yml up -d

# Temporarily move .env to avoid conflicts with Prisma
BACKUP_ENV=""
if [ -f .env ]; then
    echo "🔄 Temporarily backing up .env file..."
    mv .env .env.backup.$$
    BACKUP_ENV=".env.backup.$$"
fi

# Load test environment from .env.test
echo "🔧 Loading test environment..."
if [ -f .env.test ]; then
    set -a  # automatically export all variables
    source .env.test
    set +a
    echo "✅ Loaded .env.test"
else
    echo "⚠️  .env.test not found, using inline values"
fi

# Set test environment (override/ensure critical values)
export NODE_ENV=test
export DATABASE_URL="postgresql://postgres:password@localhost:5432/planning_center_test"
export TEST_DATABASE_URL="postgresql://postgres:password@localhost:5432/planning_center_test"
export REDIS_URL="redis://localhost:6379"
export TEST_REDIS_URL="redis://localhost:6379"
export JWT_SECRET="test-jwt-secret-for-testing-only"
export COOKIE_SECRET="test-cookie-secret-32-characters-long"
export ENCRYPTION_KEY="12345678901234567890123456789012"

# Ensure Prisma uses the correct database URL
echo "🔧 Verifying environment variables..."
echo "DATABASE_URL: $DATABASE_URL"
echo "TEST_DATABASE_URL: $TEST_DATABASE_URL"

# Wait for services with better error handling
echo "⏳ Waiting for PostgreSQL..."
timeout=60
count=0
until docker exec planning-center-postgres-test pg_isready -U postgres > /dev/null 2>&1; do
    echo "  Waiting for PostgreSQL... ($count/$timeout seconds)"
    sleep 3
    count=$((count + 3))
    if [ $count -ge $timeout ]; then
        echo "❌ PostgreSQL failed to start within $timeout seconds"
        echo "Checking PostgreSQL logs:"
        docker logs planning-center-postgres-test --tail 20
        exit 1
    fi
done

echo "📊 Ensuring test database exists and is accessible..."
# Wait a bit more for PostgreSQL to be fully ready
sleep 5

# Create test database if needed and test connection
docker exec planning-center-postgres-test psql -U postgres -c "
    SELECT 'Database exists' 
    FROM pg_database 
    WHERE datname='planning_center_test';
" > /dev/null 2>&1 || {
    echo "Creating test database..."
    docker exec planning-center-postgres-test psql -U postgres -c "CREATE DATABASE planning_center_test;" > /dev/null 2>&1 || true
}

# Test database connection specifically
echo "🔌 Testing database connection..."
docker exec planning-center-postgres-test psql -U postgres -d planning_center_test -c "SELECT 1;" > /dev/null 2>&1 || {
    echo "❌ Cannot connect to test database"
    echo "PostgreSQL logs:"
    docker logs planning-center-postgres-test --tail 10
    exit 1
}

echo "⏳ Waiting for Redis..."
until docker exec planning-center-redis-test redis-cli ping > /dev/null 2>&1; do
    echo "  Waiting for Redis..."
    sleep 1
done

echo "🔧 Setting up database..."
npx prisma generate > /dev/null 2>&1 || {
    echo "❌ Prisma generate failed"
    exit 1
}

npx prisma migrate deploy > /dev/null 2>&1 || {
    echo "❌ Prisma migrate failed, trying to reset..."
    npx prisma migrate reset --force > /dev/null 2>&1 || true
    npx prisma migrate deploy > /dev/null 2>&1 || {
        echo "❌ Migration still failed, showing error:"
        npx prisma migrate deploy
        exit 1
    }
}

echo "🧪 Running auth test only..."
npm test -- --testNamePattern="Authentication API" --verbose

echo "✅ Quick test completed!"