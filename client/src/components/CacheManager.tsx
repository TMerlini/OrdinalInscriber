import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Trash2, RefreshCw, Database, Eye, ExternalLink, XCircle } from "lucide-react";
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
  const [previewFile, setPreviewFile] = useState<string | null>(null);

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

  // Delete single file mutation
  const deleteFile = useMutation({
    mutationFn: async (filename: string) => {
      const response = await apiRequest('DELETE', `/api/cache/file/${filename}`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "File Deleted",
        description: data.message || `Successfully deleted the file.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/cache/info'] });
      setPreviewFile(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete file: ${error}`,
        variant: "destructive",
      });
    }
  });

  const handleClearCache = () => {
    if (window.confirm("Are you sure you want to clear all cached images?")) {
      clearCache.mutate();
    }
  };

  const handleDeleteFile = (filename: string) => {
    if (window.confirm(`Are you sure you want to delete ${filename}?`)) {
      deleteFile.mutate(filename);
    }
  };

  // For progress bar color
  const getProgressColor = (percent: number) => {
    if (percent < 50) return "bg-green-500";
    if (percent < 80) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Preview an image in a modal
  const openPreview = (filename: string) => {
    setPreviewFile(filename);
  };

  // Close preview modal
  const closePreview = () => {
    setPreviewFile(null);
  };

  // Is the file an image?
  const isImageFile = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '');
  };

  if (isLoading || !cacheInfo) {
    return (
      <div className="p-6 border-t border-orange-100 bg-white dark:bg-navy-900">
        <div className="flex items-center gap-2 mb-2">
          <Database className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Cache Management</h2>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
          <RefreshCw className="h-4 w-4 mr-2 animate-spin text-orange-500" />
          Loading cache information...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 border-t border-orange-100 dark:border-navy-700 bg-white dark:bg-navy-900">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Cache Management</h2>
        </div>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => refetch()}
            disabled={isLoading}
            className="border-orange-300 hover:bg-orange-100 dark:border-navy-600 dark:hover:bg-navy-800"
          >
            <RefreshCw className="h-4 w-4 mr-2 text-orange-600 dark:text-orange-400" />
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

      <div className="bg-white dark:bg-navy-800 p-4 rounded-xl mb-4 border border-orange-200 dark:border-navy-700 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between mb-2">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-medium text-orange-700 dark:text-orange-400">Storage Used:</span> {cacheInfo?.formattedSize} of {cacheInfo?.formattedLimit}
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-medium text-orange-700 dark:text-orange-400">Files:</span> {cacheInfo?.fileCount || 0}
          </div>
        </div>
        
        <Progress 
          value={cacheInfo?.percentUsed || 0} 
          className={`h-3 rounded-full ${getProgressColor(cacheInfo?.percentUsed || 0)}`}
        />
        
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {cacheInfo?.percentUsed || 0}% of 5GB limit used
        </div>
      </div>

      {cacheInfo?.fileCount && cacheInfo.fileCount > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Cached Files</h3>
            <button 
              className="text-xs text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 flex items-center" 
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Hide Details' : 'Show Details'}
            </button>
          </div>

          {isExpanded && (
            <div className="text-xs rounded-xl overflow-hidden border border-orange-200 dark:border-navy-700 shadow-sm">
              <table className="min-w-full divide-y divide-orange-100 dark:divide-navy-700">
                <thead className="bg-white dark:bg-navy-800">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Size</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Created</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-navy-800 divide-y divide-orange-50 dark:divide-navy-700">
                  {cacheInfo.files && cacheInfo.files.map((file: {
                    name: string;
                    size: number;
                    formattedSize: string;
                    created: string;
                  }, index: number) => (
                    <tr key={index} className="hover:bg-orange-50 dark:hover:bg-navy-700 transition-colors">
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300 overflow-hidden text-ellipsis max-w-[150px]">
                        {file.name}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">{file.formattedSize}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">
                        {new Date(file.created).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-right">
                        <div className="flex justify-end space-x-2">
                          {isImageFile(file.name) && (
                            <button 
                              onClick={() => openPreview(file.name)}
                              className="text-blue-500 hover:text-blue-700 transition-colors"
                              title="Preview"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}
                          <a 
                            href={`/api/cache/file/${file.name}`}
                            download={file.name}
                            className="text-green-500 hover:text-green-700 transition-colors"
                            title="Download"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                          <button 
                            onClick={() => handleDeleteFile(file.name)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
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
        <div className="text-sm text-gray-600 dark:text-gray-400 p-4 bg-white dark:bg-navy-800 rounded-xl border border-orange-200 dark:border-navy-700 shadow-sm flex items-center justify-center italic">
          No cached images found.
        </div>
      )}

      {/* Image Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="relative bg-white dark:bg-navy-900 rounded-lg overflow-hidden max-w-3xl max-h-[90vh] w-full">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-navy-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{previewFile}</h3>
              <button 
                onClick={closePreview}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[70vh]">
              <img 
                src={`/api/cache/file/${previewFile}`} 
                alt={previewFile}
                className="max-w-full h-auto mx-auto"
              />
            </div>
            <div className="p-4 flex justify-between border-t border-gray-200 dark:border-navy-700">
              <Button
                variant="destructive"
                onClick={() => {
                  handleDeleteFile(previewFile);
                }}
                className="text-white"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete File
              </Button>
              <Button
                variant="outline"
                onClick={closePreview}
              >
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}