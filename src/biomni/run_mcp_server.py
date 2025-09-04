#!/usr/bin/env python3
"""
Enhanced MCP Server for Biomni-VSCode Integration

Provides configurable tool loading, health checks, lifecycle management,
and structured communication protocols for VSCode extension integration.
"""

import argparse
import asyncio
import json
import logging
import os
import signal
import sys
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False
    
try:
    import yaml
    YAML_AVAILABLE = True
except ImportError:
    YAML_AVAILABLE = False
from mcp.server.fastmcp import FastMCP


class MCPServerError(Exception):
    """Base exception for MCP Server errors"""
    def __init__(self, message: str, error_code: str = "GENERAL_ERROR"):
        self.error_code = error_code
        super().__init__(message)


class MCPServerManager:
    """Enhanced MCP Server Manager with configuration, health checks, and lifecycle management"""
    
    def __init__(self, config_path: Optional[str] = None):
        self.config_path = config_path
        self.config = self._load_config()
        self.mcp_server: Optional[FastMCP] = None
        self.agent = None
        self.start_time = time.time()
        self.status = "initializing"
        self.tools_loaded = []
        self.last_activity = None
        
        # Setup logging
        self._setup_logging()
        self.logger = logging.getLogger(__name__)
        
        # Setup signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
        self.logger.info("MCPServerManager initialized", extra={
            "config_path": config_path,
            "status": self.status
        })

    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from file or use defaults"""
        default_config = {
            "server": {
                "name": "BiomniTools",
                "port": None,
                "host": "localhost",
                "transport": "stdio"
            },
            "logging": {
                "level": "INFO",
                "format": "json",
                "file": None
            },
            "tools": {
                "modules": ["biomni.tool.database"],
                "auto_discover": True
            },
            "health_check": {
                "enabled": True,
                "interval": 30
            }
        }
        
        if not self.config_path:
            return default_config
            
        config_file = Path(self.config_path)
        if not config_file.exists():
            return default_config
            
        try:
            with open(config_file, 'r') as f:
                if config_file.suffix.lower() in ['.yml', '.yaml']:
                    if not YAML_AVAILABLE:
                        raise MCPServerError("PyYAML not installed, cannot load YAML config", "DEPENDENCY_ERROR")
                    user_config = yaml.safe_load(f)
                else:
                    user_config = json.load(f)
            
            # Merge configs (user config overrides default)
            def merge_dict(default, user):
                result = default.copy()
                for key, value in user.items():
                    if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                        result[key] = merge_dict(result[key], value)
                    else:
                        result[key] = value
                return result
            
            return merge_dict(default_config, user_config)
        except Exception as e:
            raise MCPServerError(f"Failed to load config: {e}", "CONFIG_ERROR")

    def _setup_logging(self):
        """Configure structured logging"""
        log_config = self.config.get("logging", {})
        level = getattr(logging, log_config.get("level", "INFO").upper())
        
        # Create logger
        logger = logging.getLogger()
        logger.setLevel(level)
        
        # Clear any existing handlers
        logger.handlers.clear()
        
        # Create formatter
        if log_config.get("format") == "json":
            formatter = logging.Formatter(
                '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "message": "%(message)s", "module": "%(name)s"}',
                datefmt='%Y-%m-%dT%H:%M:%S%z'
            )
        else:
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)
        
        # File handler if specified
        log_file = log_config.get("file")
        if log_file:
            file_handler = logging.FileHandler(log_file)
            file_handler.setFormatter(formatter)
            logger.addHandler(file_handler)

    def load_tools(self, tool_modules: Optional[List[str]] = None) -> int:
        """Load tool modules into the MCP server"""
        try:
            # Import Biomni agent
            from biomni.agent.a1 import A1
            
            self.logger.info("Creating Biomni A1 agent")
            self.agent = A1()
            
            # Determine which modules to load
            if tool_modules is None:
                tool_modules = self.config.get("tools", {}).get("modules", ["biomni.tool.database"])
            
            self.logger.info("Loading tool modules", extra={"modules": tool_modules})
            
            # Create MCP server with specified tools
            self.mcp_server = self.agent.create_mcp_server(tool_modules=tool_modules)
            
            # Track loaded tools
            self.tools_loaded = tool_modules.copy()
            
            self.logger.info("Tools loaded successfully", extra={
                "count": len(tool_modules),
                "modules": tool_modules
            })
            
            return len(tool_modules)
            
        except Exception as e:
            self.logger.error("Failed to load tools", extra={
                "error": str(e),
                "traceback": traceback.format_exc()
            })
            raise MCPServerError(f"Failed to load tools: {e}", "TOOL_LOADING_ERROR")

    def health_check(self) -> Dict[str, Any]:
        """Get server health status"""
        try:
            uptime = time.time() - self.start_time
            
            health_data = {
                "status": self.status,
                "uptime": int(uptime),
                "tools_loaded": self.tools_loaded,
                "last_activity": self.last_activity,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "process_id": os.getpid(),
                "config_path": self.config_path
            }
            
            # Add memory info if psutil is available
            if PSUTIL_AVAILABLE:
                try:
                    process = psutil.Process()
                    memory_info = process.memory_info()
                    health_data["memory_usage"] = f"{memory_info.rss / 1024 / 1024:.1f}MB"
                except Exception:
                    health_data["memory_usage"] = "unavailable"
            else:
                health_data["memory_usage"] = "psutil not installed"
            
            return health_data
        except Exception as e:
            self.logger.error("Health check failed", extra={"error": str(e)})
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

    def get_capabilities(self) -> Dict[str, Any]:
        """Get server capabilities and available tools"""
        try:
            capabilities = {
                "server_name": self.config.get("server", {}).get("name", "BiomniTools"),
                "version": "1.0.0",
                "transport_modes": ["stdio", "http"],
                "tools_loaded": len(self.tools_loaded),
                "tool_modules": self.tools_loaded,
                "features": {
                    "health_check": True,
                    "graceful_shutdown": True,
                    "structured_logging": True,
                    "configuration": True
                },
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            # Add tool details if available
            if self.agent and hasattr(self.agent, 'module2api'):
                tools_detail = {}
                for module in self.tools_loaded:
                    if module in self.agent.module2api:
                        tools_detail[module] = len(self.agent.module2api[module])
                capabilities["tools_detail"] = tools_detail
            
            return capabilities
            
        except Exception as e:
            self.logger.error("Failed to get capabilities", extra={"error": str(e)})
            raise MCPServerError(f"Failed to get capabilities: {e}", "CAPABILITIES_ERROR")

    def start_server(self, port: Optional[int] = None):
        """Start the MCP server"""
        try:
            self.status = "starting"
            self.logger.info("Starting MCP server")
            
            # Load tools if not already loaded
            if not self.mcp_server:
                self.load_tools()
            
            # Update status
            self.status = "healthy"
            self.last_activity = datetime.now(timezone.utc).isoformat()
            
            # Get transport configuration
            transport = self.config.get("server", {}).get("transport", "stdio")
            server_port = port or self.config.get("server", {}).get("port")
            
            self.logger.info("Server ready", extra={
                "transport": transport,
                "port": server_port,
                "tools_count": len(self.tools_loaded)
            })
            
            # Run the server
            if transport == "stdio":
                self.mcp_server.run(transport="stdio")
            else:
                # For future HTTP support
                self.logger.error("HTTP transport not yet implemented")
                raise MCPServerError("HTTP transport not yet implemented", "TRANSPORT_ERROR")
                
        except KeyboardInterrupt:
            self.logger.info("Received interrupt signal, shutting down")
            self.shutdown()
        except Exception as e:
            self.status = "error"
            self.logger.error("Failed to start server", extra={
                "error": str(e),
                "traceback": traceback.format_exc()
            })
            raise MCPServerError(f"Failed to start server: {e}", "STARTUP_ERROR")

    def shutdown(self):
        """Gracefully shutdown the server"""
        self.logger.info("Initiating graceful shutdown")
        self.status = "stopping"
        
        try:
            # Cleanup resources
            if self.mcp_server:
                # FastMCP doesn't have explicit cleanup, but we can log it
                self.logger.info("Cleaning up MCP server resources")
            
            if self.agent:
                # Clean up agent resources if needed
                self.logger.info("Cleaning up Biomni agent resources")
            
            self.status = "stopped"
            self.logger.info("Server shutdown complete")
            
        except Exception as e:
            self.logger.error("Error during shutdown", extra={"error": str(e)})
        
        finally:
            sys.exit(0)

    def _signal_handler(self, signum, frame):
        """Handle system signals for graceful shutdown"""
        signal_name = signal.Signals(signum).name
        self.logger.info("Received signal", extra={"signal": signal_name})
        self.shutdown()


def create_sample_config(output_path: str):
    """Create a sample configuration file"""
    sample_config = {
        "server": {
            "name": "BiomniTools",
            "transport": "stdio",
            "port": None
        },
        "logging": {
            "level": "INFO",
            "format": "json",
            "file": None
        },
        "tools": {
            "modules": [
                "biomni.tool.database",
                "biomni.tool.file_manager",
                "biomni.tool.data_processing"
            ],
            "auto_discover": True
        },
        "health_check": {
            "enabled": True,
            "interval": 30
        }
    }
    
    with open(output_path, 'w') as f:
        if YAML_AVAILABLE:
            yaml.dump(sample_config, f, default_flow_style=False, indent=2)
        else:
            json.dump(sample_config, f, indent=2)
    
    print(f"Sample configuration created at: {output_path}")


def main():
    """Main entry point for the enhanced MCP server"""
    parser = argparse.ArgumentParser(description="Enhanced Biomni MCP Server")
    parser.add_argument("--config", "-c", help="Configuration file path")
    parser.add_argument("--port", "-p", type=int, help="Server port (overrides config)")
    parser.add_argument("--tools", nargs="+", help="Tool modules to load")
    parser.add_argument("--health-check", action="store_true", help="Run health check and exit")
    parser.add_argument("--capabilities", action="store_true", help="Show capabilities and exit")
    parser.add_argument("--create-config", help="Create sample config file at specified path")
    parser.add_argument("--verbose", "-v", action="store_true", help="Enable verbose logging")
    
    args = parser.parse_args()
    
    # Handle special commands
    if args.create_config:
        create_sample_config(args.create_config)
        return
    
    try:
        # Create server manager
        server = MCPServerManager(config_path=args.config)
        
        # Override log level if verbose
        if args.verbose:
            logging.getLogger().setLevel(logging.DEBUG)
        
        # Handle info commands
        if args.health_check:
            health = server.health_check()
            print(json.dumps(health, indent=2))
            return
            
        if args.capabilities:
            # Load tools first to get accurate capabilities
            server.load_tools(args.tools)
            capabilities = server.get_capabilities()
            print(json.dumps(capabilities, indent=2))
            return
        
        # Start the server
        print("Starting Enhanced Biomni MCP Server...")
        print(f"Configuration: {server.config_path or 'default'}")
        print(f"Tools: {args.tools or server.config.get('tools', {}).get('modules', [])}")
        
        server.start_server(port=args.port)
        
    except MCPServerError as e:
        print(f"MCP Server Error [{e.error_code}]: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()