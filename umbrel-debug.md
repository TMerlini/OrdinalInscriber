# Ordinarinos on Umbrel - Debugging Guide

This document provides troubleshooting steps for running Ordinarinos on Umbrel.

## Checking Service Connectivity

If you're encountering issues with your Ordinarinos installation on Umbrel, first verify that the application can connect to the required services:

1. **Check Bitcoin Core connectivity**:
   ```
   docker exec -it ordinarinos-inscriptions curl -s --data-binary '{"jsonrpc":"1.0","id":"check","method":"getblockchaininfo","params":[]}' -H 'content-type:text/plain;' http://$BTC_RPC_USER:$BTC_RPC_PASSWORD@bitcoin.embassy:8332/
   ```

2. **Check Ord connectivity** (try both endpoints):
   ```
   # First try the status endpoint
   docker exec -it ordinarinos-inscriptions curl -s http://ordinals_ord_1:80/status
   
   # If that fails, try the root endpoint
   docker exec -it ordinarinos-inscriptions curl -s http://ordinals_ord_1:80/
   ```

## Log Access

To view the live logs from the Ordinarinos container:
```
docker logs -f ordinarinos-inscriptions
```

## Configuration Check

Verify your environment variables are set correctly:
```
docker exec -it ordinarinos-inscriptions env | grep -E 'BTC_|ORD_'
```

## Checking Network Connectivity

Verify the Docker network configuration:
```
docker network inspect embassy
```

## Common Issues

### 1. Cannot connect to Bitcoin Core or Ord
- Ensure that both Bitcoin Core and Ord are running in your Umbrel node
- Check that the port mappings are correct in docker-compose.umbrel.yml
- Verify that Bitcoin Core has RPC enabled
- If using the newer Umbrel, make sure the Ord container name is correct (usually `ordinals_ord_1` not `ord`)

### 2. Application starts but shows errors
- Check the application logs for specific error messages
- Verify that the environment variables are set correctly
- Ensure that the application has appropriate permissions for the data directory

### 3. Wallet connection issues
- Make sure you're using a compatible Bitcoin wallet in your browser
- Check for any CORS-related errors in your browser's console
- Try connecting with a different wallet

### 4. SNS (Sats Names Service) relay issues
- If the SNS name registration feature shows "Service Degraded" or similar warnings:
  
  1. Check the relay service status:
     ```
     curl http://localhost:3500/api/sns/status
     ```
  
  2. A degraded status response indicates connectivity issues with the SNS relay:
     ```json
     {
       "status": "degraded",
       "message": "Relay service is currently unavailable. Some features may be limited.",
       "fallback": true,
       "version": "unknown (relay unavailable)",
       "names_count": 0
     }
     ```
  
  3. Verify network connectivity to the relay service:
     ```
     docker exec -it ordinarinos-inscriptions ping relay.satsnames.network
     docker exec -it ordinarinos-inscriptions curl -I https://relay.satsnames.network
     ```
  
  4. Common causes of relay connectivity issues:
     - Temporary relay service outage (try again later)
     - Firewall blocking WebSocket connections
     - DNS resolution issues
     - Internet connectivity problems
  
  5. The application is designed to work in degraded mode when the relay is unavailable:
     - Name availability checks will show approximate results
     - Registration transactions will not be generated
     - Fee estimations will still be available

### 5. BRC-20 and Bitmap Functionality Issues
- These features require direct communication with the Ord node API
- Make sure your Ord node is synced and running properly
- Check that the container name and port settings match your Umbrel setup
- For the latest Umbrel version, the default Ord container is `ordinals_ord_1` on port 80

### 6. Container Name Detection
- The application now has enhanced container name detection for both Bitcoin and Ord containers
- The startup script automatically tries multiple container names when the default one fails
- For Bitcoin, it tries: `bitcoin_bitcoind_1`, `bitcoin-1`, and `bitcoin`
- For Ord, it tries: `ordinals_ord_1`, `ord-1`, and `ord`
- You can check which container was detected by visiting the application's help page

### 7. Using Umbrel's APP_BITCOIN_NODE_IP
- For Umbrel OS 1.0.0+, the application uses the `APP_BITCOIN_NODE_IP` environment variable
- This variable is automatically set by Umbrel and provides the correct IP for the Bitcoin node
- If you're having issues with Bitcoin connectivity, check if this variable is set correctly:
  ```
  docker exec -it ordinarinos-inscriptions printenv | grep APP_BITCOIN_NODE_IP
  ```

## Reinstalling

If you need to reinstall the application:

1. Remove the existing container:
   ```
   docker stop ordinarinos-inscriptions
   docker rm ordinarinos-inscriptions
   ```

2. Delete the data directory:
   ```
   rm -rf /home/umbrel/umbrel/app-data/ordinarinos-inscriptions/data
   ```

3. Reinstall from the Umbrel app store

## Diagnostic Tool

Ordinarinos includes a built-in diagnostic tool that can help identify and resolve common installation issues:

```bash
# Run the diagnostic tool in the Docker container
docker exec -it ordinarinos-inscriptions /usr/local/bin/start-umbrel.sh --diagnose
```

This tool will check:
- Proper icon placement for app store visibility
- Configuration of manifest files
- Network connectivity to Bitcoin and Ord containers
- Environment variables
- Docker and Docker Compose installation

## Diagnostic Tool

Ordinarinos includes a built-in diagnostic tool that can help identify and resolve common installation issues:

```bash
# Run the diagnostic tool in the Docker container
docker exec -it ordinarinos-inscriptions /usr/local/bin/start-umbrel.sh --diagnose
```

This tool will check:
- Proper icon placement for app store visibility
- Configuration of manifest files
- Network connectivity to Bitcoin and Ord containers
- Environment variables
- Docker and Docker Compose installation

## Support

For additional support, please open an issue on our GitHub repository.

### 6. Container Name Detection
- The application now has enhanced container name detection for both Bitcoin and Ord containers
- The startup script automatically tries multiple container names when the default one fails
- For Bitcoin, it tries: `bitcoin_bitcoind_1`, `bitcoin-1`, and `bitcoin`
- For Ord, it tries: `ordinals_ord_1`, `ord-1`, and `ord`
- You can check which container was detected by visiting the application's help page

### 7. Using Umbrel's APP_BITCOIN_NODE_IP
- For Umbrel OS 1.0.0+, the application uses the `APP_BITCOIN_NODE_IP` environment variable
- This variable is automatically set by Umbrel and provides the correct IP for the Bitcoin node
- If you're having issues with Bitcoin connectivity, check if this variable is set correctly:
  ```
  docker exec -it ordinarinos-inscriptions printenv | grep APP_BITCOIN_NODE_IP
  ```

### 8. Ordinals App Proxy
- Umbrel uses an app-proxy container (`ordinals_app_proxy_1`) that sits in front of the Ord container
- This proxy handles routing and access control for the ordinals application
- The application now supports connecting through either the direct Ord container or via the app proxy
- If you're having connectivity issues with the Ord container, try using the app proxy instead
  ```
  # Set environment variable to use app proxy
  docker exec -it ordinarinos-inscriptions env USE_APP_PROXY=true
  ```
- The app proxy typically runs on port 4000 instead of the default Ord port 80
- The application automatically detects and adapts to the proxy configuration
