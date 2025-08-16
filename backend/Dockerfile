# Backend Dockerfile - Node 18, multi-stage build
FROM node:18-alpine AS builder
WORKDIR /app

# Install dependencies (full) for build step
COPY backend/package*.json ./
RUN npm ci

# Copy source and build (if build step present)
COPY backend/ .
# If your backend has a build step, keep it; otherwise this will be a no-op
RUN if [ -f package.json ] && (jq -r '.scripts.build // empty' package.json) | grep -q .; then npm run build; fi || true

# Remove dev dependencies
RUN npm prune --production || true

# Final image
FROM node:18-alpine
WORKDIR /app

# Copy from builder
COPY --from=builder /app /app

# Copy and make start script executable
COPY backend/start.sh ./start.sh
RUN chmod +x ./start.sh

ENV NODE_ENV=production

CMD ["./start.sh"]
