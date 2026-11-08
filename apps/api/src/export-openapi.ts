import { writeFile } from 'node:fs/promises';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

// The env check still runs, but the document needs neither a database nor a secret.
// Dynamic imports below: ConfigModule reads process.env as soon as app.module is imported.
process.env.DATABASE_URL ??= 'postgresql://localhost/unused';
process.env.JWT_SECRET ??= 'only-used-to-build-the-openapi-document';

const { AppModule } = await import('./app.module.js');
const { APP_OPTIONS, configureApp } = await import('./app.setup.js');
const { createOpenApiDocument } = await import('./openapi.js');

// Preview mode builds the module graph without creating providers, so nothing touches the database.
const app = await NestFactory.create<NestExpressApplication>(AppModule, {
  ...APP_OPTIONS,
  preview: true,
  logger: ['error'],
});
configureApp(app);
const document = createOpenApiDocument(app);
await app.close();

// Orval quietly renames a repeated operationId (getCourt2), so stop here instead.
const operationIds = Object.values(document.paths).flatMap(path =>
  (['get', 'post', 'put', 'patch', 'delete'] as const).flatMap(
    method => path[method]?.operationId ?? []
  )
);
const repeated = operationIds.filter((id, index) => operationIds.indexOf(id) !== index);
if (repeated.length > 0) {
  throw new Error(`Controller method names must be unique: ${repeated.join(', ')}`);
}

await writeFile(
  new URL('../openapi.json', import.meta.url),
  `${JSON.stringify(document, null, 2)}\n`
);
