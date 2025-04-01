import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, AlertTriangle, Save, Copy, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TextEditorProps {
  onChange: (text: string) => void;
  initialText?: string;
  maxLength?: number;
  placeholder?: string;
  readOnly?: boolean;
  showWordCount?: boolean;
  showLineNumbers?: boolean;
  fileName?: string;
  onSave?: (text: string, fileName: string) => void;
}

export default function TextEditor({
  onChange,
  initialText = "",
  maxLength = 60000, // Default to 60KB as recommended limit
  placeholder = "Enter your text here...",
  readOnly = false,
  showWordCount = true,
  showLineNumbers = true,
  fileName = "inscription.txt",
  onSave
}: TextEditorProps) {
  const [text, setText] = useState(initialText);
  const [editedFileName, setEditedFileName] = useState(fileName);
  const [encoding, setEncoding] = useState<string>("utf-8");
  const [sizeWarning, setSizeWarning] = useState<string | null>(null);
  const [characterCount, setCharacterCount] = useState(0);
  const [byteSize, setByteSize] = useState(0);
  const [lineCount, setLineCount] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Calculate statistics
    setCharacterCount(text.length);
    setLineCount(text.split('\n').length);
    setWordCount(text.trim() === '' ? 0 : text.trim().split(/\s+/).length);
    
    // Calculate byte size based on selected encoding
    let bytes: Uint8Array;
    try {
      if (encoding === 'utf-8') {
        const encoder = new TextEncoder(); // This is UTF-8 by default
        bytes = encoder.encode(text);
      } else if (encoding === 'ascii') {
        // Simple ASCII encoding (only keep code points 0-127)
        bytes = new Uint8Array(text.length);
        for (let i = 0; i < text.length; i++) {
          bytes[i] = text.charCodeAt(i) & 0x7F; // Mask to 7 bits for ASCII
        }
      } else if (encoding === 'utf-16') {
        // UTF-16 encoding (approximation)
        bytes = new Uint8Array(text.length * 2);
        for (let i = 0; i < text.length; i++) {
          const code = text.charCodeAt(i);
          bytes[i*2] = code & 0xFF;
          bytes[i*2+1] = (code >> 8) & 0xFF;
        }
      } else {
        // Default to UTF-8
        const encoder = new TextEncoder();
        bytes = encoder.encode(text);
      }
      setByteSize(bytes.length);
      
      // Set size warnings
      if (bytes.length > 400000) {
        setSizeWarning("File size exceeds 400KB, which may require miner coordination for inscription.");
      } else if (bytes.length > 60000) {
        setSizeWarning("File size exceeds 60KB, which may require higher fees for inscription.");
      } else {
        setSizeWarning(null);
      }
    } catch (error) {
      console.error("Error encoding text:", error);
      toast({
        title: "Encoding error",
        description: "An error occurred while encoding the text.",
        variant: "destructive"
      });
    }
    
    // Call onChange callback
    onChange(text);
  }, [text, encoding, onChange, toast]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Text has been copied to clipboard successfully.",
    });
  };

  const handleSave = () => {
    if (onSave) {
      onSave(text, editedFileName);
      toast({
        title: "Text saved",
        description: `Saved as ${editedFileName}`,
      });
    }
  };

  const handleOptimize = () => {
    // Basic text optimization (remove extra whitespace)
    const optimizedText = text
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Replace triple+ newlines with double
      .replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs with a single space
      .trim(); // Remove leading/trailing whitespace
    
    setText(optimizedText);
    toast({
      title: "Text optimized",
      description: "Removed extra whitespace and optimized for size.",
    });
  };

  const renderLineNumbers = () => {
    if (!showLineNumbers) return null;
    
    const lines = text.split('\n');
    return (
      <div className="absolute left-0 top-0 bottom-0 w-10 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs select-none overflow-hidden">
        {lines.map((_, i) => (
          <div key={i} className="text-right pr-2 py-0.5">{i + 1}</div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-2">
        <div className="flex-1">
          <Label htmlFor="file-name">File Name</Label>
          <div className="flex mt-1">
            <input
              id="file-name"
              type="text"
              value={editedFileName}
              onChange={(e) => setEditedFileName(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>
        
        <div className="w-40">
          <Label htmlFor="encoding">Encoding</Label>
          <div className="flex mt-1">
            <select 
              id="encoding"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={encoding}
              onChange={(e) => setEncoding(e.target.value)}
            >
              <option value="utf-8">UTF-8</option>
              <option value="ascii">ASCII</option>
              <option value="utf-16">UTF-16</option>
            </select>
          </div>
        </div>
        
        <div className="flex items-end space-x-2">
          <Button variant="outline" size="sm" onClick={handleOptimize}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Optimize
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
          {onSave && (
            <Button variant="default" size="sm" onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
          )}
        </div>
      </div>
      
      <div className="relative border rounded-md">
        {showLineNumbers && renderLineNumbers()}
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          placeholder={placeholder}
          readOnly={readOnly}
          className={`font-mono min-h-[300px] resize-y ${showLineNumbers ? 'pl-12' : 'pl-4'} pr-4`}
          maxLength={maxLength}
        />
      </div>
      
      {sizeWarning && (
        <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-800">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{sizeWarning}</AlertDescription>
        </Alert>
      )}
      
      <div className="flex flex-wrap justify-between text-sm text-gray-500 dark:text-gray-400">
        <div className="flex space-x-4">
          <div>
            Characters: <Badge variant="outline">{characterCount}</Badge>
          </div>
          {showWordCount && (
            <div>
              Words: <Badge variant="outline">{wordCount}</Badge>
            </div>
          )}
          <div>
            Lines: <Badge variant="outline">{lineCount}</Badge>
          </div>
        </div>
        <div>
          Size: <Badge variant={byteSize > 60000 ? "destructive" : "outline"}>
            {byteSize < 1024 ? `${byteSize} B` : `${(byteSize / 1024).toFixed(1)} KB`}
          </Badge>
        </div>
      </div>
    </div>
  );
}