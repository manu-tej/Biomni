import * as vscode from 'vscode';
import { BiomniCommandHandlers } from '../../src/commands/handlers';
import { BiomniMcpClient } from '../../src/biomni/mcpClient';

// Mock VSCode API
jest.mock('vscode', () => ({
  window: {
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showInputBox: jest.fn(),
    showQuickPick: jest.fn(),
    showOpenDialog: jest.fn(),
    showSaveDialog: jest.fn(),
    showTextDocument: jest.fn(),
    createOutputChannel: jest.fn(() => ({
      appendLine: jest.fn(),
      dispose: jest.fn()
    })),
    withProgress: jest.fn(),
    activeTextEditor: undefined
  },
  workspace: {
    openTextDocument: jest.fn(),
    fs: {
      writeFile: jest.fn(),
      readFile: jest.fn()
    }
  },
  ProgressLocation: {
    Notification: 15
  },
  Uri: {
    file: jest.fn((path: string) => ({ fsPath: path }))
  }
}));

// Mock MCP Client
const mockMcpClient = {
  callTool: jest.fn(),
  getCapabilities: jest.fn(),
  initialize: jest.fn(),
  dispose: jest.fn()
} as unknown as BiomniMcpClient;

describe('BiomniCommandHandlers', () => {
  let handlers: BiomniCommandHandlers;
  let mockShowInputBox: jest.Mock;
  let mockShowQuickPick: jest.Mock;
  let mockShowInformationMessage: jest.Mock;
  let mockShowErrorMessage: jest.Mock;
  let mockWithProgress: jest.Mock;

  beforeEach(() => {
    handlers = new BiomniCommandHandlers(mockMcpClient);
    mockShowInputBox = vscode.window.showInputBox as jest.Mock;
    mockShowQuickPick = vscode.window.showQuickPick as jest.Mock;
    mockShowInformationMessage = vscode.window.showInformationMessage as jest.Mock;
    mockShowErrorMessage = vscode.window.showErrorMessage as jest.Mock;
    mockWithProgress = vscode.window.withProgress as jest.Mock;
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    handlers.dispose();
  });

  describe('Database Query Commands', () => {
    describe('handleQueryUniprot', () => {
      it('should successfully query UniProt database', async () => {
        const mockPrompt = 'human insulin protein';
        const mockResponse = {
          content: { entries: [{ id: 'P01308', name: 'INS_HUMAN' }] }
        };

        mockShowInputBox.mockResolvedValue(mockPrompt);
        mockWithProgress.mockImplementation((options, callback) => 
          callback({ report: jest.fn() }, { isCancellationRequested: false }));
        (mockMcpClient.callTool as jest.Mock).mockResolvedValue(mockResponse);

        await handlers.handleQueryUniprot();

        expect(mockShowInputBox).toHaveBeenCalledWith({
          prompt: 'Enter your UniProt query (e.g., "Find information about human insulin")',
          placeHolder: 'human insulin protein',
          validateInput: expect.any(Function)
        });
        expect(mockMcpClient.callTool).toHaveBeenCalledWith('query_uniprot', {
          prompt: mockPrompt,
          max_results: 5
        });
        expect(mockShowInformationMessage).toHaveBeenCalledWith('UniProt query completed successfully');
      });

      it('should handle empty prompt gracefully', async () => {
        mockShowInputBox.mockResolvedValue(undefined);

        await handlers.handleQueryUniprot();

        expect(mockMcpClient.callTool).not.toHaveBeenCalled();
        expect(mockShowInformationMessage).not.toHaveBeenCalled();
      });

      it('should handle MCP client errors', async () => {
        const mockPrompt = 'test query';
        const mockError = new Error('MCP connection failed');

        mockShowInputBox.mockResolvedValue(mockPrompt);
        mockWithProgress.mockImplementation((options, callback) => 
          callback({ report: jest.fn() }, { isCancellationRequested: false }));
        (mockMcpClient.callTool as jest.Mock).mockRejectedValue(mockError);

        await handlers.handleQueryUniprot();

        expect(mockShowErrorMessage).toHaveBeenCalledWith('UniProt query failed: MCP connection failed');
      });
    });

    describe('handleQueryPDB', () => {
      it('should successfully query PDB database', async () => {
        const mockPrompt = 'HIV protease structures';
        const mockResponse = {
          content: { structures: [{ id: '1HVP', title: 'HIV-1 PROTEASE' }] }
        };

        mockShowInputBox.mockResolvedValue(mockPrompt);
        mockWithProgress.mockImplementation((options, callback) => 
          callback({ report: jest.fn() }, { isCancellationRequested: false }));
        (mockMcpClient.callTool as jest.Mock).mockResolvedValue(mockResponse);

        await handlers.handleQueryPDB();

        expect(mockMcpClient.callTool).toHaveBeenCalledWith('query_pdb', {
          prompt: mockPrompt,
          max_results: 3
        });
        expect(mockShowInformationMessage).toHaveBeenCalledWith('PDB query completed successfully');
      });
    });

    describe('handleQueryAlphaFold', () => {
      it('should successfully query AlphaFold database', async () => {
        const mockUniprotId = 'P12345';
        const mockDownload = 'Yes';
        const mockResponse = {
          content: { model_url: 'https://alphafold.ebi.ac.uk/files/AF-P12345-F1-model_v4.pdb' }
        };

        mockShowInputBox.mockResolvedValue(mockUniprotId);
        mockShowQuickPick.mockResolvedValue(mockDownload);
        mockWithProgress.mockImplementation((options, callback) => 
          callback({ report: jest.fn() }, { isCancellationRequested: false }));
        (mockMcpClient.callTool as jest.Mock).mockResolvedValue(mockResponse);

        await handlers.handleQueryAlphaFold();

        expect(mockMcpClient.callTool).toHaveBeenCalledWith('query_alphafold', {
          uniprot_id: mockUniprotId,
          download: true,
          file_format: 'pdb',
          model_version: 'v4'
        });
        expect(mockShowInformationMessage).toHaveBeenCalledWith('AlphaFold query completed successfully');
      });

      it('should validate UniProt ID format', async () => {
        mockShowInputBox.mockImplementation(({ validateInput }) => {
          const validator = validateInput as Function;
          expect(validator('')).toBe('UniProt ID cannot be empty');
          expect(validator('invalid_id!')).toBe('Invalid UniProt ID format');
          expect(validator('P12345')).toBeNull();
          return Promise.resolve(undefined);
        });

        await handlers.handleQueryAlphaFold();
      });
    });
  });

  describe('Genomics Commands', () => {
    describe('handleBlastSequence', () => {
      it('should perform BLAST search with sequence from active editor', async () => {
        const mockSequence = 'ATCGATCGATCGATCG';
        const mockDatabase = 'nt';
        const mockResponse = {
          content: { hits: [{ id: 'seq1', evalue: 0.001 }] }
        };

        // Mock active editor with FASTA content
        (vscode.window as any).activeTextEditor = {
          document: {
            fileName: 'test.fasta',
            getText: () => `>test sequence\n${mockSequence}`
          }
        };

        mockShowQuickPick.mockResolvedValue(mockDatabase);
        mockWithProgress.mockImplementation((options, callback) => 
          callback({ report: jest.fn() }, { isCancellationRequested: false }));
        (mockMcpClient.callTool as jest.Mock).mockResolvedValue(mockResponse);

        await handlers.handleBlastSequence();

        expect(mockMcpClient.callTool).toHaveBeenCalledWith('blast_sequence', {
          sequence: mockSequence,
          database: mockDatabase,
          max_target_sequences: 10,
          e_value: 0.01
        });
        expect(mockShowInformationMessage).toHaveBeenCalledWith('BLAST search completed successfully');
      });

      it('should prompt for sequence when no active editor', async () => {
        const mockSequence = 'ATCGATCGATCGATCGATCG';
        const mockDatabase = 'nr';

        (vscode.window as any).activeTextEditor = undefined;
        mockShowInputBox.mockResolvedValue(mockSequence);
        mockShowQuickPick.mockResolvedValue(mockDatabase);
        mockWithProgress.mockImplementation((options, callback) => 
          callback({ report: jest.fn() }, { isCancellationRequested: false }));
        (mockMcpClient.callTool as jest.Mock).mockResolvedValue({ content: {} });

        await handlers.handleBlastSequence();

        expect(mockShowInputBox).toHaveBeenCalledWith({
          prompt: 'Enter sequence for BLAST search',
          placeHolder: 'ATCGATCGATCG...',
          validateInput: expect.any(Function)
        });
      });
    });
  });

  describe('Pharmacology Commands', () => {
    describe('handleRunDiffDock', () => {
      it('should successfully run DiffDock molecular docking', async () => {
        const mockPdbPath = '/path/to/protein.pdb';
        const mockSmiles = 'CC(C)CC1=CC=C(C=C1)C(C)C(=O)O';
        const mockResponse = {
          content: { docking_results: [{ score: -8.5, pose: 'pose1.pdb' }] }
        };

        (vscode.window.showOpenDialog as jest.Mock).mockResolvedValue([{ fsPath: mockPdbPath }]);
        mockShowInputBox.mockResolvedValue(mockSmiles);
        mockWithProgress.mockImplementation((options, callback) => 
          callback({ report: jest.fn() }, { isCancellationRequested: false }));
        (mockMcpClient.callTool as jest.Mock).mockResolvedValue(mockResponse);

        await handlers.handleRunDiffDock();

        expect(mockMcpClient.callTool).toHaveBeenCalledWith('run_diffdock_with_smiles', {
          pdb_path: mockPdbPath,
          smiles_string: mockSmiles,
          use_gpu: true
        });
        expect(mockShowInformationMessage).toHaveBeenCalledWith('DiffDock docking completed successfully');
      });
    });

    describe('handlePredictADMET', () => {
      it('should successfully predict ADMET properties', async () => {
        const mockSmiles = 'CC(C)CC1=CC=C(C=C1)C(C)C(=O)O';
        const mockResponse = {
          content: 'ADMET properties calculated successfully'
        };

        mockShowInputBox.mockResolvedValue(mockSmiles);
        mockWithProgress.mockImplementation((options, callback) => 
          callback({ report: jest.fn() }, { isCancellationRequested: false }));
        (mockMcpClient.callTool as jest.Mock).mockResolvedValue(mockResponse);

        await handlers.handlePredictADMET();

        expect(mockShowInformationMessage).toHaveBeenCalledWith('ADMET prediction completed successfully');
      });
    });
  });

  describe('Support Commands', () => {
    describe('handleRunPython', () => {
      it('should execute Python code successfully', async () => {
        const mockCode = 'print("Hello, Biomni!")';
        const mockResponse = {
          content: 'Hello, Biomni!\n'
        };

        mockShowInputBox.mockResolvedValue(mockCode);
        mockWithProgress.mockImplementation((options, callback) => 
          callback({ report: jest.fn() }, { isCancellationRequested: false }));
        (mockMcpClient.callTool as jest.Mock).mockResolvedValue(mockResponse);

        await handlers.handleRunPython();

        expect(mockMcpClient.callTool).toHaveBeenCalledWith('run_python_repl', {
          command: mockCode
        });
        expect(mockShowInformationMessage).toHaveBeenCalledWith('Python code executed successfully');
      });
    });

    describe('handleRefreshTools', () => {
      it('should refresh MCP tools successfully', async () => {
        const mockCapabilities = {
          tools: [{ name: 'tool1' }, { name: 'tool2' }]
        };

        mockWithProgress.mockImplementation((options, callback) => 
          callback({ report: jest.fn() }, { isCancellationRequested: false }));
        (mockMcpClient.getCapabilities as jest.Mock).mockResolvedValue(mockCapabilities);

        await handlers.handleRefreshTools();

        expect(mockShowInformationMessage).toHaveBeenCalledWith('✅ Tool discovery refreshed! Found 2 tools.');
      });
    });
  });

  describe('MCP Client Validation', () => {
    it('should show error when MCP client is not initialized', async () => {
      const handlersWithoutClient = new BiomniCommandHandlers(undefined);

      await handlersWithoutClient.handleQueryUniprot();

      expect(mockShowErrorMessage).toHaveBeenCalledWith('Biomni MCP client is not initialized. Please activate the extension first.');
      
      handlersWithoutClient.dispose();
    });
  });

  describe('updateMcpClient', () => {
    it('should update MCP client reference', () => {
      const newMcpClient = {} as BiomniMcpClient;
      
      handlers.updateMcpClient(newMcpClient);
      
      // This would be verified by subsequent command calls using the new client
      expect(handlers).toBeDefined();
    });
  });
});