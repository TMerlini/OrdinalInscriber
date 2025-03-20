import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import FileUploader from "@/components/FileUploader";
import ImagePreview from "@/components/ImagePreview";
import ConfigForm from "@/components/ConfigForm";
import CommandSection from "@/components/CommandSection";
import ResultSection from "@/components/ResultSection";
import CacheManager from "@/components/CacheManager";
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
  
  const handleFileUpload = (newFile: UploadedFile) => {
    setUploadedFile(newFile);
    setCommandsData(null);
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
    setSteps([
      { status: StepStatus.DEFAULT, output: "" },
      { status: StepStatus.DEFAULT, output: "" },
      { status: StepStatus.DEFAULT, output: "" }
    ]);
    setResult(null);
  };
  
  const handleGenerateCommands = async (config: ConfigOptions) => {
    if (!uploadedFile) return;
    
    try {
      const formData = new FormData();
      formData.append('file', uploadedFile.file);
      formData.append('config', JSON.stringify(config));
      
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
      
      const formData = new FormData();
      formData.append('file', uploadedFile.file);
      
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
        const formData = new FormData();
        formData.append('file', uploadedFile.file);
        
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
    <div className="bg-gradient-to-br from-orange-50 to-gray-100 min-h-screen font-sans text-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent">Ordinals Inscription Tool</h1>
          <p className="text-gray-600 mt-2">Upload, configure, and inscribe images to your Ordinals node</p>
        </header>

        <Card className="overflow-hidden border border-orange-200 shadow-lg rounded-xl">
          <CardContent className="p-0">
            <section className="p-6 border-b border-orange-100 bg-gradient-to-r from-orange-50 to-transparent">
              <h2 className="text-xl font-semibold mb-4 text-orange-800">1. Upload Image</h2>
              <FileUploader onFileUpload={handleFileUpload} />
            </section>

            {uploadedFile && (
              <ImagePreview 
                file={uploadedFile} 
                onRemove={handleFileRemove} 
              />
            )}

            {uploadedFile && (
              <ConfigForm 
                onGenerateCommands={handleGenerateCommands} 
              />
            )}

            {commandsData && (
              <CommandSection 
                commands={commandsData.commands.join('\n')} 
                steps={steps}
                onRunAll={runAllCommands}
                onRunStepByStep={runStepByStep}
                onExecuteStep={executeStep}
              />
            )}

            {result && (
              <ResultSection 
                result={result} 
                onReset={resetApplication}
                onTryAgain={tryAgain}
              />
            )}
            
            {/* Cache Manager Section */}
            <CacheManager />
          </CardContent>
        </Card>

        <footer className="mt-8 text-center">
          <div className="inline-block px-6 py-2 bg-gradient-to-r from-orange-600 to-amber-500 rounded-full">
            <p className="text-white font-medium text-sm">Ordinals Inscription Tool - For use with a local Ordinals node running in Docker</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
