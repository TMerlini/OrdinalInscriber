#!/bin/bash

echo "===== Python HTTP Server Disabler ====="
echo "This script will prevent Python HTTP servers from starting."

# Correct container name
CONTAINER_NAME="ordinalinscriber-ordinarinos-1"

echo "Creating a Python replacement script that will ignore HTTP server requests..."
cat > /tmp/fake-python.sh << 'EOF'
#!/bin/bash

# Check if this is an attempt to start an HTTP server
if [[ "$*" == *"http.server"* ]] || [[ "$*" == *"-m http"* ]]; then
  echo "DISABLED: Python HTTP server startup bypassed"
  exit 0
fi

# Otherwise, pass through to original python
if [ -f /usr/bin/python3.original ]; then
  /usr/bin/python3.original "$@"
elif [ -f /usr/bin/python.original ]; then
  /usr/bin/python.original "$@"
else
  echo "ERROR: Original Python interpreter not found"
  exit 1
fi
EOF

echo "Installing the replacement script in the container..."
sudo docker cp /tmp/fake-python.sh $CONTAINER_NAME:/tmp/

sudo docker exec $CONTAINER_NAME bash -c '
# Make a backup of the original Python if not already done
if [ -f /usr/bin/python3 ] && [ ! -f /usr/bin/python3.original ]; then
  cp /usr/bin/python3 /usr/bin/python3.original
fi

if [ -f /usr/bin/python ] && [ ! -f /usr/bin/python.original ]; then
  cp /usr/bin/python /usr/bin/python.original
fi

# Install our fake python script
cp /tmp/fake-python.sh /usr/bin/python3
chmod +x /usr/bin/python3

# Also for python if it exists
if [ -f /usr/bin/python.original ]; then
  cp /tmp/fake-python.sh /usr/bin/python
  chmod +x /usr/bin/python
fi

echo "Python HTTP server successfully disabled!"
'

echo "Setting environment variables to prevent web server startup..."
sudo docker exec $CONTAINER_NAME bash -c '
# Add environment variables to docker container
echo "export DISABLE_WEBSERVER=true" >> /etc/environment
echo "export SKIP_HTTP_SERVER=true" >> /etc/environment
echo "export USE_API_ONLY=true" >> /etc/environment
echo "export NO_START_SERVER=true" >> /etc/environment
'

echo "Restarting the container to apply changes..."
sudo docker restart $CONTAINER_NAME

echo "===== Python HTTP Server Disabled ====="
echo "The Python HTTP server should now be effectively disabled."
echo "Try inscribing an image again - the timeout error should be gone." 