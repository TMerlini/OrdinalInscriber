const fs = require('fs');
const path = require('path');

// Path to the cmd-executor.js file
const cmdExecutorPath = path.join(__dirname, 'dist', 'server', 'cmd-executor.js');

// Make sure the file exists
if (!fs.existsSync(cmdExecutorPath)) {
  console.error(`Error: Could not find ${cmdExecutorPath}`);
  process.exit(1);
}

// Read the file content
let content = fs.readFileSync(cmdExecutorPath, 'utf8');

// Replace the startWebServer function with a version that doesn't actually start a server
// but just returns a success response immediately
content = content.replace(
  /export async function startWebServer\([^{]*\)\s*{[\s\S]*?return new Promise[\s\S]*?}\s*}\s*}/m,
  `export async function startWebServer(directory, port = 8000) {
    console.log('PATCHED: Web server startup bypassed');
    return {
      error: false,
      output: 'PATCHED: Mock web server started (not actually running)'
    };
  }`
);

// Write the modified content back to the file
fs.writeFileSync(cmdExecutorPath, content, 'utf8');

console.log('Successfully patched cmd-executor.js to bypass web server startup');

// Path to the routes.ts file to disable file transfer commands
const routesPath = path.join(__dirname, 'dist', 'server', 'routes.js');

// Make sure the routes file exists
if (fs.existsSync(routesPath)) {
  // Read the file content
  let routesContent = fs.readFileSync(routesPath, 'utf8');

  // Modify the command generation to skip web server and file transfer steps
  routesContent = routesContent.replace(
    /commands\.push\(`python3 -m http\.server \${port}`\)/,
    `// PATCHED: Skipping web server command\n      // commands.push(\`python3 -m http.server \${port}\`)`
  );

  routesContent = routesContent.replace(
    /commands\.push\(`docker exec -it \${config\.containerName} sh -c "curl -o \${containerFilePath}/,
    `// PATCHED: Skipping file transfer command\n      // commands.push(\`docker exec -it \${config.containerName} sh -c "curl -o \${containerFilePath}`
  );

  // Write the modified content back to the file
  fs.writeFileSync(routesPath, routesContent, 'utf8');
  console.log('Successfully patched routes.js to skip file transfer commands');
}

console.log('Patching complete! The application should now bypass the web server step.'); 