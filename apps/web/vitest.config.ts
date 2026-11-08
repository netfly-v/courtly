import { defineConfig } from 'vitest/config';

// West of UTC and of the facility zone: code that uses the browser time zone shows wrong times.
const env = { TZ: 'America/New_York' };

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    clearMocks: true,
    env,
  },
});
