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

- Application runs on port 3500
- Cache storage limit is set to 5GB
- Default container path for files is `/ord/data/`
- Configured to work with Umbrel's Ordinals node (container name: ordinals_ord_1, API port: 4000)

You can modify these settings in the `docker-compose.yml` file.

## Bitcoin Ordinals Node Setup

This application is designed to work with a Bitcoin Ordinals node running in a Docker container. The application will generate the proper commands to inscribe files onto the blockchain.

This application is designed to work out of the box with Umbrel's Ordinals node. Umbrel's Ordinals app typically uses:

- Container name: `ordinals_ord_1`
- API port: `4000`
- Network: `umbrel_main_network`

If you're using a different setup, you may need to adjust the environment variables in the `docker-compose.yml` file:

```yaml
environment:
  - ORD_CONTAINER_NAME=your_container_name
  - ORD_API_PORT=your_port_number
```

For reference, a typical Umbrel Ordinals Docker setup looks like:

```yaml
version: "3.7"

services:
  ord:
    image: ordinals/ord:latest
    container_name: ordinals_ord_1
    restart: unless-stopped
    ports:
      - "4000:4000"
    volumes:
      - ${ORD_DATA_DIR}:/data
      - ${BITCOIN_DATA_DIR}:/root/.bitcoin
    command: server --http-port 4000 --data-dir /data
    networks:
      - umbrel_main_network

networks:
  umbrel_main_network:
    external: true
```

## Usage

1. Access the application at `http://localhost:3500` (or your server IP/domain)
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