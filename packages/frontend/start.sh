#!/bin/sh
# Start the server with the PORT from Railway
exec serve -s dist -l ${PORT:-8080}