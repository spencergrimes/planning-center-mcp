#!/bin/bash

# Local testing script that mimics GitHub Actions environment
set -e

echo "🧪 Setting up local test environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Set test environment variables (same as GitHub Actions)
export NODE_ENV=test
export DATABASE_URL="postgresql://postgres:password@localhost:5432/planning_center_test"
export TEST_DATABASE_URL="postgresql://postgres:password@localhost:5432/planning_center_test"
export REDIS_URL="redis://localhost:6379"
export TEST_REDIS_URL="redis://localhost:6379"
export JWT_SECRET="test-jwt-secret-for-testing-only"
export COOKIE_SECRET="test-cookie-secret-32-characters-long"
export ENCRYPTION_KEY="12345678901234567890123456789012"

echo "🐘 Starting PostgreSQL..."
docker run -d --name postgres-local-test \
  -p 5432:5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=planning_center_test \
  postgres:15 || echo "PostgreSQL container already running"

echo "🔴 Starting Redis..."
docker run -d --name redis-local-test \
  -p 6379:6379 \
  redis:7 || echo "Redis container already running"

echo "⏳ Waiting for services..."
sleep 5

# Wait for PostgreSQL
echo "🔌 Checking PostgreSQL connection..."
until docker exec postgres-local-test pg_isready -U postgres > /dev/null 2>&1; do
    echo "  Waiting for PostgreSQL..."
    sleep 2
done

# Wait for Redis
echo "🔌 Checking Redis connection..."
until docker exec redis-local-test redis-cli ping > /dev/null 2>&1; do
    echo "  Waiting for Redis..."
    sleep 1
done

echo "🔧 Running database migrations..."
npx prisma generate
npx prisma migrate deploy

echo "🏃‍♂️ Running CI pipeline steps..."

echo "1️⃣ Type checking..."
npm run typecheck

echo "2️⃣ Linting..."
npm run lint

echo "3️⃣ Building..."
npm run build

echo "4️⃣ Running tests..."
npm test

echo "✅ All tests passed! Ready to push to GitHub."

echo ""
echo "🧹 To clean up, run:"
echo "  docker rm -f postgres-local-test redis-local-test"