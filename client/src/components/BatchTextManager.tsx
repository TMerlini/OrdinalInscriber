import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Trash, File, FileText, FilePlus, Check, X, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';

interface TextItem {
  id: string;
  name: string;
  content: string;
  selected: boolean;
  size: number;
  optimize: boolean;
}

export interface BatchProcessingTextItem {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  error?: string;
}

interface BatchTextManagerProps {
  textItems: TextItem[];
  processingItems?: BatchProcessingTextItem[];
  onAddTextItem: (item: TextItem) => void;
  onRemoveTextItem: (itemId: string) => void;
  onToggleTextItemSelection: (itemId: string, selected: boolean) => void;
  onToggleOptimization?: (itemId: string, optimize: boolean) => void;
  onRemoveAllTextItems: () => void;
  onUpdateTextContent: (itemId: string, content: string) => void;
  onUpdateTextName: (itemId: string, name: string) => void;
  isMarkdown?: boolean;
}

export default function BatchTextManager({
  textItems,
  processingItems = [],
  onAddTextItem,
  onRemoveTextItem,
  onToggleTextItemSelection,
  onToggleOptimization,
  onRemoveAllTextItems,
  onUpdateTextContent,
  onUpdateTextName,
  isMarkdown = false
}: BatchTextManagerProps) {
  const [newItemName, setNewItemName] = useState<string>(`new-${isMarkdown ? 'markdown' : 'text'}-${textItems.length + 1}${isMarkdown ? '.md' : '.txt'}`);
  const [newItemContent, setNewItemContent] = useState<string>('');
  const { toast } = useToast();

  const handleAddNewItem = () => {
    // Ensure the file has the correct extension
    let fileName = newItemName;
    if (isMarkdown && !fileName.endsWith('.md')) {
      fileName += '.md';
    } else if (!isMarkdown && !fileName.endsWith('.txt')) {
      fileName += '.txt';
    }
    
    const encoder = new TextEncoder();
    const bytes = encoder.encode(newItemContent);
    
    const newItem: TextItem = {
      id: uuidv4(),
      name: fileName,
      content: newItemContent,
      selected: true,
      size: bytes.length,
      optimize: false
    };
    
    onAddTextItem(newItem);
    setNewItemName(`new-${isMarkdown ? 'markdown' : 'text'}-${textItems.length + 2}${isMarkdown ? '.md' : '.txt'}`);
    setNewItemContent('');
    
    toast({
      title: `${isMarkdown ? 'Markdown' : 'Text'} item added`,
      description: `Added "${fileName}" to the batch`,
    });
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const isProcessing = processingItems.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">
          {isMarkdown ? 'Markdown Files' : 'Text Files'} ({textItems.filter(item => item.selected).length} selected)
        </h3>
        <Button
          variant="destructive"
          size="sm"
          disabled={textItems.length === 0 || isProcessing}
          onClick={onRemoveAllTextItems}
        >
          <Trash className="h-4 w-4 mr-2" />
          Remove All
        </Button>
      </div>
      
      {textItems.length > 0 ? (
        <ScrollArea className="h-[300px] border rounded-md">
          <div className="p-2 space-y-2">
            {textItems.map((item) => {
              const processing = processingItems.find(p => p.id === item.id);
              
              return (
                <Card key={item.id} className={`mb-2 ${!item.selected ? 'opacity-70' : ''}`}>
                  <div className="p-3 flex justify-between items-start">
                    <div className="flex items-start gap-2 flex-grow">
                      <Checkbox
                        checked={item.selected}
                        onCheckedChange={(checked) => onToggleTextItemSelection(item.id, checked as boolean)}
                        disabled={isProcessing}
                        className="mt-1"
                      />
                      <div className="flex-grow">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => onUpdateTextName(item.id, e.target.value)}
                          className="font-medium text-sm w-full py-1 px-2 rounded border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-primary mb-1"
                          disabled={isProcessing}
                        />
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge variant={item.size > 60000 ? "destructive" : "outline"}>
                            {formatSize(item.size)}
                          </Badge>
                          
                          {processing && (
                            <Badge variant={processing.status === 'failed' ? "destructive" : 
                                           processing.status === 'complete' ? "success" : 
                                           "secondary"}>
                              {processing.status === 'pending' && 'Pending'}
                              {processing.status === 'processing' && 'Processing'}
                              {processing.status === 'complete' && 'Complete'}
                              {processing.status === 'failed' && 'Failed'}
                            </Badge>
                          )}
                          
                          {item.size > 60000 && (
                            <Badge variant="warning" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Large file
                            </Badge>
                          )}
                        </div>
                        
                        {processing?.error && (
                          <p className="text-xs text-red-500 mt-1">{processing.error}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {onToggleOptimization && (
                        <div className="flex items-center gap-1 text-xs">
                          <Label htmlFor={`optimize-${item.id}`} className="cursor-pointer">Optimize</Label>
                          <Switch
                            id={`optimize-${item.id}`}
                            checked={item.optimize}
                            onCheckedChange={(checked) => onToggleOptimization(item.id, checked)}
                            disabled={isProcessing}
                          />
                        </div>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveTextItem(item.id)}
                        disabled={isProcessing}
                      >
                        <Trash className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="px-3 pb-3">
                    <Textarea
                      value={item.content}
                      onChange={(e) => onUpdateTextContent(item.id, e.target.value)}
                      className="w-full h-20 text-xs font-mono resize-none"
                      disabled={isProcessing}
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      ) : (
        <div className="border rounded-md p-8 text-center text-gray-500 dark:text-gray-400">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No {isMarkdown ? 'markdown' : 'text'} files added yet.</p>
          <p className="text-sm mt-1">Create a new {isMarkdown ? 'markdown' : 'text'} file using the form below.</p>
        </div>
      )}
      
      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-md">Add New {isMarkdown ? 'Markdown' : 'Text'} File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="new-item-name">File Name</Label>
            <input
              id="new-item-name"
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="w-full py-2 px-3 rounded border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-primary"
              disabled={isProcessing}
            />
          </div>
          <div>
            <Label htmlFor="new-item-content">Content</Label>
            <Textarea
              id="new-item-content"
              value={newItemContent}
              onChange={(e) => setNewItemContent(e.target.value)}
              className="w-full h-24 font-mono resize-none"
              placeholder={`Enter ${isMarkdown ? 'markdown' : 'text'} content here...`}
              disabled={isProcessing}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleAddNewItem}
            disabled={!newItemName.trim() || isProcessing}
            className="w-full"
          >
            <FilePlus className="h-4 w-4 mr-2" />
            Add to Batch
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}