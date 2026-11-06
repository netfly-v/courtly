import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // `prisma generate` runs without a database (CI, Docker build), so the URL may be missing there
    url: process.env.DATABASE_URL ?? '',
  },
});
