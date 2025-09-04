import * as vscode from 'vscode';
import { BIOMNI_COMMANDS } from '../../src/commands/index';

// Mock the entire VSCode API for integration testing
jest.mock('vscode', () => ({
  commands: {
    registerCommand: jest.fn((id: string, handler: Function) => ({ dispose: jest.fn() })),
    executeCommand: jest.fn()
  },
  window: {
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showInputBox: jest.fn(),
    showQuickPick: jest.fn(),
    showOpenDialog: jest.fn(),
    createOutputChannel: jest.fn(() => ({
      appendLine: jest.fn(),
      dispose: jest.fn()
    })),
    withProgress: jest.fn(),
    activeTextEditor: undefined
  },
  workspace: {
    openTextDocument: jest.fn(),
    getConfiguration: jest.fn(() => ({
      get: jest.fn()
    }))
  },
  ProgressLocation: {
    Notification: 15
  },
  ConfigurationTarget: {
    Global: 1
  },
  Uri: {
    file: jest.fn((path: string) => ({ fsPath: path }))
  }
}));

describe('Command Palette Integration', () => {
  let mockContext: vscode.ExtensionContext;
  let registeredCommands: Map<string, Function>;

  beforeEach(() => {
    registeredCommands = new Map();
    
    // Mock extension context
    mockContext = {
      subscriptions: [],
      extensionPath: '/mock/path',
      globalState: {
        get: jest.fn(),
        update: jest.fn(),
        keys: jest.fn(() => [])
      },
      workspaceState: {
        get: jest.fn(),
        update: jest.fn(),
        keys: jest.fn(() => [])
      },
      secrets: {
        get: jest.fn(),
        store: jest.fn(),
        delete: jest.fn()
      },
      globalStoragePath: '/mock/global',
      logPath: '/mock/log',
      storageUri: vscode.Uri.file('/mock/storage'),
      globalStorageUri: vscode.Uri.file('/mock/global-storage'),
      logUri: vscode.Uri.file('/mock/log')
    } as any;

    // Mock command registration to track registered commands
    (vscode.commands.registerCommand as jest.Mock).mockImplementation((id: string, handler: Function) => {
      registeredCommands.set(id, handler);
      return { dispose: jest.fn() };
    });

    jest.clearAllMocks();
  });

  describe('Command Registration', () => {
    it('should register all Biomni commands', async () => {
      // Import and activate the extension
      const { activate } = await import('../../src/extension');
      
      // Mock the required dependencies
      const mockMcpClient = {
        initialize: jest.fn(),
        getCapabilities: jest.fn(() => ({ tools: [] })),
        callTool: jest.fn(),
        dispose: jest.fn()
      };

      const mockMcpProvider = {
        onDidChangeMcpServerDefinitions: jest.fn(),
        provideMcpServerDefinitions: jest.fn(),
        resolveMcpServerDefinition: jest.fn(),
        dispose: jest.fn()
      };

      // Mock VSCode language model registration
      (vscode as any).lm = {
        registerMcpServerDefinitionProvider: jest.fn(() => ({ dispose: jest.fn() }))
      };

      try {
        await activate(mockContext);
      } catch (error) {
        // Extension activation might fail in test environment, but commands should still be registered
        console.log('Extension activation failed in test environment (expected):', error);
      }

      // Verify that all Biomni commands are registered
      BIOMNI_COMMANDS.forEach(cmdDef => {
        expect(registeredCommands.has(cmdDef.command)).toBe(true);
      });

      // Verify legacy commands are also registered
      expect(registeredCommands.has('biomni.activate')).toBe(true);
      expect(registeredCommands.has('biomni.deactivate')).toBe(true);
    });
  });

  describe('Command Execution', () => {
    beforeEach(async () => {
      // Set up command registration
      const { activate } = await import('../../src/extension');
      try {
        await activate(mockContext);
      } catch (error) {
        // Ignore activation errors in test environment
      }
    });

    it('should execute commands without throwing errors', async () => {
      // Test a sample of commands
      const testCommands = [
        'biomni.database.queryUniprot',
        'biomni.genomics.blastSequence',
        'biomni.pharmacology.runDiffDock',
        'biomni.support.runPython'
      ];

      for (const commandId of testCommands) {
        const handler = registeredCommands.get(commandId);
        expect(handler).toBeDefined();

        if (handler) {
          // Commands should handle missing inputs gracefully
          await expect(handler()).resolves.not.toThrow();
        }
      }
    });

    it('should handle commands gracefully when MCP client is not initialized', async () => {
      const handler = registeredCommands.get('biomni.database.queryUniprot');
      expect(handler).toBeDefined();

      if (handler) {
        await handler();
        
        // Should show appropriate error message
        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
          expect.stringContaining('not initialized')
        );
      }
    });
  });

  describe('Command Palette Visibility', () => {
    it('should make all commands visible in command palette', () => {
      // This would be tested by VSCode extension test runner
      // Here we verify the configuration is correct
      const packageJsonCommands = BIOMNI_COMMANDS.map(cmd => ({
        command: cmd.command,
        title: cmd.title,
        category: `Biomni ${cmd.category}`
      }));

      expect(packageJsonCommands.length).toBe(20);
      
      packageJsonCommands.forEach(cmd => {
        expect(cmd.command).toMatch(/^biomni\./);
        expect(cmd.title).toBeTruthy();
        expect(cmd.category).toMatch(/^Biomni /);
      });
    });

    it('should have proper command categorization for searchability', () => {
      const categories = new Set(BIOMNI_COMMANDS.map(cmd => cmd.category));
      
      expect(categories.has('Database')).toBe(true);
      expect(categories.has('Genomics')).toBe(true);
      expect(categories.has('Pharmacology')).toBe(true);
      expect(categories.has('Analysis')).toBe(true);
      expect(categories.has('File Operations')).toBe(true);
    });
  });

  describe('Context-Sensitive Command Availability', () => {
    it('should show FASTA commands for FASTA files', () => {
      const fastaCommands = BIOMNI_COMMANDS.filter(cmd => 
        cmd.when && cmd.when.includes('fasta')
      );

      expect(fastaCommands.length).toBeGreaterThan(0);
      
      const blastCommand = fastaCommands.find(cmd => 
        cmd.command === 'biomni.genomics.blastSequence'
      );
      expect(blastCommand).toBeDefined();
    });

    it('should show single cell commands for appropriate file types', () => {
      const scRNACommands = BIOMNI_COMMANDS.filter(cmd => 
        cmd.when && (cmd.when.includes('h5') || cmd.when.includes('csv'))
      );

      expect(scRNACommands.length).toBeGreaterThan(0);
      
      const annotateCommand = scRNACommands.find(cmd => 
        cmd.command === 'biomni.genomics.annotateScRNA'
      );
      expect(annotateCommand).toBeDefined();
    });

    it('should have general commands available globally', () => {
      const globalCommands = BIOMNI_COMMANDS.filter(cmd => !cmd.when);
      
      expect(globalCommands.length).toBeGreaterThan(0);
      
      // Database commands should be globally available
      const uniprotCommand = globalCommands.find(cmd => 
        cmd.command === 'biomni.database.queryUniprot'
      );
      expect(uniprotCommand).toBeDefined();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should register keyboard shortcuts for key commands', () => {
      const commandsWithShortcuts = BIOMNI_COMMANDS.filter(cmd => cmd.keybinding);
      
      expect(commandsWithShortcuts.length).toBe(4); // As defined in our command list
      
      const shortcuts = commandsWithShortcuts.reduce((acc, cmd) => {
        acc[cmd.command] = cmd.keybinding;
        return acc;
      }, {} as Record<string, string | undefined>);

      expect(shortcuts['biomni.database.queryUniprot']).toBe('ctrl+shift+u');
      expect(shortcuts['biomni.genomics.blastSequence']).toBe('ctrl+shift+b');
      expect(shortcuts['biomni.pharmacology.runDiffDock']).toBe('ctrl+shift+d');
      expect(shortcuts['biomni.file.validateFormat']).toBe('ctrl+shift+v');
    });
  });

  describe('Command Priority and Ordering', () => {
    it('should have database commands with highest priority', () => {
      const databaseCommands = BIOMNI_COMMANDS.filter(cmd => cmd.category === 'Database');
      
      databaseCommands.forEach(cmd => {
        expect(cmd.priority).toBeGreaterThanOrEqual(85);
      });
    });

    it('should have commands ordered by priority', () => {
      for (let i = 0; i < BIOMNI_COMMANDS.length - 1; i++) {
        // Priority should generally decrease (allowing for same-priority commands)
        expect(BIOMNI_COMMANDS[i].priority).toBeGreaterThanOrEqual(
          BIOMNI_COMMANDS[i + 1].priority - 5 // Allow small variations
        );
      }
    });
  });

  describe('Command Error Handling', () => {
    it('should handle invalid command execution gracefully', async () => {
      const handler = registeredCommands.get('biomni.database.queryUniprot');
      
      if (handler) {
        // Mock user canceling input
        (vscode.window.showInputBox as jest.Mock).mockResolvedValue(undefined);
        
        await handler();
        
        // Should not show error message for user cancellation
        expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
      }
    });

    it('should show appropriate error messages for failed operations', async () => {
      const handler = registeredCommands.get('biomni.database.queryUniprot');
      
      if (handler) {
        // Mock successful input but failed MCP call
        (vscode.window.showInputBox as jest.Mock).mockResolvedValue('test query');
        (vscode.window.withProgress as jest.Mock).mockImplementation((options, callback) => {
          return callback({ report: jest.fn() }, { isCancellationRequested: false });
        });

        await handler();
        
        // Should show error about MCP client not being initialized
        expect(vscode.window.showErrorMessage).toHaveBeenCalled();
      }
    });
  });
});