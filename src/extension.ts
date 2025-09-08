import * as vscode from 'vscode';
import { BiomniMcpClient } from './biomni/mcpClient';
import { BiomniMCPProvider } from './biomni/mcpProvider';
import { ExtensionConfig } from './types/config';
import { FileTypeManager } from './fileTypes';
import { BiomniSettingsService } from './settings';
import { BIOMNI_COMMANDS } from './commands';
import { BiomniCommandHandlers } from './commands/handlers';
import { BiomniSidebarProvider } from './sidebar/BiomniSidebarProvider';
// import { PerformanceMonitorService } from './services/performanceMonitor';

let mcpClient: BiomniMcpClient | undefined;
let mcpProvider: BiomniMCPProvider | undefined;
let fileTypeManager: FileTypeManager | undefined;
let settingsService: BiomniSettingsService | undefined;
let commandHandlers: BiomniCommandHandlers | undefined;
let sidebarProvider: BiomniSidebarProvider | undefined;
// Performance monitor for tracking extension performance
// let performanceMonitor: PerformanceMonitorService | undefined;

/**
 * Extension activation function
 * Called when the extension is activated
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // Initialize performance monitoring FIRST to track activation time
  // performanceMonitor = PerformanceMonitorService.getInstance();
  // performanceMonitor.initialize(context);
  
  // Immediate output to verify activation is called
  void vscode.window.showInformationMessage('🚀 Biomni Extension: Activation starting...');
  console.log('===== BIOMNI EXTENSION ACTIVATION STARTED =====');
  console.log('Extension path:', context.extensionPath);
  console.log('Timestamp:', new Date().toISOString());

  try {
    // CRITICAL: Register commands FIRST - this should never fail
    // Initialize command handlers with minimal dependencies
    console.log('Creating command handlers...');
    commandHandlers = new BiomniCommandHandlers(undefined, context);
    console.log('Command handlers created');
    console.log('Command handlers object:', typeof commandHandlers);
    console.log(
      'handleValidateFormat exists?',
      typeof (commandHandlers as any).handleValidateFormat
    );

    // Register all commands immediately
    console.log('Starting command registration...');
    registerBiomniCommands(context);
    console.log('Command registration complete');
  } catch (error) {
    console.error('CRITICAL: Failed to register commands:', error);
    void vscode.window.showErrorMessage(`Extension activation failed: ${error}`);
    // Don't continue if command registration fails
    return;
  }

  // Now try to initialize other services (these can fail without breaking commands)
  try {
    // Initialize settings service
    settingsService = BiomniSettingsService.getInstance(context, vscode.ConfigurationTarget.Global);
    await settingsService.initialize();
    console.log('Settings service initialized');

    // Get extension configuration from new settings service
    const config = await getExtensionConfig();

    // Initialize file type detection system
    fileTypeManager = new FileTypeManager();
    fileTypeManager.initialize(context);
    console.log('File type manager initialized');

    // Initialize sidebar provider (will use mock data initially)
    sidebarProvider = new BiomniSidebarProvider(context, undefined);
    console.log('Sidebar provider initialized');

    // Initialize MCP provider and client if enabled
    if (config.enabled) {
      try {
        // Create MCP provider
        mcpProvider = new BiomniMCPProvider(config);

        // Register MCP provider with VSCode language model system
        const mcpProviderDisposable = vscode.lm.registerMcpServerDefinitionProvider(
          'biomniProvider',
          {
            onDidChangeMcpServerDefinitions: mcpProvider.onDidChangeMcpServerDefinitions,
            provideMcpServerDefinitions: mcpProvider.provideMcpServerDefinitions.bind(mcpProvider),
            resolveMcpServerDefinition: mcpProvider.resolveMcpServerDefinition.bind(mcpProvider),
          }
        );
        context.subscriptions.push(mcpProviderDisposable);

        // Initialize MCP client for direct communication
        mcpClient = new BiomniMcpClient(config);
        await mcpClient.initialize();

        // Update command handlers with MCP client
        commandHandlers.updateMcpClient(mcpClient);

        // Update sidebar provider with MCP client
        if (sidebarProvider) {
          sidebarProvider.updateMcpClient(mcpClient);
        }

        console.log('MCP client initialized and connected to services');
      } catch (mcpError) {
        console.error('MCP initialization failed:', mcpError);
        // Continue without MCP - commands still work
      }
    }

    // Show activation message
    if (config.autoActivate) {
      void vscode.window.showInformationMessage(
        'Biomni MCP Integration with Smart File Detection is now active!'
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to initialize services:', errorMessage);
    // Note: Commands are still registered even if services fail
  }

  console.log('===== BIOMNI EXTENSION ACTIVATION COMPLETE =====');
  console.log(`Total commands registered: ${BIOMNI_COMMANDS.length}`);
  
  // Complete performance monitoring activation measurement
  // if (performanceMonitor) {
  //   performanceMonitor.completeActivationMeasurement();
  //   performanceMonitor.logPerformanceDashboard();
  // }
}

/**
 * Extension deactivation function
 * Called when the extension is deactivated
 */
