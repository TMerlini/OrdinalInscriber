import React from 'react';
import { FileCode } from 'lucide-react';

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
    }
    
    return `${size} KB`;
  };
  
  return (
    <div 
      className="rounded-lg border border-orange-100 dark:border-navy-700 overflow-hidden"
      style={{ 
        width, 
        height, 
        margin: '0 auto', 
        position: 'relative',
      }}
    >
      <div 
        className="flex flex-col items-center justify-center h-full p-4 text-center bg-white dark:bg-navy-800"
      >
        <FileCode className="w-12 h-12 mb-3 text-orange-600 dark:text-orange-400" />
        
        <div className="text-base font-medium mb-1 text-gray-800 dark:text-gray-200">
          {getFileType()} Model
        </div>
        
        <div className="text-xs text-gray-600 dark:text-gray-400 mb-3 overflow-hidden text-ellipsis w-full">
          {getFileName(url)}
        </div>
        
        <div className="mb-2 w-full max-w-[180px] rounded-md bg-white dark:bg-navy-900 p-2 border border-orange-100 dark:border-navy-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <p className="mb-1"><span className="font-semibold">Size:</span> {getFileSize()}</p>
            <p><span className="font-semibold">Format:</span> {getFileType()}</p>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 dark:text-gray-400 max-w-[200px]">
          File validated. 3D preview after inscription.
        </div>
      </div>
    </div>
  );
}