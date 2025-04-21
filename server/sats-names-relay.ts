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

// Export the relay client class
export class SatsNamesRelayClient extends EventEmitter {
  private isDisabled = process.env.DISABLE_SATS_NAMES === 'true' || 
                      process.env.DISABLE_SNS_RELAY === 'true' || 
                      process.env.SNS_ENABLED === 'false';

  constructor(
    private url: string = PRIMARY_RELAY, 
    private debug: boolean = false
  ) {
    super();
    this.log('SatsNames functionality disabled by environment configuration');
  }

  /**
   * Mocked connect method that does nothing
   */
  private connect(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Mocked close method that does nothing
   */
  close(): void {
    this.log('Mock close called - no action needed');
  }

  /**
   * Mock implementation that always says names are available
   */
  async checkName(name: string): Promise<NameQueryResponse> {
    this.log(`Mock checkName called for: ${name}`);
    return {
      name,
      isAvailable: true,
      warning: 'SatsNames service is disabled, all names reported as available',
      fallback: true
    };
  }

  /**
   * Mock implementation that always fails with disabled message
   */
  async createNameRegistrationTransaction(
    request: TransactionRequest
  ): Promise<TransactionResponse> {
    this.log(`Mock createNameRegistrationTransaction called for: ${request.name}`);
    throw new Error('SatsNames service is disabled');
  }

  /**
   * Mock implementation that returns offline status
   */
  async getStatus(): Promise<{ version: string; names_count: number }> {
    return {
      version: 'mock-disabled',
      names_count: 0
    };
  }

  /**
   * Logging helper
   */
  private log(...args: any[]): void {
    if (this.debug) {
      console.log('[SatsNamesRelay]', ...args);
    }
  }
}

// Export a singleton instance
export const satsNamesRelay = new SatsNamesRelayClient(undefined, true);