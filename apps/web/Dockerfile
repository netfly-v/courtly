# Build from the repo root: pnpm needs the workspace files and the lockfile.
FROM node:24.22-slim

# npm 11 warns about unlisted install scripts; pnpm's own one only installs its native binary.
RUN npm install --global --allow-scripts=pnpm pnpm@12.18.0

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
# --ignore-scripts: Orval (postinstall) needs the sources below, so it runs after they are copied.
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY tsconfig.base.json ./
COPY apps/api/openapi.json apps/api/
COPY apps/web apps/web
RUN pnpm --filter @courtly/web api:generate

# Must be a build argument: next build bakes the API address into the build.
ARG API_INTERNAL_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @courtly/web build

WORKDIR /app/apps/web
EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start"]
