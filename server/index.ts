import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes, getLocalIpAddress } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { networkInterfaces } from "os";
import * as http from "http";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use configured port from environment or fallback to port 3500
  // We consistently use port 3500 to avoid conflicts with Synology NAS (port 5000)
  const primaryPort = process.env.PORT ? parseInt(process.env.PORT, 10) : 3500;
  const developmentPort = 5000; // For Replit workflow compatibility
  const host = "0.0.0.0";
  const ordNodeIp = process.env.ORD_NODE_IP || "10.21.21.4"; // Configurable Ord node IP

  // Primary server instance on port 3500 (or environment PORT)
  // Add error handling for server listening
  let serverStartAttempt = 0;
  const maxAttempts = 3;
  
  const startServer = () => {
    try {
      // First try to free the port if it's in use
      const { exec } = require('child_process');
      exec(`lsof -t -i:${primaryPort} | xargs kill -9 2>/dev/null || true`, () => {
        server.listen({
          port: primaryPort,
          host,
          reusePort: true,
        }, () => {
          log(`Primary server running on ${host}:${primaryPort}`);
  
          // Instead of just showing 0.0.0.0, show all possible access URLs
          const nets = networkInterfaces() || {};
          const accessURLs: string[] = [];
  
          // Always add localhost
          accessURLs.push(`http://localhost:${primaryPort}`);
  
          // Add all network interfaces
          try {
            for (const name of Object.keys(nets || {})) {
              const interfaces = nets[name];
              if (!interfaces) continue;
  
              for (const net of interfaces) {
                // Skip over internal and non-IPv4 addresses
                if (net.family === 'IPv4' && !net.internal) {
                  accessURLs.push(`http://${net.address}:${primaryPort}`);
                }
              }
            }
          } catch (error) {
            console.error('Error getting network interfaces:', error);
          }
  
          // Log access URLs
          log(`Application accessible at:`);
          accessURLs.forEach(url => log(`  - ${url}`));
  
          log(`API endpoints available at ${accessURLs[0]}/api/*`);
          log(`Environment: ${process.env.NODE_ENV}`);
  
          // Create a secondary server for Replit compatibility
          if (process.env.NODE_ENV === 'development') {
            // Use environment variable for secondary port if provided, or fallback to default logic
            const secondaryPort = process.env.SECONDARY_PORT 
              ? parseInt(process.env.SECONDARY_PORT, 10)
              : (primaryPort === 5000 ? 5001 : developmentPort);
  
            // Only start secondary server if secondary port is different from primary
            if (secondaryPort !== primaryPort) {
              try {
                // First free the secondary port
                exec(`lsof -t -i:${secondaryPort} | xargs kill -9 2>/dev/null || true`, () => {
                  const secondary = http.createServer(app);
                  secondary.listen(secondaryPort, host, () => {
                    log(`Secondary development server running on ${host}:${secondaryPort} (for Replit workflow compatibility)`);
                    log(`Additional access URL: http://localhost:${secondaryPort}`);
                  });
                  
                  // Handle errors gracefully
                  secondary.on('error', (err) => {
                    if ((err as any).code === 'EADDRINUSE') {
                      log(`Warning: Secondary port ${secondaryPort} already in use, secondary server not started`);
                    } else {
                      log(`Warning: Failed to start secondary server: ${err.message}`);
                    }
                  });
                });
              } catch (error) {
                log(`Warning: Failed to create secondary server: ${error}`);
              }
            }
          }
        });
      });
  
      // Add error handler for primary server
      server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          log(`Warning: Port ${primaryPort} already in use. Attempting to kill the process and retry...`);
          
          // Try to force close the port and retry
          serverStartAttempt++;
          if (serverStartAttempt <= maxAttempts) {
            log(`Retry attempt ${serverStartAttempt}/${maxAttempts}...`);
            
            // Try to kill the process using the port
            exec(`lsof -t -i:${primaryPort} | xargs kill -9 2>/dev/null || true`, () => {
              setTimeout(startServer, 1000); // Wait 1 second before retrying
            });
          } else {
            log(`Error: Failed to start server after ${maxAttempts} attempts. Please restart the application or use a different port.`);
          }
        } else {
          log(`Error starting server: ${err.message}`);
        }
      });
    } catch (error) {
      log(`Error in startServer: ${error}`);
    }
  };

  // Start the server with retry mechanism
  startServer();
})();