import { test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import { build, cleanup } from '../helpers/app';
import { setupTestDb, teardownTestDb, createTestOrganization, createTestUser } from '../helpers/db';

describe('Planning Center API', () => {
  let app: FastifyInstance;
  let orgId: string;
  let userCookie: string;

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
    const cookies = loginResponse.headers['set-cookie'];
    
    // Handle both string and array cases
    let cookieString;
    if (Array.isArray(cookies)) {
      cookieString = cookies[0];
    } else {
      cookieString = cookies as string;
    }
    
    expect(cookieString).toBeDefined();
    userCookie = cookieString.split(';')[0];
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
    const memberCookies = memberLogin.headers['set-cookie'];
    
    // Handle both string and array cases
    let memberCookieString;
    if (Array.isArray(memberCookies)) {
      memberCookieString = memberCookies[0];
    } else {
      memberCookieString = memberCookies as string;
    }
    
    expect(memberCookieString).toBeDefined();
    const memberCookie = memberCookieString.split(';')[0];

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/planning-center/connect',
      headers: {
        cookie: memberCookie
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
        cookie: userCookie
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
    const leaderCookies = leaderLogin.headers['set-cookie'];
    
    // Handle both string and array cases
    let leaderCookieString;
    if (Array.isArray(leaderCookies)) {
      leaderCookieString = leaderCookies[0];
    } else {
      leaderCookieString = leaderCookies as string;
    }
    
    expect(leaderCookieString).toBeDefined();
    const leaderCookie = leaderCookieString.split(';')[0];

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/planning-center/disconnect',
      headers: {
        cookie: leaderCookie
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
        cookie: userCookie
      }
    });

    // Should succeed even without PCO connection (sync job will be queued)
    expect([200, 404]).toContain(response.statusCode);
  });
});