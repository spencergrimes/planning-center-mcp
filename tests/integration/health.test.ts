import { test, expect, beforeAll, afterAll } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import { build, cleanup } from '../helpers/app';
import { setupTestDb, teardownTestDb } from '../helpers/db';

describe('Health Checks', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await build();
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
    await cleanup(app);
  });

  test('GET /health - should return health status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health'
    });

    expect(response.statusCode).toBe(200);
    const data = response.json();
    expect(data.status).toBe('ok');
    expect(data.timestamp).toBeDefined();
    expect(data.version).toBe('1.0.0-test');
  });

  test('Database connection should be healthy', async () => {
    // Test Prisma connection
    const result = await app.prisma.$queryRaw`SELECT 1 as healthy`;
    expect(result).toBeDefined();
  });

  test('Redis connection should be healthy', async () => {
    // Test Redis connection
    const result = await app.redis.ping();
    expect(result).toBe('PONG');
  });

  test('MCP Manager should be healthy', async () => {
    expect(app.mcp.isHealthy()).toBe(true);
  });
});