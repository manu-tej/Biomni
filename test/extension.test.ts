import * as vscode from 'vscode';
import { activate, deactivate } from '../src/extension';

// Mock VSCode context
const mockContext: vscode.ExtensionContext = {
  subscriptions: [],
  workspaceState: {} as any,
  globalState: {} as any,
  extensionUri: {} as any,
  extensionPath: '',
  asAbsolutePath: jest.fn(),
  storageUri: {} as any,
  storagePath: '',
  globalStorageUri: {} as any,
  globalStoragePath: '',
  logUri: {} as any,
  logPath: '',
  extensionMode: vscode.ExtensionMode.Test,
  extension: {} as any,
  secrets: {} as any,
  environmentVariableCollection: {} as any,
  languageModelAccessInformation: {} as any,
};

describe('Extension', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('activate', () => {
    it('should activate successfully with default config', async () => {
      // Mock configuration
      const mockConfig = {
        get: jest.fn((key: string, defaultValue: any) => {
          switch (key) {
            case 'enabled':
              return true;
            case 'mcpServerUrl':
              return 'http://localhost:8080';
            case 'autoActivate':
              return true;
            default:
              return defaultValue;
          }
        }),
      };

      (global as any).mockVscode.workspace.getConfiguration.mockReturnValue(mockConfig);

      await expect(activate(mockContext)).resolves.not.toThrow();
    });

    it('should handle activation failure gracefully', async () => {
      // Mock configuration to throw error
      (global as any).mockVscode.workspace.getConfiguration.mockImplementation(() => {
        throw new Error('Configuration error');
      });

      await expect(activate(mockContext)).resolves.not.toThrow();
      expect((global as any).mockVscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Failed to activate Biomni MCP Integration')
      );
    });

    it('should register commands', async () => {
      const mockConfig = {
        get: jest.fn((_key: string, defaultValue: any) => defaultValue),
      };

      (global as any).mockVscode.workspace.getConfiguration.mockReturnValue(mockConfig);

      await activate(mockContext);

      expect((global as any).mockVscode.commands.registerCommand).toHaveBeenCalledWith(
        'biomni.activate',
        expect.any(Function)
      );
      expect((global as any).mockVscode.commands.registerCommand).toHaveBeenCalledWith(
        'biomni.deactivate',
        expect.any(Function)
      );
    });
  });

  describe('deactivate', () => {
    it('should deactivate successfully', async () => {
      await expect(deactivate()).resolves.not.toThrow();
    });

    it('should handle deactivation errors gracefully', async () => {
      // First activate to have something to clean up
      const mockConfig = {
        get: jest.fn((key: string, defaultValue: any) => {
          if (key === 'enabled') return true;
          return defaultValue;
        }),
      };

      (global as any).mockVscode.workspace.getConfiguration.mockReturnValue(mockConfig);

      await activate(mockContext);
      await expect(deactivate()).resolves.not.toThrow();
    });
  });
});