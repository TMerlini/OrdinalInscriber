
FROM node:20-slim

WORKDIR /app

# Install necessary tools
RUN apt-get update && apt-get install -y \
    procps \
    net-tools \
    lsof \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production

# Copy built application
COPY dist/ ./dist/
COPY assets/ ./assets/
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

# Create cache directory
RUN mkdir -p /app/cache

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Start the application
CMD ["./start.sh"]
