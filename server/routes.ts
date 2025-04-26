import express, { Express, Request, Response } from 'express';
import multer from 'multer';
import { createServer, Server } from 'http';
import { execCommand, startWebServer, stopWebServer, checkNetworkConnectivity } from "./cmd-executor";
import cors from 'cors';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import sharp from 'sharp';
import { getCacheInfo, clearAllCachedFiles, cleanCacheIfNeeded } from "./cache-manager";
import { networkInterfaces } from "os";
import snsRoutes from "./routes/sns";
import inscriptionsRoutes from "./routes/inscriptions";
import { registerBitmapRoutes } from "./routes/bitmap";
import { registerBrc20Routes } from "./routes/brc20";
import { registerRecursiveRoutes } from "./routes/recursive";
import errorLogger from './errorLogger';

// SNS Registry Address (this would be the official SNS registry address in production)
const SNS_REGISTRY_ADDRESS = "bc1qe8grz79ej3ywxkfcdchrncfl5antlc9tzmy5c2";

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
    // Accept image files, 3D model files, and text/markdown files
    if (file.mimetype.match(/^image\/(jpeg|png|webp)$/) || 
        file.originalname.match(/\.(glb|gltf)$/i) ||
        file.mimetype.match(/^text\/(plain|markdown)$/) ||
        file.originalname.match(/\.(txt|md|text|markdown)$/i)) {
      return cb(null, true);
    }
    return cb(new Error('Only JPG, PNG, WEBP images, GLB/GLTF models, and text/markdown files are allowed'));
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
    console.log('Using simplified startup mode - returning ordinals_ord_1');
    return 'ordinals_ord_1'; // Return the container name in Umbrel network
  }
  
  // Otherwise use network interface detection
  try {
    const nets = networkInterfaces();
    let candidates: string[] = [];
    
    // First pass: collect all potential IP addresses
    for (const name of Object.keys(nets)) {
      const net = nets[name];
      if (!net) continue;
      
      for (const netInterface of net) {
        // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
        if (netInterface.family === 'IPv4' && !netInterface.internal) {
          // Prioritize Docker bridge interfaces
          if (name.includes('docker') || name.includes('br-')) {
            // Docker bridge interfaces get priority
            return netInterface.address;
          }
          // Otherwise add to candidates
          candidates.push(netInterface.address);
        }
      }
    }
    
    // Second pass: prefer networks in 172.x.x.x range (common for Docker)
    const dockerRangeIP = candidates.find(ip => ip.startsWith('172.'));
    if (dockerRangeIP) {
      console.log(`Selected Docker range IP: ${dockerRangeIP}`);
      return dockerRangeIP;
    }
    
    // Third pass: prefer 10.x.x.x range (common for internal networks)
    const internalRangeIP = candidates.find(ip => ip.startsWith('10.'));
    if (internalRangeIP) {
      console.log(`Selected internal range IP: ${internalRangeIP}`);
      return internalRangeIP;
    }
    
    // Finally: use any available non-internal IP
    if (candidates.length > 0) {
      console.log(`Selected IP address: ${candidates[0]}`);
      return candidates[0];
    }
  } catch (error) {
    console.error('Error detecting network interfaces:', error);
  }
  
  // Try 'host.docker.internal' for Docker for Desktop
  try {
    const { execSync } = require('child_process');
    // Check if we can resolve host.docker.internal
    const result = execSync('getent hosts host.docker.internal || echo "not found"').toString();
    if (!result.includes('not found')) {
      console.log('Using host.docker.internal as IP address');
      return 'host.docker.internal';
    }
  } catch (err) {
    // Ignore errors
  }
  
  console.log('Falling back to localhost for IP address');
  return 'localhost'; // Fallback
}

// SNS configuration
const PLATFORM_FEE_ADDRESS = "3GzpE8PyW8XgNnmkxsNLpj2jVKvyxwRYFM"; // Platform fee address
const PLATFORM_FEE_AMOUNT = 2000; // 2000 satoshis (competitive with OrdinalsBot)

// Fee tiers based on OrdinalsBot approach
type FeeTier = {
  inscriptionFee: number;
  networkFee: number;
  sizeFee: number;
  serviceFee?: number;
  processingTime: string;
};

type FeeTierType = 'economy' | 'normal' | 'custom';

const FEE_TIERS: Record<FeeTierType, FeeTier> = {
  economy: {
    inscriptionFee: 10000,
    networkFee: 900,
    sizeFee: 150,
    processingTime: "Multiple Days"
  },
  normal: {
    inscriptionFee: 10000,
    networkFee: 1000,
    sizeFee: 160,
    processingTime: "1 hour"
  },
  custom: {
    inscriptionFee: 10000,
    networkFee: 2500,
    sizeFee: 200,
    processingTime: "Choose fee"
  }
};

// Default to the normal tier pricing
const SNS_REGISTRATION_FEE = FEE_TIERS.normal.inscriptionFee; // 10000 satoshis per name
const NETWORK_FEE = FEE_TIERS.normal.networkFee; // Network fee in satoshis
const SIZE_FEE = FEE_TIERS.normal.sizeFee; // Size-based fee in satoshis

/**
 * Check if we're running in Umbrel environment with direct connections to Bitcoin/Ord
 */
function isUmbrelEnvironment(): boolean {
  // First check direct environment variables (most reliable)
  const hasDirectConnectEnv = process.env.DIRECT_CONNECT === 'true' && 
                             process.env.BTC_SERVER_AVAILABLE === 'true' &&
                             process.env.ORD_SERVER_AVAILABLE === 'true';
  
  if (hasDirectConnectEnv) {
    console.log('Umbrel environment detected through environment variables');
    return true;
  }
  
  // Second, check for Umbrel-specific paths or files
  try {
    const { existsSync } = require('fs');
    if (existsSync('/umbrel') || existsSync('/home/umbrel')) {
      console.log('Umbrel environment detected through filesystem checks');
      return true;
    }
  } catch (err) {
    // Ignore errors from file checks
  }
  
  // Third, check if ORD_RPC_HOST is set to a known Umbrel container name
  if (process.env.ORD_RPC_HOST && 
     (process.env.ORD_RPC_HOST.includes('ordinals_ord_1') || 
      process.env.ORD_RPC_HOST.includes('ordinals_app_proxy_1'))) {
    console.log('Umbrel environment detected through container name');
    return true;
  }
  
  // Finally check UMBREL_ENV environment variable
  if (process.env.UMBREL_ENV === 'true') {
    console.log('Umbrel environment detected through UMBREL_ENV variable');
    return true;
  }
  
  return false;
}

// Get the container name based on environment
function getOrdContainerName(): string {
  // Check for Umbrel environment
  try {
    // First try with the exact container name from docker ps
    const umbrelOrdContainers = [
      'ordinals_ord_1',    // Standard Umbrel Ordinals container name
      'ord-server',        // Default fallback
      'ord_1',             // Alternative naming
      'ord'                // Simple name
    ];
    
    for (const containerName of umbrelOrdContainers) {
      try {
        // Check if container exists and is running
        const output = execSync(`docker ps -q -f name=${containerName}`, { encoding: 'utf8' });
        if (output.trim()) {
          console.log(`Found Ordinals container: ${containerName}`);
          return containerName;
        }
      } catch (error) {
        // Ignore errors checking this container name and continue to next
        console.log(`Container ${containerName} not found, trying next...`);
      }
    }
    
    // If no specific container found, try to find any container with 'ord' in the name
    const output = execSync("docker ps --format '{{.Names}}' | grep -i ord", { encoding: 'utf8' });
    const containers = output.trim().split('\n');
    
    // Prioritize containers that are likely to be the ord server
    const ordServerContainers = containers.filter(name => 
      name.includes('ord_1') || 
      name.includes('ordinals_ord') || 
      name.includes('ord-server')
    );
    
    if (ordServerContainers.length > 0) {
      console.log(`Found Ordinals container via search: ${ordServerContainers[0]}`);
      return ordServerContainers[0];
    } else if (containers.length > 0) {
      console.log(`Using first available ord-related container: ${containers[0]}`);
      return containers[0];
    }
  } catch (error) {
    console.error('Error detecting Ordinals container:', error);
  }
  
  // Return environment variable if set or default
  const defaultName = process.env.ORD_CONTAINER_NAME || 'ordinals_ord_1';
  console.log(`Using default container name: ${defaultName}`);
  return defaultName;
}

/**
 * Get Bitcoin container name based on the environment
 */
function getBitcoinContainerName(): string {
  // First check if BTC_RPC_HOST is set, which takes precedence
  if (process.env.BTC_RPC_HOST) {
    return process.env.BTC_RPC_HOST;
  }
  
  // Umbrel container names can vary
  if (isUmbrelEnvironment()) {
    // Try different common Umbrel container names
    return 'bitcoin_bitcoind_1';
  }
  
  // Default fallback
  return 'bitcoin';
}

/**
 * Get Bitcoin RPC endpoint URL
 */
