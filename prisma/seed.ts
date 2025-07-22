import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create demo organization
  const org = await prisma.organization.create({
    data: {
      name: 'Demo Church',
      subdomain: 'demo',
      settings: {
        timezone: 'America/Chicago',
        defaultServiceTime: '09:00'
      }
    }
  });

  // Create admin user
  const passwordHash = await bcrypt.hash('password123', 10);
  await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'admin@demo.church',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN'
    }
  });

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });