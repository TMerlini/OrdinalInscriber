#!/bin/bash

# Stop on errors
set -e

echo "Building Ordinarinos Inscription Tool..."

# Make sure we have the latest dependencies
npm ci

# Build the application
npm run build

# Create a release directory
mkdir -p release
rm -rf release/*

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

# Create a deployment archive
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
RELEASE_NAME="ordinarinos-inscription-tool-${TIMESTAMP}.tar.gz"

echo "Creating archive: ${RELEASE_NAME}"
tar -czf "${RELEASE_NAME}" -C release .

echo "Done! Release created: ${RELEASE_NAME}"
echo "You can deploy this to your Synology NAS or Umbrel server."
echo "Follow the instructions in the README.md file."