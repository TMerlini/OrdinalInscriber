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
import { Info, AlertTriangle, Save, Copy, RefreshCw, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { saveTextToCache } from "@/lib/textUtils";

// Cipher utilities
const cipherUtils = {
  // Caesar cipher with shift 3
  caesar: {
    encode: (text: string) => {
      return text.split('').map(char => {
        const code = char.charCodeAt(0);
        // Handle uppercase letters
        if (code >= 65 && code <= 90) {
          return String.fromCharCode(((code - 65 + 3) % 26) + 65);
        }
        // Handle lowercase letters
        if (code >= 97 && code <= 122) {
          return String.fromCharCode(((code - 97 + 3) % 26) + 97);
        }
        // Return other characters unchanged
        return char;
      }).join('');
    },
    decode: (text: string) => {
      return text.split('').map(char => {
        const code = char.charCodeAt(0);
        // Handle uppercase letters
        if (code >= 65 && code <= 90) {
          return String.fromCharCode(((code - 65 + 23) % 26) + 65); // +23 is the same as -3 mod 26
        }
        // Handle lowercase letters
        if (code >= 97 && code <= 122) {
          return String.fromCharCode(((code - 97 + 23) % 26) + 97);
        }
        // Return other characters unchanged
        return char;
      }).join('');
    }
  },
  
  // ROT13 cipher
  rot13: {
    encode: (text: string) => {
      return text.split('').map(char => {
        const code = char.charCodeAt(0);
        // Handle uppercase letters
        if (code >= 65 && code <= 90) {
          return String.fromCharCode(((code - 65 + 13) % 26) + 65);
        }
        // Handle lowercase letters
        if (code >= 97 && code <= 122) {
          return String.fromCharCode(((code - 97 + 13) % 26) + 97);
        }
        // Return other characters unchanged
        return char;
      }).join('');
    },
    decode: (text: string) => {
      // ROT13 is its own inverse
      return cipherUtils.rot13.encode(text);
    }
  },
  
  // Atbash cipher
  atbash: {
    encode: (text: string) => {
      return text.split('').map(char => {
        const code = char.charCodeAt(0);
        // Handle uppercase letters
        if (code >= 65 && code <= 90) {
          return String.fromCharCode(90 - (code - 65));
        }
        // Handle lowercase letters
        if (code >= 97 && code <= 122) {
          return String.fromCharCode(122 - (code - 97));
        }
        // Return other characters unchanged
        return char;
      }).join('');
    },
    decode: (text: string) => {
      // Atbash is its own inverse
      return cipherUtils.atbash.encode(text);
    }
  },
  
  // Morse code
  morse: {
    encode: (text: string) => {
      const morseMap: Record<string, string> = {
        'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.', 'G': '--.', 'H': '....', 'I': '..', 'J': '.---',
        'K': '-.-', 'L': '.-..', 'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-',
        'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-', 'Y': '-.--', 'Z': '--..', '0': '-----', '1': '.----', '2': '..---',
        '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.', '.': '.-.-.-', 
        ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--', '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...',
        ':': '---...', ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-', '"': '.-..-.', '$': '...-..-',
        '@': '.--.-.', ' ': '/'
      };
      
      return text.toUpperCase().split('').map(char => {
        return morseMap[char] || char;
      }).join(' ');
    },
    decode: (text: string) => {
      const morseMap: Record<string, string> = {
        '.-': 'A', '-...': 'B', '-.-.': 'C', '-..': 'D', '.': 'E', '..-.': 'F', '--.': 'G', '....': 'H', '..': 'I', '.---': 'J',
        '-.-': 'K', '.-..': 'L', '--': 'M', '-.': 'N', '---': 'O', '.--.': 'P', '--.-': 'Q', '.-.': 'R', '...': 'S', '-': 'T',
        '..-': 'U', '...-': 'V', '.--': 'W', '-..-': 'X', '-.--': 'Y', '--..': 'Z', '-----': '0', '.----': '1', '..---': '2',
        '...--': '3', '....-': '4', '.....': '5', '-....': '6', '--...': '7', '---..': '8', '----.': '9', '.-.-.-': '.',
        '--..--': ',', '..--..': '?', '.----.': "'", '-.-.--': '!', '-..-.': '/', '-.--.': '(', '-.--.-': ')', '.-...': '&',
        '---...': ':', '-.-.-.': ';', '-...-': '=', '.-.-.': '+', '-....-': '-', '..--.-': '_', '.-..-.': '"', '...-..-': '$',
        '.--.-.': '@', '/': ' '
      };
      
      return text.split(' ').map(code => {
        return morseMap[code] || code;
      }).join('');
    }
  },
  
  // Binary
  binary: {
    encode: (text: string) => {
      return text.split('').map(char => {
        return char.charCodeAt(0).toString(2).padStart(8, '0');
      }).join(' ');
    },
    decode: (text: string) => {
      try {
        return text.split(' ').map(bin => {
          return String.fromCharCode(parseInt(bin, 2));
        }).join('');
      } catch (e) {
        return "Invalid binary encoded text";
      }
    }
  },
  
  // Base64
  base64: {
    encode: (text: string) => {
      try {
        return btoa(text);
      } catch (e) {
        return "Encoding error: Text contains characters outside of Latin1 range";
      }
    },
    decode: (text: string) => {
      try {
        return atob(text);
      } catch (e) {
        return "Invalid Base64 encoded text";
      }
    }
  },
  
  // Hexadecimal encoding
  hex: {
    encode: (text: string) => {
      return Array.from(text)
        .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('');
    },
    decode: (text: string) => {
      try {
        // Remove any non-hex characters (spaces, 0x prefix, etc.)
        const cleanHex = text.replace(/[^0-9a-fA-F]/g, '');
        
        // Check if we have an even number of characters
        if (cleanHex.length % 2 !== 0) {
          return "Invalid hex string: should have an even number of hex characters";
        }
        
        // Convert hex pairs to characters
        let result = '';
        for (let i = 0; i < cleanHex.length; i += 2) {
          const hexPair = cleanHex.substring(i, i + 2);
          const charCode = parseInt(hexPair, 16);
          result += String.fromCharCode(charCode);
        }
        return result;
      } catch (e) {
        return "Invalid hexadecimal encoded text";
      }
    }
  },
  
  // Egyptian Hieroglyphics (simplified - using emoji symbols)
  hieroglyphics: {
    encode: (text: string) => {
      const hieroglyphMap: Record<string, string> = {
        'A': '𓀀', 'B': '𓃀', 'C': '𓎡', 'D': '𓂧', 'E': '𓇋', 'F': '𓆑', 'G': '𓎼', 'H': '𓉔', 'I': '𓇋', 'J': '𓆓',
        'K': '𓎡', 'L': '𓃭', 'M': '𓅓', 'N': '𓈖', 'O': '𓅱', 'P': '𓊪', 'Q': '𓏘', 'R': '𓂋', 'S': '𓋴', 'T': '𓏏',
        'U': '𓅱', 'V': '𓆑', 'W': '𓅱', 'X': '𓏴', 'Y': '𓇋', 'Z': '𓊃', '0': '𓎤', '1': '𓏺', '2': '𓏻', '3': '𓏼',
        '4': '𓏽', '5': '𓏾', '6': '𓏿', '7': '𓐀', '8': '𓐁', '9': '𓐂', '.': '𓐍', ',': '𓐍', '?': '𓀀', '!': '𓀁',
        ' ': ' '
      };
      
      return text.toUpperCase().split('').map(char => {
        return hieroglyphMap[char] || char;
      }).join('');
    },
    decode: (text: string) => {
      // Since hieroglyphs are complex and many-to-one mapping, 
      // properly decoding would require a different approach
      // For now, we'll return a message explaining the limitation
      return "[Translation from hieroglyphics is approximate. Original intended for one-way conversion.]";
    }
  },
  
  // Sumerian Cuneiform (simplified - using Unicode cuneiform symbols)
  sumerian: {
    encode: (text: string) => {
      const sumerianMap: Record<string, string> = {
        'A': '𒀀', 'B': '𒁀', 'C': '𒋧', 'D': '𒁺', 'E': '𒂊', 'F': '𒊬', 'G': '𒄀', 'H': '𒄩', 'I': '𒄿', 'J': '𒅆',
        'K': '𒆠', 'L': '𒇴', 'M': '𒈨', 'N': '𒉡', 'O': '𒁄', 'P': '𒅤', 'Q': '𒆥', 'R': '𒊏', 'S': '𒋛', 'T': '𒋰',
        'U': '𒌋', 'V': '𒍇', 'W': '𒉿', 'X': '𒊕', 'Y': '𒐊', 'Z': '𒍣', '0': '𒐼', '1': '𒐻', '2': '𒑐', '3': '𒑁',
        '4': '𒑂', '5': '𒑃', '6': '𒑄', '7': '𒑅', '8': '𒑆', '9': '𒑇', '.': '𒑰', ',': '𒑱', '?': '𒑲', '!': '𒑳',
        ' ': ' '
      };
      
      return text.toUpperCase().split('').map(char => {
        return sumerianMap[char] || char;
      }).join('');
    },
    decode: (text: string) => {
      // Similar to hieroglyphics, cuneiform is complex for reverse mapping
      return "[Translation from cuneiform is approximate. Original intended for one-way conversion.]";
    }
  }
};

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
  const [previousEncoding, setPreviousEncoding] = useState<string>("utf-8");
  const [originalText, setOriginalText] = useState<string>(initialText);
  const [sizeWarning, setSizeWarning] = useState<string | null>(null);
  const [characterCount, setCharacterCount] = useState(0);
  const [byteSize, setByteSize] = useState(0);
  const [lineCount, setLineCount] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Effect for handling initial text
  useEffect(() => {
    setText(initialText);
    setOriginalText(initialText);
  }, [initialText]);

  // Effect for handling encoding changes
  useEffect(() => {
    if (encoding !== previousEncoding) {
      try {
        // If the current encoding is a cipher, decode the text first
        let currentText = text;
        
        if (previousEncoding !== 'utf-8' && previousEncoding !== 'ascii' && previousEncoding !== 'utf-16') {
          if (cipherUtils[previousEncoding as keyof typeof cipherUtils]) {
            // Decode from the previous encoding
            currentText = cipherUtils[previousEncoding as keyof typeof cipherUtils].decode(text);
          }
        }
        
        // Then encode to the new encoding if it's a cipher
        if (encoding !== 'utf-8' && encoding !== 'ascii' && encoding !== 'utf-16') {
          if (cipherUtils[encoding as keyof typeof cipherUtils]) {
            // Apply the new encoding
            const newText = cipherUtils[encoding as keyof typeof cipherUtils].encode(currentText);
            setText(newText);
          }
        } else {
          // If we're going back to a standard encoding, use the decoded text
          setText(currentText);
        }
        
        // Update previous encoding
        setPreviousEncoding(encoding);
        
      } catch (error) {
        console.error('Error processing encoding change:', error);
        toast({
          title: 'Encoding Error',
          description: 'Failed to apply the selected encoding. Some characters may not be compatible.',
          variant: 'destructive'
        });
      }
    }
  }, [encoding, previousEncoding, text]);

  // Calculate statistics and byte size
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
        // For cipher encodings, use UTF-8 for size calculation
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

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Save to cache first
      const contentType = editedFileName.endsWith('.md') ? 'text/markdown' : 'text/plain';
      const savedFile = await saveTextToCache(text, editedFileName, contentType);
      
      // Then call the onSave callback if provided
      if (onSave) {
        onSave(text, editedFileName);
      }
      
      toast({
        title: "Text saved",
        description: `Saved as ${editedFileName} (${savedFile.formattedSize})`,
      });
    } catch (error) {
      console.error("Error saving text:", error);
      toast({
        title: "Save error",
        description: `Failed to save text: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
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
              <optgroup label="Standard Encodings">
                <option value="utf-8">UTF-8</option>
                <option value="ascii">ASCII</option>
                <option value="utf-16">UTF-16</option>
              </optgroup>
              <optgroup label="Substitution Ciphers">
                <option value="caesar">Caesar Cipher</option>
                <option value="atbash">Atbash Cipher</option>
                <option value="rot13">ROT13</option>
                <option value="morse">Morse Code</option>
                <option value="binary">Binary</option>
                <option value="hex">Hexadecimal</option>
                <option value="base64">Base64</option>
              </optgroup>
              <optgroup label="Ancient Scripts">
                <option value="hieroglyphics">Egyptian Hieroglyphics</option>
                <option value="sumerian">Sumerian Cuneiform</option>
              </optgroup>
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
            <Button variant="default" size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </>
              )}
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