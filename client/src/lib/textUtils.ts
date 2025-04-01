import { apiRequest } from './queryClient';

/**
 * Interface for the text file response returned from the API
 */
export interface TextFileResponse {
  success: boolean;
  fileName: string;
  path: string;
  size: number;
  formattedSize: string;
  contentType: string;
  created: Date;
}

/**
 * Save text content to the cache
 * @param content The text content to save
 * @param fileName The file name to use (should end with .txt, .md, etc.)
 * @param contentType Optional content type (defaults to text/plain)
 * @returns Promise with the text file information
 */
export async function saveTextToCache(
  content: string,
  fileName: string,
  contentType?: string
): Promise<TextFileResponse> {
  try {
    const response = await apiRequest('POST', '/api/cache/save-text', {
      content,
      fileName,
      contentType: contentType || (fileName.endsWith('.md') ? 'text/markdown' : 'text/plain'),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to save text content');
    }
    
    return data;
  } catch (error) {
    console.error('Error saving text to cache:', error);
    throw error;
  }
}

/**
 * Load text content from the cache
 * @param fileName The file name to load
 * @returns Promise with the text content
 */
export async function loadTextFromCache(fileName: string): Promise<string> {
  try {
    const response = await fetch(`/api/cache/file/${fileName}`);
    
    if (!response.ok) {
      throw new Error(`Failed to load text content: ${response.statusText}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error('Error loading text from cache:', error);
    throw error;
  }
}

/**
 * Delete text file from the cache
 * @param fileName The file name to delete
 * @returns Promise with success status
 */
export async function deleteTextFromCache(fileName: string): Promise<boolean> {
  try {
    const response = await apiRequest('DELETE', `/api/cache/file/${fileName}`);
    const data = await response.json();
    
    return data.success;
  } catch (error) {
    console.error('Error deleting text from cache:', error);
    throw error;
  }
}