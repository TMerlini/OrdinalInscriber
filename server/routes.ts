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
  // First check if ORD_RPC_HOST is set, which takes precedence for container name
  if (process.env.ORD_RPC_HOST) {
    return process.env.ORD_RPC_HOST; // Use the hostname as container name
  }
  
  // Umbrel environment detection
  if (isUmbrelEnvironment()) {
    // Check for ordinals_app_proxy_1 container, which may be used instead
    if (process.env.USE_APP_PROXY === 'true') {
      console.log('Using app_proxy for Ord access (from environment variable)');
      return 'ordinals_app_proxy_1';
    }
    
    // Default to ordinals_ord_1 for Umbrel v2+
    return 'ordinals_ord_1';
  }
  
  // Default fallback
  return 'bitcoin-ordinals';
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

  // Direct file copy and inscribe in one step
  app.post('/api/docker-inscribe', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      console.log(`===== DIRECT DOCKER INSCRIBE =====`);
      const file = req.file;
      let filePath = file.path;
      const originalFileName = path.basename(file.path);
      
      console.log(`File: ${originalFileName} (${file.size} bytes)`);
      
      // Parse config
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
      const containerName = getOrdContainerName();
      const containerPath = '/ord/data/';
      
      console.log(`Container: ${containerName}`);
      
      // Step 1: Copy file to container
      console.log(`Copying file to container: ${containerName}:${containerPath}${fileName}`);
      const copyResult = await execCommand(`docker cp "${filePath}" ${containerName}:${containerPath}${fileName}`);
      
      if (copyResult.error) {
        console.error(`Error copying file to container: ${copyResult.output}`);
        
        // Check if container exists
        const containerCheck = await execCommand(`docker ps -q -f name=${containerName}`);
        const containerExists = !containerCheck.error && containerCheck.output.trim() !== '';
        
        // Return detailed error
        return res.status(500).json({
          error: true,
          stage: 'file_copy',
          containerExists,
          output: copyResult.output,
          message: `Failed to copy file to container. Please verify the container "${containerName}" is running.`
        });
      }
      
      console.log(`File successfully copied to container`);
      
      // Step 2: Handle metadata if provided
      let metadataPath = null;
      if (config.includeMetadata && config.metadataJson) {
        try {
          const metadataFileName = `metadata_${Date.now()}.json`;
          const metadataFilePath = path.join(os.tmpdir(), metadataFileName);
          
          // Write the metadata JSON to a temporary file
          await fsPromises.writeFile(metadataFilePath, config.metadataJson, 'utf8');
          
          // Copy metadata file to container
          console.log(`Copying metadata to container: ${containerName}:${containerPath}${metadataFileName}`);
          const metadataCopyResult = await execCommand(`docker cp "${metadataFilePath}" ${containerName}:${containerPath}${metadataFileName}`);
          
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
      
      // Check if we should auto-inscribe
      const shouldAutoInscribe = config.autoInscribe === 'true' || config.autoInscribe === true;
      
      if (shouldAutoInscribe) {
        console.log('Auto-inscription requested, executing command...');
        
        // Create a version of the command without -it to avoid TTY errors
        const execInscribeCommand = inscribeCommand.replace('-it', '');
        
        // Execute the inscription command
        const inscribeResult = await execCommand(execInscribeCommand);
        
        if (inscribeResult.error) {
          console.error('Error executing inscription command:', inscribeResult.output);
          return res.status(500).json({
            error: true,
            stage: 'inscription',
            output: inscribeResult.output,
            message: 'Failed to execute inscription command.'
          });
        }
        
        console.log('Inscription output:', inscribeResult.output);
        
        // Parse inscription output to extract important information
        let inscriptionId = null;
        let transactionId = null;
        let feePaid = null;
        
        // Extract inscription ID (format: "inscription_id: <id>")
        const inscriptionMatch = inscribeResult.output.match(/inscription[_\s]+id:?\s+([a-f0-9]+i\d+)/i);
        if (inscriptionMatch) {
          inscriptionId = inscriptionMatch[1];
        }
        
        // Extract transaction ID (format: "transaction_id: <id>")
        const txidMatch = inscribeResult.output.match(/transaction[_\s]+id:?\s+([a-f0-9]+)/i);
        if (txidMatch) {
          transactionId = txidMatch[1];
        }
        
        // Extract fee paid (format: "fee: <amount> sats")
        const feeMatch = inscribeResult.output.match(/fee:?\s+([0-9,]+)\s*sats/i);
        if (feeMatch) {
          feePaid = feeMatch[1].replace(/,/g, '');
        }
        
        // Return success with auto-inscription details
        return res.json({
          error: false,
          output: inscribeResult.output,
          auto_inscribed: true,
          inscriptionId,
          transactionId,
          feePaid,
          containerFilePath: `${containerPath}${fileName}`,
          metadataPath
        });
      }
      
      // If not auto-inscribing, return the command for manual execution
      res.json({
        error: false,
        output: `File successfully copied to container at ${containerPath}${fileName}`,
        auto_inscribed: false,
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

  // Add error logs endpoint
  app.get('/api/logs/errors', (req, res) => {
    try {
      const logs = errorLogger.getRecentLogs();
      const logFilePath = errorLogger.getLogFilePath();
      
      res.json({
        success: true,
        logs,
        logFilePath,
        count: logs.length
      });
    } catch (error) {
      errorLogger.log(error, 'logs_api_error');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve error logs',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Add global error handling middleware
  app.use((err, req, res, next) => {
    if (err) {
      // Log the error
      errorLogger.logApiError(err, req, res);
      
      // Send error response
      res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal Server Error',
        errorId: new Date().getTime()
      });
    } else {
      next();
    }
  });
}