import { exec, spawn } from "child_process";
import { promisify } from "util";
import { kill } from "process";
import { networkInterfaces } from "os";

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
export async function startWebServer(directoryPath: string, port: number = 8000): Promise<CommandResult> {
  try {
    // Kill any existing server
    await stopWebServer();

    // Try multiple ports if necessary (starting with requested port)
    const tryStartServer = async (currentPort: number, maxAttempts: number = 3): Promise<CommandResult> => {
      if (maxAttempts <= 0) {
        return {
          error: true,
          output: "Failed to find an available port after multiple attempts"
        };
      }

      // Try to start a Python HTTP server on the current port
      console.log(`Attempting to start web server on port ${currentPort}...`);

      // Try using python3 first, then fallback to python if not available
      const command = process.platform === 'win32' ? 'python' : 'python3';
      const pythonProcess = spawn(command, ['-m', 'http.server', currentPort.toString()], {
        cwd: directoryPath,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      // Store the process ID for later reference
      activeServerPid = pythonProcess.pid;

      // Return a promise that resolves when the server starts (or fails)
      return new Promise((resolve) => {
        let outputData = '';
        let errorData = '';

        pythonProcess.stdout.on('data', (data) => {
          outputData += data.toString();

          // If we see the server started message, resolve with success
          if (outputData.includes('Serving HTTP')) {
            resolve({
              error: false,
              output: outputData
            });
          }
        });

        pythonProcess.stderr.on('data', (data) => {
          errorData += data.toString();

          // If we get an address in use error, try the next port
          if (errorData.includes('Address already in use')) {
            // Kill the process
            try {
              process.kill(pythonProcess.pid);
              activeServerPid = null;
            } catch (e) {
              // Ignore errors here
            }

            // Try the next port
            resolve(tryStartServer(currentPort + 1, maxAttempts - 1));
          } 
          // If we get any other error, resolve with the error
          else if (errorData.includes('Error')) {
            resolve({
              error: true,
              output: errorData
            });
          }
        });

        // If the process ends unexpectedly
        pythonProcess.on('exit', (code) => {
          // If process exited with an error but we didn't capture stderr
          if (code !== 0 && !errorData.includes('Address already in use')) {
            resolve({
              error: true,
              output: errorData || `Server process exited with code ${code}`
            });
          }
        });

        // If there's an error spawning the process
        pythonProcess.on('error', (err) => {
          // If command not found (ENOENT), try with alternative command
          if (err.code === 'ENOENT' && command === 'python3') {
            console.log('python3 not found, trying with python...');
            pythonProcess.removeAllListeners();

            // Try with plain 'python' instead
            const altPythonProcess = spawn('python', ['-m', 'http.server', currentPort.toString()], {
              cwd: directoryPath,
              detached: true,
              stdio: ['ignore', 'pipe', 'pipe']
            });

            // Replace the process
            activeServerPid = altPythonProcess.pid;

            // Reattach listeners
            altPythonProcess.stdout.on('data', data => pythonProcess.stdout.emit('data', data));
            altPythonProcess.stderr.on('data', data => pythonProcess.stderr.emit('data', data));
            altPythonProcess.on('error', err => {
              resolve({
                error: true,
                output: `Failed to start HTTP server: ${err.toString()}`
              });
            });
          } else {
            resolve({
              error: true,
              output: `Failed to start HTTP server: ${err.toString()}`
            });
          }
        });

        // Set a timeout to ensure we don't hang indefinitely
        setTimeout(() => {
          if (!outputData.includes('Serving HTTP') && !errorData.includes('Address already in use')) {
            // Kill the process if it's still running
            if (activeServerPid) {
              try {
                process.kill(activeServerPid);
                activeServerPid = null;
              } catch (e) {
                // Ignore errors here
              }
            }

            resolve({
              error: true,
              output: errorData || 'Timeout starting server'
            });
          }
        }, 5000);
      });
    };

    return tryStartServer(port);
  } catch (error) {
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
      activeServerPid = null; // Reset activeServerPid
    }
  }
}