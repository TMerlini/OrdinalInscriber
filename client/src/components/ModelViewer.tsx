import React from 'react';

interface ModelViewerProps {
  url: string;
  width?: number;
  height?: number;
}

export default function ModelViewer({ url, width = 400, height = 300 }: ModelViewerProps) {
  return (
    <div style={{ width, height, margin: '0 auto', position: 'relative' }}>
      <div 
        style={{ 
          width: '100%', 
          height: '100%', 
          backgroundColor: '#f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '1rem'
        }}
      >
        <div className="text-lg font-medium mb-2">3D Model Preview</div>
        <div className="text-sm text-muted-foreground text-center">
          {url.split('/').pop()}
        </div>
        <div className="mt-4 text-xs text-muted-foreground text-center">
          (Interactive 3D preview available after inscription)
        </div>
      </div>
    </div>
  );
}