#!/usr/bin/env python3
"""
Test script for the Enhanced MCP Server
"""

import json
import subprocess
import sys
from pathlib import Path


def test_server_capabilities():
    """Test server capabilities command"""
    print("Testing server capabilities...")
    
    server_path = Path(__file__).parent / "run_mcp_server.py"
    config_path = Path(__file__).parent / "config.yaml"
    
    try:
        result = subprocess.run([
            sys.executable, str(server_path),
            "--config", str(config_path),
            "--capabilities"
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            capabilities = json.loads(result.stdout)
            print("✅ Capabilities test passed")
            print(f"Server name: {capabilities.get('server_name')}")
            print(f"Tools loaded: {capabilities.get('tools_loaded')}")
            print(f"Tool modules: {capabilities.get('tool_modules')}")
            return True
        else:
            print(f"❌ Capabilities test failed: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print("❌ Capabilities test timed out")
        return False
    except Exception as e:
        print(f"❌ Capabilities test error: {e}")
        return False


def test_server_health():
    """Test server health check command"""
    print("\nTesting server health check...")
    
    server_path = Path(__file__).parent / "run_mcp_server.py"
    config_path = Path(__file__).parent / "config.yaml"
    
    try:
        result = subprocess.run([
            sys.executable, str(server_path),
            "--config", str(config_path),
            "--health-check"
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            health = json.loads(result.stdout)
            print("✅ Health check test passed")
            print(f"Status: {health.get('status')}")
            print(f"Memory usage: {health.get('memory_usage')}")
            print(f"Process ID: {health.get('process_id')}")
            return True
        else:
            print(f"❌ Health check test failed: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print("❌ Health check test timed out")
        return False
    except Exception as e:
        print(f"❌ Health check test error: {e}")
        return False


def test_config_creation():
    """Test config file creation"""
    print("\nTesting config file creation...")
    
    server_path = Path(__file__).parent / "run_mcp_server.py"
    test_config_path = Path(__file__).parent / "test_config.yaml"
    
    # Clean up any existing test config
    if test_config_path.exists():
        test_config_path.unlink()
    
    try:
        result = subprocess.run([
            sys.executable, str(server_path),
            "--create-config", str(test_config_path)
        ], capture_output=True, text=True, timeout=10)
        
        if result.returncode == 0 and test_config_path.exists():
            print("✅ Config creation test passed")
            print(f"Created: {test_config_path}")
            
            # Clean up
            test_config_path.unlink()
            return True
        else:
            print(f"❌ Config creation test failed: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print("❌ Config creation test timed out")
        return False
    except Exception as e:
        print(f"❌ Config creation test error: {e}")
        return False


def main():
    """Run all tests"""
    print("Enhanced MCP Server Test Suite")
    print("=" * 40)
    
    tests = [
        test_config_creation,
        test_server_health,
        test_server_capabilities
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"❌ Test {test.__name__} crashed: {e}")
            failed += 1
    
    print("\n" + "=" * 40)
    print(f"Tests completed: {passed} passed, {failed} failed")
    
    if failed > 0:
        sys.exit(1)
    else:
        print("🎉 All tests passed!")


if __name__ == "__main__":
    main()