import { defineConfig } from 'vitest/config';

// Same DST dates as Lisbon, but not UTC: code that reads the machine time zone fails in tests.
const env = { TZ: 'Europe/Berlin' };

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'unit', include: ['src/**/*.spec.ts'], env } },
      {
        test: {
          name: 'e2e',
          include: ['test/**/*-spec.ts'],
          globalSetup: ['test/global-setup.ts'],
          setupFiles: ['test/setup-env.ts'],
          env,
        },
      },
    ],
  },
});
