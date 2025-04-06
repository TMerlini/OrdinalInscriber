#!/bin/bash

# Ordinarinos Umbrel Startup Script

# Check for diagnostic mode
if [ "$1" = "--diagnose" ] || [ "$1" = "-d" ]; then
  echo "Running in diagnostic mode"
  /usr/local/bin/umbrel-test.sh
  exit 0
fi

# Set APP_BITCOIN_NODE_IP from environment or use default
if [ -z "$APP_BITCOIN_NODE_IP" ]; then
  echo "APP_BITCOIN_NODE_IP not set, using default bitcoin.embassy"
  BTC_RPC_HOST="${BTC_RPC_HOST:-bitcoin.embassy}"
else
  echo "Using APP_BITCOIN_NODE_IP: $APP_BITCOIN_NODE_IP"
  # Override BTC_RPC_HOST with APP_BITCOIN_NODE_IP if it's provided
  export BTC_RPC_HOST="$APP_BITCOIN_NODE_IP"
fi

# Print environment (without sensitive data)
echo "Starting Ordinarinos in Umbrel environment"
echo "----------------------------------------"
echo "App: Ordinarinos Inscription Tool"
echo "Version: 1.0.0"
echo "Repository: https://github.com/TMerlini/OrdinalInscriber"
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
  # Avoid using jq which might not be installed in all environments
  BTC_CHECK=$(curl -s -m 5 --data-binary '{"jsonrpc":"1.0","id":"check","method":"getblockchaininfo","params":[]}' -H 'content-type:text/plain;' http://$BTC_RPC_USER:$BTC_RPC_PASSWORD@$BTC_RPC_HOST:$BTC_RPC_PORT/)
  
  if [[ "$BTC_CHECK" == *"\"error\":null"* ]]; then
    echo "Bitcoin Core connection successful"
    export BTC_SERVER_AVAILABLE=true
  else
    echo "Bitcoin Core connection failed with default host, trying alternatives..."
    
    # Try alternative Bitcoin node names if the default fails
    ALTERNATIVE_HOSTS=("bitcoin_bitcoind_1" "bitcoin-1" "bitcoin")
    for ALT_HOST in "${ALTERNATIVE_HOSTS[@]}"; do
      if [ "$ALT_HOST" != "$BTC_RPC_HOST" ]; then
        echo "Trying alternative Bitcoin host: $ALT_HOST"
        ALT_BTC_CHECK=$(curl -s -m 5 --data-binary '{"jsonrpc":"1.0","id":"check","method":"getblockchaininfo","params":[]}' -H 'content-type:text/plain;' http://$BTC_RPC_USER:$BTC_RPC_PASSWORD@$ALT_HOST:$BTC_RPC_PORT/)
        
        if [[ "$ALT_BTC_CHECK" == *"\"error\":null"* ]]; then
          echo "Bitcoin Core connection successful with $ALT_HOST"
          export BTC_RPC_HOST="$ALT_HOST"
          export BTC_SERVER_AVAILABLE=true
          break
        fi
      fi
    done
    
    if [ "$BTC_SERVER_AVAILABLE" != "true" ]; then
      echo "Bitcoin Core connection failed on all hosts"
      export BTC_SERVER_AVAILABLE=false
    fi
  fi
  
  echo "Checking Ord connectivity..."
  ORD_CHECK=$(curl -s -m 5 --fail http://$ORD_RPC_HOST:$ORD_RPC_PORT/ 2>/dev/null || echo "failed")
  
  if [ "$ORD_CHECK" != "failed" ]; then
    echo "Ord connection successful"
    export ORD_SERVER_AVAILABLE=true
  else
    echo "Ord connection failed, trying alternate endpoint..."
    ORD_CHECK=$(curl -s -m 5 --fail http://$ORD_RPC_HOST:$ORD_RPC_PORT/status 2>/dev/null || echo "failed")
    
    if [ "$ORD_CHECK" != "failed" ]; then
      echo "Ord connection successful via /status endpoint"
      export ORD_SERVER_AVAILABLE=true
    else
      echo "Trying alternative Ordinals hosts..."
      
      # Try alternative Ordinals node names
      ALTERNATIVE_ORD_HOSTS=("ordinals_ord_1" "ordinals_app_proxy_1" "ord-1" "ord")
      for ALT_ORD_HOST in "${ALTERNATIVE_ORD_HOSTS[@]}"; do
        if [ "$ALT_ORD_HOST" != "$ORD_RPC_HOST" ]; then
          echo "Trying alternative Ord host: $ALT_ORD_HOST"
          ALT_ORD_CHECK=$(curl -s -m 5 --fail http://$ALT_ORD_HOST:$ORD_RPC_PORT/ 2>/dev/null || echo "failed")
          
          if [ "$ALT_ORD_CHECK" != "failed" ]; then
            echo "Ord connection successful with $ALT_ORD_HOST"
            export ORD_RPC_HOST="$ALT_ORD_HOST"
            export ORD_SERVER_AVAILABLE=true
            break
          else
            # Try the /status endpoint as well
            ALT_ORD_CHECK=$(curl -s -m 5 --fail http://$ALT_ORD_HOST:$ORD_RPC_PORT/status 2>/dev/null || echo "failed")
            if [ "$ALT_ORD_CHECK" != "failed" ]; then
              echo "Ord connection successful with $ALT_ORD_HOST via /status endpoint"
              export ORD_RPC_HOST="$ALT_ORD_HOST"
              export ORD_SERVER_AVAILABLE=true
              break
            fi
            
            # If this is the app_proxy, try port 4000 which is commonly used for it
            if [ "$ALT_ORD_HOST" = "ordinals_app_proxy_1" ]; then
              echo "Trying app_proxy on port 4000..."
              APP_PROXY_CHECK=$(curl -s -m 5 --fail http://$ALT_ORD_HOST:4000/ 2>/dev/null || echo "failed")
              if [ "$APP_PROXY_CHECK" != "failed" ]; then
                echo "App proxy connection successful on port 4000"
                export ORD_RPC_HOST="$ALT_ORD_HOST"
                export ORD_RPC_PORT="4000"
                export ORD_SERVER_AVAILABLE=true
                export USE_APP_PROXY=true
                break
              fi
            fi
          fi
        fi
      done
      
      if [ "$ORD_SERVER_AVAILABLE" != "true" ]; then
        echo "Ord connection failed on all hosts. Please check Ord container status."
        export ORD_SERVER_AVAILABLE=false
      fi
    fi
  fi
else
  echo "Direct connection disabled"
  export BTC_SERVER_AVAILABLE=false
  export ORD_SERVER_AVAILABLE=false
fi

# Print detected configuration
echo "----------------------------------------"
echo "Detected configuration:"
echo "BTC_RPC_HOST: $BTC_RPC_HOST"
echo "ORD_RPC_HOST: $ORD_RPC_HOST"
echo "ORD_RPC_PORT: $ORD_RPC_PORT"
echo "BTC_SERVER_AVAILABLE: $BTC_SERVER_AVAILABLE"
echo "ORD_SERVER_AVAILABLE: $ORD_SERVER_AVAILABLE"
if [ "$USE_APP_PROXY" = "true" ]; then
  echo "USING APP PROXY: yes"
fi
echo "----------------------------------------"

# Ensure the ord data directory exists with proper permissions
echo "Setting up data directories..."
mkdir -p /ord/data
chmod 755 /ord/data

# Start the application
echo "Starting Ordinarinos..."
cd /app
node dist/server/index.js