/**
 * Extension configuration interface
 */
export interface ExtensionConfig {
  /** Enable/disable the extension */
  enabled: boolean;
  /** MCP server URL */
  mcpServerUrl: string;
  /** Automatically activate extension on workspace open */
  autoActivate: boolean;
}

/**
 * MCP client configuration
 */
export interface McpClientConfig extends ExtensionConfig {
  /** Connection timeout in milliseconds */
  connectionTimeout?: number;
  /** Request timeout in milliseconds */
  requestTimeout?: number;
  /** Maximum retry attempts */
  maxRetries?: number;
}
