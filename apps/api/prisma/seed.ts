import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword } from '../src/auth/password.js';
import { PrismaClient, Role } from '../src/generated/prisma/client.js';

const DEMO_PASSWORD = 'courtly-demo';

const users = [
  { email: 'admin@courtly.dev', name: 'Vitalii', role: Role.ADMIN },
  { email: 'anna@courtly.dev', name: 'Anna Silva', role: Role.USER },
  { email: 'ben@courtly.dev', name: 'Ben Costa', role: Role.USER },
];

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

try {
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: { ...user, passwordHash: await hashPassword(DEMO_PASSWORD) },
    });
  }
  console.log(`Seeded ${users.length} users, password: ${DEMO_PASSWORD}`);
} finally {
  await prisma.$disconnect();
}
