# Ordinarinos Inscription Tool

A sophisticated web-based Ordinals inscription platform that empowers users to seamlessly upload, process, and manage blockchain inscriptions through an intuitive and powerful interface.

## Overview

Ordinarinos is a comprehensive web application for Bitcoin Ordinals inscriptions that simplifies the process of transferring files to your Ordinals node and executing inscription commands. The application serves as a bridge between your web browser and a running Ordinals node Docker container, eliminating the need for manual file transfers and complex command-line operations.

## Key Features

### Core Functionality
- Upload and preview images (JPEG, PNG, WebP) and 3D models (GLB/GLTF)
- Configure inscription parameters with intuitive interface
- Generate and execute inscription commands with real-time feedback
- Run commands in step-by-step mode or all at once
- Add custom metadata with on-chain storage
- Track and manage inscription history with real-time status updates

### Advanced Features
- Batch processing for multiple files (up to 100 at once)
- Image optimization to reduce file size (~46KB WebP format)
- Rare satoshi selection for collectors
- File cache management with 5GB storage limit and automatic cleanup
- SNS (Sats Names Service) name registration and management
- Wallet connector for Bitcoin transactions (supports Xverse, Leather, Unisat)

### User Experience
- Responsive design that works on desktop and mobile devices
- Dark and light theme support with automatic system preference detection
- Detailed transaction fee information and estimates
- Comprehensive error handling and status reporting
- Detailed progress tracking for long-running operations

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

### Basic Single File Inscriptions

1. Access the application at `http://localhost:3500` (or your server IP/domain)
2. Upload an image or 3D model file
3. Configure inscription parameters
4. Generate commands
5. Execute commands (step-by-step or all at once)
6. View the results in the inscription status section

### Batch Processing

1. Toggle the "Batch Mode" switch in the file upload section
2. Upload multiple files (up to 100 supported)
3. Configure batch parameters (applies to all files)
4. Select files to include in the batch (or use Select All)
5. For each file, you can optionally:
   - Enable image optimization
   - Select a rare sat (if enabled)
6. Generate commands for the entire batch
7. Execute batch processing
8. Monitor real-time progress in the batch processing panel
9. View individual transaction results in the inscription status section

### Rare Satoshi Selection

1. Enable the "Use Rare Sat" option in the configuration
2. Browse the available rare sats in the selector
3. View information about each sat type (date, block, rarity)
4. Select a sat for your inscription
5. In batch mode, you can select the same rare sat multiple times for different files

### Metadata Support

1. Enable "Include Metadata" in the configuration options
2. Enter valid JSON metadata in the editor
3. For batch mode, use an array of metadata objects corresponding to each file
4. Metadata will be stored on-chain with your inscription

### Image Optimization

1. Enable "Optimize Image" for file(s) you wish to convert
2. Images will be automatically converted to WebP format at ~46KB
3. Preview the optimized file before inscription

### File Cache Management

1. Access the Cache Management section
2. View current cache usage and file details
3. Clear individual cached files or the entire cache
4. The system automatically cleans up old files when the 5GB limit is reached

### Inscription History Management

1. All inscription attempts are tracked in the Inscription Status section
2. View status of each inscription (pending, success, failed)
3. Filter history by status type
4. For successful inscriptions:
   - Copy transaction IDs with a single click
   - View inscriptions directly on the Ordinals explorer
   - See metadata about the inscription (satoshi type, timestamp)
5. For failed inscriptions:
   - View detailed error messages
   - Retry failed transactions
6. Manage history with multiple options:
   - Choose display limits (10/50/100 items)
   - Delete individual history items
   - Clear entire history at once
7. Important: Removing items from history only affects local tracking, not the actual inscriptions on the blockchain (which are immutable and permanent)

## SNS (Sats Names Service) Features

The application includes integration with the Sats Names Service, which allows you to:

- Search for and check availability of SNS names
- Register names through the official SNS relay
- View name registration status and details
- Connect to Bitcoin wallets to authorize and pay for registrations

### Degraded Functionality Mode

The SNS feature is designed with a degraded functionality mode that activates automatically when the SNS relay service is unavailable:

- Name availability checks will continue to work with approximate results
- Registration transactions will not be generated, but fee estimates are still available
- Clear status indicators will show when the service is in degraded mode
- The application will automatically reconnect to the relay when it becomes available again

To check if the SNS service is operating in degraded mode, you can visit:
```
http://localhost:3500/api/sns/status
```

This will show the current status of the SNS relay connection.

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

## Documentation

- [Technical Overview](TECHNICAL_OVERVIEW.md) - Detailed technical information about the application architecture
- [Frequently Asked Questions](FAQ.md) - Answers to common questions about using Ordinarinos

## Support

For support, visit [ordinarinos.com](https://ordinarinos.com)