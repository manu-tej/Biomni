import * as vscode from 'vscode';
import { BiomniCommandHandlers } from '../commands/handlers';
import {
  MessageType,
  ExtensionMessage,
  MessageValidator,
  MessageFactory,
  ExecuteCommandMessage,
  RequestDataMessage,
  SaveSettingsMessage,
  ValidateFileMessage,
  QueryDatabaseMessage,
  StartAnalysisMessage,
  ShowInfoMessage,
  ShowErrorMessage,
  ShowWarningMessage,
  NavigateMessage,
  CancelOperationMessage,
  DeliverDataMessage,
  ValidationResultMessage,
  AnalysisResultMessage,
  DatabaseResultMessage,
  UpdateProgressMessage,
  UpdateStatusMessage,
  ErrorMessage
} from './messages';

/**
 * Handles message passing between extension and webview
 */
export class MessageHandler {
  private activeOperations: Map<string, vscode.CancellationTokenSource> = new Map();
  private messageQueue: ExtensionMessage[] = [];
  private isWebviewReady = false;

  constructor(
    private context: vscode.ExtensionContext,
    private webview: vscode.Webview,
    // @ts-ignore - Will be used for actual command execution in future
    private _commandHandlers: BiomniCommandHandlers
  ) {
    this.sendReadyMessage();
  }

  /**
   * Send ready message to webview
   */
  private sendReadyMessage(): void {
    const readyMessage = MessageFactory.createExtensionMessage(MessageType.Ready, {
      version: this.context.extension.packageJSON.version,
      capabilities: [
        'file-validation',
        'database-query',
        'genomic-analysis',
        'pharmacology-tools',
        'settings-management',
        'streaming-updates'
      ]
    });
    this.postMessage(readyMessage);
    this.isWebviewReady = true;
    this.flushMessageQueue();
  }

