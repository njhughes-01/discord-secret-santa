# Multi-stage Dockerfile for Discord Secret Santa
# Stage 1: Build stage
FROM node:24-alpine AS builder

# Install build dependencies for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production dependencies (build tools stay out of the final image)
FROM node:24-alpine AS deps

# Install build dependencies for better-sqlite3 native rebuild if no prebuild matches
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Stage 3: Production runner stage
FROM node:24-alpine AS runner

# The app never runs npm at runtime; drop the bundled npm/corepack so their deps aren't shipped
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
  /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

WORKDIR /app

COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Create persistent data directory
RUN mkdir -p /app/data && chown -R node:node /app/data

USER node

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production
ENV DB_PATH=/app/data/secret_santa.db

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/settings').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/server/index.js"]
