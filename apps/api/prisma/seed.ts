import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword } from '../src/auth/password.js';
import { cancellableUntil } from '../src/bookings/booking-rules.js';
import { addDays, facilityDate, HOUR_MS, zonedInstant } from '../src/facility/facility-time.js';
import { BookingStatus, PrismaClient, Role, Sport } from '../src/generated/prisma/client.js';

const DEMO_PASSWORD = 'courtly-demo';

const users = [
  { email: 'admin@courtly.dev', name: 'Vitalii', role: Role.ADMIN },
  { email: 'anna@courtly.dev', name: 'Anna Silva', role: Role.USER },
  { email: 'ben@courtly.dev', name: 'Ben Costa', role: Role.USER },
];

const padel1 = {
  id: '218c2796-edf8-4397-8c69-e91eadd471e4',
  name: 'Padel 1',
  sport: Sport.PADEL,
  hourlyPriceCents: 2400,
  openHour: 8,
  closeHour: 23,
};
const padel2 = {
  id: '9c696f48-1559-4584-9b51-d8e747f42656',
  name: 'Padel 2',
  sport: Sport.PADEL,
  hourlyPriceCents: 2400,
  openHour: 8,
  closeHour: 23,
};
const tennisClay = {
  id: '569dd45c-688f-4c82-a1ee-fe51f0867c9f',
  name: 'Tennis Clay',
  sport: Sport.TENNIS,
  hourlyPriceCents: 1800,
  openHour: 8,
  closeHour: 22,
};
const tennisHard = {
  id: '0ea794c8-7631-4c82-b048-2643dc67313d',
  name: 'Tennis Hard',
  sport: Sport.TENNIS,
  hourlyPriceCents: 1600,
  openHour: 8,
  closeHour: 22,
};
const pickleball = {
  id: '0c09df49-65d4-49df-b945-7701a476f613',
  name: 'Pickleball',
  sport: Sport.PICKLEBALL,
  hourlyPriceCents: 1200,
  openHour: 9,
  closeHour: 21,
  isActive: false,
};
const courts = [padel1, padel2, tennisClay, tennisHard, pickleball];

// `day` counts from today and `hour` is local, both in the facility time zone.
const bookings = [
  { email: 'anna@courtly.dev', court: padel1, day: -1, hour: 10, hours: 1 },
  { email: 'anna@courtly.dev', court: tennisClay, day: -2, hour: 18, hours: 2 },
  { email: 'anna@courtly.dev', court: padel1, day: 0, hour: 9, hours: 1 },
  { email: 'ben@courtly.dev', court: tennisClay, day: 0, hour: 18, hours: 2 },
  { email: 'anna@courtly.dev', court: padel2, day: 0, hour: 19, hours: 1, cancelled: true },
  // The cancelled slot above is free again, so someone else booked it.
  { email: 'ben@courtly.dev', court: padel2, day: 0, hour: 19, hours: 1 },
  { email: 'anna@courtly.dev', court: padel1, day: 1, hour: 10, hours: 1 },
  { email: 'anna@courtly.dev', court: padel2, day: 1, hour: 19, hours: 2 },
  { email: 'anna@courtly.dev', court: tennisHard, day: 2, hour: 9, hours: 1, cancelled: true },
  { email: 'ben@courtly.dev', court: padel2, day: -1, hour: 12, hours: 1 },
  { email: 'ben@courtly.dev', court: padel1, day: 1, hour: 11, hours: 1 },
  { email: 'ben@courtly.dev', court: tennisClay, day: 1, hour: 18, hours: 2 },
  { email: 'ben@courtly.dev', court: padel1, day: 3, hour: 20, hours: 1 },
  // An inactive court keeps its bookings.
  { email: 'ben@courtly.dev', court: pickleball, day: 1, hour: 10, hours: 1 },
  // Narrowing Padel 1 to 8-21 fails because of this one.
  { email: 'ben@courtly.dev', court: padel1, day: 5, hour: 21, hours: 1 },
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

  const existing = await prisma.booking.count();
  if (existing > 0) {
    console.log(`Bookings skipped: the table already has ${existing} rows`);
  } else {
    const timeZone = process.env.FACILITY_TIMEZONE ?? 'Europe/Lisbon';
    const now = new Date();
    const today = facilityDate(now, timeZone);
    await prisma.$transaction(
      bookings.map(({ email, court, day, hour, hours, cancelled }) => {
        const startsAt = new Date(zonedInstant(addDays(today, day), hour, timeZone));
        return prisma.booking.create({
          data: {
            user: { connect: { email } },
            court: { connect: { id: court.id } },
            startsAt,
            endsAt: new Date(startsAt.getTime() + hours * HOUR_MS),
            totalPriceCents: court.hourlyPriceCents * hours,
            ...(cancelled && {
              status: BookingStatus.CANCELLED,
              // Never later than the app allows, even when the seed runs late in the day.
              cancelledAt: new Date(Math.min(now.getTime(), cancellableUntil(startsAt).getTime())),
            }),
          },
        });
      })
    );
    console.log(`Seeded ${bookings.length} bookings`);
  }
} finally {
  await prisma.$disconnect();
}
