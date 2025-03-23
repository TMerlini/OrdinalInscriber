#!/bin/bash
# Umbrel-specific installation script for Ordinarinos Inscription Tool

echo "Starting Ordinarinos Inscription Tool installation for Umbrel..."

# Create the cache directory with proper permissions
mkdir -p cache
chmod 777 cache

# Stop any existing container
docker stop ordinarinos-inscription-tool 2>/dev/null || true
docker rm ordinarinos-inscription-tool 2>/dev/null || true

# Ensure start-umbrel.sh is executable
chmod +x start-umbrel.sh

# Build and start the container using the Umbrel-specific configuration
echo "Building and starting the container..."
docker compose -f docker-compose.umbrel.yml up -d --build

echo "Checking container status..."
sleep 3
docker ps | grep ordinarinos-inscription-tool

if [ $? -eq 0 ]; then
  echo "=================================================="
  echo "Ordinarinos Inscription Tool installed successfully!"
  echo "Access it at: http://umbrel-ip:3500"
  echo "=================================================="
else
  echo "=================================================="
  echo "⚠️ Warning: Container may not be running properly."
  echo "Check the logs with: docker logs ordinarinos-inscription-tool"
  echo "=================================================="
fi

echo "For troubleshooting, refer to the umbrel-debug.md file."