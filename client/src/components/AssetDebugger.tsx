import React from 'react';
import logoImageSrc from '../assets/logo.png';

/**
 * Simple component to test image loading
 */
export default function AssetDebugger() {
  return (
    <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg my-4">
      <h3 className="font-medium text-orange-800 dark:text-orange-400 mb-3">Asset Loading Test</h3>
      
      <div className="flex items-center space-x-4">
        <div>
          <p className="text-xs mb-1">Import:</p>
          <img 
            src={logoImageSrc} 
            alt="Logo via Import" 
            className="w-8 h-8 border border-slate-300 dark:border-slate-700" 
          />
        </div>
        <div>
          <p className="text-xs mb-1">Public:</p>
          <img 
            src="/logo.png" 
            alt="Logo Public Path" 
            className="w-8 h-8 border border-slate-300 dark:border-slate-700" 
          />
        </div>
      </div>
    </div>
  );
}