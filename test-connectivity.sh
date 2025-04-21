#!/bin/bash

echo "Ordinarinos Connectivity Test Script"
echo "==================================="
echo

# Define colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Test Bitcoin Core connectivity
echo -e "${YELLOW}Testing Bitcoin Core connectivity:${NC}"
echo "Trying direct connection to 10.21.21.8:8332..."
curl -s -m 5 --data-binary '{"jsonrpc":"1.0","id":"check","method":"getblockchaininfo","params":[]}' -H 'content-type:text/plain;' http://umbrel:umbrel@10.21.21.8:8332/ | grep -q "\"error\":null"
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Bitcoin Core direct connection successful${NC}"
else
  echo -e "${RED}✗ Bitcoin Core direct connection failed${NC}"
fi

# Test Bitcoin App Proxy connectivity
echo "Trying Bitcoin app proxy at 10.21.0.22:2100..."
curl -s -m 5 http://10.21.0.22:2100/ | grep -q "bitcoin"
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Bitcoin app proxy connection successful${NC}"
else
  echo -e "${RED}✗ Bitcoin app proxy connection failed${NC}"
fi

# Test Ordinals connectivity
echo -e "\n${YELLOW}Testing Ordinals connectivity:${NC}"
echo "Trying direct connection to 10.21.0.12:80..."
curl -s -m 5 http://10.21.0.12:80/ | grep -q "ord"
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Ordinals direct connection successful${NC}"
else
  echo -e "${RED}✗ Ordinals direct connection failed${NC}"
  echo "Trying alternate endpoint at 10.21.0.12:80/status..."
  curl -s -m 5 http://10.21.0.12:80/status | grep -q "version"
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Ordinals direct connection to /status successful${NC}"
  else
    echo -e "${RED}✗ Ordinals direct connection to /status failed${NC}"
  fi
fi

# Test Ordinals App Proxy connectivity
echo "Trying Ordinals app proxy at 10.21.0.13:4000..."
curl -s -m 5 http://10.21.0.13:4000/ | grep -q "ord"
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Ordinals app proxy connection successful${NC}"
else
  echo -e "${RED}✗ Ordinals app proxy connection failed${NC}"
  echo "Trying alternate endpoint at 10.21.0.13:4000/status..."
  curl -s -m 5 http://10.21.0.13:4000/status | grep -q "version"
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Ordinals app proxy connection to /status successful${NC}"
  else
    echo -e "${RED}✗ Ordinals app proxy connection to /status failed${NC}"
  fi
fi

echo -e "\n${YELLOW}Testing shell execution in Ordinals container:${NC}"
echo "Attempting to execute a command in the ordinals_ord_1 container..."
docker exec -i ordinals_ord_1 echo "Container access successful" 2>/dev/null
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Command execution in Ordinals container successful${NC}"
else
  echo -e "${RED}✗ Command execution in Ordinals container failed${NC}"
  echo "This likely means your container doesn't have Docker socket access or the container name is different."
fi

echo -e "\n${YELLOW}Summary:${NC}"
echo "If any of the above tests failed, it indicates where connectivity issues might be occurring."
echo "For the 'Timeout starting server' error, ensure that:"
echo "1. All containers are running (use 'docker ps' to verify)"
echo "2. Network connectivity between containers is working"
echo "3. The updated timeout settings are applied in your docker-compose.yml"
echo "4. Check logs with 'docker-compose logs ordinarinos' for more details" 