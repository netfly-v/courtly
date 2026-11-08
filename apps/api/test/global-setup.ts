import { execFileSync } from 'node:child_process';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

export default async (project: TestProject) => {
  const container = await new PostgreSqlContainer('postgres:18-alpine').start();
  const databaseUrl = container.getConnectionUri();

  // The real migrations, not `db push`: the EXCLUDE and CHECK constraints exist only there.
  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
  project.provide('databaseUrl', databaseUrl);

  return async () => {
    await container.stop();
  };
};
