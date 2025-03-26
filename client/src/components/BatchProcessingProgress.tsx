import React from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BatchProcessingState, BatchProcessingItem } from "@/lib/types";
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";

interface BatchProcessingProgressProps {
  batchState: BatchProcessingState;
  onStartProcessing: () => void;
  onStopProcessing: () => void;
  onResetProcessing: () => void;
}

export default function BatchProcessingProgress({
  batchState,
  onStartProcessing,
  onStopProcessing,
  onResetProcessing
}: BatchProcessingProgressProps) {
  const totalItems = batchState.items.length;
  const progress = totalItems > 0 
    ? Math.round((batchState.completedCount + batchState.failedCount) / totalItems * 100) 
    : 0;
  
  const currentItem = batchState.items[batchState.currentItemIndex];
  
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">Batch Progress</h3>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {batchState.completedCount + batchState.failedCount} of {totalItems} processed
          </div>
        </div>
        
        <Progress value={progress} className="h-2" />
        
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span className="text-gray-600 dark:text-gray-400">
                {batchState.completedCount} completed
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <XCircle className="h-3 w-3 text-red-500" />
              <span className="text-gray-600 dark:text-gray-400">
                {batchState.failedCount} failed
              </span>
            </div>
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            {progress}%
          </div>
        </div>
      </div>
      
      {/* Controls */}
      <div className="flex space-x-3">
        {!batchState.inProgress && totalItems > 0 && (batchState.completedCount + batchState.failedCount < totalItems) && (
          <Button onClick={onStartProcessing} className="flex-1">
            {batchState.completedCount + batchState.failedCount > 0 ? 'Continue Processing' : 'Start Processing'}
          </Button>
        )}
        
        {batchState.inProgress && (
          <Button onClick={onStopProcessing} variant="outline" className="flex-1">
            Pause Processing
          </Button>
        )}
        
        {(batchState.completedCount + batchState.failedCount > 0) && (
          <Button onClick={onResetProcessing} variant="outline" className="flex-1">
            Reset
          </Button>
        )}
      </div>
      
      {/* Current Processing Item */}
      {batchState.inProgress && currentItem && (
        <Card className="p-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
            <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Processing: {currentItem.fileName}
            </h4>
          </div>
          
          {/* Current step progress information could be added here */}
        </Card>
      )}
      
      {/* Summary when complete */}
      {totalItems > 0 && (batchState.completedCount + batchState.failedCount === totalItems) && (
        <Card className="p-4 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
          <div className="flex items-center space-x-2">
            {batchState.failedCount === 0 ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : batchState.completedCount === 0 ? (
              <XCircle className="h-4 w-4 text-red-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            )}
            
            <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {batchState.failedCount === 0 
                ? 'All items processed successfully!'
                : batchState.completedCount === 0
                  ? 'All items failed to process.'
                  : `Processing complete with ${batchState.completedCount} successful and ${batchState.failedCount} failed items.`
              }
            </h4>
          </div>
        </Card>
      )}
    </div>
  );
}