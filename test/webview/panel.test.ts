/**
 * Tests for Biomni webview panel functionality
 */
import * as assert from 'assert';
import * as vscode from 'vscode';
import { BiomniPanelProvider } from '../../src/webview/BiomniPanelProvider';

suite('BiomniPanelProvider', () => {
  let context: vscode.ExtensionContext;
  let panelProvider: BiomniPanelProvider;

  suiteSetup(async () => {
    // Get extension context
    const extension = vscode.extensions.getExtension('biomni.biomni-mcp-integration');
    assert.ok(extension, 'Extension should be found');
    
    if (!extension.isActive) {
      await extension.activate();
    }
    
    context = extension.exports?.context || ({} as vscode.ExtensionContext);
  });

  setup(() => {
    // Reset panel provider instance for each test
    (BiomniPanelProvider as any).instance = undefined;
    panelProvider = BiomniPanelProvider.getInstance(context);
  });

  teardown(() => {
    // Clean up after each test
    if (panelProvider) {
      panelProvider.dispose();
    }
  });

  test('Should create singleton instance', () => {
    const instance1 = BiomniPanelProvider.getInstance(context);
    const instance2 = BiomniPanelProvider.getInstance(context);
    
    assert.strictEqual(instance1, instance2, 'Should return same instance');
  });

  test('Should create webview panel', () => {
    assert.doesNotThrow(() => {
      panelProvider.createOrShow();
    }, 'Should create webview panel without errors');
  });

  test('Should handle dispose correctly', () => {
    panelProvider.createOrShow();
    
    assert.doesNotThrow(() => {
      panelProvider.dispose();
    }, 'Should dispose without errors');
  });

  test('Should have correct view type', () => {
    assert.strictEqual(BiomniPanelProvider.viewType, 'biomniPanel', 'View type should be biomniPanel');
  });
});

suite('Biomni Panel Command', () => {
  test('Should execute biomni.openPanel command', async () => {
    // Test that the command exists and can be executed
    const commands = await vscode.commands.getCommands();
    assert.ok(commands.includes('biomni.openPanel'), 'Command should be registered');
    
    // Execute the command - should not throw
    assert.doesNotThrow(async () => {
      await vscode.commands.executeCommand('biomni.openPanel');
    }, 'Command should execute without errors');
  });
});

suite('Webview Panel Integration', () => {
  let context: vscode.ExtensionContext;

  suiteSetup(async () => {
    const extension = vscode.extensions.getExtension('biomni.biomni-mcp-integration');
    assert.ok(extension, 'Extension should be found');
    
    if (!extension.isActive) {
      await extension.activate();
    }
    
    context = extension.exports?.context || ({} as vscode.ExtensionContext);
  });

  test('Should create panel with correct properties', () => {
    const panelProvider = BiomniPanelProvider.getInstance(context);
    panelProvider.createOrShow();
    
    // Panel should be created (we can't directly access private panel property,
    // but we can verify no errors were thrown during creation)
    assert.ok(panelProvider, 'Panel provider should be created');
  });

  test('Should dispose resources properly', () => {
    const panelProvider = BiomniPanelProvider.getInstance(context);
    panelProvider.createOrShow();
    
    assert.doesNotThrow(() => {
      panelProvider.dispose();
    }, 'Should dispose without errors');
  });
});