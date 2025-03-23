#!/bin/bash

# This is the container startup script
echo "Found application at /app/dist/index.js"
echo "Starting application in offline mode..."
echo "- Port: $PORT"
echo "- Container Name: $ORD_CONTAINER_NAME"
echo "- Ordinals Node IP: $ORD_NODE_IP"
echo "Using the following configuration:"
echo ""

# Print network interfaces without using 'ip' command
echo "Network interfaces:"
cat /proc/net/dev | grep -v lo | awk '{print $1}' | grep -v face

# Create the cache directory if it doesn't exist
mkdir -p /app/cache

echo "Running with simplified configuration"
echo "Starting Ordinarinos Inscription Tool..."

# Start the application
node /app/dist/index.js