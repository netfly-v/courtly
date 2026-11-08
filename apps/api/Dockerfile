# Build from the repo root: pnpm needs the workspace files and the lockfile.
FROM node:24.22-slim

# Prisma's engines need OpenSSL to pick the right binary, and the slim image has none.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
RUN npm install --global pnpm@12.18.0

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/prisma.config.ts apps/api/
COPY apps/api/prisma/schema.prisma apps/api/prisma/
RUN pnpm install --frozen-lockfile

COPY tsconfig.base.json ./
COPY apps/api apps/api
RUN pnpm --filter @courtly/api build

WORKDIR /app/apps/api
EXPOSE 4000
CMD ["node", "dist/main.js"]
