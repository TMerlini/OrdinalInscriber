
/**
 * Recursive Inscription API Routes
 * Handles creation and management of recursive inscriptions
 */
import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { execCommand } from '../cmd-executor';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * Create a recursive inscription
 * POST /api/inscriptions/recursive
 * Body:
 *   primaryInscriptionId: string - The main inscription ID for reference
 *   referenceInscriptions: string[] - Array of inscription IDs to reference
 *   html: string - HTML content with inscription references
 *   feeRate?: number - Optional custom fee rate
 */
router.post('/', async (req, res) => {
  try {
    const { primaryInscriptionId, referenceInscriptions, html, feeRate = 5 } = req.body;
    
    if (!primaryInscriptionId || !referenceInscriptions || !html) {
      return res.status(400).json({ 
        error: 'Missing required fields: primaryInscriptionId, referenceInscriptions, html' 
      });
    }
    
    // Validate inscriptions exist
    // In a production environment, you'd check these against the blockchain
    
    // Generate a unique filename for the HTML file
    const fileName = `recursive_${uuidv4()}.html`;
    const filePath = path.join(process.cwd(), 'cache', fileName);
    
    // Write the HTML to a file
    await fs.writeFile(filePath, html, 'utf8');
    
    // Get the container name from environment or config
    const containerName = process.env.CONTAINER_NAME || 'ordinals_ord_1';
    
    // Get the container path
    const containerPath = process.env.CONTAINER_PATH || '/home/ord/data/';
    
    // Generate the path inside the container
    const containerFilePath = `${containerPath}${fileName}`;
    
    // Get the local IP for file transfer
    const localIp = process.env.LOCAL_IP || '0.0.0.0';
    
    // Create a port for temporary file serving
    const port = 3501;
    
    // Start a temporary server to serve the file
    // In production, you'd use the existing file serving mechanism in your app
    
    // Command to transfer file to container
    const transferCommand = `docker exec -it ${containerName} sh -c "curl -o ${containerFilePath} http://${localIp}:${port}/${fileName}"`;
    
    // Execute the file transfer command
    const transferResult = await execCommand(transferCommand);
    
    if (transferResult.error) {
      throw new Error(`Failed to transfer file: ${transferResult.output}`);
    }
    
    // Build the inscription command
    const inscribeCommand = `docker exec -it ${containerName} ord wallet inscribe --fee-rate ${feeRate} --file ${containerFilePath} --reference ${primaryInscriptionId}`;
    
    // Execute the inscription command
    const inscriptionResult = await execCommand(inscribeCommand);
    
    if (inscriptionResult.error) {
      throw new Error(`Failed to create inscription: ${inscriptionResult.output}`);
    }
    
    // Parse the result to extract the inscription ID and transaction ID
    const output = inscriptionResult.output;
    const inscriptionIdMatch = output.match(/inscription\s+([a-f0-9]+i\d+)/i);
    const txidMatch = output.match(/([a-f0-9]{64})/);
    
    const result = {
      success: true,
      inscriptionId: inscriptionIdMatch ? inscriptionIdMatch[1] : null,
      txid: txidMatch ? txidMatch[1] : null,
      message: 'Recursive inscription created successfully',
      references: referenceInscriptions,
      primaryInscription: primaryInscriptionId
    };
    
    // Clean up the temporary file
    await fs.unlink(filePath).catch(() => {});
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating recursive inscription:', error);
    res.status(500).json({ 
      error: 'Failed to create recursive inscription',
      message: error instanceof Error ? error.message : String(error) 
    });
  }
});

/**
 * Get recursive inscriptions for a wallet
 * GET /api/inscriptions/recursive/owned
 */
router.get('/owned', async (req, res) => {
  try {
    // Implement logic to query recursive inscriptions owned by the user
    // This would require integration with the Ordinals wallet to fetch inscriptions
    // and determine which ones are recursive
    
    // For now, return mock data for demonstration
    const mockRecursiveInscriptions = [
      {
        id: '1',
        inscriptionId: '38cb7a31i0',
        name: 'Recursive Example 1',
        description: 'A recursive inscription that references other inscriptions',
        isReference: false,
        references: ['abcd1234i0', 'efgh5678i0']
      },
      {
        id: '2',
        inscriptionId: '94e6b217i0',
        name: 'My Collection',
        description: 'A collection of my favorite inscriptions',
        isReference: false,
        references: ['1234abcdi0', '5678efghi0', '9101jkli0']
      }
    ];
    
    res.json(mockRecursiveInscriptions);
  } catch (error) {
    console.error('Error fetching recursive inscriptions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch recursive inscriptions',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get details of a specific recursive inscription
 * GET /api/inscriptions/recursive/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // In production, you would query the Ordinals node for this inscription
    // For now, return mock data
    
    const mockInscription = {
      id: '1',
      inscriptionId: id,
      name: 'Recursive Example',
      description: 'A recursive inscription that references other inscriptions',
      isReference: false,
      references: ['abcd1234i0', 'efgh5678i0'],
      html: `<!DOCTYPE html><html><body><div><inscription id="abcd1234i0"></inscription><inscription id="efgh5678i0"></inscription></div></body></html>`
    };
    
    res.json(mockInscription);
  } catch (error) {
    console.error('Error fetching recursive inscription:', error);
    res.status(500).json({ 
      error: 'Failed to fetch recursive inscription',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
