# Liquium Backend Dockerfile
FROM node:20-alpine AS base

# Install build dependencies including openssl for Prisma
RUN apk add --no-cache libc6-compat python3 make g++ openssl openssl-dev

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./
COPY tsconfig.json ./
COPY prisma ./prisma/

# Install dependencies
FROM base AS dependencies
RUN corepack enable pnpm && pnpm install --no-frozen-lockfile

# Development stage
FROM base AS development
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

EXPOSE 3000

CMD ["pnpm", "run", "dev"]

# Build stage
FROM base AS build
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Remove problematic services before build (optional Yellow/Nitrolite features)
RUN rm -rf src/services/clearnode src/services/nitrolite src/config/clearnode.ts

RUN corepack enable pnpm && pnpm run build
RUN corepack enable pnpm && pnpm prune --prod

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy only necessary files
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/prisma ./prisma

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]
