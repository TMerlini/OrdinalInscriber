#!/bin/bash

# Direct Inscription Script for when the app is having issues
# This bypasses the application completely and directly uses Docker

# Default values
CONTAINER_NAME="ord"
FEE_RATE=10
DESTINATION=""
PARENT_ID=""
METADATA_FILE=""

# Help function
show_help() {
  echo "Direct Ordinal Inscription Script"
  echo ""
  echo "Usage: $0 -f FILE [-c CONTAINER] [-r FEE_RATE] [-d DESTINATION] [-p PARENT_ID] [-m METADATA_FILE]"
  echo ""
  echo "Options:"
  echo "  -f FILE        Path to the file you want to inscribe (required)"
  echo "  -c CONTAINER   Ord container name (default: 'ord')"
  echo "  -r FEE_RATE    Fee rate in sats/vB (default: 10)"
  echo "  -d DESTINATION Destination address"
  echo "  -p PARENT_ID   Parent inscription ID"
  echo "  -m METADATA    Path to metadata JSON file"
  echo "  -h             Show this help"
  echo ""
  echo "Example:"
  echo "  $0 -f image.jpg -r 15 -d bc1p..."
  exit 1
}

# Parse command line options
while getopts "f:c:r:d:p:m:h" opt; do
  case $opt in
    f) FILE="$OPTARG" ;;
    c) CONTAINER_NAME="$OPTARG" ;;
    r) FEE_RATE="$OPTARG" ;;
    d) DESTINATION="$OPTARG" ;;
    p) PARENT_ID="$OPTARG" ;;
    m) METADATA_FILE="$OPTARG" ;;
    h) show_help ;;
    *) show_help ;;
  esac
done

# Check if file is provided
if [ -z "$FILE" ]; then
  echo "Error: File is required"
  show_help
fi

# Check if file exists
if [ ! -f "$FILE" ]; then
  echo "Error: File '$FILE' not found"
  exit 1
fi

# Verify container exists
if ! docker ps | grep -q "$CONTAINER_NAME"; then
  echo "Error: Container '$CONTAINER_NAME' not found or not running"
  echo "Available containers:"
  docker ps --format "{{.Names}}"
  exit 1
fi

# Get filename from path
FILENAME=$(basename "$FILE")

echo "===== Direct Ordinal Inscription ====="
echo "File: $FILE"
echo "Container: $CONTAINER_NAME"
echo "Fee Rate: $FEE_RATE sats/vB"

# Copy file to container
echo -n "Copying file to container... "
if docker cp "$FILE" "$CONTAINER_NAME:/ord/data/$FILENAME"; then
  echo "SUCCESS"
else
  echo "FAILED"
  echo "Error: Failed to copy file to container"
  exit 1
fi

# Copy metadata if provided
if [ -n "$METADATA_FILE" ]; then
  if [ -f "$METADATA_FILE" ]; then
    METADATA_FILENAME=$(basename "$METADATA_FILE")
    echo -n "Copying metadata file... "
    if docker cp "$METADATA_FILE" "$CONTAINER_NAME:/ord/data/$METADATA_FILENAME"; then
      echo "SUCCESS"
      METADATA_PARAM="--metadata /ord/data/$METADATA_FILENAME"
    else
      echo "FAILED"
      echo "Warning: Failed to copy metadata file, continuing without metadata"
      METADATA_PARAM=""
    fi
  else
    echo "Warning: Metadata file '$METADATA_FILE' not found, continuing without metadata"
    METADATA_PARAM=""
  fi
else
  METADATA_PARAM=""
fi

# Build the inscription command
INSCRIBE_CMD="ord wallet inscribe --fee-rate $FEE_RATE --file /ord/data/$FILENAME"

# Add optional parameters
if [ -n "$DESTINATION" ]; then
  INSCRIBE_CMD="$INSCRIBE_CMD --destination $DESTINATION"
fi

if [ -n "$PARENT_ID" ]; then
  INSCRIBE_CMD="$INSCRIBE_CMD --parent $PARENT_ID"
fi

if [ -n "$METADATA_PARAM" ]; then
  INSCRIBE_CMD="$INSCRIBE_CMD $METADATA_PARAM"
fi

# Display the command
echo ""
echo "Inscription command:"
echo "$INSCRIBE_CMD"
echo ""

# Execute the inscription
echo "Executing inscription... This may take a while."
echo "---------------------------------------------"
docker exec -it "$CONTAINER_NAME" $INSCRIBE_CMD
echo "---------------------------------------------"

echo ""
echo "Inscription process completed."
echo ""
echo "If successful, you should see your inscription ID and transaction ID above."
echo "If you encountered any errors, please check:"
echo "1. Make sure your ord wallet is funded"
echo "2. Check your ord container is running properly"
echo "3. Try a smaller file or reduce the fee rate if running out of funds" 