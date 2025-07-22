# Planning Center MCP - Node.js Implementation Guide

## Project Overview

Build a multi-tenant MCP server that allows churches to connect their Planning Center accounts and interact with their data through an AI-powered chat interface.

## Phase 1: Project Foundation (Days 1-3)

### Step 1: Initialize Project

```bash
# Create project directory
mkdir planning-center-mcp
cd planning-center-mcp

# Initialize npm and git
npm init -y
git init

# Create project structure
mkdir -p src/{api,mcp,db,integrations,shared,types}
mkdir -p src/api/{routes,middleware,services}
mkdir -p src/mcp/{tools,handlers}
mkdir -p src/integrations/planning-center
mkdir -p src/shared/{auth,cache,utils}
mkdir -p prisma/migrations
mkdir -p tests/{unit,integration}
touch .env.example .gitignore README.md
```

### Step 2: Install Dependencies

```bash
# Core dependencies
npm install fastify @fastify/cookie @fastify/cors @fastify/jwt @fastify/websocket
npm install @modelcontextprotocol/sdk
npm install @prisma/client prisma
npm install axios dotenv zod
npm install bcryptjs ioredis bullmq
npm install pino pino-pretty

# Dev dependencies
npm install -D typescript @types/node @types/bcryptjs
npm install -D tsx nodemon
npm install -D @types/jest jest ts-jest
npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

### Step 3: Configure TypeScript

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "allowJs": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### Step 4: Setup Scripts

Update `package.json`:
```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:migrate:prod": "prisma migrate deploy",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src --ext ts",
    "typecheck": "tsc --noEmit"
  }
}
```

### Step 5: Environment Configuration

Create `.env.example`:
```env
# Server
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/planning_center_dev

# Redis
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this
COOKIE_SECRET=your-cookie-secret-32-chars-minimum
ENCRYPTION_KEY=32-character-encryption-key-here

# Planning Center OAuth (get from PCO developer account)
PCO_CLIENT_ID=your-pco-client-id
PCO_CLIENT_SECRET=your-pco-client-secret
PCO_REDIRECT_URI=http://localhost:3000/api/v1/auth/planning-center/callback

# Frontend URL
FRONTEND_URL=http://localhost:5173

# MCP Configuration
MCP_SERVER_NAME=planning-center-mcp
MCP_SERVER_VERSION=1.0.0
```

## Phase 2: Database Schema & Models (Days 4-5)

### Step 1: Create Prisma Schema

Create `prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  ADMIN
  LEADER
  MEMBER
}

enum ConnectionStatus {
  ACTIVE
  INACTIVE
  ERROR
}

model Organization {
  id        String   @id @default(uuid())
  name      String
  subdomain String   @unique
  settings  Json     @default("{}")
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  users                    User[]
  planningCenterConnection PlanningCenterConnection?
  people                   Person[]
  teams                    Team[]
  services                 Service[]
  songs                    Song[]
  auditLogs               AuditLog[]

  @@index([subdomain])
}

model User {
  id             String    @id @default(uuid())
  organizationId String
  email          String
  passwordHash   String
  firstName      String?
  lastName       String?
  role           UserRole  @default(MEMBER)
  isActive       Boolean   @default(true)
  lastLoginAt    DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  // Relations
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  sessions     Session[]
  auditLogs    AuditLog[]

  @@unique([organizationId, email])
  @@index([email])
  @@index([organizationId])
}

model Session {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([token])
  @@index([userId])
}

model PlanningCenterConnection {
  id                String           @id @default(uuid())
  organizationId    String           @unique
  pcoOrganizationId String
  
  // OAuth tokens (encrypted)
  accessToken       String?
  refreshToken      String?
  tokenExpiresAt    DateTime?
  
  // Personal Access Token (encrypted) - alternative to OAuth
  encryptedAppId    String?
  encryptedSecret   String?
  
  connectionStatus  ConnectionStatus @default(ACTIVE)
  lastSyncAt        DateTime?
  lastErrorAt       DateTime?
  lastErrorMessage  String?
  
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt

  // Relations
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId])
}

