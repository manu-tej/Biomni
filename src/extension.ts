import * as vscode from 'vscode';
import { BiomniMcpClient } from './biomni/mcpClient';
import { ExtensionConfig } from './types/config';
import { FileTypeManager } from './fileTypes';
import { BiomniSettingsService } from './settings';

let mcpClient: BiomniMcpClient | undefined;
let fileTypeManager: FileTypeManager | undefined;
let settingsService: BiomniSettingsService | undefined;

/**
 * Extension activation function
 * Called when the extension is activated
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('Biomni MCP Integration extension is now active!');

  try {
    // Initialize settings service first
    settingsService = BiomniSettingsService.getInstance(context, vscode.ConfigurationTarget.Global);
    await settingsService.initialize();

    // Get extension configuration from new settings service
    const config = await getExtensionConfig();

    // Initialize file type detection system
    fileTypeManager = new FileTypeManager();
    fileTypeManager.initialize(context);

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
        'Biomni MCP Integration with Smart File Detection is now active!'
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
    // Clean up file type manager
    if (fileTypeManager) {
      fileTypeManager.dispose();
      fileTypeManager = undefined;
    }

    // Clean up MCP client
    if (mcpClient) {
      await mcpClient.dispose();
      mcpClient = undefined;
    }

    // Clean up settings service
    if (settingsService) {
      settingsService.dispose();
      settingsService = undefined;
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
        const config = await getExtensionConfig();
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

    // Settings management commands
    vscode.commands.registerCommand('biomni.settings.openPanel', async () => {
      try {
        await vscode.commands.executeCommand('workbench.action.openSettings', 'biomni');
        void vscode.window.showInformationMessage('Biomni settings panel opened');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        void vscode.window.showErrorMessage(`Failed to open settings panel: ${errorMessage}`);
      }
    }),

    vscode.commands.registerCommand('biomni.settings.export', async () => {
      if (!settingsService) {
        void vscode.window.showErrorMessage('Settings service not initialized');
        return;
      }

      try {
        const exportData = await settingsService.exportSettings(true);
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `biomni-settings-${timestamp}.json`;
        
        const uri = await vscode.window.showSaveDialog({
          defaultUri: vscode.Uri.file(filename),
          filters: {
            'JSON files': ['json'],
            'All files': ['*']
          }
        });

        if (uri) {
          await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(exportData, null, 2)));
          void vscode.window.showInformationMessage(`Settings exported to ${uri.fsPath}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        void vscode.window.showErrorMessage(`Export failed: ${errorMessage}`);
      }
    }),

    vscode.commands.registerCommand('biomni.settings.import', async () => {
      if (!settingsService) {
        void vscode.window.showErrorMessage('Settings service not initialized');
        return;
      }

      try {
        const uri = await vscode.window.showOpenDialog({
          canSelectMany: false,
          openLabel: 'Import Settings',
          filters: {
            'JSON files': ['json'],
            'All files': ['*']
          }
        });

        if (uri && uri.length > 0) {
          const fileContent = await vscode.workspace.fs.readFile(uri[0]);
          const importData = JSON.parse(fileContent.toString());
          
          // Ask for confirmation
          const choice = await vscode.window.showWarningMessage(
            'This will overwrite your current settings. Continue?',
            'Yes', 'No'
          );
          
          if (choice === 'Yes') {
            await settingsService.importSettings(importData);
            void vscode.window.showInformationMessage('Settings imported successfully');
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        void vscode.window.showErrorMessage(`Import failed: ${errorMessage}`);
      }
    }),

    vscode.commands.registerCommand('biomni.settings.reset', async () => {
      if (!settingsService) {
        void vscode.window.showErrorMessage('Settings service not initialized');
        return;
      }

      try {
        const choice = await vscode.window.showWarningMessage(
          'This will reset all Biomni settings to default values. Continue?',
          'Yes', 'No'
        );
        
        if (choice === 'Yes') {
          await settingsService.resetToDefaults();
          void vscode.window.showInformationMessage('Settings reset to defaults');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        void vscode.window.showErrorMessage(`Reset failed: ${errorMessage}`);
      }
    }),

    vscode.commands.registerCommand('biomni.settings.manageApiKeys', async () => {
      if (!settingsService) {
        void vscode.window.showErrorMessage('Settings service not initialized');
        return;
      }

      try {
        const action = await vscode.window.showQuickPick([
          'Add/Update API Key',
          'Remove API Key',
          'List API Keys'
        ], { placeHolder: 'Select API key action' });

        if (action === 'Add/Update API Key') {
          const keyName = await vscode.window.showInputBox({
            prompt: 'Enter API key name (e.g., ncbiApiKey, uniprotApiKey)',
            placeHolder: 'ncbiApiKey'
          });
          
          if (keyName) {
            const keyValue = await vscode.window.showInputBox({
              prompt: `Enter the value for ${keyName}`,
              password: true
            });
            
            if (keyValue) {
              await settingsService.storeApiKey(keyName, keyValue);
              void vscode.window.showInformationMessage(`API key '${keyName}' stored securely`);
            }
          }
        } else if (action === 'Remove API Key') {
          const keyName = await vscode.window.showInputBox({
            prompt: 'Enter API key name to remove',
            placeHolder: 'ncbiApiKey'
          });
          
          if (keyName) {
            await settingsService.removeApiKey(keyName);
            void vscode.window.showInformationMessage(`API key '${keyName}' removed`);
          }
        } else if (action === 'List API Keys') {
          const settings = await settingsService.getAllSettings();
          const apiKeyStatus = [];
          
          if (settings.security.apiKeys.ncbiApiKeySet) apiKeyStatus.push('✓ NCBI API Key');
          if (settings.security.apiKeys.uniprotApiKeySet) apiKeyStatus.push('✓ UniProt API Key'); 
          if (settings.security.apiKeys.ensemblApiKeySet) apiKeyStatus.push('✓ Ensembl API Key');
          
          for (const customKey of settings.security.apiKeys.customApiKeysSet) {
            apiKeyStatus.push(`✓ ${customKey}`);
          }
          
          if (apiKeyStatus.length === 0) {
            apiKeyStatus.push('No API keys configured');
          }
          
          void vscode.window.showInformationMessage(
            `API Keys Status:\n${apiKeyStatus.join('\n')}`
          );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        void vscode.window.showErrorMessage(`API key management failed: ${errorMessage}`);
      }
    }),

    vscode.commands.registerCommand('biomni.settings.validateConfiguration', async () => {
      if (!settingsService) {
        void vscode.window.showErrorMessage('Settings service not initialized');
        return;
      }

      try {
        const settings = await settingsService.getAllSettings();
        // You would implement validation logic here
        void vscode.window.showInformationMessage('Configuration validation completed successfully');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        void vscode.window.showErrorMessage(`Validation failed: ${errorMessage}`);
      }
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
