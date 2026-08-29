# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package definition and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Production stage
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/secret_santa.db

# Copy built artifacts and production node_modules
COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

# Create directory for persistent SQLite storage
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "dist/server/index.js"]
