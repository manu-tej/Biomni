#!/usr/bin/env python3
"""
Basic MCP-compatible server for Biomni VSCode extension.
This is a mock server that provides the basic endpoints needed for testing.
"""

import sys
import json
import logging
import argparse
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime
import threading
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Server configuration
SERVER_INFO = {
    "name": "BiomniMCP",
    "version": "1.0.0",
    "status": "healthy",
    "start_time": datetime.now().isoformat()
}

# Mock tool definitions
AVAILABLE_TOOLS = {
    "database_query": {
        "name": "database_query",
        "description": "Query biological databases (UniProt, NCBI, PDB, etc.)",
        "parameters": {
            "database": {"type": "string", "required": True},
            "query": {"type": "string", "required": True},
            "limit": {"type": "integer", "default": 10}
        }
    },
    "sequence_analysis": {
        "name": "sequence_analysis",
        "description": "Analyze DNA/RNA/Protein sequences",
        "parameters": {
            "sequence": {"type": "string", "required": True},
            "analysis_type": {"type": "string", "required": True}
        }
    },
    "file_validation": {
        "name": "file_validation",
        "description": "Validate bioinformatics file formats",
        "parameters": {
            "file_path": {"type": "string", "required": True},
            "file_type": {"type": "string", "required": False}
        }
    }
}

class MCPHandler(BaseHTTPRequestHandler):
    """HTTP request handler for MCP server"""
    
    def do_GET(self):
        """Handle GET requests"""
        if self.path == "/health":
            self.send_health_response()
        elif self.path == "/capabilities":
            self.send_capabilities_response()
        elif self.path == "/tools":
            self.send_tools_response()
        else:
            self.send_error(404, "Endpoint not found")
    
    def do_POST(self):
        """Handle POST requests for MCP commands"""
        if self.path == "/execute":
            self.handle_tool_execution()
        elif self.path == "/mcp":
            self.handle_mcp_request()
        else:
            self.send_error(404, "Endpoint not found")
    
    def send_health_response(self):
        """Send health check response"""
        uptime = (datetime.now() - datetime.fromisoformat(SERVER_INFO["start_time"])).seconds
        response = {
            "status": "healthy",
            "server": SERVER_INFO["name"],
            "version": SERVER_INFO["version"],
            "uptime": uptime,
            "timestamp": datetime.now().isoformat(),
            "tools_loaded": len(AVAILABLE_TOOLS),
            "process_id": os.getpid()
        }
        self.send_json_response(response)
    
    def send_capabilities_response(self):
        """Send server capabilities"""
        response = {
            "server_name": SERVER_INFO["name"],
            "version": SERVER_INFO["version"],
            "transport_modes": ["http", "stdio"],
            "tools_loaded": len(AVAILABLE_TOOLS),
            "tool_names": list(AVAILABLE_TOOLS.keys()),
            "features": {
                "health_check": True,
                "tool_discovery": True,
                "async_execution": False,
                "batch_operations": False
            }
        }
        self.send_json_response(response)
    
    def send_tools_response(self):
        """Send available tools"""
        self.send_json_response({"tools": AVAILABLE_TOOLS})
    
    def handle_tool_execution(self):
        """Handle tool execution requests"""
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length > 0:
            post_data = self.rfile.read(content_length)
            try:
                request = json.loads(post_data)
                tool_name = request.get("tool")
                parameters = request.get("parameters", {})
                
                # Mock tool execution
                if tool_name in AVAILABLE_TOOLS:
                    response = self.execute_tool(tool_name, parameters)
                else:
                    response = {
                        "success": False,
                        "error": f"Unknown tool: {tool_name}"
                    }
            except json.JSONDecodeError:
                response = {
                    "success": False,
                    "error": "Invalid JSON in request body"
                }
        else:
            response = {
                "success": False,
                "error": "Empty request body"
            }
        
        self.send_json_response(response)
    
    def handle_mcp_request(self):
        """Handle MCP protocol requests"""
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length > 0:
            post_data = self.rfile.read(content_length)
            try:
                request = json.loads(post_data)
                method = request.get("method", "")
                
                if method == "initialize":
                    response = {
                        "protocolVersion": "1.0",
                        "serverInfo": SERVER_INFO,
                        "capabilities": {
                            "tools": True,
                            "resources": False,
                            "prompts": False
                        }
                    }
                elif method == "tools/list":
                    response = {
                        "tools": [
                            {
                                "name": tool_name,
                                "description": tool_info["description"],
                                "inputSchema": {
                                    "type": "object",
                                    "properties": tool_info["parameters"]
                                }
                            }
                            for tool_name, tool_info in AVAILABLE_TOOLS.items()
                        ]
                    }
                elif method == "tools/call":
                    tool_name = request.get("params", {}).get("name")
                    arguments = request.get("params", {}).get("arguments", {})
                    response = self.execute_tool(tool_name, arguments)
                else:
                    response = {
                        "error": f"Unknown method: {method}"
                    }
            except json.JSONDecodeError:
                response = {
                    "error": "Invalid JSON in request body"
                }
        else:
            response = {
                "error": "Empty request body"
            }
        
        self.send_json_response(response)
    
    def execute_tool(self, tool_name, parameters):
        """Execute a mock tool and return results"""
        logger.info(f"Executing tool: {tool_name} with parameters: {parameters}")
        
        # Mock responses for different tools
        if tool_name == "database_query":
            return {
                "success": True,
                "tool": tool_name,
                "results": [
                    {"id": "P12345", "name": "Sample Protein", "organism": "Homo sapiens"},
                    {"id": "P67890", "name": "Another Protein", "organism": "Mus musculus"}
                ],
                "count": 2,
                "message": f"Mock query results for: {parameters.get('query', 'unknown')}"
            }
        elif tool_name == "sequence_analysis":
            return {
                "success": True,
                "tool": tool_name,
                "analysis": {
                    "type": parameters.get("analysis_type", "basic"),
                    "length": len(parameters.get("sequence", "")),
                    "gc_content": "45.2%",
                    "message": "Mock analysis complete"
                }
            }
        elif tool_name == "file_validation":
            return {
                "success": True,
                "tool": tool_name,
                "validation": {
                    "file": parameters.get("file_path", "unknown"),
                    "format": parameters.get("file_type", "auto-detected"),
                    "valid": True,
                    "message": "Mock validation: File format appears valid"
                }
            }
        else:
            return {
                "success": False,
                "error": f"Tool '{tool_name}' not implemented"
            }
    
    def send_json_response(self, data, status=200):
        """Send JSON response"""
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data, indent=2).encode())
    
    def log_message(self, format, *args):
        """Override to use logger instead of stderr"""
        logger.info("%s - %s" % (self.address_string(), format % args))

