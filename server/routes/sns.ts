/**
 * SNS (Sats Names Service) API Routes
 * Implements name checking and registration using the SatsNames relay
 */

import { Router } from 'express';
import { 
  satsNamesRelay, 
  NameQueryResponse,
  TransactionResponse
} from '../sats-names-relay';

const router = Router();

// Mapping of fee tiers to fee rates (sats/vbyte)
const FEE_TIER_RATES = {
  economy: 10,   // Slower confirmation (several hours)
  normal: 25,    // Normal confirmation (30-60 minutes)
  custom: 0      // Set by user
};

// Platform fee in satoshis (2000 sats = 2k sats)
const PLATFORM_FEE = 2000;

// Registry address (official SNS registry)
const REGISTRY_ADDRESS = 'bc1qe8grz79ej3ywxkfcdchrncfl5antlc9tzmy5c2';

// Platform address (where fees are sent)
const PLATFORM_ADDRESS = '3GzpE8PyW8XgNnmkxsNLpj2jVKvyxwRYFM';

/**
 * Helper function to calculate estimated fees
 */
function calculateFees(tier: 'economy' | 'normal' | 'custom', customFee?: number) {
  // Base inscription fee is 10k sats
  const inscriptionFee = 10000;
  
  // Network fee depends on tier
  let networkFee = 0;
  let processingTime = '';
  
  switch (tier) {
    case 'economy':
      networkFee = 1000;
      processingTime = '~2-4 hours';
      break;
    case 'normal':
      networkFee = 2500;
      processingTime = '~30-60 minutes';
      break;
    case 'custom':
      networkFee = customFee || 5000;
      processingTime = 'Varies';
      break;
  }
  
  // Size fee is based on the name length
  const sizeFee = 500;
  
  // Total fees
  const totalFee = inscriptionFee + networkFee + sizeFee + PLATFORM_FEE;
  
  // Rough USD conversion (for display purposes)
  // Assuming 1 sat = $0.0005 (varies with BTC price)
  const satToUsd = 0.0005;
  
  const usdValues = {
    inscriptionFeeUSD: (inscriptionFee * satToUsd).toFixed(2),
    networkFeeUSD: (networkFee * satToUsd).toFixed(2),
    sizeFeeUSD: (sizeFee * satToUsd).toFixed(2),
    serviceFeeUSD: (PLATFORM_FEE * satToUsd).toFixed(2),
    totalUSD: (totalFee * satToUsd).toFixed(2)
  };
  
  return {
    inscriptionFee,
    networkFee,
    sizeFee,
    serviceFee: PLATFORM_FEE,
    total: totalFee,
    processingTime,
    registryAddress: REGISTRY_ADDRESS,
    platformAddress: PLATFORM_ADDRESS,
    usdValues,
    feeRate: FEE_TIER_RATES[tier]
  };
}

/**
 * Get fee information
 * GET /api/sns/fees
 * Query parameters:
 *   tier: 'economy' | 'normal' | 'custom'
 *   customFee: number (required if tier is 'custom')
 */
router.get('/fees', async (req, res) => {
  try {
    const tier = (req.query.tier as string) || 'normal';
    const customFee = req.query.customFee ? parseInt(req.query.customFee as string) : undefined;
    
    if (tier === 'custom' && !customFee) {
      return res.status(400).json({ error: 'Custom fee amount is required for custom tier' });
    }
    
    // Get status from relay to ensure it's available
    try {
      const status = await satsNamesRelay.getStatus();
      console.log('SNS Relay status:', status);
    } catch (err) {
      console.warn('SNS Relay not available:', err);
      // Continue anyway, we can still return fee estimates
    }
    
    const fees = calculateFees(
      tier as 'economy' | 'normal' | 'custom', 
      customFee
    );
    
    res.json(fees);
  } catch (error) {
    console.error('Error getting fees:', error);
    res.status(500).json({ error: 'Failed to get fee information' });
  }
});

/**
 * Check name availability
 * GET /api/sns/name/check
 * Query parameters:
 *   name: string
 */
