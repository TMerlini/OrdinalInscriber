#!/bin/bash

# Ordinarinos - Umbrel Installation Script

echo "============================================================"
echo "             Ordinarinos - Umbrel Installation"
echo "============================================================"
echo ""
echo "This script will install Ordinarinos on your Umbrel node."
echo "It integrates with your existing Bitcoin Core and Ord nodes."
echo ""

# Make sure we're in Umbrel environment
if [ ! -d "/home/umbrel" ]; then
  echo "Error: This script must be run in an Umbrel environment."
  exit 1
fi

echo "Checking for Bitcoin Core and Ord..."
# Check if Docker is available
if command -v docker >/dev/null 2>&1 && docker ps >/dev/null 2>&1; then
  # Check if Bitcoin Core is running
  if ! docker ps | grep -q "bitcoin"; then
    echo "Warning: Bitcoin Core is not running on this Umbrel node."
    echo "Please install and start Bitcoin Core before installing Ordinarinos."
    echo "Continue anyway for testing? (y/n)"
    read -r answer
    if [ "$answer" != "y" ]; then
      echo "Installation aborted."
      exit 1
    fi
  fi
else
  echo "Warning: Docker not available or not accessible. Skipping container checks."
  echo "This is a simulation mode for testing the script."
  echo "In a real Umbrel environment, Bitcoin Core and Ord would be required."
  echo "Continue with simulation? (y/n)"
  read -r answer
  if [ "$answer" != "y" ]; then
    echo "Installation aborted."
    exit 1
  fi
fi

# Check if Ord is running
if ! docker ps | grep -q "ord"; then
  echo "Warning: Ord does not appear to be running on this Umbrel node."
  echo "Ordinarinos requires the Ord node for Bitcoin Ordinals functionality."
  echo "Would you like to continue anyway? (y/n)"
  read -r answer
  if [ "$answer" != "y" ]; then
    echo "Installation aborted."
    exit 1
  fi
fi

# Get RPC credentials from Bitcoin Core
BITCOIN_RPC_USER=$(grep rpcuser /home/umbrel/umbrel/app-data/bitcoin/data/bitcoin/bitcoin.conf | cut -d'=' -f2)
BITCOIN_RPC_PASS=$(grep rpcpassword /home/umbrel/umbrel/app-data/bitcoin/data/bitcoin/bitcoin.conf | cut -d'=' -f2)

# Create app directory
APP_DIR="/home/umbrel/umbrel/app-data/ordinarinos"
mkdir -p "$APP_DIR"
mkdir -p "$APP_DIR/data"

# Create .env file with configuration
cat > "$APP_DIR/.env" << EOF
BTC_RPC_USER=$BITCOIN_RPC_USER
BTC_RPC_PASSWORD=$BITCOIN_RPC_PASS
BTC_RPC_HOST=bitcoin.embassy
BTC_RPC_PORT=8332
ORD_RPC_HOST=ord.embassy
ORD_RPC_PORT=8080
NODE_ENV=production
PORT=3500
EOF

echo "Configuration created."
echo "Your Ordinarinos app is now installed in the Umbrel app store."
echo "You can start it from the Umbrel dashboard."
echo ""
echo "============================================================"
echo "                 Installation Complete"
echo "============================================================"