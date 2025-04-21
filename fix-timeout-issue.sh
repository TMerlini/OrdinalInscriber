#!/bin/bash

echo "===== Ordinal Inscriber Timeout Fix Script ====="
echo "This script will help fix timeout issues when inscribing files."
echo ""

# Function to check if docker is installed
check_docker() {
  echo "Checking for Docker..."
  if command -v docker &> /dev/null; then
    echo "✅ Docker found!"
    return 0
  else
    echo "❌ Docker not found. Please install Docker first."
    exit 1
  fi
}

# Function to find and check ord container
find_ord_container() {
  echo "Checking for Ord container..."
  
  # Try different common container names
  containers=("ord" "ordinals_ord_1" "ord-server" "bitcoin-ordinals" "umbrel-bitcoin-ordinals" "ordinals_app_proxy_1")
  
  for container in "${containers[@]}"; do
    if docker ps | grep -q $container; then
      echo "✅ Found container: $container"
      ORD_CONTAINER=$container
      return 0
    fi
  done
  
  echo "❌ No Ord container found running. Please start your Ord node."
  return 1
}

# Function to check if file copy works
test_file_copy() {
  echo "Testing file copying to container..."
  
  # Create a small test file
  echo "This is a test file for Ordinal Inscriber" > test-ordinal-file.txt
  
  # Try to copy to container
  if docker cp test-ordinal-file.txt $ORD_CONTAINER:/ord/data/test-ordinal-file.txt; then
    echo "✅ File copy test successful!"
    COPY_WORKS=true
  else
    echo "❌ File copy failed."
    COPY_WORKS=false
  fi
  
  # Clean up
  rm test-ordinal-file.txt
}

# Function to set environment variables
set_environment_vars() {
  echo "Setting environment variables to optimize performance..."
  
  # Create or update .env file
  cat > .env << EOF
# Environment settings to avoid timeout errors
DIRECT_CONNECT=true
BTC_SERVER_AVAILABLE=true
ORD_SERVER_AVAILABLE=true
DISABLE_WEBSERVER=true
SKIP_HTTP_SERVER=true

# Increase timeouts
SCRIPT_TIMEOUT=120000
DOCKER_OPERATION_TIMEOUT=120000

# Optimization settings
DEFAULT_IMAGE_OPTIMIZATION=false
EOF

  echo "✅ Environment variables set in .env file."
}

# Main script execution
check_docker
find_ord_container
test_file_copy
set_environment_vars

echo ""
echo "===== Timeout Fix Setup Complete ====="
echo ""
echo "Changes made:"
echo "1. Environment variables configured for direct container access"
echo "2. Default timeouts increased to 120 seconds"
echo "3. Default image optimization disabled (can still be enabled per file)"
echo ""
echo "Next steps:"
echo "1. Restart the Ordinal Inscriber application"
echo "2. For large files, use batch mode and disable image optimization"
echo "3. If you're still experiencing timeout issues, try splitting your work into smaller batches"
echo ""
echo "Happy inscribing!" 