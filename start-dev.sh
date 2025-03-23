#!/bin/bash
# Start our application on port 3500
PORT=3500 npm run dev &
APP_PID=$!

# Wait a moment for the application to start
sleep 3

# Start port forwarding from 5000 to 3500
echo "Setting up port forwarding from port 5000 to 3500..."
socat TCP-LISTEN:5000,fork,reuseaddr TCP:localhost:3500 &
SOCAT_PID=$!

# Function to handle termination
cleanup() {
  echo "Shutting down..."
  kill $SOCAT_PID
  kill $APP_PID
  exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for the application process to finish
wait $APP_PID