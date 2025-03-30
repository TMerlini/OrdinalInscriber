# Ordinarinos on Umbrel - Debugging Guide

This document provides troubleshooting steps for running Ordinarinos on Umbrel.

## Checking Service Connectivity

If you're encountering issues with your Ordinarinos installation on Umbrel, first verify that the application can connect to the required services:

1. **Check Bitcoin Core connectivity**:
   ```
   docker exec -it ordinarinos curl -s --data-binary '{"jsonrpc":"1.0","id":"check","method":"getblockchaininfo","params":[]}' -H 'content-type:text/plain;' http://$BTC_RPC_USER:$BTC_RPC_PASSWORD@bitcoin.embassy:8332/
   ```

2. **Check Ord connectivity**:
   ```
   docker exec -it ordinarinos curl -s http://ord.embassy:8080/status
   ```

## Log Access

To view the live logs from the Ordinarinos container:
```
docker logs -f ordinarinos
```

## Configuration Check

Verify your environment variables are set correctly:
```
docker exec -it ordinarinos env | grep -E 'BTC_|ORD_'
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
     docker exec -it ordinarinos ping relay.satsnames.network
     docker exec -it ordinarinos curl -I https://relay.satsnames.network
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

## Reinstalling

If you need to reinstall the application:

1. Remove the existing container:
   ```
   docker stop ordinarinos
   docker rm ordinarinos
   ```

2. Delete the data directory:
   ```
   rm -rf /home/umbrel/umbrel/app-data/ordinarinos/data
   ```

3. Reinstall from the Umbrel app store

## Support

For additional support, please open an issue on our GitHub repository.