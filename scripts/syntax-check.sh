#!/bin/bash

# Quick syntax and build check without database dependencies
set -e

echo "🔍 Running syntax and build checks (no database required)..."

echo "1️⃣ Type checking..."
npm run typecheck

echo "2️⃣ Linting..."
npm run lint

echo "3️⃣ Building..."
npm run build

echo "✅ All syntax and build checks passed!"
echo ""
echo "💡 To run full tests with database:"
echo "  1. Start Docker Desktop"
echo "  2. Run: npm run test:quick"