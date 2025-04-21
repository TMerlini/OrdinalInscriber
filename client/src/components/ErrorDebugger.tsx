import React, { useState, useEffect } from 'react';

interface ErrorLog {
  type: string;
  timestamp: string;
  message?: string;
  stack?: string;
  source?: string;
  line?: number;
  column?: number;
  reason?: any;
}

declare global {
  interface Window {
    __ERROR_LOGS?: ErrorLog[];
    showErrorLogs?: () => string;
    toggleErrorOverlays?: (enable: boolean) => string;
  }
}

const ErrorDebugger: React.FC = () => {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // Check for logs every second
    const interval = setInterval(() => {
      if (window.__ERROR_LOGS) {
        setLogs([...window.__ERROR_LOGS]);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  const toggleErrorOverlays = () => {
    if (window.toggleErrorOverlays) {
      window.toggleErrorOverlays(!isEnabled);
      setIsEnabled(!isEnabled);
    }
  };
  
  const clearLogs = () => {
    if (window.__ERROR_LOGS) {
      window.__ERROR_LOGS = [];
      setLogs([]);
    }
  };
  
  if (!isVisible) {
    return (
      <button 
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 bg-red-500 text-white px-3 py-1 rounded shadow hover:bg-red-600"
      >
        {logs.length > 0 ? `Show Errors (${logs.length})` : 'Debug'}
      </button>
    );
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[80vh] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
      <div className="p-3 bg-gray-100 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700 flex justify-between items-center">
        <h3 className="text-md font-semibold">Error Debugger</h3>
        <div className="flex gap-2">
          <button 
            onClick={toggleErrorOverlays}
            className={`px-2 py-1 text-xs rounded ${isEnabled ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white`}
          >
            Overlays: {isEnabled ? 'ON' : 'OFF'}
          </button>
          <button 
            onClick={clearLogs}
            className="px-2 py-1 text-xs rounded bg-gray-500 hover:bg-gray-600 text-white"
          >
            Clear
          </button>
          <button 
            onClick={() => setIsVisible(false)}
            className="px-2 py-1 text-xs rounded bg-gray-500 hover:bg-gray-600 text-white"
          >
            Hide
          </button>
        </div>
      </div>
      
      <div className="overflow-y-auto max-h-[calc(80vh-48px)]">
        {logs.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            No errors logged yet
          </div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between mb-2">
                <span className={`text-xs font-mono px-2 py-1 rounded ${log.type === 'runtime_error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>
                  {log.type}
                </span>
                <span className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
              
              <div className="font-medium mb-1">{log.message || 'Unknown error'}</div>
              
              {log.source && (
                <div className="text-xs text-gray-500 mb-2">
                  {log.source}:{log.line}:{log.column}
                </div>
              )}
              
              {log.stack && (
                <details>
                  <summary className="text-sm cursor-pointer text-blue-500 hover:text-blue-700">Stack trace</summary>
                  <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 overflow-auto text-xs font-mono">
                    {log.stack}
                  </pre>
                </details>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ErrorDebugger; 