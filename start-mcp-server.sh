#!/bin/bash
# Start the Biomni MCP server

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
VENV_DIR="$SCRIPT_DIR/venv"
BIOMNI_DIR="$SCRIPT_DIR/src/biomni"

# Activate virtual environment if it exists
if [ -d "$VENV_DIR" ]; then
    source "$VENV_DIR/bin/activate"
    echo "Virtual environment activated"
fi

cd "$BIOMNI_DIR"
echo "Starting Biomni MCP server on port 8080..."
echo "Press Ctrl+C to stop the server"

# Use basic server if the full MCP server fails
if python3 -c "import mcp" 2>/dev/null; then
    echo "Using full MCP server..."
    python3 run_mcp_server.py --port 8080
else
    echo "Using basic mock MCP server..."
    python3 basic_mcp_server.py --port 8080
fi