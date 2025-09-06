/**
 * Message types for webview communication
 */
export enum MessageType {
  // From webview to extension
  Navigate = 'navigate',
  ExecuteCommand = 'executeCommand',
  ShowInfo = 'showInfo',
  ShowError = 'showError',
  ShowWarning = 'showWarning',
  RequestData = 'requestData',
  SaveSettings = 'saveSettings',
  ValidateFile = 'validateFile',
  QueryDatabase = 'queryDatabase',
  StartAnalysis = 'startAnalysis',
  CancelOperation = 'cancelOperation',
  
  // From extension to webview
  UpdateContent = 'updateContent',
  UpdateProgress = 'updateProgress',
  UpdateStatus = 'updateStatus',
  DeliverData = 'deliverData',
  AnalysisResult = 'analysisResult',
  ValidationResult = 'validationResult',
  DatabaseResult = 'databaseResult',
  SettingsSaved = 'settingsSaved',
  Error = 'error',
  Ready = 'ready'
}

/**
 * Base message interface
 */
export interface BaseMessage {
  type: MessageType;
  timestamp: number;
  id: string;
}

/**
 * Messages from webview to extension
 */
export interface NavigateMessage extends BaseMessage {
  type: MessageType.Navigate;
  tab: string;
}

export interface ExecuteCommandMessage extends BaseMessage {
  type: MessageType.ExecuteCommand;
  command: string;
  args?: any[];
}

export interface ShowInfoMessage extends BaseMessage {
  type: MessageType.ShowInfo;
  text: string;
}

export interface ShowErrorMessage extends BaseMessage {
  type: MessageType.ShowError;
  text: string;
}

export interface ShowWarningMessage extends BaseMessage {
  type: MessageType.ShowWarning;
  text: string;
}

export interface RequestDataMessage extends BaseMessage {
  type: MessageType.RequestData;
  dataType: 'fileInfo' | 'settings' | 'recentFiles' | 'analysisHistory';
  filter?: any;
}

export interface SaveSettingsMessage extends BaseMessage {
  type: MessageType.SaveSettings;
  settings: {
    apiKeys?: {
      uniprot?: string;
      pdb?: string;
      alphafold?: string;
      interpro?: string;
    };
    preferences?: {
      theme?: string;
      defaultDatabase?: string;
      cacheEnabled?: boolean;
      maxCacheSize?: number;
    };
  };
}

export interface ValidateFileMessage extends BaseMessage {
  type: MessageType.ValidateFile;
  filePath: string;
  fileType?: 'fasta' | 'fastq' | 'vcf' | 'pdb';
}

export interface QueryDatabaseMessage extends BaseMessage {
  type: MessageType.QueryDatabase;
  database: 'uniprot' | 'pdb' | 'alphafold' | 'interpro';
  query: string;
  options?: {
    limit?: number;
    format?: string;
    fields?: string[];
  };
}

export interface StartAnalysisMessage extends BaseMessage {
  type: MessageType.StartAnalysis;
  analysisType: 'blast' | 'annotation' | 'properties' | 'orfs' | 'docking' | 'admet';
  filePath: string;
  parameters?: Record<string, any>;
}

export interface CancelOperationMessage extends BaseMessage {
  type: MessageType.CancelOperation;
  operationId: string;
}

/**
 * Messages from extension to webview
 */
export interface UpdateContentMessage extends BaseMessage {
  type: MessageType.UpdateContent;
  tab: string;
  content: string | Record<string, any>;
}

export interface UpdateProgressMessage extends BaseMessage {
  type: MessageType.UpdateProgress;
  operationId: string;
  progress: number;
  message?: string;
  isIndeterminate?: boolean;
}

export interface UpdateStatusMessage extends BaseMessage {
  type: MessageType.UpdateStatus;
  status: 'idle' | 'loading' | 'processing' | 'error' | 'success';
  message?: string;
}

export interface DeliverDataMessage extends BaseMessage {
  type: MessageType.DeliverData;
  dataType: string;
  data: any;
  requestId: string;
}

export interface AnalysisResultMessage extends BaseMessage {
  type: MessageType.AnalysisResult;
  analysisType: string;
  result: {
    success: boolean;
    data?: any;
    error?: string;
    visualizations?: Array<{
      type: 'chart' | 'table' | 'structure' | 'alignment';
      data: any;
    }>;
  };
}

export interface ValidationResultMessage extends BaseMessage {
  type: MessageType.ValidationResult;
  filePath: string;
  valid: boolean;
  errors?: Array<{
    line?: number;
    column?: number;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }>;
  warnings?: string[];
  info?: {
    format: string;
    sequences?: number;
    length?: number;
    composition?: Record<string, number>;
  };
}

export interface DatabaseResultMessage extends BaseMessage {
  type: MessageType.DatabaseResult;
  database: string;
  query: string;
  results: Array<any>;
  totalCount: number;
  hasMore: boolean;
}

export interface SettingsSavedMessage extends BaseMessage {
  type: MessageType.SettingsSaved;
  success: boolean;
  message?: string;
}

export interface ErrorMessage extends BaseMessage {
  type: MessageType.Error;
  error: string;
  details?: string;
  stack?: string;
}

export interface ReadyMessage extends BaseMessage {
  type: MessageType.Ready;
  version: string;
  capabilities: string[];
}

/**
 * Union type for all webview to extension messages
 */
