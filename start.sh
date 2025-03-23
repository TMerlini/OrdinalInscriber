#!/bin/sh
# Ultra minimal startup script with no dependencies
mkdir -p /app/cache
chmod 777 /app/cache

# Export environment variables with consistent port settings
export PORT=3500
export NODE_ENV=production

echo "Starting Ordinarinos Inscription Tool..."
echo "Service will be available at port 3500"
node /app/dist/index.js