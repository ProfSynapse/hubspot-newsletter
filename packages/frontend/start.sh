#!/bin/sh
# Debug: Print the PORT variable
echo "PORT environment variable is: $PORT"
# Start the server with the PORT from Railway (default to Railway's common port)
exec serve -s dist -l tcp://0.0.0.0:${PORT:-4173}