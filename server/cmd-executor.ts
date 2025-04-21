import { exec, spawn } from "child_process";
import { promisify } from "util";
import { kill } from "process";
import { networkInterfaces } from "os";
import * as net from "net";

const execPromise = promisify(exec);

// To keep track of our web server process
let serverProcess: ReturnType<typeof spawn> | null = null;
let activeServerPid: number | null = null; // Added to track the server PID

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
          output: "Docker is not available in the Replit environment. This application requires Docker and a Bitcoin Ordinals node to function properly. This UI preview works, but inscription functionality requires a local Docker environment with an Ordinals node."
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
  // Check if web server is disabled via environment variables
  if (process.env.DISABLE_WEBSERVER === 'true' || 
      process.env.SKIP_HTTP_SERVER === 'true' || 
      process.env.BYPASS_SERVER_START === 'true' ||
      process.env.NO_START_SERVER === 'true') {
    console.log('Web server startup bypassed due to environment configuration');
    return {
      error: false,
      output: 'BYPASSED: Web server startup skipped due to configuration'
    };
  }

  // Check if we're in Umbrel environment
  const isUmbrel = process.env.DIRECT_CONNECT === 'true' && 
                   process.env.BTC_SERVER_AVAILABLE === 'true' &&
                   process.env.ORD_SERVER_AVAILABLE === 'true';
  
  if (isUmbrel) {
    console.log('Detected Umbrel environment - bypassing web server startup');
    return {
      error: false,
      output: `UMBREL MODE: Web server startup bypassed. Files can be accessed directly by the ord container.`
    };
  }

  try {
    console.log(`Starting web server in directory: ${directory} on port: ${port}`);
    
    // Kill any existing processes using the port
    try {
      await execCommand(`lsof -t -i:${port} | xargs kill -9 2>/dev/null || true`);
      await execCommand(`pkill -f "python3 -m http.server ${port}" || true`);
      await execCommand(`pkill -f "serve -s -p ${port}" || true`);
    } catch (err) {
      // Ignore errors, just trying to clean up any existing processes
      console.log('Note: Could not kill processes on port (might not exist):', err);
    }

    // First try using npx serve (more reliable)
    let command = 'npx';
    let args = ['serve', '--listen', port.toString(), '--no-clipboard', '--no-compression'];
    
    // Log the command we're trying to execute
    console.log(`Starting web server with command: ${command} ${args.join(' ')} in directory ${directory}`);

    // Create process - rename to serverProc to avoid shadowing the global variable
    const serverProc = spawn(command, args, {
      cwd: directory,
      detached: false,
      stdio: 'pipe'
    });

    // Store the process for later use - use the global variable
    serverProcess = serverProc;

    if (serverProc.pid) {
      activeServerPid = serverProc.pid;
      console.log(`Started web server with PID ${serverProc.pid}`);
    }

    // Add error handler
    serverProc.on('error', (err) => {
      console.error('Web server process error:', err);
      // If npx serve fails, try Python HTTP server instead as fallback
      tryPythonServer(directory, port);
    });

    // Capture stdout/stderr for logging
    if (serverProc.stdout) {
      serverProc.stdout.on('data', (data) => {
        console.log(`Server stdout: ${data}`);
      });
    }
    
    if (serverProc.stderr) {
      serverProc.stderr.on('data', (data) => {
        console.error(`Server stderr: ${data}`);
      });
    }

    // Check if server started successfully
    return new Promise((resolve) => {
      // Set a longer timeout for server startup
      const timeout = setTimeout(() => {
        console.error('Timeout waiting for server to start');
        // Kill the server process if it's still running after timeout
        if (serverProcess && serverProcess.pid) {
          console.log(`Killing timed out server process with PID ${serverProcess.pid}`);
          serverProcess.kill('SIGTERM');
          serverProcess = null;
          activeServerPid = null;
        }
        resolve({
          error: true,
          output: "Timeout starting server. Make sure port 8000 is available and not blocked by another application or firewall."
        });
      }, 15000); // Increase timeout from 10 to 15 seconds

      let retryCount = 0;
      const maxRetries = 10; // Maximum number of retries

      // Check if server is up by attempting to connect to it
      const checkServerUp = () => {
        // Exit early if max retries reached
        if (retryCount >= maxRetries) {
          console.error(`Max retry attempts (${maxRetries}) reached. Server startup failed.`);
          clearTimeout(timeout);
          
          // Kill the server process if it's still running after max retries
          if (serverProcess && serverProcess.pid) {
            console.log(`Killing server after max retries with PID ${serverProcess.pid}`);
            serverProcess.kill('SIGTERM');
            serverProcess = null;
            activeServerPid = null;
          }
          
          resolve({
            error: true,
            output: `Failed to start server after ${maxRetries} attempts. Please check if anything is blocking port ${port}.`
          });
          return;
        }

        retryCount++;
        console.log(`Checking if server is up on port ${port}... (Attempt ${retryCount}/${maxRetries})`);
        const client = new net.Socket();

        client.setTimeout(1000);

        client.on('connect', () => {
          console.log('Server is up and running!');
          clearTimeout(timeout);
          client.destroy();
          resolve({
            error: false,
            output: `Serving HTTP on 0.0.0.0 port ${port}...`
          });
        });

        client.on('error', (err) => {
          console.log(`Server not up yet, retrying... (${err.message})`);
          client.destroy();
          // Try again in 1 second
          setTimeout(checkServerUp, 1000);
        });

        client.on('timeout', () => {
          console.log('Socket connection timed out, retrying...');
          client.destroy();
          // Continue to next retry
          setTimeout(checkServerUp, 1000);
        });

        // Handle unexpected client-side errors
        client.on('close', () => {
          // This will be called when client is destroyed
          // Don't need to handle separately as we're destroying manually
        });

        try {
          client.connect(port, '127.0.0.1');
        } catch (err) {
          console.error('Error connecting to server:', err);
          client.destroy();
          setTimeout(checkServerUp, 1000);
        }
      };

      // Start checking if server is up after a small delay
      setTimeout(checkServerUp, 1000);
    });
  } catch (error) {
    console.error('Error starting web server:', error);
    return {
      error: true,
      output: `Error starting web server: ${String(error)}`
    };
  }
}

