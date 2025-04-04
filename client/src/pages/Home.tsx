import React, { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm, UseFormReturn } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import FileUploader from "@/components/FileUploader";
import ImagePreview from "@/components/ImagePreview";
import ConfigForm from "@/components/ConfigForm";
import CommandSection from "@/components/CommandSection";
import ResultSection from "@/components/ResultSection";
import CacheManager from "@/components/CacheManager";
import RareSatSelector from "@/components/RareSatSelector";
import BatchFileManager from "@/components/BatchFileManager";
import BatchProcessingProgress from "@/components/BatchProcessingProgress";
import ThemeToggle from "@/components/ThemeToggle";
import SectionTitle from "@/components/SectionTitle";
import MetadataInput from "@/components/MetadataInput";
import ErrorBoundary from "@/components/ErrorBoundary";
import SNSRegister from "@/components/SNSRegister";
import SNSRegisterNew from "@/components/SNSRegisterNew";
import TextInscriptionSection from "@/components/TextInscriptionSection";
import MarkdownInscriptionSection from "@/components/MarkdownInscriptionSection";
import BitmapInscriptionSection from "@/components/BitmapInscriptionSection";
import Brc20InscriptionSection from "@/components/Brc20InscriptionSection";
import RecursiveInscriptionSection from "@/components/RecursiveInscriptionSection";
import InscriptionStatusDisplay from "@/components/InscriptionStatusDisplay";
import { ChevronDown, RefreshCw, Info, FileText, FileCode, Image, Grid, Bitcoin, Link2 } from "lucide-react";
import { UploadedFile, ConfigOptions, CommandsData, ExecutionStep, StepStatus, InscriptionResult, BatchProcessingItem, BatchProcessingState } from "@/lib/types";
import { apiRequest } from "@/lib/queryClient";

