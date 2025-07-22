# Planning Center MCP

A multi-tenant Model Context Protocol (MCP) server that allows churches to connect their Planning Center accounts and interact with their data through an AI-powered chat interface.

## 🚀 Features

### Core Functionality
- **Multi-tenant Architecture**: Organizations can register and manage their own data
- **Planning Center Integration**: Connect via Personal Access Token or OAuth
- **AI-Powered Chat**: Natural language interface to interact with church data
- **Real-time Communication**: WebSocket-based chat with auto-reconnection
- **Secure Authentication**: JWT-based auth with role-based access control

### MCP Tools
- **People Management**: Search people, get contact details
- **Team Scheduling**: View teams, check availability, schedule assignments
- **Song Library**: Search songs, filter by themes and tags
- **Service Planning**: Get upcoming services, detailed service information
- **Smart Suggestions**: AI-powered team member suggestions based on history

### Security & Performance
- **Encrypted Credentials**: AES-256-CBC encryption for Planning Center credentials
- **Rate Limiting**: Token bucket rate limiting for API calls
- **Audit Logging**: Comprehensive audit trail for all actions
- **Data Caching**: Local caching of Planning Center data for performance
- **Health Monitoring**: Built-in health checks and monitoring

## 🏗 Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Chat    │    │   MCP Server     │    │ Planning Center │
│   Frontend      │◄──►│   (Fastify)      │◄──►│     API         │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │  PostgreSQL  │
                       │   + Redis    │
                       └──────────────┘
```

### Tech Stack
- **Backend**: Node.js, TypeScript, Fastify, Prisma ORM
- **Database**: PostgreSQL with Redis for caching
- **Frontend**: React, TypeScript, Tailwind CSS, Zustand
- **Communication**: WebSocket, REST API, MCP Protocol
- **Security**: JWT, bcrypt, AES encryption
- **Testing**: Jest, integration tests
- **Deployment**: Docker, Docker Compose, Kubernetes

## 📦 Project Structure

```
planning-center-mcp/
├── src/
│   ├── api/                 # REST API routes and middleware
│   ├── mcp/                 # MCP server implementation
│   │   └── tools/           # Individual MCP tools
│   ├── integrations/        # Planning Center API client
│   ├── services/            # Business logic services  
│   ├── shared/              # Shared utilities and helpers
│   └── server.ts            # Main server entry point
├── frontend/frontend/       # React chat interface
├── prisma/                  # Database schema and migrations
├── tests/                   # Test suites
├── kubernetes/              # Kubernetes manifests
├── docker-compose.yml       # Local development setup
├── Dockerfile              # Container build instructions
└── render.yaml             # Render.com deployment config
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker and Docker Compose (recommended)
- Planning Center account with Personal Access Token

### Local Development

1. **Clone the repository**:
```bash
git clone <repository-url>
cd planning-center-mcp
```

2. **Start with Docker Compose** (recommended):
```bash
cp .env.example .env
# Edit .env with your credentials
docker-compose up -d
```

3. **Run database setup**:
```bash
npm run db:migrate:prod
npm run db:seed  # Optional: adds demo data
```

4. **Start frontend** (separate terminal):
```bash
cd frontend/frontend
npm install
npm run dev
```

The backend runs on `http://localhost:3001` and frontend on `http://localhost:5173`.

### Manual Setup

If you prefer not to use Docker:

1. **Install dependencies**:
```bash
npm install
```

2. **Setup services**:
   - PostgreSQL database
   - Redis server

3. **Configure environment**:
```bash
cp .env.example .env
# Update DATABASE_URL, REDIS_URL, and other variables
```

4. **Database setup**:
```bash
npm run db:generate
npm run db:migrate
```

5. **Build and start**:
```bash
npm run build
npm start
```

## 🔧 Configuration

### Environment Variables

Create `.env` file with:

```env
# Server
NODE_ENV=development
PORT=3001
LOG_LEVEL=debug

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/planning_center_dev

# Redis  
REDIS_URL=redis://localhost:6379

# Security (generate secure values)
JWT_SECRET=your-super-secret-jwt-key-change-this
COOKIE_SECRET=your-cookie-secret-32-chars-minimum
ENCRYPTION_KEY=12345678901234567890123456789012

# Planning Center OAuth
PCO_CLIENT_ID=your-pco-client-id
PCO_CLIENT_SECRET=your-pco-client-secret
PCO_REDIRECT_URI=http://localhost:3001/api/v1/auth/planning-center/callback

# Frontend
FRONTEND_URL=http://localhost:5173

# MCP
MCP_SERVER_NAME=planning-center-mcp
MCP_SERVER_VERSION=1.0.0
```

### Planning Center Setup