// Planning Center cached data models
model Person {
  id             String   @id @default(uuid())
  organizationId String
  pcoId          String
  firstName      String?
  lastName       String?
  email          String?
  phoneNumber    String?
  status         String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  syncedAt       DateTime

  // Relations
  organization Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  teamMembers  TeamMember[]
  schedules    Schedule[]

  @@unique([organizationId, pcoId])
  @@index([organizationId])
  @@index([email])
}

model Team {
  id             String   @id @default(uuid())
  organizationId String
  pcoId          String
  name           String
  position       String?
  scheduleToText String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  syncedAt       DateTime

  // Relations
  organization Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  teamMembers  TeamMember[]

  @@unique([organizationId, pcoId])
  @@index([organizationId])
}

model TeamMember {
  id             String   @id @default(uuid())
  teamId         String
  personId       String
  status         String?
  createdAt      DateTime @default(now())

  // Relations
  team   Team   @relation(fields: [teamId], references: [id], onDelete: Cascade)
  person Person @relation(fields: [personId], references: [id], onDelete: Cascade)

  @@unique([teamId, personId])
  @@index([teamId])
  @@index([personId])
}

model Service {
  id             String   @id @default(uuid())
  organizationId String
  pcoId          String
  title          String
  seriesTitle    String?
  dateTime       DateTime
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  syncedAt       DateTime

  // Relations
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  schedules    Schedule[]
  serviceSongs ServiceSong[]

  @@unique([organizationId, pcoId])
  @@index([organizationId])
  @@index([dateTime])
}

model Schedule {
  id             String   @id @default(uuid())
  serviceId      String
  personId       String
  teamPosition   String
  status         String   @default("U") // U=Unconfirmed, C=Confirmed, D=Declined
  notifiedAt     DateTime?
  respondedAt    DateTime?
  createdAt      DateTime @default(now())

  // Relations
  service Service @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  person  Person  @relation(fields: [personId], references: [id], onDelete: Cascade)

  @@unique([serviceId, personId, teamPosition])
  @@index([serviceId])
  @@index([personId])
}

model Song {
  id             String   @id @default(uuid())
  organizationId String
  pcoId          String
  title          String
  author         String?
  ccliNumber     String?
  themes         String[] // Array of theme tags
  lastUsedAt     DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  syncedAt       DateTime

  // Relations
  organization Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  serviceSongs ServiceSong[]

  @@unique([organizationId, pcoId])
  @@index([organizationId])
  @@index([themes])
}

model ServiceSong {
  id        String   @id @default(uuid())
  serviceId String
  songId    String
  order     Int
  key       String?
  createdAt DateTime @default(now())

  // Relations
  service Service @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  song    Song    @relation(fields: [songId], references: [id], onDelete: Cascade)

  @@unique([serviceId, songId])
  @@index([serviceId])
  @@index([songId])
}

model AuditLog {
  id             String   @id @default(uuid())
  organizationId String
  userId         String?
  action         String
  resource       String
  resourceId     String?
  details        Json?
  ipAddress      String?
  userAgent      String?
  createdAt      DateTime @default(now())

  // Relations
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user         User?        @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([organizationId])
  @@index([userId])
  @@index([createdAt])
}
```

### Step 2: Run Initial Migration

```bash
# Generate Prisma client
npx prisma generate

# Create initial migration
npx prisma migrate dev --name init

# View database in Prisma Studio
npx prisma studio
```

### Step 3: Create Database Seed

Create `prisma/seed.ts`:
```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create demo organization
  const org = await prisma.organization.create({
    data: {
      name: 'Demo Church',
      subdomain: 'demo',
      settings: {
        timezone: 'America/Chicago',
        defaultServiceTime: '09:00'
      }
    }
  });

  // Create admin user
  const passwordHash = await bcrypt.hash('password123', 10);
  await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'admin@demo.church',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN'
    }
  });

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

