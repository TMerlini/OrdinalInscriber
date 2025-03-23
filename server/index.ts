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
    
    // Create a secondary server for Replit compatibility that listens on port 5000
    if (process.env.NODE_ENV === 'development') {
      const secondary = http.createServer(app);
      secondary.listen(developmentPort, host, () => {
        log(`Secondary development server running on ${host}:${developmentPort} (for Replit workflow compatibility)`);
        log(`Additional access URL: http://localhost:${developmentPort}`);
      });
    }
  });
})();
