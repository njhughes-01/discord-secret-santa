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

# Stage 2: Production runner stage
FROM node:24-alpine AS runner

# Install build dependencies for better-sqlite3 production native rebuild if needed
RUN apk add --no-cache python3 make g++ sqlite-dev

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Create persistent data directory
RUN mkdir -p /app/data && chown -R node:node /app/data

USER node

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production
ENV DB_PATH=/app/data/secret_santa.db

CMD ["node", "dist/server/index.js"]
