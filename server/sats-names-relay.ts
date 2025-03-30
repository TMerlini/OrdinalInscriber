/**
 * Sats Names Relay Client
 * Based on examples from https://docs.satsnames.org/sats-names/relay-examples
 */

import { WebSocket } from 'ws';
import { EventEmitter } from 'events';
import * as crypto from 'crypto';

// Relay event types
export type RelayEvent = {
  id: string;
  kind: number;
  pubkey: string;
  created_at: number;
  content: string;
  tags: string[][];
  sig: string;
};

// Name query response interface
export interface NameQueryResponse {
  name: string;
  isAvailable: boolean;
  owner?: string;
  address?: string;
  inscription_id?: string;
  registered_at?: number;
  expires_at?: number;
  warning?: string; // Added for fallback responses
  fallback?: boolean; // Flag to indicate if this is a fallback response
}

// Transaction creation interface
export interface TransactionRequest {
  name: string;
  address: string;
  feeRate: number;
}

// Transaction response interface
export interface TransactionResponse {
  txHex: string;
  fee: number;
  vsize: number;
  feeRate: number;
}

// Relay client class
export class SatsNamesRelayClient extends EventEmitter {
  private socket: WebSocket | null = null;
  private isConnected = false;
  private pendingRequests: Map<string, { resolve: Function; reject: Function }> = new Map();
  private subscriptions: Map<string, string> = new Map();
  private connectionAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;

  /**
   * Constructor
   * @param url Relay URL (default is the official Sats Names relay)
   */
  constructor(
    private url: string = 'wss://relay.satsnames.network', 
    private debug: boolean = false
  ) {
    super();
    // Try to connect but catch any error to prevent app crash
    this.connect().catch(err => {
      this.log('Initial connection failed:', err);
    });
  }

  /**
   * Connect to the relay
   */
  private connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.log('Connecting to relay:', this.url);
        this.socket = new WebSocket(this.url);
        
        this.socket.on('open', () => {
          this.log('Connected to relay');
          this.isConnected = true;
          this.connectionAttempts = 0;
          resolve();
          this.emit('connect');
        });
        
        this.socket.on('close', () => {
          this.log('Disconnected from relay');
          this.isConnected = false;
          this.handleReconnect();
          this.emit('disconnect');
        });
        
        this.socket.on('error', (error) => {
          this.log('Relay connection error:', error);
          // Avoid emitting the error which can crash the app
          // Instead just dispatch it as a custom event
          this.emit('connection_error', error);
          reject(error);
        });
        
