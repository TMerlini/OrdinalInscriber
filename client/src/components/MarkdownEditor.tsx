import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Info, AlertTriangle, Eye, Code, Save, Copy, RefreshCw, 
  Bold, Italic, Underline, Strikethrough, AlignJustify, List, ListOrdered, 
  Quote, WrapText, SquareCode, Table, Scissors, Undo, Redo, 
  Maximize, Keyboard
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_MARKDOWN = `# Markdown Title

## Subtitle

This is a paragraph with **bold text** and *italic text*.

- List item 1
- List item 2
- List item 3

[Visit Ordinarinos](https://ordinarinos.com)

![Image Alt Text](https://example.com/image.jpg)

\`\`\`javascript
// Code block
function hello() {
  console.log("Hello, Ordinals!");
}
\`\`\`

> Blockquote: Inscribe your ideas on the Bitcoin blockchain forever.

---

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Row 1    | Data     | Data     |
| Row 2    | Data     | Data     |
`;

interface MarkdownEditorProps {
  onChange: (text: string) => void;
  initialMarkdown?: string;
  fileName?: string;
  onSave?: (text: string, fileName: string) => void;
}

export default function MarkdownEditor({
  onChange,
  initialMarkdown = "",
  fileName = "inscription.md",
  onSave
}: MarkdownEditorProps) {
  const [markdown, setMarkdown] = useState(initialMarkdown || DEFAULT_MARKDOWN);
  const [editedFileName, setEditedFileName] = useState(fileName);
  const [activeTab, setActiveTab] = useState<string>("edit");
  const [byteSize, setByteSize] = useState(0);
  const [sizeWarning, setSizeWarning] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Calculate byte size
    const encoder = new TextEncoder();
    const bytes = encoder.encode(markdown);
    setByteSize(bytes.length);
    
    // Set size warnings
    if (bytes.length > 400000) {
      setSizeWarning("File size exceeds 400KB, which may require miner coordination for inscription.");
    } else if (bytes.length > 60000) {
      setSizeWarning("File size exceeds 60KB, which may require higher fees for inscription.");
    } else {
      setSizeWarning(null);
    }
    
    // Call onChange callback
    onChange(markdown);
  }, [markdown, onChange]);

  const handleMarkdownChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMarkdown(e.target.value);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown);
    toast({
      title: "Copied to clipboard",
      description: "Markdown has been copied to clipboard successfully.",
    });
  };

  const handleSave = () => {
    if (onSave) {
      onSave(markdown, editedFileName);
      toast({
        title: "Markdown saved",
        description: `Saved as ${editedFileName}`,
      });
    }
  };

  const handleOptimize = () => {
    // Basic Markdown optimization (remove extra whitespace, standardize headings)
    const optimizedMarkdown = markdown
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Replace triple+ newlines with double
      .replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs with a single space
      .replace(/\n(#+)([^ #])/g, '\n$1 $2') // Ensure space after heading #
      .trim(); // Remove leading/trailing whitespace
    
    setMarkdown(optimizedMarkdown);
    toast({
      title: "Markdown optimized",
      description: "Standardized formatting and optimized for size.",
    });
  };

  const handleSampleTemplate = () => {
    setMarkdown(DEFAULT_MARKDOWN);
    toast({
      title: "Template loaded",
      description: "Sample Markdown template has been loaded.",
    });
  };
  
  // Markdown formatting helpers
  const insertAtCursor = (prefix: string, suffix: string = '') => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = markdown.substring(start, end);
    const beforeText = markdown.substring(0, start);
    const afterText = markdown.substring(end);
    
    const newText = beforeText + prefix + selectedText + suffix + afterText;
    setMarkdown(newText);
    
    // Set focus back to textarea and restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };
  
  // Format buttons handlers
  const formatBold = () => insertAtCursor('**', '**');
  const formatItalic = () => insertAtCursor('*', '*');
  const formatUnderline = () => insertAtCursor('<u>', '</u>');
  const formatStrikethrough = () => insertAtCursor('~~', '~~');
  const formatHeading = (level: number) => {
    // Get current line and prepend with heading
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    const text = markdown;
    
    // Find the start of the current line
    let startOfLine = cursorPos;
    while (startOfLine > 0 && text.charAt(startOfLine - 1) !== '\n') {
      startOfLine--;
    }
    
    // Find the end of the current line
    let endOfLine = cursorPos;
    while (endOfLine < text.length && text.charAt(endOfLine) !== '\n') {
      endOfLine++;
    }
    
    // Get the current line text
    const currentLine = text.substring(startOfLine, endOfLine);
    
    // Remove any existing heading markers
    const cleanLine = currentLine.replace(/^#+\s*/, '');
    
    // Prepend with new heading level
    const prefix = '#'.repeat(level) + ' ';
    const newLine = prefix + cleanLine;
    
    // Replace the current line
    const beforeText = text.substring(0, startOfLine);
    const afterText = text.substring(endOfLine);
    const newText = beforeText + newLine + afterText;
    
    setMarkdown(newText);
    
    // Set focus back to textarea
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(startOfLine + prefix.length, startOfLine + newLine.length);
    }, 0);
  };
  
  const formatBulletList = () => insertAtCursor('- ');
  const formatNumberedList = () => insertAtCursor('1. ');
  const formatQuote = () => insertAtCursor('> ');
  const formatCode = () => insertAtCursor('`', '`');
  const formatCodeBlock = () => insertAtCursor('```\n', '\n```');
  const formatLink = () => insertAtCursor('[Link text](', ')');
  const formatImage = () => insertAtCursor('![Alt text](', ')');
  const formatTable = () => {
    const tableTemplate = '\n| Header 1 | Header 2 | Header 3 |\n| -------- | -------- | -------- |\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |\n';
    insertAtCursor(tableTemplate);
  };
  const formatDivider = () => insertAtCursor('\n---\n');

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
        
        <div className="flex items-end space-x-2">
          <Button variant="outline" size="sm" onClick={handleSampleTemplate}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Load Template
          </Button>
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
      
      <Tabs defaultValue="edit" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="edit" className="flex items-center">
            <Code className="mr-2 h-4 w-4" />
            Edit
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center">
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </TabsTrigger>
        </TabsList>
        <div className="border rounded-md mt-2 min-h-[400px]">
          <TabsContent value="edit" className="m-0">
            <div className="flex items-center border-b p-1 gap-1 flex-wrap">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => formatHeading(1)} 
                title="Heading 1"
                className="h-8 w-8"
              >
                <span className="text-xs font-bold">H1</span>
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => formatHeading(2)} 
                title="Heading 2"
                className="h-8 w-8"
              >
                <span className="text-xs font-bold">H2</span>
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={formatBold} 
                title="Bold"
                className="h-8 w-8"
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={formatItalic} 
                title="Italic"
                className="h-8 w-8"
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={formatStrikethrough} 
                title="Strikethrough"
                className="h-8 w-8"
              >
                <Strikethrough className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-border mx-1"></div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={formatBulletList} 
                title="Bullet List"
                className="h-8 w-8"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={formatNumberedList} 
                title="Numbered List"
                className="h-8 w-8"
              >
                <ListOrdered className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={formatQuote} 
                title="Quote"
                className="h-8 w-8"
              >
                <Quote className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-border mx-1"></div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={formatCode} 
                title="Inline Code"
                className="h-8 w-8"
              >
                <Code className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={formatCodeBlock} 
                title="Code Block"
                className="h-8 w-8"
              >
                <SquareCode className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={formatTable} 
                title="Table"
                className="h-8 w-8"
              >
                <Table className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={formatDivider} 
                title="Horizontal Divider"
                className="h-8 w-8"
              >
                <WrapText className="h-4 w-4" />
              </Button>
              <div className="ml-auto flex items-center">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  title="Fullscreen"
                  className="h-8 w-8"
                  onClick={() => {
                    if (document.fullscreenElement) {
                      document.exitFullscreen();
                    } else {
                      document.documentElement.requestFullscreen();
                    }
                  }}
                >
                  <Maximize className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  title="Keyboard Shortcuts"
                  className="h-8 w-8"
                  onClick={() => {
                    toast({
                      title: "Keyboard Shortcuts",
                      description: "Markdown supports various keyboard shortcuts like Ctrl+B for bold, Ctrl+I for italic, etc."
                    });
                  }}
                >
                  <Keyboard className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <textarea
              ref={textareaRef}
              value={markdown}
              onChange={handleMarkdownChange}
              placeholder="Enter Markdown content here..."
              className="w-full p-4 font-mono text-sm rounded-b-md min-h-[400px] focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </TabsContent>
          <TabsContent value="preview" className="m-0">
            <div className="markdown-preview p-4 prose dark:prose-invert prose-sm sm:prose-base max-w-none min-h-[400px]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {markdown}
              </ReactMarkdown>
            </div>
          </TabsContent>
        </div>
      </Tabs>
      
      {sizeWarning && (
        <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-800">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{sizeWarning}</AlertDescription>
        </Alert>
      )}
      
      <div className="flex flex-wrap justify-between text-sm text-gray-500 dark:text-gray-400">
        <div className="flex space-x-4">
          <div>
            Characters: <Badge variant="outline">{markdown.length}</Badge>
          </div>
          <div>
            Lines: <Badge variant="outline">{markdown.split('\n').length}</Badge>
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