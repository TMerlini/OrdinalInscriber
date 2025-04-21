/**
 * BRC-20 Inscription API Routes
 * Implements token operations (deploy, mint, transfer) for BRC-20 tokens
 * Uses GeniiData API for token validation and balance checking
 */
import { Request, Response } from 'express';
import axios from 'axios';
import { execCommand } from '../cmd-executor';
import { getOrdApiUrl } from '../routes';

// GeniiData API for BRC-20 information
const GENIIDATA_API = 'https://api.geniidata.com';
const GENIIDATA_BRC20_API = `${GENIIDATA_API}/ordinals/brc20`;

// Default container name for Bitcoin Ordinals
const DEFAULT_ORD_CONTAINER = process.env.ORD_RPC_HOST || "ordinals_ord_1";

// Valid BRC-20 operations
type Brc20Operation = 'deploy' | 'mint' | 'transfer';

// Interface for BRC-20 token information
interface Brc20TokenInfo {
  tick: string;         // Token ticker (1-4 characters)
  name?: string;        // Token name
  max: string;          // Maximum supply
  lim?: string;         // Per-mint limit (optional)
  decimals?: number;    // Decimal places (default: 18)
  deployed: boolean;    // Whether the token has been deployed
  totalMinted?: string; // Total minted amount
  maxMintPerInscription?: string; // Maximum mint amount per inscription
  mintingComplete?: boolean; // Whether minting is complete
}

/**
 * BRC-20 routes to be registered in the routes.ts file
 */
