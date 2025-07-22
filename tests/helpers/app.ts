import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { createLogger } from '../../src/shared/utils/logger';
import { errorHandler } from '../../src/shared/utils/error-handler';
import { authPlugin } from '../../src/api/middleware/auth';
import { apiRoutes } from '../../src/api/routes';
import { MCPManager } from '../../src/mcp/manager';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    redis: Redis;
    mcp: MCPManager;
    authenticate: any;
    authorize: any;
  }
}

export async function build(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: 'silent' // Disable logging in tests
    }
  });

  // Use test database
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/planning_center_test'
      }
    }
  });

  // Use test Redis (or mock)
  const redis = new Redis(process.env.TEST_REDIS_URL || 'redis://localhost:6379/1');

  // Register plugins
  await app.register(cors, {
    origin: true,
    credentials: true
  });

  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET || 'test-cookie-secret-32-characters-long',
    parseOptions: {
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'lax'
    }
  });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'test-jwt-secret'
  });

  await app.register(websocket);

  // Decorate with services
  app.decorate('prisma', prisma);
  app.decorate('redis', redis);
  app.setErrorHandler(errorHandler);

  // Auth middleware - MUST be registered before routes  
  await app.register(authPlugin);

  // Wait for auth plugin to be fully registered
  await app.after();

  // Initialize MCP Manager
  const mcpManager = new MCPManager(prisma, redis, app.log);
  await mcpManager.initialize();
  app.decorate('mcp', mcpManager);

  // API Routes
  await app.register(apiRoutes, { prefix: '/api/v1' });

  // Health check
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0-test'
  }));

  return app;
}

export async function cleanup(app: FastifyInstance) {
  if (app) {
    await app.close();
    if (app.prisma) {
      await app.prisma.$disconnect();
    }
    if (app.redis) {
      await app.redis.quit();
    }
  }
}