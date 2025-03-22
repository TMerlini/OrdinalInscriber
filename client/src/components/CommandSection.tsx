import { Play, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExecutionStep, StepStatus } from "@/lib/types";
import SectionTitle from "./SectionTitle";

interface CommandSectionProps {
  commands: string;
  steps: ExecutionStep[];
  onRunAll: () => void;
  onRunStepByStep: () => void;
  onExecuteStep: (stepIndex: number) => void;
}

export default function CommandSection({ 
  commands, 
  steps, 
  onRunAll, 
  onRunStepByStep,
  onExecuteStep 
}: CommandSectionProps) {
  
  const renderStepStatus = (step: ExecutionStep, index: number) => {
    switch (step.status) {
      case StepStatus.PROGRESS:
        return (
          <div className="flex-shrink-0 h-6 w-6 rounded-full bg-orange-100 flex items-center justify-center mr-3 mt-0.5">
            <svg className="animate-spin h-4 w-4 text-orange-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        );
      case StepStatus.SUCCESS:
        return (
          <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-3 mt-0.5">
            <svg className="h-4 w-4 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case StepStatus.ERROR:
        return (
          <div className="flex-shrink-0 h-6 w-6 rounded-full bg-red-100 flex items-center justify-center mr-3 mt-0.5">
            <svg className="h-4 w-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      case StepStatus.READY:
        return (
          <div 
            className="flex-shrink-0 h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center mr-3 mt-0.5 cursor-pointer hover:bg-amber-200 transition-colors"
            onClick={() => onExecuteStep(index)}
          >
            <span className="text-amber-600 text-xs font-medium">Run</span>
          </div>
        );
      default:
        return (
          <div className="flex-shrink-0 h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center mr-3 mt-0.5">
            <span className="text-gray-500 text-sm font-medium">{index + 1}</span>
          </div>
        );
    }
  };
  
  return (
    <section className="p-6 border-b border-orange-100 bg-gradient-to-r from-orange-50 to-transparent">
      <SectionTitle number="4" title="Run Commands" />
      
      <div className="space-y-6">
        {/* Command preview */}
        <div>
          <h3 className="font-medium text-orange-700 mb-2">Generated Commands</h3>
          <div className="bg-[#1a1a1a] text-[#f0f0f0] p-4 rounded-xl shadow-inner font-mono text-sm overflow-x-auto whitespace-pre border border-orange-300">
            <pre className="leading-normal">{commands}</pre>
          </div>
        </div>
        
        {/* Execution steps */}
        <div>
          <h3 className="font-medium text-orange-700 mb-2">Execution Steps</h3>
          
          <ol className="space-y-4">
            <li className="flex items-start">
              {renderStepStatus(steps[0], 0)}
              <div>
                <h4 className="font-medium text-gray-700">Start Local Web Server</h4>
                <p className="text-sm text-gray-500 mt-0.5">Serve the image file from your local machine</p>
                {steps[0].output && (
                  <div className="mt-2 bg-white p-3 rounded-xl text-sm text-gray-700 font-mono border border-orange-100 shadow-sm">
                    {steps[0].output}
                  </div>
                )}
              </div>
            </li>
            
            <li className="flex items-start">
              {renderStepStatus(steps[1], 1)}
              <div>
                <h4 className="font-medium text-gray-700">Download File in Container</h4>
                <p className="text-sm text-gray-500 mt-0.5">Copy the image file into the Docker container</p>
                {steps[1].output && (
                  <div className="mt-2 bg-white p-3 rounded-xl text-sm text-gray-700 font-mono border border-orange-100 shadow-sm">
                    {steps[1].output}
                  </div>
                )}
              </div>
            </li>
            
            <li className="flex items-start">
              {renderStepStatus(steps[2], 2)}
              <div>
                <h4 className="font-medium text-gray-700">Inscribe Image</h4>
                <p className="text-sm text-gray-500 mt-0.5">Run the ord command to inscribe the image</p>
                {steps[2].output && (
                  <div className="mt-2 bg-white p-3 rounded-xl text-sm text-gray-700 font-mono border border-orange-100 shadow-sm">
                    {steps[2].output}
                  </div>
                )}
              </div>
            </li>
          </ol>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 pt-2">
          <Button 
            onClick={onRunAll}
            className="flex-1 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600"
          >
            <Play className="mr-2 h-4 w-4" />
            Run All Commands
          </Button>
          <Button 
            variant="outline"
            onClick={onRunStepByStep}
            className="flex-1 border-orange-300 hover:bg-orange-100 text-orange-700"
          >
            <GitBranch className="mr-2 h-4 w-4" />
            Run Step-by-Step
          </Button>
        </div>
      </div>
    </section>
  );
}
