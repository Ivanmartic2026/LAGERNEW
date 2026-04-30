# ── Multi-stage build for Lager AI ──

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Build backend
FROM node:20-alpine AS backend-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/prisma ./prisma
RUN npx prisma generate
COPY server/. .

# Stage 3: Production image
FROM node:20-alpine AS production
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy backend
COPY --from=backend-build /app/server/node_modules ./server/node_modules
COPY --from=backend-build /app/server/prisma ./server/prisma
COPY --from=backend-build /app/server/src ./server/src
COPY --from=backend-build /app/server/package.json ./server/package.json

# Copy frontend dist
COPY --from=frontend-build /app/dist ./dist

# Generate Prisma client in production
RUN cd server && npx prisma generate

# Environment
ENV NODE_ENV=production
ENV PORT=3002
ENV FRONTEND_URL=/
ENV DATABASE_URL=${DATABASE_URL}

EXPOSE 3002

WORKDIR /app/server
CMD ["dumb-init", "node", "src/index.js"]
