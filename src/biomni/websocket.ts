import WebSocket from 'ws';
import { EventEmitter } from 'events';

export interface WebSocketMessage {
  type: string;
  id?: string;
  method?: string;
  params?: any;
  result?: any;
  error?: any;
}

export interface WebSocketOptions {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  pingInterval?: number;
}

export class MCPWebSocketManager extends EventEmitter {
  private ws: WebSocket | null = null;
  private options: Required<WebSocketOptions>;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private requestCallbacks = new Map<string, { resolve: Function; reject: Function }>();
  private requestCounter = 0;
  private isClosing = false;

  constructor(options: WebSocketOptions) {
    super();
    this.options = {
      url: options.url,
      reconnectInterval: options.reconnectInterval || 5000,
      maxReconnectAttempts: options.maxReconnectAttempts || 5,
      pingInterval: options.pingInterval || 30000,
    };
  }

  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      try {
        this.ws = new WebSocket(this.options.url);

        this.ws.on('open', () => {
          console.log('WebSocket connected to MCP server');
          this.reconnectAttempts = 0;
          this.emit('connected');
          this.startPingInterval();
          this.flushMessageQueue();
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          try {
            const message: WebSocketMessage = JSON.parse(data.toString());
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        });

        this.ws.on('error', (error: Error) => {
          console.error('WebSocket error:', error);
          this.emit('error', error);
          if (this.ws?.readyState === WebSocket.CONNECTING) {
            reject(error);
          }
        });

        this.ws.on('close', (code: number, reason: Buffer) => {
          console.log(`WebSocket closed: ${code} - ${reason}`);
          this.stopPingInterval();
          this.emit('disconnected', { code, reason });

          if (!this.isClosing) {
            this.scheduleReconnect();
          }
        });

        this.ws.on('pong', () => {
          this.emit('pong');
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  public async sendRequest(method: string, params?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = `req_${++this.requestCounter}`;
      const message: WebSocketMessage = {
        type: 'request',
        id,
        method,
        params,
      };

      this.requestCallbacks.set(id, { resolve, reject });

      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message));
      } else {
        this.messageQueue.push(message);
        if (this.ws?.readyState !== WebSocket.CONNECTING) {
          this.connect().catch(reject);
        }
      }

      // Add timeout for requests
      setTimeout(() => {
        if (this.requestCallbacks.has(id)) {
          this.requestCallbacks.delete(id);
          reject(new Error(`Request ${method} timed out`));
        }
      }, 30000);
    });
  }

  public sendNotification(method: string, params?: any): void {
    const message: WebSocketMessage = {
      type: 'notification',
      method,
      params,
    };

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    if (message.type === 'response' && message.id) {
      const callback = this.requestCallbacks.get(message.id);
      if (callback) {
        this.requestCallbacks.delete(message.id);
        if (message.error) {
          callback.reject(new Error(message.error.message || 'Request failed'));
        } else {
          callback.resolve(message.result);
        }
      }
    } else if (message.type === 'notification') {
      this.emit('notification', message);
    } else if (message.type === 'event') {
      this.emit('event', message);
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      if (message) {
        this.ws.send(JSON.stringify(message));
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.options.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1);

    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  private startPingInterval(): void {
    this.stopPingInterval();
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, this.options.pingInterval);
  }

  private stopPingInterval(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  public disconnect(): void {
    this.isClosing = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopPingInterval();

    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close(1000, 'Client disconnect');
      }
      this.ws = null;
    }

    // Reject all pending requests
    this.requestCallbacks.forEach(callback => {
      callback.reject(new Error('WebSocket disconnected'));
    });
    this.requestCallbacks.clear();
    this.messageQueue = [];
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  public getReadyState(): number {
    return this.ws?.readyState || WebSocket.CLOSED;
  }
}
