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
      <div className="p-6 border-t border-orange-100 bg-gradient-to-r from-transparent to-orange-50">
        <div className="flex items-center gap-2 mb-2">
          <Database className="h-5 w-5 text-orange-600" />
          <h2 className="text-lg font-semibold text-orange-800">Cache Management</h2>
        </div>
        <div className="text-sm text-orange-700 flex items-center">
          <RefreshCw className="h-4 w-4 mr-2 animate-spin text-orange-500" />
          Loading cache information...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 border-t border-orange-100 bg-gradient-to-r from-transparent to-orange-50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-orange-600" />
          <h2 className="text-lg font-semibold text-orange-800">Cache Management</h2>
        </div>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => refetch()}
            disabled={isLoading}
            className="border-orange-300 hover:bg-orange-100"
          >
            <RefreshCw className="h-4 w-4 mr-2 text-orange-600" />
            Refresh
          </Button>
          <Button 
            size="sm" 
            variant="destructive" 
            onClick={handleClearCache}
            disabled={clearCache.isPending || cacheInfo?.fileCount === 0}
            className="bg-red-500 hover:bg-red-600"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Cache
          </Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl mb-4 border border-orange-200 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between mb-2">
          <div className="text-sm text-gray-700">
            <span className="font-medium text-orange-700">Storage Used:</span> {cacheInfo?.formattedSize} of {cacheInfo?.formattedLimit}
          </div>
          <div className="text-sm text-gray-700">
            <span className="font-medium text-orange-700">Files:</span> {cacheInfo?.fileCount || 0}
          </div>
        </div>
        
        <Progress 
          value={cacheInfo?.percentUsed || 0} 
          className={`h-3 rounded-full ${getProgressColor(cacheInfo?.percentUsed || 0)}`}
        />
        
        <div className="text-xs text-gray-500 mt-1">
          {cacheInfo?.percentUsed || 0}% of 5GB limit used
        </div>
      </div>

      {cacheInfo?.fileCount && cacheInfo.fileCount > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-orange-800">Cached Files</h3>
            <button 
              className="text-xs text-orange-600 hover:text-orange-800 flex items-center" 
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Hide Details' : 'Show Details'}
            </button>
          </div>

          {isExpanded && (
            <div className="text-xs rounded-xl overflow-hidden border border-orange-200 shadow-sm">
              <table className="min-w-full divide-y divide-orange-100">
                <thead className="bg-gradient-to-r from-orange-50 to-orange-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-orange-800 uppercase tracking-wider">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-orange-800 uppercase tracking-wider">Size</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-orange-800 uppercase tracking-wider">Created</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-orange-50">
                  {cacheInfo.files && cacheInfo.files.map((file: {
                    name: string;
                    size: number;
                    formattedSize: string;
                    created: string;
                  }, index: number) => (
                    <tr key={index} className="hover:bg-orange-50 transition-colors">
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
        <div className="text-sm text-orange-700 p-4 bg-white rounded-xl border border-orange-200 shadow-sm flex items-center justify-center italic">
          No cached images found.
        </div>
      )}
    </div>
  );
}