export function registerBrc20Routes(app: any) {
  /**
   * Check BRC-20 token information
   * GET /api/brc20/token/:ticker
   */
  app.get('/api/brc20/token/:ticker', async (req: Request, res: Response) => {
    try {
      const ticker = req.params.ticker.toUpperCase();
      
      // Validate ticker format (1-4 alphanumeric characters)
      if (!/^[A-Z0-9]{1,4}$/.test(ticker)) {
        return res.status(400).json({
          error: true,
          message: "Invalid ticker format. Must be 1-4 alphanumeric characters."
        });
      }
      
      console.log(`Checking BRC-20 token info for ${ticker} via GeniiData API`);
      
      try {
        // Query GeniiData API for token information
        const response = await axios.get(`${GENIIDATA_BRC20_API}/tokens`, {
          params: { ticker }
        });
        
        if (response.data && response.data.code === 0) {
          const data = response.data.data;
          
          if (!data || !data.list || data.list.length === 0) {
            // Token not found, can be deployed
            return res.json({
              ticker,
              deployed: false,
              available: true,
              message: "Token is available for deployment"
            });
          }
          
          // Token exists, return its details
          const tokenData = data.list[0];
          const tokenInfo: Brc20TokenInfo = {
            tick: tokenData.ticker,
            max: tokenData.max,
            lim: tokenData.limit,
            decimals: tokenData.decimals || 18,
            deployed: true,
            totalMinted: tokenData.totalMinted,
            maxMintPerInscription: tokenData.limit,
            mintingComplete: parseFloat(tokenData.totalMinted) >= parseFloat(tokenData.max)
          };
          
          return res.json({
            ...tokenInfo,
            available: false,
            message: "Token has already been deployed"
          });
        }
        
        // Unexpected response format
        return res.status(500).json({
          error: true,
          message: "Unexpected response from token API"
        });
      } catch (error) {
        console.error("Error checking token via GeniiData:", error);
        return res.status(500).json({
          error: true,
          message: "Failed to check token information"
        });
      }
    } catch (error) {
      console.error('Error in BRC-20 token check:', error);
      return res.status(500).json({
        error: true,
        message: "Failed to process BRC-20 token request"
      });
    }
  });

  /**
   * Get user's BRC-20 balance
   * GET /api/brc20/balance/:address/:ticker?
   */
  app.get('/api/brc20/balance/:address/:ticker?', async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      const ticker = req.params.ticker ? req.params.ticker.toUpperCase() : undefined;
      
      // Validate address (basic check)
      if (!address || address.length < 10) {
        return res.status(400).json({
          error: true,
          message: "Invalid Bitcoin address format."
        });
      }
      
      console.log(`Checking BRC-20 balance for ${address}${ticker ? ` (${ticker})` : ''} via GeniiData API`);
      
      try {
        // Query GeniiData API for balance information
        const endpoint = `${GENIIDATA_BRC20_API}/balances`;
        const params: any = { address };
        if (ticker) params.ticker = ticker;
        
        const response = await axios.get(endpoint, { params });
        
        if (response.data && response.data.code === 0) {
          return res.json({
            address,
            ticker: ticker || 'all',
            balances: response.data.data.list || []
          });
        }
        
        // Unexpected response format
        return res.status(500).json({
          error: true,
          message: "Unexpected response from balance API"
        });
      } catch (error) {
        console.error("Error checking balance via GeniiData:", error);
        return res.status(500).json({
          error: true,
          message: "Failed to check token balance"
        });
      }
    } catch (error) {
      console.error('Error in BRC-20 balance check:', error);
      return res.status(500).json({
        error: true,
        message: "Failed to process BRC-20 balance request"
      });
    }
  });

  /**
   * Generate BRC-20 inscription command
   * POST /api/brc20/generate-command
   * Body:
   *   operation: 'deploy' | 'mint' | 'transfer'
   *   ticker: string (1-4 characters)
   *   amount?: string (for mint/transfer)
   *   maxSupply?: string (for deploy)
   *   mintLimit?: string (for deploy)
   *   feeRate: number (sats/vbyte)
   *   destinationAddress?: string (optional)
   */
  app.post('/api/brc20/generate-command', async (req: Request, res: Response) => {
    try {
      const { 
        operation, 
        ticker, 
        amount, 
        maxSupply, 
        mintLimit, 
        feeRate, 
        destinationAddress
      } = req.body;
      
      // Validate required parameters
      if (!operation || !ticker || !feeRate) {
        return res.status(400).json({
          error: true,
          message: "Missing required parameters"
        });
      }
      
      // Validate operation type
      if (!['deploy', 'mint', 'transfer'].includes(operation)) {
        return res.status(400).json({
          error: true,
          message: "Invalid operation. Must be 'deploy', 'mint', or 'transfer'."
        });
      }
      
      // Validate ticker format
      const formattedTicker = ticker.toUpperCase();
      if (!/^[A-Z0-9]{1,4}$/.test(formattedTicker)) {
        return res.status(400).json({
          error: true,
          message: "Invalid ticker format. Must be 1-4 alphanumeric characters."
        });
      }
      
      // Validate required parameters for specific operations
      if (operation === 'deploy' && !maxSupply) {
        return res.status(400).json({
          error: true,
          message: "Missing maxSupply parameter for 'deploy' operation"
        });
      }
      
      if ((operation === 'mint' || operation === 'transfer') && !amount) {
        return res.status(400).json({
          error: true,
          message: `Missing amount parameter for '${operation}' operation`
        });
      }
      
      // Use the default container name
      const container = DEFAULT_ORD_CONTAINER;
      
      // Generate JSON content for inscription
      let inscriptionContent: any = {
        p: "brc-20",
        op: operation,
        tick: formattedTicker
      };
      
      // Add operation-specific fields
      if (operation === 'deploy') {
        inscriptionContent.max = maxSupply;
        if (mintLimit) inscriptionContent.lim = mintLimit;
      } else if (operation === 'mint' || operation === 'transfer') {
        inscriptionContent.amt = amount;
      }
      
      // Escape the content for shell command
      const escapedJson = JSON.stringify(inscriptionContent).replace(/"/g, '\\"');
      
      // Build the ord command
      let command = `docker exec -it ${container} sh -c 'echo "${escapedJson}" > /tmp/brc20-${operation}.json && `;
      command += `ord wallet inscribe --fee-rate ${feeRate} --file /tmp/brc20-${operation}.json --content-type application/json `;
      
      // Add destination address if provided
      if (destinationAddress) {
        command += `--destination ${destinationAddress} `;
      }
      
      command += "'";
      
      // Calculate approximate fees (BRC-20 inscriptions are typically around 350-400 vbytes)
      const vbyte = 400; // Conservative estimate
      const baseFee = 600; // Base fee in satoshis
      const inscriptionFee = vbyte * Number(feeRate);
      const totalFee = inscriptionFee + baseFee;
      
      return res.json({
        command,
        operation,
        ticker: formattedTicker,
        inscriptionContent,
        feeDetails: {
          vbyte,
          baseFee,
          inscriptionFee,
          totalFee,
          feeRate,
          processingTime: getFeeProcessingTime(Number(feeRate))
        }
      });
    } catch (error) {
      console.error('Error generating BRC-20 inscription command:', error);
      return res.status(500).json({
        error: true,
        message: "Failed to generate BRC-20 inscription command"
      });
    }
  });
  
  /**
   * Helper function to estimate processing time based on fee rate
   */
  function getFeeProcessingTime(feeRate: number): string {
    if (feeRate >= 25) {
      return "Fast (likely next block, ~10 minutes)";
    } else if (feeRate >= 15) {
      return "Standard (typically within an hour)";
    } else if (feeRate >= 5) {
      return "Economy (may take several hours)";
    } else {
      return "Very slow (could take a day or more)";
    }
  }
}