import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword } from '../src/auth/password.js';
import { PrismaClient, Role, Sport } from '../src/generated/prisma/client.js';

const DEMO_PASSWORD = 'courtly-demo';

const users = [
  { email: 'admin@courtly.dev', name: 'Vitalii', role: Role.ADMIN },
  { email: 'anna@courtly.dev', name: 'Anna Silva', role: Role.USER },
  { email: 'ben@courtly.dev', name: 'Ben Costa', role: Role.USER },
];

// Fixed ids, so a second run finds the same courts instead of adding new ones.
const courts = [
  {
    id: '218c2796-edf8-4397-8c69-e91eadd471e4',
    name: 'Padel 1',
    sport: Sport.PADEL,
    hourlyPriceCents: 2400,
    openHour: 8,
    closeHour: 23,
  },
  {
    id: '9c696f48-1559-4584-9b51-d8e747f42656',
    name: 'Padel 2',
    sport: Sport.PADEL,
    hourlyPriceCents: 2400,
    openHour: 8,
    closeHour: 23,
  },
  {
    id: '569dd45c-688f-4c82-a1ee-fe51f0867c9f',
    name: 'Tennis Clay',
    sport: Sport.TENNIS,
    hourlyPriceCents: 1800,
    openHour: 8,
    closeHour: 22,
  },
  {
    id: '0ea794c8-7631-4c82-b048-2643dc67313d',
    name: 'Tennis Hard',
    sport: Sport.TENNIS,
    hourlyPriceCents: 1600,
    openHour: 8,
    closeHour: 22,
  },
  {
    id: '0c09df49-65d4-49df-b945-7701a476f613',
    name: 'Pickleball',
    sport: Sport.PICKLEBALL,
    hourlyPriceCents: 1200,
    openHour: 9,
    closeHour: 21,
    isActive: false,
  },
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
  for (const court of courts) {
    await prisma.court.upsert({ where: { id: court.id }, update: {}, create: court });
  }
  console.log(
    `Seeded ${users.length} users and ${courts.length} courts, password: ${DEMO_PASSWORD}`
  );
} finally {
  await prisma.$disconnect();
}
