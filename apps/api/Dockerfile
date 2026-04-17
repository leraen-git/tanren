FROM node:22-slim AS base
WORKDIR /app

# Match local npm version to avoid lockfile format mismatch
RUN npm install -g npm@11.12.1

# Copy full monorepo package manifests so npm ci sees all workspaces
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/mobile/package.json apps/mobile/
COPY packages/shared/package.json packages/shared/
RUN npm ci --ignore-scripts

# Build shared package first (API depends on it)
COPY packages/shared/ packages/shared/
RUN cd packages/shared && npx tsc

# Build API
COPY apps/api/ apps/api/
RUN cd apps/api && npx tsc

# ── Runtime ──────────────────────────────────────────────
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages/shared/ ./packages/shared/
COPY --from=base /app/apps/api/ ./apps/api/
COPY --from=base /app/package.json ./

EXPOSE 3000
CMD ["node", "apps/api/dist/index.js"]
