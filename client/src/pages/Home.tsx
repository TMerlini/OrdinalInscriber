import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import FileUploader from "@/components/FileUploader";
import ImagePreview from "@/components/ImagePreview";
import ConfigForm from "@/components/ConfigForm";
import CommandSection from "@/components/CommandSection";
import ResultSection from "@/components/ResultSection";
import CacheManager from "@/components/CacheManager";
import MetadataInput from "@/components/MetadataInput";
import ThemeToggle from "@/components/ThemeToggle";
import { ChevronDown } from "lucide-react";
import { UploadedFile, ConfigOptions, CommandsData, ExecutionStep, StepStatus, InscriptionResult } from "@/lib/types";
import { apiRequest } from "@/lib/queryClient";

export default function Home() {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [commandsData, setCommandsData] = useState<CommandsData | null>(null);
  const [steps, setSteps] = useState<ExecutionStep[]>([
    { status: StepStatus.DEFAULT, output: "" },
    { status: StepStatus.DEFAULT, output: "" },
    { status: StepStatus.DEFAULT, output: "" }
  ]);
  const [result, setResult] = useState<InscriptionResult | null>(null);
  const [cacheOpen, setCacheOpen] = useState(false);
  const [optimizeImage, setOptimizeImage] = useState(false);
  
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
        metadataJson: metadataValues.metadataJson
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
        command: commandsData.commands[2]
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
          command: commandsData.commands[2]
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
  
  return (
    <div className="bg-orange-50 dark:bg-navy-950 min-h-screen font-sans text-gray-800 dark:text-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="mb-8 text-center relative">
          <div className="absolute right-2 top-2">
            <ThemeToggle />
          </div>
          <h1 className="text-4xl font-bold text-orange-600 dark:text-orange-500">Ordinals Inscription Tool</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Upload, configure, and inscribe images to your Ordinals node</p>
        </header>

        <Card className="overflow-hidden border border-orange-200 dark:border-navy-700 shadow-lg rounded-xl dark:bg-navy-800">
          <CardContent className="p-0">
            <section className="p-6 border-b border-orange-100 dark:border-navy-700 bg-orange-50 dark:bg-navy-800">
              <h2 className="text-xl font-semibold mb-4 text-orange-800 dark:text-orange-400">1. Upload Image</h2>
              <FileUploader onFileUpload={handleFileUpload} />
            </section>

            {uploadedFile && (
              <ImagePreview 
                file={uploadedFile} 
                onRemove={handleFileRemove}
                onToggleOptimization={handleToggleOptimization} 
              />
            )}
            
            {uploadedFile && (
              <section className="p-6 border-b border-orange-100 dark:border-navy-700 bg-white dark:bg-navy-900">
                <h2 className="text-xl font-semibold mb-4 text-orange-800 dark:text-orange-400">2. Destination Address</h2>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Specify a Bitcoin address to receive the inscription (optional).
                  </p>
                </div>
                <div className="bg-orange-50 dark:bg-navy-800 p-4 rounded-lg mb-4">
                  <div className="mb-2 text-gray-700 dark:text-gray-300">
                    <label htmlFor="destination-address" className="block text-sm font-medium mb-1">Bitcoin Address</label>
                    <input 
                      id="destination-address" 
                      type="text" 
                      placeholder="Enter Bitcoin address to receive the inscription"
                      className="w-full p-2 border border-orange-200 dark:border-navy-600 rounded-md 
                                bg-white dark:bg-navy-900 text-gray-800 dark:text-gray-200"
                      value={metadataForm.watch('destination') || ''} 
                      onChange={(e) => metadataForm.setValue('destination', e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    If left empty, the inscription will be sent to the wallet's default address.
                  </p>
                </div>
              </section>
            )}
            
            {uploadedFile && (
              <section className="p-6 border-b border-orange-100 dark:border-navy-700 bg-white dark:bg-navy-900">
                <h2 className="text-xl font-semibold mb-4 text-orange-800 dark:text-orange-400">3. Metadata</h2>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Add optional metadata to be stored with your inscription on-chain.
                  </p>
                </div>
                <Form {...metadataForm}>
                  <form className="space-y-4">
                    <MetadataInput form={metadataForm} />
                  </form>
                </Form>
              </section>
            )}

            {uploadedFile && (
              <section className="p-6 border-b border-orange-100 dark:border-navy-700 bg-orange-50 dark:bg-navy-800">
                <h2 className="text-xl font-semibold mb-4 text-orange-800 dark:text-orange-400">4. Configure Inscription</h2>
                <ConfigForm 
                  onGenerateCommands={handleGenerateCommands} 
                />
              </section>
            )}

            {commandsData && (
              <section className="p-6 border-b border-orange-100 dark:border-navy-700 bg-orange-50 dark:bg-navy-800">
                <h2 className="text-xl font-semibold mb-4 text-orange-800 dark:text-orange-400">4. Execute Commands</h2>
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
                <h2 className="text-xl font-semibold mb-4 text-orange-800 dark:text-orange-400">4. Results</h2>
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
                  <h2 className="text-xl font-semibold text-orange-800 dark:text-orange-400">Cache Management</h2>
                  <CollapsibleTrigger asChild>
                    <button className="p-2 rounded-full hover:bg-orange-100 dark:hover:bg-navy-700 focus:outline-none transition-colors">
                      <ChevronDown className={`h-5 w-5 text-orange-600 dark:text-orange-400 transition-transform duration-200 ${cacheOpen ? 'transform rotate-180' : ''}`} />
                    </button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="mt-4">
                  <CacheManager />
                </CollapsibleContent>
              </Collapsible>
            </section>
          </CardContent>
        </Card>

        <footer className="mt-8 text-center flex flex-col items-center space-y-2">
          <div className="inline-block px-6 py-2 bg-orange-600 dark:bg-orange-700 rounded-full">
            <p className="text-white font-medium text-sm">Ordinals Inscription Tool - For use with a local Ordinals node running in Docker</p>
          </div>
          <a 
            href="https://ordinarinos.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
          >
            Powered by Ordinarinos
          </a>
        </footer>
      </div>
    </div>
  );
}