router.get('/name/check', async (req, res) => {
  try {
    const { name } = req.query;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    // Normalize the name (lowercase, trim)
    const normalizedName = name.toLowerCase().trim();
    
    // Validate name format (only letters, numbers, and hyphens)
    if (!/^[a-z0-9-]+$/.test(normalizedName)) {
      return res.status(400).json({ 
        error: 'Invalid name format. Names can only contain letters, numbers, and hyphens.',
        isAvailable: false
      });
    }
    
    try {
      // Check name using relay
      const result = await satsNamesRelay.checkName(normalizedName);
      
      // Return the result with warning if present
      const response: any = {
        name: normalizedName,
        isAvailable: result.isAvailable,
        owner: result.owner,
        address: result.address,
        inscription_id: result.inscription_id,
        registered_at: result.registered_at,
        expires_at: result.expires_at
      };
      
      // Include warning if present (from fallback mechanism)
      if (result.warning) {
        response.warning = result.warning;
        response.fallback = true;
      }
      
      res.json(response);
    } catch (relayError) {
      console.error('Relay error:', relayError);
      
      // Fallback to basic validation if relay is not available
      // This is not ideal but provides some functionality
      res.json({
        name: normalizedName,
        isAvailable: normalizedName.length >= 5 && 
          !['bitcoin', 'satoshi', 'ordinal', 'ord', 'inscription'].includes(normalizedName),
        warning: 'Name availability is approximate. The relay service is currently unavailable.'
      });
    }
  } catch (error) {
    console.error('Error checking name:', error);
    res.status(500).json({ error: 'Failed to check name availability' });
  }
});

/**
 * Create a name registration transaction
 * POST /api/sns/register
 * Body:
 *   name: string
 *   tier: 'economy' | 'normal' | 'custom'
 *   customFee?: number
 *   destinationAddress: string
 */
router.post('/register', async (req, res) => {
  try {
    const { name, tier, customFee, destinationAddress } = req.body;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    if (!destinationAddress || typeof destinationAddress !== 'string') {
      return res.status(400).json({ error: 'Destination address is required' });
    }
    
    // Normalize the name
    const normalizedName = name.toLowerCase().trim();
    
    // First, check if the name is available
    try {
      const nameCheck = await satsNamesRelay.checkName(normalizedName);
      
      if (!nameCheck.isAvailable) {
        return res.status(400).json({ 
          error: 'Name is not available',
          details: nameCheck
        });
      }
    } catch (checkError: any) {
      console.error('Error checking name availability:', checkError);
      return res.status(500).json({ 
        error: 'Failed to check name availability',
        details: checkError.message || 'Unknown error'
      });
    }
    
    // Determine fee rate based on tier
    let feeRate = FEE_TIER_RATES.normal; // Default to normal
    
    if (tier === 'economy') {
      feeRate = FEE_TIER_RATES.economy;
    } else if (tier === 'custom' && customFee) {
      feeRate = customFee;
    }
    
    // Create the registration transaction
    try {
      const transaction = await satsNamesRelay.createNameRegistrationTransaction({
        name: normalizedName,
        address: destinationAddress,
        feeRate
      });
      
      // Calculate total fees incl. platform fee
      const fees = calculateFees(
        tier as 'economy' | 'normal' | 'custom', 
        customFee
      );
      
      res.json({
        name: normalizedName,
        transaction,
        fees,
        next_steps: {
          sign_and_broadcast: true,
          platform_fee: {
            amount: PLATFORM_FEE,
            address: PLATFORM_ADDRESS
          }
        }
      });
    } catch (txError: any) {
      console.error('Error creating registration transaction:', txError);
      
      // Check if this is a connectivity error
      const isConnectivityError = txError.message && 
        txError.message.includes('Unable to connect to relay service');
      
      if (isConnectivityError) {
        return res.status(503).json({
          error: 'Relay service temporarily unavailable',
          message: 'The Sats Names relay service is currently unavailable. Please try again later.',
          fallback: true,
          status: 'degraded',
          retry_after: '300', // Suggest retry after 5 minutes
          // Return fee information so the client knows what to expect
          fees: calculateFees(tier as 'economy' | 'normal' | 'custom', customFee)
        });
      }
      
      return res.status(500).json({ 
        error: 'Failed to create registration transaction',
        details: txError.message || 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Error registering name:', error);
    res.status(500).json({ error: 'Failed to register name' });
  }
});

/**
 * Get relay status
 * GET /api/sns/status
 */
router.get('/status', async (req, res) => {
  try {
    const status = await satsNamesRelay.getStatus();
    
    // Check if we're using fallback status (which means relay is not available)
    if (status.version.includes('unknown')) {
      return res.status(200).json({ 
        status: 'degraded', 
        message: 'Relay service is currently unavailable. Some features may be limited.',
        fallback: true,
        ...status 
      });
    }
    
    res.json({ 
      status: 'online', 
      message: 'Relay service is online and responding normally.',
      fallback: false,
      ...status 
    });
  } catch (error: any) {
    console.error('Error getting relay status:', error);
    res.status(200).json({ 
      status: 'offline', 
      message: 'Relay service is currently unavailable. Please try again later.',
      fallback: true,
      error: error.message || 'Unknown error',
      version: 'unknown (connection failed)',
      names_count: 0
    });
  }
});

export default router;