1. Log in to [Planning Center](https://planningcenter.com)
2. Go to Developer Settings
3. Create a new Personal Access Token
4. Copy the Application ID and Secret to your `.env` file

## 📖 Usage

### Getting Started

1. **Register Organization**: Create a new organization account
2. **Login**: Sign in with your credentials  
3. **Connect Planning Center**: Admin users connect their PCO account
4. **Start Chatting**: Use natural language to interact with your data

### Chat Examples

```
"Show me upcoming services"
"Find songs with the theme 'Christmas'"
"Who's on the worship team for this Sunday?"
"Search for John Smith in our directory"
"What teams need scheduling help?"
```

### API Endpoints

- `POST /api/v1/auth/register` - Register new organization
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/planning-center/connect` - Connect PCO account
- `GET /api/v1/planning-center/status` - Connection status
- `GET /health` - Health check

### WebSocket Events

Connect to `/ws` for real-time chat:

```javascript
const ws = new WebSocket('ws://localhost:3001/ws');

// Send message
ws.send(JSON.stringify({
  tool: 'searchPeople',
  parameters: { query: 'John Smith' }
}));

// Receive response
ws.onmessage = (event) => {
  const response = JSON.parse(event.data);
  console.log(response.result);
};
```

## 🧪 Testing

### Local Testing Setup

**Option 1: Quick Syntax Check (No Docker Required)**

```bash
# Fast syntax, linting, and build check
npm run test:syntax
```

**Option 2: Quick Database Test (Requires Docker)**

```bash
# Run auth tests with real database (mimics GitHub Actions)
npm run test:quick

# Or full CI pipeline
npm run test:ci

# Cleanup afterwards  
npm run test:cleanup
```

**Option 3: Using Docker (Alternative)**

```bash
# Start test database and Redis with Docker
docker run -d --name postgres-test \
  -p 5432:5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=planning_center_test \
  postgres:15

docker run -d --name redis-test \
  -p 6379:6379 \
  redis:7

# Setup test environment
cp .env.test .env.test.local
npm install

# Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

**Option 2: Using Docker Compose (Easiest)**

```bash
# One-command setup with automated script
npm run test:setup

# Or manually:
docker-compose -f docker-compose.test.yml up -d
npx prisma generate
npx prisma migrate deploy
```

### Run Tests

```bash
# Quick start: Setup and run tests
npm run test:setup && npm test

# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm run test:watch

# Run specific test file
npm test -- tests/integration/auth.test.ts

# Type checking
npm run typecheck

# Linting
npm run lint

# Cleanup test environment
npm run test:teardown
```

### CI/CD Testing

The GitHub Actions workflow automatically:
- ✅ Starts PostgreSQL and Redis services
- ✅ Runs database migrations
- ✅ Executes all tests with proper environment
- ✅ Generates coverage reports

### Test Structure

- `tests/integration/` - Integration tests for API endpoints
- `tests/helpers/` - Test utilities and setup
- `.env.test` - Test environment configuration

### Troubleshooting Tests

**Database Connection Issues:**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# View database logs
docker logs postgres-test

# Reset test database
docker rm -f postgres-test redis-test
# Then restart with setup commands above
```

**Test Environment Variables:**
- Tests use `.env.test` for configuration
- GitHub Actions provides its own environment setup
- Local tests need PostgreSQL on port 5432

### Advanced Local Testing Options

**Option A: GitHub Actions Local Runner**
```bash
# Install act (runs GitHub Actions locally)
./scripts/setup-local-runner.sh

# Run GitHub Actions locally
act -j test    # Run just the test job
act           # Run all jobs
```

**Option B: VS Code Dev Container**
1. Install [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
2. Open project in VS Code
3. Press `Cmd/Ctrl + Shift + P` → "Dev Containers: Reopen in Container"
4. Full environment with PostgreSQL, Redis, and Node.js ready to go

**Option C: Pre-commit Testing**
```bash
# Add to .git/hooks/pre-commit
#!/bin/bash
npm run test:ci
```

## 🚢 Deployment

### Production Platforms

- **[Render.com](https://render.com)** (Recommended) - Uses `render.yaml`
- **[Railway](https://railway.app)** - Simple deployment
- **[Vercel](https://vercel.com)** - Serverless deployment
- **Docker/Kubernetes** - Container orchestration
- **Self-hosted** - Traditional VPS deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy to Render

1. Fork this repository
2. Connect to Render
3. Set environment variables in Render dashboard
4. Deploy automatically using `render.yaml`

## 🛠 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production  
npm start           # Start production server
npm test            # Run tests
npm run typecheck   # TypeScript checking
npm run lint        # Code linting
npm run db:generate # Generate Prisma client
npm run db:migrate  # Run database migrations
npm run db:studio   # Open Prisma Studio
npm run db:seed     # Seed database
```

### Adding New MCP Tools

1. Create tool file in `src/mcp/tools/`
2. Define Zod schema for parameters
3. Implement tool handler function
4. Export from `src/mcp/tools/index.ts`
5. Add tests in `tests/integration/`

Example:
```typescript
// src/mcp/tools/my-tool.ts
import { z } from 'zod';
import { ToolDefinition } from '../types';

const myToolSchema = z.object({
  param: z.string()
});

export const myTool: ToolDefinition = {
  description: 'My custom tool',
  inputSchema: myToolSchema,
  handler: async (params, context) => {
    // Tool implementation
    return { result: 'success' };
  }
};
```

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Ensure all tests pass
6. Submit a pull request

### Development Guidelines

- Follow TypeScript best practices
- Add tests for new features
- Update documentation
- Use conventional commit messages
- Ensure code passes linting

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Issues**: Open a GitHub issue
- **Discussions**: Use GitHub Discussions for questions
- **Security**: Report security issues via private email

## 🙏 Acknowledgments

- [Planning Center](https://planningcenter.com) for their excellent API
- [Model Context Protocol](https://github.com/modelcontextprotocol/spec) for the MCP specification
- [Fastify](https://fastify.dev) for the high-performance web framework
- [Prisma](https://prisma.io) for the amazing database toolkit

---

**Built with ❤️ for church communities**
