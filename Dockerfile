
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production

# Install ALL dependencies (including dev dependencies)
RUN npm install

# Copy built application
COPY dist/ ./dist/
COPY assets/ ./assets/

# Create and setup run script (completely new file)
COPY run.sh /app/run.sh
RUN chmod +x /app/run.sh
RUN cat /app/run.sh

# Create cache directory with proper permissions
RUN mkdir -p /app/cache
RUN chmod 777 /app/cache

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Start the application using the new run.sh script
CMD ["/bin/sh", "/app/run.sh"]
