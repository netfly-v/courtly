import { inject } from 'vitest';

// ConfigModule reads process.env when AppModule is imported, so this must run before the test files load.
process.env.DATABASE_URL = inject('databaseUrl');
process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long';
