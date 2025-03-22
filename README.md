# Ordinarinos Inscription Tool

A web-based tool for inscribing images and 3D models onto an Ordinals blockchain node running in Docker.

## Features

- Upload and preview images and 3D models (GLB/GLTF)
- Configure inscription parameters
- Execute commands against a Docker container running an Ordinals node
- Cache management with automatic cleanup
- Image optimization features
- Dark/light mode support

## Prerequisites

- Docker and Docker Compose installed on your Synology NAS or Umbrel server
- Git installed (for cloning the repository)
- A Docker container running an Ordinals node (optional, can be set up with this tool)

## Deployment Instructions

### Setting up on GitHub

1. Clone this repository:
   ```
   git clone https://github.com/your-username/ordinarinos-inscription-tool.git
   cd ordinarinos-inscription-tool
   ```

2. Build and start the application using Docker Compose:
   ```
   docker-compose up -d
   ```

3. Access the application through your browser:
   ```
   http://your-server-ip:5000
   ```

### Setting up on Synology NAS

1. In Synology DSM, open Docker Package
2. Navigate to Registry, search for your GitHub container registry or use a pre-built image
3. Download the image
4. Go to Container and click "Create"
5. Select the downloaded image
6. Set the port mapping: 5000 (container) -> 5000 (local)
7. Configure volume mappings:
   - /your/synology/path/cache -> /app/cache
8. Apply and launch the container

### Umbrel Setup

1. SSH into your Umbrel server
2. Clone this repository:
   ```
   git clone https://github.com/your-username/ordinarinos-inscription-tool.git
   cd ordinarinos-inscription-tool
   ```

3. Run with Docker Compose:
   ```
   docker-compose up -d
   ```

4. The application will be accessible at:
   ```
   http://umbrel.local:5000
   ```

## Using with an Existing Ordinals Node

If you already have an Ordinals node running in Docker:

1. Make sure both containers are on the same Docker network
2. In the application, use the exact container name in the "Docker Container Name" field
3. The default data path in the Ordinals container is `/ord/data/`

## Cache Management

- The application maintains a cache of uploaded files
- By default, the cache limit is set to 5GB
- You can manually clear the cache through the UI

## Development

To run the application in development mode:

```
npm install
npm run dev
```

## License

MIT