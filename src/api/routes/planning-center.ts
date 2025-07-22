import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PlanningCenterClient } from '../../integrations/planning-center/client';
import { EncryptionService } from '../../shared/auth/encryption';
import { AppError } from '../../shared/utils/error-handler';

const connectSchema = z.object({
  appId: z.string(),
  secret: z.string()
});

export async function planningCenterRoutes(fastify: FastifyInstance) {
  const encryption = new EncryptionService();

  // Connect Planning Center (Personal Access Token method)
  fastify.post('/planning-center/connect', {
    preHandler: [fastify.authenticate]
  }, async (request) => {
    // Check if user is admin
    if ((request as any).user.role !== 'ADMIN') {
      throw new AppError(403, 'Insufficient permissions', 'FORBIDDEN');
    }
    const { appId, secret } = request.body as z.infer<typeof connectSchema>;

    // Test credentials
    const client = new PlanningCenterClient({ appId, secret });
    const testResult = await client.testConnection();

    if (!testResult.success) {
      throw new AppError(400, 'Invalid Planning Center credentials', 'INVALID_PCO_CREDS');
    }

    // Save encrypted credentials
    await fastify.prisma.planningCenterConnection.upsert({
      where: { organizationId: (request.user as any).organizationId },
      create: {
        organizationId: (request.user as any).organizationId,
        pcoOrganizationId: testResult.organizationId || 'unknown',
        encryptedAppId: encryption.encrypt(appId),
        encryptedSecret: encryption.encrypt(secret),
        connectionStatus: 'ACTIVE'
      },
      update: {
        pcoOrganizationId: testResult.organizationId || 'unknown',
        encryptedAppId: encryption.encrypt(appId),
        encryptedSecret: encryption.encrypt(secret),
        connectionStatus: 'ACTIVE',
        lastErrorAt: null,
        lastErrorMessage: null
      }
    });

    // TODO: Start initial sync when queue system is implemented
    // await fastify.queues.sync.add('initial-sync', {
    //   organizationId: request.user!.organizationId
    // });

    return { 
      message: 'Planning Center connected successfully',
      organizationName: testResult.organizationName || 'Unknown Organization'
    };
  });

  // Disconnect Planning Center
  fastify.delete('/planning-center/disconnect', {
    preHandler: [fastify.authenticate]
  }, async (request) => {
    // Check if user is admin
    if ((request as any).user.role !== 'ADMIN') {
      throw new AppError(403, 'Insufficient permissions', 'FORBIDDEN');
    }
    await fastify.prisma.planningCenterConnection.delete({
      where: { organizationId: (request.user as any).organizationId }
    });

    return { message: 'Planning Center disconnected' };
  });

  // Get connection status
  fastify.get('/planning-center/status', {
    preHandler: [fastify.authenticate]
  }, async (request) => {
    const connection = await fastify.prisma.planningCenterConnection.findUnique({
      where: { organizationId: (request.user as any).organizationId }
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
    preHandler: [fastify.authenticate]
  }, async (request) => {
    // Check if user is admin or leader
    if (!['ADMIN', 'LEADER'].includes((request as any).user.role)) {
      throw new AppError(403, 'Insufficient permissions', 'FORBIDDEN');
    }
    // TODO: Implement when queue system is ready
    // await fastify.queues.sync.add('manual-sync', {
    //   organizationId: request.user!.organizationId,
    //   userId: request.user!.id
    // });

    return { message: 'Sync functionality will be implemented with queue system' };
  });

  // Test Planning Center connection
  fastify.post('/planning-center/test', {
    preHandler: [fastify.authenticate]
  }, async (request) => {
    // Check if user is admin
    if ((request as any).user.role !== 'ADMIN') {
      throw new AppError(403, 'Insufficient permissions', 'FORBIDDEN');
    }
    const connection = await fastify.prisma.planningCenterConnection.findUnique({
      where: { organizationId: (request.user as any).organizationId }
    });

    if (!connection) {
      throw new AppError(404, 'Planning Center not connected', 'NOT_CONNECTED');
    }

    try {
      const appId = encryption.decrypt(connection.encryptedAppId!);
      const secret = encryption.decrypt(connection.encryptedSecret!);
      
      const client = new PlanningCenterClient({ appId, secret });
      const testResult = await client.testConnection();

      if (testResult.success) {
        // Update connection status
        await fastify.prisma.planningCenterConnection.update({
          where: { organizationId: (request.user as any).organizationId },
          data: {
            connectionStatus: 'ACTIVE',
            lastErrorAt: null,
            lastErrorMessage: null
          }
        });

        return {
          success: true,
          message: 'Connection test successful',
          organizationName: testResult.organizationName
        };
      } else {
        // Update connection status
        await fastify.prisma.planningCenterConnection.update({
          where: { organizationId: (request.user as any).organizationId },
          data: {
            connectionStatus: 'ERROR',
            lastErrorAt: new Date(),
            lastErrorMessage: testResult.error
          }
        });

        throw new AppError(400, `Connection test failed: ${testResult.error}`, 'CONNECTION_FAILED');
      }
    } catch (error: any) {
      throw new AppError(500, `Connection test error: ${error.message}`, 'TEST_ERROR');
    }
  });
}