def run_server(port=8080):
    """Run the MCP server"""
    server_address = ('', port)
    httpd = HTTPServer(server_address, MCPHandler)
    logger.info(f"Biomni MCP Server starting on port {port}")
    logger.info(f"Health check: http://localhost:{port}/health")
    logger.info(f"Capabilities: http://localhost:{port}/capabilities")
    logger.info(f"Available tools: http://localhost:{port}/tools")
    logger.info("Press Ctrl+C to stop the server")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        logger.info("Server shutting down...")
        httpd.shutdown()

def health_check(port=8080):
    """Check if server is running"""
    import urllib.request
    import urllib.error
    
    try:
        response = urllib.request.urlopen(f'http://localhost:{port}/health', timeout=2)
        data = json.loads(response.read())
        print(json.dumps(data, indent=2))
        return data.get('status') == 'healthy'
    except (urllib.error.URLError, TimeoutError) as e:
        print(f"Health check failed: Server not responding on port {port}")
        return False
    except Exception as e:
        print(f"Health check error: {e}")
        return False

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Biomni MCP Mock Server')
    parser.add_argument('--port', '-p', type=int, default=8080, help='Server port (default: 8080)')
    parser.add_argument('--health-check', action='store_true', help='Check server health and exit')
    parser.add_argument('--config', '-c', help='Configuration file (ignored in this mock server)')
    
    args = parser.parse_args()
    
    if args.health_check:
        sys.exit(0 if health_check(args.port) else 1)
    else:
        run_server(args.port)

if __name__ == "__main__":
    main()