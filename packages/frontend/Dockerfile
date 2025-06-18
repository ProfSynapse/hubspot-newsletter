# Build stage
FROM node:18-alpine AS builder

# Accept build args
ARG VITE_BACKEND_URL

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Set environment variable for build
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install serve
RUN npm install -g serve

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy start script
COPY start.sh ./

# Make start script executable
RUN chmod +x start.sh

# Expose port
EXPOSE 8080

# Start serve with dynamic port
CMD ["sh", "./start.sh"]