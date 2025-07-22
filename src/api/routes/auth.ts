import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { AppError } from '../../shared/utils/error-handler';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  organizationName: z.string().min(1)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  organizationId: z.string().uuid()
});

export async function authRoutes(fastify: FastifyInstance) {
  
  // Register new user and organization
  fastify.post('/auth/register', async (request, reply) => {
    const { email, password, firstName, lastName, organizationName } = request.body as z.infer<typeof registerSchema>;

    // Check if user already exists
    const existingUser = await fastify.prisma.user.findFirst({
      where: { email }
    });

    if (existingUser) {
      throw new AppError(409, 'User already exists', 'USER_EXISTS');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create organization and user in transaction
    const result = await fastify.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          subdomain: organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          isActive: true
        }
      });

      const user = await tx.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          firstName,
          lastName,
          role: 'ADMIN',
          organizationId: organization.id,
          isActive: true
        },
        include: {
          organization: true
        }
      });

      return { user, organization };
    });

    // Generate JWT
    const token = await fastify.jwt.sign({
      userId: result.user.id,
      organizationId: result.user.organizationId,
      role: result.user.role
    });

    // Set cookie
    reply.setCookie('token', token, {
      path: '/',
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    reply.status(201);
    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
        organization: {
          id: result.organization.id,
          name: result.organization.name,
          subdomain: result.organization.subdomain
        }
      }
    };
  });

  // Login user
  fastify.post('/auth/login', async (request, reply) => {
    const { email, password, organizationId } = request.body as z.infer<typeof loginSchema>;

    // Find user
    const user = await fastify.prisma.user.findFirst({
      where: {
        email,
        organizationId,
        isActive: true
      },
      include: {
        organization: true
      }
    });

    if (!user || !user.organization.isActive) {
      throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Generate JWT
    const token = await fastify.jwt.sign({
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role
    });

    // Set cookie
    reply.setCookie('token', token, {
      path: '/',
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organization: {
          id: user.organization.id,
          name: user.organization.name,
          subdomain: user.organization.subdomain
        }
      }
    };
  });

  // Get current user
  fastify.get('/auth/me', async (request, reply) => {
    try {
      // Get token from signed cookie or authorization header
      let token;
      
      // Try to get from cookie first
      if (request.cookies.token) {
        token = request.cookies.token;
      }
      
      // Fallback: manually parse cookie header if automated parsing failed
      if (!token && request.headers.cookie) {
        const cookieHeader = request.headers.cookie;
        const tokenMatch = cookieHeader.match(/token=([^;]+)/);
        if (tokenMatch) {
          token = tokenMatch[1];
        }
      }
      
      // Fallback to authorization header
      if (!token && request.headers.authorization) {
        token = request.headers.authorization.replace('Bearer ', '');
      }

      if (!token) {
        throw new AppError(401, 'Invalid authentication', 'INVALID_AUTH');
      }

      // Verify the JWT token
      const payload = await fastify.jwt.verify(token) as any;
      const userId = payload.userId;
      const organizationId = payload.organizationId;
      
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        include: {
          organization: true
        }
      });

      if (!user) {
        throw new AppError(401, 'User not found', 'USER_NOT_FOUND');
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organization: {
            id: user.organization.id,
            name: user.organization.name,
            subdomain: user.organization.subdomain
          }
        }
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(401, 'Invalid authentication', 'INVALID_AUTH');
    }
  });

  // Logout user
  fastify.post('/auth/logout', async (request, reply) => {
    reply.clearCookie('token', {
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'lax'
    });

    return { message: 'Logged out successfully' };
  });
}