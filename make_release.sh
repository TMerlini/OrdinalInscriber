#!/bin/bash

# Stop on errors
set -e

echo "Building Ordinarinos Inscription Tool..."

# Verify port configuration consistency
echo "Verifying port configurations..."
STANDARD_PORT=$(grep -o "PORT=.*" start.sh | cut -d'=' -f2 || echo "")
UMBREL_PORT=$(grep -o "PORT=.*" start-umbrel.sh | cut -d'=' -f2 || echo "")
DOCKER_PORT=$(grep -o "\"[0-9]*:5000\"" docker-compose.yml | cut -d'"' -f2 | cut -d':' -f1 || echo "")
UMBREL_DOCKER_PORT=$(grep -o "\"[0-9]*:5000\"" docker-compose.umbrel.yml | cut -d'"' -f2 | cut -d':' -f1 || echo "")

if [ "$UMBREL_PORT" != "5000" ]; then
  echo "⚠️ Warning: Umbrel start script PORT should be 5000, found: $UMBREL_PORT"
  echo "Fixing Umbrel PORT configuration..."
  sed -i 's/PORT=.*/PORT=5000/g' start-umbrel.sh
fi

if [ "$UMBREL_DOCKER_PORT" != "3500" ]; then
  echo "⚠️ Warning: Umbrel docker-compose port mapping should be 3500:5000, found: $UMBREL_DOCKER_PORT:5000"
  echo "Fixing Umbrel docker-compose port mapping..."
  sed -i 's/"[0-9]*:5000"/"3500:5000"/g' docker-compose.umbrel.yml
fi

echo "Port configuration verified."

# Make sure we have the latest dependencies
npm ci

# Build the application
npm run build

# Create a release directory
mkdir -p release
rm -rf release/*

# Create cache directory with proper permissions
mkdir -p release/cache
chmod 777 release/cache

# Copy the necessary files
echo "Packaging files for release..."
cp -r dist release/
cp -r client/src/assets release/assets
cp package.json release/
cp package-lock.json release/
cp Dockerfile release/
cp docker-compose.yml release/
cp README.md release/
cp .gitignore release/
cp start.sh release/
cp umbrel-debug.md release/

# Add Umbrel-specific files
cp umbrel-install.sh release/
cp start-umbrel.sh release/
cp Dockerfile.umbrel release/
cp docker-compose.umbrel.yml release/

# Additional verification steps
echo "Performing final verification..."

# Ensure all critical files exist
REQUIRED_FILES=("dist/index.js" "Dockerfile" "docker-compose.yml" "Dockerfile.umbrel" "docker-compose.umbrel.yml" "umbrel-install.sh" "start-umbrel.sh")
for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "release/$file" ]; then
    echo "❌ Error: Missing required file in release package: $file"
    exit 1
  fi
done

# Verify that the networking diagnostics endpoint is included
if [ -f "release/dist/routes.js" ]; then
  if ! grep -q "checkNetworkConnectivity" "release/dist/routes.js" && ! grep -q "/api/network/diagnostics" "release/dist/routes.js"; then
    echo "⚠️ Warning: Network diagnostics endpoint may be missing in the build."
  fi
elif [ -f "release/dist/routes.mjs" ]; then
  if ! grep -q "checkNetworkConnectivity" "release/dist/routes.mjs" && ! grep -q "/api/network/diagnostics" "release/dist/routes.mjs"; then
    echo "⚠️ Warning: Network diagnostics endpoint may be missing in the build."
  fi
else
  echo "⚠️ Warning: Network diagnostics endpoint file not found in expected locations."
fi

echo "✅ Verification passed."

# Create a deployment archive
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
RELEASE_NAME="ordinarinos-inscription-tool-${TIMESTAMP}.tar.gz"

echo "Creating archive: ${RELEASE_NAME}"
tar -czf "${RELEASE_NAME}" -C release .

echo "🎉 Done! Release created: ${RELEASE_NAME}"
echo "✓ Port configuration: Standard port = $STANDARD_PORT, Umbrel port = 3500"
echo "✓ You can deploy this to your Synology NAS or Umbrel server."
echo "✓ Follow the instructions in the README.md file."