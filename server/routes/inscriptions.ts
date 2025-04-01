/**
 * Inscription Status API Routes
 * Handles tracking and updating status of inscription transactions
 */
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { execCommand } from '../cmd-executor';

// Simple in-memory storage for inscriptions (could be replaced with database storage)
interface InscriptionStatusItem {
  id: string;
  fileName: string;
  fileType: string;
  status: 'pending' | 'success' | 'failed';
  txid?: string;
  error?: string;
  timestamp: Date;
  ordinalId?: string;
  satoshiType?: string;
  command?: string;
}

// In-memory store for inscription status
const inscriptionStore: Record<string, InscriptionStatusItem> = {};

// Create router
const router = Router();

/**
 * Get all inscription status items
 * GET /api/inscriptions
 */
router.get('/', (req, res) => {
  // Convert object to array and sort by timestamp (newest first)
  const items = Object.values(inscriptionStore).sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  res.json(items);
});

/**
 * Get a specific inscription status
 * GET /api/inscriptions/:id
 */
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  if (!inscriptionStore[id]) {
    return res.status(404).json({ error: 'Inscription not found' });
  }
  
  res.json(inscriptionStore[id]);
});

/**
 * Create a new inscription status entry
 * POST /api/inscriptions
 * Body:
 *   fileName: string
 *   fileType: string
 *   satoshiType?: string
 *   command?: string
 */
router.post('/', (req, res) => {
  const { fileName, fileType, satoshiType, command } = req.body;
  
  if (!fileName || !fileType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const id = uuidv4();
  const inscription: InscriptionStatusItem = {
    id,
    fileName,
    fileType,
    status: 'pending',
    timestamp: new Date(),
  };
  
  if (satoshiType) {
    inscription.satoshiType = satoshiType;
  }
  
  if (command) {
    inscription.command = command;
  }
  
  inscriptionStore[id] = inscription;
  
  res.status(201).json(inscription);
});

/**
 * Update an inscription status
 * PATCH /api/inscriptions/:id
 * Body: Partial<InscriptionStatusItem>
 */
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  if (!inscriptionStore[id]) {
    return res.status(404).json({ error: 'Inscription not found' });
  }
  
  // Prevent changing immutable fields
  const { fileName, fileType, id: _id, ...allowedUpdates } = updates;
  
  inscriptionStore[id] = {
    ...inscriptionStore[id],
    ...allowedUpdates
  };
  
  res.json(inscriptionStore[id]);
});

/**
 * Delete an inscription status
 * DELETE /api/inscriptions/:id
 */
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  if (!inscriptionStore[id]) {
    return res.status(404).json({ error: 'Inscription not found' });
  }
  
  delete inscriptionStore[id];
  
  res.status(204).send();
});

/**
 * Clear all inscription statuses
 * DELETE /api/inscriptions
 */
router.delete('/', (req, res) => {
  // Clear all entries
  Object.keys(inscriptionStore).forEach(key => {
    delete inscriptionStore[key];
  });
  
  res.status(204).send();
});

/**
 * Check inscription TXID status
 * POST /api/inscriptions/:id/check
 */
