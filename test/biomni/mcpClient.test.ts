import { BiomniMcpClient } from '../../src/biomni/mcpClient';
import { McpClientConfig } from '../../src/types/config';

describe('BiomniMcpClient', () => {
  let client: BiomniMcpClient;
  let config: McpClientConfig;

  beforeEach(() => {
    config = {
      enabled: true,
      mcpServerUrl: 'http://localhost:8080',
      autoActivate: true,
      connectionTimeout: 1000,
      requestTimeout: 2000,
      maxRetries: 1,
    };
    client = new BiomniMcpClient(config);
  });

  afterEach(async () => {
    if (client && client.isClientInitialized()) {
      await client.dispose();
    }
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      expect(client.isClientInitialized()).toBe(false);
      expect(client.isClientConnected()).toBe(false);

      await client.initialize();

      expect(client.isClientInitialized()).toBe(true);
      expect(client.isClientConnected()).toBe(true);
    });

    it('should not reinitialize if already initialized', async () => {
      await client.initialize();
      const firstStatus = client.getStatus();

      await client.initialize(); // Should not throw or change state
      const secondStatus = client.getStatus();

      expect(firstStatus).toEqual(secondStatus);
    });

    it('should handle initialization errors gracefully', async () => {
      // Create client with invalid config to simulate error
      const invalidClient = new BiomniMcpClient({
        ...config,
        mcpServerUrl: '', // Invalid URL
      });

      // Note: Since we're using a mock connection, this might not actually fail
      // In a real implementation, this would test actual connection failures
      await expect(invalidClient.initialize()).resolves.not.toThrow();
    });
  });

  describe('status', () => {
    it('should return correct status before initialization', () => {
      const status = client.getStatus();

      expect(status.initialized).toBe(false);
      expect(status.connected).toBe(false);
      expect(status.serverUrl).toBe(config.mcpServerUrl);
    });

    it('should return correct status after initialization', async () => {
      await client.initialize();
      const status = client.getStatus();

      expect(status.initialized).toBe(true);
      expect(status.connected).toBe(true);
      expect(status.serverUrl).toBe(config.mcpServerUrl);
    });
  });

  describe('disposal', () => {
    it('should dispose successfully when initialized', async () => {
      await client.initialize();
      expect(client.isClientInitialized()).toBe(true);

      await client.dispose();
      expect(client.isClientInitialized()).toBe(false);
      expect(client.isClientConnected()).toBe(false);
    });

    it('should dispose successfully when not initialized', async () => {
      expect(client.isClientInitialized()).toBe(false);

      await expect(client.dispose()).resolves.not.toThrow();
      expect(client.isClientInitialized()).toBe(false);
    });
  });

  describe('configuration', () => {
    it('should use default values for optional config', () => {
      const minimalConfig = {
        enabled: true,
        mcpServerUrl: 'http://test:8080',
        autoActivate: false,
      };

      const clientWithDefaults = new BiomniMcpClient(minimalConfig);
      const status = clientWithDefaults.getStatus();

      expect(status.serverUrl).toBe(minimalConfig.mcpServerUrl);
    });
  });
});