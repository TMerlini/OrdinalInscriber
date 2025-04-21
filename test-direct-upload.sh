#!/bin/bash

echo "===== Direct Upload Test ====="
echo "This script will try to directly upload a test image to the Ordinals container."

# Container names
ORD_CONTAINER="ordinals_ord_1"
ORDINARINOS_CONTAINER="ordinalinscriber-ordinarinos-1"

# Create a test image
echo "Creating a test image..."
cat > /tmp/test-image.txt << 'EOF'
This is a test file for inscription.
EOF

echo "Checking if the Ordinals container has a data directory..."
ORD_DATA_DIR=$(sudo docker exec $ORD_CONTAINER find / -type d -name "data" 2>/dev/null | head -1)
echo "Found data directory: $ORD_DATA_DIR"

if [ -z "$ORD_DATA_DIR" ]; then
  echo "No data directory found, using /ord/data as default"
  ORD_DATA_DIR="/ord/data"
fi

# Copy the test file directly to the Ord container
echo "Copying test file directly to the Ordinals container..."
sudo docker cp /tmp/test-image.txt $ORD_CONTAINER:${ORD_DATA_DIR}/test-image.txt

# Check if the file was copied successfully
echo "Verifying file copy..."
sudo docker exec $ORD_CONTAINER ls -l ${ORD_DATA_DIR}/test-image.txt

if [ $? -eq 0 ]; then
  echo "Test file successfully copied to Ordinals container!"
  
  # Try a direct inscription command
  echo "Testing direct inscription command..."
  COMMAND="ord wallet inscribe --fee-rate 10 --file ${ORD_DATA_DIR}/test-image.txt"
  sudo docker exec $ORD_CONTAINER bash -c "echo 'Command to be executed: $COMMAND'"
  
  echo "Would you like to execute this command directly? (y/n)"
  read -r response
  
  if [[ "$response" =~ ^[Yy]$ ]]; then
    echo "Executing inscription command..."
    sudo docker exec $ORD_CONTAINER bash -c "$COMMAND"
  else
    echo "Command not executed."
  fi
else
  echo "Failed to copy test file to Ordinals container."
fi

echo ""
echo "===== Bypassing Ordinarinos ====="
echo "This test demonstrates a way to bypass the Ordinarinos app completely"
echo "by directly interacting with the Ord container."
echo ""
echo "You can use this method as a workaround if you continue to have issues with"
echo "the Timeout starting server error in Ordinarinos." 