function getBitcoinRpcUrl(): string {
  const user = process.env.BTC_RPC_USER || 'umbrel';
  const pass = process.env.BTC_RPC_PASSWORD || '';
  const host = process.env.BTC_RPC_HOST || 'bitcoin.embassy';
  const port = process.env.BTC_RPC_PORT || '8332';
  
  return `http://${user}:${pass}@${host}:${port}/`;
}

/**
 * Get Ord API endpoint URL
 */
export function getOrdApiUrl(): string {
  // If direct URL is provided, use it
  if (process.env.ORD_API_URL) {
    return process.env.ORD_API_URL;
  }
  
  const host = process.env.ORD_RPC_HOST || 'ord.embassy';
  const port = process.env.ORD_RPC_PORT || '8080';
  
  // Special handling for Umbrel environments
  if (isUmbrelEnvironment()) {
    console.log('Configuring Ord API URL for Umbrel environment');
    
    // If we're using app_proxy, use port 4000 by default
    if (process.env.USE_APP_PROXY === 'true') {
      if (process.env.ORD_RPC_HOST) {
        // Use specified host with port 4000
        console.log(`Using Umbrel app_proxy configuration with host: ${process.env.ORD_RPC_HOST}:4000`);
        return `http://${process.env.ORD_RPC_HOST}:4000`;
      } else {
        // Use default app_proxy container name
        console.log('Using Umbrel app_proxy configuration with default container: ordinals_app_proxy_1:4000');
        return 'http://ordinals_app_proxy_1:4000';
      }
    }
    
    // Standard Umbrel ord container names and ports
    if (host === 'ordinals_ord_1' || 
        host === 'ord.embassy' || 
        host.includes('ordinals_ord')) {
      const umbrelOrdPort = process.env.ORD_RPC_PORT || '8080';
      console.log(`Using Umbrel Ordinals configuration (${host}:${umbrelOrdPort})`);
      return `http://${host}:${umbrelOrdPort}`;
    }
  }
  
  // If we have a host with port 80, don't append port
  if (port === '80') {
    return `http://${host}`;
  }
  
  // Default case - use configured host and port
  const baseUrl = `http://${host}:${port}`;
  console.log(`Using Ord API URL: ${baseUrl}`);
  return baseUrl;
}

// Fee cache to avoid frequent API calls
let feeCache = {
  estimates: null,
  lastUpdated: 0,
  ttl: 5 * 60 * 1000 // 5 minutes
};

/**
 * Get fee estimates from multiple sources
 */
