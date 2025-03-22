import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Upload } from "lucide-react";
import { UploadedFile } from "@/lib/types";

interface FileUploaderProps {
  onFileUpload: (file: UploadedFile) => void;
}

export default function FileUploader({ onFileUpload }: FileUploaderProps) {
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
      handleFile(e.dataTransfer.files[0]);
    }
  };
  
  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };
  
  const handleFile = (file: File) => {
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
            optimizationAvailable: fileSizeKB > 46 && ['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)
          };
          onFileUpload(uploadedFile);
        };
        img.onerror = () => {
          const uploadedFile: UploadedFile = {
            file,
            preview: result,
            dimensions: null,
            fileType: 'image',
            sizeWarning
          };
          onFileUpload(uploadedFile);
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
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
          sizeWarning
        };
        onFileUpload(uploadedFile);
      };
      reader.readAsDataURL(file);
    } 
    // Invalid file type
    else {
      alert('Please select a valid file (JPG, PNG, WEBP, GLB, or GLTF)');
    }
  };

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div 
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200 hover:bg-orange-50 dark:hover:bg-navy-700 ${isDragging ? 'border-orange-500 bg-orange-50/50 dark:border-orange-400 dark:bg-navy-700/70' : 'border-orange-200 dark:border-navy-600'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <div className="flex flex-col items-center justify-center">
        <Upload className="h-12 w-12 text-orange-400 dark:text-orange-500 mb-3" />
        <p className="text-gray-700 dark:text-gray-200 font-medium">Drag and drop your file here</p>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">or click to browse files</p>
        <p className="text-gray-500 dark:text-gray-400 text-xs mt-3">Supports JPG, PNG, WEBP, GLB, GLTF formats</p>
        <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Max recommended size: 60KB</p>
      </div>
      <input 
        type="file" 
        ref={fileInputRef}
        accept=".jpg,.jpeg,.png,.webp,.glb,.gltf"
        onChange={handleFileInput}
        className="hidden"
      />
    </div>
  );
}