## Phase 3: Core Server Setup (Days 6-7)

### Step 1: Create Main Server

Create `src/server.ts`:
```typescript
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { createLogger } from './shared/utils/logger';
import { errorHandler } from './shared/utils/error-handler';
import { authPlugin } from './api/middleware/auth';
import { apiRoutes } from './api/routes';
import { MCPManager } from './mcp/manager';
import Redis from 'ioredis';

// Load environment variables
config();

// Initialize services
const logger = createLogger();
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});
const redis = new Redis(process.env.REDIS_URL!);

// Create Fastify instance
const app = Fastify({
  logger,
  trustProxy: true
});

async function bootstrap() {
  try {
    // Register core plugins
    await app.register(cors, {
      origin: process.env.FRONTEND_URL || true,
      credentials: true
    });

    await app.register(cookie, {
      secret: process.env.COOKIE_SECRET!,
      parseOptions: {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      }
    });

    await app.register(jwt, {
      secret: process.env.JWT_SECRET!,
      cookie: {
        cookieName: 'token',
        signed: true
      }
    });

    // Register WebSocket support
    await app.register(websocket);

    // Custom plugins
    app.decorate('prisma', prisma);
    app.decorate('redis', redis);
    app.setErrorHandler(errorHandler);

    // Auth middleware
    await app.register(authPlugin);

    // Initialize MCP Manager
    const mcpManager = new MCPManager(prisma, redis, logger);
    await mcpManager.initialize();
    app.decorate('mcp', mcpManager);

    // API Routes
    await app.register(apiRoutes, { prefix: '/api/v1' });

    // Health check
    app.get('/health', async () => ({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    }));

    // WebSocket endpoint for chat
    app.register(async function (fastify) {
      fastify.get('/ws', { websocket: true }, (connection, req) => {
        connection.socket.on('message', async (message) => {
          try {
            const data = JSON.parse(message.toString());
            
            // Verify authentication
            if (!req.user) {
              connection.socket.send(JSON.stringify({ 
                error: 'Authentication required' 
              }));
              return;
            }

            // Handle message through MCP
            const response = await mcpManager.handleMessage(data, req.user);
            connection.socket.send(JSON.stringify(response));
          } catch (error) {
            logger.error(error, 'WebSocket message error');
            connection.socket.send(JSON.stringify({ 
              error: 'Internal server error' 
            }));
          }
        });

        connection.socket.on('close', () => {
          logger.info('WebSocket connection closed');
        });
      });
    });

    // Start server
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
    
    await app.listen({ port, host });
    logger.info(`Server listening at http://${host}:${port}`);

  } catch (error) {
    logger.error(error, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Starting graceful shutdown');
  
  try {
    await app.close();
    await prisma.$disconnect();
    await redis.quit();
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error(error, 'Error during shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start the server
bootstrap();
```

### Step 2: Create Logger Utility

Create `src/shared/utils/logger.ts`:
```typescript
import pino from 'pino';

export function createLogger() {
  return pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' 
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname'
          }
        }
      : undefined,
    serializers: {
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
      err: pino.stdSerializers.err
    }
  });
}

export type Logger = ReturnType<typeof createLogger>;
```

### Step 3: Create Error Handler

Create `src/shared/utils/error-handler.ts`:
```typescript
import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export async function errorHandler(
  error: FastifyError | AppError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  request.log.error(error);

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: {
        message: error.message,
        code: error.code
      }
    });
  }

  if ('statusCode' in error && error.statusCode) {
    return reply.status(error.statusCode).send({
      error: {
        message: error.message || 'Request failed',
        code: error.code
      }
    });
  }

  // Default to 500
  return reply.status(500).send({
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }
  });
}
```

## Phase 4: Authentication System (Days 8-9)

### Step 1: Create Auth Middleware

Create `src/api/middleware/auth.ts`:
```typescript
import { FastifyInstance } from 'fastify';
import { AppError } from '../../shared/utils/error-handler';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      organizationId: string;
      email: string;
      role: string;
    };
  }
}

