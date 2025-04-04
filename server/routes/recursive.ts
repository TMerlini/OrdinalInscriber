/**
 * Recursive Inscription API Routes
 * Implements functionality for creating inscriptions that reference other inscriptions
 */

import { Request, Response } from "express";
import axios from "axios";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { getOrdApiUrl } from "../routes";

// Content type mapping
const CONTENT_TYPE_MAP: Record<string, string> = {
  "html": "text/html",
  "svg": "image/svg+xml",
  "css": "text/css",
  "custom": "" // Will be specified by the user
};

/**
 * Helper function to get the content type based on recursion type
 */
function getContentType(recursionType: string, customContentType?: string): string {
  if (recursionType === "custom" && customContentType) {
    return customContentType;
  }
  return CONTENT_TYPE_MAP[recursionType] || "text/plain";
}

/**
 * Helper function to estimate processing time based on fee rate
 */
function getFeeProcessingTime(feeRate: number): string {
  if (feeRate >= 20) return "fast (10-20 minutes)";
  if (feeRate >= 10) return "normal (1-2 hours)";
  if (feeRate >= 5) return "economical (2-6 hours)";
  return "very slow (6+ hours)";
}

/**
 * Endpoints to be registered in the routes.ts file
 */
export function registerRecursiveRoutes(app: any) {
  /**
   * Preview an inscription by ID
   * GET /api/inscriptions/preview/:id
   */
  app.get('/api/inscriptions/preview/:id', async (req: Request, res: Response) => {
    const inscriptionId = req.params.id;
    
    try {
      // This could be using the ord API to fetch inscription data
      // For now, we'll use a direct approach to the content
      const ordApiUrl = getOrdApiUrl();
      const contentUrl = `${ordApiUrl}/content/${inscriptionId}`;
      const infoUrl = `${ordApiUrl}/inscription/${inscriptionId}`;

      // Try to get inscription info to check if it exists
      try {
        await axios.get(infoUrl);
      } catch (error) {
        return res.status(404).send(`Inscription with ID ${inscriptionId} not found`);
      }

      // Return the content URL for the client to display
      return res.json({ 
        previewUrl: contentUrl,
        inscriptionId
      });
    } catch (error) {
      console.error('Error fetching inscription preview:', error);
      return res.status(500).send(`Error fetching inscription preview: ${error}`);
    }
  });

  /**
   * Generate recursive inscription command
   * POST /api/recursive/generate-command
   * Body:
   *   parentInscriptionId: string
   *   recursionType: 'html' | 'svg' | 'css' | 'custom'
   *   customContentType?: string
   *   content: string
   *   description?: string
   *   destination?: string
   *   feeRate: string
   *   addParentMetadata: boolean
   */
  app.post('/api/recursive/generate-command', async (req: Request, res: Response) => {
    try {
      const {
        parentInscriptionId,
        recursionType,
        customContentType,
        content,
        description,
        destination,
        feeRate,
        addParentMetadata
      } = req.body;

      // Validate required fields
      if (!parentInscriptionId || !recursionType || !content || !feeRate) {
        return res.status(400).send('Missing required fields');
      }

      // Get the content type based on recursion type
      const contentType = getContentType(recursionType, customContentType);
      
      // Create a temporary file for the content
      const tempDir = path.join(process.cwd(), 'temp');
      
      // Ensure the directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Create a unique filename with appropriate extension
      const fileExtension = contentType.split('/')[1] || 'txt';
      const filename = `recursive_${uuidv4()}.${fileExtension}`;
      const filePath = path.join(tempDir, filename);
      
      // Write the content to the file
      fs.writeFileSync(filePath, content);
      
      // Build the command
      const feeRateValue = parseInt(feeRate, 10);
      const processingTime = getFeeProcessingTime(feeRateValue);
      
      let command = `ord wallet inscribe`;
      
      // Add content type if not default
      if (contentType) {
        command += ` --content-type "${contentType}"`;
      }
      
      // Add fee rate
      command += ` --fee-rate ${feeRateValue}`;
      
      // Add destination if provided
      if (destination) {
        command += ` --destination ${destination}`;
      }
      
      // Add file path
      command += ` "${filePath}"`;
      
      // Add metadata if desired
      if (addParentMetadata) {
        const metadata = {
          name: description || "Recursive Inscription",
          description: `References inscription ${parentInscriptionId}`,
          parent: parentInscriptionId
        };
        
        const metadataFilename = `metadata_${uuidv4()}.json`;
        const metadataPath = path.join(tempDir, metadataFilename);
        
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
        
        command += ` --json-metadata "${metadataPath}"`;
      }
      
      return res.json({
        command,
        contentType,
        feeRate: feeRateValue,
        processingTime,
        parentInscriptionId
      });
      
    } catch (error) {
      console.error('Error generating recursive inscription command:', error);
      return res.status(500).send(`Error generating command: ${error}`);
    }
  });
}