# syntax=docker/dockerfile:1

# ---- 1. Build the React client ----
FROM node:20-slim AS client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ---- 2. Build the server (TypeScript -> dist) ----
FROM node:20-slim AS server
WORKDIR /app/server
ENV PUPPETEER_SKIP_DOWNLOAD=true
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npx prisma generate && npm run build

# ---- 3. Runtime image ----
FROM node:20-slim AS runtime
ENV NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    PUBLIC_DIR=public

# System Chromium for the Puppeteer PDF engine.
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium ca-certificates fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/server
COPY --from=server /app/server/node_modules ./node_modules
COPY --from=server /app/server/dist ./dist
COPY --from=server /app/server/prisma ./prisma
COPY --from=server /app/server/package.json ./package.json
COPY --from=client /app/client/dist ./public

EXPOSE 4000
# Applies migrations, seeds once if empty, then starts the API + SPA.
CMD ["npm", "run", "start:prod"]
