# ── CORTEXA production image ────────────────────────────────────────────
# Stage 1: build the Vite application on Node 20 (required by Vite 6 and
# Tailwind CSS v4 — older Node versions fail the build with opaque errors).
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies first for layer caching. `npm install` is used (not
# `npm ci`) so a missing or drifted lockfile never breaks the image build.
COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

# ── Stage 2: minimal runtime — static server only ───────────────────────
FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/server.js ./server.js

# Railway injects $PORT at deploy time; server.js binds 0.0.0.0:$PORT.
EXPOSE 3000
CMD ["node", "server.js"]