  /**
   * Handle incoming message from webview
   */
  async handleMessage(message: any): Promise<void> {
    try {
      // Validate message
      const validation = MessageValidator.validateMessage(message);
      if (!validation.valid) {
        await this.sendError(message.id, validation.error || 'Invalid message');
        return;
      }

      const sanitizedMessage = validation.sanitized || message;

      // Process message based on type
      switch (sanitizedMessage.type) {
        case MessageType.Navigate:
          await this.handleNavigate(sanitizedMessage as NavigateMessage);
          break;

        case MessageType.ExecuteCommand:
          await this.handleExecuteCommand(sanitizedMessage as ExecuteCommandMessage);
          break;

        case MessageType.ShowInfo:
          this.handleShowInfo(sanitizedMessage as ShowInfoMessage);
          break;

        case MessageType.ShowError:
          this.handleShowError(sanitizedMessage as ShowErrorMessage);
          break;

        case MessageType.ShowWarning:
          this.handleShowWarning(sanitizedMessage as ShowWarningMessage);
          break;

        case MessageType.RequestData:
          await this.handleRequestData(sanitizedMessage as RequestDataMessage);
          break;

        case MessageType.SaveSettings:
          await this.handleSaveSettings(sanitizedMessage as SaveSettingsMessage);
          break;

        case MessageType.ValidateFile:
          await this.handleValidateFile(sanitizedMessage as ValidateFileMessage);
          break;

        case MessageType.QueryDatabase:
          await this.handleQueryDatabase(sanitizedMessage as QueryDatabaseMessage);
          break;

        case MessageType.StartAnalysis:
          await this.handleStartAnalysis(sanitizedMessage as StartAnalysisMessage);
          break;

        case MessageType.CancelOperation:
          this.handleCancelOperation(sanitizedMessage as CancelOperationMessage);
          break;

        default:
          await this.sendError(message.id, `Unknown message type: ${message.type}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      await this.sendError(message.id, errorMessage);
    }
  }

  /**
   * Handle navigation message
   */
  private async handleNavigate(message: NavigateMessage): Promise<void> {
    // Log navigation for analytics
    console.log(`User navigated to: ${message.tab}`);
    
    // Update status
    await this.sendStatus('idle', `Switched to ${message.tab} tab`);
  }

  /**
   * Handle command execution
   */
  private async handleExecuteCommand(message: ExecuteCommandMessage): Promise<void> {
    try {
      // Update status
      await this.sendStatus('processing', `Executing ${message.command}`);

      // Execute command
      await vscode.commands.executeCommand(message.command, ...(message.args || []));

      // Send success status
      await this.sendStatus('success', `Command completed successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Command execution failed';
      await this.sendError(message.id, errorMessage);
      await this.sendStatus('error', errorMessage);
    }
  }

  /**
   * Handle info message display
   */
  private handleShowInfo(message: ShowInfoMessage): void {
    vscode.window.showInformationMessage(message.text);
  }

  /**
   * Handle error message display
   */
  private handleShowError(message: ShowErrorMessage): void {
    vscode.window.showErrorMessage(message.text);
  }

  /**
   * Handle warning message display
   */
  private handleShowWarning(message: ShowWarningMessage): void {
    vscode.window.showWarningMessage(message.text);
  }

  /**
   * Handle data request
   */
  private async handleRequestData(message: RequestDataMessage): Promise<void> {
    try {
      let data: any;

      switch (message.dataType) {
        case 'fileInfo':
          data = await this.getFileInfo();
          break;

        case 'settings':
          data = this.getSettings();
          break;

        case 'recentFiles':
          data = await this.getRecentFiles();
          break;

        case 'analysisHistory':
          data = this.getAnalysisHistory();
          break;

        default:
          throw new Error(`Unknown data type: ${message.dataType}`);
      }

      const response = MessageFactory.createExtensionMessage(MessageType.DeliverData, {
        dataType: message.dataType,
        data,
        requestId: message.id
      } as Omit<DeliverDataMessage, 'type' | 'timestamp' | 'id'>);

      await this.postMessage(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve data';
      await this.sendError(message.id, errorMessage);
    }
  }

  /**
   * Handle settings save
   */
  private async handleSaveSettings(message: SaveSettingsMessage): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration('biomni');

      // Save API keys
      if (message.settings.apiKeys) {
        for (const [key, value] of Object.entries(message.settings.apiKeys)) {
          if (value) {
            await config.update(`apiKeys.${key}`, value, vscode.ConfigurationTarget.Global);
          }
        }
      }

      // Save preferences
      if (message.settings.preferences) {
        for (const [key, value] of Object.entries(message.settings.preferences)) {
          await config.update(`preferences.${key}`, value, vscode.ConfigurationTarget.Global);
        }
      }

      const response = MessageFactory.createExtensionMessage(MessageType.SettingsSaved, {
        success: true,
        message: 'Settings saved successfully'
      });

      await this.postMessage(response);
      await this.sendStatus('success', 'Settings saved');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save settings';
      await this.sendError(message.id, errorMessage);
    }
  }

  /**
   * Handle file validation
   */
  private async handleValidateFile(message: ValidateFileMessage): Promise<void> {
    try {
      const operationId = message.id;
      const cancellation = new vscode.CancellationTokenSource();
      this.activeOperations.set(operationId, cancellation);

      await this.sendStatus('processing', 'Validating file...');

      // Get file content
      const document = await vscode.workspace.openTextDocument(message.filePath);
      const content = document.getText();

      // Perform validation (simplified - you'd call actual validation logic)
      const validationResult: ValidationResultMessage = MessageFactory.createExtensionMessage(
        MessageType.ValidationResult,
        {
          filePath: message.filePath,
          valid: true,
          info: {
            format: message.fileType || 'unknown',
            sequences: 1,
            length: content.length
          }
        }
      );

      await this.postMessage(validationResult);
      await this.sendStatus('success', 'Validation complete');
      
      // In a real implementation, we would use commandHandlers for validation
      // For now, the validation is simplified

      this.activeOperations.delete(operationId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Validation failed';
      await this.sendError(message.id, errorMessage);
      this.activeOperations.delete(message.id);
    }
  }

  /**
   * Handle database query
   */
  private async handleQueryDatabase(message: QueryDatabaseMessage): Promise<void> {
    try {
      const operationId = message.id;
      const cancellation = new vscode.CancellationTokenSource();
      this.activeOperations.set(operationId, cancellation);

      await this.sendStatus('processing', `Querying ${message.database}...`);
      await this.sendProgress(operationId, 0, 'Connecting to database...');

      // Map database to command
      const commandMap: Record<string, string> = {
        'uniprot': 'biomni.database.queryUniprot',
        'pdb': 'biomni.database.queryPDB',
        'alphafold': 'biomni.database.queryAlphaFold',
        'interpro': 'biomni.database.queryInterPro'
      };

      const command = commandMap[message.database];
      if (!command) {
        throw new Error(`Unknown database: ${message.database}`);
      }

      await this.sendProgress(operationId, 30, 'Executing query...');

      // Execute the actual command through the command handlers
      // For now, we'll use the command palette approach
      // In a real implementation, we'd call the handler methods directly
      
      // Store query in workspace state for the handler to retrieve
      await this.context.workspaceState.update('pendingDatabaseQuery', {
        database: message.database,
        query: message.query,
        options: message.options
      });

      // Execute the command
      await vscode.commands.executeCommand(command);

      // Retrieve results from workspace state (set by handler)
      const results = await this.context.workspaceState.get('databaseQueryResults', []);
      await this.context.workspaceState.update('databaseQueryResults', undefined);

      await this.sendProgress(operationId, 80, 'Processing results...');

      const response: DatabaseResultMessage = MessageFactory.createExtensionMessage(
        MessageType.DatabaseResult,
        {
          database: message.database,
          query: message.query,
          results: results as any[],
          totalCount: (results as any[]).length,
          hasMore: false
        }
      );

      await this.postMessage(response);
      await this.sendProgress(operationId, 100, 'Query complete');
      await this.sendStatus('success', 'Database query complete');

      this.activeOperations.delete(operationId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Database query failed';
      await this.sendError(message.id, errorMessage);
      this.activeOperations.delete(message.id);
    }
  }

  /**
   * Handle analysis start
   */
  private async handleStartAnalysis(message: StartAnalysisMessage): Promise<void> {
    try {
      const operationId = message.id;
      const cancellation = new vscode.CancellationTokenSource();
      this.activeOperations.set(operationId, cancellation);

      await this.sendStatus('processing', `Starting ${message.analysisType} analysis...`);
      await this.sendProgress(operationId, 0, 'Preparing analysis...', true);

      // Simulate analysis with progress
      for (let i = 0; i <= 100; i += 10) {
        if (cancellation.token.isCancellationRequested) {
          throw new Error('Analysis cancelled');
        }
        await this.sendProgress(operationId, i, `Analyzing... ${i}%`);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      const result: AnalysisResultMessage = MessageFactory.createExtensionMessage(
        MessageType.AnalysisResult,
        {
          analysisType: message.analysisType,
          result: {
            success: true,
            data: {
              summary: 'Analysis completed successfully',
              metrics: { score: 0.95, confidence: 0.88 }
            },
            visualizations: [
              {
                type: 'chart',
                data: { type: 'bar', values: [1, 2, 3, 4, 5] }
              }
            ]
          }
        }
      );

      await this.postMessage(result);
      await this.sendStatus('success', 'Analysis complete');

      this.activeOperations.delete(operationId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      await this.sendError(message.id, errorMessage);
      await this.sendStatus('error', errorMessage);
      this.activeOperations.delete(message.id);
    }
  }

  /**
   * Handle operation cancellation
   */
  private handleCancelOperation(message: CancelOperationMessage): void {
    const cancellation = this.activeOperations.get(message.operationId);
    if (cancellation) {
      cancellation.cancel();
      this.activeOperations.delete(message.operationId);
      this.sendStatus('idle', 'Operation cancelled');
    }
  }

  /**
   * Helper: Get file info
   */
  private async getFileInfo(): Promise<any> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return null;
    }

    return {
      fileName: editor.document.fileName,
      languageId: editor.document.languageId,
      lineCount: editor.document.lineCount,
      isDirty: editor.document.isDirty
    };
  }

  /**
   * Helper: Get settings
   */
  private getSettings(): any {
    const config = vscode.workspace.getConfiguration('biomni');
    return {
      apiKeys: config.get('apiKeys', {}),
      preferences: config.get('preferences', {})
    };
  }

  /**
   * Helper: Get recent files
   */
  private async getRecentFiles(): Promise<string[]> {
    // This would typically come from workspace state
    return this.context.workspaceState.get('recentFiles', []);
  }

  /**
   * Helper: Get analysis history
   */
  private getAnalysisHistory(): any[] {
    // This would typically come from workspace state
    return this.context.workspaceState.get('analysisHistory', []);
  }

  /**
   * Send error message
   */
  private async sendError(requestId: string, error: string): Promise<void> {
    const errorMessage: ErrorMessage = MessageFactory.createExtensionMessage(
      MessageType.Error,
      {
        error,
        details: `Request ID: ${requestId}`
      }
    );
    await this.postMessage(errorMessage);
  }

  /**
   * Send progress update
   */
  private async sendProgress(
    operationId: string,
    progress: number,
    message?: string,
    isIndeterminate?: boolean
  ): Promise<void> {
    const payload: any = {
      operationId,
      progress
    };
    if (message !== undefined) {
      payload.message = message;
    }
    if (isIndeterminate !== undefined) {
      payload.isIndeterminate = isIndeterminate;
    }
    const progressMessage: UpdateProgressMessage = MessageFactory.createExtensionMessage(
      MessageType.UpdateProgress,
      payload
    );
    await this.postMessage(progressMessage);
  }

  /**
   * Send status update
   */
  private async sendStatus(
    status: 'idle' | 'loading' | 'processing' | 'error' | 'success',
    message?: string
  ): Promise<void> {
    const payload: any = { status };
    if (message !== undefined) {
      payload.message = message;
    }
    const statusMessage: UpdateStatusMessage = MessageFactory.createExtensionMessage(
      MessageType.UpdateStatus,
      payload
    );
    await this.postMessage(statusMessage);
  }

  /**
   * Post message to webview
   */
  private async postMessage(message: ExtensionMessage): Promise<void> {
    if (!this.isWebviewReady) {
      this.messageQueue.push(message);
      return;
    }

    try {
      await this.webview.postMessage(message);
    } catch (error) {
      console.error('Failed to post message to webview:', error);
    }
  }

  /**
   * Flush message queue
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.postMessage(message);
      }
    }
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    // Cancel all active operations
    for (const cancellation of this.activeOperations.values()) {
      cancellation.cancel();
    }
    this.activeOperations.clear();
    this.messageQueue = [];
  }
}