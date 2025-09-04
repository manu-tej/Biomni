import * as vscode from 'vscode';
import { BiomniMcpClient } from './biomni/mcpClient';
import { ExtensionConfig } from './types/config';

let mcpClient: BiomniMcpClient | undefined;

/**
 * Extension activation function
 * Called when the extension is activated
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('Biomni MCP Integration extension is now active!');

  try {
    // Get extension configuration
    const config = getExtensionConfig();

    // Initialize MCP client if enabled
    if (config.enabled) {
      mcpClient = new BiomniMcpClient(config);
      await mcpClient.initialize();
    }

    // Register commands
    registerCommands(context);

    // Show activation message
    if (config.autoActivate) {
      void vscode.window.showInformationMessage(
        'Biomni MCP Integration is now active and ready to assist!'
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to activate Biomni MCP Integration:', errorMessage);
    void vscode.window.showErrorMessage(
      `Failed to activate Biomni MCP Integration: ${errorMessage}`
    );
  }
}

/**
 * Extension deactivation function
 * Called when the extension is deactivated
 */
export async function deactivate(): Promise<void> {
  console.log('Biomni MCP Integration extension is being deactivated');

  try {
    // Clean up MCP client
    if (mcpClient) {
      await mcpClient.dispose();
      mcpClient = undefined;
    }

    console.log('Biomni MCP Integration extension deactivated successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error during deactivation:', errorMessage);
  }
}

/**
 * Register extension commands
 */
function registerCommands(context: vscode.ExtensionContext): void {
  const commands = [
    vscode.commands.registerCommand('biomni.activate', async () => {
      try {
        const config = getExtensionConfig();
        if (!mcpClient) {
          mcpClient = new BiomniMcpClient(config);
          await mcpClient.initialize();
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
        if (mcpClient) {
          await mcpClient.dispose();
          mcpClient = undefined;
          void vscode.window.showInformationMessage('Biomni MCP Integration deactivated');
        } else {
          void vscode.window.showInformationMessage('Biomni MCP Integration is not active');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        void vscode.window.showErrorMessage(`Deactivation failed: ${errorMessage}`);
      }
    }),
  ];

  // Add all commands to context subscriptions
  commands.forEach(command => {
    context.subscriptions.push(command);
  });
}

/**
 * Get extension configuration from VSCode settings
 */
function getExtensionConfig(): ExtensionConfig {
  const config = vscode.workspace.getConfiguration('biomni');

  return {
    enabled: config.get<boolean>('enabled', true),
    mcpServerUrl: config.get<string>('mcpServerUrl', 'http://localhost:8080'),
    autoActivate: config.get<boolean>('autoActivate', true),
  };
}
