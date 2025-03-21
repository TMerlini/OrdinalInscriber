import { Trash2, AlertTriangle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UploadedFile } from "@/lib/types";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import ModelViewer from "./ModelViewer";
import { useState } from "react";

interface ImagePreviewProps {
  file: UploadedFile;
  onRemove: () => void;
  onToggleOptimization?: (optimize: boolean) => void;
}

export default function ImagePreview({ file, onRemove, onToggleOptimization }: ImagePreviewProps) {
  const [optimize, setOptimize] = useState(false);
  
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };
  
  const handleOptimizeToggle = (checked: boolean) => {
    setOptimize(checked);
    if (onToggleOptimization) {
      onToggleOptimization(checked);
    }
  };
  
  return (
    <section className="p-6 border-b border-orange-100 dark:border-navy-700 bg-orange-50 dark:bg-navy-800">
      <h2 className="text-xl font-semibold mb-4 text-orange-800 dark:text-orange-400">
        2. Preview {file.fileType === 'image' ? 'Image' : 'Model'}
      </h2>
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* File preview */}
        <div className="flex-shrink-0 w-full md:w-1/3 bg-gray-100 dark:bg-navy-800 rounded-lg overflow-hidden border border-orange-200 dark:border-navy-600">
          {file.fileType === 'image' ? (
            <img 
              src={file.preview} 
              alt="Preview" 
              className="w-full h-auto object-contain max-h-64" 
            />
          ) : (
            <ModelViewer url={file.preview} height={256} />
          )}
        </div>
        
        {/* File details */}
        <div className="flex-grow">
          <h3 className="font-medium text-lg text-gray-700 dark:text-gray-200 mb-2">
            {file.fileType === 'image' ? 'Image' : 'Model'} Details
          </h3>
          
          {file.sizeWarning && (
            <div className={`mb-4 p-3 rounded-md flex items-start gap-2 ${
              file.sizeWarning.type === 'danger' 
                ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300' 
                : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300'
            }`}>
              {file.sizeWarning.type === 'danger' ? (
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              )}
              <div className="text-sm">{file.sizeWarning.message}</div>
            </div>
          )}
          
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-gray-500 dark:text-gray-400">Filename:</dt>
            <dd className="text-gray-800 dark:text-gray-200">{file.file.name}</dd>
            
            <dt className="text-gray-500 dark:text-gray-400">Type:</dt>
            <dd className="text-gray-800 dark:text-gray-200">
              {file.fileType === 'image' ? file.file.type : 'Model (GLB/GLTF)'}
            </dd>
            
            <dt className="text-gray-500 dark:text-gray-400">Size:</dt>
            <dd className="text-gray-800 dark:text-gray-200">{formatFileSize(file.file.size)}</dd>
            
            {file.fileType === 'image' && file.dimensions && (
              <>
                <dt className="text-gray-500 dark:text-gray-400">Dimensions:</dt>
                <dd className="text-gray-800 dark:text-gray-200">
                  {`${file.dimensions.width} × ${file.dimensions.height}px`}
                </dd>
              </>
            )}
          </dl>
          
          {file.optimizationAvailable && (
            <div className="mt-4 p-4 bg-white dark:bg-navy-900 rounded-md border border-orange-100 dark:border-navy-600">
              <div className="flex items-center space-x-2 mb-2">
                <Switch id="optimize" checked={optimize} onCheckedChange={handleOptimizeToggle} />
                <Label htmlFor="optimize" className="font-medium">Optimize image size</Label>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Convert to WebP format (~46KB) for better inscription success rate
              </p>
            </div>
          )}
          
          <div className="mt-6">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRemove}
              className="flex items-center border-orange-200 dark:border-navy-600 hover:bg-orange-50 dark:hover:bg-navy-700"
            >
              <Trash2 className="mr-2 h-4 w-4 text-orange-600 dark:text-orange-400" />
              Remove
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
