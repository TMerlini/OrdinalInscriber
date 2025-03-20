import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Trash2, RefreshCw, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CacheInfo {
  totalSize: number;
  formattedSize: string;
  formattedLimit: string;
  fileCount: number;
  percentUsed: number;
  files: {
    name: string;
    size: number;
    formattedSize: string;
    created: string;
  }[];
}

export default function CacheManager() {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch cache info
  const { data: cacheInfo, isLoading, refetch } = useQuery<CacheInfo>({
    queryKey: ['/api/cache/info'],
    refetchOnWindowFocus: false
  });

  // Clear cache mutation
  const clearCache = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/cache/clear');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Cache Cleared",
        description: data.message || `Successfully cleared the cache.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/cache/info'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to clear cache: ${error}`,
        variant: "destructive",
      });
    }
  });

  const handleClearCache = () => {
    if (window.confirm("Are you sure you want to clear all cached images?")) {
      clearCache.mutate();
    }
  };

  // For progress bar color
  const getProgressColor = (percent: number) => {
    if (percent < 50) return "bg-green-500";
    if (percent < 80) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (isLoading || !cacheInfo) {
    return (
      <div className="p-6 border-t border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <Database className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-medium">Cache Management</h2>
        </div>
        <div className="text-sm text-gray-500">Loading cache information...</div>
      </div>
    );
  }

  return (
    <div className="p-6 border-t border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-medium">Cache Management</h2>
        </div>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            size="sm" 
            variant="destructive" 
            onClick={handleClearCache}
            disabled={clearCache.isPending || cacheInfo?.fileCount === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Cache
          </Button>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-md mb-4">
        <div className="flex flex-col sm:flex-row justify-between mb-2">
          <div className="text-sm text-gray-700">
            <span className="font-medium">Storage Used:</span> {cacheInfo?.formattedSize} of {cacheInfo?.formattedLimit}
          </div>
          <div className="text-sm text-gray-700">
            <span className="font-medium">Files:</span> {cacheInfo?.fileCount || 0}
          </div>
        </div>
        
        <Progress 
          value={cacheInfo?.percentUsed || 0} 
          className={`h-2 ${getProgressColor(cacheInfo?.percentUsed || 0)}`}
        />
        
        <div className="text-xs text-gray-500 mt-1">
          {cacheInfo?.percentUsed || 0}% of 5GB limit used
        </div>
      </div>

      {cacheInfo?.fileCount && cacheInfo.fileCount > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700">Cached Files</h3>
            <button 
              className="text-xs text-blue-600 hover:text-blue-800" 
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Hide Details' : 'Show Details'}
            </button>
          </div>

          {isExpanded && (
            <div className="text-xs border rounded-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cacheInfo.files && cacheInfo.files.map((file: {
                    name: string;
                    size: number;
                    formattedSize: string;
                    created: string;
                  }, index: number) => (
                    <tr key={index}>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700">{file.name}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700">{file.formattedSize}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700">
                        {new Date(file.created).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {(!cacheInfo?.fileCount || cacheInfo.fileCount === 0) && (
        <div className="text-sm text-gray-500 italic">
          No cached images found.
        </div>
      )}
    </div>
  );
}