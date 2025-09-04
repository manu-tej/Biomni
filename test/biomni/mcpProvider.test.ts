import * as assert from 'assert';
import * as vscode from 'vscode';
import { BiomniMCPProvider, HealthStatus, ToolInfo } from '../../src/biomni/mcpProvider';
import { McpClientConfig } from '../../src/types/config';

suite('Biomni MCP Provider Test Suite', () => {
  let mcpProvider: BiomniMCPProvider;
  let mockConfig: McpClientConfig;

  setup(() => {
    mockConfig = {
      enabled: true,
      mcpServerUrl: 'http://localhost:8080',
      autoActivate: true,
      connectionTimeout: 5000,
      requestTimeout: 10000,
      maxRetries: 3
    };
    
    mcpProvider = new BiomniMCPProvider(mockConfig);
  });

  teardown(() => {
    mcpProvider.dispose();
  });

  test('should initialize with correct configuration', () => {
    assert.ok(mcpProvider);
    assert.strictEqual(mcpProvider.isRunning(), false);
  });

  test('should provide MCP server definitions when enabled', async () => {
    const definitions = await mcpProvider.provideMcpServerDefinitions();
    
    assert.ok(Array.isArray(definitions));
    // Should provide Biomni MCP server when enabled
    if (mockConfig.enabled) {
      assert.ok(definitions.length > 0);
      assert.ok(definitions.some(def => def.label === 'Biomni MCP Server'));
    }
  });

  test('should not provide server definitions when disabled', async () => {
    const disabledProvider = new BiomniMCPProvider({ ...mockConfig, enabled: false });
    const definitions = await disabledProvider.provideMcpServerDefinitions();
    
    assert.strictEqual(definitions.length, 0);
    disabledProvider.dispose();
  });

  test('should resolve server definition with validation', async () => {
    const mockServerDef: vscode.McpServerDefinition = {
      label: 'Biomni MCP Server',
      version: '1.0.0'
    } as any;

    const resolved = await mcpProvider.resolveMcpServerDefinition(mockServerDef);
    
    // Should return the server definition if validation passes
    assert.ok(resolved);
    assert.strictEqual(resolved.label, 'Biomni MCP Server');
  });

  test('should handle server definition resolution errors gracefully', async () => {
    const mockServerDef: vscode.McpServerDefinition = {
      label: 'Unknown Server',
      version: '1.0.0'
    } as any;

    const resolved = await mcpProvider.resolveMcpServerDefinition(mockServerDef);
    
    // Should pass through non-Biomni servers
    assert.ok(resolved);
    assert.strictEqual(resolved.label, 'Unknown Server');
  });

  test('should start and stop MCP server', async () => {
    assert.strictEqual(mcpProvider.isRunning(), false);
    
    await mcpProvider.startMCPServer();
    assert.strictEqual(mcpProvider.isRunning(), true);
    
    await mcpProvider.stopMCPServer();
    assert.strictEqual(mcpProvider.isRunning(), false);
  });

  test('should discover tools after server start', async () => {
    await mcpProvider.startMCPServer();
    
    const tools = mcpProvider.getDiscoveredTools();
    assert.ok(Array.isArray(tools));
    
    // Should have some Biomni-specific tools
    const expectedTools = ['blast_search', 'sequence_align', 'fetch_sequence'];
    const discoveredToolNames = tools.map(tool => tool.name);
    
    expectedTools.forEach(expectedTool => {
      assert.ok(
        discoveredToolNames.includes(expectedTool),
        `Expected tool ${expectedTool} not found in discovered tools: ${discoveredToolNames.join(', ')}`
      );
    });
  });

  test('should provide health status', async () => {
    // Before starting server
    let healthStatus = mcpProvider.getHealthStatus();
    assert.strictEqual(healthStatus, undefined);
    
    // After starting server
    await mcpProvider.startMCPServer();
    healthStatus = mcpProvider.getHealthStatus();
    
    assert.ok(healthStatus);
    assert.strictEqual(typeof healthStatus.healthy, 'boolean');
    assert.ok(healthStatus.lastCheck instanceof Date);
  });

  test('should update configuration', async () => {
    const newConfig: McpClientConfig = {
      ...mockConfig,
      mcpServerUrl: 'http://localhost:9000'
    };

    await mcpProvider.updateConfiguration(newConfig);
    
    // Configuration should be updated (we can't directly test private config)
    // but we can verify the provider still works
    assert.ok(mcpProvider);
  });

  test('should handle errors in server definition provision gracefully', async () => {
    // Create a provider with invalid configuration to trigger error path
    const invalidProvider = new BiomniMCPProvider({
      ...mockConfig,
      mcpServerUrl: '' // Invalid URL
    });

    // Should not throw, but should handle gracefully
    const definitions = await invalidProvider.provideMcpServerDefinitions();
    assert.ok(Array.isArray(definitions));
    
    invalidProvider.dispose();
  });

  test('should emit change events', (done) => {
    let eventFired = false;
    
    mcpProvider.onDidChangeMcpServerDefinitions(() => {
      eventFired = true;
      
      // Verify event was fired
      assert.strictEqual(eventFired, true);
      done();
    });

    // Start server should trigger change event
    mcpProvider.startMCPServer().catch(done);
  });

  test('should dispose resources properly', () => {
    assert.strictEqual(mcpProvider.isRunning(), false);
    
    // Dispose should not throw
    assert.doesNotThrow(() => {
      mcpProvider.dispose();
    });
  });
});

suite('MCP Provider Integration Test Suite', () => {
  test('should integrate with VSCode MCP system', () => {
    // This test verifies that the provider can be registered with VSCode
    const config: McpClientConfig = {
      enabled: true,
      mcpServerUrl: 'http://localhost:8080',
      autoActivate: true
    };

    const provider = new BiomniMCPProvider(config);
    
    // Should have required interface methods
    assert.ok(typeof provider.onDidChangeMcpServerDefinitions === 'object');
    assert.ok(typeof provider.provideMcpServerDefinitions === 'function');
    assert.ok(typeof provider.resolveMcpServerDefinition === 'function');
    
    provider.dispose();
  });
});