export default function Home() {
  // Single file mode state
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [commandsData, setCommandsData] = useState<CommandsData | null>(null);
  const [steps, setSteps] = useState<ExecutionStep[]>([
    { status: StepStatus.DEFAULT, output: "" },
    { status: StepStatus.DEFAULT, output: "" },
    { status: StepStatus.DEFAULT, output: "" }
  ]);
  const [result, setResult] = useState<InscriptionResult | null>(null);
  
  // Batch mode state
  const [batchMode, setBatchMode] = useState(false);
  const [batchFiles, setBatchFiles] = useState<UploadedFile[]>([]);
  const [batchProcessingState, setBatchProcessingState] = useState<BatchProcessingState>({
    inProgress: false,
    items: [],
    currentItemIndex: 0,
    completedCount: 0,
    failedCount: 0
  });
  
  // Shared state
  const [cacheOpen, setCacheOpen] = useState(false);
  const [optimizeImage, setOptimizeImage] = useState(false);
  const [showParentInscription, setShowParentInscription] = useState(false);
  const [parentInscriptionId, setParentInscriptionId] = useState('');
  const [loading, setLoading] = useState(false);
  const configForm = useForm<ConfigOptions>({
    defaultValues: {
      containerPath: "/ord/data/",
      feeRate: "4",
      useSatRarity: false,
      selectedSat: "",
    }
  });
  
  // Form for metadata and destination
  const metadataForm = useForm({
    defaultValues: {
      includeMetadata: false,
      metadataStorage: "on-chain" as const,
      destination: "",
      metadataJson: `{
  "name": "My Ordinals Inscription",
  "description": "A unique digital artifact on Bitcoin",
  "attributes": [
    {
      "trait_type": "Type",
      "value": "Image"
    }
  ]
}`
    }
  });
  
  const handleFileUpload = (newFile: UploadedFile) => {
    setUploadedFile(newFile);
    setCommandsData(null);
    setOptimizeImage(false);
    setSteps([
      { status: StepStatus.DEFAULT, output: "" },
      { status: StepStatus.DEFAULT, output: "" },
      { status: StepStatus.DEFAULT, output: "" }
    ]);
    setResult(null);
  };
  
  const handleFileRemove = () => {
    setUploadedFile(null);
    setCommandsData(null);
    setOptimizeImage(false);
    setSteps([
      { status: StepStatus.DEFAULT, output: "" },
      { status: StepStatus.DEFAULT, output: "" },
      { status: StepStatus.DEFAULT, output: "" }
    ]);
    setResult(null);
  };
  
  const handleToggleOptimization = (optimize: boolean) => {
    setOptimizeImage(optimize);
    // If a form is rendered in ConfigForm, update its optimizeImage value
    const configForm = document.querySelector('form[name="config-form"]');
    if (configForm) {
      const event = new CustomEvent('update-optimization', { detail: { optimize } });
      configForm.dispatchEvent(event);
    }
  };
  
  const handleGenerateCommands = async (config: ConfigOptions) => {
    if (!uploadedFile) return;
    
    try {
      const metadataValues = metadataForm.getValues();
      
      // Include the optimize image setting from the file preview component
      // and metadata from the metadata form
      const mergedConfig: ConfigOptions = {
        ...config,
        optimizeImage: optimizeImage,
        includeMetadata: metadataValues.includeMetadata,
        metadataStorage: "on-chain" as const,
        metadataJson: metadataValues.metadataJson,
        destination: metadataValues.destination,
        parentId: showParentInscription ? parentInscriptionId : undefined
      };
      
      const formData = new FormData();
      formData.append('file', uploadedFile.file);
      formData.append('config', JSON.stringify(mergedConfig));
      
      const response = await apiRequest('POST', '/api/commands/generate', formData, true);
      const data = await response.json();
      
      setCommandsData(data);
    } catch (error) {
      console.error('Error generating commands:', error);
    }
  };
  
  const runAllCommands = async () => {
    if (!commandsData || !uploadedFile) return;
    
    try {
      // Start server (Step 1)
      updateStepStatus(0, StepStatus.PROGRESS);
      
      // Get the port from the commands
      const portMatch = commandsData.commands[0].match(/http\.server\s+(\d+)/);
      const port = portMatch ? portMatch[1] : '8000';
      
      const formData = new FormData();
      formData.append('file', uploadedFile.file);
      formData.append('port', port);
      // Pass the optimizeImage config for image processing
      formData.append('config', JSON.stringify({ optimizeImage }));
      
      const serverRes = await apiRequest('POST', '/api/execute/serve', formData, true);
      const serverData = await serverRes.json();
      
      updateStepStatus(0, StepStatus.SUCCESS, serverData.output);
      
      // Download file in container (Step 2)
      updateStepStatus(1, StepStatus.PROGRESS);
      
      const downloadRes = await apiRequest('POST', '/api/execute/download', {
        fileName: commandsData.fileName,
        command: commandsData.commands[1]
      });
      const downloadData = await downloadRes.json();
      
      if (downloadData.error) {
        updateStepStatus(1, StepStatus.ERROR, downloadData.output);
        return;
      }
      
      updateStepStatus(1, StepStatus.SUCCESS, downloadData.output);
      
      // Inscribe (Step 3)
      updateStepStatus(2, StepStatus.PROGRESS);
      
      const inscribeRes = await apiRequest('POST', '/api/execute/inscribe', {
        command: commandsData.commands[2],
        fileName: uploadedFile.file.name,
        fileType: uploadedFile.file.type,
        satoshiType: configForm.getValues().useSatRarity ? configForm.getValues().selectedSatoshi : undefined
      });
      const inscribeData = await inscribeRes.json();
      
      if (inscribeData.error) {
        updateStepStatus(2, StepStatus.ERROR, inscribeData.output);
        setResult({
          success: false,
          errorMessage: inscribeData.output
        });
        return;
      }
      
      updateStepStatus(2, StepStatus.SUCCESS, inscribeData.output);
      
      // Parse result and set success
      setResult({
        success: true,
        inscriptionId: inscribeData.inscriptionId,
        transactionId: inscribeData.transactionId,
        feePaid: inscribeData.feePaid
      });
      
    } catch (error) {
      console.error('Error executing commands:', error);
      const step = steps.findIndex(s => s.status === StepStatus.PROGRESS);
      if (step !== -1) {
        updateStepStatus(step, StepStatus.ERROR, String(error));
      }
      
      setResult({
        success: false,
        errorMessage: String(error)
      });
    }
  };
  
  const runStepByStep = async () => {
    if (!commandsData || !uploadedFile) return;
    
    try {
      // Only set the first step to ready
      const newSteps = [...steps];
      newSteps[0] = { ...newSteps[0], status: StepStatus.READY };
      setSteps(newSteps);
    } catch (error) {
      console.error('Error starting step-by-step execution:', error);
    }
  };
  
  const executeStep = async (stepIndex: number) => {
    if (!commandsData || !uploadedFile || stepIndex < 0 || stepIndex > 2) return;
    
    try {
      updateStepStatus(stepIndex, StepStatus.PROGRESS);
      
      let response;
      let data;
      
      if (stepIndex === 0) {
        // Execute server step
        // Get the port from the commands
        const portMatch = commandsData.commands[0].match(/http\.server\s+(\d+)/);
        const port = portMatch ? portMatch[1] : '8000';
        
        const formData = new FormData();
        formData.append('file', uploadedFile.file);
        formData.append('port', port);
        // Pass the optimizeImage config for image processing
        formData.append('config', JSON.stringify({ optimizeImage }));
        
        response = await apiRequest('POST', '/api/execute/serve', formData, true);
        data = await response.json();
        
        if (data.error) {
          updateStepStatus(stepIndex, StepStatus.ERROR, data.output);
          return;
        }
        
        updateStepStatus(stepIndex, StepStatus.SUCCESS, data.output);
        
        // Set next step to ready
        if (stepIndex < 2) {
          const newSteps = [...steps];
          newSteps[stepIndex + 1] = { ...newSteps[stepIndex + 1], status: StepStatus.READY };
          setSteps(newSteps);
        }
      } else if (stepIndex === 1) {
        // Execute download step
        response = await apiRequest('POST', '/api/execute/download', {
          fileName: commandsData.fileName,
          command: commandsData.commands[1]
        });
        data = await response.json();
        
        if (data.error) {
          updateStepStatus(stepIndex, StepStatus.ERROR, data.output);
          return;
        }
        
        updateStepStatus(stepIndex, StepStatus.SUCCESS, data.output);
        
        // Set next step to ready
        if (stepIndex < 2) {
          const newSteps = [...steps];
          newSteps[stepIndex + 1] = { ...newSteps[stepIndex + 1], status: StepStatus.READY };
          setSteps(newSteps);
        }
      } else if (stepIndex === 2) {
        // Execute inscribe step
        response = await apiRequest('POST', '/api/execute/inscribe', {
          command: commandsData.commands[2],
          fileName: uploadedFile.file.name,
          fileType: uploadedFile.file.type,
          satoshiType: configForm.getValues().useSatRarity ? configForm.getValues().selectedSatoshi : undefined
        });
        data = await response.json();
        
        if (data.error) {
          updateStepStatus(stepIndex, StepStatus.ERROR, data.output);
          setResult({
            success: false,
            errorMessage: data.output
          });
          return;
        }
        
        updateStepStatus(stepIndex, StepStatus.SUCCESS, data.output);
        
        // Check if we have an inscription status ID
        if (data.inscriptionStatusId) {
          console.log('Inscription status created with ID:', data.inscriptionStatusId);
          
          // Optional: You could manually refresh the inscription status display here
          // but the component handles polling on its own
        }
        
        // Parse result and set success
        setResult({
          success: true,
          inscriptionId: data.inscriptionId,
          transactionId: data.transactionId,
          feePaid: data.feePaid
        });
      }
    } catch (error) {
      console.error(`Error executing step ${stepIndex + 1}:`, error);
      updateStepStatus(stepIndex, StepStatus.ERROR, String(error));
      
      if (stepIndex === 2) {
        setResult({
          success: false,
          errorMessage: String(error)
        });
      }
    }
  };
  
  const updateStepStatus = (stepIndex: number, status: StepStatus, output: string = '') => {
    const newSteps = [...steps];
    newSteps[stepIndex] = { status, output };
    setSteps(newSteps);
  };
  
  const resetApplication = () => {
    setUploadedFile(null);
    setCommandsData(null);
    setSteps([
      { status: StepStatus.DEFAULT, output: "" },
      { status: StepStatus.DEFAULT, output: "" },
      { status: StepStatus.DEFAULT, output: "" }
    ]);
    setResult(null);
  };
  
  const tryAgain = () => {
    setResult(null);
  };
  
  // Batch mode functions
  const handleBatchModeToggle = (enabled: boolean) => {
    setBatchMode(enabled);
    configForm.setValue("batchMode", enabled);
    
    // Reset single file mode if switching to batch mode
    if (enabled && uploadedFile) {
      handleFileRemove();
    }
    
    // Reset batch files if switching to single file mode
    if (!enabled && batchFiles.length > 0) {
      setBatchFiles([]);
      setBatchProcessingState({
        inProgress: false,
        items: [],
        currentItemIndex: 0,
        completedCount: 0,
        failedCount: 0
      });
    }
  };
  
  const handleFilesUpload = (files: UploadedFile[]) => {
    setBatchFiles(prevFiles => {
      // Add only new files that don't exist in the current list (avoid duplicates)
      const newFiles = files.filter(file => 
        !prevFiles.some(existingFile => existingFile.id === file.id)
      );
      return [...prevFiles, ...newFiles];
    });
  };
  
  const handleBatchFileRemove = (fileId: string) => {
    setBatchFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
    
    // Also remove from batch processing state if it exists
    setBatchProcessingState(prev => {
      const updatedItems = prev.items.filter(item => item.fileId !== fileId);
      return {
        ...prev,
        items: updatedItems,
        completedCount: updatedItems.filter(item => item.status === 'completed').length,
        failedCount: updatedItems.filter(item => item.status === 'failed').length
      };
    });
  };
  
  const handleRemoveAllBatchFiles = () => {
    setBatchFiles([]);
    setBatchProcessingState({
      inProgress: false,
      items: [],
      currentItemIndex: 0,
      completedCount: 0,
      failedCount: 0
    });
  };
  
  const handleToggleFileSelection = (fileId: string, selected: boolean) => {
    setBatchFiles(prevFiles => 
      prevFiles.map(file => 
        file.id === fileId ? { ...file, selected } : file
      )
    );
  };
  
  const handleToggleBatchOptimization = (fileId: string, optimize: boolean) => {
    setBatchFiles(prevFiles => 
      prevFiles.map(file => 
        file.id === fileId ? { ...file, optimizationAvailable: optimize } : file
      )
    );
  };
  
  const prepareBatchProcessing = async (config: ConfigOptions) => {
    // Get only selected files for processing
    const selectedFiles = batchFiles.filter(file => file.selected);
    
    if (selectedFiles.length === 0) {
      alert('Please select at least one file for batch processing');
      return;
    }
    
    try {
      // Start loading
      setLoading(true);
      
      // Get metadata values
      const metadataValues = metadataForm.getValues();
      
      // Create batch processing items for each selected file
      const batchItems: BatchProcessingItem[] = selectedFiles.map(file => ({
        fileId: file.id || '',
        fileName: file.file.name,
        status: 'pending',
        steps: [
          { status: StepStatus.DEFAULT, output: '' },
          { status: StepStatus.DEFAULT, output: '' },
          { status: StepStatus.DEFAULT, output: '' }
        ]
      }));
      
      // Initialize batch processing state
      setBatchProcessingState({
        inProgress: false,
        items: batchItems,
        currentItemIndex: 0,
        completedCount: 0,
        failedCount: 0
      });
      
      // Generate commands for each file and prepare them for processing
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        // Create a complete config that includes metadata and optimization settings
        const mergedConfig: ConfigOptions = {
          ...config,
          optimizeImage: file.optimizationAvailable || false,
          includeMetadata: metadataValues.includeMetadata,
          metadataStorage: "on-chain" as const,
          destination: metadataValues.destination,
          parentId: showParentInscription ? parentInscriptionId : undefined,
          batchMode: true,
          // Apply rare sats in batch mode (keep the selected satoshi for each file)
          useSatRarity: config.useSatRarity,
          selectedSatoshi: config.selectedSatoshi
        };
        
        // Handle individual metadata per file if in batch mode
        if (metadataValues.includeMetadata && metadataValues.metadataJson) {
          try {
            // Find the index of this file in the selectedFiles array
            const fileIndex = selectedFiles.findIndex(f => f.id === file.id);
            
            // Parse the metadata JSON to check if it's an array
            const parsedMetadata = JSON.parse(metadataValues.metadataJson);
            
            if (Array.isArray(parsedMetadata) && fileIndex >= 0) {
              if (parsedMetadata.length > fileIndex) {
                // Extract the specific metadata for this file and use it
                mergedConfig.metadataJson = JSON.stringify(parsedMetadata[fileIndex]);
                console.log(`Batch prepare: Using metadata at index ${fileIndex} for file ${file.file.name}`);
              } else {
                // Not enough metadata entries, use the last one as fallback
                const lastIndex = parsedMetadata.length - 1;
                mergedConfig.metadataJson = JSON.stringify(parsedMetadata[lastIndex >= 0 ? lastIndex : 0]);
                console.warn(`Batch prepare: Not enough metadata entries for file ${fileIndex + 1}. Using entry ${lastIndex >= 0 ? lastIndex + 1 : 1}.`);
              }
            } else {
              // If it's not an array, use the metadata as is for all files
              mergedConfig.metadataJson = metadataValues.metadataJson;
            }
          } catch (e) {
            console.error('Error parsing metadata JSON in prepareBatchProcessing:', e);
            // In case of error, use the original metadata
            mergedConfig.metadataJson = metadataValues.metadataJson;
          }
        } else {
          mergedConfig.metadataJson = metadataValues.metadataJson;
        }
        
        try {
          // First upload the file
          const uploadFormData = new FormData();
          uploadFormData.append('file', file.file);
          uploadFormData.append('config', JSON.stringify(mergedConfig));
          
          await apiRequest('POST', '/api/upload', uploadFormData, true);
          
          // Then generate commands
          const commandsFormData = new FormData();
          commandsFormData.append('file', file.file);
          commandsFormData.append('config', JSON.stringify(mergedConfig));
          
          const response = await apiRequest('POST', '/api/commands/generate', commandsFormData, true);
          const data = await response.json();
          
          // Update the batch item with the generated commands
          setBatchProcessingState(prev => {
            const updatedItems = [...prev.items];
            const itemIndex = updatedItems.findIndex(item => item.fileId === file.id);
            
            if (itemIndex !== -1) {
              updatedItems[itemIndex] = {
                ...updatedItems[itemIndex],
                commands: data.commands
              };
            }
            
            return {
              ...prev,
              items: updatedItems
            };
          });
        } catch (error) {
          console.error(`Error preparing file ${file.file.name}:`, error);
          
          // Mark this item as failed
          setBatchProcessingState(prev => {
            const updatedItems = [...prev.items];
            const itemIndex = updatedItems.findIndex(item => item.fileId === file.id);
            
            if (itemIndex !== -1) {
              updatedItems[itemIndex] = {
                ...updatedItems[itemIndex],
                status: 'failed',
                steps: [
                  { status: StepStatus.ERROR, output: `Failed to prepare file: ${error}` },
                  { status: StepStatus.DEFAULT, output: '' },
                  { status: StepStatus.DEFAULT, output: '' }
                ]
              };
            }
            
            return {
              ...prev,
              items: updatedItems,
              failedCount: prev.failedCount + 1
            };
          });
        }
      }
      
    } catch (error) {
      console.error('Error preparing batch processing:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const startBatchProcessing = async () => {
    if (batchProcessingState.inProgress || batchProcessingState.items.length === 0) return;
    
    // Start or resume batch processing
    setBatchProcessingState(prev => ({
      ...prev,
      inProgress: true
    }));
    
    // Process the next item
    await processBatchItem();
  };
  
  const stopBatchProcessing = () => {
    setBatchProcessingState(prev => ({
      ...prev,
      inProgress: false
    }));
  };
  
  const resetBatchProcessing = () => {
    // Reset all items to pending state
    setBatchProcessingState(prev => ({
      ...prev,
      inProgress: false,
      items: prev.items.map(item => ({
        ...item,
        status: 'pending',
        steps: [
          { status: StepStatus.DEFAULT, output: '' },
          { status: StepStatus.DEFAULT, output: '' },
          { status: StepStatus.DEFAULT, output: '' }
        ],
        result: undefined
      })),
      currentItemIndex: 0,
      completedCount: 0,
      failedCount: 0
    }));
  };
  
  // Process a single item in the batch
  const processBatchItem = async () => {
    if (!batchProcessingState.inProgress) return;
    
    const { items, currentItemIndex } = batchProcessingState;
    if (currentItemIndex >= items.length) {
      // All items are processed
      setBatchProcessingState(prev => ({
        ...prev,
        inProgress: false
      }));
      return;
    }
    
    const currentItem = items[currentItemIndex];
    if (currentItem.status !== 'pending') {
      // Skip already processed items
      setBatchProcessingState(prev => ({
        ...prev,
        currentItemIndex: prev.currentItemIndex + 1
      }));
      await processBatchItem();
      return;
    }
    
    // Update the current item status
    updateBatchItemStatus(currentItem.fileId, 'processing');
    
    try {
      // Get the file from the batch files
      const file = batchFiles.find(f => f.id === currentItem.fileId);
      if (!file) {
        throw new Error(`File with ID ${currentItem.fileId} not found`);
      }
      
      // Get global config
      const config = configForm.getValues();
      const metadataValues = metadataForm.getValues();
      
      // Generate commands for this file
      await generateCommandsForBatchItem(file, currentItem, config, metadataValues);
      
      // Execute commands for this file
      const result = await executeCommandsForBatchItem(currentItem);
      
      // Update the current item result
      updateBatchItemResult(currentItem.fileId, result);
      
      // Move to the next item
      setBatchProcessingState(prev => ({
        ...prev,
        currentItemIndex: prev.currentItemIndex + 1,
        completedCount: prev.completedCount + (result.success ? 1 : 0),
        failedCount: prev.failedCount + (result.success ? 0 : 1)
      }));
      
      // Process the next item
      setTimeout(() => processBatchItem(), 1000);
    } catch (error) {
      console.error('Error processing batch item:', error);
      
      // Update the current item as failed
      updateBatchItemStatus(currentItem.fileId, 'failed');
      updateBatchItemResult(currentItem.fileId, {
        success: false,
        errorMessage: String(error)
      });
      
      // Move to the next item
      setBatchProcessingState(prev => ({
        ...prev,
        currentItemIndex: prev.currentItemIndex + 1,
        failedCount: prev.failedCount + 1
      }));
      
      // Process the next item
      setTimeout(() => processBatchItem(), 1000);
    }
  };
  
  // Generate commands for a batch item
  const generateCommandsForBatchItem = async (
    file: UploadedFile, 
    item: BatchProcessingItem, 
    config: ConfigOptions,
    metadataValues: any
  ) => {
    // Create a merged config similar to the single file mode
    const mergedConfig: ConfigOptions = {
      ...config,
      optimizeImage: !!file.optimizationAvailable,
      includeMetadata: metadataValues.includeMetadata,
      metadataStorage: "on-chain" as const,
      destination: metadataValues.destination,
      parentId: showParentInscription ? parentInscriptionId : undefined,
      batchMode: true,
      // Apply rare sats in batch mode (keep the selected satoshi for each file)
      useSatRarity: config.useSatRarity,
      selectedSatoshi: config.selectedSatoshi
    };
    
    // Handle individual metadata per file if in batch mode and metadata is an array
    if (metadataValues.includeMetadata && metadataValues.metadataJson) {
      try {
        // Find the index of this file in the batch files array
        const fileIndex = batchFiles.findIndex(f => f.id === file.id);
        
        // Parse the metadata JSON to check if it's an array
        const parsedMetadata = JSON.parse(metadataValues.metadataJson);
        
        if (Array.isArray(parsedMetadata) && fileIndex >= 0) {
          if (parsedMetadata.length > fileIndex) {
            // Extract the specific metadata for this file and use it
            mergedConfig.metadataJson = JSON.stringify(parsedMetadata[fileIndex]);
            console.log(`Using metadata at index ${fileIndex} for file ${file.file.name}`);
          } else {
            // Not enough metadata entries, use the last one as fallback
            const lastIndex = parsedMetadata.length - 1;
            mergedConfig.metadataJson = JSON.stringify(parsedMetadata[lastIndex >= 0 ? lastIndex : 0]);
            console.warn(`Not enough metadata entries for file ${fileIndex + 1}. Using entry ${lastIndex >= 0 ? lastIndex + 1 : 1}.`);
          }
        } else {
          // If it's not an array, use the metadata as is for all files
          mergedConfig.metadataJson = metadataValues.metadataJson;
        }
      } catch (e) {
        console.error('Error parsing metadata JSON:', e);
        // In case of error, use the original metadata
        mergedConfig.metadataJson = metadataValues.metadataJson;
      }
    } else {
      mergedConfig.metadataJson = metadataValues.metadataJson;
    }
    
    const formData = new FormData();
    formData.append('file', file.file);
    formData.append('config', JSON.stringify(mergedConfig));
    
    try {
      const response = await apiRequest('POST', '/api/commands/generate', formData, true);
      const data = await response.json();
      
      // Update batch item with commands
      setBatchProcessingState(prev => ({
        ...prev,
        items: prev.items.map(i => 
          i.fileId === item.fileId ? { ...i, commands: data.commands } : i
        )
      }));
      
      return data;
    } catch (error) {
      console.error('Error generating commands for batch item:', error);
      throw error;
    }
  };
  
  // Execute commands for a batch item
  const executeCommandsForBatchItem = async (item: BatchProcessingItem): Promise<InscriptionResult> => {
    if (!item.commands) {
      throw new Error('No commands available for this item');
    }
    
    try {
      // Get the file from the batch files
      const file = batchFiles.find(f => f.id === item.fileId);
      if (!file) {
        throw new Error(`File with ID ${item.fileId} not found`);
      }
      
      // Update step 1 (Start server)
      updateBatchItemStep(item.fileId, 0, StepStatus.PROGRESS);
      
      // Get the port from the commands
      const portMatch = item.commands[0].match(/http\.server\s+(\d+)/);
      const port = portMatch ? portMatch[1] : '8000';
      
      const formData = new FormData();
      formData.append('file', file.file);
      formData.append('port', port);
      formData.append('config', JSON.stringify({ 
        optimizeImage: !!file.optimizationAvailable,
        batchMode: true
      }));
      
      // Execute server step
      const serverRes = await apiRequest('POST', '/api/execute/serve', formData, true);
      const serverData = await serverRes.json();
      
      if (serverData.error) {
        updateBatchItemStep(item.fileId, 0, StepStatus.ERROR, serverData.output);
        return {
          success: false,
          errorMessage: serverData.output
        };
      }
      
      updateBatchItemStep(item.fileId, 0, StepStatus.SUCCESS, serverData.output);
      
      // Update step 2 (Download file)
      updateBatchItemStep(item.fileId, 1, StepStatus.PROGRESS);
      
      // Execute download step
      const downloadRes = await apiRequest('POST', '/api/execute/download', {
        fileName: file.file.name,
        command: item.commands[1]
      });
      const downloadData = await downloadRes.json();
      
      if (downloadData.error) {
        updateBatchItemStep(item.fileId, 1, StepStatus.ERROR, downloadData.output);
        return {
          success: false,
          errorMessage: downloadData.output
        };
      }
      
      updateBatchItemStep(item.fileId, 1, StepStatus.SUCCESS, downloadData.output);
      
      // Update step 3 (Inscribe)
      updateBatchItemStep(item.fileId, 2, StepStatus.PROGRESS);
      
      // Execute inscribe step
      const inscribeRes = await apiRequest('POST', '/api/execute/inscribe', {
        command: item.commands[2],
        fileName: file.file.name,
        fileType: file.file.type,
        satoshiType: configForm.getValues().useSatRarity ? configForm.getValues().selectedSatoshi : undefined
      });
      const inscribeData = await inscribeRes.json();
      
      if (inscribeData.error) {
        updateBatchItemStep(item.fileId, 2, StepStatus.ERROR, inscribeData.output);
        return {
          success: false,
          errorMessage: inscribeData.output
        };
      }
      
      updateBatchItemStep(item.fileId, 2, StepStatus.SUCCESS, inscribeData.output);
      
      // Check if we have an inscription status ID
      if (inscribeData.inscriptionStatusId) {
        console.log('Batch inscription status created with ID:', inscribeData.inscriptionStatusId);
        // Status tracking will happen automatically via polling
      }
      
      // Return successful result
      return {
        success: true,
        inscriptionId: inscribeData.inscriptionId,
        transactionId: inscribeData.transactionId,
        feePaid: inscribeData.feePaid
      };
    } catch (error) {
      console.error('Error executing commands for batch item:', error);
      
      // Find the current step in progress and update it as error
      const stepIndex = item.steps.findIndex(s => s.status === StepStatus.PROGRESS);
      if (stepIndex !== -1) {
        updateBatchItemStep(item.fileId, stepIndex, StepStatus.ERROR, String(error));
      }
      
      return {
        success: false,
        errorMessage: String(error)
      };
    }
  };
  
  // Helper functions for updating batch processing state
  const updateBatchItemStatus = (fileId: string, status: 'pending' | 'processing' | 'completed' | 'failed') => {
    setBatchProcessingState(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.fileId === fileId ? { ...item, status } : item
      )
    }));
  };
  
  const updateBatchItemStep = (fileId: string, stepIndex: number, status: StepStatus, output: string = '') => {
    setBatchProcessingState(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.fileId === fileId) {
          const newSteps = [...item.steps];
          newSteps[stepIndex] = { status, output };
          return { ...item, steps: newSteps };
        }
        return item;
      })
    }));
  };
  
  const updateBatchItemResult = (fileId: string, result: InscriptionResult) => {
    setBatchProcessingState(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.fileId === fileId ? { 
          ...item, 
          status: result.success ? 'completed' : 'failed',
          result 
        } : item
      )
    }));
  };
  
  // Batch processing is now triggered by the form submit in the transaction fee section
  
  return (
    <div className="bg-orange-50 dark:bg-navy-950 min-h-screen font-sans text-gray-800 dark:text-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="mb-8 relative">
          <div className="absolute right-2 top-2">
            <ThemeToggle />
          </div>
          <SectionTitle 
            title="Upload, configure, and inscribe images to your Ordinals node" 
            isMainTitle={true} 
          />
        </header>

        <Card className="overflow-hidden border border-orange-200 dark:border-navy-700 shadow-lg rounded-xl dark:bg-navy-800">
          <CardContent className="p-0">
            <section className="p-6 border-b border-orange-100 dark:border-navy-700 bg-orange-50 dark:bg-navy-800">
              <SectionTitle title="Inscription Tools" />
              <Tabs defaultValue="single" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="single" onClick={() => handleBatchModeToggle(false)}>
                    <Image className="h-4 w-4 mr-2" />
                    Image
                  </TabsTrigger>
                  <TabsTrigger value="batch" onClick={() => handleBatchModeToggle(true)}>
                    <Image className="h-4 w-4 mr-2" />
                    Batch Images
                  </TabsTrigger>
                  <TabsTrigger value="text">
                    <FileText className="h-4 w-4 mr-2" />
                    Text
                  </TabsTrigger>
                  <TabsTrigger value="markdown">
                    <FileCode className="h-4 w-4 mr-2" />
                    Markdown
                  </TabsTrigger>
                  <TabsTrigger value="bitmap">
                    <Grid className="h-4 w-4 mr-2" />
                    Bitmap
                  </TabsTrigger>
                  <TabsTrigger value="brc20">
                    <Bitcoin className="h-4 w-4 mr-2" />
                    BRC-20
                  </TabsTrigger>
                  <TabsTrigger value="recursive">
                    <Link2 className="h-4 w-4 mr-2" />
                    Recursive
                  </TabsTrigger>
                  <TabsTrigger value="sns">
                    SNS Names
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="single">
                  <FileUploader onFileUpload={handleFileUpload} />
                </TabsContent>
                
                <TabsContent value="batch">
                  <FileUploader 
                    onFileUpload={() => {}} // Single file mode disabled in batch mode
                    onFilesUpload={handleFilesUpload}
                    batchMode={true}
                  />
                  
                  {batchFiles.length > 0 && (
                    <div className="mt-6">
                      <BatchFileManager 
                        files={batchFiles}
                        processingItems={batchProcessingState.items}
                        onRemoveFile={handleBatchFileRemove}
                        onToggleFileSelection={handleToggleFileSelection}
                        onRemoveAllFiles={handleRemoveAllBatchFiles}
                        onToggleOptimization={handleToggleBatchOptimization}
                      />
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="text">
                  <ErrorBoundary>
                    <TextInscriptionSection />
                  </ErrorBoundary>
                </TabsContent>
                
                <TabsContent value="markdown">
                  <ErrorBoundary>
                    <MarkdownInscriptionSection />
                  </ErrorBoundary>
                </TabsContent>
                
                <TabsContent value="bitmap">
                  <ErrorBoundary>
                    <BitmapInscriptionSection 
                      defaultFeeRate={Number(configForm.getValues().feeRate)}
                      defaultDestinationAddress={metadataForm.getValues().destination}
                    />
                  </ErrorBoundary>
                </TabsContent>
                
                <TabsContent value="brc20">
                  <ErrorBoundary>
                    <Brc20InscriptionSection 
                      defaultFeeRate={Number(configForm.getValues().feeRate)}
                      defaultDestinationAddress={metadataForm.getValues().destination}
                    />
                  </ErrorBoundary>
                </TabsContent>
                
                <TabsContent value="recursive">
                  <ErrorBoundary>
                    <RecursiveInscriptionSection />
                  </ErrorBoundary>
                </TabsContent>
                
                <TabsContent value="sns">
                  <ErrorBoundary>
                    <SNSRegisterNew />
                  </ErrorBoundary>
                </TabsContent>
              </Tabs>
            </section>
            
            {/* Only show file preview in single file mode */}
            {!batchMode && uploadedFile && (
              <ImagePreview 
                file={uploadedFile} 
                onRemove={handleFileRemove}
                onToggleOptimization={handleToggleOptimization} 
              />
            )}
            
            {(!batchMode && uploadedFile || batchMode && batchFiles.length > 0) && (
              <section className="p-6 border-b border-orange-100 dark:border-navy-700 bg-white dark:bg-navy-900">
                <SectionTitle title="Destination Address" />
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Specify a Bitcoin address to receive the {batchMode ? "inscriptions" : "inscription"} (optional).
                  </p>
                </div>
                <div className="bg-orange-50 dark:bg-navy-800 p-4 rounded-lg mb-4">
                  <div className="mb-4 text-gray-700 dark:text-gray-300">
                    <label htmlFor="destination-address" className="block text-sm font-medium mb-1 text-orange-800 dark:text-orange-400">Bitcoin Address</label>
                    <input 
                      id="destination-address" 
                      type="text" 
                      placeholder="Enter Bitcoin address to receive the inscription"
                      className="w-full p-2 border border-orange-200 dark:border-navy-600 rounded-md 
                                bg-white dark:bg-navy-900 text-gray-800 dark:text-gray-200"
                      value={metadataForm.getValues().destination || ''} 
                      onChange={(e) => metadataForm.setValue('destination', e.target.value)}
                    />
                    <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                      If left empty, the {batchMode ? "inscriptions" : "inscription"} will be sent to the wallet's default address.
                    </p>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Switch 
                        id="parent-inscription-toggle"
                        checked={showParentInscription}
                        onCheckedChange={setShowParentInscription}
                      />
                      <label
                        htmlFor="parent-inscription-toggle"
                        className="text-sm font-medium leading-none text-orange-800 dark:text-orange-400 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Add Parent Inscription ID
                      </label>
                    </div>
                    
                    {showParentInscription && (
                      <div className="ml-7 mt-2">
                        <label htmlFor="parent-inscription-id" className="block text-sm font-medium mb-1 text-orange-800 dark:text-orange-400">Parent Inscription ID</label>
                        <input 
                          id="parent-inscription-id" 
                          type="text" 
                          placeholder="Enter parent inscription ID"
                          className="w-full p-2 border border-orange-200 dark:border-navy-600 rounded-md 
                                    bg-white dark:bg-navy-900 text-gray-800 dark:text-gray-200"
                          value={parentInscriptionId} 
                          onChange={(e) => setParentInscriptionId(e.target.value)}
                        />
                        <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                          Create {batchMode ? "child inscriptions" : "a child inscription"} under this parent inscription
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}
            
            {(!batchMode && uploadedFile || batchMode && batchFiles.length > 0) && (
              <section className="p-6 border-b border-orange-100 dark:border-navy-700 bg-white dark:bg-navy-900">
                <SectionTitle title="Metadata" />
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Add optional metadata to be stored with your {batchMode ? "inscriptions" : "inscription"} on-chain.
                    {batchMode && <span className="italic ml-1">(will be applied to all files in batch)</span>}
                  </p>
                </div>
                <Form {...metadataForm}>
                  <form className="space-y-4">
                    <ErrorBoundary>
                      <MetadataInput 
                        form={metadataForm} 
                        isBatchMode={batchMode}
                        batchFileCount={batchFiles.length}
                        batchFileNames={batchFiles.map(file => file.file.name)}
                      />
                    </ErrorBoundary>
                  </form>
                </Form>
              </section>
            )}

            {((!batchMode && uploadedFile) || (batchMode && batchFiles.length > 0)) && (
              <section className="p-6 border-b border-orange-100 dark:border-navy-700 bg-orange-50 dark:bg-navy-800">
                <SectionTitle title="Transaction Fee" />
                <ConfigForm 
                  onGenerateCommands={!batchMode ? handleGenerateCommands : prepareBatchProcessing}
                  uploadedFile={!batchMode ? uploadedFile : batchFiles.length > 0 ? batchFiles[0] : null}
                  isBatchMode={batchMode}
                  batchFileCount={batchFiles.length}
                />
              </section>
            )}
            
            {/* Show batch processing progress only after batch is prepared */}
            {batchMode && batchProcessingState.items.length > 0 && (
              <section className="p-6 border-b border-orange-100 dark:border-navy-700 bg-white dark:bg-navy-900">
                <SectionTitle title="Batch Processing" />
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Start processing the batch of files to create inscriptions.
                  </p>
                </div>
                <BatchProcessingProgress 
                  batchState={batchProcessingState}
                  onStartProcessing={startBatchProcessing}
                  onStopProcessing={stopBatchProcessing}
                  onResetProcessing={resetBatchProcessing}
                />
              </section>
            )}

            {(!batchMode && uploadedFile && configForm?.watch("useSatRarity")) && (
              <section className="p-6 border-b border-orange-100 dark:border-navy-700 bg-white dark:bg-navy-900">
                <SectionTitle title="Rare Sat Selection" />
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Select a rare satoshi from your wallet to use for this inscription.
                  </p>
                </div>
                <ErrorBoundary>
                  <RareSatSelector 
                    onSelect={(satoshi) => configForm.setValue("selectedSatoshi", satoshi)}
                    selectedSatoshi={configForm.watch("selectedSatoshi")}
                  />
                </ErrorBoundary>
              </section>
            )}

            {commandsData && (
              <section className="p-6 border-b border-orange-100 dark:border-navy-700 bg-orange-50 dark:bg-navy-800">
                <SectionTitle title="Execute Commands" />
                <CommandSection 
                  commands={commandsData.commands.join('\n')} 
                  steps={steps}
                  onRunAll={runAllCommands}
                  onRunStepByStep={runStepByStep}
                  onExecuteStep={executeStep}
                />
              </section>
            )}

            {result && (
              <section className="p-6 border-b border-orange-100 dark:border-navy-700 bg-orange-50 dark:bg-navy-800">
                <SectionTitle title="Results" />
                <ResultSection 
                  result={result} 
                  onReset={resetApplication}
                  onTryAgain={tryAgain}
                />
              </section>
            )}
            
            {/* Collapsible Cache Management Section */}
            <section className="p-6 bg-orange-50 dark:bg-navy-800">
              <Collapsible
                open={cacheOpen}
                onOpenChange={setCacheOpen}
                className="w-full"
              >
                <div className="flex items-center justify-between">
                  <SectionTitle title="Cache Management" className="mb-0" />
                  <CollapsibleTrigger asChild>
                    <button className="p-2 rounded-full hover:bg-orange-100 dark:hover:bg-navy-700 focus:outline-none transition-colors">
                      <ChevronDown className={`h-5 w-5 text-orange-600 dark:text-orange-400 transition-transform duration-200 ${cacheOpen ? 'transform rotate-180' : ''}`} />
                    </button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="mt-4">
                  <ErrorBoundary>
                    <div className="mb-6">
                      <InscriptionStatusDisplay />
                    </div>
                    <CacheManager />
                  </ErrorBoundary>
                </CollapsibleContent>
              </Collapsible>
            </section>
          </CardContent>
        </Card>

        <footer className="mt-8 text-center flex flex-col items-center space-y-2">
          <div className="inline-block px-6 py-2 bg-orange-600 dark:bg-orange-700 rounded-full">
            <p className="text-white font-medium text-sm">Ordinals Inscription Tool - For use with a local Ordinals node running in Docker</p>
          </div>
          <div className="flex items-center space-x-3 text-xs">
            <Link 
              href="/faq"
              className="text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
            >
              FAQ
            </Link>
            <span className="text-gray-400 dark:text-gray-600">|</span>
            <a 
              href="https://ordinarinos.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
            >
              Powered by Ordinarinos
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
