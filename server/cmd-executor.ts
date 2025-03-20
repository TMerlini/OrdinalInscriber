import { exec, spawn } from "child_process";
import { promisify } from "util";
import { kill } from "process";

const execPromise = promisify(exec);

// To keep track of our web server process
let serverProcess: ReturnType<typeof spawn> | null = null;

interface CommandResult {
  error: boolean;
  output: string;
}

/**
 * Execute a shell command
 */
export async function execCommand(command: string): Promise<CommandResult> {
  try {
    const { stdout, stderr } = await execPromise(command);
    
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
        exec(`taskkill /pid ${serverProcess.pid} /T /F`);
      } else {
        // Unix-like
        kill(-serverProcess.pid, 'SIGTERM');
      }
    } catch (error) {
      console.error('Error stopping server:', error);
    } finally {
      serverProcess = null;
    }
  }
}
