#!/bin/bash
# Umbrel-specific installation script for Ordinarinos Inscription Tool

echo "=================================================="
echo "Starting Ordinarinos Inscription Tool installation for Umbrel..."
echo "=================================================="

# Function to get the host IP address for better access instructions
get_host_ip() {
  # Try various methods to get the IP
  local ip=""
  
  # Try hostname -I first (most reliable on Linux)
  if command -v hostname >/dev/null 2>&1; then
    ip=$(hostname -I | awk '{print $1}')
  fi
  
  # If that didn't work, try ifconfig
  if [ -z "$ip" ] && command -v ifconfig >/dev/null 2>&1; then
    ip=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n 1)
  fi
  
  # If that didn't work, try ip address
  if [ -z "$ip" ] && command -v ip >/dev/null 2>&1; then
    ip=$(ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '127.0.0.1' | head -n 1)
  fi
  
  # Return the IP or a default message
  if [ -n "$ip" ]; then
    echo "$ip"
  else
    echo "umbrel.local"
  fi
}

# Create the cache directory with proper permissions
echo "Creating cache directory..."
mkdir -p cache
chmod 777 cache
echo "✓ Cache directory created"

# Stop any existing container
echo "Checking for existing containers..."
if docker ps -a | grep -q ordinarinos-inscription-tool; then
  echo "Found existing container, stopping and removing..."
  docker stop ordinarinos-inscription-tool 2>/dev/null || true
  docker rm ordinarinos-inscription-tool 2>/dev/null || true
  echo "✓ Existing container removed"
else
  echo "✓ No existing container found"
fi

# Ensure start-umbrel.sh is executable
echo "Setting executable permissions..."
chmod +x start-umbrel.sh
echo "✓ Permissions set"

# Check if ord container exists
echo "Checking for Ordinals container..."
if docker ps | grep -q ordinals_ord_1; then
  echo "✓ Ordinals container found: ordinals_ord_1"
else
  echo "⚠️ Warning: Ordinals container (ordinals_ord_1) not found"
  echo "The application will still install but may not be able to connect to the Ord node"
fi

# Check if umbrel_network exists
echo "Checking for umbrel_network..."
if docker network ls | grep -q umbrel_network; then
  echo "✓ umbrel_network found"
else
  echo "⚠️ Warning: umbrel_network not found"
  echo "Creating umbrel_network..."
  docker network create umbrel_network
  echo "✓ Created umbrel_network"
fi

# Get IP address for access instructions
HOST_IP=$(get_host_ip)

# Build and start the container using the Umbrel-specific configuration
echo "Building and starting the container..."
docker compose -f docker-compose.umbrel.yml up -d --build
BUILD_RESULT=$?

if [ $BUILD_RESULT -ne 0 ]; then
  echo "⚠️ Error during container build/start process"
  echo "Check for error messages above"
  exit 1
fi

echo "Waiting for container to initialize..."
sleep 5

echo "Checking container status..."
if docker ps | grep -q ordinarinos-inscription-tool; then
  # Get container IP for diagnostics
  CONTAINER_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ordinarinos-inscription-tool)
  
  echo "=================================================="
  echo "✅ Ordinarinos Inscription Tool installed successfully!"
  echo "Container is running with IP: $CONTAINER_IP"
  echo ""
  echo "You can access the tool at:"
  echo "  http://$HOST_IP:3500"
  echo "  or"
  echo "  http://umbrel.local:3500"
  echo "=================================================="
  
  # Additional diagnostic info
  echo "Testing connection to Ordinals container..."
  if docker exec ordinarinos-inscription-tool ping -c 1 ordinals_ord_1 >/dev/null 2>&1; then
    echo "✓ Connection to Ordinals container successful"
  else
    echo "⚠️ Warning: Cannot connect to Ordinals container"
    echo "Make sure both containers are on the same network"
  fi
else
  echo "=================================================="
  echo "⚠️ Warning: Container is not running properly."
  echo "Checking logs..."
  docker logs ordinarinos-inscription-tool
  echo ""
  echo "For troubleshooting, try:"
  echo "  docker logs ordinarinos-inscription-tool"
  echo "=================================================="
fi

echo "For detailed troubleshooting, refer to the umbrel-debug.md file."