export async function authPlugin(fastify: FastifyInstance) {
  fastify.decorate('authenticate', async function (request: any, reply: any) {
    try {
      const token = request.cookies.token || 
                   request.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        throw new AppError(401, 'Authentication required', 'AUTH_REQUIRED');
      }

      const decoded = await fastify.jwt.verify(token);
      
      // Verify user still exists and is active
      const user = await fastify.prisma.user.findFirst({
        where: {
          id: decoded.userId,
          organizationId: decoded.organizationId,
          isActive: true
        },
        include: {
          organization: true
        }
      });

      if (!user || !user.organization.isActive) {
        throw new AppError(401, 'Invalid authentication', 'INVALID_AUTH');
      }

      request.user = {
        id: user.id,
        organizationId: user.organizationId,
        email: user.email,
        role: user.role
      };

    } catch (error) {
      throw new AppError(401, 'Invalid authentication', 'INVALID_AUTH');
    }
  });

  // Role-based access control
  fastify.decorate('authorize', function (roles: string[]) {
    return async function (request: any, reply: any) {
      if (!request.user) {
        throw new AppError(401, 'Authentication required', 'AUTH_REQUIRED');
      }

      if (!roles.includes(request.user.role)) {
        throw new AppError(403, 'Insufficient permissions', 'FORBIDDEN');
      }
    };
  });
}
```

### Step 2: Create Auth Routes

Create `src/api/routes/auth.ts`:
```typescript
import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { AppError } from '../../shared/utils/error-handler';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  organizationId: z.string().uuid()
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  organizationName: z.string().min(3)
});

export async function authRoutes(fastify: FastifyInstance) {
  // Login
  fastify.post('/auth/login', {
    schema: {
      body: loginSchema
    }
  }, async (request, reply) => {
    const { email, password, organizationId } = request.body as z.infer<typeof loginSchema>;

    const user = await fastify.prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        organizationId,
        isActive: true
      },
      include: {
        organization: true
      }
    });

    if (!user || !await bcrypt.compare(password, user.passwordHash)) {
      throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    if (!user.organization.isActive) {
      throw new AppError(403, 'Organization is inactive', 'ORG_INACTIVE');
    }

    // Generate JWT
    const token = await fastify.jwt.sign({
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role
    }, {
      expiresIn: '7d'
    });

    // Update last login
    await fastify.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Set cookie and return user data
    return reply
      .setCookie('token', token)
      .send({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organization: {
            id: user.organization.id,
            name: user.organization.name,
            subdomain: user.organization.subdomain
          }
        }
      });
  });

  // Register new organization
  fastify.post('/auth/register', {
    schema: {
      body: registerSchema
    }
  }, async (request, reply) => {
    const data = request.body as z.infer<typeof registerSchema>;

    // Check if email already exists
    const existingUser = await fastify.prisma.user.findFirst({
      where: { email: data.email.toLowerCase() }
    });

    if (existingUser) {
      throw new AppError(409, 'Email already registered', 'EMAIL_EXISTS');
    }

    // Create organization and admin user
    const passwordHash = await bcrypt.hash(data.password, 10);
    
    const result = await fastify.prisma.$transaction(async (tx) => {
      // Create organization
      const org = await tx.organization.create({
        data: {
          name: data.organizationName,
          subdomain: generateSubdomain(data.organizationName)
        }
      });

      // Create admin user
      const user = await tx.user.create({
        data: {
          organizationId: org.id,
          email: data.email.toLowerCase(),
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          role: 'ADMIN'
        }
      });

      return { org, user };
    });

    // Generate token
    const token = await fastify.jwt.sign({
      userId: result.user.id,
      organizationId: result.org.id,
      role: result.user.role
    }, {
      expiresIn: '7d'
    });

    return reply
      .setCookie('token', token)
      .code(201)
      .send({
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role,
          organization: {
            id: result.org.id,
            name: result.org.name,
            subdomain: result.org.subdomain
          }
        }
      });
  });

  // Get current user
  fastify.get('/auth/me', {
    preHandler: [fastify.authenticate]
  }, async (request) => {
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.user!.id },
      include: { organization: true }
    });

    return { user };
  });

  // Logout
  fastify.post('/auth/logout', async (request, reply) => {
    return reply
      .clearCookie('token')
      .send({ message: 'Logged out successfully' });
  });
}