// Helper function to try Python server as fallback
async function tryPythonServer(directory: string, port: number): Promise<void> {
  try {
    console.log('Trying Python HTTP server as fallback...');
    
    // Check if Python 3 is available
    const pythonCheck = await execCommand('command -v python3 || command -v python');
    const pythonCommand = !pythonCheck.error && pythonCheck.output.trim() ? 
                         (pythonCheck.output.includes('python3') ? 'python3' : 'python') : 
                         null;
    
    if (pythonCommand) {
      console.log(`Found Python: ${pythonCommand}`);
      const serverProc = spawn(pythonCommand, ['-m', 'http.server', port.toString()], {
        cwd: directory,
        detached: false,
        stdio: 'pipe'
      });
      
      // Store the process for later use - use the global variable
      serverProcess = serverProc;
      
      if (serverProc.pid) {
        activeServerPid = serverProc.pid;
        console.log(`Started Python HTTP server with PID ${serverProc.pid}`);
      }
      
      serverProc.on('error', (err) => {
        console.error('Python server process error:', err);
      });
      
      if (serverProc.stdout) {
        serverProc.stdout.on('data', (data) => {
          console.log(`Python server stdout: ${data}`);
        });
      }
      
      if (serverProc.stderr) {
        serverProc.stderr.on('data', (data) => {
          console.error(`Python server stderr: ${data}`);
        });
      }
    } else {
      console.error('Could not find Python3 or Python');
    }
  } catch (error) {
    console.error('Error starting Python fallback server:', error);
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
      activeServerPid = null; // Reset activeServerPid
    }
  } else {
    console.log('No web server process to stop');
  }
}