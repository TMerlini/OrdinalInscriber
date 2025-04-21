#!/bin/bash

echo "===== Ordinarinos Timeout Fix Patch ====="
echo "This script will patch the server code to bypass the problematic web server."

# Correct container name based on docker ps output
CONTAINER_NAME="ordinalinscriber-ordinarinos-1"

# Find the cmd-executor.js file
echo "Searching for cmd-executor.js in container $CONTAINER_NAME..."
CMD_EXECUTOR_PATH=$(docker exec -it $CONTAINER_NAME find /app -name cmd-executor.js 2>/dev/null)

if [ -z "$CMD_EXECUTOR_PATH" ]; then
  echo "Trying deeper search..."
  CMD_EXECUTOR_PATH=$(docker exec -it $CONTAINER_NAME find / -name cmd-executor.js 2>/dev/null | grep -v "permission denied" | head -1)
  
  if [ -z "$CMD_EXECUTOR_PATH" ]; then
    echo "Error: Could not find cmd-executor.js in container"
    echo "Let's check what files are in the app directory..."
    docker exec -it $CONTAINER_NAME ls -la /app
    docker exec -it $CONTAINER_NAME ls -la /app/dist/server 2>/dev/null
    echo "Failing, but will try a direct approach to locate code files..."
    exit 1
  fi
fi

echo "Found in container at: $CMD_EXECUTOR_PATH"

# Create a backup of the original file
echo "Creating backup..."
docker exec -it $CONTAINER_NAME cp "$CMD_EXECUTOR_PATH" "${CMD_EXECUTOR_PATH}.backup"

# Patch the cmd-executor.js file
echo "Patching cmd-executor.js..."

# Create a temporary patch file
cat > /tmp/webserver-patch.js << 'EOF'
export async function startWebServer(directory, port = 8000) {
  console.log('PATCHED: Web server startup bypassed');
  return {
    error: false,
    output: 'PATCHED: Mock web server started (not actually running)'
  };
}
EOF

# Copy patch file to container
docker cp /tmp/webserver-patch.js $CONTAINER_NAME:/tmp/

# Use sed to replace the startWebServer function with our patched version
docker exec -it $CONTAINER_NAME bash -c "sed -i '/export async function startWebServer/,/^}/c\\$(cat /tmp/webserver-patch.js)' $CMD_EXECUTOR_PATH"

echo "Verifying patch..."
PATCH_CHECK=$(docker exec -it $CONTAINER_NAME grep "PATCHED: Web server startup bypassed" "$CMD_EXECUTOR_PATH")

if [ -n "$PATCH_CHECK" ]; then
  echo "✅ Patch successful!"
else
  echo "❌ Patch failed. Restoring backup..."
  docker exec -it $CONTAINER_NAME cp "${CMD_EXECUTOR_PATH}.backup" "$CMD_EXECUTOR_PATH"
  
  echo "Trying alternative patching method..."
  # Create a simple JS file to inject our replacement function
  cat > /tmp/replace-function.js << 'EOF'
const fs = require('fs');
const path = process.argv[2];
const content = fs.readFileSync(path, 'utf8');
const replaced = content.replace(
  /export async function startWebServer[\s\S]*?function checkServerUp\(\)[\s\S]*?}\s*}\s*}\s*}/m,
  `export async function startWebServer(directory, port = 8000) {
  console.log('PATCHED: Web server startup bypassed');
  return {
    error: false,
    output: 'PATCHED: Mock web server started (not actually running)'
  };
}`
);
fs.writeFileSync(path, replaced, 'utf8');
console.log('Replacement complete');
EOF

  # Copy the script to the container
  docker cp /tmp/replace-function.js $CONTAINER_NAME:/tmp/
  
  # Install Node.js if needed and run the script
  docker exec -it $CONTAINER_NAME bash -c "type node >/dev/null 2>&1 || (apt-get update && apt-get install -y nodejs)"
  docker exec -it $CONTAINER_NAME bash -c "node /tmp/replace-function.js $CMD_EXECUTOR_PATH"
  
  # Check again
  PATCH_CHECK=$(docker exec -it $CONTAINER_NAME grep "PATCHED: Web server startup bypassed" "$CMD_EXECUTOR_PATH")
  if [ -n "$PATCH_CHECK" ]; then
    echo "✅ Patch successful with alternative method!"
  else
    echo "❌ Both patch methods failed. Please try manual patching."
    exit 1
  fi
fi

# Restart the container to apply changes
echo "Restarting container to apply changes..."
docker restart $CONTAINER_NAME

echo "===== Patch Complete ====="
echo "The app should now be able to bypass the web server timeout issue."
echo "If you still experience problems, please check the logs with:"
echo "docker logs $CONTAINER_NAME" 