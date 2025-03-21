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
    // Validate file type
    if (!file.type.match('image/(jpeg|jpg|png|webp)')) {
      alert('Please select an image file (JPG, PNG, or WEBP)');
      return;
    }
    
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
          }
        };
        onFileUpload(uploadedFile);
      };
      img.onerror = () => {
        const uploadedFile: UploadedFile = {
          file,
          preview: result,
          dimensions: null
        };
        onFileUpload(uploadedFile);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
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
        <p className="text-gray-700 dark:text-gray-200 font-medium">Drag and drop your image here</p>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">or click to browse files</p>
        <p className="text-gray-500 dark:text-gray-400 text-xs mt-3">Supports JPG, PNG, WEBP formats</p>
      </div>
      <input 
        type="file" 
        ref={fileInputRef}
        accept=".jpg,.jpeg,.png,.webp"
        onChange={handleFileInput}
        className="hidden"
      />
    </div>
  );
}
