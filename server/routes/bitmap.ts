/**
 * Bitmap Inscription API Routes
 * Implements bitmap number validation and inscription generation
 * Based on the bitmap.land implementation guide
 */
import { Request, Response } from 'express';
import axios from 'axios';
import { execCommand } from '../cmd-executor';
import { getOrdApiUrl } from '../routes';

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
        const ordApiUrl = getOrdApiUrl();
        const blockResponse = await axios.get(`${ordApiUrl}/blocks/latest`);
        latestBlock = blockResponse.data.height;
      } catch (err) {
        // If we can't get the latest block, provide fallback message
        console.error("Error fetching latest block:", err);
        latestBlock = null;
      }
      
      // Check if bitmap is already inscribed
      // This would typically query the Ordinals node or a bitmap indexer
      // For now, we'll just return a simulated response
      const isAvailable = true; // In a real implementation, this would be determined by checking against a bitmap index
      
      return res.json({
        bitmapNumber,
        isAvailable,
        latestBlock,
        format: `${bitmapNumber}.bitmap`
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