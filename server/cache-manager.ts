import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Cache info interface
export interface CacheInfo {
  totalSize: number;
  fileCount: number;
  files: Array<{
    name: string;
    size: number;
    created: Date;
    path: string;
  }>;
}

// Default cache limit of 5GB
const DEFAULT_CACHE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024;
let cacheLimit = DEFAULT_CACHE_LIMIT_BYTES;

/**
 * Set the cache size limit in bytes
 */
export function setCacheLimit(limitBytes: number): void {
  cacheLimit = limitBytes;
}

/**
 * Get the current cache info
 */
export async function getCacheInfo(): Promise<CacheInfo> {
  const tempDir = os.tmpdir();
  const files = await fs.readdir(tempDir);
  
  const cacheInfo: CacheInfo = {
    totalSize: 0,
    fileCount: 0,
    files: []
  };
  
  // We'll track image, 3D model files, and text/markdown files that our app would have created
  const trackedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.glb', '.gltf', '.txt', '.md', '.text', '.markdown'];
  
  for (const file of files) {
    // Only consider files with tracked extensions
    if (!trackedExtensions.some((ext: string) => file.toLowerCase().endsWith(ext))) {
      continue;
    }
    
    const filePath = path.join(tempDir, file);
    
    try {
      const stats = await fs.stat(filePath);
      
      // Skip directories
      if (stats.isDirectory()) {
        continue;
      }
      
      // Add file info
      cacheInfo.files.push({
        name: file,
        size: stats.size,
        created: new Date(stats.birthtime),
        path: filePath
      });
      
      cacheInfo.totalSize += stats.size;
      cacheInfo.fileCount++;
    } catch (error) {
      console.error(`Error reading file stats for ${filePath}:`, error);
    }
  }
  
  // Sort files by creation date (oldest first)
  cacheInfo.files.sort((a, b) => a.created.getTime() - b.created.getTime());
  
  return cacheInfo;
}

/**
 * Clean the cache if it exceeds the limit
 */
export async function cleanCacheIfNeeded(): Promise<boolean> {
  const cacheInfo = await getCacheInfo();
  
  // Check if we need to clean up
  if (cacheInfo.totalSize <= cacheLimit) {
    return false; // No cleanup needed
  }
  
  // Remove oldest files until we're under the limit
  for (const file of cacheInfo.files) {
    try {
      await fs.unlink(file.path);
      cacheInfo.totalSize -= file.size;
      
      // Stop when we're under the limit
      if (cacheInfo.totalSize <= cacheLimit) {
        break;
      }
    } catch (error) {
      console.error(`Error deleting file ${file.path}:`, error);
    }
  }
  
  return true; // Cleanup was performed
}

/**
 * Delete all cached files (images, 3D models, and text/markdown files)
 */
export async function clearAllCachedFiles(): Promise<number> {
  const cacheInfo = await getCacheInfo();
  let deletedCount = 0;
  
  for (const file of cacheInfo.files) {
    try {
      await fs.unlink(file.path);
      deletedCount++;
    } catch (error) {
      console.error(`Error deleting file ${file.path}:`, error);
    }
  }
  
  return deletedCount;
}

// Check and clean cache when the module is first loaded
cleanCacheIfNeeded().catch(err => {
  console.error('Error during initial cache cleanup:', err);
});