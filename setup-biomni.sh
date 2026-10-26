#!/bin/bash

# Biomni VSCode Extension Setup Script
# This script sets up the MCP server and dependencies for the Biomni extension

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BIOMNI_DIR="$SCRIPT_DIR/src/biomni"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Biomni VSCode Extension Setup${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Step 1: Check Python installation
echo -e "${YELLOW}Step 1: Checking Python installation...${NC}"
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version 2>&1 | sed 's/Python //')
    echo -e "${GREEN}✓ Python $PYTHON_VERSION found${NC}"
    
    # Check if Python version is 3.7+
    MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
    MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)
    if [ "$MAJOR" -eq 3 ] && [ "$MINOR" -ge 7 ]; then
        echo -e "${GREEN}✓ Python version is compatible${NC}"
    else
        echo -e "${RED}✗ Python 3.7+ is required${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Python 3 is not installed${NC}"
    echo "Please install Python 3.7+ first:"
    echo "  macOS: brew install python3"
    echo "  Ubuntu: sudo apt-get install python3"
    exit 1
fi
echo ""

# Step 2: Setup Python virtual environment
echo -e "${YELLOW}Step 2: Setting up Python environment...${NC}"

VENV_DIR="$SCRIPT_DIR/venv"

# Create virtual environment if it doesn't exist
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment..."
    python3 -m venv "$VENV_DIR"
    echo -e "${GREEN}✓ Virtual environment created${NC}"
else
    echo -e "${GREEN}✓ Virtual environment already exists${NC}"
fi

# Activate virtual environment
source "$VENV_DIR/bin/activate"
echo -e "${GREEN}✓ Virtual environment activated${NC}"

# Upgrade pip
pip install --upgrade pip --quiet

# Function to check if a Python package is installed
check_package() {
    python -c "import $1" 2>/dev/null
    return $?
}

# Install required packages
PACKAGES=("pyyaml" "psutil")
echo -e "${YELLOW}Installing Python dependencies...${NC}"
for package in "${PACKAGES[@]}"; do
    if check_package "$package"; then
        echo -e "${GREEN}✓ $package is already installed${NC}"
    else
        echo -e "${YELLOW}Installing $package...${NC}"
        pip install "$package" --quiet
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ $package installed successfully${NC}"
        else
            echo -e "${YELLOW}⚠ Could not install $package${NC}"
        fi
    fi
done

# Note about mcp and biomni packages
echo -e "${YELLOW}Note: The 'mcp' and 'biomni' packages are not available on PyPI.${NC}"
echo "The basic MCP server will work without them for testing purposes."
echo ""

# Step 3: Create MCP server configuration
echo -e "${YELLOW}Step 3: Creating MCP server configuration...${NC}"

CONFIG_FILE="$BIOMNI_DIR/config.yaml"

if [ -f "$CONFIG_FILE" ]; then
    echo -e "${GREEN}✓ Configuration file already exists at $CONFIG_FILE${NC}"
    read -p "Do you want to overwrite it? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Keeping existing configuration"
    else
        # Create default configuration
        cat > "$CONFIG_FILE" << 'EOF'
server:
  name: "BiomniTools"
  transport: "stdio"
  port: 8080
  
logging:
  level: "INFO"
  format: "json"
  file: null
  
tools:
  modules:
    - "biomni.tool.database"
    - "biomni.tool.file_manager"
  auto_discover: true
  
health_check:
  enabled: true
  interval: 30

# API endpoints configuration
api:
  ncbi:
    base_url: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"
  uniprot:
    base_url: "https://rest.uniprot.org/"
  ensembl:
    base_url: "https://rest.ensembl.org/"
  pdb:
    base_url: "https://data.rcsb.org/rest/v1/"
EOF
        echo -e "${GREEN}✓ Configuration file created at $CONFIG_FILE${NC}"
    fi
else
    # Create default configuration
    cat > "$CONFIG_FILE" << 'EOF'
server:
  name: "BiomniTools"
  transport: "stdio"
  port: 8080
  
logging:
  level: "INFO"
  format: "json"
  file: null
  
tools:
  modules:
    - "biomni.tool.database"
    - "biomni.tool.file_manager"
  auto_discover: true
  
health_check:
  enabled: true
  interval: 30

# API endpoints configuration
api:
  ncbi:
    base_url: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"
  uniprot:
    base_url: "https://rest.uniprot.org/"
  ensembl:
    base_url: "https://rest.ensembl.org/"
  pdb:
    base_url: "https://data.rcsb.org/rest/v1/"
EOF
    echo -e "${GREEN}✓ Configuration file created at $CONFIG_FILE${NC}"
fi
echo ""

# Step 4: Test MCP server
echo -e "${YELLOW}Step 4: Testing MCP server...${NC}"

