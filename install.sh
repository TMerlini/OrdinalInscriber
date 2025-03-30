#!/bin/bash

# Ordinarinos - Installation Script

echo "============================================================"
echo "             Ordinarinos - Installation"
echo "============================================================"
echo ""
echo "This script will install Ordinarinos on your system."
echo ""

# Detect if we're in an Umbrel environment
if [ -d "/home/umbrel" ]; then
  echo "Umbrel environment detected."
  echo "Running Umbrel-specific installation..."
  bash ./umbrel-install.sh
  exit $?
fi

# Check for Docker
if ! command -v docker >/dev/null 2>&1; then
  echo "Error: Docker is required but not installed."
  echo "Please install Docker and try again."
  exit 1
fi

# Check for Docker Compose
if ! command -v docker-compose >/dev/null 2>&1; then
  echo "Error: Docker Compose is required but not installed."
  echo "Please install Docker Compose and try again."
  exit 1
fi

# Create data directory
DATA_DIR="./ord-data"
mkdir -p "$DATA_DIR"

# Check for existing .env file
if [ ! -f ".env" ]; then
  echo "Creating default .env file..."
  cat > ".env" << EOF
# Ordinarinos configuration
PORT=3500
NODE_ENV=production

# Bitcoin Core settings (if available)
# BTC_RPC_USER=
# BTC_RPC_PASSWORD=
# BTC_RPC_HOST=
# BTC_RPC_PORT=8332

# Ord settings (if available)
# ORD_RPC_HOST=
# ORD_RPC_PORT=8080
EOF
fi

echo "Building Docker images..."
docker-compose build

echo "Starting Ordinarinos..."
docker-compose up -d

echo ""
echo "Installation complete!"
echo "Ordinarinos is now running at http://localhost:3500"
echo ""
echo "You can stop the application with: docker-compose down"
echo "============================================================"