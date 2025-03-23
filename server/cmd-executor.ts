import { exec, spawn } from "child_process";
import { promisify } from "util";
import { kill } from "process";
import { networkInterfaces } from "os";

const execPromise = promisify(exec);

// To keep track of our web server process
let serverProcess: ReturnType<typeof spawn> | null = null;
let activeServerPid: number | null = null; // Added to track the server PID
// Rename to be consistent with our variable names
let webServerProcess: ReturnType<typeof spawn> | null = null;

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
    // Check if we're trying to run a docker command in an environment without docker
    if (command.startsWith('docker ')) {
      // Check if docker is installed
      try {
        await execPromise('command -v docker', { timeout: 2000 });
      } catch (err) {
        return {
          error: true,
          output: "Docker is not available in this environment. This application requires Docker and a Bitcoin Ordinals node to function properly."
        };
      }
    }

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
export async function startWebServer(directory: string, port: number = 8000): Promise<CommandResult> {
  try {
    // Kill any existing python web server or process on the same port
    await execCommand(`lsof -t -i:${port} | xargs kill -9 2>/dev/null || true`);
    await execCommand(`pkill -f "python3 -m http.server ${port}" || true`);
    await execCommand(`pkill -f "serve -s -p ${port}" || true`);

    // Check if Python3 is available
    const pythonCheck = await execCommand('which python3 || which python');
    const pythonCommand = pythonCheck.error ? 'npx serve' : 'python3 -m http.server';

    // Change to the directory and start a HTTP server
    const args = pythonCheck.error 
      ? ['-s', '-p', port.toString()] 
      : ['-m', 'http.server', port.toString()];

    const command = pythonCheck.error ? 'npx' : 'python3';

    console.log(`Starting web server with command: ${command} ${args.join(' ')} in directory ${directory}`);

    const process = spawn(command, args, {
      cwd: directory,
      detached: false, // Changed to false to avoid process detachment issues
      stdio: 'pipe'
    });

    // Store the process for later use
    serverProcess = process;
    webServerProcess = process;

    if (process.pid) {
      activeServerPid = process.pid;
    }

    // Add error handler
    process.on('error', (err) => {
      console.error('Web server process error:', err);
    });

    // Check if server started successfully
    return new Promise((resolve) => {
      // Set a timeout for server startup
      const timeout = setTimeout(() => {
        resolve({
          error: true,
          output: "Timeout starting server"
        });
      }, 5000); // 5 second timeout

      // Check if server is up by attempting to connect to it
      const checkServerUp = () => {
        const net = require('net');
        const client = new net.Socket();

        client.setTimeout(500);

        client.on('connect', () => {
          clearTimeout(timeout);
          client.destroy();
          resolve({
            error: false,
            output: `Serving HTTP on 0.0.0.0 port ${port}...`
          });
        });

        client.on('error', () => {
          // Try again in 500ms if still within timeout window
          setTimeout(checkServerUp, 500);
        });

        client.on('timeout', () => {
          client.destroy();
        });

        client.connect(port, '127.0.0.1');
      };

      // Start checking if server is up
      setTimeout(checkServerUp, 500);
    });
  } catch (error) {
    console.error('Error starting web server:', error);
    return {
      error: true,
      output: String(error)
    };
  }
}

/**
 * Stop the running HTTP server
 */
export async function stopWebServer(): Promise<void> {
  if (serverProcess) {
    console.log('Stopping web server...');
    try {
      // Try standard kill first
      if (serverProcess.pid) {
        console.log(`Killing process with PID ${serverProcess.pid}`);

        // Kill directly
        serverProcess.kill('SIGTERM');

        // As a backup, use system commands
        if (process.platform === 'win32') {
          // Windows
          exec(`taskkill /pid ${serverProcess.pid} /T /F`);
        } else {
          // Unix-like
          exec(`kill -15 ${serverProcess.pid} || kill -9 ${serverProcess.pid}`);
        }
      }

      // Clean up any remaining processes
      const port = 8000; // Default port, we should ideally store the current port
      await execCommand(`lsof -t -i:${port} | xargs kill -9 2>/dev/null || true`);
      await execCommand(`pkill -f "python3 -m http.server" || true`);
      await execCommand(`pkill -f "serve -s -p" || true`);

      console.log('Web server stopped');
    } catch (error) {
      console.error('Error stopping server:', error);
    } finally {
      serverProcess = null;
      webServerProcess = null;
      activeServerPid = null; // Reset activeServerPid
    }
  } else {
    console.log('No web server process to stop');
  }
}