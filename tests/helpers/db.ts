import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/planning_center_test'
    }
  }
});

export async function setupTestDb() {
  // Clean database
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.serviceSong.deleteMany(),
    prisma.schedule.deleteMany(),
    prisma.teamMember.deleteMany(),
    prisma.song.deleteMany(),
    prisma.service.deleteMany(),
    prisma.team.deleteMany(),
    prisma.person.deleteMany(),
    prisma.planningCenterConnection.deleteMany(),
    prisma.session.deleteMany(),
    prisma.user.deleteMany(),
    prisma.organization.deleteMany(),
  ]);
}

export async function createTestOrganization() {
  return await prisma.organization.create({
    data: {
      name: 'Test Church',
      subdomain: 'test',
      settings: {
        timezone: 'America/Chicago',
        defaultServiceTime: '09:00'
      }
    }
  });
}

export async function createTestUser(organizationId: string, role = 'ADMIN', email?: string) {
  const passwordHash = await bcrypt.hash('password123', 10);
  const userEmail = email || `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`;
  
  return await prisma.user.create({
    data: {
      organizationId,
      email: userEmail,
      passwordHash,
      firstName: 'Test',
      lastName: 'User',
      role: role as any
    }
  });
}

export async function createTestPlanningCenterConnection(organizationId: string) {
  return await prisma.planningCenterConnection.create({
    data: {
      organizationId,
      pcoOrganizationId: 'test-pco-org-id',
      encryptedAppId: 'encrypted-app-id',
      encryptedSecret: 'encrypted-secret',
      connectionStatus: 'ACTIVE'
    }
  });
}

export async function teardownTestDb() {
  await prisma.$disconnect();
}

export { prisma };