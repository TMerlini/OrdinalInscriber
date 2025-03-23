#!/bin/sh

# Very simple startup script
echo "Starting Ordinarinos Inscription Tool..."
echo "- Port: $PORT"
echo "- Container Name: $ORD_CONTAINER_NAME"
echo "- Ordinals Node IP: $ORD_NODE_IP"

# Create the cache directory if it doesn't exist
mkdir -p /app/cache

# Start the application
exec node /app/dist/index.js