import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { APP_OPTIONS, configureApp } from './app.setup.js';
import type { Environment } from './config/environment.js';
import { createOpenApiDocument } from './openapi.js';

const app = await NestFactory.create<NestExpressApplication>(AppModule, APP_OPTIONS);
configureApp(app);
app.enableShutdownHooks();

SwaggerModule.setup('api/docs', app, () => createOpenApiDocument(app));

const config = app.get<ConfigService<Environment, true>>(ConfigService);
await app.listen(config.get('PORT', { infer: true }));
