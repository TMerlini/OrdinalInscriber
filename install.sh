#!/bin/bash

# Stop on errors
set -e

echo "Ordinarinos Inscription Tool - Installation Script"
echo "=================================================="
echo

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Error: Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "Creating necessary directories..."
mkdir -p cache

echo "Checking for Umbrel Docker network..."
NETWORK_EXISTS=$(docker network ls | grep umbrel_main_network || echo "")
if [ -z "$NETWORK_EXISTS" ]; then
    echo "Warning: umbrel_main_network not found."
    echo "This application is designed to work with an Umbrel Ordinals node."
    echo "If you're not using Umbrel, you may need to adjust the network settings."
    echo "Creating umbrel_main_network as a fallback..."
    docker network create umbrel_main_network 2>/dev/null || true
fi

echo "Starting Ordinarinos Inscription Tool..."
docker-compose up -d

# Check if the container started correctly
if [ $? -eq 0 ]; then
    echo
    echo "=================================================="
    echo "Ordinarinos Inscription Tool installed successfully!"
    echo
    echo "You can access the application at:"
    echo "http://localhost:3500"
    echo
    echo "If you're running this on a server, replace 'localhost'"
    echo "with your server's IP address or domain name."
    echo "=================================================="
else
    echo
    echo "=================================================="
    echo "Error: Failed to start the containers."
    echo "Please check the Docker logs for more information:"
    echo "docker-compose logs"
    echo "=================================================="
    exit 1
fi