import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { execCommand, startWebServer, stopWebServer } from "./cmd-executor";
import { getCacheInfo, clearAllCachedImages, cleanCacheIfNeeded } from "./cache-manager";
import os from "os";
import { networkInterfaces } from "os";
import sharp from "sharp";

// Setup multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      // Save uploads to the system's temp directory
      cb(null, os.tmpdir());
    },
    filename: function (req, file, cb) {
      // Keep original filename - sanitize it first
      const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      cb(null, safeName);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // Limit file size to 10MB
  },
  fileFilter: function (req, file, cb) {
    // Accept image files and 3D model files
    if (file.mimetype.match(/^image\/(jpeg|png|webp)$/) || 
        file.originalname.match(/\.(glb|gltf)$/i)) {
      return cb(null, true);
    }
    return cb(new Error('Only JPG, PNG, WEBP images and GLB/GLTF models are allowed'));
  }
});

// Helper function to format byte size to human-readable format
function formatByteSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' bytes';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  else return (bytes / 1073741824).toFixed(1) + ' GB';
}

// Function to get local IP address
export function getLocalIpAddress(): string {
  // Check for environment variable first (for Umbrel and container deployments)
  if (process.env.ORD_NODE_IP) {
    console.log(`Using ORD_NODE_IP environment variable: ${process.env.ORD_NODE_IP}`);
    return process.env.ORD_NODE_IP;
  }
  
  // Check for simplified mode flag (for Umbrel deployments)
  if (process.env.USE_SIMPLIFIED_STARTUP === 'true') {
    console.log('Using simplified startup mode - returning localhost');
    return 'localhost';
  }
  
  // Otherwise use network interface detection
  try {
    const nets = networkInterfaces();
    
    for (const name of Object.keys(nets)) {
      const net = nets[name];
      if (!net) continue;
      
      for (const netInterface of net) {
        // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
        if (netInterface.family === 'IPv4' && !netInterface.internal) {
          return netInterface.address;
        }
      }
    }
  } catch (error) {
    console.error('Error detecting network interfaces:', error);
  }
  
  console.log('Falling back to localhost for IP address');
  return 'localhost'; // Fallback
}

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  
  // Get cache information
  app.get('/api/cache/info', async (req, res) => {
    try {
      const cacheInfo = await getCacheInfo();
      
      // Format the data for the frontend
      const formattedSize = formatByteSize(cacheInfo.totalSize);
      const formattedLimit = formatByteSize(5 * 1024 * 1024 * 1024); // 5GB
      
      // Calculate percentage of cache used (0-100)
      const percentUsed = Math.min(
        Math.round((cacheInfo.totalSize / (5 * 1024 * 1024 * 1024)) * 100),
        100
      );
      
      res.json({
        totalSize: cacheInfo.totalSize,
        formattedSize,
        formattedLimit,
        fileCount: cacheInfo.fileCount,
        percentUsed,
        files: cacheInfo.files.map(file => ({
          name: file.name,
          size: file.size,
          formattedSize: formatByteSize(file.size),
          created: file.created
        }))
      });
    } catch (error) {
      console.error('Error getting cache info:', error);
      res.status(500).json({ error: 'Failed to get cache information' });
    }
  });
  
  // Clear all cached images
  app.post('/api/cache/clear', async (req, res) => {
    try {
      const deletedCount = await clearAllCachedImages();
      res.json({
        success: true,
        deletedCount,
        message: `Successfully cleared ${deletedCount} cached image${deletedCount !== 1 ? 's' : ''}`
      });
    } catch (error) {
      console.error('Error clearing cache:', error);
      res.status(500).json({ error: 'Failed to clear cache' });
    }
  });
  
  // Delete a single cached file
  app.delete('/api/cache/file/:filename', async (req, res) => {
    try {
      const filename = req.params.filename;
      if (!filename) {
        return res.status(400).json({ error: 'No filename provided' });
      }
      
      const tmpDir = os.tmpdir();
      const filePath = path.join(tmpDir, filename);
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch (err) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      // Delete the file
      await fs.unlink(filePath);
      
      res.json({
        success: true,
        message: `Successfully deleted ${filename}`
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ error: 'Failed to delete file' });
    }
  });
  
  // Serve a cached file for preview
  app.get('/api/cache/file/:filename', async (req, res) => {
    try {
      const filename = req.params.filename;
      if (!filename) {
        return res.status(400).json({ error: 'No filename provided' });
      }
      
      const tmpDir = os.tmpdir();
      const filePath = path.join(tmpDir, filename);
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch (err) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      res.sendFile(filePath);
    } catch (error) {
      console.error('Error serving file:', error);
      res.status(500).json({ error: 'Failed to serve file' });
    }
  });
  
  // Generate commands based on uploaded file and config
  app.post('/api/commands/generate', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const config = JSON.parse(req.body.config);
      const file = req.file;
      const fileName = path.basename(file.path);
      const localIp = process.env.ORD_NODE_IP || getLocalIpAddress();
      const containerPath = config.containerPath || '/ord/data/';
      const containerFilePath = `${containerPath}${fileName}`;
      const port = config.port || 8000;
      
      // Generate web server and download commands
      const commands = [
        `python3 -m http.server ${port}`,
        `docker exec -it ${config.containerName} sh -c "curl -o ${containerFilePath} http://${localIp}:${port}/${fileName}"`
      ];
      
      // Handle metadata JSON if requested
      let metadataFilePath = '';
      if (config.includeMetadata && config.metadataJson) {
        try {
          // Generate a unique file name based on timestamp
          const metadataFileName = `metadata_${Date.now()}.json`;
          metadataFilePath = path.join(os.tmpdir(), metadataFileName);
          
          // Write the metadata JSON to a temporary file
          await fs.writeFile(metadataFilePath, config.metadataJson, 'utf8');
          
          // Command to transfer metadata file to container
          const metadataContainerPath = `${containerPath}${metadataFileName}`;
          commands.push(`docker exec -it ${config.containerName} sh -c "curl -o ${metadataContainerPath} http://${localIp}:${port}/${metadataFileName}"`);
        } catch (error) {
          console.error('Error creating metadata file:', error);
        }
      }
      
      // Build the inscription command with options
      let inscribeCommand = `docker exec -it ${config.containerName} ord wallet inscribe --fee-rate ${config.feeRate} --file ${containerFilePath}`;
      
      // Add optional parameters based on config      
      if (config.destination) {
        inscribeCommand += ` --destination ${config.destination}`;
      }
      
      if (config.noLimitCheck) {
        inscribeCommand += ` --no-limit-check`;
      }
      
      // Add new options for Ordinals inscription
      if (config.satPoint) {
        inscribeCommand += ` --sat-point ${config.satPoint}`;
      }
      
      if (config.parentId) {
        inscribeCommand += ` --parent ${config.parentId}`;
      }
      
      if (config.dryRun) {
        inscribeCommand += ` --dry-run`;
      }
      
      if (config.mimeType) {
        inscribeCommand += ` --content-type "${config.mimeType}"`;
      }
      
      // Add metadata if provided
      if (config.includeMetadata && metadataFilePath) {
        const metadataFileName = path.basename(metadataFilePath);
        const metadataContainerPath = `${containerPath}${metadataFileName}`;
        inscribeCommand += ` --metadata ${metadataContainerPath}`;
      }
      
      // Add the inscription command to the array
      commands.push(inscribeCommand);
      
      res.json({
        commands,
        fileName
      });
    } catch (error) {
      console.error('Error generating commands:', error);
      res.status(500).json({ error: 'Failed to generate commands' });
    }
  });
  
  // Start a web server to serve the file
  app.post('/api/execute/serve', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const file = req.file;
      let filePath = file.path;
      const originalFileName = path.basename(file.path);
      const port = req.body.port ? parseInt(req.body.port) : 8000;
      const config = req.body.config ? JSON.parse(req.body.config) : {};
      
      // Check if we need to optimize the image
      if (config.optimizeImage && 
          file.mimetype.match(/^image\/(jpeg|jpg|png)$/) && 
          file.size > (46 * 1024)) {
        // Create a new filename with webp extension
        const newFileName = path.basename(file.path, path.extname(file.path)) + '.webp';
        const newFilePath = path.join(path.dirname(file.path), newFileName);
        
        try {
          // Optimize the image using sharp
          await sharp(file.path)
            .resize(1000) // Resize to max width of 1000px if larger
            .webp({ 
              quality: 80,
              lossless: false,
              nearLossless: false,
              effort: 6 // 0-6, 6 is highest compression effort
            })
            .toFile(newFilePath);
          
          // Check if the optimized file exists and is smaller
          const optimizedStats = await fs.stat(newFilePath);
          
          if (optimizedStats.size < file.size) {
            // Use the optimized file instead
            filePath = newFilePath;
            console.log(`Optimized ${originalFileName} from ${formatByteSize(file.size)} to ${formatByteSize(optimizedStats.size)}`);
          } else {
            // The optimized file is not smaller, stick with the original
            await fs.unlink(newFilePath).catch(() => {}); // Remove the optimized file
            console.log(`Optimization did not reduce file size for ${originalFileName}, using original`);
          }
        } catch (err) {
          console.error('Error optimizing image:', err);
          // Continue with the original file if optimization fails
        }
      }
      
      const dirPath = path.dirname(filePath);
      
      // Start local web server in the directory with the file
      const result = await startWebServer(dirPath, port);
      
      if (result.error) {
        return res.status(500).json({
          error: true,
          output: result.output
        });
      }
      
      res.json({
        error: false,
        output: `Serving HTTP on 0.0.0.0 port ${port}...\nFile available at: http://${getLocalIpAddress()}:${port}/${path.basename(filePath)}`
      });
    } catch (error) {
      console.error('Error serving file:', error);
      res.status(500).json({ 
        error: true,
        output: String(error)
      });
    }
  });
  
  // Download the file into the container
  app.post('/api/execute/download', async (req, res) => {
    try {
      const { command } = req.body;
      
      // Execute the docker command
      const result = await execCommand(command);
      
      if (result.error) {
        return res.status(500).json({
          error: true,
          output: result.output
        });
      }
      
      res.json({
        error: false,
        output: result.output || 'File downloaded successfully to container'
      });
    } catch (error) {
      console.error('Error downloading file to container:', error);
      res.status(500).json({ 
        error: true,
        output: String(error)
      });
    }
  });
  
  // Check if container exists
  app.get('/api/container/check', async (req, res) => {
    try {
      console.log('Container check request received:', req.query);
      const { name } = req.query;
      
      if (!name || typeof name !== 'string') {
        console.log('Invalid container name:', name);
        return res.status(400).json({ error: 'Container name is required' });
      }
      
      // Actually check if the docker container exists
      const result = await execCommand(`docker ps -q -f name=${name}`);
      const containerExists = !result.error && result.output.trim() !== '';
      console.log('Container exists:', containerExists);
      
      return res.json({ exists: containerExists });
    } catch (error) {
      console.error('Error checking container:', error);
      return res.status(500).json({ error: 'Failed to check container' });
    }
  });
  
  // Check if a port is available/in use
  app.get('/api/port/check', async (req, res) => {
    try {
      console.log('Port check request received:', req.query);
      const { port } = req.query;
      
      if (!port || typeof port !== 'string') {
        console.log('Invalid port:', port);
        return res.status(400).json({ error: 'Port is required' });
      }
      
      const portNumber = parseInt(port, 10);
      
      if (isNaN(portNumber) || portNumber < 1024 || portNumber > 65535) {
        console.log('Invalid port number:', portNumber);
        return res.status(400).json({ error: 'Invalid port number' });
      }
      
      // Check if the port is in use by checking for listening processes
      const result = await execCommand(`lsof -i :${portNumber} || netstat -tuln | grep ${portNumber} || echo "Port available"`);
      const portAvailable = !result.error && (result.output.includes("Port available") || result.output.trim() === "");
      console.log('Port available:', portAvailable);
      
      return res.json({ available: portAvailable });
    } catch (error) {
      console.error('Error checking port:', error);
      return res.status(500).json({ error: 'Failed to check port' });
    }
  });
  
  // Inscribe the file
  app.post('/api/execute/inscribe', async (req, res) => {
    try {
      const { command } = req.body;
      
      // Execute the inscription command
      const result = await execCommand(command);
      
      if (result.error) {
        return res.status(500).json({
          error: true,
          output: result.output
        });
      }
      
      // Try to parse the output for inscription details
      let inscriptionId = '';
      let transactionId = '';
      let feePaid = '';
      
      const outputLines = result.output.split('\n');
      for (const line of outputLines) {
        if (line.includes('inscription')) {
          const match = line.match(/inscription: ([a-f0-9]+i\d+)/i);
          if (match && match[1]) inscriptionId = match[1];
        }
        
        if (line.includes('transaction')) {
          const match = line.match(/transaction: ([a-f0-9]+)/i);
          if (match && match[1]) transactionId = match[1];
        }
        
        if (line.includes('fee:') || line.includes('paid:')) {
          const match = line.match(/(?:fee|paid): (\d+)/i);
          if (match && match[1]) feePaid = `${parseInt(match[1]).toLocaleString()} sats`;
        }
      }
      
      // Stop the web server as we're done
      await stopWebServer();
      
      res.json({
        error: false,
        output: result.output,
        inscriptionId,
        transactionId,
        feePaid
      });
    } catch (error) {
      console.error('Error inscribing file:', error);
      res.status(500).json({ 
        error: true,
        output: String(error)
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
