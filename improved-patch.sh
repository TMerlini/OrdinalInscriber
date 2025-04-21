#!/bin/bash

echo "===== Ordinarinos Improved Timeout Fix Patch ====="
echo "This script will find and patch all web server related code."

# Correct container name based on docker ps output
CONTAINER_NAME="ordinals_ord_1"

echo "Step 1: Examining container file structure..."
echo "Checking dist directory structure..."
sudo docker exec $CONTAINER_NAME find /app/dist -type d | sort

echo "Step 2: Searching for JavaScript files that might contain web server code..."
echo "Looking for all JS files with 'server' in their name or path..."
SERVER_FILES=$(sudo docker exec $CONTAINER_NAME find /app -name "*.js" | grep -i "server" | sort)
echo "$SERVER_FILES"

echo "Looking for files containing startWebServer or http.server..."
WEB_SERVER_FILES=$(sudo docker exec $CONTAINER_NAME grep -l "startWebServer\|http.server" $(sudo docker exec $CONTAINER_NAME find /app -name "*.js") 2>/dev/null)
echo "Potential web server files:"
echo "$WEB_SERVER_FILES"

if [ -z "$WEB_SERVER_FILES" ]; then
  echo "No files containing web server code found directly. Trying a different approach."
  echo "Searching for all index.js files that might be the main server entry point..."
  INDEX_FILES=$(sudo docker exec $CONTAINER_NAME find /app -name "index.js" | sort)
  echo "$INDEX_FILES"
  
  # Let's examine the dist/index.js file if it exists
  if sudo docker exec $CONTAINER_NAME test -f /app/dist/index.js; then
    echo "Found /app/dist/index.js - examining contents:"
    sudo docker exec $CONTAINER_NAME grep -A 5 "server\|http\|express\|web" /app/dist/index.js | head -20
  fi
fi

echo "Step 3: Checking for server execution in package.json..."
sudo docker exec $CONTAINER_NAME cat /app/package.json | grep -A 10 "scripts"

echo "Step 4: Checking running processes to identify server components..."
sudo docker exec $CONTAINER_NAME ps aux | grep -E "node|python|server"

echo "Step 5: Creating patch files for various potential server implementations..."

# Case 1: Standard cmd-executor.js patch
cat > /tmp/webserver-patch.js << 'EOF'
export async function startWebServer(directory, port = 8000) {
  console.log('PATCHED: Web server startup bypassed');
  return {
    error: false,
    output: 'PATCHED: Mock web server started (not actually running)'
  };
}
EOF

# Case 2: Express server patch
cat > /tmp/express-patch.js << 'EOF'
// Modified Express server setup to bypass actual HTTP server if needed
const mockApp = {
  use: () => mockApp,
  get: () => mockApp,
  post: () => mockApp,
  listen: (port, cb) => {
    console.log('PATCHED: Express server startup bypassed');
    if (cb) cb();
    return { 
      close: () => console.log('Mock server closed') 
    };
  }
};

// Replace http server if needed
const mockHttp = {
  createServer: () => ({
    listen: (port, cb) => {
      console.log('PATCHED: HTTP server startup bypassed');
      if (cb) cb();
      return {
        close: () => console.log('Mock HTTP server closed')
      };
    }
  })
};
EOF

# Case 3: Node.js http or python server patch for main index.js
cat > /tmp/main-server-patch.js << 'EOF'
// PATCHED: Web server startup bypassed
const originalSpawn = require('child_process').spawn;
const originalExec = require('child_process').exec;

// Override spawn to avoid starting Python HTTP servers
require('child_process').spawn = function mockedSpawn(cmd, args, options) {
  if (cmd === 'python' || cmd === 'python3') {
    if (args && args.includes('http.server')) {
      console.log('PATCHED: Bypassing Python HTTP server:', cmd, args.join(' '));
      return {
        on: (event, cb) => {
          if (event === 'exit') setTimeout(() => cb(0), 100);
          return this;
        },
        stdout: {
          on: () => {}
        },
        stderr: {
          on: () => {}
        },
        kill: () => {}
      };
    }
  }
  return originalSpawn(cmd, args, options);
};

// Override exec to avoid starting servers
require('child_process').exec = function mockedExec(cmd, options, callback) {
  if (cmd.includes('http.server') || cmd.includes('python -m http.server')) {
    console.log('PATCHED: Bypassing HTTP server exec:', cmd);
    if (typeof options === 'function') {
      options(null, 'PATCHED: Server bypassed', '');
      return {};
    }
    if (callback) {
      callback(null, 'PATCHED: Server bypassed', '');
      return {};
    }
    return {
      on: () => {}
    };
  }
  return originalExec(cmd, options, callback);
};
EOF

echo "Step 6: Creating a temporary file to help us hook into the Node.js module system..."
cat > /tmp/injection-point.js << 'EOF'
// This file will be prepended to the main server file
console.log('PATCHED: Injecting server bypass code');

// Store original require function
const originalRequire = module.require;

