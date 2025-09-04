#!/usr/bin/env python3
"""
Mock test for Enhanced MCP Server (without external dependencies)
"""

import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path


class MockMCPServerManager:
    """Mock version for testing without dependencies"""
    
    def __init__(self, config_path: str = None):
        self.config_path = config_path
        self.config = self._load_config()
        self.start_time = time.time()
        self.status = "initializing"
        self.tools_loaded = []
    
    def _load_config(self):
        """Load configuration from file or use defaults"""
        default_config = {
            "server": {"name": "BiomniTools", "transport": "stdio"},
            "logging": {"level": "INFO", "format": "json"},
            "tools": {"modules": ["biomni.tool.database"]},
            "health_check": {"enabled": True, "interval": 30}
        }
        
        if not self.config_path:
            return default_config
            
        config_file = Path(self.config_path)
        if not config_file.exists():
            return default_config
            
        try:
            with open(config_file, 'r') as f:
                user_config = json.load(f)
            
            # Simple merge
            result = default_config.copy()
            for key, value in user_config.items():
                if key in result and isinstance(result[key], dict):
                    result[key].update(value)
                else:
                    result[key] = value
            return result
        except Exception as e:
            print(f"Config error: {e}")
            return default_config
    
    def health_check(self):
        """Mock health check"""
        return {
            "status": "healthy",
            "uptime": int(time.time() - self.start_time),
            "tools_loaded": ["biomni.tool.database"],
            "memory_usage": "mock data",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "process_id": 12345,
            "config_path": self.config_path
        }
    
    def get_capabilities(self):
        """Mock capabilities"""
        return {
            "server_name": self.config.get("server", {}).get("name", "BiomniTools"),
            "version": "1.0.0",
            "transport_modes": ["stdio"],
            "tools_loaded": 1,
            "tool_modules": ["biomni.tool.database"],
            "features": {
                "health_check": True,
                "graceful_shutdown": True,
                "structured_logging": True,
                "configuration": True
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }


def test_mock_server():
    """Test the mock server functionality"""
    print("Enhanced MCP Server Mock Test")
    print("=" * 40)
    
    # Test with JSON config
    config_path = Path(__file__).parent / "config.json"
    server = MockMCPServerManager(str(config_path))
    
    # Test health check
    print("Testing health check...")
    health = server.health_check()
    print("✅ Health check:", health.get("status"))
    
    # Test capabilities
    print("Testing capabilities...")
    capabilities = server.get_capabilities()
    print("✅ Capabilities:", capabilities.get("server_name"))
    
    # Test configuration loading
    print("Testing configuration loading...")
    print("✅ Config loaded:", server.config.get("server", {}).get("name"))
    
    print("\n🎉 Mock tests completed successfully!")
    
    # Output JSON for inspection
    print("\nHealth Check Response:")
    print(json.dumps(health, indent=2))
    
    print("\nCapabilities Response:")
    print(json.dumps(capabilities, indent=2))


if __name__ == "__main__":
    test_mock_server()