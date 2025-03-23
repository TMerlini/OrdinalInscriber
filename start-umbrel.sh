#!/bin/sh
# Ultra minimal startup script for Umbrel with no dependencies
mkdir -p /app/cache
chmod 777 /app/cache

# Export environment variables
export USE_SIMPLIFIED_STARTUP=true
export ORD_NODE_IP=ordinals_ord_1
export PORT=3500
export NODE_ENV=production 

echo "Starting Ordinarinos Inscription Tool for Umbrel..."
node /app/dist/index.js