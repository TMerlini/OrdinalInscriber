/**
 * Sats Names Relay Client
 * Based on examples from https://docs.satsnames.org/sats-names/relay-examples
 * 
 * Supports both WebSocket relay connection and HTTP fallback to indexer API
 * Primary: WebSocket relay for real-time queries
 * Fallback: HTTP API for name availability checks when relay is unavailable
 */

import { WebSocket } from 'ws';
import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import axios from 'axios';

// Primary relay server
const PRIMARY_RELAY = 'wss://relay.satsnames.network';
// Fallback indexer (using official SatsNames API)
const FALLBACK_INDEXER = 'https://snserver.io/api';
// Additional community indexers for further fallback (in order of preference)
const COMMUNITY_INDEXERS = [
  'https://ns0.satsnames.co/api',
  'https://ns1.satsnames.co/api',
  'https://ns2.satsnames.co/api'
];
// GeniiData API for SNS and bitmap data
const GENIIDATA_API = 'https://api.geniidata.com';
// GeniiData API for SNS lookups
const GENIIDATA_SNS_API = `${GENIIDATA_API}/ordinals/sns`;

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
   * @param debug Enable debug logging
   */
  constructor(
    private url: string = PRIMARY_RELAY, 
    private debug: boolean = false
  ) {
    super();
    
    // Log our fallback configuration
    this.log('Initialized with primary relay:', this.url);
    this.log('Fallback indexer:', FALLBACK_INDEXER);
    this.log('Community indexers:', COMMUNITY_INDEXERS);
    
    // Try to connect but catch any error to prevent app crash
    this.connect().catch(err => {
      this.log('Initial connection failed:', err);
      this.log('Will use fallback APIs for queries when needed');
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
   * Try to fetch name availability from an HTTP indexer API
   * @param name Name to check
   * @param indexerUrl The indexer API URL to use
   */
  private async checkNameViaIndexerAPI(name: string, indexerUrl: string): Promise<NameQueryResponse> {
    try {
      // Attempt to fetch from the indexer API
      const response = await axios.get(`${indexerUrl}/names/${name}`);
      
      // Process the response based on the indexer API format
      if (response.data) {
        if (response.data.error) {
          // If the API returns an error, usually means the name is available
          return {
            name,
            isAvailable: true,
            warning: `Response from indexer API: ${response.data.error}`,
            fallback: true
          };
        }
        
        // If we got a successful response with data, the name exists
        return {
          name,
          isAvailable: false,
          owner: response.data.owner,
          address: response.data.address,
          inscription_id: response.data.inscription_id,
          registered_at: response.data.registered_at,
          expires_at: response.data.expires_at,
          fallback: true,
          warning: 'Data from indexer API (WebSocket relay unavailable)'
        };
      }
      
      // Default fallback if the response format is unexpected
      return {
        name,
        isAvailable: true,
        warning: 'Unusual response from indexer API, availability might not be accurate',
        fallback: true
      };
    } catch (error) {
      // If the API request fails, log and rethrow
      this.log(`Error querying indexer API (${indexerUrl}):`, error);
      throw error;
    }
  }

  /**
   * Check name availability using GeniiData API
   * @param name Name to check
   */
  private async checkNameViaGeniiData(name: string): Promise<NameQueryResponse> {
    try {
      this.log(`Checking SNS name via GeniiData API: ${name}`);
      
      // GeniiData uses a different endpoint structure
      const response = await axios.get(`${GENIIDATA_SNS_API}/names`, {
        params: { domain: name }
      });
      
      if (response.data && response.data.code === 0) {
        const data = response.data.data;
        
        // If there's no data or empty data array, the name is available
        if (!data || !data.list || data.list.length === 0) {
          return {
            name,
            isAvailable: true,
            fallback: true,
            warning: 'Data from GeniiData API (Primary services unavailable)'
          };
        }
        
        // Find the exact name match (important if API returns partial matches)
        const exactMatch = data.list.find((item: any) => 
          item.domain?.toLowerCase() === name.toLowerCase()
        );
        
        if (!exactMatch) {
          return {
            name,
            isAvailable: true,
            fallback: true,
            warning: 'Name available according to GeniiData API'
          };
        }
        
        // Name exists and we have details
        return {
          name,
          isAvailable: false,
          owner: exactMatch.owner,
          address: exactMatch.owner,
          inscription_id: exactMatch.inscriptionId,
          registered_at: exactMatch.timestamp * 1000, // Convert to milliseconds
          fallback: true,
          warning: 'Data from GeniiData API (Primary services unavailable)'
        };
      }
      
      // If we got an unexpected response, provide a fallback
      return {
        name,
        isAvailable: name.length >= 5 && 
          !['bitcoin', 'satoshi', 'ordinal', 'ord', 'inscription'].includes(name.toLowerCase()),
        warning: 'GeniiData API returned an unexpected format, availability status is approximate',
        fallback: true
      };
    } catch (error) {
      this.log('Error querying GeniiData API:', error);
      throw error;
    }
  }

  /**
   * Check if a name is available
   * @param name Name to check
   */
  async checkName(name: string): Promise<NameQueryResponse> {
    try {
      // First try the WebSocket relay connection
      if (!this.isConnected) {
        try {
          await this.connect();
        } catch (connectError) {
          this.log('Connection error during name check, will try fallback APIs:', connectError);
          
          // First try the GeniiData API as it's been identified as more reliable
          try {
            this.log('Trying GeniiData API as first fallback...');
            return await this.checkNameViaGeniiData(name);
          } catch (geniiDataError) {
            this.log('GeniiData API failed, trying standard indexers:', geniiDataError);
            
            // Then try the fallback indexer API
            try {
              return await this.checkNameViaIndexerAPI(name, FALLBACK_INDEXER);
            } catch (indexerError) {
              this.log('Primary indexer API failed, trying community indexers:', indexerError);
              
              // Try each community indexer in sequence
              for (const indexerUrl of COMMUNITY_INDEXERS) {
                try {
                  return await this.checkNameViaIndexerAPI(name, indexerUrl);
                } catch (communityIndexerError) {
                  this.log(`Community indexer ${indexerUrl} failed:`, communityIndexerError);
                  // Continue to next indexer
                }
              }
              
              // If all indexers fail, fall back to basic validation
              this.log('All indexers failed, using basic validation');
              return {
                name,
                isAvailable: name.length >= 5 && 
                  !['bitcoin', 'satoshi', 'ordinal', 'ord', 'inscription'].includes(name.toLowerCase()),
                warning: 'All relay and indexer services unavailable. Status may not be accurate.',
                fallback: true
              };
            }
          }
        }
      }
      
      // If we're connected to the WebSocket relay, use it
      const response = await this.request<NameQueryResponse>(
        'NAME_QUERY', 
        [name]
      );
      
      return response;
    } catch (error) {
      this.log('Error checking name via relay, trying fallback APIs:', error);
      
      // First try GeniiData API
      try {
        this.log('Trying GeniiData API after relay failure...');
        return await this.checkNameViaGeniiData(name);
      } catch (geniiDataError) {
        this.log('GeniiData API failed after relay failure:', geniiDataError);
        
        // If GeniiData fails, try the standard fallback API
        try {
          return await this.checkNameViaIndexerAPI(name, FALLBACK_INDEXER);
        } catch (fallbackError) {
          // If fallback also fails, try community indexers
          for (const indexerUrl of COMMUNITY_INDEXERS) {
            try {
              return await this.checkNameViaIndexerAPI(name, indexerUrl);
            } catch (communityError) {
              // Continue to next indexer
            }
          }
          
          // Last resort fallback to basic validation
          return {
            name,
            isAvailable: name.length >= 5 && 
              !['bitcoin', 'satoshi', 'ordinal', 'ord', 'inscription'].includes(name.toLowerCase()),
            warning: 'All services unavailable. Status is based on basic validation only.',
            fallback: true
          };
        }
      }
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