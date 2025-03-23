import { exec, spawn } from "child_process";
import { promisify } from "util";
import { kill } from "process";
import { networkInterfaces } from "os";

const execPromise = promisify(exec);

// To keep track of our web server process
let serverProcess: ReturnType<typeof spawn> | null = null;

interface CommandResult {
  error: boolean;
  output: string;
}

interface NetworkDiagnosticResult {
  interfaces: Array<{
    name: string;
    address: string;
    family: string;
    internal: boolean;
  }>;
  containerConnectivity: {
    containerExists: boolean;
    containerInfo?: string;
    canPing?: boolean;
  };
  hostConnectivity: {
    dockerHost: boolean;
    internet: boolean;
  };
}

/**
 * Execute a shell command
 */
export async function execCommand(command: string): Promise<CommandResult> {
  try {
    const { stdout, stderr } = await execPromise(command, { timeout: 30000 });
    
    return {
      error: false,
      output: stdout || stderr
    };
  } catch (error) {
    console.error(`Command execution failed: ${command}`, error);
    return {
      error: true,
      output: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Run a diagnostic check on network connectivity
 */
export async function checkNetworkConnectivity(containerName?: string): Promise<NetworkDiagnosticResult> {
  const result: NetworkDiagnosticResult = {
    interfaces: [],
    containerConnectivity: {
      containerExists: false,
    },
    hostConnectivity: {
      dockerHost: false,
      internet: false,
    }
  };
  
  // Get network interfaces
  try {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
      const interfaces = nets[name];
      if (!interfaces) continue;
      
      for (const netInterface of interfaces) {
        if (netInterface.family === 'IPv4') {
          result.interfaces.push({
            name,
            address: netInterface.address,
            family: netInterface.family,
            internal: netInterface.internal
          });
        }
      }
    }
  } catch (error) {
    console.error('Error getting network interfaces:', error);
  }
  
  // Check if container exists and can be pinged
  if (containerName) {
    try {
      // Check if we have docker installed
      const dockerCheck = await execCommand('command -v docker || echo "not found"');
      if (dockerCheck.error || dockerCheck.output.includes('not found')) {
        result.containerConnectivity.containerExists = false;
        result.containerConnectivity.containerInfo = 'Docker is not installed or not in PATH';
      } else {
        // Check if container exists
        const containerCheck = await execCommand(`docker ps -q -f name=${containerName}`);
        result.containerConnectivity.containerExists = !containerCheck.error && containerCheck.output.trim() !== '';
        
        // If original container doesn't exist, try with Umbrel naming convention (append '_1')
        if (!result.containerConnectivity.containerExists && !containerName.endsWith('_1')) {
          const umbrelContainerName = `${containerName}_1`;
          console.log(`Container ${containerName} not found, trying Umbrel naming convention: ${umbrelContainerName}`);
          
          const umbrelContainerCheck = await execCommand(`docker ps -q -f name=${umbrelContainerName}`);
          if (!umbrelContainerCheck.error && umbrelContainerCheck.output.trim() !== '') {
            result.containerConnectivity.containerExists = true;
            result.containerConnectivity.containerInfo = `Found container with Umbrel naming convention: ${umbrelContainerName}`;
            
            // Update containerName for further checks
            containerName = umbrelContainerName;
          }
        }
        
        if (result.containerConnectivity.containerExists) {
          // Get container info
          const containerInfo = await execCommand(`docker inspect ${containerName}`);
          if (!containerInfo.error) {
            result.containerConnectivity.containerInfo = containerInfo.output;
            
            // Try to ping the container
            const pingResult = await execCommand(`docker exec ${containerName} echo "Container is responding"`);
            result.containerConnectivity.canPing = !pingResult.error;
          }
        }
      }
    } catch (error) {
      console.error('Error checking container connectivity:', error);
      result.containerConnectivity.containerInfo = `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  
  // Check host.docker.internal connectivity
  try {
    const hostCheck = await execCommand(`ping -c 1 host.docker.internal || echo "Host unreachable"`);
    result.hostConnectivity.dockerHost = !hostCheck.error && !hostCheck.output.includes("Host unreachable");
  } catch (error) {
    console.error('Error checking host.docker.internal:', error);
  }
  
  // Check internet connectivity
  try {
    const internetCheck = await execCommand(`ping -c 1 8.8.8.8 || echo "Internet unreachable"`);
    result.hostConnectivity.internet = !internetCheck.error && !internetCheck.output.includes("Internet unreachable");
  } catch (error) {
    console.error('Error checking internet connectivity:', error);
  }
  
  return result;
}

/**
 * Start a Python HTTP server in the specified directory
 */
export async function startWebServer(directory: string, port = 8000): Promise<CommandResult> {
  try {
    // Kill any existing server process
    if (serverProcess) {
      await stopWebServer();
    }
    
    // Start a new server process
    serverProcess = spawn('python3', ['-m', 'http.server', port.toString()], {
      cwd: directory,
      detached: true,
      stdio: 'pipe'
    });
    
    // Handle errors
    let errorOutput = '';
    serverProcess.stderr?.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    // Wait a bit to ensure server starts
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (errorOutput) {
      return {
        error: true,
        output: errorOutput
      };
    }
    
    return {
      error: false,
      output: `Server started on port ${port}`
    };
  } catch (error) {
    console.error('Failed to start web server:', error);
    return {
      error: true,
      output: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Stop the running HTTP server
 */
export async function stopWebServer(): Promise<void> {
  if (serverProcess) {
    try {
      // Kill the process group
      if (process.platform === 'win32') {
        // Windows
        if (serverProcess.pid) {
          exec(`taskkill /pid ${serverProcess.pid} /T /F`);
        }
      } else {
        // Unix-like
        if (serverProcess.pid) {
          kill(-serverProcess.pid, 'SIGTERM');
        }
      }
    } catch (error) {
      console.error('Error stopping server:', error);
    } finally {
      serverProcess = null;
    }
  }
}
