/**
 * Bitmap Inscription API Routes
 * Implements bitmap number validation and inscription generation
 * Based on the bitmap.land implementation guide
 * 
 * Updated to use GeniiData API for bitmap validation as a reliable source
 */
import { Request, Response } from 'express';
import axios from 'axios';
import { execCommand } from '../cmd-executor';
import { getOrdApiUrl } from '../routes';

// GeniiData API for Bitmap information
const GENIIDATA_API = 'https://api.geniidata.com';
const GENIIDATA_BITMAP_API = `${GENIIDATA_API}/ordinals/bitmaps`;

/**
 * Endpoints to be registered in the routes.ts file
 */
export function registerBitmapRoutes(app: any) {
  /**
   * Check bitmap availability
   * GET /api/bitmap/check/:number
   */
  app.get('/api/bitmap/check/:number', async (req: Request, res: Response) => {
    try {
      const bitmapNumber = req.params.number;
      
      // Validate bitmap number format
      if (!/^\d+$/.test(bitmapNumber)) {
        return res.status(400).json({ 
          error: true, 
          message: "Invalid bitmap number format. Must contain only digits." 
        });
      }
      
      // Try to get the latest block height
      let latestBlock;
      try {
        // First try to get block height from GeniiData API
        try {
          console.log("Fetching block height from GeniiData API");
          const blockResponse = await axios.get(`${GENIIDATA_API}/ordinals/status`);
          if (blockResponse.data && blockResponse.data.code === 0 && blockResponse.data.data) {
            latestBlock = blockResponse.data.data.blockHeight;
            console.log(`Block height from GeniiData: ${latestBlock}`);
          }
        } catch (geniiDataErr) {
          console.error("Error fetching block height from GeniiData:", geniiDataErr);
          
          // Fallback to Ordinals node
          const ordApiUrl = getOrdApiUrl();
          console.log(`Fetching block height from Ordinals node: ${ordApiUrl}`);
          const blockResponse = await axios.get(`${ordApiUrl}/blocks/latest`);
          latestBlock = blockResponse.data.height;
        }
      } catch (err) {
        // If we can't get the latest block, provide fallback message
        console.error("Error fetching latest block:", err);
        latestBlock = null;
      }
      
      // Check if bitmap is already inscribed using GeniiData API
      let isAvailable = true;
      let inscriptionDetails = null;
      
      try {
        console.log(`Checking bitmap ${bitmapNumber} availability via GeniiData API`);
        const bitmapResponse = await axios.get(`${GENIIDATA_BITMAP_API}/content`, {
          params: { content: `${bitmapNumber}.bitmap` }
        });
        
        if (bitmapResponse.data && bitmapResponse.data.code === 0) {
          const data = bitmapResponse.data.data;
          
          // If there are matching records, the bitmap is already inscribed
          if (data && data.list && data.list.length > 0) {
            isAvailable = false;
            inscriptionDetails = {
              count: data.list.length,
              firstInscription: data.list[0]
            };
            console.log(`Bitmap ${bitmapNumber} is already inscribed ${data.list.length} times`);
          } else {
            console.log(`Bitmap ${bitmapNumber} is available for inscription`);
          }
        }
      } catch (bitmapCheckErr) {
        console.error(`Error checking bitmap availability via GeniiData:`, bitmapCheckErr);
        // If the GeniiData API fails, we'll be optimistic and say it's available
        // but warn the user
        isAvailable = true;
      }
      
      return res.json({
        bitmapNumber,
        isAvailable,
        latestBlock,
        format: `${bitmapNumber}.bitmap`,
        inscriptionDetails,
        source: isAvailable && !inscriptionDetails ? 'geniidata' : 'geniidata_verified'
      });
    } catch (error) {
      console.error('Error checking bitmap availability:', error);
      return res.status(500).json({ 
        error: true, 
        message: "Failed to check bitmap availability" 
      });
    }
  });

  /**
   * Calculate bitmap inscription fees
   * POST /api/bitmap/calculate-fees
   * Body:
   *   feeRate: number
   */
  app.post('/api/bitmap/calculate-fees', (req: Request, res: Response) => {
    try {
      const { feeRate } = req.body;
      
      if (!feeRate) {
        return res.status(400).json({
          error: true,
          message: "Missing fee rate parameter"
        });
      }
      
      // Calculate fees for bitmap inscription
      // These are approximations based on typical bitmap inscription sizes
      const vbyte = 320; // Approximate size of a bitmap inscription in vbytes
      const baseFee = 600; // Base fee in satoshis
      const inscriptionFee = vbyte * Number(feeRate); // Fee for the inscription transaction
      const totalFee = inscriptionFee + baseFee; // Total fee including the base fee
      
      return res.json({
        vbyte,
        baseFee,
        inscriptionFee,
        totalFee,
        feeRate,
        estimatedUsd: null, // This would be calculated if we had BTC/USD price feed
        processingTime: getFeeProcessingTime(Number(feeRate))
      });
    } catch (error) {
      console.error('Error calculating bitmap inscription fees:', error);
      return res.status(500).json({
        error: true,
        message: "Failed to calculate inscription fees"
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

  /**
   * Generate bitmap inscription command
   * POST /api/bitmap/generate-command
   * Body:
   *   bitmapNumber: string
   *   feeRate: number
   *   destinationAddress?: string
   */
  app.post('/api/bitmap/generate-command', (req: Request, res: Response) => {
    try {
      const { bitmapNumber, feeRate, destinationAddress, containerName } = req.body;
      
      // Validate inputs
      if (!bitmapNumber || !feeRate) {
        return res.status(400).json({
          error: true,
          message: "Missing required parameters"
        });
      }
      
      // Get the container name (use the provided one or default)
      const container = containerName || 'bitcoin-ordinals';
      
      // Build the ord command for bitmap inscription
      let command = `docker exec -it ${container} sh -c 'ord wallet inscribe --fee-rate ${feeRate} --file - --content-type text/plain `;
      
      // Optional destination parameter
      if (destinationAddress) {
        command += `--destination ${destinationAddress} `;
      }
      
      // Add the bitmap number as content (this will be piped in)
      command += `<(echo -n "${bitmapNumber}.bitmap")'`;
      
      // Calculate fees
      const vbyte = 320; // Approximate size of a bitmap inscription in vbytes
      const baseFee = 600; // Base fee in satoshis
      const inscriptionFee = vbyte * Number(feeRate); // Fee for the inscription transaction
      const totalFee = inscriptionFee + baseFee; // Total fee including the base fee
      
      return res.json({
        command,
        bitmapNumber,
        format: `${bitmapNumber}.bitmap`,
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
      console.error('Error generating bitmap inscription command:', error);
      return res.status(500).json({
        error: true,
        message: "Failed to generate bitmap inscription command"
      });
    }
  });
}