// Jest setup file for VSCode extension testing
// This file is run before each test file

import { jest } from '@jest/globals';

// Mock VSCode API for testing
const mockVscode = {
  commands: {
    registerCommand: jest.fn(),
    executeCommand: jest.fn(),
  },
  window: {
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
  },
  workspace: {
    getConfiguration: jest.fn(() => ({
      get: jest.fn(),
      update: jest.fn(),
    })),
  },
  StatusBarAlignment: {
    Left: 1,
    Right: 2,
  },
  Uri: {
    file: jest.fn(),
  },
  Range: jest.fn(),
  Position: jest.fn(),
  ExtensionMode: {
    Test: 3,
    Development: 2,
    Production: 1,
  },
};

// Mock the vscode module
jest.mock('vscode', () => mockVscode, { virtual: true });

// Export for use in tests
(global as any).mockVscode = mockVscode;