import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Loader2, Info, AlertCircle, Check } from 'lucide-react';
import { ConfigOptions, ExecutionStep, StepStatus } from '@/lib/types';
import CommandSection from '@/components/CommandSection';
import { useToast } from '@/hooks/use-toast';

interface BitmapInscriptionSectionProps {
  onGenerateCommands?: (commands: string[]) => void;
  defaultFeeRate?: number;
  defaultDestinationAddress?: string;
}

export default function BitmapInscriptionSection({
  onGenerateCommands,
  defaultFeeRate = 10,
  defaultDestinationAddress = ''
}: BitmapInscriptionSectionProps) {
  const [bitmapNumber, setBitmapNumber] = useState<string>('');
  const [feeRate, setFeeRate] = useState<number>(defaultFeeRate);
  const [destinationAddress, setDestinationAddress] = useState<string>(defaultDestinationAddress);
  const [containerName, setContainerName] = useState<string>('');
  const [isLoadingEnvironment, setIsLoadingEnvironment] = useState<boolean>(true);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [latestBlock, setLatestBlock] = useState<number | null>(null);
  const [bitmapStatus, setBitmapStatus] = useState<{
    checked: boolean;
    isAvailable: boolean;
    error?: string;
  }>({ checked: false, isAvailable: false });
  
  const [commands, setCommands] = useState<string>('');
  const [steps, setSteps] = useState<ExecutionStep[]>([]);
  
  const { toast } = useToast();
  
  // Fetch environment info on component mount
  useEffect(() => {
    async function fetchEnvironmentInfo() {
      try {
        setIsLoadingEnvironment(true);
        const response = await axios.get('/api/environment');
        setContainerName(response.data.containerName);
      } catch (error) {
        console.error('Error fetching environment info:', error);
        toast({
          title: 'Environment Detection',
          description: 'Failed to auto-detect container name. Using default container name.',
          variant: 'destructive',
        });
        // Use a sensible default
        setContainerName('bitcoin-ordinals');
      } finally {
        setIsLoadingEnvironment(false);
      }
    }

    fetchEnvironmentInfo();
  }, [toast]);

  // Check if bitmap number is available when entered
  useEffect(() => {
    if (bitmapNumber && bitmapNumber.length > 0) {
      checkBitmapAvailability();
    } else {
      setBitmapStatus({ checked: false, isAvailable: false });
    }
  }, [bitmapNumber]);

  // Check bitmap availability
  const checkBitmapAvailability = async () => {
    if (!bitmapNumber || !/^\d+$/.test(bitmapNumber)) {
      setBitmapStatus({ 
        checked: true, 
        isAvailable: false, 
        error: 'Invalid bitmap number format. Must contain only digits.' 
      });
      return;
    }

    setIsChecking(true);
    try {
      const response = await axios.get(`/api/bitmap/check/${bitmapNumber}`);
      setBitmapStatus({ 
        checked: true, 
        isAvailable: response.data.isAvailable 
      });
      
      if (response.data.latestBlock) {
        setLatestBlock(response.data.latestBlock);
      }
    } catch (error) {
      console.error('Error checking bitmap availability:', error);
      setBitmapStatus({ 
        checked: true, 
        isAvailable: false, 
        error: 'Failed to check bitmap availability. Please try again.' 
      });
    } finally {
      setIsChecking(false);
    }
  };

  // Generate inscription commands
  const generateCommands = async () => {
    if (!bitmapNumber || !/^\d+$/.test(bitmapNumber)) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter a valid bitmap number.',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post('/api/bitmap/generate-command', {
        bitmapNumber,
        feeRate,
        destinationAddress: destinationAddress || undefined,
        containerName: containerName
      });

      // Set the command and create execution steps
      const commandString = response.data.command;
      setCommands(commandString);
      
      // Create execution steps
      const executionSteps: ExecutionStep[] = [
        {
          description: 'Generate Bitmap Inscription Command',
          command: 'Preparing inscription command...',
          status: StepStatus.SUCCESS,
          output: `Generated command for bitmap ${bitmapNumber}.bitmap inscription.`
        },
        {
          description: 'Execute Inscription Command',
          command: commandString,
          status: StepStatus.PENDING,
          output: ''
        }
      ];
      
      setSteps(executionSteps);
      
      // Pass commands back to parent component if callback exists
      if (onGenerateCommands) {
        onGenerateCommands([commandString]);
      }
      
      toast({
        title: 'Commands Generated',
        description: 'Bitmap inscription commands have been generated.',
      });
    } catch (error) {
      console.error('Error generating commands:', error);
      toast({
        title: 'Command Generation Failed',
        description: 'Failed to generate bitmap inscription commands.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Execute a specific step
  const executeStep = async (stepIndex: number) => {
    if (stepIndex !== 1) return; // Only the second step is executable
    
    const updatedSteps = [...steps];
    updatedSteps[stepIndex] = {
      ...updatedSteps[stepIndex],
      status: StepStatus.RUNNING,
      output: 'Executing inscription command...'
    };
    setSteps(updatedSteps);
    
    try {
      // Execute the inscription command
      const result = await axios.post('/api/execute/command', {
        command: steps[stepIndex].command
      });
      
      updatedSteps[stepIndex] = {
        ...updatedSteps[stepIndex],
        status: StepStatus.SUCCESS,
        output: result.data.output || 'Inscription command executed successfully.'
      };
      
      toast({
        title: 'Inscription Executed',
        description: 'The bitmap inscription command has been executed successfully.',
      });
    } catch (error: any) {
      console.error('Error executing command:', error);
      updatedSteps[stepIndex] = {
        ...updatedSteps[stepIndex],
        status: StepStatus.ERROR,
        output: `Error: ${error.response?.data?.output || error.message || 'Unknown error occurred'}`
      };
      
      toast({
        title: 'Execution Failed',
        description: 'Failed to execute the inscription command.',
        variant: 'destructive'
      });
    } finally {
      setSteps(updatedSteps);
    }
  };

  // Run the entire process step-by-step
  const runStepByStep = async () => {
    for (let i = 0; i < steps.length; i++) {
      if (steps[i].status !== StepStatus.SUCCESS) {
        await executeStep(i);
        // If a step failed, stop the process
        if (steps[i].status === StepStatus.ERROR) break;
      }
    }
  };

  // Run all commands in one go
  const runAll = async () => {
    // For the bitmap section, this is the same as runStepByStep
    await runStepByStep();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">Bitmap Inscription</CardTitle>
        <CardDescription>
          Inscribe a bitmap district number onto the Bitcoin blockchain
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Info alert */}
        <Alert className="bg-blue-50 dark:bg-blue-950">
          <Info className="h-4 w-4" />
          <AlertTitle>About Bitmap Inscriptions</AlertTitle>
          <AlertDescription>
            Bitmap districts are a new primitive for creating on-chain communities. Each bitmap represents a unique district that can be inscribed and traded. Learn more at <a href="https://bitmap.land" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">bitmap.land</a>.
          </AlertDescription>
        </Alert>
        
        {/* Latest block info */}
        {latestBlock && (
          <div className="text-sm text-muted-foreground">
            Latest block: <span className="font-semibold">{latestBlock}</span>
          </div>
        )}
        
        {/* Bitmap number input */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Bitmap Number</label>
            <div className="flex space-x-2">
              <Input
                type="text"
                placeholder="Enter a bitmap number (e.g., 890712)"
                value={bitmapNumber}
                onChange={(e) => setBitmapNumber(e.target.value)}
                className="flex-1"
              />
              <Button 
                variant="outline" 
                onClick={checkBitmapAvailability}
                disabled={isChecking || !bitmapNumber}
              >
                {isChecking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Check
              </Button>
            </div>
            
            {/* Bitmap availability status */}
            {bitmapStatus.checked && (
              bitmapStatus.error ? (
                <div className="text-red-500 text-sm flex items-center mt-1">
                  <AlertCircle className="h-4 w-4 mr-1" /> {bitmapStatus.error}
                </div>
              ) : (
                bitmapStatus.isAvailable ? (
                  <div className="text-green-500 text-sm flex items-center mt-1">
                    <Check className="h-4 w-4 mr-1" /> This bitmap appears to be available for inscription.
                  </div>
                ) : (
                  <div className="text-amber-500 text-sm flex items-center mt-1">
                    <AlertCircle className="h-4 w-4 mr-1" /> This bitmap may already be inscribed or unavailable.
                  </div>
                )
              )
            )}
          </div>
          
          {/* Fee rate selection */}
          <div className="space-y-4">
            <label className="text-sm font-medium">Transaction Fee</label>
            <div className="grid grid-cols-3 gap-4">
              <div 
                className={`cursor-pointer border rounded-lg p-4 transition-colors ${feeRate === 5 ? 'bg-orange-100 border-orange-500 dark:bg-blue-900 dark:border-blue-500' : 'border-gray-200 hover:border-orange-300 dark:border-gray-700 dark:hover:border-blue-700'}`}
                onClick={() => setFeeRate(5)}
              >
                <div className="text-sm font-medium mb-1">Economy</div>
                <div className="text-lg font-bold text-orange-500 dark:text-blue-400">5 sats/vB</div>
                <div className="text-xs text-gray-500 mt-2">Slower, may take hours</div>
              </div>
              
              <div 
                className={`cursor-pointer border rounded-lg p-4 transition-colors ${feeRate === 15 ? 'bg-orange-100 border-orange-500 dark:bg-blue-900 dark:border-blue-500' : 'border-gray-200 hover:border-orange-300 dark:border-gray-700 dark:hover:border-blue-700'}`}
                onClick={() => setFeeRate(15)}
              >
                <div className="text-sm font-medium mb-1">Standard</div>
                <div className="text-lg font-bold text-orange-500 dark:text-blue-400">15 sats/vB</div>
                <div className="text-xs text-gray-500 mt-2">Usually within an hour</div>
              </div>
              
              <div 
                className={`cursor-pointer border rounded-lg p-4 transition-colors ${feeRate !== 5 && feeRate !== 15 && feeRate !== 30 ? 'bg-orange-100 border-orange-500 dark:bg-blue-900 dark:border-blue-500' : 'border-gray-200 hover:border-orange-300 dark:border-gray-700 dark:hover:border-blue-700'}`}
                onClick={() => setFeeRate(defaultFeeRate)}
              >
                <div className="text-sm font-medium mb-1">Custom</div>
                <div className="flex items-center">
                  <Input
                    type="number"
                    min={1}
                    placeholder="Custom fee rate"
                    value={feeRate !== 5 && feeRate !== 15 && feeRate !== 30 ? feeRate : defaultFeeRate}
                    onChange={(e) => setFeeRate(Number(e.target.value))}
                    onClick={(e) => e.stopPropagation()}
                    className="w-20 h-8 mr-1"
                  />
                  <span className="text-xs">sats/vB</span>
                </div>
                <div className="text-xs text-gray-500 mt-2">Set your own fee rate</div>
              </div>
              
              <div 
                className={`cursor-pointer border rounded-lg p-4 transition-colors ${feeRate === 30 ? 'bg-orange-100 border-orange-500 dark:bg-blue-900 dark:border-blue-500' : 'border-gray-200 hover:border-orange-300 dark:border-gray-700 dark:hover:border-blue-700'}`}
                onClick={() => setFeeRate(30)}
              >
                <div className="text-sm font-medium mb-1">Priority</div>
                <div className="text-lg font-bold text-orange-500 dark:text-blue-400">30 sats/vB</div>
                <div className="text-xs text-gray-500 mt-2">Fast, usually &lt;30 minutes</div>
              </div>
              
            </div>
          </div>
          
          {/* Destination address */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Destination Address (optional)</label>
            <Input
              type="text"
              placeholder="Bitcoin address to receive the inscription"
              value={destinationAddress}
              onChange={(e) => setDestinationAddress(e.target.value)}
            />
          </div>
        </div>
        
        <Alert variant="destructive" className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Important Note</AlertTitle>
          <AlertDescription>
            The bitmap you are trying to inscribe may already be in mempool. We cannot guarantee that your bitmap will be valid as it's possible someone else has already inscribed it.
          </AlertDescription>
        </Alert>
        
        {/* Generate commands button */}
        <Button 
          onClick={generateCommands} 
          disabled={isLoading || !bitmapNumber || !/^\d+$/.test(bitmapNumber)}
          className="w-full"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Generate Bitmap Inscription Commands
        </Button>
      </CardContent>
      
      {/* Command execution section */}
      {commands && (
        <CardFooter className="flex flex-col">
          <div className="w-full">
            <CommandSection
              commands={commands}
              steps={steps}
              onRunAll={runAll}
              onRunStepByStep={runStepByStep}
              onExecuteStep={executeStep}
            />
          </div>
        </CardFooter>
      )}
    </Card>
  );
}