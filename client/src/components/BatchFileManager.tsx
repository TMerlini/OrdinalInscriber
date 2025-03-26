import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, CheckCircle, AlertTriangle, X, ArrowRight } from "lucide-react";
import { UploadedFile, BatchProcessingItem } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

interface BatchFileManagerProps {
  files: UploadedFile[];
  processingItems?: BatchProcessingItem[];
  onRemoveFile: (fileId: string) => void;
  onToggleFileSelection: (fileId: string, selected: boolean) => void;
  onRemoveAllFiles: () => void;
  onToggleOptimization?: (fileId: string, optimize: boolean) => void;
}

export default function BatchFileManager({
  files,
  processingItems = [],
  onRemoveFile,
  onToggleFileSelection,
  onRemoveAllFiles,
  onToggleOptimization
}: BatchFileManagerProps) {
  // Helper function to find processing item for a file
  const getProcessingItem = (fileId: string): BatchProcessingItem | undefined => {
    return processingItems.find(item => item.fileId === fileId);
  };

  // Get status badge based on processing status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-gray-500 border-gray-300">Pending</Badge>;
      case 'processing':
        return <Badge variant="outline" className="text-blue-500 border-blue-300">Processing</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-green-500 border-green-300">Completed</Badge>;
      case 'failed':
        return <Badge variant="outline" className="text-red-500 border-red-300">Failed</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {files.length} file{files.length !== 1 ? 's' : ''} selected for batch processing
        </h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onRemoveAllFiles}
          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Clear All
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto p-2">
        {files.map((file) => {
          const processingItem = getProcessingItem(file.id || '');
          const isProcessing = processingItem && processingItem.status === 'processing';
          const isComplete = processingItem && processingItem.status === 'completed';
          const isFailed = processingItem && processingItem.status === 'failed';
          
          return (
            <Card key={file.id} className={`overflow-hidden border ${isProcessing ? 'border-blue-300 dark:border-blue-700' : isComplete ? 'border-green-300 dark:border-green-700' : isFailed ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'} ${!file.selected ? 'opacity-60' : ''}`}>
              <CardContent className="p-0">
                <div className="relative">
                  {/* File Preview */}
                  <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                    {file.fileType === 'image' ? (
                      <img 
                        src={file.preview} 
                        alt={file.file.name} 
                        className="object-contain h-full w-full"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <div className="w-16 h-16 mx-auto mb-2 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                          <span className="text-xs font-mono">3D</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{file.file.name}</p>
                      </div>
                    )}
                    
                    {/* File status overlay for processing states */}
                    {processingItem && (
                      <div className="absolute top-2 right-2">
                        {getStatusBadge(processingItem.status)}
                      </div>
                    )}
                    
                    {/* Controls overlay */}
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/40 dark:hover:bg-black/60 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                      <div className="flex gap-2">
                        {!isProcessing && !isComplete && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="bg-white hover:bg-gray-100 text-gray-800"
                              onClick={() => onRemoveFile(file.id || '')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* File Info Area */}
                  <div className="p-3">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id={`select-${file.id}`}
                          checked={file.selected}
                          onCheckedChange={(checked) => 
                            onToggleFileSelection(file.id || '', checked === true)
                          }
                          disabled={isProcessing || isComplete}
                        />
                        <label 
                          htmlFor={`select-${file.id}`}
                          className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate max-w-[120px] cursor-pointer"
                        >
                          {file.file.name}
                        </label>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {(file.file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    
                    {/* Size warning */}
                    {file.sizeWarning && (
                      <div className="flex items-start text-xs mt-1">
                        {file.sizeWarning.type === 'danger' ? (
                          <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 mr-1 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 mr-1 flex-shrink-0" />
                        )}
                        <p className={`text-xs ${file.sizeWarning.type === 'danger' ? 'text-red-500' : 'text-amber-500'}`}>
                          {file.sizeWarning.message}
                        </p>
                      </div>
                    )}
                    
                    {/* Optimization toggle */}
                    {file.optimizationAvailable && onToggleOptimization && (
                      <div className="flex items-center mt-2">
                        <Checkbox 
                          id={`optimize-${file.id}`}
                          checked={file.optimizationAvailable}
                          onCheckedChange={(checked) => 
                            onToggleOptimization(file.id || '', checked === true)
                          }
                          disabled={isProcessing || isComplete}
                        />
                        <label 
                          htmlFor={`optimize-${file.id}`}
                          className="text-xs ml-2 text-blue-600 dark:text-blue-400 cursor-pointer"
                        >
                          Optimize to ~46KB WebP
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {files.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No files selected for batch processing</p>
        </div>
      )}
    </div>
  );
}