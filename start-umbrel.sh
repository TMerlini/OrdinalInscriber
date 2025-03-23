#!/bin/sh
# Ultra minimal startup script specifically for Umbrel with no dependencies
mkdir -p /app/cache
chmod 777 /app/cache
echo "Starting Ordinarinos with completely simplified mode..."
# Set environment variable to tell app to use simplified mode
export USE_SIMPLIFIED_STARTUP=true
node /app/dist/index.js