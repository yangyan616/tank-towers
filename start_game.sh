#!/bin/bash

# Check if Python is installed
if command -v python3 &>/dev/null; then
    echo "Starting server with Python 3..."
    python3 -m http.server 8000
elif command -v python &>/dev/null; then
    echo "Starting server with Python..."
    python -m SimpleHTTPServer 8000
else
    echo "Python is not installed. Opening directly from the file system."
    open index.html
fi

echo "Server started at http://localhost:8000"
echo "Open your browser and navigate to http://localhost:8000 to play the game."
echo "Press Ctrl+C to stop the server." 