import { test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import { build, cleanup } from '../helpers/app';
import { setupTestDb, teardownTestDb, createTestOrganization, createTestUser } from '../helpers/db';

describe('Authentication API', () => {
  let app: FastifyInstance;
  let orgId: string;

  beforeAll(async () => {
    app = await build();
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
    await cleanup(app);
  });

  beforeEach(async () => {
    await setupTestDb();
    const org = await createTestOrganization();
    orgId = org.id;
  });

  test('POST /api/v1/auth/register - should create new organization and user', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        organizationName: 'New Church'
      }
    });

    expect(response.statusCode).toBe(201);
    const data = response.json();
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe('newuser@example.com');
    expect(data.user.role).toBe('ADMIN');
    expect(data.user.organization).toBeDefined();
    expect(response.headers['set-cookie']).toBeDefined();
  });

  test('POST /api/v1/auth/login - should login existing user', async () => {
    // Create test user first
    await createTestUser(orgId, 'ADMIN', 'test@example.com');

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'test@example.com',
        password: 'password123',
        organizationId: orgId
      }
    });

    expect(response.statusCode).toBe(200);
    const data = response.json();
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe('test@example.com');
    expect(response.headers['set-cookie']).toBeDefined();
  });

  test('POST /api/v1/auth/login - should fail with invalid credentials', async () => {
    await createTestUser(orgId, 'ADMIN', 'test@example.com');

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'test@example.com',
        password: 'wrongpassword',
        organizationId: orgId
      }
    });

    expect(response.statusCode).toBe(401);
    const data = response.json();
    expect(data.error.code).toBe('INVALID_CREDENTIALS');
  });

  test('GET /api/v1/auth/me - should return current user', async () => {
    const user = await createTestUser(orgId);

    // First login to get token
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'test@example.com',
        password: 'password123',
        organizationId: orgId
      }
    });

    const cookies = loginResponse.headers['set-cookie'] as string[];

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        cookie: cookies[0]
      }
    });

    expect(response.statusCode).toBe(200);
    const data = response.json();
    expect(data.user.id).toBe(user.id);
  });

  test('POST /api/v1/auth/logout - should clear authentication', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout'
    });

    expect(response.statusCode).toBe(200);
    const data = response.json();
    expect(data.message).toBe('Logged out successfully');
  });

  test('GET /api/v1/auth/me - should fail without authentication', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me'
    });

    expect(response.statusCode).toBe(401);
    const data = response.json();
    expect(data.error.code).toBe('INVALID_AUTH');
  });
});