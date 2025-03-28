
# Ordinarinos Inscription Tool: Technical Overview

## Architecture Overview

The Ordinarinos Inscription Tool is a sophisticated web application designed for Bitcoin Ordinals inscriptions. It's built with a modern stack featuring Express.js for the backend and React with TypeScript for the frontend. The application facilitates the process of inscribing files (particularly images and 3D models) onto the Bitcoin blockchain through an Ordinals node.

## Key Components

### Backend Infrastructure

1. **Express.js Server** (server/index.ts):
   - Primary port: 3500
   - Secondary port: 5000 (for Replit compatibility)
   - Configuration through environment variables
   - Robust error handling and port management
   - Automatic IP detection for cross-container communication

2. **Command Execution System** (server/cmd-executor.ts):
   - Manages execution of Docker and system commands
   - Handles network checks and port availability
   - Manages web servers for file serving
   - Graceful error handling for Docker-related operations

3. **Caching System** (server/cache-manager.ts):
   - Sophisticated file caching mechanism (5GB limit)
   - Automatic cleanup of old files
   - File statistics and management

4. **API Routes** (server/routes.ts):
   - RESTful API design pattern
   - File upload handling with multer
   - Command generation for inscription
   - Container and network diagnostics
   - Cache management endpoints

### Frontend Application

- Built with React and TypeScript
- UI components using Radix UI and Tailwind CSS
- Responsive design for both desktop and mobile
- Dark/light theme support
- Drag-and-drop file upload interface

### Deployment Configuration

- Docker container-based deployment
- Multi-environment support:
  - Standard deployment
  - Umbrel-specific deployment (simplified networking)
- Pre-configured scripts for different deployment scenarios
- Environment-specific startup scripts

## Technical Features

1. **Ordinals Inscription Workflow**:
   - File upload and preview
   - Inscription parameter configuration
   - Command generation and execution
   - Step-by-step execution or all-at-once options
   - Detailed results and transaction tracking

2. **File Handling**:
   - Support for images (JPEG, PNG, WebP)
   - Support for 3D models (GLB/GLTF)
   - Automatic file optimization using sharp
   - Secure temporary file storage

3. **Docker Integration**:
   - Communication with Docker containers
   - Container existence verification
   - File transfer between host and containers
   - Command execution within containers

4. **Network Management**:
   - Dynamic IP detection for inter-container communication
   - Port availability checking
   - Network diagnostics
   - Multiple network interface support
   - Special handling for Docker networks

5. **Security Considerations**:
   - Input validation and sanitization
   - File size and type restrictions
   - Error message sanitization
   - Graceful handling of permission issues

## Execution Flow

1. **Initialization**:
   - Server starts on port 3500
   - Environment detection
   - Network interface discovery
   - Secondary server setup (if needed)

2. **Inscription Process**:
   - User uploads file through frontend
   - Frontend sends file and configuration to backend
   - Backend generates inscription commands
   - Backend starts a local web server
   - File is transferred to the Ordinals node container
   - Inscription command is executed in the container
   - Results are parsed and returned to frontend
   - Web server is stopped

3. **Error Handling**:
   - Docker permission issues detection
   - Network connectivity problems
   - Port conflicts
   - File size/type restrictions

## Deployment Strategies

1. **Standard Deployment**:
   - Uses Docker Compose
   - Requires Docker and Docker Compose installation
   - Network created with `docker network create ord-network`
   - Container configured with environment variables

2. **Umbrel-Specific Deployment**:
   - Simplified networking using container names
   - Pre-configured for Umbrel's network setup
   - Uses environment variables to detect configuration

3. **Replit Compatibility Mode**:
   - Secondary port for Replit workflow
   - Special environment variable configuration
   - ESM module compatibility settings

## Current Runtime Status

The application is currently running in Replit using the "Run ESM Compatible App" workflow which:
- Sets PORT=3500 and SECONDARY_PORT=5000
- Runs in development mode
- Uses Node.js experimental specifier resolution

The application is accessible at both http://localhost:3500 and http://localhost:5000, with the latter provided for Replit workflow compatibility.

## Limitations in Replit Environment

The main limitation of running this application in Replit is the lack of Docker support, which is essential for the core functionality of inscribing files onto the Bitcoin blockchain. While the UI and file upload components work correctly, the actual inscription process will fail due to Docker-related permission errors.
