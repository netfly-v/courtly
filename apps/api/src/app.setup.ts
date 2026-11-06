import type { INestApplication } from '@nestjs/common';

// Shared by main.ts and the e2e tests, so tests run the app with the same setup as production.
export const configureApp = (app: INestApplication) => {
  app.setGlobalPrefix('api');
};
