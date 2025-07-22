import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { errorHandler } from './shared/utils/error-handler';
import { authPlugin } from './api/middleware/auth';
import { apiRoutes } from './api/routes';
import { MCPManager } from './mcp/manager';
import Redis from 'ioredis';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    redis: Redis;
    mcp: MCPManager;
    authenticate: any;
    authorize: any;
  }
}

// Load environment variables
config();

// Initialize services
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});
// Use a mock Redis for development if REDIS_URL is not available
const redis = process.env.REDIS_URL 
  ? new Redis(process.env.REDIS_URL)
  : new Redis({
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: 1,
      lazyConnect: true
    });

// Create Fastify instance
const app = Fastify({
  logger: {
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
      : undefined
  },
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
    const mcpManager = new MCPManager(prisma, redis, app.log);
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
        connection.socket.on('message', async (message: Buffer) => {
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
            app.log.error(error, 'WebSocket message error');
            connection.socket.send(JSON.stringify({ 
              error: 'Internal server error' 
            }));
          }
        });

        connection.socket.on('close', () => {
          app.log.info('WebSocket connection closed');
        });
      });
    });

    // Start server
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
    
    await app.listen({ port, host });
    app.log.info(`Server listening at http://${host}:${port}`);

  } catch (error) {
    app.log.error(error, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown
const gracefulShutdown = async () => {
  app.log.info('Starting graceful shutdown');
  
  try {
    await app.close();
    await prisma.$disconnect();
    await redis.quit();
    app.log.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    app.log.error(error, 'Error during shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start the server
bootstrap();