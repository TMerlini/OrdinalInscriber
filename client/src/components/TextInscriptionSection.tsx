import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { File, FileText, FileCode, Upload, AlertTriangle, Info, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';

import TextEditor from './TextEditor';
import BatchTextManager, { BatchProcessingTextItem } from './BatchTextManager';
import ConfigForm, { DEFAULT_CONTAINER_PATH } from './ConfigForm';
import CommandSection from './CommandSection';
import BatchProcessingProgress from './BatchProcessingProgress';
import RareSatSelector from './RareSatSelector';

// Types
import { ExecutionStep, ConfigOptions, BatchProcessingState, StepStatus } from '@/lib/types';
import type { InscriptionStatusItem } from './InscriptionStatus';

interface TextItem {
  id: string;
  name: string;
  content: string;
  selected: boolean;
  size: number;
  optimize: boolean;
}

export default function TextInscriptionSection() {
  // Single Text Mode
  const [textContent, setTextContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('inscription.txt');
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  
  // Advanced Options
  const [metadataJson, setMetadataJson] = useState<string>('');
  const [parentInscriptionId, setParentInscriptionId] = useState<string>('');
  const [destinationAddress, setDestinationAddress] = useState<string>('');
  const [feeRate, setFeeRate] = useState<string>('5');
  
  // Batch Text Mode
  const [textItems, setTextItems] = useState<TextItem[]>([]);
  const [processingTextItems, setProcessingTextItems] = useState<BatchProcessingTextItem[]>([]);
  
  // Command Generation
  const [commands, setCommands] = useState<string>('');
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const [batchState, setBatchState] = useState<BatchProcessingState>({
    isProcessing: false,
    currentItem: null,
    progress: 0,
    total: 0,
    startTime: null,
    errors: [],
    items: []
  });
  
  const { toast } = useToast();
  
  // Handle single text content change
  const handleTextContentChange = (text: string) => {
    setTextContent(text);
  };
  
  // Handle batch mode toggle
  const handleBatchModeChange = (enabled: boolean) => {
    setIsBatchMode(enabled);
    // Reset commands when switching modes
    setCommands('');
    setExecutionSteps([]);
  };
  
  // Add a text item to the batch
  const handleAddTextItem = (item: TextItem) => {
    setTextItems([...textItems, item]);
  };
  
  // Remove a text item from the batch
  const handleRemoveTextItem = (itemId: string) => {
    setTextItems(textItems.filter(item => item.id !== itemId));
  };
  
  // Toggle text item selection in batch
  const handleToggleTextItemSelection = (itemId: string, selected: boolean) => {
    setTextItems(textItems.map(item => 
      item.id === itemId ? { ...item, selected } : item
    ));
  };
  
  // Toggle text optimization in batch
  const handleToggleOptimization = (itemId: string, optimize: boolean) => {
    setTextItems(textItems.map(item => 
      item.id === itemId ? { ...item, optimize } : item
    ));
  };
  
  // Remove all text items from batch
  const handleRemoveAllTextItems = () => {
    setTextItems([]);
  };
  
  // Update text content in a batch item
  const handleUpdateTextContent = (itemId: string, content: string) => {
    setTextItems(textItems.map(item => {
      if (item.id === itemId) {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(content);
        return { ...item, content, size: bytes.length };
      }
      return item;
    }));
  };
  
  // Update text name in a batch item
  const handleUpdateTextName = (itemId: string, name: string) => {
    setTextItems(textItems.map(item => 
      item.id === itemId ? { ...item, name } : item
    ));
  };
  
  // Generate inscription commands based on config
  const handleGenerateCommands = (config: ConfigOptions) => {
    if (isBatchMode) {
      // Generate batch commands
      const selectedItems = textItems.filter(item => item.selected);
      if (selectedItems.length === 0) {
        toast({
          title: "No text files selected",
          description: "Please select at least one text file for batch processing.",
          variant: "destructive"
        });
        return;
      }
      
      // Generate commands for each text file
      let batchCommands = '';
      const steps: ExecutionStep[] = [];
      
      // Add metadata if provided
      let metadataArray = [];
      if (config.metadataJson && config.metadataJson.trim()) {
        try {
          const metadata = JSON.parse(config.metadataJson);
          if (Array.isArray(metadata)) {
            metadataArray = metadata;
          } else {
            // If single object, repeat it for each file
            metadataArray = Array(selectedItems.length).fill(metadata);
          }
        } catch (e) {
          toast({
            title: "Invalid metadata JSON",
            description: "Please provide valid JSON for metadata.",
            variant: "destructive"
          });
          return;
        }
      }
      
      // Generate commands for each selected text file
      selectedItems.forEach((item, index) => {
        const containerPath = `${DEFAULT_CONTAINER_PATH}${item.name}`;
        const metadataOption = metadataArray[index] 
          ? `--json-metadata '${JSON.stringify(metadataArray[index])}'` 
          : '';
        const parentOption = config.parentInscriptionId 
          ? `--parent ${config.parentInscriptionId}` 
          : '';
        const destinationOption = config.destinationAddress 
          ? `--destination ${config.destinationAddress}` 
          : '';
        const satOption = config.selectedSat 
          ? `--sat ${config.selectedSat}` 
          : '';
        
        // Command for this file
        const command = `ord wallet inscribe --fee-rate ${config.feeRate} ${metadataOption} ${parentOption} ${destinationOption} ${satOption} --file ${containerPath}`;
        
        batchCommands += `echo 'Processing ${item.name}...'\n`;
        batchCommands += `${command}\n\n`;
        
        steps.push({
          description: `Process ${item.name}`,
          command,
          status: StepStatus.PENDING
        });
      });
      
      setCommands(batchCommands);
      setExecutionSteps(steps);
      
      // Setup processing items
      const newProcessingItems: BatchProcessingTextItem[] = selectedItems.map(item => ({
        id: item.id,
        name: item.name,
        status: 'pending'
      }));
      
      setProcessingTextItems(newProcessingItems);
      
      // Initialize batch state
      setBatchState({
        isProcessing: false,
        currentItem: null,
        progress: 0,
        total: selectedItems.length,
        startTime: null,
        errors: []
      });
      
    } else {
      // Generate single file command
      // Create the text file if it doesn't exist
      const containerPath = `${DEFAULT_CONTAINER_PATH}${fileName}`;
      
      // Build the inscription command
      const metadataOption = config.metadataJson 
        ? `--json-metadata '${config.metadataJson}'` 
        : '';
      const parentOption = config.parentInscriptionId 
        ? `--parent ${config.parentInscriptionId}` 
        : '';
      const destinationOption = config.destinationAddress 
        ? `--destination ${config.destinationAddress}` 
        : '';
      const satOption = config.selectedSat 
        ? `--sat ${config.selectedSat}` 
        : '';
      
      const command = `ord wallet inscribe --fee-rate ${config.feeRate} ${metadataOption} ${parentOption} ${destinationOption} ${satOption} --file ${containerPath}`;
      
      setCommands(`echo '${textContent}' > ${containerPath}\n${command}`);
      setExecutionSteps([
        {
          description: `Save text content to file`,
          command: `echo '${textContent}' > ${containerPath}`,
          status: StepStatus.PENDING
        },
        {
          description: `Inscribe text file`,
          command,
          status: StepStatus.PENDING
        }
      ]);
    }
  };
  
  // Handle start batch processing
  const handleStartProcessing = () => {
    // This would typically trigger the command execution process
    // For now, we'll just update the state to show progress
    setBatchState({
      ...batchState,
      isProcessing: true,
      startTime: new Date(),
      progress: 0
    });
    
    // In a real implementation, this would execute the commands and update status
    toast({
      title: "Batch processing started",
      description: "Processing text inscriptions...",
    });
  };
  
  // Handle stop batch processing
  const handleStopProcessing = () => {
    setBatchState({
      ...batchState,
      isProcessing: false
    });
    
    toast({
      title: "Batch processing stopped",
      description: "Processing has been paused."
    });
  };
  
  // Handle reset batch processing
  const handleResetProcessing = () => {
    setBatchState({
      isProcessing: false,
      currentItem: null,
      progress: 0,
      total: batchState.total,
      startTime: null,
      errors: []
    });
    
    // Reset processing items status
    setProcessingTextItems(processingTextItems.map(item => ({
      ...item,
      status: 'pending',
      error: undefined
    })));
    
    // Reset execution steps status
    setExecutionSteps(executionSteps.map(step => ({
      ...step,
      status: StepStatus.PENDING,
      output: undefined,
      error: undefined
    })));
    
    toast({
      title: "Batch processing reset",
      description: "All items have been reset to pending status.",
    });
  };
  
  // Handle execute a single step
  const handleExecuteStep = (stepIndex: number) => {
    // This would typically execute a specific command
    // For now, we'll just update the step status
    const updatedSteps = [...executionSteps];
    updatedSteps[stepIndex] = {
      ...updatedSteps[stepIndex],
      status: StepStatus.RUNNING
    };
    
    setExecutionSteps(updatedSteps);
    
    toast({
      title: "Executing step",
      description: `Running: ${executionSteps[stepIndex].description}`,
    });
    
    // Simulate completion after a delay
    setTimeout(() => {
      updatedSteps[stepIndex] = {
        ...updatedSteps[stepIndex],
        status: StepStatus.SUCCESS,
        output: "Command executed successfully (simulation)"
      };
      
      setExecutionSteps([...updatedSteps]);
    }, 1500);
  };
  
  // Run all steps in sequence
  const handleRunAll = () => {
    toast({
      title: "Running all commands",
      description: "Executing all commands in sequence...",
    });
    
    // Implementation would typically be more complex, with proper error handling
    // and actual command execution via API
  };
  
  // Run steps one by one with confirmations
  const handleRunStepByStep = () => {
    toast({
      title: "Step by step execution",
      description: "Please use the 'Run' button for each step to proceed.",
    });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Text Inscription</h2>
        <div className="flex items-center space-x-2">
          <Label htmlFor="batch-mode" className="cursor-pointer">
            Batch Mode
          </Label>
          <Switch
            id="batch-mode"
            checked={isBatchMode}
            onCheckedChange={handleBatchModeChange}
          />
        </div>
      </div>
      
      {isBatchMode ? (
        <>
          <BatchTextManager
            textItems={textItems}
            processingItems={processingTextItems}
            onAddTextItem={handleAddTextItem}
            onRemoveTextItem={handleRemoveTextItem}
            onToggleTextItemSelection={handleToggleTextItemSelection}
            onToggleOptimization={handleToggleOptimization}
            onRemoveAllTextItems={handleRemoveAllTextItems}
            onUpdateTextContent={handleUpdateTextContent}
            onUpdateTextName={handleUpdateTextName}
          />
          
          {textItems.length > 0 && (
            <>
              <ConfigForm
                onGenerateCommands={handleGenerateCommands}
                isBatchMode={true}
                batchFileCount={textItems.filter(item => item.selected).length}
              />
              
              {commands && (
                <>
                  <CommandSection
                    commands={commands}
                    steps={executionSteps}
                    onRunAll={handleRunAll}
                    onRunStepByStep={handleRunStepByStep}
                    onExecuteStep={handleExecuteStep}
                  />
                  
                  <BatchProcessingProgress
                    batchState={batchState}
                    onStartProcessing={handleStartProcessing}
                    onStopProcessing={handleStopProcessing}
                    onResetProcessing={handleResetProcessing}
                  />
                </>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Text Content</CardTitle>
            </CardHeader>
            <CardContent>
              <TextEditor
                onChange={handleTextContentChange}
                initialText={textContent}
                fileName={fileName}
                onSave={(text, name) => {
                  setTextContent(text);
                  setFileName(name);
                }}
              />
            </CardContent>
          </Card>
          
          <ConfigForm
            onGenerateCommands={handleGenerateCommands}
          />
          
          {commands && (
            <CommandSection
              commands={commands}
              steps={executionSteps}
              onRunAll={handleRunAll}
              onRunStepByStep={handleRunStepByStep}
              onExecuteStep={handleExecuteStep}
            />
          )}
        </>
      )}
      
      <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-800">
        <Info className="h-4 w-4" />
        <AlertTitle>About Text Inscriptions</AlertTitle>
        <AlertDescription>
          Text inscriptions allow you to permanently store text content on the Bitcoin blockchain. 
          Keep in mind that larger text files may require higher fees for inscription.
          Recommended maximum size is 60KB.
        </AlertDescription>
      </Alert>
    </div>
  );
}