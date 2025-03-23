#!/bin/sh
# Umbrel-specific installation script with absolutely no dependencies

# Create necessary directories
mkdir -p cache

echo "Starting Ordinarinos Inscription Tool on Umbrel..."
echo "=================================================="

# Create a custom start script for Umbrel that runs directly
cat > start-umbrel.sh << 'EOL'
#!/bin/sh
# Ultra minimal startup script with no dependencies
mkdir -p /app/cache
chmod 777 /app/cache
node /app/dist/index.js
EOL

chmod +x start-umbrel.sh

# Update Dockerfile to use our new script
cat > Dockerfile.umbrel << 'EOL'
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
COPY start-umbrel.sh /app/start.sh
RUN chmod +x /app/start.sh

# Create cache directory with proper permissions
RUN mkdir -p /app/cache
RUN chmod 777 /app/cache

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000
ENV USE_SIMPLIFIED_STARTUP=true

# Expose port
EXPOSE 5000

# Start the application using simple shell script
CMD ["/bin/sh", "/app/start.sh"]
EOL

# Update docker-compose file for Umbrel
cat > docker-compose.umbrel.yml << 'EOL'
version: '3'

services:
  ordinarinos:
    build:
      context: .
      dockerfile: Dockerfile.umbrel
    container_name: ordinarinos-inscription-tool
    restart: unless-stopped
    ports:
      - "3500:5000"
    volumes:
      - ./cache:/app/cache
    environment:
      - NODE_ENV=production
      - PORT=5000
      - CACHE_LIMIT_BYTES=5368709120  # 5GB cache limit
      - ORD_CONTAINER_NAME=ordinals_ord_1
      - ORD_API_PORT=4000
      - ORD_NODE_IP=10.21.21.4
      - USE_SIMPLIFIED_STARTUP=true
    networks:
      - umbrel_main_network

networks:
  umbrel_main_network:
    external: true
EOL

echo "Starting containers using Umbrel-specific configuration..."
docker-compose -f docker-compose.umbrel.yml up -d

# Check if the container started correctly
if [ $? -eq 0 ]; then
    echo
    echo "=================================================="
    echo "Ordinarinos Inscription Tool installed successfully!"
    echo
    echo "You can access the application at:"
    echo "http://localhost:3500"
    echo
    echo "If you're running this on Umbrel, use your Umbrel IP address"
    echo "=================================================="
else
    echo
    echo "=================================================="
    echo "Error: Failed to start the containers."
    echo "Please check the Docker logs for more information:"
    echo "docker logs ordinarinos-inscription-tool"
    echo "=================================================="
    exit 1
fi