router.post('/:id/check', async (req, res) => {
  const { id } = req.params;
  
  if (!inscriptionStore[id]) {
    return res.status(404).json({ error: 'Inscription not found' });
  }
  
  const inscription = inscriptionStore[id];
  
  // If the inscription is already successful or has no txid/command, just return current status
  if (inscription.status === 'success' || (!inscription.txid && !inscription.command)) {
    return res.json(inscription);
  }
  
  try {
    let result;
    
    if (inscription.txid) {
      // Check transaction status using Bitcoin CLI
      result = await execCommand(`docker exec bitcoin-node bitcoin-cli gettransaction ${inscription.txid}`);
    } else if (inscription.command) {
      // Execute the original command again to check status
      result = await execCommand(inscription.command);
    } else {
      return res.status(400).json({ error: 'No TXID or command to check' });
    }
    
    if (!result.error) {
      // Look for successful inscription output
      const output = result.output;
      
      // Check if this is the txid output
      if (output.includes('"confirmations":')) {
        const confirmationsMatch = output.match(/"confirmations":\s*(\d+)/);
        if (confirmationsMatch && parseInt(confirmationsMatch[1]) > 0) {
          // Transaction is confirmed
          inscription.status = 'success';
          
          // Try to extract ordinal ID if available
          const inscriptionIdMatch = output.match(/inscription\s+([a-f0-9]+i\d+)/i);
          if (inscriptionIdMatch) {
            inscription.ordinalId = inscriptionIdMatch[1];
          }
        }
      } 
      // Check if this is a command output with txid
      else if (output.match(/[a-f0-9]{64}/)) {
        // Extract TXID pattern (64 hex chars)
        const txidMatch = output.match(/([a-f0-9]{64})/);
        if (txidMatch) {
          inscription.txid = txidMatch[1];
          inscription.status = 'pending'; // Set to pending if we found a txid
        }
        
        // Check for inscription ID
        const inscriptionIdMatch = output.match(/inscription\s+([a-f0-9]+i\d+)/i);
        if (inscriptionIdMatch) {
          inscription.ordinalId = inscriptionIdMatch[1];
          inscription.status = 'success'; // If we have an inscription ID, it's successful
        }
      }
      
      // Success message found
      if (output.includes('successful') || output.includes('success')) {
        inscription.status = 'success';
      }
      
      inscriptionStore[id] = inscription;
    } else {
      // Check if this is a legitimate error or just a pending transaction
      if (result.output.includes('not found') || result.output.includes('error')) {
        // Only set to failed if there's a specific error
        inscription.status = 'failed';
        inscription.error = result.output;
        inscriptionStore[id] = inscription;
      }
    }
    
    res.json(inscription);
  } catch (error) {
    console.error('Error checking inscription status:', error);
    res.status(500).json({ error: 'Failed to check inscription status' });
  }
});

/**
 * Process an inscription command
 * POST /api/inscriptions/:id/process
 * Body:
 *   command: string
 */
router.post('/:id/process', async (req, res) => {
  const { id } = req.params;
  const { command } = req.body;
  
  if (!inscriptionStore[id]) {
    return res.status(404).json({ error: 'Inscription not found' });
  }
  
  if (!command) {
    return res.status(400).json({ error: 'Command is required' });
  }
  
  const inscription = inscriptionStore[id];
  
  try {
    // Execute the inscription command
    const result = await execCommand(command);
    
    if (!result.error) {
      // Update the inscription with the result
      inscription.command = command;
      
      // Check for a TXID in the output (64 hex chars)
      const txidMatch = result.output.match(/([a-f0-9]{64})/);
      if (txidMatch) {
        inscription.txid = txidMatch[1];
        inscription.status = 'pending';
      }
      
      // Check for inscription ID
      const inscriptionIdMatch = result.output.match(/inscription\s+([a-f0-9]+i\d+)/i);
      if (inscriptionIdMatch) {
        inscription.ordinalId = inscriptionIdMatch[1];
        inscription.status = 'success';
      }
      
      // If we got a success message
      if (result.output.includes('successful') || result.output.includes('success')) {
        inscription.status = 'success';
      }
    } else {
      // Command failed
      inscription.status = 'failed';
      inscription.error = result.output;
    }
    
    inscriptionStore[id] = inscription;
    
    res.json(inscription);
  } catch (error) {
    console.error('Error processing inscription:', error);
    
    // Update the inscription status to failed
    inscription.status = 'failed';
    inscription.error = error instanceof Error ? error.message : String(error);
    inscriptionStore[id] = inscription;
    
    res.status(500).json({ error: 'Failed to process inscription', inscription });
  }
});

export default router;