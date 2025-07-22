import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set default test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
process.env.COOKIE_SECRET = 'test-cookie-secret-32-characters-long';
process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';
process.env.LOG_LEVEL = 'silent';

// Increase timeout for integration tests
jest.setTimeout(30000);