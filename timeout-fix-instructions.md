# Fixing "Timeout starting server" Error

This document provides step-by-step instructions for resolving the "Timeout starting server" error in the Ordinarinos Inscription Tool.

## Understanding the Problem

The error occurs when the application tries to start the Ordinals server for inscription but fails to establish a connection within the default timeout period. This can happen for several reasons:

1. Network connectivity issues between containers
2. Insufficient timeout settings
3. Permission issues with Docker sockets
4. Container name mismatches
5. Resource constraints on the Ordinals container

## Solution Steps

### Step 1: Apply the Updated Configuration

1. Stop the current container:
   ```bash
   docker-compose down
   ```

2. Make sure you're using the updated `docker-compose.yml` file with the extended timeout settings.

3. Start the container with the new settings:
   ```bash
   docker-compose up -d
   ```

### Step 2: Test Direct Connectivity

1. Make the test script executable:
   ```bash
   chmod +x test-connectivity.sh
   ```

2. Run the connectivity test:
   ```bash
   ./test-connectivity.sh
   ```

3. Note any failures in the test output to identify which connections are problematic.

### Step 3: Check Container Logs

1. Check the logs from the Ordinarinos container:
   ```bash
   docker-compose logs ordinarinos
   ```

2. Look for specific error messages related to connection timeouts or server startup issues.

### Step 4: Enable Shell Access in Ordinals Container

If the direct connection isn't working, it might be a permission issue with executing commands in the Ordinals container. Try these additional settings:

1. Update the `docker-compose.yml` file to add Docker socket access:
   ```yaml
   volumes:
     - ./cache:/app/cache
     - /var/run/docker.sock:/var/run/docker.sock
   ```

2. Restart the container with the new settings:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

### Step 5: Try Alternative Connection Methods

If direct connection is still failing, try these alternatives:

1. **Direct Terminal Connection:**
   ```bash
   docker exec -it ordinals_ord_1 ord wallet inscribe --fee-rate 10 --file /path/to/file.png
   ```

2. **Without Docker Socket:**
   Update the following environment variables in `docker-compose.yml`:
   ```yaml
   - DIRECT_CONNECT=false
   - USE_API_ONLY=true
   ```

### Step 6: Resource Constraints Check

1. Check if your Ordinals container has sufficient resources:
   ```bash
   docker stats ordinals_ord_1
   ```

2. If CPU or memory usage is consistently high, consider adding resource limits to the Ordinals container.

## Advanced Troubleshooting

### Using Alternative Shell Command Execution

Create a file named `ordinals-command-wrapper.sh` with the following content:

```bash
#!/bin/bash
docker exec -i ordinals_ord_1 ord wallet inscribe --fee-rate 10 --file "$1" --output "$2"
```

Make it executable:
```bash
chmod +x ordinals-command-wrapper.sh
```

Then update your `docker-compose.yml` with:
```yaml
- USE_SHELL_WRAPPER=true
- SHELL_WRAPPER_PATH=/path/to/ordinals-command-wrapper.sh
```

### Check for Network Issues

If still having issues, try:
1. Running a network connectivity check between the containers
2. Ensuring both containers are on the same Docker network
3. Checking for firewall rules that might be blocking container communication

## Still Having Issues?

If these steps don't resolve the issue, please check the application logs for specific error messages and consider:
1. Reviewing the Ordinals node logs for any errors
2. Verifying that your Ordinals node is fully synced
3. Checking if your Bitcoin node is accessible and fully synced
4. Confirming that all container names match exactly what's in your configuration 