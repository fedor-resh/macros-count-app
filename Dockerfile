# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies (vite is needed for preview)
RUN npm ci --only=production && npm install vite

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist

# Expose the preview port (default 4173)
EXPOSE 4173

# Run preview server
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]

