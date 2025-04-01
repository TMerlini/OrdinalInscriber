import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { execCommand, startWebServer, stopWebServer, checkNetworkConnectivity } from "./cmd-executor";
import { getCacheInfo, clearAllCachedFiles, cleanCacheIfNeeded } from "./cache-manager";
import os from "os";
import { networkInterfaces } from "os";
import sharp from "sharp";
import snsRoutes from "./routes/sns";

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
  return process.env.DIRECT_CONNECT === 'true' && 
         process.env.BTC_SERVER_AVAILABLE === 'true' &&
         process.env.ORD_SERVER_AVAILABLE === 'true';
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
function getOrdApiUrl(): string {
  const host = process.env.ORD_RPC_HOST || 'ord.embassy';
  const port = process.env.ORD_RPC_PORT || '8080';
  
  return `http://${host}:${port}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Log Umbrel environment if detected
  if (isUmbrelEnvironment()) {
    console.log('Running in Umbrel environment with direct connections to Bitcoin and Ord');
    console.log(`Bitcoin RPC endpoint: ${getBitcoinRpcUrl().replace(/:[^:]*@/, ':****@')}`);
    console.log(`Ord API endpoint: ${getOrdApiUrl()}`);
  }
  
  // Mount the SNS routes
  app.use('/api/sns', snsRoutes);
  
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
  
  // Clear all cached files (images and 3D models)
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
        const ordResponse = await fetch(`${getOrdApiUrl()}/status`);
        const ordStatus = await ordResponse.json();
        
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

  return httpServer;
}
