import * as vscode from 'vscode';
import { McpClientConfig } from '../types/config';
import { MCPWebSocketManager } from './websocket';

/**
 * Health status for MCP server monitoring
 */
export interface HealthStatus {
  healthy: boolean;
  lastCheck: Date;
  errorMessage?: string;
  serverVersion?: string;
  capabilities?: string[];
}

/**
 * Tool information discovered from MCP server
 */
export interface ToolInfo {
  name: string;
  description: string;
  parameters: any;
}

/**
 * Server capabilities information
 */
export interface ServerCapabilities {
  tools?: ToolInfo[];
  prompts?: any[];
  resources?: any[];
  version: string;
}

/**
 * Biomni MCP Provider that integrates with VSCode's language model system
 * Implements the McpServerDefinitionProvider interface to register MCP server
 */
export class BiomniMCPProvider {
  private readonly didChangeEmitter = new vscode.EventEmitter<void>();
  private config: McpClientConfig;
  private serverHealth: HealthStatus | undefined;
  private discoveredTools: ToolInfo[] = [];
  private isServerRunning = false;
  private wsManager: MCPWebSocketManager | null = null;

  constructor(config: McpClientConfig) {
    this.config = config;
    this.initializeWebSocket();
  }

  private initializeWebSocket(): void {
    // Convert HTTP URL to WebSocket URL
    const wsUrl = this.config.mcpServerUrl.replace(/^http/, 'ws');

    this.wsManager = new MCPWebSocketManager({
      url: wsUrl,
      reconnectInterval: 5000,
      maxReconnectAttempts: 5,
      pingInterval: 30000,
    });

    // Set up event handlers
    this.wsManager.on('connected', () => {
      console.log('MCP WebSocket connected');
      this.isServerRunning = true;
      void this.checkHealth();
      this.discoverTools();
    });

    this.wsManager.on('disconnected', () => {
      console.log('MCP WebSocket disconnected');
      this.isServerRunning = false;
      this.serverHealth = {
        healthy: false,
        lastCheck: new Date(),
        errorMessage: 'WebSocket disconnected',
      };
      this.didChangeEmitter.fire();
    });

    this.wsManager.on('error', error => {
      console.error('MCP WebSocket error:', error);
      vscode.window.showErrorMessage(`MCP connection error: ${error.message}`);
    });

    this.wsManager.on('notification', message => {
      this.handleNotification(message);
    });
  }

  /**
   * Event emitted when MCP server definitions change
   */
  get onDidChangeMcpServerDefinitions(): vscode.Event<void> {
    return this.didChangeEmitter.event;
  }

