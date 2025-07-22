#!/bin/bash

# Local test environment setup script

set -e

echo "🐘 Setting up local test environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "📦 Starting test services with Docker Compose..."
docker-compose -f docker-compose.test.yml up -d

echo "⏳ Waiting for services to be ready..."
# Wait for PostgreSQL
until docker exec planning-center-postgres-test pg_isready -U postgres > /dev/null 2>&1; do
    echo "  Waiting for PostgreSQL..."
    sleep 2
done

# Wait for Redis
until docker exec planning-center-redis-test redis-cli ping > /dev/null 2>&1; do
    echo "  Waiting for Redis..."
    sleep 1
done

echo "🔧 Setting up test database..."
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy
if [ $? -ne 0 ]; then
    echo "❌ Database migration failed. Check your Prisma schema."
    exit 1
fi

echo "✅ Test environment ready!"
echo ""
echo "🧪 Run tests with:"
echo "  npm test"
echo ""
echo "🛑 Stop test services with:"
echo "  docker-compose -f docker-compose.test.yml down"
echo ""
echo "🗑️  Clean up volumes with:"
echo "  docker-compose -f docker-compose.test.yml down -v"