function generateSubdomain(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '');
  
  // Add random suffix to ensure uniqueness
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}-${suffix}`;
}
```

## Phase 5: Planning Center Integration (Days 10-12)

### Step 1: Create Planning Center OAuth Flow

Create `src/api/routes/planning-center.ts`:
```typescript
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PlanningCenterClient } from '../../integrations/planning-center/client';
import { EncryptionService } from '../../shared/auth/encryption';

const connectSchema = z.object({
  appId: z.string(),
  secret: z.string()
});

export async function planningCenterRoutes(fastify: FastifyInstance) {
  const encryption = new EncryptionService();

  // Connect Planning Center (Personal Access Token method)
  fastify.post('/planning-center/connect', {
    preHandler: [fastify.authenticate, fastify.authorize(['ADMIN'])]
  }, async (request) => {
    const { appId, secret } = request.body as z.infer<typeof connectSchema>;

    // Test credentials
    const client = new PlanningCenterClient(appId, secret);
    const testResult = await client.testConnection();

    if (!testResult.success) {
      throw new AppError(400, 'Invalid Planning Center credentials', 'INVALID_PCO_CREDS');
    }

    // Save encrypted credentials
    await fastify.prisma.planningCenterConnection.upsert({
      where: { organizationId: request.user!.organizationId },
      create: {
        organizationId: request.user!.organizationId,
        pcoOrganizationId: testResult.organizationId,
        encryptedAppId: encryption.encrypt(appId),
        encryptedSecret: encryption.encrypt(secret),
        connectionStatus: 'ACTIVE'
      },
      update: {
        pcoOrganizationId: testResult.organizationId,
        encryptedAppId: encryption.encrypt(appId),
        encryptedSecret: encryption.encrypt(secret),
        connectionStatus: 'ACTIVE',
        lastErrorAt: null,
        lastErrorMessage: null
      }
    });

    // Start initial sync
    await fastify.queues.sync.add('initial-sync', {
      organizationId: request.user!.organizationId
    });

    return { 
      message: 'Planning Center connected successfully',
      organizationName: testResult.organizationName
    };
  });

  // Disconnect Planning Center
  fastify.delete('/planning-center/disconnect', {
    preHandler: [fastify.authenticate, fastify.authorize(['ADMIN'])]
  }, async (request) => {
    await fastify.prisma.planningCenterConnection.delete({
      where: { organizationId: request.user!.organizationId }
    });

    return { message: 'Planning Center disconnected' };
  });

  // Get connection status
  fastify.get('/planning-center/status', {
    preHandler: [fastify.authenticate]
  }, async (request) => {
    const connection = await fastify.prisma.planningCenterConnection.findUnique({
      where: { organizationId: request.user!.organizationId }
    });

    return {
      connected: !!connection,
      status: connection?.connectionStatus,
      lastSyncAt: connection?.lastSyncAt,
      lastErrorAt: connection?.lastErrorAt,
      lastErrorMessage: connection?.lastErrorMessage
    };
  });

  // Manual sync
  fastify.post('/planning-center/sync', {
    preHandler: [fastify.authenticate, fastify.authorize(['ADMIN', 'LEADER'])]
  }, async (request) => {
    await fastify.queues.sync.add('manual-sync', {
      organizationId: request.user!.organizationId,
      userId: request.user!.id
    });

    return { message: 'Sync started' };
  });
}
```

### Step 2: Create Planning Center Client

