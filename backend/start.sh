#!/bin/sh

echo "Starting backend server..."
echo "NODE_ENV: $NODE_ENV"
echo "PORT: $PORT"

# Parse the API_KEYS secret and export individual environment variables
if [ -n "$API_KEYS" ]; then
    echo "API_KEYS found, parsing..."
    echo "Raw API_KEYS content:"
    echo "$API_KEYS"
    
    # Extract OPEN_ROUTE_API_KEY using a more compatible approach
    OPEN_ROUTE_API_KEY=$(echo "$API_KEYS" | grep "OPEN_ROUTE_API_KEY=" | cut -d'=' -f2- | tr -d '\r\n')
    export OPEN_ROUTE_API_KEY
    
    # Extract WAQI_API_KEY using a more compatible approach
    WAQI_API_KEY=$(echo "$API_KEYS" | grep "WAQI_API_KEY=" | cut -d'=' -f2- | tr -d '\r\n')
    export WAQI_API_KEY
    
    echo "OPEN_ROUTE_API_KEY: ${OPEN_ROUTE_API_KEY:+Present}"
    echo "WAQI_API_KEY: ${WAQI_API_KEY:+Present}"
else
    echo "Warning: API_KEYS environment variable not found"
fi

echo "Starting Node.js server..."
# Start the Node.js application
exec node server.js
