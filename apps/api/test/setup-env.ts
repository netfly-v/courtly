import { inject } from 'vitest';

// Must run before AppModule is imported (not in beforeAll); it also beats a developer's local .env.
process.env.DATABASE_URL = inject('databaseUrl');
process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long';
process.env.COOKIE_SECURE = 'false';
process.env.FACILITY_TIMEZONE = 'Europe/Lisbon';
