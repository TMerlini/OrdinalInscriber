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
import { ChevronDown, RefreshCw, Info, FileText, FileCode, Image, Grid, Bitcoin, Link2, CheckCircle, XCircle } from "lucide-react";
import { UploadedFile, ConfigOptions, CommandsData, ExecutionStep, StepStatus, InscriptionResult, BatchProcessingItem, BatchProcessingState } from "@/lib/types";
import { apiRequest } from "@/lib/queryClient";
import toast from "react-hot-toast";
import TimeoutHelpDialog from "@/components/TimeoutHelpDialog";
import CommandsOutput from "@/components/CommandsOutput";
import { Input } from "@/components/ui/input";

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
  
  // Environment detection
  const [isUmbrelEnvironment, setIsUmbrelEnvironment] = useState(false);
  
  // Shared state
  const [cacheOpen, setCacheOpen] = useState(false);
  const [optimizeImage, setOptimizeImage] = useState(false);
  const [showParentInscription, setShowParentInscription] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stepsComplete, setStepsComplete] = useState(false);
  
  // Add tracking for auto-execution
  const [isAutoExecuting, setIsAutoExecuting] = useState(false);
  
  const configForm = useForm<ConfigOptions>({
    defaultValues: {
      containerPath: "/ord/data/",
      feeRate: 4,
      useSatRarity: false,
      selectedSatoshi: "",
    }
  });
  
  // Form for metadata and destination
  const metadataForm = useForm({
    defaultValues: {
      destination: "",
      parentInscriptionId: "",
      includeMetadata: false,
      metadataJson: JSON.stringify({
        name: "",
        description: "",
      }, null, 2),
    }
  });
  
  // Check if we're in an Umbrel environment on component mount
  useEffect(() => {
    // Always use direct Docker access approach
    setIsUmbrelEnvironment(true);
    console.log('Environment detection: Using direct Docker access mode');
  }, []);
  
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
    try {
      setLoading(true);
      
      if (!uploadedFile) {
        toast.error("Please upload a file first");
        setLoading(false);
        return;
      }

      // Always use the direct docker-inscribe approach to avoid timeouts
      console.log('Using direct Docker inscribe method');
      
      // Create form data with file
      const formData = new FormData();
      formData.append('file', uploadedFile.file);
      
      // Add all configuration options for direct Docker inscribe
      const metadataValues = metadataForm.getValues();
      const configOptions = {
        optimizeImage,
        feeRate: config.feeRate || 4,
        destination: metadataValues.destination || undefined,
        includeMetadata: metadataValues.includeMetadata,
        metadataJson: metadataValues.includeMetadata ? metadataValues.metadataJson : undefined,
        parentId: showParentInscription ? metadataValues.parentInscriptionId : undefined,
        noLimitCheck: config.noLimitCheck,
        useSatRarity: config.useSatRarity,
        selectedSatoshi: config.selectedSatoshi,
        autoInscribe: config.autoExecute ? 'true' : 'false'
      };
      
      formData.append('config', JSON.stringify(configOptions));
      
      // Use the direct Docker inscribe endpoint
      const response = await apiRequest('POST', '/api/docker-inscribe', formData, true, 180000);
      const data = await response.json();
      
      if (data.error) {
        toast.error(`Error generating commands: ${data.output}`);
        setLoading(false);
        return;
      }
      
      // Process response
      const commandsData: CommandsData = {
        fileName: uploadedFile.file.name,
        commands: [
          'Docker file copy command (executed automatically)',
          'File prepared in container (completed)',
          data.inscribeCommand || 'Unknown command'
        ],
        fileUrl: data.containerFilePath || '',
        port: '8000'
      };
      
      setCommandsData(commandsData);
      
      // Reset steps
      setSteps([
        { status: StepStatus.SUCCESS, output: "File copied to container successfully" },
        { status: StepStatus.SUCCESS, output: "File prepared for inscription" },
        { status: data.auto_inscribed ? StepStatus.SUCCESS : StepStatus.READY, output: data.auto_inscribed ? data.output : "" }
      ]);
      
      // If auto-execution is enabled, handle the result
      if (config.autoExecute && data.auto_inscribed) {
        setResult({
          success: true,
          inscriptionId: data.inscriptionId,
          transactionId: data.transactionId,
          feePaid: data.feePaid
        });
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error generating commands:', error);
      toast.error(`Error: ${String(error)}`);
      setLoading(false);
    }
  };
  
  const runAllCommands = async () => {
    if (!batchProcessingState || batchProcessingState.status !== 'ready') {
      console.error('Cannot run commands - batch processing is not ready');
      return;
    }

    // Set batch processing state to 'running'
    setBatchProcessingState(prev => ({
      ...prev,
      status: 'running'
    }));

    // Find the first pending item
    const pendingItemIndex = batchProcessingState.items.findIndex(item => item.status === 'pending');
    
    if (pendingItemIndex === -1) {
      console.log('No pending items to process');
      setBatchProcessingState(prev => ({
        ...prev,
        status: 'completed'
      }));
      return;
    }

    // Start processing the first pending item
    processNextBatchItem(pendingItemIndex);
  };
  
  const processNextBatchItem = async (currentIndex: number) => {
    // Get the current item
    const currentItem = batchProcessingState.items[currentIndex];
    
    if (!currentItem) {
      console.error(`No batch item found at index ${currentIndex}`);
      return;
    }

    // Display which file we're processing
    console.log(`Processing batch item ${currentIndex + 1}/${batchProcessingState.items.length}: ${currentItem.fileName}`);

    try {
      // Execute commands for this item
      const result = await executeCommandsForBatchItem(currentItem, configForm.getValues());
      
      // Update the item status based on the execution result
      setBatchProcessingState(prev => {
        const updatedItems = [...prev.items];
        updatedItems[currentIndex] = {
          ...updatedItems[currentIndex],
          status: result.success ? 'completed' : 'failed',
          inscriptionId: result.inscriptionId,
          error: result.error
        };

        // Count completed and failed items
        const completedCount = updatedItems.filter(item => item.status === 'completed').length;
        const failedCount = updatedItems.filter(item => item.status === 'failed').length;
        const allProcessed = completedCount + failedCount === updatedItems.length;

        // Find the next pending item
        const nextItemIndex = updatedItems.findIndex((item, index) => index > currentIndex && item.status === 'pending');
        
        // If there's a next item, process it
        if (nextItemIndex !== -1) {
          // Process the next item after a short delay
          setTimeout(() => processNextBatchItem(nextItemIndex), 1000);
        }

        // Return the updated state
        return {
          ...prev,
          items: updatedItems,
          status: allProcessed ? 'completed' : 'running'
        };
      });
      
    } catch (error) {
      console.error(`Error processing batch item ${currentItem.fileName}:`, error);
      
      // Mark the item as failed
      setBatchProcessingState(prev => {
        const updatedItems = [...prev.items];
        updatedItems[currentIndex] = {
          ...updatedItems[currentIndex],
          status: 'failed',
          error: error instanceof Error ? error.message : String(error)
        };

        // Count completed and failed items
        const completedCount = updatedItems.filter(item => item.status === 'completed').length;
        const failedCount = updatedItems.filter(item => item.status === 'failed').length;
        const allProcessed = completedCount + failedCount === updatedItems.length;

        // Find the next pending item
        const nextItemIndex = updatedItems.findIndex((item, index) => index > currentIndex && item.status === 'pending');
        
        // If there's a next item, process it
        if (nextItemIndex !== -1) {
          // Process the next item after a short delay
          setTimeout(() => processNextBatchItem(nextItemIndex), 1000);
        }

        // Return the updated state
        return {
          ...prev,
          items: updatedItems,
          status: allProcessed ? 'completed' : 'running'
        };
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
  
  // Add a function to check container status for diagnostics
  const checkContainerStatus = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/container/status');
      if (!response.ok) {
        console.error('Failed to check container status:', await response.text());
        return false;
      }
      
      const data = await response.json();
      console.log('Container status check result:', data);
      
      // If there are serious issues with the container, show a helpful message
      if (data.status === 'error' || !data.exists) {
        console.error('Container issue detected:', data.message);
        toast.error(`Container issue detected: ${data.message}`, { 
          duration: 8000,
          icon: '⚠️'
        });
        return false;
      }
      
      if (!data.containerResponsive) {
        toast.error('The Ordinals container is not responding. It might be overloaded or experiencing issues.', {
          duration: 8000,
          icon: '⚠️'
        });
        return false;
      }
      
      if (!data.dataDirWritable) {
        toast.error('Cannot write to the data directory in the Ordinals container. Check container permissions.', {
          duration: 8000,
          icon: '⚠️'
        });
        return false;
      }
      
      // Show resource warnings if usage is high
      if (data.resources.cpuUsage && data.resources.cpuUsage.includes('%')) {
        const cpuValue = parseFloat(data.resources.cpuUsage);
        if (!isNaN(cpuValue) && cpuValue > 80) {
          toast.warning(`Container CPU usage is high (${data.resources.cpuUsage}). This may cause timeouts.`, {
            duration: 5000
          });
        }
      }
      
      // Container is healthy
      return true;
    } catch (error) {
      console.error('Error checking container status:', error);
      return false;
    }
  };
  
  // Modify the executeStep function to check container status before processing
  const executeStep = async (stepIndex: number) => {
    setLoading(true);
    
    try {
      console.log(`Executing step ${stepIndex}`);
      
      // Update current step status
      updateStepStatus(stepIndex, StepStatus.PROGRESS);
      
      if (stepIndex === 0) {
        // Check container status before proceeding
        await checkContainerStatus();
        
        // Step 1: Upload the file
        if (!uploadedFile) {
          throw new Error('No file selected');
        }
        
        // Handle file upload directly
        const formData = new FormData();
        formData.append('file', uploadedFile.file);
        
        // Add all configuration options
        const config = {
          feeRate: configForm.getValues().feeRate,
          destination: metadataForm.watch('destination'),
          parentId: metadataForm.watch('parentInscriptionId'),
          optimizeImage: optimizeImage,
          noLimitCheck: configForm.getValues().noLimitCheck,
          dryRun: configForm.getValues().dryRun,
          mimeType: configForm.getValues().mimeType,
          useSatRarity: configForm.getValues().useSatRarity,
          selectedSatoshi: configForm.getValues().selectedSatoshi,
          // Only include metadata if the checkbox is checked
          includeMetadata: metadataForm.getValues().includeMetadata,
        };
        
        // Add metadata if needed
        if (config.includeMetadata) {
          config.metadataJson = metadataForm.getValues().metadataJson;
        }
        
        // Add configuration to the form data
        Object.entries(config).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, value.toString());
          }
        });
        
        // Set up AbortController for timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 240000); // 4 minute client-side timeout
        
        try {
          // Use docker-inscribe endpoint directly
          const response = await fetch('/api/docker-inscribe', {
            method: 'POST',
            body: formData,
            signal: controller.signal
          });
          
          // Clear the timeout since we got a response
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to upload file');
          }
          
          const result = await response.json();
          
          // Store command results
          setResult({
            success: true,
            inscriptionId: result.inscriptionId,
            transactionId: result.transactionId,
            feePaid: result.feePaid
          });
          
          // Mark this step as successful
          updateStepStatus(stepIndex, StepStatus.SUCCESS, 'File uploaded successfully');
          
          // Also mark subsequent steps as successful since we've completed the entire process
          updateStepStatus(1, StepStatus.SUCCESS, 'File prepared successfully');
          updateStepStatus(2, StepStatus.SUCCESS, result.output || 'Inscription successful');
          
          // Reset auto-executing state
          setIsAutoExecuting(false);
          
          // Complete the wizard
          setStepsComplete(true);
        } catch (fetchError) {
          // Check if this was an abort error (timeout)
          if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
            // Check container status to provide more specific error message
            await checkContainerStatus();
            throw new Error(`Request timed out after 4 minutes. The file might be too large or the server might be busy. Try optimizing the image or reducing file size.`);
          }
          throw fetchError; // Re-throw other errors
        } finally {
          clearTimeout(timeoutId); // Ensure timeout is cleared in all cases
        }
      } 
      else {
        // If we reach here, something went wrong
        throw new Error('Unexpected step index');
      }
    } catch (error) {
      console.error(`Error in step ${stepIndex}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateStepStatus(stepIndex, StepStatus.ERROR, errorMessage);
      
      if (stepIndex === 0) {
        setResult({
          success: false,
          errorMessage: errorMessage
        });
      }
      
      // Reset auto-executing state on error
      setIsAutoExecuting(false);
    } finally {
      setLoading(false);
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
    setIsAutoExecuting(false);
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
  
  // Helper function to find batch item by file ID
  const getBatchItemByFileId = (fileId: string) => {
    return batchProcessingState.items.find(item => item.fileId === fileId);
  };
  
  const prepareBatchProcessing = async (config: ConfigOptions, metadataValues: any) => {
    // Initialize batch processing state
    setBatchProcessingState({
      status: 'preparing',
      items: batchFiles.map(file => ({
        fileId: file.id,
        status: 'pending',
        fileName: file.file.name,
        commands: [],
        steps: [
          { status: StepStatus.DEFAULT, output: "" },
          { status: StepStatus.DEFAULT, output: "" },
          { status: StepStatus.DEFAULT, output: "" }
        ]
      }))
    });

    console.log('Preparing batch processing with direct Docker approach');

    // Generate commands for each file
    const results = await Promise.all(
      batchFiles.map(file => {
        const item = getBatchItemByFileId(file.id);
        if (!item) {
          console.error(`No batch item found for file ID ${file.id}`);
          return Promise.resolve(false);
        }
        
        return generateCommandsForBatchItem(file, item, config, metadataValues);
      })
    );

    // Check if all commands were generated successfully
    const allSuccessful = results.every(Boolean);
    
    if (allSuccessful) {
      setBatchProcessingState(prev => ({
        ...prev,
        status: 'ready'
      }));
      
      // Run all commands if auto-execute is enabled
      if (config.autoExecute) {
        runAllCommands();
      }
      
      return true;
    } else {
      setBatchProcessingState(prev => ({
        ...prev,
        status: 'failed'
      }));
      
      return false;
    }
  };
  
  const startBatchProcessing = async () => {
    if (batchProcessingState.inProgress || batchProcessingState.items.length === 0) return;
    
    // Start or resume batch processing
    setBatchProcessingState(prev => ({
      ...prev,
      inProgress: true
    }));
    
    // Set auto-executing to true when manually starting batch processing
    setIsAutoExecuting(true);
    
    // Process the next item
    await processBatchItem();
  };
  
  const stopBatchProcessing = () => {
    setBatchProcessingState(prev => ({
      ...prev,
      inProgress: false
    }));
    
    // Reset auto-executing state when stopping batch processing
    setIsAutoExecuting(false);
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
    
    // Reset auto-executing state
    setIsAutoExecuting(false);
  };
  
  // Also modify the processBatchItem function to check container status
  const processBatchItem = async () => {
    const { currentItemIndex, items } = batchProcessingState;
    
    // Check if we've processed all items
    if (currentItemIndex >= items.length) {
      console.log('All batch items processed');
      setBatchProcessingState(prev => ({
        ...prev,
        inProgress: false
      }));
      return;
    }
    
    // Get the current batch item
    const currentItem = items[currentItemIndex];
    
    // Skip items that are not selected or already processed
    if (!currentItem.selected || currentItem.status === 'completed' || currentItem.status === 'failed') {
      console.log(`Skipping batch item ${currentItem.fileName} (selected: ${currentItem.selected}, status: ${currentItem.status})`);
      // Move to the next item
      setBatchProcessingState(prev => ({
        ...prev,
        currentItemIndex: prev.currentItemIndex + 1
      }));
      setTimeout(() => processBatchItem(), 1000);
      return;
    }
    
    console.log(`Processing batch item ${currentItemIndex + 1}/${items.length}: ${currentItem.fileName}`);
    
    try {
      // Check container status before processing
      await checkContainerStatus();
      
      // Get the latest configuration
      const config = {
        ...configForm.getValues(),
        optimizeImage: currentItem.optimizeImage,
        destination: metadataForm.watch('destination'),
        parentId: metadataForm.watch('parentInscriptionId'),
        includeMetadata: metadataForm.getValues().includeMetadata,
        metadataJson: metadataForm.getValues().includeMetadata ? metadataForm.getValues().metadataJson : undefined
      };
      
      // Execute commands for this batch item
      const result = await executeCommandsForBatchItem(currentItem, config);
      
      // Update the batch item with the result
      updateBatchItemResult(currentItem.fileId, result);
      
      // Update stats
      setBatchProcessingState(prev => ({
        ...prev,
        completedCount: result.success ? prev.completedCount + 1 : prev.completedCount,
        failedCount: !result.success ? prev.failedCount + 1 : prev.failedCount,
        currentItemIndex: prev.currentItemIndex + 1
      }));
      
      // Continue with next item
      setTimeout(() => processBatchItem(), 1000);
    } catch (error) {
      console.error(`Error processing batch item ${currentItem.fileName}:`, error);
      
      // Update the batch item as failed
      updateBatchItemResult(currentItem.fileId, {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Update stats and move to next item
      setBatchProcessingState(prev => ({
        ...prev,
        failedCount: prev.failedCount + 1,
        currentItemIndex: prev.currentItemIndex + 1
      }));
      
      // Continue with next item
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
    // Always use direct Docker approach
    console.log(`Generating commands for batch item: ${file.file.name}`);
    
    // Update batch item status
    updateBatchItemStatus(
      { fileId: file.id } as BatchProcessingItem, 
      'pending'
    );
    
    try {
      // Create a simplified command set for direct Docker operations
      const commands = [
        `docker cp "${file.file.name}" ordinals:/ord/data/`,
        `# File preparation step`,
        `docker exec -it ordinals ord wallet inscribe --fee-rate ${config.feeRate || 4} --file /ord/data/${file.file.name}`
      ];
      
      // Add metadata and destination to the inscription command if needed
      if (metadataValues.destination) {
        commands[2] += ` --destination ${metadataValues.destination}`;
      }
      
      if (metadataValues.includeMetadata && metadataValues.metadataJson) {
        commands[2] += ` --metadata /ord/data/metadata_${file.id}.json`;
      }
      
      if (showParentInscription && metadataValues.parentInscriptionId) {
        commands[2] += ` --parent ${metadataValues.parentInscriptionId}`;
      }
      
      // Add sat rarity if enabled
      if (config.useSatRarity && config.selectedSatoshi) {
        commands[2] += ` --sat ${config.selectedSatoshi}`;
      }
      
      // Update batch item with commands
      const newItem = {
        ...item,
        commands,
        fileName: file.file.name,
        steps: [
          { status: StepStatus.READY, output: "" },
          { status: StepStatus.DEFAULT, output: "" },
          { status: StepStatus.DEFAULT, output: "" }
        ]
      };
      
      // Update batch processing state with the commands
      setBatchProcessingState(prev => {
        const newItems = prev.items.map(i => 
          i.fileId === file.id ? newItem : i
        );
        
        return {
          ...prev,
          items: newItems
        };
      });
      
      return true;
    } catch (error) {
      console.error('Error generating commands for batch item:', error);
      
      // Update batch item status to failed
      updateBatchItemStatus(
        { fileId: file.id } as BatchProcessingItem, 
        'failed'
      );
      
      return false;
    }
  };
  
  // Execute commands for a batch item
  const executeCommandsForBatchItem = async (batchItem: BatchProcessingItem, config: ConfigOptions): Promise<{
    success: boolean;
    inscriptionId?: string;
    transactionId?: string;
    feePaid?: string;
    errorMessage?: string;
  }> => {
    try {
      console.log(`Processing batch item: ${batchItem.fileName}`);
      updateBatchItemStatus(batchItem, 'progress');
      updateBatchItemStep(batchItem, 0, 'progress');

      // Get the actual file from the batchFiles array
      const batchFile = batchFiles.find(file => file.id === batchItem.fileId);
      if (!batchFile) {
        throw new Error(`File not found for batch item: ${batchItem.fileName}`);
      }

      // Create FormData for the file upload
      const formData = new FormData();
      formData.append('file', batchFile.file);

      // Add all configuration options
      const uploadConfig = {
        feeRate: config.feeRate,
        destination: config.destination,
        parentId: config.parentId,
        optimizeImage: config.optimizeImage,
        noLimitCheck: config.noLimitCheck,
        dryRun: config.dryRun,
        mimeType: config.mimeType || undefined,
        useSatRarity: config.useSatRarity,
        selectedSatoshi: config.selectedSatoshi,
        includeMetadata: config.includeMetadata,
      };

      // Add metadata if needed
      if (config.includeMetadata && config.metadataJson) {
        uploadConfig.metadataJson = config.metadataJson;
      }

      // Add configuration to the form data
      Object.entries(uploadConfig).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });

      // Set up AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 240000); // 4 minute client-side timeout

      try {
        // Use docker-inscribe endpoint directly
        const response = await fetch('/api/docker-inscribe', {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });

        // Clear the timeout since we got a response
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to upload file');
        }

        const result = await response.json();

        // Mark all steps as successful
        updateBatchItemStep(batchItem, 0, 'success', 'File uploaded successfully');
        updateBatchItemStep(batchItem, 1, 'success', 'File prepared successfully');
        updateBatchItemStep(batchItem, 2, 'success', result.output || 'Inscription successful');
        
        // Update the batch item status
        updateBatchItemStatus(batchItem, 'completed', result.inscriptionId, result.transactionId, result.errorMessage);

        return {
          success: true,
          inscriptionId: result.inscriptionId,
          transactionId: result.transactionId,
          feePaid: result.feePaid
        };
      } catch (fetchError) {
        // Check if this was an abort error (timeout)
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
          throw new Error(`Request timed out after 4 minutes. File might be too large or server is busy.`);
        }
        throw fetchError; // Re-throw other errors
      } finally {
        clearTimeout(timeoutId); // Ensure timeout is cleared in all cases
      }
    } catch (error) {
      console.error(`Error processing batch item: ${batchItem.fileName}`, error);
      
      // Mark current step as error
      const currentStep = batchItem.steps ? 
        batchItem.steps.findIndex(step => step.status === 'progress') : 
        -1;
      
      if (currentStep !== -1) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        updateBatchItemStep(batchItem, currentStep, 'error', errorMessage);
      }
      
      // Update the batch item status
      updateBatchItemStatus(batchItem, 'failed', undefined, undefined, errorMessage);
      
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };
  
  // Helper functions for updating batch processing state
  const updateBatchItemStatus = (
    batchItem: BatchProcessingItem, 
    status: 'pending' | 'progress' | 'completed' | 'failed',
    inscriptionId?: string,
    transactionId?: string,
    errorMessage?: string
  ) => {
    setBatchProcessingState(prev => {
      if (!prev) return prev;
      
      const updatedItems = prev.items.map(item => {
        if (item.fileId === batchItem.fileId) {
          return {
            ...item,
            status,
            inscriptionId: inscriptionId || item.inscriptionId,
            transactionId: transactionId || item.transactionId,
            error: errorMessage || item.error
          };
        }
        return item;
      });
      
      return {
        ...prev,
        items: updatedItems
      };
    });
  };
  
  const updateBatchItemStep = (
    batchItem: BatchProcessingItem, 
    stepIndex: number, 
    status: 'pending' | 'progress' | 'success' | 'error',
    output?: string
  ) => {
    setBatchProcessingState(prev => {
      if (!prev) return prev;
      
      const updatedItems = prev.items.map(item => {
        if (item.fileId === batchItem.fileId && item.steps && stepIndex < item.steps.length) {
          const updatedSteps = [...item.steps];
          updatedSteps[stepIndex] = {
            ...updatedSteps[stepIndex],
            status,
            output: output || updatedSteps[stepIndex].output
          };
          
          return {
            ...item,
            steps: updatedSteps
          };
        }
        return item;
      });
      
      return {
        ...prev,
        items: updatedItems
      };
    });
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
  
  // Add a function to display the timeout help dialog when specific error messages are detected
  const renderErrorWithHelp = (errorMessage: string) => {
    const isTimeoutError = errorMessage.toLowerCase().includes('timeout') || 
                         errorMessage.toLowerCase().includes('too large') ||
                         errorMessage.toLowerCase().includes('busy');
    
    return (
      <div>
        <p className="text-red-600 dark:text-red-400">{errorMessage}</p>
        {isTimeoutError && (
          <div className="mt-3">
            <TimeoutHelpDialog trigger={
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Info className="h-4 w-4" />
                Get Help with Timeouts
              </Button>
            } />
          </div>
        )}
      </div>
    );
  };
  
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
          {isUmbrelEnvironment && (
            <div className="mt-2 p-2 rounded-md bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 flex items-center">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse mr-2" />
              <p className="text-sm text-green-700 dark:text-green-300">
                Umbrel environment detected - using optimized direct file transfer
              </p>
            </div>
          )}
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
                    <FormControl>
                      <Input
                        placeholder="Destination Address"
                        value={metadataForm.watch('destination')}
                        onChange={(e) => metadataForm.setValue('destination', e.target.value)}
                      />
                    </FormControl>
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
                        <FormControl>
                          <Input
                            placeholder="Parent Inscription ID"
                            value={metadataForm.watch('parentInscriptionId')}
                            onChange={(e) => metadataForm.setValue('parentInscriptionId', e.target.value)}
                          />
                        </FormControl>
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
                  onGenerateCommands={(config: ConfigOptions) => 
                    !batchMode 
                      ? handleGenerateCommands(config) 
                      : prepareBatchProcessing(config, metadataForm.getValues())
                  }
                  uploadedFile={!batchMode ? uploadedFile : batchFiles.length > 0 ? batchFiles[0] : null}
                  isBatchMode={batchMode}
                  batchFileCount={batchFiles.length}
                />
              </section>
            )}
            
            {/* Show batch processing progress only after batch is prepared */}
            {batchMode && batchProcessingState.items.length > 0 && !isAutoExecuting && (
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

            {/* Show auto-processing indicator for batch mode */}
            {batchMode && batchProcessingState.items.length > 0 && isAutoExecuting && (
              <section className="p-6 border-b border-orange-100 dark:border-navy-700 bg-orange-50 dark:bg-navy-800">
                <SectionTitle title="Processing Batch Inscriptions" />
                <div className="mt-4">
                  <div className="p-4 rounded-lg border border-orange-200 dark:border-navy-600 bg-white dark:bg-navy-900">
                    <div className="flex items-center mb-4">
                      <div className="h-2.5 w-2.5 rounded-full bg-orange-500 animate-pulse mr-2"></div>
                      <p className="font-medium text-orange-700 dark:text-orange-300">
                        Automatically processing {batchProcessingState.items.length} inscriptions...
                      </p>
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progress:</span>
                        <span>
                          {batchProcessingState.completedCount + batchProcessingState.failedCount} of {batchProcessingState.items.length} 
                          ({Math.round(((batchProcessingState.completedCount + batchProcessingState.failedCount) / batchProcessingState.items.length) * 100)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-navy-700 rounded-full h-2.5">
                        <div 
                          className="bg-orange-500 h-2.5 rounded-full" 
                          style={{ 
                            width: `${Math.round(((batchProcessingState.completedCount + batchProcessingState.failedCount) / batchProcessingState.items.length) * 100)}%` 
                          }}>
                        </div>
                      </div>
                    </div>
                    
                    {/* Current item being processed */}
                    {batchProcessingState.inProgress && batchProcessingState.currentItemIndex < batchProcessingState.items.length && (
                      <div className="p-3 rounded-md bg-orange-50 dark:bg-navy-800 border border-orange-100 dark:border-navy-700 mb-4">
                        <h4 className="text-sm font-medium mb-2">Currently Processing:</h4>
                        <div className="flex items-center">
                          <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse mr-2"></div>
                          <p className="text-sm">
                            {batchProcessingState.items[batchProcessingState.currentItemIndex].fileName}
                          </p>
                        </div>
                        
                        {/* Display the current step status for the item */}
                        {batchProcessingState.items[batchProcessingState.currentItemIndex].steps?.map((step, stepIndex) => (
                          <div key={stepIndex} className="ml-4 mt-2 text-xs flex items-center">
                            <div className={`h-1.5 w-1.5 rounded-full mr-2 ${
                              step.status === StepStatus.SUCCESS ? "bg-green-500" :
                              step.status === StepStatus.ERROR ? "bg-red-500" :
                              step.status === StepStatus.PROGRESS ? "bg-orange-500 animate-pulse" :
                              "bg-gray-300 dark:bg-gray-600"
                            }`}></div>
                            <span>
                              {stepIndex === 0 ? "Uploading File" : 
                               stepIndex === 1 ? "Preparing File" : 
                               "Creating Inscription"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Summary of processed items */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-2 rounded-md bg-gray-50 dark:bg-navy-800">
                        <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{batchProcessingState.items.length}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                      </div>
                      <div className="p-2 rounded-md bg-green-50 dark:bg-green-900/20">
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{batchProcessingState.completedCount}</p>
                        <p className="text-xs text-green-600 dark:text-green-400">Completed</p>
                      </div>
                      <div className="p-2 rounded-md bg-red-50 dark:bg-red-900/20">
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">{batchProcessingState.failedCount}</p>
                        <p className="text-xs text-red-600 dark:text-red-400">Failed</p>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-start">
                        <Info className="h-4 w-4 text-orange-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Your files are being processed automatically. You can view detailed results when processing is complete.
                        </p>
                      </div>
                      <Button 
                        onClick={stopBatchProcessing} 
                        variant="outline" 
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                      >
                        Stop Processing
                      </Button>
                    </div>
                  </div>
                </div>
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
                {isAutoExecuting ? (
                  <>
                    <SectionTitle title="Processing Inscription" />
                    <div className="mt-4">
                      <div className="p-4 rounded-lg border border-orange-200 dark:border-navy-600 bg-white dark:bg-navy-900">
                        <div className="flex items-center mb-4">
                          <div className="h-2.5 w-2.5 rounded-full bg-orange-500 animate-pulse mr-2"></div>
                          <p className="font-medium text-orange-700 dark:text-orange-300">
                            Automatically processing your inscription...
                          </p>
                        </div>
                        
                        <div className="space-y-4">
                          {steps.map((step, index) => (
                            <div key={index} className="p-3 rounded-md bg-orange-50 dark:bg-navy-800 border border-orange-100 dark:border-navy-700">
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-medium text-sm">
                                  {index === 0 ? "Step 1: Uploading File" : 
                                   index === 1 ? "Step 2: Preparing File" : 
                                   "Step 3: Creating Inscription"}
                                </p>
                                <div className={`flex items-center ${
                                  step.status === StepStatus.SUCCESS ? "text-green-500" :
                                  step.status === StepStatus.ERROR ? "text-red-500" :
                                  step.status === StepStatus.PROGRESS ? "text-orange-500" :
                                  "text-gray-400"
                                }`}>
                                  {step.status === StepStatus.SUCCESS ? (
                                    <CheckCircle className="h-4 w-4" />
                                  ) : step.status === StepStatus.ERROR ? (
                                    <XCircle className="h-4 w-4" />
                                  ) : step.status === StepStatus.PROGRESS ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <div className="h-4 w-4 rounded-full border-2 border-gray-300 dark:border-gray-600"></div>
                                  )}
                                </div>
                              </div>
                              
                              {step.output && (step.status === StepStatus.SUCCESS || step.status === StepStatus.ERROR) && (
                                <div className="mt-2 p-2 rounded bg-gray-50 dark:bg-navy-900 text-xs font-mono overflow-x-auto max-h-24 overflow-y-auto">
                                  {step.output}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        <div className="mt-4 flex items-start">
                          <Info className="h-4 w-4 text-orange-500 mt-0.5 mr-2 flex-shrink-0" />
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Your file is being processed automatically. You'll see the results as soon as the inscription is complete.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <SectionTitle title="Execute Commands" />
                    <CommandSection 
                      commands={commandsData.commands.join('\n')} 
                      steps={steps}
                      onRunAll={runAllCommands}
                      onRunStepByStep={runStepByStep}
                      onExecuteStep={executeStep}
                    />
                  </>
                )}
              </section>
            )}

            {result && (
              <section className="p-6 border-b border-orange-100 dark:border-navy-700 bg-orange-50 dark:bg-navy-800">
                <SectionTitle title="Results" />
                <ResultSection 
                  result={result} 
                  onReset={resetApplication}
                  onTryAgain={tryAgain}
                  renderError={renderErrorWithHelp}
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

            {/* Footer with environment information */}
            <footer className="mt-8 border-t border-gray-200 dark:border-gray-800 pt-4 pb-8 text-center text-xs text-gray-500 dark:text-gray-400">
              <div className="flex flex-col items-center justify-center">
                <div className="flex items-center space-x-2 mb-1">
                  <div className={`h-2 w-2 rounded-full ${isUmbrelEnvironment ? 'bg-green-500' : 'bg-blue-500'}`} />
                  <span>
                    {isUmbrelEnvironment 
                      ? 'Umbrel Mode - Direct File Transfer' 
                      : 'Standard Mode'}
                  </span>
                </div>
                <div>
                  Ordinarinos Inscription Tool v1.0
                </div>
              </div>
            </footer>
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