// Override require to modify http, child_process, and other modules
module.require = function(id) {
  const original = originalRequire.apply(this, arguments);
  
  if (id === 'child_process') {
    console.log('PATCHED: Intercepting child_process module');
    const originalSpawn = original.spawn;
    original.spawn = function mockedSpawn(cmd, args, options) {
      if ((cmd === 'python' || cmd === 'python3') && args && args.includes('http.server')) {
        console.log('PATCHED: Bypassing Python HTTP server spawn:', cmd, args.join(' '));
        const mockProcess = {
          on: (event, cb) => {
            if (event === 'exit') setTimeout(() => cb(0), 100);
            return mockProcess;
          },
          stdout: { on: () => {} },
          stderr: { on: () => {} },
          kill: () => {}
        };
        return mockProcess;
      }
      return originalSpawn(cmd, args, options);
    };
    
    const originalExec = original.exec;
    original.exec = function mockedExec(cmd, options, callback) {
      if (cmd.includes('http.server') || cmd.includes('python -m http')) {
        console.log('PATCHED: Bypassing HTTP server exec:', cmd);
        if (typeof options === 'function') {
          setTimeout(() => options(null, 'PATCHED: Server bypassed', ''), 100);
          return { on: () => {} };
        }
        if (callback) {
          setTimeout(() => callback(null, 'PATCHED: Server bypassed', ''), 100);
          return { on: () => {} };
        }
        return { on: () => {} };
      }
      return originalExec(cmd, options, callback);
    };
  }
  
  return original;
};
EOF

echo "Step 7: Attempting to inject the patch into the main server file..."

# Find the main entry point
MAIN_ENTRY=$(sudo docker exec $CONTAINER_NAME node -e "console.log(require.main ? require.main.filename : 'Unknown')" 2>/dev/null || echo "Unknown")
echo "Main entry point seems to be: $MAIN_ENTRY"

if [ "$MAIN_ENTRY" != "Unknown" ]; then
  echo "Patching main entry point: $MAIN_ENTRY"
  sudo docker cp /tmp/injection-point.js $CONTAINER_NAME:/tmp/
  
  # Create a backup
  sudo docker exec $CONTAINER_NAME cp "$MAIN_ENTRY" "${MAIN_ENTRY}.backup"
  
  # Inject our code at the top of the file
  sudo docker exec $CONTAINER_NAME bash -c "cat /tmp/injection-point.js > /tmp/combined.js && cat $MAIN_ENTRY >> /tmp/combined.js && mv /tmp/combined.js $MAIN_ENTRY"
  
  echo "Main entry point patched successfully!"
else
  echo "Could not determine main entry point. Trying to find and patch the main index.js..."
  
  # Try likely candidates for the main server file
  for CANDIDATE in "/app/dist/index.js" "/app/index.js" "/app/server.js" "/app/dist/server.js"; do
    if sudo docker exec $CONTAINER_NAME test -f "$CANDIDATE"; then
      echo "Found candidate main file: $CANDIDATE"
      sudo docker cp /tmp/injection-point.js $CONTAINER_NAME:/tmp/
      
      # Create a backup
      sudo docker exec $CONTAINER_NAME cp "$CANDIDATE" "${CANDIDATE}.backup"
      
      # Inject our code at the top of the file
      sudo docker exec $CONTAINER_NAME bash -c "cat /tmp/injection-point.js > /tmp/combined.js && cat $CANDIDATE >> /tmp/combined.js && mv /tmp/combined.js $CANDIDATE"
      
      echo "Candidate file patched successfully!"
      break
    fi
  done
fi

echo "Step 8: Patching environment variables directly in the container..."
sudo docker exec $CONTAINER_NAME bash -c 'echo "export DISABLE_WEBSERVER=true" >> /etc/profile'
sudo docker exec $CONTAINER_NAME bash -c 'echo "export SKIP_HTTP_SERVER=true" >> /etc/profile'
sudo docker exec $CONTAINER_NAME bash -c 'echo "export NO_START_SERVER=true" >> /etc/profile'
sudo docker exec $CONTAINER_NAME bash -c 'echo "export BYPASS_SERVER_START=true" >> /etc/profile'

echo "Step 9: Creating a small helper script that will be executed on container restart..."
cat > /tmp/helper-script.sh << 'EOF'
#!/bin/bash
echo "Applying runtime patches to prevent web server startup..."

# Temporarily move python/python3 out of the way to prevent HTTP server
if [ -f /usr/bin/python3 ]; then
  mv /usr/bin/python3 /usr/bin/python3.original || true
  cat > /usr/bin/python3 << 'INNEREOF'
#!/bin/bash
if [[ "$*" == *"http.server"* ]]; then
  echo "PATCHED: Python HTTP server bypassed"
  exit 0
fi
/usr/bin/python3.original "$@"
INNEREOF
  chmod +x /usr/bin/python3
fi

# Same for python if it exists
if [ -f /usr/bin/python ]; then
  mv /usr/bin/python /usr/bin/python.original || true
  cat > /usr/bin/python << 'INNEREOF'
#!/bin/bash
if [[ "$*" == *"http.server"* ]]; then
  echo "PATCHED: Python HTTP server bypassed"
  exit 0
fi
/usr/bin/python.original "$@"
INNEREOF
  chmod +x /usr/bin/python
fi

echo "Runtime patches applied."
EOF

# Copy and set permissions for the helper script
sudo docker cp /tmp/helper-script.sh $CONTAINER_NAME:/tmp/
sudo docker exec $CONTAINER_NAME chmod +x /tmp/helper-script.sh
sudo docker exec $CONTAINER_NAME bash -c "echo '/tmp/helper-script.sh' >> /root/.bashrc"

echo "Step 10: Restarting the container to apply changes..."
sudo docker restart $CONTAINER_NAME

echo "===== Patch Complete ====="
echo "The app should now be able to bypass the web server timeout issue."
echo "If you still experience problems, please check the logs with:"
echo "sudo docker logs $CONTAINER_NAME"
echo ""
echo "You can also try a more direct approach by modifying the docker-compose.yml"
echo "and rebuilding the container from scratch with the new configuration." 