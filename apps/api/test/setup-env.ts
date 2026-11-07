import { inject } from 'vitest';

// ConfigModule reads process.env when AppModule is imported, so this runs before the test files.
// process.env also wins over a local .env, so the developer's settings can't break the tests.
process.env.DATABASE_URL = inject('databaseUrl');
process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long';
process.env.COOKIE_SECURE = 'false';