export async function deactivate(): Promise<void> {
  console.log('Biomni MCP Integration extension is being deactivated');

  try {
    // Clean up file type manager
    if (fileTypeManager) {
      fileTypeManager.dispose();
      fileTypeManager = undefined;
    }

    // Clean up sidebar provider
    if (sidebarProvider) {
      // No specific dispose method needed for TreeDataProvider
      sidebarProvider = undefined;
    }

    // Clean up MCP provider and client
    if (mcpProvider) {
      mcpProvider.dispose();
      mcpProvider = undefined;
    }

    if (mcpClient) {
      await mcpClient.dispose();
      mcpClient = undefined;
    }

    // Clean up command handlers
    if (commandHandlers) {
      commandHandlers.dispose();
      commandHandlers = undefined;
    }

    // Clean up settings service
    if (settingsService) {
      settingsService.dispose();
      settingsService = undefined;
    }

    // Clean up performance monitor
    // if (performanceMonitor) {
    //   performanceMonitor.dispose();
    //   performanceMonitor = undefined;
    // }

    console.log('Biomni MCP Integration extension deactivated successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error during deactivation:', errorMessage);
  }
}

/**
 * Register all Biomni commands using the new command system
 */
function registerBiomniCommands(context: vscode.ExtensionContext): void {
  console.log(`Registering ${BIOMNI_COMMANDS.length} Biomni commands...`);

  // Register all commands from the BIOMNI_COMMANDS configuration
  BIOMNI_COMMANDS.forEach(commandDef => {
    try {
      console.log(`Registering command: ${commandDef.command}`);
      const command = vscode.commands.registerCommand(commandDef.command, async () => {
        if (!commandHandlers) {
          void vscode.window.showErrorMessage('Command handlers not initialized');
          return;
        }

        try {
          // Map command identifiers to handler methods
          const handlerMethodName = commandDef.handler;
          console.log(`Executing command ${commandDef.command} with handler ${handlerMethodName}`);
          const handlerMethod = (commandHandlers as any)[handlerMethodName];

          if (typeof handlerMethod === 'function') {
            console.log(`Calling handler method ${handlerMethodName}`);
            await handlerMethod.call(commandHandlers);
          } else {
            console.error(`Handler ${handlerMethodName} not found on commandHandlers`);
            void vscode.window.showWarningMessage(
              `Handler ${handlerMethodName} not implemented yet`
            );
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          void vscode.window.showErrorMessage(`Command failed: ${errorMsg}`);
        }
      });

      context.subscriptions.push(command);
      console.log(`Successfully registered: ${commandDef.command}`);
    } catch (error) {
      console.error(`Failed to register command ${commandDef.command}:`, error);
    }
  });

  // Also register legacy activate/deactivate commands for backward compatibility
  registerLegacyCommands(context);

  // Register a simple test command to verify command system works
  const testCommand = vscode.commands.registerCommand('biomni.test', () => {
    console.log('TEST COMMAND EXECUTED');
    void vscode.window.showInformationMessage('Biomni Test Command Works! Extension is active.');
  });
  context.subscriptions.push(testCommand);
  console.log('Test command registered: biomni.test');
}

/**
 * Register legacy extension commands for backward compatibility
 * NOTE: Only register commands here that are NOT in BIOMNI_COMMANDS array
 * to avoid duplicate registration errors
 */
function registerLegacyCommands(context: vscode.ExtensionContext): void {
  const commands = [
    vscode.commands.registerCommand('biomni.activate', async () => {
      try {
        const config = await getExtensionConfig();
        if (!mcpClient || !mcpProvider) {
          // Create MCP provider
          mcpProvider = new BiomniMCPProvider(config);

          // Register MCP provider with VSCode language model system
          const mcpProviderDisposable = vscode.lm.registerMcpServerDefinitionProvider(
            'biomniProvider',
            {
              onDidChangeMcpServerDefinitions: mcpProvider.onDidChangeMcpServerDefinitions,
              provideMcpServerDefinitions:
                mcpProvider.provideMcpServerDefinitions.bind(mcpProvider),
              resolveMcpServerDefinition: mcpProvider.resolveMcpServerDefinition.bind(mcpProvider),
            }
          );
          context.subscriptions.push(mcpProviderDisposable);

          // Initialize MCP client
          mcpClient = new BiomniMcpClient(config);
          await mcpClient.initialize();

          // Update command handlers with new MCP client
          if (commandHandlers) {
            commandHandlers.updateMcpClient(mcpClient);
          }

          void vscode.window.showInformationMessage('Biomni MCP Integration activated');
        } else {
          void vscode.window.showInformationMessage('Biomni MCP Integration is already active');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        void vscode.window.showErrorMessage(`Activation failed: ${errorMessage}`);
      }
    }),

    vscode.commands.registerCommand('biomni.deactivate', async () => {
      try {
        if (mcpClient || mcpProvider) {
          if (mcpProvider) {
            mcpProvider.dispose();
            mcpProvider = undefined;
          }
          if (mcpClient) {
            await mcpClient.dispose();
            mcpClient = undefined;
          }
          void vscode.window.showInformationMessage('Biomni MCP Integration deactivated');
        } else {
          void vscode.window.showInformationMessage('Biomni MCP Integration is not active');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        void vscode.window.showErrorMessage(`Deactivation failed: ${errorMessage}`);
      }
    }),

    // MCP-specific commands
    vscode.commands.registerCommand('biomni.mcp.showStatus', async () => {
      try {
        if (!mcpProvider || !mcpClient) {
          void vscode.window.showWarningMessage('Biomni MCP Integration is not active');
          return;
        }

        const healthStatus = mcpProvider.getHealthStatus();
        const clientStatus = mcpClient.getStatus();
        const tools = mcpProvider.getDiscoveredTools();

        const statusMessage = [
          `MCP Server Status: ${healthStatus?.healthy ? 'Healthy' : 'Unhealthy'}`,
          `Client Status: ${clientStatus.connected ? 'Connected' : 'Disconnected'}`,
          `Server URL: ${clientStatus.serverUrl}`,
          `Available Tools: ${tools.length}`,
          `Last Health Check: ${healthStatus?.lastCheck?.toLocaleTimeString() || 'Never'}`,
        ].join('\n');

        void vscode.window.showInformationMessage(statusMessage);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        void vscode.window.showErrorMessage(`Failed to get status: ${errorMessage}`);
      }
    }),

    vscode.commands.registerCommand('biomni.mcp.listTools', async () => {
      try {
        if (!mcpProvider && !mcpClient) {
          void vscode.window.showWarningMessage('Biomni MCP Integration is not active');
          return;
        }

        const tools = mcpProvider?.getDiscoveredTools() || mcpClient?.getAvailableTools() || [];

        if (tools.length === 0) {
          void vscode.window.showInformationMessage('No tools discovered from MCP server');
          return;
        }

        const toolList = tools.map(tool => `• ${tool.name}: ${tool.description}`).join('\n');

        void vscode.window.showInformationMessage(
          `Available Biomni Tools (${tools.length}):\n\n${toolList}`
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        void vscode.window.showErrorMessage(`Failed to list tools: ${errorMessage}`);
      }
    }),

    vscode.commands.registerCommand('biomni.mcp.testConnection', async () => {
      try {
        if (!mcpClient) {
          void vscode.window.showWarningMessage('Biomni MCP client is not active');
          return;
        }

        void vscode.window.showInformationMessage('Testing MCP server connection...');

        const healthStatus = await mcpClient.healthCheck();

        if (healthStatus.healthy) {
          void vscode.window.showInformationMessage(
            `✅ MCP server connection test successful!\nServer version: ${healthStatus.serverVersion || 'Unknown'}`
          );
        } else {
          void vscode.window.showWarningMessage(
            `⚠️ MCP server connection test failed: ${healthStatus.errorMessage || 'Unknown error'}`
          );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        void vscode.window.showErrorMessage(`Connection test failed: ${errorMessage}`);
      }
    }),

    // Settings management command (not duplicated in BIOMNI_COMMANDS)
    vscode.commands.registerCommand('biomni.settings.openPanel', async () => {
      try {
        await vscode.commands.executeCommand('workbench.action.openSettings', 'biomni');
        void vscode.window.showInformationMessage('Biomni settings panel opened');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        void vscode.window.showErrorMessage(`Failed to open settings panel: ${errorMessage}`);
      }
    }),

    // Performance monitoring commands
    // Performance monitoring commands - temporarily disabled
    vscode.commands.registerCommand('biomni.performance.showDashboard', async () => {
      void vscode.window.showInformationMessage('Performance dashboard is temporarily disabled');
    }),

    vscode.commands.registerCommand('biomni.performance.logReport', () => {
      void vscode.window.showInformationMessage('Performance logging is temporarily disabled');
    }),

    vscode.commands.registerCommand('biomni.performance.reset', () => {
      void vscode.window.showInformationMessage('Performance reset is temporarily disabled');
    }),
  ];

  // Add all commands to context subscriptions
  commands.forEach(command => {
    context.subscriptions.push(command);
  });
}

/**
 * Get extension configuration from settings service
 */
async function getExtensionConfig(): Promise<ExtensionConfig> {
  if (!settingsService) {
    // Fallback to direct VSCode configuration if settings service not available
    const config = vscode.workspace.getConfiguration('biomni.extension.core');
    return {
      enabled: config.get<boolean>('enabled', true),
      mcpServerUrl: config.get<string>('mcpServerUrl', 'http://localhost:8080'),
      autoActivate: config.get<boolean>('autoActivate', true),
    };
  }

  const extensionSettings = await settingsService.getSetting('extension');

  return {
    enabled: extensionSettings.core.enabled,
    mcpServerUrl: extensionSettings.core.mcpServerUrl,
    autoActivate: extensionSettings.core.autoActivate,
  };
}
