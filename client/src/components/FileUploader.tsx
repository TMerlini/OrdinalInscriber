import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Upload } from "lucide-react";
import { UploadedFile } from "@/lib/types";
import SectionTitle from "./SectionTitle";
import { Switch } from "@/components/ui/switch";

interface FileUploaderProps {
  onFileUpload: (file: UploadedFile) => void;
  onFilesUpload?: (files: UploadedFile[]) => void;
  batchMode?: boolean;
  onBatchModeChange?: (enabled: boolean) => void;
}

export default function FileUploader({ 
  onFileUpload, 
  onFilesUpload, 
  batchMode = false, 
  onBatchModeChange 
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files.length) {
      if (batchMode && e.dataTransfer.files.length > 1) {
        // Process multiple files
        Array.from(e.dataTransfer.files).forEach(file => {
          processFile(file);
        });
      } else {
        // Process single file
        handleFile(e.dataTransfer.files[0]);
      }
    }
  };
  
  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (batchMode && e.target.files.length > 1) {
        // Process multiple files
        const uploadedFiles: UploadedFile[] = [];
        const filePromises = Array.from(e.target.files).map(file => 
          new Promise<UploadedFile | null>(resolve => {
            processFile(file, (uploadedFile) => {
              if (uploadedFile) {
                uploadedFiles.push(uploadedFile);
              }
              resolve(uploadedFile);
            });
          })
        );
        
        Promise.all(filePromises).then(() => {
          if (onFilesUpload && uploadedFiles.length > 0) {
            onFilesUpload(uploadedFiles);
          }
        });
      } else {
        // Process single file
        handleFile(e.target.files[0]);
      }
    }
  };
  
  const processFile = (file: File, callback?: (file: UploadedFile | null) => void) => {
    // Check file size and set warnings
    const fileSizeKB = file.size / 1024;
    let sizeWarning = undefined;
    
    if (fileSizeKB > 400) {
      sizeWarning = {
        type: 'danger' as const,
        message: 'File exceeds 400KB. Miners may reject this transaction without coordination. Consider optimizing your image.'
      };
    } else if (fileSizeKB > 60) {
      sizeWarning = {
        type: 'warning' as const,
        message: 'File exceeds 60KB. Bitcoin nodes may have difficulty propagating this transaction. Consider optimization for better results.'
      };
    }
    
    // Check if it's an image file
    if (file.type.match('image/(jpeg|jpg|png|webp)')) {
      // Create file preview and get dimensions
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        
        // Get image dimensions
        const img = new Image();
        img.onload = () => {
          const uploadedFile: UploadedFile = {
            file,
            preview: result,
            dimensions: {
              width: img.width,
              height: img.height
            },
            fileType: 'image',
            sizeWarning,
            optimizationAvailable: fileSizeKB > 46 && ['image/jpeg', 'image/jpg', 'image/png'].includes(file.type),
            id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            selected: true
          };
          
          if (callback) {
            callback(uploadedFile);
          } else if (!batchMode) {
            onFileUpload(uploadedFile);
          }
        };
        img.onerror = () => {
          const uploadedFile: UploadedFile = {
            file,
            preview: result,
            dimensions: null,
            fileType: 'image',
            sizeWarning,
            id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            selected: true
          };
          
          if (callback) {
            callback(uploadedFile);
          } else if (!batchMode) {
            onFileUpload(uploadedFile);
          }
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
      return true;
    } 
    // Check if it's a 3D model file (glb or gltf)
    else if (file.name.toLowerCase().endsWith('.glb') || file.name.toLowerCase().endsWith('.gltf')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        console.log("Loaded 3D model file:", file.name);
        
        const uploadedFile: UploadedFile = {
          file,
          preview: result,
          dimensions: null,
          fileType: 'model',
          sizeWarning,
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          selected: true
        };
        
        if (callback) {
          callback(uploadedFile);
        } else if (!batchMode) {
          onFileUpload(uploadedFile);
        }
      };
      reader.readAsDataURL(file);
      return true;
    } 
    // Invalid file type
    else {
      alert('Please select a valid file (JPG, PNG, WEBP, GLB, or GLTF)');
      if (callback) callback(null);
      return false;
    }
  };
  
  const handleFile = (file: File) => {
    processFile(file);
  };

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleBatchModeToggle = (checked: boolean) => {
    if (onBatchModeChange) {
      onBatchModeChange(checked);
    }
  };

  return (
    <div className="space-y-4">
      {onBatchModeChange && (
        <div className="flex items-center space-x-2 mb-2">
          <Switch 
            id="batch-mode-toggle"
            checked={batchMode}
            onCheckedChange={handleBatchModeToggle}
          />
          <label
            htmlFor="batch-mode-toggle"
            className="text-sm font-medium leading-none text-orange-800 dark:text-orange-400 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Enable Batch Mode (Multiple Files)
          </label>
        </div>
      )}
      
      <div 
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200 hover:bg-orange-50 dark:hover:bg-navy-700 ${isDragging ? 'border-orange-500 bg-orange-50/50 dark:border-orange-400 dark:bg-navy-700/70' : 'border-orange-200 dark:border-navy-600'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <div className="flex flex-col items-center justify-center">
          <Upload className="h-12 w-12 text-orange-400 dark:text-orange-500 mb-3" />
          <p className="text-gray-700 dark:text-gray-200 font-medium">
            Drag and drop your {batchMode ? "files" : "file"} here
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">or click to browse files</p>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-3">Supports JPG, PNG, WEBP, GLB, GLTF formats</p>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Max recommended size: 60KB</p>
          {batchMode && (
            <p className="text-orange-500 dark:text-orange-400 text-xs font-medium mt-2">Batch mode enabled - select multiple files</p>
          )}
        </div>
        <input 
          type="file" 
          ref={fileInputRef}
          accept=".jpg,.jpeg,.png,.webp,.glb,.gltf"
          onChange={handleFileInput}
          className="hidden"
          multiple={batchMode}
        />
      </div>
    </div>
  );
}
