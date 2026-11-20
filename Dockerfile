# Multi-stage production build for Smart Classroom Management System
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build both frontend SPA and unified server bundle
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built assets from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/src ./src

# Create data and uploads directories for persistence
RUN mkdir -p /app/data /app/uploads

EXPOSE 5000

CMD ["node", "dist/server.js"]
