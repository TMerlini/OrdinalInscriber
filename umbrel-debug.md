# Umbrel Deployment Troubleshooting Guide

## Container Restart Issues

If your container keeps restarting, follow these steps:

1. SSH into your Umbrel machine

2. Check container logs:
   ```
   docker logs ordinarinos-inscription-tool
   ```

3. **RECOMMENDED APPROACH**: Use the Umbrel-specific installation:
   
   We've created a special installation script for Umbrel that avoids all common issues:
   
   ```
   cd /path/to/extracted/release
   chmod +x umbrel-install.sh
   ./umbrel-install.sh
   ```
   
   This will:
   - Create a simplified startup script without any dependencies
   - Setup a specific Dockerfile.umbrel file
   - Use a custom docker-compose.umbrel.yml configuration
   - Set the USE_SIMPLIFIED_STARTUP environment variable

4. Alternatively, check if the start.sh script is correct:
   ```
   docker exec -it ordinarinos-inscription-tool cat /app/start.sh
   ```
   It should be extremely simple and contain only:
   ```
   #!/bin/sh
   # Ultra minimal startup script with no dependencies
   mkdir -p /app/cache
   chmod 777 /app/cache
   echo "Starting Ordinarinos with completely simplified mode..."
   export USE_SIMPLIFIED_STARTUP=true
   node /app/dist/index.js
   ```

5. If the script is different, you can update it manually:
   ```
   docker exec -it ordinarinos-inscription-tool sh -c "echo '#!/bin/sh
   # Ultra minimal startup script with no dependencies
   mkdir -p /app/cache
   chmod 777 /app/cache
   echo \"Starting Ordinarinos with completely simplified mode...\"
   export USE_SIMPLIFIED_STARTUP=true
   node /app/dist/index.js' > /app/start.sh && chmod +x /app/start.sh"
   ```

6. Restart the container:
   ```
   docker restart ordinarinos-inscription-tool
   ```

## Port Configuration

The application is configured to use port 3500 on your Umbrel system. Make sure no other application is using this port.

## Cache Directory

If you experience file upload issues, check if the cache directory exists and has proper permissions:

```
docker exec -it ordinarinos-inscription-tool ls -la /app/cache
```

If needed, fix permissions:
```
docker exec -it ordinarinos-inscription-tool chmod 777 /app/cache
```

## Container Network Access

Make sure the container can access the Ordinals node container (ordinals_ord_1) on your network. You can test this with:

```
docker exec -it ordinarinos-inscription-tool ping ordinals_ord_1
```

If this fails, check your Docker network configuration.

## Accessing the Web Interface

The application should be accessible via your browser at:

```
http://umbrel.local:3500
```

or

```
http://<your-umbrel-ip>:3500
```

If you're having trouble accessing the application:

1. Make sure the container is actually running:
   ```
   docker ps | grep ordinarinos-inscription-tool
   ```

2. Check if the application is serving on the correct port inside the container:
   ```
   docker exec -it ordinarinos-inscription-tool netstat -tulpn | grep 5000
   ```
   
   You should see something like:
   ```
   tcp        0      0 0.0.0.0:5000            0.0.0.0:*               LISTEN      1/node
   ```

3. Verify the port mapping:
   ```
   docker port ordinarinos-inscription-tool
   ```
   
   This should show:
   ```
   5000/tcp -> 0.0.0.0:3500
   ```

4. If all else fails, try accessing the application directly through the Docker network:
   ```
   curl http://localhost:3500
   ```
   
   If this works but your browser doesn't, it might be a network firewall issue.

5. Check the container logs for actual IP addresses it's serving on:
   ```
   docker logs ordinarinos-inscription-tool | grep "Application accessible at"
   ```
   
6. Use the built-in network diagnostics tool for comprehensive troubleshooting:
   ```
   curl -s http://localhost:3500/api/network/diagnostics | grep -v "^<!DOCTYPE" | grep -v "^<html"
   ```
   
   or in a web browser, navigate to:
   ```
   http://localhost:3500/api/network/diagnostics
   ```
   
   This will return detailed information about:
   - All network interfaces and their IP addresses
   - Container connectivity status
   - Docker host connectivity
   - Network mode and configuration
   - Selected IP address for connections