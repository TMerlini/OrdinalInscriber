
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production

# Copy built application
COPY dist/ ./dist/
COPY assets/ ./assets/

# Create and setup start script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh
RUN cat /app/start.sh

# Create cache directory
RUN mkdir -p /app/cache
RUN chmod 777 /app/cache

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Start the application
CMD ["/bin/sh", "/app/start.sh"]
