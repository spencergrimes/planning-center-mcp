import { FastifyInstance } from 'fastify';
import { planningCenterRoutes } from './planning-center';

export async function apiRoutes(fastify: FastifyInstance) {
  // API info endpoint
  fastify.get('/', async () => ({
    message: 'Planning Center MCP API',
    version: '1.0.0',
    endpoints: [
      'GET /health - Server health check',
      'POST /planning-center/connect - Connect Planning Center account',
      'DELETE /planning-center/disconnect - Disconnect Planning Center account',
      'GET /planning-center/status - Get connection status',
      'POST /planning-center/sync - Trigger manual sync',
      'POST /planning-center/test - Test connection'
    ]
  }));

  // Register Planning Center routes
  await fastify.register(planningCenterRoutes);
}