cd "$BIOMNI_DIR"

# Check if the server script exists
if [ ! -f "run_mcp_server.py" ]; then
    echo -e "${RED}✗ MCP server script not found at $BIOMNI_DIR/run_mcp_server.py${NC}"
    echo "Creating a basic MCP server script..."
    
    # Create a basic MCP server if it doesn't exist
    cat > "run_mcp_server.py" << 'EOF'
#!/usr/bin/env python3
"""Basic MCP server for Biomni VSCode extension"""

import sys
import json
import logging
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MCPHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        """Handle GET requests"""
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            response = {
                "status": "healthy",
                "server": "BiomniMCP",
                "version": "1.0.0"
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_POST(self):
        """Handle POST requests for MCP commands"""
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.end_headers()
        
        # Echo back for now - real implementation would process commands
        response = {
            "status": "received",
            "data": json.loads(post_data) if post_data else {}
        }
        self.wfile.write(json.dumps(response).encode())
    
    def log_message(self, format, *args):
        """Suppress default logging"""
        pass

def run_server(port=8080):
    """Run the MCP server"""
    server_address = ('', port)
    httpd = HTTPServer(server_address, MCPHandler)
    logger.info(f"MCP Server running on port {port}")
    logger.info(f"Health check: http://localhost:{port}/health")
    httpd.serve_forever()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Biomni MCP Server')
    parser.add_argument('--port', '-p', type=int, default=8080, help='Server port')
    parser.add_argument('--health-check', action='store_true', help='Check server health')
    parser.add_argument('--config', '-c', help='Configuration file (not used in basic server)')
    
    args = parser.parse_args()
    
    if args.health_check:
        import urllib.request
        try:
            response = urllib.request.urlopen(f'http://localhost:{args.port}/health')
            data = json.loads(response.read())
            print(json.dumps(data, indent=2))
            sys.exit(0 if data.get('status') == 'healthy' else 1)
        except Exception as e:
            print(f"Health check failed: {e}")
            sys.exit(1)
    else:
        run_server(args.port)
EOF
    chmod +x run_mcp_server.py
    echo -e "${GREEN}✓ Basic MCP server script created${NC}"
fi

# Test if server can be started
echo "Testing server startup..."
timeout 2 python3 run_mcp_server.py --health-check 2>/dev/null && {
    echo -e "${GREEN}✓ MCP server is already running${NC}"
} || {
    echo -e "${YELLOW}MCP server is not running${NC}"
}
echo ""

# Step 5: Create startup script
echo -e "${YELLOW}Step 5: Creating server startup script...${NC}"

START_SCRIPT="$SCRIPT_DIR/start-mcp-server.sh"
cat > "$START_SCRIPT" << EOF
#!/bin/bash
# Start the Biomni MCP server

# Activate virtual environment
source "$VENV_DIR/bin/activate"

cd "$BIOMNI_DIR"
echo "Starting Biomni MCP server on port 8080..."
python run_mcp_server.py --config config.yaml --port 8080
EOF
chmod +x "$START_SCRIPT"
echo -e "${GREEN}✓ Startup script created at $START_SCRIPT${NC}"
echo ""

# Step 6: API Keys instruction
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}API Keys Configuration${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo "To configure API keys for bioinformatics services:"
echo ""
echo "1. Open VSCode"
echo "2. Press Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows/Linux)"
echo "3. Type and run: ${GREEN}Biomni: Manage API Keys${NC}"
echo ""
echo "You'll need API keys from:"
echo "  • NCBI: https://www.ncbi.nlm.nih.gov/account/settings/"
echo "  • UniProt: https://www.uniprot.org/help/api"
echo "  • Ensembl: https://rest.ensembl.org/"
echo "  • PDB: https://www.rcsb.org/docs/api/getting-started"
echo ""

# Step 7: Start the server
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Starting MCP Server${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo "To start the MCP server, run:"
echo -e "${GREEN}./start-mcp-server.sh${NC}"
echo ""
echo "Or start it in the background:"
echo -e "${GREEN}nohup ./start-mcp-server.sh > mcp-server.log 2>&1 &${NC}"
echo ""

# Step 8: Final instructions
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Final Steps${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo "1. Start the MCP server (see above)"
echo "2. In VSCode, run: ${GREEN}Biomni: Activate Biomni MCP Integration${NC}"
echo "3. Configure your API keys"
echo "4. Test with: ${GREEN}Biomni: Test Connection${NC}"
echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "For troubleshooting, check:"
echo "  • MCP server logs: tail -f mcp-server.log"
echo "  • VSCode Output panel (select 'Biomni' from dropdown)"
echo "  • Developer Tools: Help > Toggle Developer Tools"