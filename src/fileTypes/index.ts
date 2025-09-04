/**
 * Main entry point for biological file type detection and handling
 */

export * from './types';
export * from './registry';
export * from './detector';
export * from './context';
export * from './validators';

import * as vscode from 'vscode';
import { FileDetector } from './detector';
import { BioFileContextProvider } from './context';
import { ValidatorRegistry } from './validators';

/**
 * File type manager - coordinates all file type related functionality
 */
export class FileTypeManager {
  private detector: FileDetector;
  private contextProvider: BioFileContextProvider;

  constructor() {
    this.detector = FileDetector.getInstance();
    this.contextProvider = new BioFileContextProvider();
  }

  /**
   * Initialize file type detection and handling
   */
  public initialize(context: vscode.ExtensionContext): void {
    // Register context providers and commands
    this.contextProvider.register(context);

    // Register file system watchers for cache invalidation
    this.registerFileWatchers(context);

    console.log('File type detection system initialized');
  }

  /**
   * Register file system watchers
   */
  private registerFileWatchers(context: vscode.ExtensionContext): void {
    // Watch for file changes to invalidate cache
    const watcher = vscode.workspace.createFileSystemWatcher('**/*');

    watcher.onDidChange(_uri => {
      // Clear cache for changed file
      this.detector.clearCache();
    });

    watcher.onDidCreate(uri => {
      // Handle new files
      this.handleNewFile(uri);
    });

    watcher.onDidDelete(_uri => {
      // Clear cache for deleted file
      this.detector.clearCache();
    });

    context.subscriptions.push(watcher);
  }

  /**
   * Handle new file creation
   */
  private async handleNewFile(uri: vscode.Uri): Promise<void> {
    // Check if it's a biological file format
    const detection = await this.detector.detectFile(uri);
    if (detection) {
      // Optionally show notification for detected biological files
      const config = vscode.workspace.getConfiguration('biomni');
      const showNotifications = config.get<boolean>('showNewFileNotifications', false);

      if (showNotifications) {
        vscode.window.showInformationMessage(
          `Detected ${detection.format.name} file: ${uri.fsPath}`
        );
      }
    }
  }

  /**
   * Get file type detection result
   */
  public async detectFile(uri: vscode.Uri) {
    return this.detector.detectFile(uri);
  }

  /**
   * Validate a file
   */
  public async validateFile(uri: vscode.Uri, validatorName: string) {
    return ValidatorRegistry.validateFile(uri, validatorName);
  }

  /**
   * Get detector statistics
   */
  public getStats() {
    return this.detector.getCacheStats();
  }

  /**
   * Clear all caches
   */
  public clearCaches(): void {
    this.detector.clearCache();
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this.contextProvider.dispose();
  }
}