Create `src/integrations/planning-center/client.ts`:
```typescript
import axios, { AxiosInstance } from 'axios';
import { RateLimiter } from '../../shared/utils/rate-limiter';

export interface PlanningCenterConfig {
  appId: string;
  secret: string;
  organizationId?: string;
}

export class PlanningCenterClient {
  private api: AxiosInstance;
  private rateLimiter: RateLimiter;

  constructor(config: PlanningCenterConfig) {
    this.api = axios.create({
      baseURL: 'https://api.planningcenteronline.com',
      auth: {
        username: config.appId,
        password: config.secret
      },
      headers: {
        'User-Agent': 'PlanningCenterMCP/1.0'
      }
    });

    // 100 requests per minute
    this.rateLimiter = new RateLimiter({
      tokensPerInterval: 100,
      interval: 60000,
      fireImmediately: true
    });
  }

  async testConnection() {
    try {
      const response = await this.rateLimiter.execute(() =>
        this.api.get('/people/v2')
      );

      return {
        success: true,
        organizationId: response.data.data[0]?.relationships?.organization?.data?.id,
        organizationName: response.data.data[0]?.attributes?.name
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // People endpoints
  async getPeople(params?: any) {
    return this.rateLimiter.execute(() =>
      this.api.get('/people/v2/people', { params })
    );
  }

  async getPerson(id: string) {
    return this.rateLimiter.execute(() =>
      this.api.get(`/people/v2/people/${id}`)
    );
  }

  // Services endpoints
  async getServiceTypes() {
    return this.rateLimiter.execute(() =>
      this.api.get('/services/v2/service_types')
    );
  }

  async getPlans(serviceTypeId: string, params?: any) {
    return this.rateLimiter.execute(() =>
      this.api.get(`/services/v2/service_types/${serviceTypeId}/plans`, { params })
    );
  }

  async getTeams(serviceTypeId: string) {
    return this.rateLimiter.execute(() =>
      this.api.get(`/services/v2/service_types/${serviceTypeId}/teams`)
    );
  }

  async getTeamMembers(serviceTypeId: string, teamId: string) {
    return this.rateLimiter.execute(() =>
      this.api.get(`/services/v2/service_types/${serviceTypeId}/teams/${teamId}/people`)
    );
  }

  // Songs endpoints
  async getSongs(params?: any) {
    return this.rateLimiter.execute(() =>
      this.api.get('/services/v2/songs', { params })
    );
  }

  async searchSongs(query: string) {
    return this.rateLimiter.execute(() =>
      this.api.get('/services/v2/songs', {
        params: { 
          where: { search: query }
        }
      })
    );
  }

  // Scheduling endpoints
  async createPlanPerson(planId: string, data: any) {
    return this.rateLimiter.execute(() =>
      this.api.post(`/services/v2/plans/${planId}/team_members`, { data })
    );
  }

  async updatePlanPerson(planId: string, personId: string, data: any) {
    return this.rateLimiter.execute(() =>
      this.api.patch(`/services/v2/plans/${planId}/team_members/${personId}`, { data })
    );
  }
}
```

## Phase 6: MCP Server Implementation (Days 13-15)

### Step 1: Create MCP Manager

