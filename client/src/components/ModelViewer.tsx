import React from 'react';
import { Box, FileCode } from 'lucide-react';

interface ModelViewerProps {
  url: string;
  width?: number;
  height?: number;
}

export default function ModelViewer({ url, width = 400, height = 300 }: ModelViewerProps) {
  // Extract filename from the url or data url
  const getFileName = (url: string) => {
    if (url.startsWith('data:')) {
      // For data URLs, extract the filename from the end if available
      const match = url.match(/filename=(.*?)(?:;|$)/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
      return 'Model file';
    }
    
    return url.split('/').pop() || 'Model file';
  };
  
  // Get the file extension
  const getFileType = () => {
    if (!url) return '';
    
    const fileName = getFileName(url).toLowerCase();
    if (fileName.endsWith('.glb')) return 'GLB';
    if (fileName.endsWith('.gltf')) return 'GLTF';
    
    // For data URLs, try to determine from the mimetype
    if (url.startsWith('data:')) {
      if (url.includes('model/gltf-binary')) return 'GLB';
      if (url.includes('model/gltf+json')) return 'GLTF';
    }
    
    return '3D Model';
  };
  
  // Calculate file size in KB
  const getFileSize = () => {
    if (!url) return 'Unknown';
    
    let size = 0;
    if (url.startsWith('data:')) {
      // Approximate size of data URL in KB
      const base64 = url.split(',')[1];
      if (base64) {
        size = Math.round((base64.length * 3) / 4 / 1024);
      } else {
        size = Math.round(url.length / 1024);
      }
    } else {
      size = Math.round(url.length / 1024);
    }
    
    return `${size} KB`;
  };
  
  return (
    <div 
      style={{ 
        width, 
        height, 
        margin: '0 auto', 
        position: 'relative',
        border: '1px solid',
        borderColor: 'rgba(201, 159, 116, 0.3)',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: 'rgba(30, 41, 59, 0.05)'
      }}
    >
      <div 
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          textAlign: 'center'
        }}
      >
        <FileCode className="w-16 h-16 mb-4 text-orange-600 dark:text-orange-400" />
        
        <div className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">
          {getFileType()} Model Preview
        </div>
        
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {getFileName(url)}
        </div>
        
        <div className="mt-6 rounded-md bg-white dark:bg-navy-900 p-3 border border-orange-100 dark:border-navy-700 max-w-xs">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <p className="mb-1"><span className="font-semibold">Size:</span> {getFileSize()}</p>
            <p><span className="font-semibold">Format:</span> {getFileType()}</p>
          </div>
        </div>
        
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          File validated successfully. Interactive 3D preview will be available after inscription.
        </div>
      </div>
    </div>
  );
}