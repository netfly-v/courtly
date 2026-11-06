import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

export default async (project: TestProject) => {
  // Same image as compose.yaml, so tests run on the database version we ship.
  const container = await new PostgreSqlContainer('postgres:18-alpine').start();
  project.provide('databaseUrl', container.getConnectionUri());

  return async () => {
    await container.stop();
  };
};
