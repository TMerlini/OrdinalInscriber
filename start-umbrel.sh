#!/bin/bash

# Ordinarinos Umbrel Startup Script

# Print environment (without sensitive data)
echo "Starting Ordinarinos in Umbrel environment"
echo "----------------------------------------"
echo "NODE_ENV: $NODE_ENV"
echo "PORT: $PORT"
echo "BTC_RPC_HOST: $BTC_RPC_HOST"
echo "BTC_RPC_PORT: $BTC_RPC_PORT"
echo "ORD_RPC_HOST: $ORD_RPC_HOST"
echo "ORD_RPC_PORT: $ORD_RPC_PORT"
echo "----------------------------------------"

# Verify Bitcoin/Ord connectivity if direct connection is enabled
if [ "$DIRECT_CONNECT" = "true" ]; then
  echo "Checking Bitcoin Core connectivity..."
  BTC_CHECK=$(curl -s --data-binary '{"jsonrpc":"1.0","id":"check","method":"getblockchaininfo","params":[]}' -H 'content-type:text/plain;' http://$BTC_RPC_USER:$BTC_RPC_PASSWORD@$BTC_RPC_HOST:$BTC_RPC_PORT/ | jq -r '.error')
  
  if [ "$BTC_CHECK" = "null" ]; then
    echo "Bitcoin Core connection successful"
    export BTC_SERVER_AVAILABLE=true
  else
    echo "Bitcoin Core connection failed: $BTC_CHECK"
    export BTC_SERVER_AVAILABLE=false
  fi
  
  echo "Checking Ord connectivity..."
  ORD_CHECK=$(curl -s --fail http://$ORD_RPC_HOST:$ORD_RPC_PORT/status 2>/dev/null || echo "failed")
  
  if [ "$ORD_CHECK" != "failed" ]; then
    echo "Ord connection successful"
    export ORD_SERVER_AVAILABLE=true
  else
    echo "Ord connection failed"
    export ORD_SERVER_AVAILABLE=false
  fi
else
  echo "Direct connection disabled"
  export BTC_SERVER_AVAILABLE=false
  export ORD_SERVER_AVAILABLE=false
fi

# Ensure the ord data directory exists with proper permissions
echo "Setting up data directories..."
mkdir -p /ord/data
chmod 755 /ord/data

# Start the application
echo "Starting Ordinarinos..."
cd /app
node dist/server/index.js