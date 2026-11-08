import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { APP_OPTIONS, configureApp } from '../src/app.setup.js';
import { Clock } from '../src/clock/clock.js';

export const createTestApp = async (clock?: Clock) => {
  const builder = Test.createTestingModule({ imports: [AppModule] });
  if (clock) {
    builder.overrideProvider(Clock).useValue(clock);
  }
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>(APP_OPTIONS);
  configureApp(app);
  await app.init();
  return app;
};
