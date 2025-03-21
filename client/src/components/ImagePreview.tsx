import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UploadedFile } from "@/lib/types";

interface ImagePreviewProps {
  file: UploadedFile;
  onRemove: () => void;
}

export default function ImagePreview({ file, onRemove }: ImagePreviewProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };
  
  return (
    <section className="p-6 border-b border-orange-100 dark:border-navy-700 bg-orange-50 dark:bg-navy-800">
      <h2 className="text-xl font-semibold mb-4 text-orange-800 dark:text-orange-400">2. Preview Image</h2>
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Image preview */}
        <div className="flex-shrink-0 w-full md:w-1/3 bg-gray-100 dark:bg-navy-800 rounded-lg overflow-hidden border border-orange-200 dark:border-navy-600">
          <img 
            src={file.preview} 
            alt="Preview" 
            className="w-full h-auto object-contain max-h-64" 
          />
        </div>
        
        {/* Image details */}
        <div className="flex-grow">
          <h3 className="font-medium text-lg text-gray-700 dark:text-gray-200 mb-2">Image Details</h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-gray-500 dark:text-gray-400">Filename:</dt>
            <dd className="text-gray-800 dark:text-gray-200">{file.file.name}</dd>
            
            <dt className="text-gray-500 dark:text-gray-400">Type:</dt>
            <dd className="text-gray-800 dark:text-gray-200">{file.file.type}</dd>
            
            <dt className="text-gray-500 dark:text-gray-400">Size:</dt>
            <dd className="text-gray-800 dark:text-gray-200">{formatFileSize(file.file.size)}</dd>
            
            <dt className="text-gray-500 dark:text-gray-400">Dimensions:</dt>
            <dd className="text-gray-800 dark:text-gray-200">
              {file.dimensions 
                ? `${file.dimensions.width} × ${file.dimensions.height}px` 
                : 'Unknown'}
            </dd>
          </dl>
          
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