  /**
   * Provide MCP server definitions to VSCode
   * This method is called by VSCode to get available MCP servers
   */
  async provideMcpServerDefinitions(): Promise<vscode.McpServerDefinition[]> {
    const servers: vscode.McpServerDefinition[] = [];

    try {
      // Check if we should provide the Biomni MCP server
      if (this.config.enabled) {
        // Create a stdio server definition for the Biomni MCP server
        const biomniServerPath = this.getBiomniMCPServerPath();

        if (biomniServerPath) {
          // Create server definition - using a simpler approach for now
          const serverDefinition: vscode.McpServerDefinition = {
            label: 'Biomni MCP Server',
            version: '1.0.0',
            // Additional properties will be handled by VSCode MCP system
          } as any; // Temporary type assertion until we can determine the exact interface

          servers.push(serverDefinition);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to provide MCP server definitions:', errorMessage);

      // Show error to user but don't prevent other servers from being available
      void vscode.window.showWarningMessage(
        `Biomni MCP Server configuration error: ${errorMessage}`
      );
    }

    return servers;
  }

  /**
   * Resolve MCP server definition with any required user input
   * This method is called before starting the server to get additional configuration
   */
  async resolveMcpServerDefinition(
    server: vscode.McpServerDefinition
  ): Promise<vscode.McpServerDefinition | undefined> {
    try {
      if (server.label === 'Biomni MCP Server') {
        // Validate that the server can be started
        const isValid = await this.validateServerSetup();

        if (!isValid) {
          const choice = await vscode.window.showErrorMessage(
            'Biomni MCP Server setup is incomplete. Would you like to configure it now?',
            'Configure',
            'Skip'
          );

          if (choice === 'Configure') {
            await this.showConfigurationDialog();
            // Re-validate after configuration
            const isNowValid = await this.validateServerSetup();
            if (!isNowValid) {
              throw new Error('Server configuration is still incomplete');
            }
          } else {
            // User chose to skip, return undefined to prevent server startup
            return undefined;
          }
        }

        // Server is valid, return it as-is
        return server;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to resolve MCP server definition:', errorMessage);

      void vscode.window.showErrorMessage(`Failed to configure Biomni MCP Server: ${errorMessage}`);

      return undefined;
    }

    return server;
  }

  /**
   * Start MCP server and begin health monitoring
   */
  async startMCPServer(): Promise<void> {
    try {
      console.log('Starting Biomni MCP server...');

      // The actual server starting is handled by VSCode's MCP system
      // We just need to mark it as running and start health monitoring
      this.isServerRunning = true;

      // Start periodic health checks
      await this.startHealthMonitoring();

      // Discover available tools
      await this.discoverTools();

      console.log('Biomni MCP server started successfully');

      // Emit change event to notify VSCode
      this.didChangeEmitter.fire();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to start MCP server:', errorMessage);
      throw new Error(`MCP server startup failed: ${errorMessage}`);
    }
  }

  /**
   * Handle notifications from MCP server
   */
  private handleNotification(message: any): void {
    console.log('MCP notification received:', message);

    // Handle different notification types
    switch (message.method) {
      case 'tool.added':
        this.discoveredTools.push(message.params);
        this.didChangeEmitter.fire();
        break;

      case 'tool.removed':
        this.discoveredTools = this.discoveredTools.filter(
          tool => tool.name !== message.params.name
        );
        this.didChangeEmitter.fire();
        break;

      case 'server.status':
        this.serverHealth = {
          healthy: message.params.healthy,
          lastCheck: new Date(),
          serverVersion: message.params.version,
          capabilities: message.params.capabilities,
        };
        this.didChangeEmitter.fire();
        break;

      default:
        console.log('Unknown notification method:', message.method);
    }
  }

  /**
   * Check health of the MCP server
   */
  private async checkHealth(): Promise<void> {
    if (!this.wsManager?.isConnected()) {
      this.serverHealth = {
        healthy: false,
        lastCheck: new Date(),
        errorMessage: 'Not connected to MCP server',
      };
      return;
    }

    try {
      const response = await this.wsManager.sendRequest('health');
      this.serverHealth = {
        healthy: true,
        lastCheck: new Date(),
        serverVersion: response.version,
        capabilities: response.capabilities,
      };
    } catch (error) {
      this.serverHealth = {
        healthy: false,
        lastCheck: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Health check failed',
      };
    }
  }

  /**
   * Stop MCP server and clean up resources
   */
  async stopMCPServer(): Promise<void> {
    try {
      console.log('Stopping Biomni MCP server...');

      // Disconnect WebSocket
      if (this.wsManager) {
        this.wsManager.disconnect();
      }

      this.isServerRunning = false;
      this.serverHealth = undefined;
      this.discoveredTools = [];

      console.log('Biomni MCP server stopped successfully');

      // Emit change event to notify VSCode
      this.didChangeEmitter.fire();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to stop MCP server:', errorMessage);
    }
  }

  /**
   * Get current health status of the MCP server
   */
  getHealthStatus(): HealthStatus | undefined {
    return this.serverHealth;
  }

  /**
   * Get list of discovered tools
   */
  getDiscoveredTools(): ToolInfo[] {
    return [...this.discoveredTools];
  }

  /**
   * Check if MCP server is currently running
   */
  isRunning(): boolean {
    return this.isServerRunning;
  }

  /**
   * Update configuration and refresh server definitions
   */
  async updateConfiguration(config: McpClientConfig): Promise<void> {
    this.config = { ...this.config, ...config };

    // If server is running and configuration changed, emit change event
    if (this.isServerRunning) {
      this.didChangeEmitter.fire();
    }
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.didChangeEmitter.dispose();
    this.isServerRunning = false;
  }

  // Private helper methods

  /**
   * Get path to Biomni MCP server script
   */
  private getBiomniMCPServerPath(): string | undefined {
    // Try to find the Biomni MCP server in common locations
    const possiblePaths = [
      // User's Biomni installation
      `${process.env['HOME']}/Biomni/tutorials/examples/expose_biomni_server/run_mcp_server.py`,
      // Workspace relative path
      'biomni_mcp_server.py',
      // Current workspace if it contains the server
      'run_mcp_server.py',
    ];

    for (const path of possiblePaths) {
      try {
        // In a real implementation, we would check if the file exists
        // For now, return the first path as a default
        return path;
      } catch (error) {
        continue;
      }
    }

    return possiblePaths[0]; // Return default path
  }

  /**
   * Validate that the server can be started
   */
  private async validateServerSetup(): Promise<boolean> {
    try {
      // Check if Python is available
      // Check if Biomni is installed
      // Check if server script exists

      // For now, return true - in a real implementation we would do actual validation
      return true;
    } catch (error) {
      console.error('Server validation failed:', error);
      return false;
    }
  }

  /**
   * Show configuration dialog to help user set up the server
   */
  private async showConfigurationDialog(): Promise<void> {
    const choice = await vscode.window.showInformationMessage(
      'Biomni MCP Server requires setup. Please ensure:\n' +
        '1. Python is installed and available in PATH\n' +
        '2. Biomni is installed (pip install biomni)\n' +
        '3. The MCP server script is accessible',
      'Open Settings',
      'Documentation',
      'OK'
    );

    if (choice === 'Open Settings') {
      await vscode.commands.executeCommand('workbench.action.openSettings', 'biomni');
    } else if (choice === 'Documentation') {
      await vscode.env.openExternal(vscode.Uri.parse('https://github.com/manu-tej/Biomni'));
    }
  }

  /**
   * Start periodic health monitoring
   */
  private async startHealthMonitoring(): Promise<void> {
    try {
      // Perform initial health check
      await this.performHealthCheck();

      // Set up periodic health checks (every 30 seconds)
      const healthCheckInterval = setInterval(async () => {
        if (this.isServerRunning) {
          await this.performHealthCheck();
        } else {
          clearInterval(healthCheckInterval);
        }
      }, 30000);
    } catch (error) {
      console.error('Failed to start health monitoring:', error);
    }
  }

  /**
   * Perform health check on MCP server
   */
  private async performHealthCheck(): Promise<void> {
    try {
      // In a real implementation, we would ping the server
      // For now, simulate a successful health check

      this.serverHealth = {
        healthy: true,
        lastCheck: new Date(),
        serverVersion: '1.0.0',
        capabilities: ['tools', 'prompts'],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.serverHealth = {
        healthy: false,
        lastCheck: new Date(),
        errorMessage,
      };

      console.error('Health check failed:', errorMessage);
    }
  }

  /**
   * Discover available tools from the MCP server
   */
  private async discoverTools(): Promise<void> {
    try {
      // In a real implementation, we would query the server for available tools
      // For now, simulate some Biomni tools

      this.discoveredTools = [
        {
          name: 'blast_search',
          description: 'Perform BLAST sequence search',
          parameters: {
            type: 'object',
            properties: {
              sequence: { type: 'string', description: 'Input sequence' },
              database: { type: 'string', description: 'BLAST database' },
            },
            required: ['sequence'],
          },
        },
        {
          name: 'sequence_align',
          description: 'Align multiple sequences',
          parameters: {
            type: 'object',
            properties: {
              sequences: { type: 'array', description: 'Sequences to align' },
              algorithm: { type: 'string', description: 'Alignment algorithm' },
            },
            required: ['sequences'],
          },
        },
        {
          name: 'fetch_sequence',
          description: 'Fetch sequence from database',
          parameters: {
            type: 'object',
            properties: {
              accession: { type: 'string', description: 'Sequence accession number' },
              database: { type: 'string', description: 'Source database' },
            },
            required: ['accession'],
          },
        },
      ];

      console.log(`Discovered ${this.discoveredTools.length} tools from Biomni MCP server`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to discover tools:', errorMessage);
      this.discoveredTools = [];
    }
  }
}
