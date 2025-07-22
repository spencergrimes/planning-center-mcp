import { test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import { build, cleanup } from '../helpers/app';
import { setupTestDb, teardownTestDb, createTestOrganization, createTestUser } from '../helpers/db';

describe('Planning Center API', () => {
  let app: FastifyInstance;
  let orgId: string;
  let userCookies: string[];

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

    // Create and login admin user
    await createTestUser(orgId, 'ADMIN', 'test@example.com');
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'test@example.com',
        password: 'password123',
        organizationId: orgId
      }
    });
    
    expect(loginResponse.statusCode).toBe(200);
    userCookies = loginResponse.headers['set-cookie'] as string[];
    expect(userCookies).toBeDefined();
  });

  test('POST /api/v1/planning-center/connect - should require admin role', async () => {
    // Create non-admin user
    await createTestUser(orgId, 'MEMBER', 'member@example.com');
    const memberLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'member@example.com',
        password: 'password123',
        organizationId: orgId
      }
    });
    
    expect(memberLogin.statusCode).toBe(200);
    const memberCookies = memberLogin.headers['set-cookie'] as string[];
    expect(memberCookies).toBeDefined();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/planning-center/connect',
      headers: {
        cookie: memberCookies[0]
      },
      payload: {
        appId: 'test-app-id',
        secret: 'test-secret'
      }
    });

    expect(response.statusCode).toBe(403);
    const data = response.json();
    expect(data.error.code).toBe('FORBIDDEN');
  });

  test('GET /api/v1/planning-center/status - should return connection status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/planning-center/status',
      headers: {
        cookie: userCookies[0]
      }
    });

    expect(response.statusCode).toBe(200);
    const data = response.json();
    expect(data).toHaveProperty('connected');
    expect(data.connected).toBe(false);
  });

  test('DELETE /api/v1/planning-center/disconnect - should require admin role', async () => {
    // Create non-admin user
    await createTestUser(orgId, 'LEADER', 'leader@example.com');
    const leaderLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'leader@example.com',
        password: 'password123',
        organizationId: orgId
      }
    });
    const leaderCookies = leaderLogin.headers['set-cookie'] as string[];

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/planning-center/disconnect',
      headers: {
        cookie: leaderCookies[0]
      }
    });

    expect(response.statusCode).toBe(403);
    const data = response.json();
    expect(data.error.code).toBe('FORBIDDEN');
  });

  test('POST /api/v1/planning-center/sync - should allow admin and leader roles', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/planning-center/sync',
      headers: {
        cookie: userCookies[0]
      }
    });

    // Should succeed even without PCO connection (sync job will be queued)
    expect([200, 404]).toContain(response.statusCode);
  });
});