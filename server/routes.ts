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
    // Only accept image files
    if (!file.mimetype.match(/^image\/(jpeg|png|webp)$/)) {
      return cb(new Error('Only JPG, PNG, and WEBP images are allowed'));
    }
    cb(null, true);
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
function getLocalIpAddress(): string {
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
  
  // Generate commands based on uploaded file and config
  app.post('/api/commands/generate', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const config = JSON.parse(req.body.config);
      const file = req.file;
      const fileName = path.basename(file.path);
      const localIp = getLocalIpAddress();
      const containerPath = config.containerPath || '/ord/data/';
      const containerFilePath = `${containerPath}${fileName}`;
      const port = config.port || 8000;
      
      // Generate web server and download commands
      const commands = [
        `python3 -m http.server ${port}`,
        `docker exec -it ${config.containerName} sh -c "curl -o ${containerFilePath} http://${localIp}:${port}/${fileName}"`
      ];
      
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
      const dirPath = path.dirname(file.path);
      
      // Get port from request body if available
      const port = req.body.port ? parseInt(req.body.port) : 8000;
      
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
        output: `Serving HTTP on 0.0.0.0 port ${port}...\nFile available at: http://${getLocalIpAddress()}:${port}/${path.basename(file.path)}`
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
