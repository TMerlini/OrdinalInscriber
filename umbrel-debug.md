# Umbrel Deployment Troubleshooting Guide

## Container Restart Issues

If your container keeps restarting, follow these steps:

1. SSH into your Umbrel machine

2. Check container logs:
   ```
   docker logs ordinarinos-inscription-tool
   ```

3. Check if the start.sh script is correct:
   ```
   docker exec -it ordinarinos-inscription-tool cat /app/start.sh
   ```
   It should be extremely simple and contain only:
   ```
   #!/bin/sh
   # Ultra minimal startup script with no dependencies
   mkdir -p /app/cache
   echo "Starting Ordinarinos Inscription Tool..."
   node /app/dist/index.js
   ```

4. If the script is different, you can update it manually:
   ```
   docker exec -it ordinarinos-inscription-tool sh -c "echo '#!/bin/sh
   # Ultra minimal startup script with no dependencies
   mkdir -p /app/cache
   echo \"Starting Ordinarinos Inscription Tool...\"
   node /app/dist/index.js' > /app/start.sh && chmod +x /app/start.sh"
   ```

5. Restart the container:
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