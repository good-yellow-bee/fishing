# Production image by default (Fly builds the last stage); `docker compose up` builds the dev stage.
FROM node:26-bookworm AS deps
RUN npm install -g pnpm@10.14.0
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

FROM deps AS dev
COPY . .
EXPOSE 5173
CMD ["pnpm", "dev"]

FROM deps AS build
COPY . .
RUN pnpm --filter @stillwater/web build

# Only the API's runtime dependencies; better-sqlite3 builds here if no prebuilt binary fits.
FROM deps AS prod-deps
RUN rm -rf node_modules apps/*/node_modules packages/*/node_modules \
  && pnpm install --frozen-lockfile --prod --filter @stillwater/api...

FROM node:26-bookworm-slim
ENV NODE_ENV=production PORT=8080
WORKDIR /app
COPY --from=prod-deps /app ./
COPY packages/shared/src packages/shared/src
COPY apps/api/src apps/api/src
COPY --from=build /app/apps/web/dist apps/web/dist
EXPOSE 8080
# Node strips the TypeScript types itself, so the API runs from source without tsx.
CMD ["node", "apps/api/src/index.ts"]