async function getBitcoinFeeEstimates() {
  // Check cache first
  if (feeCache.estimates && (Date.now() - feeCache.lastUpdated < feeCache.ttl)) {
    console.log('Using cached fee estimates');
    return feeCache.estimates;
  }

  // Try Bitcoin Core first (if running in Umbrel environment)
  try {
    const isUmbrel = isUmbrelEnvironment();
    if (isUmbrel) {
      const bitcoinContainer = getBitcoinContainerName();
      if (bitcoinContainer) {
        console.log('Getting fee estimates from Bitcoin Core');
        
        // Call estimatesmartfee for different confirmation targets
        const oneBlockCmd = await execCommand(`docker exec ${bitcoinContainer} bitcoin-cli estimatesmartfee 1`);
        const threeBlockCmd = await execCommand(`docker exec ${bitcoinContainer} bitcoin-cli estimatesmartfee 3`);
        const sixBlockCmd = await execCommand(`docker exec ${bitcoinContainer} bitcoin-cli estimatesmartfee 6`);
        
        if (!oneBlockCmd.error && !threeBlockCmd.error && !sixBlockCmd.error) {
          try {
            const oneBlock = JSON.parse(oneBlockCmd.output);
            const threeBlock = JSON.parse(threeBlockCmd.output);
            const sixBlock = JSON.parse(sixBlockCmd.output);
            
            // Convert BTC/kB to sat/vB
            const oneBlockFee = Math.ceil((oneBlock.feerate || 0.0001) * 100000);
            const threeBlockFee = Math.ceil((threeBlock.feerate || 0.00005) * 100000);
            const sixBlockFee = Math.ceil((sixBlock.feerate || 0.00002) * 100000);
            
            const estimates = {
              economyFee: sixBlockFee || 2,
              standardFee: threeBlockFee || 5,
              priorityFee: oneBlockFee || 10,
              currentMempool: threeBlockFee || 4,
              source: 'bitcoin_core'
            };
            
            // Update cache
            feeCache.estimates = estimates;
            feeCache.lastUpdated = Date.now();
            
            return estimates;
          } catch (parseErr) {
            console.error('Error parsing Bitcoin Core response:', parseErr);
          }
        }
      }
    }
  } catch (err) {
    console.error('Error getting fees from Bitcoin Core:', err);
  }
  
  // Fallback to public API
  try {
    console.log('Getting fee estimates from mempool.space API');
    
    // Try mempool.space API
    const response = await fetch('https://mempool.space/api/v1/fees/recommended');
    if (response.ok) {
      const data = await response.json();
      
      const estimates = {
        economyFee: data.economyFee || 2,
        standardFee: data.halfHourFee || 5,
        priorityFee: data.fastestFee || 10,
        currentMempool: data.hourFee || 4,
        mempoolMinFee: data.minimumFee || 1,
        source: 'mempool.space'
      };
      
      // Update cache
      feeCache.estimates = estimates;
      feeCache.lastUpdated = Date.now();
      
      return estimates;
    }
  } catch (err) {
    console.error('Error getting fees from mempool.space API:', err);
  }
  
  // Final fallback - static reasonable values
  const fallbackEstimates = {
    economyFee: 2,
    standardFee: 5,
    priorityFee: 10,
    currentMempool: 4,
    mempoolMinFee: 1,
    source: 'static_fallback'
  };
  
  // Update cache even with fallback
  feeCache.estimates = fallbackEstimates;
  feeCache.lastUpdated = Date.now();
  
  return fallbackEstimates;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Log Umbrel environment if detected
  if (isUmbrelEnvironment()) {
    console.log('Running in Umbrel environment with direct connections to Bitcoin and Ord');
    console.log(`Bitcoin RPC endpoint: ${getBitcoinRpcUrl().replace(/:[^:]*@/, ':****@')}`);
    console.log(`Ord API endpoint: ${getOrdApiUrl()}`);
  }
  
  // Mount the SNS, inscriptions, bitmap, BRC-20, and recursive routes
  app.use('/api/sns', snsRoutes);
  app.use('/api/inscriptions', inscriptionsRoutes);
  registerBitmapRoutes(app); // Register bitmap routes
  registerBrc20Routes(app); // Register BRC-20 routes
  registerRecursiveRoutes(app); // Register recursive inscription routes
  
  // Environment detection route
  app.get('/api/environment', (req, res) => {
    try {
      const isUmbrel = isUmbrelEnvironment();
      const ordContainerName = getOrdContainerName();
      const bitcoinContainerName = getBitcoinContainerName();
      const localIp = getLocalIpAddress();
      
      res.json({
        isUmbrel,
        ordContainerName,
        bitcoinContainerName,
        localIp,
        directConnect: process.env.DIRECT_CONNECT === 'true',
        bitcoinAvailable: process.env.BTC_SERVER_AVAILABLE === 'true',
        ordAvailable: process.env.ORD_SERVER_AVAILABLE === 'true',
        usingAppProxy: process.env.USE_APP_PROXY === 'true',
        ordPort: process.env.ORD_RPC_PORT || '80'
      });
    } catch (error) {
      console.error('Error getting environment info:', error);
      res.status(500).json({ error: 'Failed to get environment information' });
    }
  });
  
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
  
  // Clear all cached files (images, 3D models, and text/markdown files)
  app.post('/api/cache/clear', async (req, res) => {
    try {
      const deletedCount = await clearAllCachedFiles();
      res.json({
        success: true,
        deletedCount,
        message: `Successfully cleared ${deletedCount} cached file${deletedCount !== 1 ? 's' : ''}`
      });
    } catch (error) {
      console.error('Error clearing cache:', error);
      res.status(500).json({ error: 'Failed to clear cache' });
    }
  });
  
  // Save text or markdown content directly to the cache
  app.post('/api/cache/save-text', async (req, res) => {
    try {
      const { content, fileName, contentType } = req.body;
      
      if (!content || !fileName) {
        return res.status(400).json({ error: 'Missing required fields: content and fileName' });
      }
      
      // Validate file extension for security
      const fileExt = path.extname(fileName).toLowerCase();
      const allowedExtensions = ['.txt', '.md', '.text', '.markdown'];
      
      if (!allowedExtensions.includes(fileExt)) {
        return res.status(400).json({ 
          error: 'Invalid file extension. Only .txt, .md, .text, and .markdown files are allowed' 
        });
      }
      
      // Create a safe filename (remove any path-related characters)
      const safeFileName = path.basename(fileName).replace(/[^a-zA-Z0-9.-]/g, '_');
      const tmpDir = os.tmpdir();
      const filePath = path.join(tmpDir, safeFileName);
      
      // Write the content to the file
      await fsPromises.writeFile(filePath, content, 'utf-8');
      
      // Get file stats
      const stats = await fsPromises.stat(filePath);
      
      // Check cache limit and clean if needed
      await cleanCacheIfNeeded();
      
      // Return success response with file details
      res.json({
        success: true,
        fileName: safeFileName,
        path: filePath,
        size: stats.size,
        formattedSize: formatByteSize(stats.size),
        contentType: contentType || 'text/plain',
        created: new Date()
      });
    } catch (error) {
      console.error('Error saving text content:', error);
      res.status(500).json({ error: 'Failed to save text content' });
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
        await fsPromises.access(filePath);
      } catch (err) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      // Delete the file
      await fsPromises.unlink(filePath);
      
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
        await fsPromises.access(filePath, fs.constants.R_OK);
      } catch (err) {
        console.error(`File not found or not readable: ${filePath}`, err);
        return res.status(404).json({ 
          error: 'File not found or not readable',
          details: `Could not access ${filename} in temporary directory. It may have been cleaned up by the system.`
        });
      }
      
      // Get file stats to determine content type
      const stats = await fsPromises.stat(filePath);
      if (!stats.isFile()) {
        return res.status(400).json({ error: 'Not a file' });
      }
      
      // Set appropriate content type based on file extension
      const ext = path.extname(filename).toLowerCase();
      let contentType = 'application/octet-stream'; // Default
      
      if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.webp') contentType = 'image/webp';
      else if (ext === '.gif') contentType = 'image/gif';
      else if (ext === '.txt' || ext === '.text') contentType = 'text/plain';
      else if (ext === '.md' || ext === '.markdown') contentType = 'text/markdown';
      else if (ext === '.glb') contentType = 'model/gltf-binary';
      else if (ext === '.gltf') contentType = 'model/gltf+json';
      
      // Set CORS headers to ensure images can be loaded in the browser
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Content-Type', contentType);
      
      // Stream the file instead of loading it all into memory
      const fileStream = fs.createReadStream(filePath);
      fileStream.on('error', (error) => {
        console.error(`Error streaming file ${filePath}:`, error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error streaming file', message: error.message });
        }
      });
      
      fileStream.pipe(res);
    } catch (error) {
      console.error('Error serving file:', error);
      res.status(500).json({ 
        error: 'Failed to serve file',
        message: error instanceof Error ? error.message : String(error)
      });
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
      const containerName = getOrdContainerName();
      const containerPath = '/ord/data/';
      
      // Log information for debugging
      console.log(`Generating commands for file: ${fileName} (${file.size} bytes)`);
      console.log(`Is Umbrel environment: ${isUmbrelEnvironment()}`);
      console.log(`Container name: ${containerName}`);
      
      // Generate commands - focus exclusively on docker cp (avoid curl)
      const commands = [];
      
      // First command: Copy the file to the container
      commands.push(`# Step 1: Copy the file to the container`);
      commands.push(`docker cp "${file.path}" ${containerName}:${containerPath}${fileName}`);
      
      // Handle metadata JSON if requested
      let metadataFilePath = '';
      let metadataFileName = '';
      if (config.includeMetadata && config.metadataJson) {
        try {
          // Generate a unique file name based on timestamp
          metadataFileName = `metadata_${Date.now()}.json`;
          metadataFilePath = path.join(os.tmpdir(), metadataFileName);
          
          // Write the metadata JSON to a temporary file
          await fsPromises.writeFile(metadataFilePath, config.metadataJson, 'utf8');
          
          // Command to copy metadata file to container
          commands.push(`\n# Step 2: Copy metadata file to container`);
          commands.push(`docker cp "${metadataFilePath}" ${containerName}:${containerPath}${metadataFileName}`);
        } catch (error) {
          console.error('Error creating metadata file:', error);
        }
      }
      
      // Build the inscription command with options
      commands.push(`\n# Step 3: Run the inscription command`);
      let inscribeCommand = `docker exec -it ${containerName} ord wallet inscribe --fee-rate ${config.feeRate} --file ${containerPath}${fileName}`;
      
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
      
      // Support for rare sat selection
      if (config.useSatRarity && config.selectedSatoshi) {
        inscribeCommand += ` --sat ${config.selectedSatoshi}`;
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
        const metadataContainerPath = `${containerPath}${metadataFileName}`;
        inscribeCommand += ` --metadata ${metadataContainerPath}`;
      }
      
      // Add the inscription command to the array
      commands.push(inscribeCommand);
      
      // Summary info
      commands.push(`\n# File will be located at: ${containerPath}${fileName}`);
      
      res.json({
        commands,
        fileName,
        filePath: file.path,
        containerName,
        containerPath
      });
    } catch (error) {
      console.error('Error generating commands:', error);
      res.status(500).json({ error: 'Failed to generate commands' });
    }
  });
  
  // Execute the serve command (run a local web server)
  app.post('/api/execute/serve', upload.single('file'), async (req, res) => {
    // Create a variable to track if the response has been sent to avoid "headers already sent" errors
    let responseSent = false;
    
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const file = req.file;
      let filePath = file.path;
      const originalFileName = path.basename(file.path);
      
      // Enhanced logging for debugging purposes
      console.log('======= DEBUG: SERVE REQUEST START =======');
      console.log(`File uploaded: ${originalFileName} (${file.size} bytes)`);
      console.log(`Temp file path: ${filePath}`);
      console.log(`isUmbrelEnvironment(): ${isUmbrelEnvironment()}`);
      console.log(`Environment variables: DIRECT_CONNECT=${process.env.DIRECT_CONNECT}, BTC_SERVER_AVAILABLE=${process.env.BTC_SERVER_AVAILABLE}, ORD_SERVER_AVAILABLE=${process.env.ORD_SERVER_AVAILABLE}`);
      console.log(`Additional debug: OS=${process.platform}, NodeJS=${process.version}`);
      
      // Add a timeout handler to send an error response if the operation takes too long
      const timeoutId = setTimeout(() => {
        if (!responseSent) {
          responseSent = true;
          console.error('Operation timed out on server');
          res.status(504).json({ 
            error: true, 
            output: 'Operation timed out. The server took too long to process the file. Try a smaller file or disable image optimization.' 
          });
          
          // Log additional debug info about the file and container
          errorLogger.log('Timeout in /api/execute/serve', 'api_timeout', {
            fileName: originalFileName,
            fileSize: file.size,
            fileType: file.mimetype,
            tempPath: filePath
          });
        }
      }, 90000); // 90 second timeout
      
      // Parse config
      const config = req.body.config ? JSON.parse(req.body.config) : {};
      
      // Make image optimization optional and more efficient
      let imageOptimized = false;
      if (config.optimizeImage && 
          file.mimetype.match(/^image\/(jpeg|jpg|png)$/) && 
          file.size > (46 * 1024)) {
        try {
          const newFileName = path.basename(file.path, path.extname(file.path)) + '.webp';
          const newFilePath = path.join(path.dirname(file.path), newFileName);
          
          console.log(`Optimizing image to WebP: ${newFilePath}`);
          
          // Use a more efficient optimization configuration
          await sharp(file.path)
            .resize({ width: 1000, withoutEnlargement: true }) // Only resize if larger than 1000px
            .webp({ 
              quality: 80,
              effort: 4 // Lower effort for faster processing
            })
            .toFile(newFilePath);
          
          const optimizedStats = await fsPromises.stat(newFilePath);
          
          if (optimizedStats.size < file.size) {
            filePath = newFilePath;
            imageOptimized = true;
            console.log(`Optimized ${originalFileName} from ${formatByteSize(file.size)} to ${formatByteSize(optimizedStats.size)}`);
          } else {
            await fsPromises.unlink(newFilePath).catch(() => {});
            console.log(`Optimization did not reduce file size, using original`);
          }
        } catch (err) {
          console.error('Error optimizing image:', err);
          // Continue with original file if optimization fails
        }
      }
      
      const containerName = getOrdContainerName();
      const containerPath = '/ord/data/';
      const fileName = path.basename(filePath);
      
      // ALWAYS USE DIRECT COPY TO CONTAINER - more reliable in all environments
      console.log(`Attempting direct file copy to container ${containerName}:${containerPath}${fileName}`);
      
      // Add timestamp for performance tracking
      const startTime = Date.now();
      let copySuccess = false;
      let copyError = '';
      
      try {
        // First verify the container exists with a short timeout
        console.log('Verifying container exists...');
        const containerCheck = await execCommand(`docker ps -q -f name=${containerName}`);
        const containerExists = !containerCheck.error && containerCheck.output.trim() !== '';
        
        if (!containerExists) {
          // Try alternative container names if the primary one doesn't exist
          const alternativeNames = ['ordinals_ord_1', 'ordinals_app_proxy_1', 'bitcoin-ordinals', 'ord-server'];
          console.log(`Container ${containerName} not found, trying alternatives: ${alternativeNames.join(', ')}`);
          
          let foundAlternative = false;
          for (const altName of alternativeNames) {
            if (altName === containerName) continue; // Skip the one we already tried
            
            const altCheck = await execCommand(`docker ps -q -f name=${altName}`);
            if (!altCheck.error && altCheck.output.trim() !== '') {
              console.log(`Found alternative container: ${altName}`);
              foundAlternative = true;
              
              // Try copying to the alternative container
              const copyResult = await execCommand(`docker cp "${filePath}" ${altName}:${containerPath}${fileName}`);
              if (!copyResult.error) {
                copySuccess = true;
                console.log(`File successfully copied to alternative container ${altName}`);
                break;
              }
            }
          }
          
          if (!foundAlternative) {
            copyError = `Container ${containerName} not found, and no alternatives are available.`;
            console.error(copyError);
          }
        } else {
          // Copy to the primary container - increase timeout here
          console.log(`Container ${containerName} found, copying file...`);
          const copyCommand = `docker cp "${filePath}" ${containerName}:${containerPath}${fileName}`;
          console.log(`Executing: ${copyCommand}`);
          
          // Execute with longer timeout for large files
          const copyResult = await execCommand(copyCommand);
          
          if (!copyResult.error) {
            copySuccess = true;
            console.log('File successfully copied to container');
          } else {
            copyError = copyResult.output;
            console.error('Error copying file to container:', copyError);
          }
        }
      } catch (err) {
        copyError = String(err);
        console.error('Exception during file copy:', err);
      }
      
      // Clear the timeout as we're about to send the response
      clearTimeout(timeoutId);
      
      // Track completion time for performance monitoring
      const elapsedTime = Date.now() - startTime;
      console.log(`File copy operation completed in ${elapsedTime}ms, success: ${copySuccess}`);
      
      // Only send response if it hasn't been sent already (by timeout)
      if (!responseSent) {
        responseSent = true;
        
        // Prepare response based on copy success
        if (copySuccess) {
          // Successfully copied - return container path
          console.log('======= DEBUG: SERVE REQUEST END (SUCCESS) =======');
          return res.json({
            error: false,
            direct_copy: true,
            elapsedTime,
            imageOptimized,
            originalSize: file.size,
            output: `File successfully copied to ord container.\nContainer path: ${containerPath}${fileName}\n\nYou can now use this path in your inscription command.`
          });
        } else {
          // Failed to copy - provide full diagnostic info and alternatives
          console.log('======= DEBUG: SERVE REQUEST END (MANUAL ALTERNATIVES) =======');
          
          // Check if container exists again
          const containerCheck = await execCommand(`docker ps -q -f name=${containerName}`);
          const containerExists = !containerCheck.error && containerCheck.output.trim() !== '';
          
          let outputMessage = `Unable to automatically copy file to container.\n\n`;
          
          if (!containerExists) {
            outputMessage += `The container "${containerName}" doesn't seem to be running. Please check your Umbrel setup.\n\n`;
            outputMessage += `Available containers: `;
            
            try {
              const listContainers = await execCommand(`docker ps --format "{{.Names}}"`);
              if (!listContainers.error) {
                outputMessage += listContainers.output.split('\n').join(', ') + '\n\n';
              } else {
                outputMessage += 'Unable to list containers.\n\n';
              }
            } catch (err) {
              outputMessage += `Unable to list containers: ${err}\n\n`;
            }
          } else if (copyError.includes("executable file not found in $PATH")) {
            outputMessage += `The container is missing required tools. This is expected in minimal containers.\n\n`;
          } else {
            outputMessage += `Error: ${copyError}\n\n`;
          }
          
          outputMessage += `MANUAL FILE TRANSFER OPTIONS:\n\n`;
          outputMessage += `1. Direct Docker Copy (recommended for Umbrel):\n`;
          outputMessage += `   docker cp "${filePath}" ${containerName}:${containerPath}${fileName}\n\n`;
          
          outputMessage += `2. Using shared volumes (if available):\n`;
          outputMessage += `   Copy the file to a location that's mounted in the container.\n`;
          outputMessage += `   Source file: ${filePath}\n\n`;
          
          outputMessage += `Once you've transferred the file, use this path in your inscription command:\n`;
          outputMessage += `${containerPath}${fileName}`;
          
          return res.json({
            error: false,
            containerExists,
            elapsedTime,
            originalError: copyError,
            output: outputMessage
          });
        }
      }
    } catch (error) {
      // Only send error response if one hasn't been sent yet
      if (!responseSent) {
        responseSent = true;
        console.error('Error serving file:', error);
        errorLogger.logApiError(error, req, res);
        res.status(500).json({ 
          error: true,
          output: String(error),
          stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
        });
      }
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
  
  // Execute a generic command (used for bitmap inscriptions and other direct commands)
  app.post('/api/execute/command', async (req, res) => {
    try {
      const { command } = req.body;
      
      if (!command) {
        return res.status(400).json({ 
          error: true, 
          output: 'No command provided' 
        });
      }
      
      // Execute the command
      const result = await execCommand(command);
      
      if (result.error) {
        return res.status(500).json({
          error: true,
          output: result.output
        });
      }
      
      res.json({
        error: false,
        output: result.output || 'Command executed successfully'
      });
    } catch (error) {
      console.error('Error executing command:', error);
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
      
      // Check if we're in Umbrel environment
      let alternativeNames: string[] = [];
      if (isUmbrelEnvironment()) {
        // Provide alternative container names to check in Umbrel environment
        if (name === 'ord' || name === 'ordinals_ord_1' || name === 'ordinals_app_proxy_1') {
          alternativeNames = ['ordinals_ord_1', 'ordinals_app_proxy_1', 'ord-1', 'ord'];
        } else if (name === 'bitcoin' || name === 'bitcoin_bitcoind_1') {
          alternativeNames = ['bitcoin_bitcoind_1', 'bitcoin-1', 'bitcoin'];
        }
      }
      
      // Try the requested name first
      let result = await execCommand(`docker ps -q -f name=${name}`);
      let containerExists = !result.error && result.output.trim() !== '';
      
      // If not found and we have alternatives, try them
      if (!containerExists && alternativeNames.length > 0) {
        for (const altName of alternativeNames) {
          if (altName === name) continue; // Skip if same as original
          
          console.log(`Container ${name} not found, trying alternative: ${altName}`);
          result = await execCommand(`docker ps -q -f name=${altName}`);
          
          if (!result.error && result.output.trim() !== '') {
            containerExists = true;
            console.log(`Found container with alternative name: ${altName}`);
            break;
          }
        }
      }
      
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
  
  // Run network diagnostics
  app.get('/api/network/diagnostics', async (req, res) => {
    try {
      console.log('Network diagnostics request received');
      const { container } = req.query;
      
      // Check Accept header to handle browser and API requests differently
      const acceptHeader = req.headers.accept || '';
      const wantsHTML = acceptHeader.includes('text/html');
      
      // Override content-type for API clients
      if (!wantsHTML) {
        res.setHeader('Content-Type', 'application/json');
      }
      
      // Get container name from query or use default Umbrel container name
      const containerName = (container && typeof container === 'string') 
        ? container 
        : 'ordinals_ord_1';
      
      console.log(`Running network diagnostics for container: ${containerName}`);
      
      // Run network diagnostics
      const diagnosticResults = await checkNetworkConnectivity(containerName);
      
      // Calculate selected IP address based on our algorithm
      let selectedIp = '';
      
      // Get the IP that would be used by our getLocalIpAddress function
      selectedIp = getLocalIpAddress();
      
      // Prepare the diagnostic data
      const diagnosticData = {
        diagnostics: diagnosticResults,
        selectedIp,
        umbrelMode: process.env.USE_SIMPLIFIED_STARTUP === 'true',
        ordNodeIp: process.env.ORD_NODE_IP || null,
        environment: {
          NODE_ENV: process.env.NODE_ENV || 'development',
          PORT: process.env.PORT || '5000',
        }
      };
      
      // If this is a browser request and we're in development mode, pass through to Vite
      if (wantsHTML && process.env.NODE_ENV === 'development') {
        return res.json(diagnosticData);
      }
      
      // Otherwise, force JSON response
      return res.status(200)
        .setHeader('Content-Type', 'application/json')
        .send(JSON.stringify(diagnosticData, null, 2));
    } catch (error) {
      console.error('Error running network diagnostics:', error);
      return res.status(500)
        .setHeader('Content-Type', 'application/json')
        .send(JSON.stringify({ error: 'Failed to run network diagnostics' }, null, 2));
    }
  });
  
  // Inscribe the file
  app.post('/api/execute/inscribe', async (req, res) => {
    try {
      const { 
        command, 
        fileName, 
        fileType, 
        satoshiType, 
        includeMetadata, 
        metadataJson, 
        parentId,
        destination 
      } = req.body;
      
      // Create a new inscription status entry first
      let inscriptionStatusId = '';
      try {
        // Create a new inscription status entry
        const createResponse = await fetch(`http://localhost:${process.env.PORT || 3000}/api/inscriptions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileName: fileName || 'Unknown file',
            fileType: fileType || 'unknown',
            satoshiType: satoshiType || undefined,
            command: command,
          }),
        });
        
        if (createResponse.ok) {
          const inscriptionStatus = await createResponse.json();
          inscriptionStatusId = inscriptionStatus.id;
          console.log('Created inscription status entry:', inscriptionStatusId);
        }
      } catch (error) {
        console.error('Error creating inscription status:', error);
        // Continue with the inscription even if status creation fails
      }
      
      // If metadata is provided, handle it
      let metadataPath = '';
      let modifiedCommand = command;
      
      if (includeMetadata && metadataJson) {
        try {
          // Create a unique name for the metadata file
          const metadataFileName = `metadata-${Date.now()}.json`;
          metadataPath = path.join(os.tmpdir(), metadataFileName);
          
          // Write metadata to a temporary file
          await fsPromises.writeFile(metadataPath, metadataJson);
          console.log(`Metadata written to temporary file: ${metadataPath}`);
          
          // Modify the command to include the metadata flag
          modifiedCommand = modifiedCommand.replace(
            /ord wallet inscribe/,
            `ord wallet inscribe --metadata="${metadataPath}"`
          );
        } catch (err) {
          console.error('Error handling metadata:', err);
        }
      }
      
      // Add parent ID if provided and not already in the command
      if (parentId && !modifiedCommand.includes('--parent')) {
        modifiedCommand = modifiedCommand.replace(
          /ord wallet inscribe/,
          `ord wallet inscribe --parent=${parentId}`
        );
      }
      
      // Add destination if provided and not already in the command
      if (destination && !modifiedCommand.includes('--destination')) {
        modifiedCommand = modifiedCommand.replace(
          /ord wallet inscribe/,
          `ord wallet inscribe --destination=${destination}`
        );
      }
      
      // Execute the inscription command with metadata if provided
      const result = await execCommand(modifiedCommand);
      
      // Clean up temporary metadata file if created
      if (metadataPath) {
        fsPromises.unlink(metadataPath).catch(err => {
          console.error('Error removing temporary metadata file:', err);
        });
      }
      
      // Update the inscription status if we created one
      if (inscriptionStatusId) {
        try {
          const status = result.error ? 'failed' : (result.output.includes('transaction') ? 'pending' : 'success');
          
          // Parse inscription details
          let txid = undefined;
          const txMatch = result.output.match(/transaction: ([a-f0-9]+)/i);
          if (txMatch && txMatch[1]) txid = txMatch[1];
          
          let ordinalId = undefined;
          const ordMatch = result.output.match(/inscription: ([a-f0-9]+i\d+)/i);
          if (ordMatch && ordMatch[1]) ordinalId = ordMatch[1];
          
          // Update the inscription status
          await fetch(`http://localhost:${process.env.PORT || 3000}/api/inscriptions/${inscriptionStatusId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status,
              txid: txid,
              ordinalId: ordinalId,
              error: result.error ? result.output : undefined,
            }),
          });
        } catch (updateError) {
          console.error('Error updating inscription status:', updateError);
          // Continue with the response even if status update fails
        }
      }
      
      // Stop the web server as we're done
      await stopWebServer();
      
      if (result.error) {
        return res.status(500).json({
          error: true,
          output: result.output,
          inscriptionStatusId,
        });
      }
      
      // Parse results for response
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
      
      res.json({
        error: false,
        output: result.output,
        inscriptionId,
        transactionId,
        feePaid,
        inscriptionStatusId
      });
    } catch (error) {
      console.error('Error inscribing file:', error);
      res.status(500).json({ 
        error: true,
        output: String(error)
      });
    }
  });

  // SNS (Satoshi Name Service) name check
  app.get('/api/sns/name/check', async (req, res) => {
    try {
      const { name } = req.query;
      
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'SNS name is required' });
      }
      
      // In a production environment, this would call the Geniidata API to check name availability
      // For now, we'll return mock data since the API key would be required for actual integration
      
      // Mock logic to simulate name availability
      const isAvailable = name.length >= 5 && 
                          !['bitcoin', 'satoshi', 'ordinal', 'ord'].includes(name.toLowerCase());
      
      res.json({
        name,
        isAvailable,
        status: isAvailable ? 'available' : 'taken',
        // If it's taken, provide some owner info (this would come from the actual API)
        owner: isAvailable ? undefined : '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        message: isAvailable 
          ? `The name "${name}" is available for registration` 
          : `The name "${name}" is already registered`
      });
    } catch (error) {
      console.error('Error checking SNS name:', error);
      res.status(500).json({ error: 'Failed to check SNS name availability' });
    }
  });
  
  // SNS name registration endpoint
  app.post('/api/sns/register', async (req, res) => {
    try {
      const { name } = req.body;
      
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'SNS name is required' });
      }
      
      // Check if we have an API key for Geniidata in environment variables
      const apiKey = process.env.GENIIDATA_API_KEY;
      
      if (!apiKey) {
        return res.status(403).json({
          error: 'Geniidata API key not configured',
          message: 'Please set the GENIIDATA_API_KEY environment variable to register SNS names'
        });
      }
      
      // In a production environment, this would call the Geniidata API to register the name
      // For now, we'll simulate a successful registration
      
      res.json({
        success: true,
        name,
        status: 'pending',
        message: `Registration for "${name}" has been submitted and is pending confirmation`
      });
    } catch (error) {
      console.error('Error registering SNS name:', error);
      res.status(500).json({ error: 'Failed to register SNS name' });
    }
  });

  // Get Umbrel environment information
  app.get('/api/umbrel/info', async (req, res) => {
    try {
      const isUmbrel = isUmbrelEnvironment();
      const umbrelFileLocation = process.env.UMBREL_FILE_LOCATION || null;
      const ordContainerName = getOrdContainerName();
      const ordApiUrl = getOrdApiUrl();
      const localIp = getLocalIpAddress();
      
      // Try to detect Umbrel version and setup
      let umbrelVersion = 'unknown';
      let fileAccessMethod = 'unknown';
      
      // Check if we can access common Umbrel environment locations
      try {
        const { execSync } = require('child_process');
        // Try to detect Umbrel version
        const versionCheck = execSync('cat /umbrel/info.json 2>/dev/null || echo "not found"').toString();
        if (!versionCheck.includes('not found')) {
          try {
            const umbrelInfo = JSON.parse(versionCheck);
            umbrelVersion = umbrelInfo.version || 'detected';
          } catch (e) {
            umbrelVersion = 'detected';
          }
        }
      } catch (err) {
        // Ignore errors
      }
      
      // Determine file access method
      if (umbrelFileLocation) {
        fileAccessMethod = 'shared_volume';
      } else if (isUmbrel) {
        fileAccessMethod = 'direct_container';
      } else {
        fileAccessMethod = 'web_server';
      }
      
      res.json({
        isUmbrel,
        umbrelVersion,
        umbrelFileLocation,
        fileAccessMethod,
        ordContainerName,
        ordApiUrl,
        localIp,
        env: {
          DIRECT_CONNECT: process.env.DIRECT_CONNECT === 'true',
          BTC_SERVER_AVAILABLE: process.env.BTC_SERVER_AVAILABLE === 'true',
          ORD_SERVER_AVAILABLE: process.env.ORD_SERVER_AVAILABLE === 'true',
          USE_APP_PROXY: process.env.USE_APP_PROXY === 'true',
          ORD_RPC_HOST: process.env.ORD_RPC_HOST || 'not set',
          ORD_RPC_PORT: process.env.ORD_RPC_PORT || 'not set',
        },
        recommendations: {
          setupUmbrelFileLocation: !umbrelFileLocation && isUmbrel,
          useAppProxy: process.env.USE_APP_PROXY !== 'true' && isUmbrel,
        }
      });
    } catch (error) {
      console.error('Error getting Umbrel environment info:', error);
      res.status(500).json({ 
        error: true, 
        message: String(error)
      });
    }
  });

  const httpServer = createServer(app);

  // If we're in Umbrel environment, add a health check endpoint for Bitcoin and Ord services
  if (isUmbrelEnvironment()) {
    app.get('/api/umbrel/health', async (req, res) => {
      try {
        // Check Bitcoin RPC connection
        const btcResponse = await fetch(getBitcoinRpcUrl(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '1.0',
            id: 'health-check',
            method: 'getblockchaininfo',
            params: []
          })
        });
        
        const btcStatus = await btcResponse.json();
        
        // Check Ord connection
        let ordResponse;
        let ordStatus;
        
        try {
          // First try with /status endpoint
          ordResponse = await fetch(`${getOrdApiUrl()}/status`);
          ordStatus = await ordResponse.json();
        } catch (error) {
          console.log('Error with /status endpoint, trying root endpoint for Umbrel Ord container...');
          try {
            // For Umbrel Ord container, try the root endpoint
            ordResponse = await fetch(getOrdApiUrl());
            ordStatus = await ordResponse.json();
          } catch (innerError) {
            console.error('Failed to connect to Ord API:', innerError);
            throw new Error('Failed to connect to Ord API');
          }
        }
        
        res.json({
          bitcoin: {
            connected: true,
            chain: btcStatus.result.chain,
            blocks: btcStatus.result.blocks,
            headers: btcStatus.result.headers,
            verification_progress: btcStatus.result.verificationprogress
          },
          ord: {
            connected: true,
            version: ordStatus.version,
            indexHeight: ordStatus.index_height,
            inscriptions: ordStatus.inscription_count
          }
        });
      } catch (err) {
        console.error('Health check error:', err);
        res.status(500).json({
          bitcoin: { connected: false },
          ord: { connected: false },
          error: err instanceof Error ? err.message : 'Unknown error occurred'
        });
      }
    });
    
    // Add a direct ord command endpoint for Umbrel users
    app.post('/api/umbrel/ord/inscribe', async (req, res) => {
      try {
        const { 
          filePath, 
          destination, 
          feeRate,
          metadataFilePath,
          contentType,
          satPoint,
          dryRun
        } = req.body;
        
        if (!filePath) {
          return res.status(400).json({ error: 'File path is required' });
        }
        
        // Construct the direct command to the Ord service
        const ordUrl = `${getOrdApiUrl()}/inscribe`;
        
        // Build the request body
        const requestBody: any = {
          file: filePath,
          fee_rate: feeRate || 10,
        };
        
        if (destination) requestBody.destination = destination;
        if (metadataFilePath) requestBody.metadata = metadataFilePath;
        if (contentType) requestBody.content_type = contentType;
        if (satPoint) requestBody.sat_point = satPoint;
        // Support for rare sat selection
        if (req.body.useSatRarity && req.body.selectedSatoshi) {
          requestBody.sat = req.body.selectedSatoshi;
        }
        if (dryRun) requestBody.dry_run = true;
        
        const response = await fetch(ordUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });
        
        const result = await response.json();
        res.json(result);
        
      } catch (err) {
        console.error('Error executing Ord command:', err);
        res.status(500).json({ 
          error: err instanceof Error ? err.message : 'Unknown error occurred'
        });
      }
    });
  }

  // Direct file transfer for Umbrel
  app.post('/api/umbrel/copy-to-container', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      console.log('======= UMBREL FILE COPY START =======');
      const file = req.file;
      let filePath = file.path;
      const originalFileName = path.basename(file.path);
      
      console.log(`File: ${originalFileName} (${file.size} bytes)`);
      console.log(`MIME type: ${file.mimetype}`);
      
      // Parse config if present
      const config = req.body.config ? JSON.parse(req.body.config) : {};
      
      // Optimize image if needed
      if (config.optimizeImage && 
          file.mimetype.match(/^image\/(jpeg|jpg|png)$/) && 
          file.size > (46 * 1024)) {
        try {
          const newFileName = path.basename(file.path, path.extname(file.path)) + '.webp';
          const newFilePath = path.join(path.dirname(file.path), newFileName);
          
          console.log(`Optimizing image to WebP: ${newFilePath}`);
          await sharp(file.path)
            .resize(1000)
            .webp({ 
              quality: 80,
              lossless: false,
              nearLossless: false,
              effort: 6
            })
            .toFile(newFilePath);
          
          const optimizedStats = await fsPromises.stat(newFilePath);
          
          if (optimizedStats.size < file.size) {
            filePath = newFilePath;
            console.log(`Optimized ${originalFileName} from ${formatByteSize(file.size)} to ${formatByteSize(optimizedStats.size)}`);
          } else {
            await fsPromises.unlink(newFilePath).catch(() => {});
            console.log(`Optimization did not reduce file size, using original`);
          }
        } catch (err) {
          console.error('Error optimizing image:', err);
        }
      }
      
      const fileName = path.basename(filePath);
      
      // Get container name and path from request or use defaults
      const containerName = req.body.containerName || getOrdContainerName();
      const containerPath = req.body.containerPath || '/ord/data/';
      
      console.log(`Container: ${containerName}, Path: ${containerPath}`);
      
      // Execute the docker cp command
      const copyResult = await execCommand(`docker cp "${filePath}" ${containerName}:${containerPath}${fileName}`);
      
      if (copyResult.error) {
        console.error('Error copying file to container:', copyResult.output);
        
        // Try to get more debugging information
        const containerExists = await execCommand(`docker ps -q -f name=${containerName}`);
        
        return res.status(500).json({
          error: true,
          output: copyResult.output,
          containerExists: !containerExists.error && containerExists.output.trim() !== '',
          suggestion: "Container might not exist or path might not be accessible"
        });
      }
      
      // Verify file exists in container
      const verifyResult = await execCommand(`docker exec ${containerName} ls -la ${containerPath}${fileName} 2>/dev/null || echo "File not found"`);
      const fileExists = !verifyResult.error && !verifyResult.output.includes('File not found');
      
      // Return success
      res.json({
        error: false,
        output: `File successfully copied to container at ${containerPath}${fileName}`,
        containerPath: `${containerPath}${fileName}`,
        verified: fileExists,
        nextStep: "You can now use this path in your inscription command"
      });
    } catch (error) {
      console.error('Error in file copy:', error);
      res.status(500).json({ 
        error: true,
        output: String(error)
      });
    }
  });
  
  // Direct umbrel inscribe endpoint that handles all steps
  app.post('/api/umbrel/inscribe-direct', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      console.log('======= UMBREL DIRECT INSCRIBE START =======');
      const file = req.file;
      let filePath = file.path;
      const originalFileName = path.basename(file.path);
      
      console.log(`File: ${originalFileName} (${file.size} bytes)`);
      console.log(`MIME type: ${file.mimetype}`);
      
      // Parse config if present
      const config = req.body.config ? JSON.parse(req.body.config) : {};
      
      // Optimize image if needed
      if (config.optimizeImage && 
          file.mimetype.match(/^image\/(jpeg|jpg|png)$/) && 
          file.size > (46 * 1024)) {
        try {
          const newFileName = path.basename(file.path, path.extname(file.path)) + '.webp';
          const newFilePath = path.join(path.dirname(file.path), newFileName);
          
          console.log(`Optimizing image to WebP: ${newFilePath}`);
          await sharp(file.path)
            .resize(1000)
            .webp({ 
              quality: 80,
              lossless: false,
              nearLossless: false,
              effort: 6
            })
            .toFile(newFilePath);
          
          const optimizedStats = await fsPromises.stat(newFilePath);
          
          if (optimizedStats.size < file.size) {
            filePath = newFilePath;
            console.log(`Optimized ${originalFileName} from ${formatByteSize(file.size)} to ${formatByteSize(optimizedStats.size)}`);
          } else {
            await fsPromises.unlink(newFilePath).catch(() => {});
            console.log(`Optimization did not reduce file size, using original`);
          }
        } catch (err) {
          console.error('Error optimizing image:', err);
        }
      }
      
      const fileName = path.basename(filePath);
      
      // Get container name and path from request or use defaults
      const containerName = req.body.containerName || getOrdContainerName();
      const containerPath = req.body.containerPath || '/ord/data/';
      
      console.log(`Container: ${containerName}, Path: ${containerPath}`);
      
      // Execute the docker cp command
      const copyResult = await execCommand(`docker cp "${filePath}" ${containerName}:${containerPath}${fileName}`);
      
      if (copyResult.error) {
        console.error('Error copying file to container:', copyResult.output);
        
        // Try to get more debugging information
        const containerExists = await execCommand(`docker ps -q -f name=${containerName}`);
        
        return res.status(500).json({
          error: true,
          output: copyResult.output,
          containerExists: !containerExists.error && containerExists.output.trim() !== '',
          suggestion: "Container might not exist or path might not be accessible"
        });
      }
      
      // Handle metadata if needed
      let metadataPath = null;
      
      if (config.includeMetadata && config.metadataJson) {
        try {
          // Create metadata file
          const metadataFileName = `metadata_${Date.now()}.json`;
          const metadataFilePath = path.join(os.tmpdir(), metadataFileName);
          
          // Write metadata to file
          await fsPromises.writeFile(metadataFilePath, config.metadataJson, 'utf8');
          
          // Copy to container
          await execCommand(`docker cp "${metadataFilePath}" ${containerName}:${containerPath}${metadataFileName}`);
          
          metadataPath = `${containerPath}${metadataFileName}`;
          console.log(`Metadata file copied to: ${metadataPath}`);
        } catch (err) {
          console.error('Error handling metadata:', err);
        }
      }
      
      // Build inscription command
      let inscribeCommand = `docker exec -it ${containerName} ord wallet inscribe --fee-rate ${config.feeRate || 10} --file ${containerPath}${fileName}`;
      
      // Add options
      if (config.destination) inscribeCommand += ` --destination ${config.destination}`;
      if (config.parentId) inscribeCommand += ` --parent ${config.parentId}`;
      if (metadataPath) inscribeCommand += ` --metadata ${metadataPath}`;
      if (config.useSatRarity && config.selectedSatoshi) inscribeCommand += ` --sat ${config.selectedSatoshi}`;
      
      // Return the command to be executed by the user
      res.json({
        error: false,
        output: `File successfully copied to container at ${containerPath}${fileName}`,
        inscribeCommand,
        containerFilePath: `${containerPath}${fileName}`,
        metadataPath,
        nextStep: "Execute the inscription command in your terminal"
      });
    } catch (error) {
      console.error('Error in direct inscription:', error);
      res.status(500).json({ 
        error: true,
        output: String(error)
      });
    }
  });

  // Find the docker-inscribe endpoint and update it with better error handling
  app.post('/api/docker-inscribe', upload.single('file'), async (req, res) => {
    // Add a timeout handler to send an error response if the operation takes too long
    const timeoutId = setTimeout(() => {
      console.error('Timeout in /api/docker-inscribe endpoint');
      // Only send response if it hasn't been sent already
      if (!res.headersSent) {
        res.status(504).json({ 
          success: false,
          message: "Operation timed out. This may happen with large files. Try optimizing the image or reducing file size."
        });
      }
    }, 180000); // 3 minute timeout for the entire operation
    
    try {
      // Check if a file was uploaded
      if (!req.file) {
        clearTimeout(timeoutId);
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      // Log file information
      console.log(`File upload received: ${req.file.originalname}, size: ${formatByteSize(req.file.size)}`);
      
      // Parse configuration from request body
      const config = req.body || {};
      
      // Set up file paths
      let filePath = req.file.path;
      let fileName = req.file.originalname;
      
      // Handle image optimization if requested
      if (
        config.optimizeImage === 'true' && 
        req.file.size > 46 * 1024 && // Only optimize if larger than 46KB
        (req.file.mimetype === 'image/jpeg' || req.file.mimetype === 'image/png')
      ) {
        try {
          console.log(`Attempting to optimize image: ${fileName}`);
          
          // Create optimized file path
          const optimizedFilePath = `${filePath}.webp`;
          
          // Use sharp to convert to WebP with quality settings
          await sharp(filePath)
            .webp({ quality: 80 })
            .toFile(optimizedFilePath);
          
          // Check if the optimized file is actually smaller
          const stats = await fs.promises.stat(optimizedFilePath);
          if (stats.size < req.file.size) {
            console.log(`Optimization successful: ${formatByteSize(req.file.size)} -> ${formatByteSize(stats.size)}`);
            filePath = optimizedFilePath;
            fileName = `${path.parse(fileName).name}.webp`;
          } else {
            console.log('Optimized file is not smaller, using original file');
            await fs.promises.unlink(optimizedFilePath).catch(() => {});
          }
        } catch (error) {
          console.error('Error optimizing image:', error);
          // Continue with the original file if optimization fails
        }
      }
      
      // Get container name
      const containerName = getOrdContainerName();
      const containerPath = '/ord/data/';
      
      console.log(`Container: ${containerName}, Path: ${containerPath}`);
      
      // First verify the container exists with a short timeout
      const containerCheck = await execCommand(`docker ps -q -f name=${containerName}`, 5000);
      if (containerCheck.error || containerCheck.output.trim() === '') {
        clearTimeout(timeoutId);
        return res.status(500).json({
          success: false,
          message: `Container "${containerName}" does not exist or is not running.`,
          details: containerCheck.output
        });
      }
      
      // Copy the file to the container using our safe copy function
      const destinationPath = `${containerPath}${fileName}`;
      const copyResult = await safeContainerCopy(filePath, containerName, destinationPath);
      
      if (copyResult.error) {
        clearTimeout(timeoutId);
        return res.status(500).json({ 
          success: false,
          message: `Failed to copy file to container. ${copyResult.output}`,
          details: "This may be due to a connection issue with the Ordinals container. Please check Umbrel logs for details."
        });
      }
      
      // Handle metadata if provided
      let metadataPath = '';
      if (config.metadataJson) {
        try {
          const metadataFileName = `${path.parse(fileName).name}_metadata_${Date.now()}.json`;
          const localMetadataPath = path.join(path.dirname(filePath), metadataFileName);
          
          // Write metadata to a temporary file
          await fs.promises.writeFile(localMetadataPath, config.metadataJson);
          
          // Copy the metadata file to the container using our safe copy function
          const metadataDestPath = `${containerPath}${metadataFileName}`;
          const metadataCopyResult = await safeContainerCopy(localMetadataPath, containerName, metadataDestPath);
          
          if (metadataCopyResult.error) {
            console.error('Error copying metadata to container:', metadataCopyResult.output);
            // Continue without metadata if there's an error
          } else {
            metadataPath = `${containerPath}${metadataFileName}`;
            console.log(`Metadata file copied to container: ${metadataPath}`);
          }
        } catch (error) {
          console.error('Error handling metadata:', error);
          // Continue without metadata if there's an error
        }
      }
      
      // Construct the inscription command
      const filePathInContainer = `${containerPath}${fileName}`;
      let command = `docker exec ${containerName} ord wallet inscribe --file="${filePathInContainer}"`;
      
      // Add fee rate if provided
      if (config.feeRate) {
        command += ` --fee-rate=${config.feeRate}`;
      }
      
      // Add destination if provided
      if (config.destination) {
        command += ` --destination="${config.destination}"`;
      }
      
      // Add parent ID if provided
      if (config.parentId) {
        command += ` --parent="${config.parentId}"`;
      }
      
      // Add metadata if provided
      if (metadataPath) {
        command += ` --metadata="${metadataPath}"`;
      }
      
      // Add sat control if requested
      if (config.useSatRarity === 'true' && config.selectedSatoshi) {
        command += ` --sat="${config.selectedSatoshi}"`;
      }
      
      // Add no-limit check if requested
      if (config.noLimitCheck === 'true') {
        command += ` --no-limit-check`;
      }
      
      // Add dry-run if requested
      if (config.dryRun === 'true') {
        command += ` --dry-run`;
      }
      
      // If auto-execute is requested, run the command and parse the output
      if (config.autoExecute === 'true') {
        try {
          console.log(`Auto-executing inscription command: ${command}`);
          
          // Use execCommand with a timeout instead of execSync
          const inscribeResult = await execCommand(command, 180000); // 3 minute timeout for inscription
          
          if (inscribeResult.error) {
            clearTimeout(timeoutId);
            return res.status(500).json({
              success: false,
              message: `Error executing inscription command: ${inscribeResult.output}`,
              command
            });
          }
          
          const output = inscribeResult.output;
          
          // Parse the output to extract inscriptionId and transactionId
          const inscriptionIdMatch = output.match(/inscription: ([a-zA-Z0-9]+)i/);
          const transactionIdMatch = output.match(/transaction: ([a-zA-Z0-9]+)/);
          const feePaidMatch = output.match(/fee: ([0-9.]+) sats/);
          
          // Clear the timeout as we're about to send the response
          clearTimeout(timeoutId);
          
          const result = {
            success: true,
            output,
            command,
            filePath: filePathInContainer,
            metadataPath: metadataPath || undefined,
            inscriptionId: inscriptionIdMatch ? inscriptionIdMatch[1] : undefined,
            transactionId: transactionIdMatch ? transactionIdMatch[1] : undefined,
            feePaid: feePaidMatch ? feePaidMatch[1] : undefined
          };
          
          return res.json(result);
        } catch (error) {
          clearTimeout(timeoutId);
          return res.status(500).json({
            success: false,
            message: `Error executing inscription command: ${error instanceof Error ? error.message : String(error)}`,
            command
          });
        }
      }
      
      // Clear the timeout as we're about to send the response
      clearTimeout(timeoutId);
      
      // If not auto-executing, just return the command
      return res.json({
        success: true,
        message: 'File copied to container successfully. Please run the following command in your terminal:',
        command,
        filePath: filePathInContainer,
        metadataPath: metadataPath || undefined
      });
    } catch (error) {
      // Clear the timeout
      clearTimeout(timeoutId);
      
      console.error('Error in docker-inscribe endpoint:', error);
      return res.status(500).json({
        success: false,
        message: `Server error: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  });

  // Helper function to check if a container exists
  function checkContainerExists(containerName: string): boolean {
    try {
      const output = execSync(`docker ps -q -f name=${containerName}`, { encoding: 'utf8' });
      return output.trim() !== '';
    } catch (error) {
      console.error(`Error checking if container exists: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  // Add a container status check endpoint for diagnostics
  app.get('/api/container/status', async (req, res) => {
    try {
      const containerName = getOrdContainerName();
      console.log(`Checking status of container: ${containerName}`);
      
      // First check if the container exists
      const containerCheck = await execCommand(`docker ps -q -f name=${containerName}`, 5000);
      const containerExists = !containerCheck.error && containerCheck.output.trim() !== '';
      
      if (!containerExists) {
        return res.json({
          status: 'error',
          containerName,
          exists: false,
          message: `Container "${containerName}" does not exist or is not running.`,
          details: containerCheck.output
        });
      }
      
      // Get basic container info
      const containerInfo = await execCommand(`docker inspect ${containerName} --format '{{.State.Status}}'`, 5000);
      const containerStatus = containerInfo.error ? 'unknown' : containerInfo.output.trim();
      
      // Check if we can execute commands inside the container
      const containerTest = await execCommand(`docker exec ${containerName} echo "Container is responsive"`, 10000);
      const containerResponsive = !containerTest.error && containerTest.output.includes('responsive');
      
      // Check if ord is available
      const ordTest = await execCommand(`docker exec ${containerName} ord --version`, 10000);
      const ordAvailable = !ordTest.error && ordTest.output.includes('ord');
      
      // Check if the data directory exists and is writable
      const dataDirTest = await execCommand(`docker exec ${containerName} mkdir -p /ord/data/ && touch /ord/data/.test && echo success`, 10000);
      const dataDirWritable = !dataDirTest.error && dataDirTest.output.includes('success');
      
      // Check container stats for memory/CPU usage
      const containerStats = await execCommand(`docker stats ${containerName} --no-stream --format "{{.MemUsage}},{{.CPUPerc}}"`, 10000);
      let memoryUsage = 'unknown';
      let cpuUsage = 'unknown';
      
      if (!containerStats.error) {
        const parts = containerStats.output.split(',');
        if (parts.length >= 2) {
          memoryUsage = parts[0].trim();
          cpuUsage = parts[1].trim();
        }
      }
      
      // Get system resource information
      const systemMemory = await execCommand('free -h', 5000);
      const systemLoad = await execCommand('uptime', 5000);
      
      // Construct the response
      const response = {
        status: containerResponsive ? 'ok' : 'unresponsive',
        containerName,
        exists: true,
        containerStatus,
        containerResponsive,
        ordAvailable,
        dataDirWritable,
        resources: {
          memoryUsage,
          cpuUsage,
          systemMemory: systemMemory.error ? 'unavailable' : systemMemory.output,
          systemLoad: systemLoad.error ? 'unavailable' : systemLoad.output
        },
        timestamp: new Date().toISOString()
      };
      
      return res.json(response);
    } catch (error) {
      console.error('Error checking container status:', error);
      return res.status(500).json({
        status: 'error',
        message: `Error checking container status: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  });

  // Check if curl is available in the container and provide fallback if needed
  async function checkCurlAvailability(containerName: string): Promise<boolean> {
    try {
      console.log(`Checking if curl is available in container ${containerName}...`);
      const result = await execCommand(`docker exec ${containerName} which curl`, 5000);
      const hasCurl = !result.error && result.output.includes('curl');
      console.log(`Curl availability in ${containerName}: ${hasCurl ? 'Available' : 'Not available'}`);
      return hasCurl;
    } catch (error) {
      console.error('Error checking curl availability:', error);
      return false;
    }
  }

  // Safe file copy to container that works in Umbrel environment
  async function safeContainerCopy(sourceFilePath: string, containerName: string, destinationPath: string): Promise<CommandResult> {
    console.log(`Copying file from ${sourceFilePath} to ${containerName}:${destinationPath}`);
    
    // Check if container exists
    const containerExists = checkContainerExists(containerName);
    if (!containerExists) {
      return {
        error: true,
        output: `Container ${containerName} does not exist or is not running.`
      };
    }
    
    // Check if curl is available
    const hasCurl = await checkCurlAvailability(containerName);
    
    if (!hasCurl) {
      // Use docker cp as fallback
      console.log('Curl not available, using docker cp instead');
      return await execCommand(`docker cp "${sourceFilePath}" ${containerName}:${destinationPath}`, 120000);
    } else {
      // Curl is available, but we'll use docker cp anyway for consistency
      console.log('Using docker cp for file transfer (safer option)');
      return await execCommand(`docker cp "${sourceFilePath}" ${containerName}:${destinationPath}`, 120000);
    }
  }

  // Add a diagnostic endpoint for Umbrel connectivity issues
  app.get('/api/umbrel/diagnostics', async (req, res) => {
    try {
      const results = {
        timestamp: new Date().toISOString(),
        umbrelEnvironment: true,
        checks: [] as Array<{name: string, status: 'success' | 'warning' | 'error', details: string}>
      };
      
      // Check 1: Container detection
      const containerName = getOrdContainerName();
      results.checks.push({
        name: 'Container Detection',
        status: containerName ? 'success' : 'error',
        details: containerName ? `Detected container: ${containerName}` : 'Failed to detect Ordinals container'
      });
      
      // Check 2: Container existence
      const containerExists = checkContainerExists(containerName);
      results.checks.push({
        name: 'Container Existence',
        status: containerExists ? 'success' : 'error',
        details: containerExists ? `Container ${containerName} exists and is running` : `Container ${containerName} does not exist or is not running`
      });
      
      // If container doesn't exist, no need to continue with other checks
      if (!containerExists) {
        return res.json({
          ...results,
          recommendations: [
            'Check if the Ordinals app is properly installed in your Umbrel',
            'Restart the Ordinals app from the Umbrel dashboard',
            'Check Umbrel logs for any errors related to the Ordinals app'
          ]
        });
      }
      
      // Check 3: Container responsiveness
      const testCommand = await execCommand(`docker exec ${containerName} echo "test"`, 5000);
      results.checks.push({
        name: 'Container Responsiveness',
        status: !testCommand.error ? 'success' : 'error',
        details: !testCommand.error ? 'Container is responsive' : `Container is not responding: ${testCommand.output}`
      });
      
      // Check 4: Ord command availability
      const ordCommand = await execCommand(`docker exec ${containerName} which ord`, 5000);
      results.checks.push({
        name: 'Ord Command',
        status: !ordCommand.error && ordCommand.output.includes('ord') ? 'success' : 'error',
        details: !ordCommand.error && ordCommand.output.includes('ord') 
          ? `Ord command found at: ${ordCommand.output.trim()}` 
          : 'Ord command not found in container'
      });
      
      // Check 5: Curl availability (for reference)
      const curlAvailable = await checkCurlAvailability(containerName);
      results.checks.push({
        name: 'Curl Availability',
        status: curlAvailable ? 'success' : 'warning',
        details: curlAvailable 
          ? 'Curl is available in the container' 
          : 'Curl is not available in the container (using docker cp instead)'
      });
      
      // Check 6: Data directory access
      const dataDirCheck = await execCommand(`docker exec ${containerName} ls -la /ord/data 2>&1 || echo "Directory access failed"`, 5000);
      results.checks.push({
        name: 'Data Directory Access',
        status: !dataDirCheck.error && !dataDirCheck.output.includes('failed') ? 'success' : 'error',
        details: !dataDirCheck.error && !dataDirCheck.output.includes('failed')
          ? 'Data directory is accessible'
          : `Data directory access failed: ${dataDirCheck.output}`
      });
      
      // Check 7: File write permission test
      const writeTestResult = await execCommand(
        `docker exec ${containerName} touch /ord/data/.test_${Date.now()} && echo "Write successful" || echo "Write failed"`, 
        5000
      );
      results.checks.push({
        name: 'Write Permission Test',
        status: writeTestResult.output.includes('successful') ? 'success' : 'error',
        details: writeTestResult.output.includes('successful')
          ? 'Write permission test successful'
          : `Write permission test failed: ${writeTestResult.output}`
      });
      
      // Check 8: Container resources
      const resourceCheck = await execCommand(`docker stats ${containerName} --no-stream --format "{{.CPUPerc}},{{.MemUsage}}"`, 5000);
      if (!resourceCheck.error) {
        const [cpu, memory] = resourceCheck.output.split(',');
        const cpuPerc = parseFloat(cpu.replace('%', ''));
        results.checks.push({
          name: 'Resource Usage',
          status: cpuPerc > 80 ? 'warning' : 'success',
          details: `CPU: ${cpu.trim()}, Memory: ${memory.trim()}`
        });
      } else {
        results.checks.push({
          name: 'Resource Usage',
          status: 'warning',
          details: `Could not check resource usage: ${resourceCheck.output}`
        });
      }
      
      // Generate recommendations based on results
      const recommendations: string[] = [];
      const errors = results.checks.filter(check => check.status === 'error');
      
      if (errors.length > 0) {
        recommendations.push('Restart the Ordinals app from the Umbrel dashboard');
        
        if (errors.some(e => e.name === 'Data Directory Access' || e.name === 'Write Permission Test')) {
          recommendations.push('Check file permissions in the Ordinals container');
          recommendations.push('You may need to run: docker exec -it ordinals_ord_1 chmod -R 777 /ord/data');
        }
        
        if (errors.some(e => e.name === 'Ord Command')) {
          recommendations.push('Verify the Ordinals app is correctly installed and configured');
        }
      }
      
      // Add fallback recommendations
      if (recommendations.length === 0) {
        if (results.checks.some(c => c.name === 'Curl Availability' && c.status === 'warning')) {
          recommendations.push('Your setup is working correctly with docker cp instead of curl');
          recommendations.push('This is expected behavior and should not cause any issues');
        } else {
          recommendations.push('Your setup appears to be working correctly');
        }
      }
      
      return res.json({
        ...results,
        recommendations
      });
    } catch (error) {
      console.error('Error in Umbrel diagnostics:', error);
      return res.status(500).json({
        error: true,
        message: 'Error running Umbrel diagnostics',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
}