        this.socket.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleMessage(message);
          } catch (error) {
            this.log('Failed to parse message:', error);
          }
        });
      } catch (error) {
        this.log('Failed to connect to relay:', error);
        reject(error);
        this.handleReconnect();
      }
    });
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnect(): void {
    if (this.connectionAttempts < this.maxReconnectAttempts) {
      this.connectionAttempts++;
      this.log(`Attempting to reconnect (${this.connectionAttempts}/${this.maxReconnectAttempts})...`);
      
      // Use exponential backoff with jitter for reconnection to avoid thundering herd
      const baseDelay = this.reconnectDelay * Math.pow(1.5, this.connectionAttempts - 1);
      const jitter = Math.random() * 0.3 + 0.85; // Random between 0.85 and 1.15
      const delay = Math.floor(baseDelay * jitter);
      
      setTimeout(() => {
        this.connect().catch(err => {
          this.log('Reconnection failed:', err);
        });
      }, delay);
    } else {
      this.log('Max reconnection attempts reached');
      this.emit('max_reconnect_attempts');
      
      // After max attempts, try again with much longer intervals
      // This enables eventual recovery if the network comes back much later
      setTimeout(() => {
        this.connectionAttempts = 0; // Reset attempts counter
        this.log('Restarting connection attempts after long pause');
        this.connect().catch(err => {
          this.log('Long-pause reconnection failed:', err);
        });
      }, 60000); // Try again after 1 minute
    }
  }

  /**
   * Handle incoming messages from the relay
   */
  private handleMessage(message: any): void {
    if (!message || !Array.isArray(message)) {
      return;
    }

    const [type, ...payload] = message;

    switch (type) {
      case 'EVENT': {
        const [subscription, event] = payload;
        this.emit('event', event, subscription);
        break;
      }
      case 'EOSE': {
        // End of stored events
        const [subscription] = payload;
        this.emit('eose', subscription);
        break;
      }
      case 'NOTICE': {
        const [notice] = payload;
        this.log('Relay notice:', notice);
        this.emit('notice', notice);
        break;
      }
      case 'OK': {
        const [id, success, message] = payload;
        if (this.pendingRequests.has(id)) {
          const { resolve, reject } = this.pendingRequests.get(id)!;
          if (success) {
            resolve({ success, message });
          } else {
            reject(new Error(message));
          }
          this.pendingRequests.delete(id);
        }
        break;
      }
      case 'RESPONSE': {
        const [requestId, responseData] = payload;
        if (this.pendingRequests.has(requestId)) {
          const { resolve } = this.pendingRequests.get(requestId)!;
          resolve(responseData);
          this.pendingRequests.delete(requestId);
        }
        break;
      }
      default:
        this.log('Unknown message type:', type, payload);
    }
  }

  /**
   * Send a message to the relay
   */
  private send(message: any): void {
    if (!this.isConnected || !this.socket) {
      throw new Error('Not connected to relay');
    }
    
    this.socket.send(JSON.stringify(message));
  }

  /**
   * Send a request to the relay and wait for a response
   */
  private async request<T>(method: string, params: any[]): Promise<T> {
    const requestId = crypto.randomBytes(16).toString('hex');
    
    return new Promise<T>((resolve, reject) => {
      try {
        this.pendingRequests.set(requestId, { resolve, reject });
        
        this.send([method, requestId, ...params]);
        
        // Set timeout for request
        setTimeout(() => {
          if (this.pendingRequests.has(requestId)) {
            this.pendingRequests.delete(requestId);
            reject(new Error(`Request timed out: ${method}`));
          }
        }, 30000); // 30 second timeout
      } catch (error) {
        this.pendingRequests.delete(requestId);
        reject(error);
      }
    });
  }

  /**
   * Check if a name is available
   * @param name Name to check
   */
  async checkName(name: string): Promise<NameQueryResponse> {
    try {
      if (!this.isConnected) {
        try {
          await this.connect();
        } catch (connectError) {
          this.log('Connection error during name check:', connectError);
          // Return a fallback response when we can't connect to the relay
          return {
            name,
            isAvailable: name.length >= 5 && 
              !['bitcoin', 'satoshi', 'ordinal', 'ord', 'inscription'].includes(name.toLowerCase()),
            warning: 'Relay connection unavailable. Availability status is approximate.',
            fallback: true
          };
        }
      }
      
      const response = await this.request<NameQueryResponse>(
        'NAME_QUERY', 
        [name]
      );
      
      return response;
    } catch (error) {
      this.log('Error checking name:', error);
      // Return a fallback response on error
      return {
        name,
        isAvailable: name.length >= 5 && 
          !['bitcoin', 'satoshi', 'ordinal', 'ord', 'inscription'].includes(name.toLowerCase()),
        warning: 'Relay error. Availability status is approximate.',
        fallback: true
      };
    }
  }
  
  /**
   * Generate a transaction for name registration
   * @param request Transaction request data
   */
  async createNameRegistrationTransaction(
    request: TransactionRequest
  ): Promise<TransactionResponse> {
    try {
      if (!this.isConnected) {
        try {
          await this.connect();
        } catch (connectError) {
          this.log('Connection error during transaction creation:', connectError);
          throw new Error('Unable to connect to relay service. Please try again later.');
        }
      }
      
      const response = await this.request<TransactionResponse>(
        'CREATE_NAME_TX', 
        [request.name, request.address, request.feeRate]
      );
      
      return response;
    } catch (error) {
      this.log('Error creating name registration transaction:', error);
      throw error;
    }
  }

  /**
   * Check the relay status
   */
  async getStatus(): Promise<{ version: string; names_count: number }> {
    try {
      if (!this.isConnected) {
        try {
          await this.connect();
        } catch (connectError) {
          this.log('Connection error during status check:', connectError);
          // Return fallback status information
          return {
            version: 'unknown (relay unavailable)',
            names_count: 0
          };
        }
      }
      
      return await this.request<{ version: string; names_count: number }>(
        'STATUS', 
        []
      );
    } catch (error) {
      this.log('Error getting relay status:', error);
      // Return fallback status information
      return {
        version: 'unknown (relay error)',
        names_count: 0
      };
    }
  }

  /**
   * Close the connection to the relay
   */
  close(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Utility method for logging if debug is enabled
   */
  private log(...args: any[]): void {
    if (this.debug) {
      console.log('[SatsNamesRelay]', ...args);
    }
  }
}

// Export a singleton instance
export const satsNamesRelay = new SatsNamesRelayClient(undefined, true);