Create `src/mcp/manager.ts`:
```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { Logger } from 'pino';
import { tools } from './tools';
import { ToolContext } from './types';

export class MCPManager {
  private server: Server;
  private transport?: StdioServerTransport;

  constructor(
    private prisma: PrismaClient,
    private redis: Redis,
    private logger: Logger
  ) {
    this.server = new Server(
      {
        name: process.env.MCP_SERVER_NAME || 'planning-center-mcp',
        version: process.env.MCP_SERVER_VERSION || '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: Object.entries(tools).map(([name, tool]) => ({
        name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }))
    }));

    // Execute tools
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      const tool = tools[name];
      if (!tool) {
        throw new Error(`Unknown tool: ${name}`);
      }

      // This will be called with proper context when invoked through handleMessage
      const context = (request as any).context as ToolContext;
      
      try {
        const result = await tool.handler(args, context);
        return {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        this.logger.error({ error, tool: name }, 'Tool execution failed');
        throw error;
      }
    });
  }

  async initialize() {
    this.transport = new StdioServerTransport();
    await this.server.connect(this.transport);
    this.logger.info('MCP server initialized');
  }

  async handleMessage(message: any, user: any): Promise<any> {
    // Create context for tool execution
    const context: ToolContext = {
      prisma: this.prisma,
      redis: this.redis,
      logger: this.logger,
      user: {
        id: user.id,
        organizationId: user.organizationId,
        role: user.role
      }
    };

    // Parse message and determine tool to execute
    const { tool, parameters } = this.parseMessage(message);

    if (!tools[tool]) {
      return {
        error: `Unknown tool: ${tool}`,
        availableTools: Object.keys(tools)
      };
    }

    try {
      const result = await tools[tool].handler(parameters, context);
      return {
        success: true,
        tool,
        result
      };
    } catch (error) {
      this.logger.error({ error, tool, user: user.id }, 'Tool execution failed');
      return {
        success: false,
        error: error.message
      };
    }
  }

  private parseMessage(message: any) {
    // Simple parsing - enhance based on your chat UI needs
    if (message.tool && message.parameters) {
      return {
        tool: message.tool,
        parameters: message.parameters
      };
    }

    // Natural language parsing would go here
    // For now, return a help message
    return {
      tool: 'help',
      parameters: {}
    };
  }

  isHealthy(): boolean {
    return !!this.transport;
  }

  async close() {
    if (this.transport) {
      await this.server.close();
    }
  }
}
```

### Step 2: Create MCP Tools

Create `src/mcp/tools/index.ts`:
```typescript
import { z } from 'zod';
import { ToolDefinition } from '../types';
import { getSchedulingTools } from './scheduling';
import { getPeopleTools } from './people';
import { getSongTools } from './songs';
import { getServiceTools } from './services';

export const tools: Record<string, ToolDefinition> = {
  ...getSchedulingTools(),
  ...getPeopleTools(),
  ...getSongTools(),
  ...getServiceTools(),

  // Help tool
  help: {
    description: 'Get help on available tools and commands',
    inputSchema: z.object({
      topic: z.string().optional()
    }),
    handler: async (params, context) => {
      const availableTools = Object.entries(tools)
        .map(([name, tool]) => `- ${name}: ${tool.description}`)
        .join('\n');

      return `Available tools:\n\n${availableTools}`;
    }
  }
};
```

Create `src/mcp/tools/scheduling.ts`:
```typescript
import { z } from 'zod';
import { ToolDefinition } from '../types';
import { PlanningCenterService } from '../../services/planning-center';

export function getSchedulingTools(): Record<string, ToolDefinition> {
  return {
    schedule_team: {
      description: 'Schedule team members for a service',
      inputSchema: z.object({
        serviceDate: z.string(),
        assignments: z.array(z.object({
          personId: z.string(),
          teamId: z.string(),
          position: z.string()
        }))
      }),
      handler: async (params, context) => {
        const pcoService = new PlanningCenterService(context);
        return await pcoService.scheduleTeam(params);
      }
    },

    get_availability: {
      description: 'Check team member availability for a date range',
      inputSchema: z.object({
        startDate: z.string(),
        endDate: z.string(),
        teamId: z.string().optional()
      }),
      handler: async (params, context) => {
        const pcoService = new PlanningCenterService(context);
        return await pcoService.getAvailability(params);
      }
    },

    suggest_team: {
      description: 'Get team suggestions based on past scheduling',
      inputSchema: z.object({
        serviceDate: z.string(),
        position: z.string()
      }),
      handler: async (params, context) => {
        const pcoService = new PlanningCenterService(context);
        return await pcoService.suggestTeamMembers(params);
      }
    }
  };
}
```

## Phase 7: Frontend React Chat UI (Days 16-17)

