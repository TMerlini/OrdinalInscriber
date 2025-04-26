import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Info, HelpCircle, CheckCircle, XCircle } from "lucide-react";

interface TimeoutHelpDialogProps {
  trigger?: React.ReactNode;
}

export default function TimeoutHelpDialog({ trigger }: TimeoutHelpDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300">
            <HelpCircle className="h-4 w-4 mr-1" />
            Help with Timeouts
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center text-orange-700 dark:text-orange-300">
            <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
            Resolving Timeout Issues
          </DialogTitle>
          <DialogDescription>
            Tips for troubleshooting and resolving timeout issues during file inscription
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="p-4 border border-orange-100 dark:border-orange-800 rounded-md bg-orange-50 dark:bg-navy-900">
            <h3 className="text-sm font-semibold mb-2 text-orange-800 dark:text-orange-400">Common Causes of Timeouts</h3>
            <ul className="list-disc pl-5 text-sm space-y-1 text-gray-700 dark:text-gray-300">
              <li>File size is too large (over 1MB)</li>
              <li>Container is busy processing other inscriptions</li>
              <li>System resources (CPU/Memory) are constrained</li>
              <li>Network connectivity issues between the app and Docker</li>
              <li>Docker container health issues</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-orange-800 dark:text-orange-400">Recommended Solutions:</h3>
            
            <div className="flex items-start space-x-2 text-sm">
              <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200">Enable Image Optimization</p>
                <p className="text-gray-600 dark:text-gray-400">Always enable image optimization for files larger than 100KB. This can reduce file size by up to 80% while maintaining quality.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2 text-sm">
              <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200">Reduce File Size Manually</p>
                <p className="text-gray-600 dark:text-gray-400">For large images, consider using an external tool to optimize them before uploading. Aim for files under 500KB for best results.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2 text-sm">
              <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200">Process Files Individually</p>
                <p className="text-gray-600 dark:text-gray-400">If batch processing causes timeouts, try inscribing files one at a time instead.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2 text-sm">
              <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200">Check Container Status</p>
                <p className="text-gray-600 dark:text-gray-400">Use the Container Status Check feature to verify that your Ordinals container is healthy and responsive.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2 text-sm">
              <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200">Restart the Container</p>
                <p className="text-gray-600 dark:text-gray-400">If problems persist, try restarting your Ordinals container:</p>
                <code className="mt-1 block p-2 rounded bg-gray-100 dark:bg-navy-800 text-xs overflow-x-auto">
                  docker restart ord_server
                </code>
              </div>
            </div>
          </div>
          
          <div className="p-4 border border-amber-100 dark:border-amber-900 rounded-md bg-amber-50 dark:bg-amber-950">
            <div className="flex items-start">
              <Info className="h-5 w-5 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5 mr-2" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-300">Advanced Troubleshooting</p>
                <p className="text-amber-700 dark:text-amber-400 mt-1">
                  For persistent issues, check Docker logs with: 
                  <code className="ml-1 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900 font-mono text-xs">
                    docker logs ord_server
                  </code>
                </p>
                <p className="text-amber-700 dark:text-amber-400 mt-1">
                  You can also try manually copying the file to the container and inscribing it directly from the terminal.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 