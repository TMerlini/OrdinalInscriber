#!/bin/bash
# Umbrel App Installation Test Script
# This script helps diagnose issues with Umbrel App Store installation

echo "=== Ordinarinos Umbrel Installation Diagnostic ==="
echo ""

# Output version information
echo "App version: 1.0.0"
echo "Checking app configuration files..."

# Check if icon exists
if [ -f "/icon.png" ]; then
  echo "✓ Icon file exists at /icon.png"
else
  echo "✗ Icon file missing! Should be at /icon.png"
  echo "  - This will cause the icon to not appear in the app store."
fi

# Check if manifest files exist with proper configuration
echo ""
echo "Checking manifest files:"

# Check umbrel-app.yml
if [ -f "/app/umbrel-app.yml" ]; then
  echo "✓ umbrel-app.yml exists"
  
  # Check umbrel-app-store.yml
  if [ -f "/app/umbrel-app-store.yml" ]; then
    echo "✓ umbrel-app-store.yml exists"
    
    # Check repository URL in store file
    if grep -q "repo: https://github.com/TMerlini/OrdinalInscriber" /app/umbrel-app-store.yml; then
      echo "  ✓ Repository URL properly configured in umbrel-app-store.yml"
    else
      echo "  ✗ Repository URL improperly configured in umbrel-app-store.yml"
      echo "    - Should be 'repo: https://github.com/TMerlini/OrdinalInscriber'"
    fi
    
    # Check gallery URLs
    if grep -q "TMerlini/OrdinalInscriber/main/screenshots" /app/umbrel-app-store.yml; then
      echo "  ✓ Gallery image URLs properly configured"
    else
      echo "  ✗ Gallery image URLs improperly configured"
      echo "    - Should use 'TMerlini/OrdinalInscriber/main/screenshots'"
    fi
  else
    echo "✗ umbrel-app-store.yml missing!"
  fi
  
  # Check icon configuration
  if grep -q "icon: /icon.png" /app/umbrel-app.yml; then
    echo "  ✓ Icon properly configured in umbrel-app.yml"
  else
    echo "  ✗ Icon improperly configured in umbrel-app.yml"
    echo "    - Should be 'icon: /icon.png'"
  fi
  
  # Check port configuration
  if grep -q "port: 3500" /app/umbrel-app.yml; then
    echo "  ✓ Port properly configured in umbrel-app.yml"
  else
    echo "  ✗ Port improperly configured in umbrel-app.yml"
    echo "    - Should be 'port: 3500'"
  fi
  
  # Check repository URL
  if grep -q "repo: https://github.com/TMerlini/OrdinalInscriber" /app/umbrel-app.yml; then
    echo "  ✓ Repository URL properly configured in umbrel-app.yml"
  else
    echo "  ✗ Repository URL improperly configured in umbrel-app.yml"
    echo "    - Should be 'repo: https://github.com/TMerlini/OrdinalInscriber'"
  fi
else
  echo "✗ umbrel-app.yml missing!"
fi

# Network connectivity
echo ""
echo "Checking network connectivity:"

# Check Bitcoin connectivity
if [ -n "$BTC_RPC_HOST" ]; then
  echo "Bitcoin RPC host: $BTC_RPC_HOST"
  if ping -c 1 $BTC_RPC_HOST &> /dev/null; then
    echo "✓ Can ping Bitcoin RPC host"
  else
    echo "✗ Cannot ping Bitcoin RPC host"
  fi
else
  echo "✗ BTC_RPC_HOST not set"
fi

# Check Ordinals connectivity
if [ -n "$ORD_RPC_HOST" ]; then
  echo "Ordinals RPC host: $ORD_RPC_HOST"
  if ping -c 1 $ORD_RPC_HOST &> /dev/null; then
    echo "✓ Can ping Ordinals RPC host"
  else
    echo "✗ Cannot ping Ordinals RPC host"
  fi
else
  echo "✗ ORD_RPC_HOST not set"
fi

# Check environment variables
echo ""
echo "Checking environment variables:"
echo "PORT=$PORT"
echo "NODE_ENV=$NODE_ENV"
echo "USE_APP_PROXY=$USE_APP_PROXY"
echo "BTC_RPC_USER=$BTC_RPC_USER"
echo "BTC_RPC_HOST=$BTC_RPC_HOST"
echo "BTC_RPC_PORT=$BTC_RPC_PORT"
echo "ORD_RPC_HOST=$ORD_RPC_HOST"
echo "ORD_RPC_PORT=$ORD_RPC_PORT"
echo "APP_BITCOIN_NODE_IP=$APP_BITCOIN_NODE_IP"

# Check Docker
echo ""
echo "Checking Docker installation:"

if command -v docker &> /dev/null; then
  echo "✓ Docker is installed"
  
  # Check container names (useful for debugging)
  echo ""
  echo "Checking for Umbrel containers:"
  docker ps | grep -E "ord|bitcoin|app_proxy" || echo "No Umbrel containers found"
else
  echo "✗ Docker is not installed or not in PATH"
fi

# Check docker-compose
if command -v docker-compose &> /dev/null; then
  echo "✓ docker-compose is installed"
else
  echo "✗ docker-compose is not installed or not in PATH"
fi

echo ""
echo "=== End of diagnostic report ==="
echo "Copy this output when reporting installation issues"