### Step 1: Create React Project

```bash
# In a separate directory
npm create vite@latest planning-center-chat -- --template react-ts
cd planning-center-chat
npm install
npm install axios socket.io-client zustand react-hook-form zod
npm install -D @types/node tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Step 2: Create Chat Component

Create `src/components/Chat.tsx`:
```tsx
import React, { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuthStore } from '../stores/authStore';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

export function Chat() {
  const { user } = useAuthStore();
  const { messages, sendMessage, isConnected } = useWebSocket();
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    setIsLoading(true);
    try {
      await sendMessage({
        type: 'chat',
        content
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return <div>Please log in to use the chat.</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Planning Center Assistant</h1>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </header>

      <MessageList messages={messages} />
      
      <MessageInput 
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        placeholder="Ask about your teams, services, or songs..."
      />
    </div>
  );
}
```

### Step 3: Create WebSocket Hook

Create `src/hooks/useWebSocket.ts`:
```typescript
import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

export function useWebSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { token } = useAuthStore();

  useEffect(() => {
    if (!token) return;

    const newSocket = io(import.meta.env.VITE_WS_URL || 'ws://localhost:3000', {
      auth: { token },
      transports: ['websocket']
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('message', (data: any) => {
      const message: Message = {
        id: Date.now().toString(),
        content: data.result || data.error || 'Received response',
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, message]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token]);

  const sendMessage = useCallback(async (data: any) => {
    if (!socket || !isConnected) {
      throw new Error('Not connected to server');
    }

    // Add user message to list
    const userMessage: Message = {
      id: Date.now().toString(),
      content: data.content,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Send to server
    socket.emit('message', data);
  }, [socket, isConnected]);

  return {
    messages,
    sendMessage,
    isConnected
  };
}
```

## Phase 8: Testing & Deployment (Days 18-20)

### Step 1: Create Test Suite

Create `tests/integration/auth.test.ts`:
```typescript
import { test, expect } from '@jest/globals';
import { build } from '../helpers/app';

test('POST /api/v1/auth/login', async () => {
  const app = await build();

  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: {
      email: 'admin@demo.church',
      password: 'password123',
      organizationId: 'test-org-id'
    }
  });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toHaveProperty('user');
  expect(response.headers['set-cookie']).toBeDefined();
});
```

### Step 2: Create Docker Configuration

Create `Dockerfile`:
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build
RUN npx prisma generate

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
```

### Step 3: Create Deployment Configuration

Create `render.yaml` for Render.com:
```yaml
services:
  - type: web
    name: planning-center-mcp
    runtime: node
    buildCommand: npm install && npm run build && npx prisma generate
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: planning-center-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          type: redis
          name: planning-center-redis
          property: connectionString
      - fromGroup: planning-center-secrets

databases:
  - name: planning-center-db
    plan: starter
    postgresMajorVersion: 15

services:
  - type: redis
    name: planning-center-redis
    plan: starter
```

## Implementation Timeline

### Week 1: Foundation
- Days 1-3: Project setup, dependencies, database schema
- Days 4-5: Core server, authentication system
- Days 6-7: Planning Center integration basics

### Week 2: Core Features
- Days 8-9: MCP tool implementations
- Days 10-11: Sync jobs and caching
- Days 12-13: WebSocket chat functionality

### Week 3: Polish & Testing
- Days 14-15: React frontend
- Days 16-17: Integration testing
- Days 18-19: Performance optimization

### Week 4: Deployment
- Day 20: Deploy to production
- Day 21: Monitor and fix issues

## Next Steps After Implementation

1. **Add more MCP tools** for specific church needs
2. **Implement natural language processing** for better chat interactions
3. **Add webhook support** for real-time Planning Center updates
4. **Build admin dashboard** for organization management
5. **Add analytics** to track usage and popular features
6. **Implement billing** if moving beyond free tier

This implementation guide provides a complete, production-ready system using modern Node.js practices with TypeScript, Prisma, and Fastify.