export type WebviewMessage = 
  | NavigateMessage
  | ExecuteCommandMessage
  | ShowInfoMessage
  | ShowErrorMessage
  | ShowWarningMessage
  | RequestDataMessage
  | SaveSettingsMessage
  | ValidateFileMessage
  | QueryDatabaseMessage
  | StartAnalysisMessage
  | CancelOperationMessage;

/**
 * Union type for all extension to webview messages
 */
export type ExtensionMessage =
  | UpdateContentMessage
  | UpdateProgressMessage
  | UpdateStatusMessage
  | DeliverDataMessage
  | AnalysisResultMessage
  | ValidationResultMessage
  | DatabaseResultMessage
  | SettingsSavedMessage
  | ErrorMessage
  | ReadyMessage;

/**
 * Type guards
 */
export function isWebviewMessage(message: any): message is WebviewMessage {
  return message && 
         typeof message.type === 'string' && 
         typeof message.timestamp === 'number' &&
         typeof message.id === 'string';
}

export function isExtensionMessage(message: any): message is ExtensionMessage {
  return message && 
         typeof message.type === 'string' && 
         typeof message.timestamp === 'number' &&
         typeof message.id === 'string';
}

/**
 * Message validation utilities
 */
export class MessageValidator {
  private static readonly MAX_MESSAGE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly ALLOWED_COMMANDS = new Set([
    'biomni.genomics.blastSequence',
    'biomni.genomics.annotateGenes',
    'biomni.genomics.analyzeSequence',
    'biomni.genomics.findORFs',
    'biomni.genomics.clearCache',
    'biomni.database.queryUniprot',
    'biomni.database.queryPDB',
    'biomni.database.queryAlphaFold',
    'biomni.database.queryInterPro',
    'biomni.pharmacology.runDiffDock',
    'biomni.pharmacology.predictADMET',
    'biomni.settings.manageApiKeys',
    'biomni.settings.validateConfiguration',
    'biomni.settings.openPanel',
    'biomni.settings.export',
    'biomni.settings.import',
    'biomni.settings.reset',
    'biomni.formatFile',
    'biomni.showInfo',
    'biomni.validateFormat'
  ]);

  /**
   * Validate message size
   */
  static validateSize(message: any): boolean {
    const size = JSON.stringify(message).length;
    return size <= MessageValidator.MAX_MESSAGE_SIZE;
  }

  /**
   * Validate command whitelist
   */
  static validateCommand(command: string): boolean {
    return MessageValidator.ALLOWED_COMMANDS.has(command);
  }

  /**
   * Sanitize file paths
   */
  static sanitizeFilePath(filePath: string): string {
    // Remove any path traversal attempts
    return filePath.replace(/\.\./g, '').replace(/^\//, '');
  }

  /**
   * Validate and sanitize message
   */
  static validateMessage(rawMessage: any): { valid: boolean; error?: string; sanitized?: any } {
    // Check basic structure
    if (!rawMessage || typeof rawMessage.type !== 'string' || 
        typeof rawMessage.timestamp !== 'number' || 
        typeof rawMessage.id !== 'string') {
      return { valid: false, error: 'Invalid message structure' };
    }

    // Check size
    if (!MessageValidator.validateSize(rawMessage)) {
      return { valid: false, error: 'Message exceeds maximum size' };
    }

    // Create sanitized copy
    const sanitized = { ...rawMessage };

    // Validate specific message types
    switch (rawMessage.type) {
      case MessageType.ExecuteCommand:
        if (rawMessage.command && !MessageValidator.validateCommand(rawMessage.command)) {
          return { valid: false, error: `Command not allowed: ${rawMessage.command}` };
        }
        break;

      case MessageType.ValidateFile:
        if (rawMessage.filePath) {
          sanitized.filePath = MessageValidator.sanitizeFilePath(rawMessage.filePath);
        }
        break;

      case MessageType.StartAnalysis:
        if (rawMessage.filePath) {
          sanitized.filePath = MessageValidator.sanitizeFilePath(rawMessage.filePath);
        }
        break;

      case MessageType.SaveSettings:
        if (rawMessage.settings && rawMessage.settings.apiKeys) {
          if (!sanitized.settings) {
            sanitized.settings = { ...rawMessage.settings };
          }
          if (!sanitized.settings.apiKeys) {
            sanitized.settings.apiKeys = {};
          }
          const apiKeys = rawMessage.settings.apiKeys;
          if (apiKeys && typeof apiKeys === 'object') {
            Object.keys(apiKeys).forEach(key => {
              const apiKey = apiKeys[key];
              if (apiKey && typeof apiKey === 'string') {
                sanitized.settings.apiKeys[key] = apiKey.replace(/[^a-zA-Z0-9-]/g, '');
              }
            });
          }
        }
        break;
    }

    return { valid: true, sanitized };
  }
}

/**
 * Message factory for creating properly structured messages
 */
export class MessageFactory {
  private static generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static createWebviewMessage<T extends WebviewMessage>(
    type: T['type'],
    payload: Omit<T, 'type' | 'timestamp' | 'id'>
  ): T {
    return {
      type,
      timestamp: Date.now(),
      id: MessageFactory.generateId(),
      ...payload
    } as T;
  }

  static createExtensionMessage<T extends ExtensionMessage>(
    type: T['type'],
    payload: Omit<T, 'type' | 'timestamp' | 'id'>
  ): T {
    return {
      type,
      timestamp: Date.now(),
      id: MessageFactory.generateId(),
      ...payload
    } as T;
  }
}