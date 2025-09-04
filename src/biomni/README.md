# Enhanced Biomni MCP Server

An enhanced Model Context Protocol (MCP) server that provides better VSCode extension integration with configurable tool loading, health checks, lifecycle management, and structured communication protocols.

## Features

- **Configurable Tool Loading**: Dynamic loading of Biomni tool modules
- **Health Monitoring**: Built-in health check endpoint for extension monitoring
- **Capability Discovery**: Server introspection for available tools and features
- **Configuration Management**: YAML/JSON configuration file support
- **Structured Logging**: JSON and text format logging with multiple verbosity levels
- **Graceful Lifecycle**: Proper startup/shutdown with resource cleanup
- **Error Handling**: Meaningful error codes for troubleshooting
- **Dependency Management**: Graceful degradation when optional dependencies unavailable

## Quick Start

### Basic Usage
```bash
# Start server with default configuration
python3 run_mcp_server.py

# Start with custom configuration
python3 run_mcp_server.py --config config.json

# Start with specific tool modules
python3 run_mcp_server.py --tools biomni.tool.database biomni.tool.file_manager
```

### Health Check
```bash
python3 run_mcp_server.py --health-check
```

### Show Capabilities
```bash
python3 run_mcp_server.py --capabilities
```

### Create Configuration Template
```bash
python3 run_mcp_server.py --create-config my-config.yaml
```

## Configuration

The server supports both YAML and JSON configuration files:

```yaml
server:
  name: "BiomniTools"
  transport: "stdio"
  
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
```

## Command Line Options

```bash
python3 run_mcp_server.py [OPTIONS]

Options:
  --config, -c PATH       Configuration file path
  --port, -p INTEGER      Server port (overrides config)
  --tools MODULE ...      Tool modules to load
  --health-check         Run health check and exit
  --capabilities         Show capabilities and exit
  --create-config PATH   Create sample config file
  --verbose, -v          Enable verbose logging
  --help                 Show help message
```

## API Endpoints

### Health Check Response
```json
{
  "status": "healthy",
  "uptime": 12345,
  "tools_loaded": ["biomni.tool.database"],
  "memory_usage": "45.2MB",
  "last_activity": "2025-09-04T12:18:29Z",
  "timestamp": "2025-09-04T12:18:29Z",
  "process_id": 12345,
  "config_path": "/path/to/config.json"
}
```

### Capabilities Response
```json
{
  "server_name": "BiomniTools",
  "version": "1.0.0",
  "transport_modes": ["stdio"],
  "tools_loaded": 1,
  "tool_modules": ["biomni.tool.database"],
  "features": {
    "health_check": true,
    "graceful_shutdown": true,
    "structured_logging": true,
    "configuration": true
  }
}
```

## Error Codes

- `CONFIG_ERROR` - Configuration loading issues
- `TOOL_LOADING_ERROR` - Tool module loading failures  
- `STARTUP_ERROR` - Server startup failures
- `TRANSPORT_ERROR` - Transport configuration issues
- `CAPABILITIES_ERROR` - Capability discovery failures
- `DEPENDENCY_ERROR` - Missing dependencies

## Dependencies

### Required
- Python 3.7+
- `mcp` - Model Context Protocol library
- `biomni` - Biomni agent and tools

### Optional (graceful degradation)
- `pyyaml` - YAML configuration support
- `psutil` - Enhanced memory usage reporting

## Testing

```bash
# Run comprehensive test suite
python3 test_server.py

# Run mock tests (no external dependencies)
python3 test_server_mock.py
```

## VSCode Extension Integration

The server provides all interfaces needed for reliable VSCode extension integration:

1. **Health Monitoring**: Poll `--health-check` to verify server status
2. **Capability Discovery**: Query `--capabilities` to understand available tools  
3. **Configuration**: Generate and modify config files programmatically
4. **Error Handling**: Meaningful error codes for user feedback
5. **Lifecycle**: Graceful startup/shutdown ensures clean integration

## Architecture

```
MCPServerManager
├── Configuration Loading (YAML/JSON)
├── Tool Module Loading (Dynamic)  
├── Health Check Monitoring
├── Capability Discovery
├── Structured Logging
├── Signal Handling
└── Resource Cleanup
```

## License

Same as parent Biomni project.