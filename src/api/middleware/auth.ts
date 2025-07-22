import { FastifyInstance } from 'fastify';
import { AppError } from '../../shared/utils/error-handler';

export async function authPlugin(fastify: FastifyInstance) {
  fastify.decorate('authenticate', async function (request: any, reply: any) {
    try {
      const token = request.cookies.token || 
                   request.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        throw new AppError(401, 'Authentication required', 'AUTH_REQUIRED');
      }

      const decoded = await fastify.jwt.verify(token) as any;
      
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