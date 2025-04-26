#!/bin/bash

echo "===== Ordinal Inscriber FORCED Umbrel Mode Fix ====="
echo "This script will completely disable the HTTP server component and force direct container access."
echo ""

# Create .env file with aggressive settings
cat > .env << EOF
# FORCE UMBREL MODE - Completely bypass HTTP server
DIRECT_CONNECT=true
BTC_SERVER_AVAILABLE=true
ORD_SERVER_AVAILABLE=true
DISABLE_WEBSERVER=true
SKIP_HTTP_SERVER=true
BYPASS_SERVER_START=true
NO_START_SERVER=true
FORCE_UMBREL_MODE=true

# Increase timeouts
SCRIPT_TIMEOUT=180000
DOCKER_OPERATION_TIMEOUT=180000
API_TIMEOUT=180000

# Disable image optimization by default
DEFAULT_IMAGE_OPTIMIZATION=false
EOF

echo "✅ Forced Umbrel mode configured in .env file."

# Try to identify the container
echo "Looking for Ord container..."
containers=("ord" "ordinals_ord_1" "ord-server" "bitcoin-ordinals" "umbrel-bitcoin-ordinals" "ordinals_app_proxy_1")
  
for container in "${containers[@]}"; do
  if docker ps 2>/dev/null | grep -q $container; then
    echo "✅ Found container: $container"
    
    # Create container info file
    echo "ORD_CONTAINER=${container}" > container_config.txt
    break
  fi
done

# Create a client-side config override file
cat > client-config.js << EOF
// Force Umbrel mode and disable timeouts
window.FORCE_UMBREL_MODE = true;
window.DISABLE_HTTP_SERVER = true;
window.USE_DIRECT_COPY = true;
window.EXTENDED_TIMEOUT = 180000;
console.log("⚠️ Forced Umbrel mode and direct copy enabled by config override");
EOF

echo "✅ Client configuration override created."

# Create a patch instruction file
cat > IMPORTANT_READ_ME.txt << EOF
TIMEOUT FIX INSTRUCTIONS

If you're still experiencing timeout errors:

1. Make sure to restart the Ordinal Inscriber application completely.

2. For single file inscriptions:
   - Disable image optimization
   - Try smaller files first (under 5MB)

3. For multiple files:
   - Use batch mode with "Auto-Execute: OFF"
   - This will copy files to the container but let you run the inscription command manually

4. Use the direct Docker commands if needed:
   - To copy files: docker cp your_file.jpg ord:/ord/data/
   - To inscribe: docker exec -it ord ord wallet inscribe --fee-rate 10 --file /ord/data/your_file.jpg

5. If the container name isn't "ord", replace it with your actual container name.
EOF

echo "✅ Instructions file created."

echo ""
echo "===== Fix Applied ====="
echo ""
echo "IMPORTANT: You MUST RESTART the Ordinal Inscriber application for these changes to take effect."
echo ""
echo "If you're STILL experiencing timeout issues after restart, try the following:"
echo "1. Use batch mode with Auto-Execute OFF"
echo "2. Try smaller files (under 5MB)"
echo "3. Use direct Docker commands (see IMPORTANT_READ_ME.txt)"
echo ""
echo "The application should now bypass all web server components." 