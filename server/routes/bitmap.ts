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
      
      return res.json({
        command,
        bitmapNumber,
        format: `${bitmapNumber}.bitmap`
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