#!/bin/bash

# Set the current directory to the script's directory
cd "$(dirname "$0")"

# Function to check if the port is already in use
is_port_in_use() {
  lsof -i :8080 >/dev/null 2>&1
  return $?
}

# Check if Node.js is installed
if command -v node >/dev/null 2>&1; then
  echo "Node.js is installed. Starting game server..."
  
  # Check if port is already in use
  if is_port_in_use; then
    echo "Port 8080 is already in use. Opening browser directly..."
    open "http://localhost:8080"
  else
    # Start server in the background
    node server.js &
    
    # Store the server process ID
    SERVER_PID=$!
    
    # Wait a moment for the server to start
    sleep 1
    
    # Open browser
    open "http://localhost:8080"
    
    # Let user know how to quit
    echo "Server is running. Game should open in your browser."
    echo "Press Ctrl+C to stop the server when you're done playing."
    
    # Keep this script running until user presses Ctrl+C
    trap "kill $SERVER_PID; echo 'Server stopped.'; exit 0" INT
    wait $SERVER_PID
  fi
elif command -v python3 >/dev/null 2>&1; then
  echo "Node.js not found, but Python 3 is installed. Starting game server..."
  
  # Check if port is already in use
  if is_port_in_use; then
    echo "Port 8080 is already in use. Opening browser directly..."
    open "http://localhost:8080"
  else  
    # Start Python server
    python3 -m http.server 8080 &
    
    # Store the server process ID
    SERVER_PID=$!
    
    # Wait a moment for the server to start
    sleep 1
    
    # Open browser
    open "http://localhost:8080"
    
    # Let user know how to quit
    echo "Server is running. Game should open in your browser."
    echo "Press Ctrl+C to stop the server when you're done playing."
    
    # Keep this script running until user presses Ctrl+C
    trap "kill $SERVER_PID; echo 'Server stopped.'; exit 0" INT
    wait $SERVER_PID
  fi
else
  echo "Neither Node.js nor Python are installed."
  echo "The game requires a web server to run properly because it uses JavaScript modules."
  echo "Please install Node.js or Python, or use a web server application."
  echo ""
  echo "Attempting to open the game directly, but it may not work correctly..."
  sleep 2
  open "index.html"
fi 