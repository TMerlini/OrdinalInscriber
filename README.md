# Ordinarinos Inscription Tool

A sophisticated web-based Ordinals inscription platform that empowers users to seamlessly upload, process, and manage blockchain images through an intuitive and powerful interface.

## Features

- Upload and preview images and 3D models (GLB/GLTF)
- Configure inscription parameters
- Generate and execute inscription commands
- Manage cached files with automatic cleanup
- Run commands in step-by-step mode or all at once
- Add custom metadata with on-chain storage
- Image optimization to reduce file size
- Dark and light theme support

## Requirements

- Docker
- Docker Compose
- Bitcoin Ordinals node (running in a container)

## Quick Installation

1. Download the latest release
2. Extract the files to a directory on your server
3. Run the installation script:

```bash
./install.sh
```

This will:
- Create necessary directories
- Set up Docker networking
- Start the application container

## Manual Installation

If you prefer to set up manually:

1. Create necessary directories:

```bash
mkdir -p cache
mkdir -p ord-data
```

2. Create a Docker network:

```bash
docker network create ord-network
```

3. Start the application using Docker Compose:

```bash
docker-compose up -d
```

## Configuration

The application is pre-configured to work with the following defaults:

- Application runs on port 5000
- Cache storage limit is set to 5GB
- Default container path for files is `/ord/data/`

You can modify these settings in the `docker-compose.yml` file.

## Bitcoin Ordinals Node Setup

This application is designed to work with a Bitcoin Ordinals node running in a Docker container. The application will generate the proper commands to inscribe files onto the blockchain.

Example Docker Compose setup for an Ordinals node:

```yaml
version: '3'
services:
  bitcoin:
    image: lncm/bitcoind:v26.0
    container_name: bitcoin
    restart: unless-stopped
    volumes:
      - ./bitcoin-data:/root/.bitcoin
    networks:
      - ord-network

  ord:
    image: ordinals/ord:latest
    container_name: ord
    restart: unless-stopped
    depends_on:
      - bitcoin
    volumes:
      - ./ord-data:/ord/data
      - ./bitcoin-data:/root/.bitcoin
    networks:
      - ord-network
    command: server --http-port 8080

networks:
  ord-network:
    external: true
```

## Usage

1. Access the application at `http://localhost:5000` (or your server IP/domain)
2. Upload an image or 3D model file
3. Configure inscription parameters
4. Generate commands
5. Execute commands (step-by-step or all at once)
6. View the results

## Development

To set up a development environment:

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

## Building From Source

To build the application from source:

```bash
./make_release.sh
```

This creates a distribution package ready for deployment.

## License

Copyright © 2024 Ordinarinos

## Support

For support, visit [ordinarinos.com](https://ordinarinos.com)