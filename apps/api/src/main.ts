import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import type { Environment } from './config/environment.js';

const app = await NestFactory.create(AppModule);
configureApp(app);
app.enableShutdownHooks();

const openApiConfig = new DocumentBuilder().setTitle('Courtly API').setVersion('1.0').build();
SwaggerModule.setup('api/docs', app, () => SwaggerModule.createDocument(app, openApiConfig));

const config = app.get<ConfigService<Environment, true>>(ConfigService);
await app.listen(config.get('PORT', { infer: true }));
