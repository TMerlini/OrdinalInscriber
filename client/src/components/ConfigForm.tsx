import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfigOptions, UploadedFile } from "@/lib/types";
import { CheckCircle, XCircle, Info, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import SectionTitle from "./SectionTitle";
import RareSatSelector from "./RareSatSelector";
import { fetchRareSatsFromWallet } from "@/lib/rareSats";

const formSchema = z.object({
  containerName: z.string().min(1, {
    message: "Container name is required",
  }),
  feeRate: z.coerce.number().min(1, {
    message: "Fee rate must be at least 1",
  }),
  advancedMode: z.boolean().default(false),
  port: z.coerce.number().min(1025).max(65535).optional(),
  noLimitCheck: z.boolean().default(false),
  destination: z.string().optional(),
  satPoint: z.string().optional(),
  selectedSatoshi: z.string().optional(),
  useSatRarity: z.boolean().default(false),
  parentId: z.string().optional(),
  dryRun: z.boolean().default(false),
  mimeType: z.string().optional(),
  optimizeImage: z.boolean().default(false),
  includeMetadata: z.boolean().default(false),
  metadataStorage: z.enum(['on-chain']).default('on-chain'),
  metadataJson: z.string().optional(),
});

// Fixed container path that will be used across the application
export const DEFAULT_CONTAINER_PATH = "/ord/data/";

interface ConfigFormProps {
  onGenerateCommands: (config: ConfigOptions) => void;
  uploadedFile?: UploadedFile | null;
  isBatchMode?: boolean;
  batchFileCount?: number;
}

// Fee calculation constants for Segwit/Taproot transaction fees
const BTC_PRICE_USD = 60000; // Current BTC price in USD (approximate)

// Base transaction constants for Bitcoin Segwit/Taproot transactions
const TX_BASE_SIZE = 43; // vBytes (base transaction virtual bytes)
const TX_INPUT_SIZE = 68; // vBytes per input
const TX_INPUT_WITNESS_SIZE = 107; // vBytes per witness
const TX_OUTPUT_SIZE = 31; // vBytes per output
const TX_ORDINAL_OVERHEAD = 8; // vBytes overhead for ordinal
const TX_TAPROOT_ANNEX_SIZE = 0; // Optional taproot annex size in bytes

// Calculate the fee based on file size and fee rate for Bitcoin Segwit transactions
const calculateFee = (fileSizeBytes: number, feeRate: number, isOptimized: boolean = false) => {
  let contentSize = fileSizeBytes;
  
  // Apply optimization if enabled
  if (isOptimized && fileSizeBytes > 46 * 1024) {
    const baseOptimizedSize = 46 * 1024;
    const complexityFactor = Math.min(1, fileSizeBytes / (500 * 1024));
    contentSize = Math.round(baseOptimizedSize * (1 + complexityFactor * 0.2));
  }
  
  // Calculate the components of the transaction
  // Standard structure for Ordinals inscriptions
  const numInputs = 1; // Typically one input for inscriptions
  const numOutputs = 1; // One output for the inscription
  const burnValue = 100; // Minimum sat value to send (e.g., 100 sats)
  
  // Calculate the inscription virtual bytes
  // Standard formula for inscription data
  const inscriptionBytes = 4 + contentSize;
  
  // Calculate witness data size (taproot witness)
  const witnessSize = (TX_INPUT_WITNESS_SIZE * numInputs) + 
                        inscriptionBytes + 
                        TX_TAPROOT_ANNEX_SIZE;
  
  // Calculate base transaction size (non-witness data)
  const baseTxSize = TX_BASE_SIZE + 
                   (TX_INPUT_SIZE * numInputs) + 
                   (TX_OUTPUT_SIZE * numOutputs) +
                   TX_ORDINAL_OVERHEAD;
  
  // Calculate total virtual bytes using the segwit formula: base * 4 + witness
  const vBytes = baseTxSize * 4 + witnessSize;
  
  // Calculate fee 
  const feeSats = Math.ceil(vBytes * feeRate / 4); // Divide by 4 due to witness discount
  
  // Calculate USD equivalent
  const feeUsd = (feeSats * BTC_PRICE_USD) / 100000000;
  
  // Calculate effective fee rate
  const totalBytes = baseTxSize + witnessSize;
  const effectiveFeeRate = (feeSats / totalBytes).toFixed(2);
  
  return {
    bytes: totalBytes,
    vBytes: vBytes,
    sats: feeSats,
    usd: feeUsd.toFixed(2),
    effectiveFeeRate: effectiveFeeRate,
    breakdown: {
      baseTx: baseTxSize,
      witness: witnessSize,
      content: contentSize,
      inscriptionBytes: inscriptionBytes,
      vBytes: vBytes
    }
  };
};

export default function ConfigForm({ onGenerateCommands, uploadedFile = null, isBatchMode = false, batchFileCount = 0 }: ConfigFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSatPoint, setShowSatPoint] = useState(false);
  const [showMimeType, setShowMimeType] = useState(false);
  const [showRareSats, setShowRareSats] = useState(false);
  const [rareSatsAvailability, setRareSatsAvailability] = useState<'unknown' | 'available' | 'unavailable'>('unknown');
  const [containerStatus, setContainerStatus] = useState<'unknown' | 'valid' | 'invalid'>('unknown');
  const [portStatus, setPortStatus] = useState<'unknown' | 'valid' | 'invalid'>('unknown');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      containerName: "ordinals_ord_1",
      feeRate: 4,
      advancedMode: false,
      port: 4000,
      noLimitCheck: false,
      destination: "",
      satPoint: "",
      selectedSatoshi: "",
      useSatRarity: false,
      parentId: "",
      dryRun: false,
      mimeType: "",
      optimizeImage: false,
      includeMetadata: false,
      metadataStorage: 'on-chain',
      metadataJson: JSON.stringify({
        name: "My NFT",
        description: "A unique Ordinals inscription",
        attributes: [
          {
            trait_type: "Type",
            value: "Image"
          },
          {
            trait_type: "Collection",
            value: "Ordinals"
          }
        ]
      }, null, 2)
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    // Add the fixed container path to the values
    const configWithPath: ConfigOptions = {
      ...values,
      containerPath: DEFAULT_CONTAINER_PATH,
    };
    onGenerateCommands(configWithPath);
  };

  const handleAdvancedToggle = (checked: boolean) => {
    setShowAdvanced(checked);
    form.setValue("advancedMode", checked);
  };
  
  const handleSatPointToggle = (checked: boolean) => {
    setShowSatPoint(checked);
    if (!checked) {
      form.setValue("satPoint", "");
    }
  };
  
  const handleMimeTypeToggle = (checked: boolean) => {
    setShowMimeType(checked);
    if (!checked) {
      form.setValue("mimeType", "");
    }
  };
  
  const checkRareSatsAvailability = async () => {
    try {
      console.log("Checking rare sats availability...");
      const rareSats = await fetchRareSatsFromWallet();
      console.log(`Found ${rareSats.length} rare sats in wallet`);
      setRareSatsAvailability(rareSats.length > 0 ? 'available' : 'unavailable');
      return rareSats.length > 0;
    } catch (error) {
      console.error('Error checking rare sats availability:', error);
      setRareSatsAvailability('unavailable');
      return false;
    }
  };

  const handleRareSatsToggle = async (checked: boolean) => {
    setShowRareSats(checked);
    form.setValue("useSatRarity", checked);
    
    if (checked) {
      // Check if there are rare sats available when toggling on
      const available = await checkRareSatsAvailability();
      console.log(`Rare sats available: ${available}, availability state: ${rareSatsAvailability}`);
    }
    
    if (!checked) {
      form.setValue("selectedSatoshi", "");
    }
  };
  
  const checkContainerStatus = async (containerName: string) => {
    try {
      const response = await apiRequest('GET', `/api/container/check?name=${containerName}`);
      const data = await response.json();
      
      if (data.exists) {
        setContainerStatus('valid');
      } else {
        setContainerStatus('invalid');
      }
    } catch (error) {
      console.error('Error checking container status:', error);
      setContainerStatus('invalid');
    }
  };
  
  const checkPortStatus = async (port: number) => {
    try {
      const response = await apiRequest('GET', `/api/port/check?port=${port}`);
      const data = await response.json();
      
      if (data.available) {
        setPortStatus('valid');
      } else {
        setPortStatus('invalid');
      }
    } catch (error) {
      console.error('Error checking port status:', error);
      setPortStatus('invalid');
    }
  };
  
  // Watch for container name changes
  useEffect(() => {
    const containerName = form.watch('containerName');
    const port = form.watch('port');
    
    const subscription = form.watch((value, { name }) => {
      if (name === 'containerName' && value.containerName) {
        setContainerStatus('unknown');
        const timer = setTimeout(() => {
          if (value.containerName) {
            checkContainerStatus(value.containerName);
          }
        }, 500);
        return () => clearTimeout(timer);
      }
      
      if (name === 'port' && value.port) {
        setPortStatus('unknown');
        const timer = setTimeout(() => {
          if (value.port) {
            checkPortStatus(Number(value.port));
          }
        }, 500);
        return () => clearTimeout(timer);
      }
    });
    
    // Check initial values
    if (containerName) {
      checkContainerStatus(containerName);
    }
    
    // Check initial port value
    if (port) {
      checkPortStatus(Number(port));
    }
    
    // Listen for optimization updates from ImagePreview component
    const handleUpdateOptimization = (event: any) => {
      if (event.detail && event.detail.optimize !== undefined) {
        form.setValue("optimizeImage", event.detail.optimize);
      }
    };
    
    // Add event listener to the form element once it's mounted
    const formElement = document.querySelector('form[name="config-form"]');
    if (formElement) {
      formElement.addEventListener('update-optimization', handleUpdateOptimization);
    }
    
    return () => {
      subscription.unsubscribe();
      // Clean up event listener
      const formElement = document.querySelector('form[name="config-form"]');
      if (formElement) {
        formElement.removeEventListener('update-optimization', handleUpdateOptimization);
      }
    };
  }, [form.watch, form.setValue]);

  return (
    <section className="p-6 border-b border-orange-100 dark:border-navy-700 bg-orange-50 dark:bg-navy-800">
      {/* Title is now provided in Home.tsx */}
      
      <Form {...form}>
        <form name="config-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-6">
            {/* Rare Sats toggle in main section */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="rare-sats-toggle"
                  checked={showRareSats}
                  onCheckedChange={handleRareSatsToggle}
                />
                <label
                  htmlFor="rare-sats-toggle"
                  className="text-sm font-medium leading-none text-orange-800 dark:text-orange-400 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Use Rare Sats
                </label>
              </div>
              
              {/* Warning message when no rare sats available */}
              {showRareSats && rareSatsAvailability === 'unavailable' && (
                <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-start">
                  <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400 mt-0.5 mr-2 flex-shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    No rare sats found in your wallet. Your inscription will use regular satoshis instead.
                  </p>
                </div>
              )}
            </div>
          
            <FormField
              control={form.control}
              name="feeRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-orange-800 dark:text-orange-400">Fee Rate <span className="font-normal text-sm text-gray-500 dark:text-gray-400">(Transaction Fee - sats/vB)</span></FormLabel>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <button
                      type="button"
                      className={`py-2 px-3 rounded-md text-center transition-colors ${
                        Number(field.value) <= 2 
                          ? 'bg-orange-200 dark:bg-blue-800 border border-orange-400 dark:border-blue-600 text-orange-800 dark:text-blue-100 font-medium' 
                          : 'bg-white dark:bg-navy-900 border border-gray-200 dark:border-navy-700 text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-navy-800'
                      }`}
                      onClick={() => field.onChange(1)}
                    >
                      <div className="font-medium text-gray-900 dark:text-gray-100">Economy</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Multiple Days</div>
                      <div className="text-sm text-gray-900 dark:text-gray-100">1 sat/vB</div>
                    </button>
                    <button
                      type="button"
                      className={`py-2 px-3 rounded-md text-center transition-colors ${
                        Number(field.value) >= 3 && Number(field.value) <= 5
                          ? 'bg-orange-200 dark:bg-blue-800 border border-orange-400 dark:border-blue-600 text-orange-800 dark:text-blue-100 font-medium' 
                          : 'bg-white dark:bg-navy-900 border border-gray-200 dark:border-navy-700 text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-navy-800'
                      }`}
                      onClick={() => field.onChange(4)}
                    >
                      <div className="font-medium text-gray-900 dark:text-gray-100">Normal</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">~1 hour</div>
                      <div className="text-sm text-gray-900 dark:text-gray-100">4 sat/vB</div>
                    </button>
                    <button
                      type="button"
                      className={`py-2 px-3 rounded-md text-center transition-colors ${
                        Number(field.value) >= 6 
                          ? 'bg-orange-200 dark:bg-blue-800 border border-orange-400 dark:border-blue-600 text-orange-800 dark:text-blue-100 font-medium' 
                          : 'bg-white dark:bg-navy-900 border border-gray-200 dark:border-navy-700 text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-navy-800'
                      }`}
                      onClick={() => field.onChange(8)}
                    >
                      <div className="font-medium text-gray-900 dark:text-gray-100">Custom</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Choose fee</div>
                      <div className="text-sm text-gray-900 dark:text-gray-100">8 sat/vB</div>
                    </button>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Custom:</span>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1} 
                        value={field.value} 
                        onChange={field.onChange}
                        className="max-w-[100px] text-center" 
                      />
                    </FormControl>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">sats/vB</span>
                  </div>
                  <div className="mt-4 p-4 bg-white dark:bg-navy-700 rounded-lg border border-orange-100 dark:border-navy-600">
                    <div className="flex items-start">
                      <Info className="w-4 h-4 text-orange-500 dark:text-orange-400 mt-0.5 mr-2 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Fee Calculation</h4>
                        
                        {isBatchMode ? (
                          <>
                            {/* Batch processing fee calculation */}
                            <div className="text-xs space-y-1 text-gray-600 dark:text-gray-300">
                              <p className="font-semibold text-orange-800 dark:text-orange-300">
                                Batch Processing: {batchFileCount} files selected
                              </p>
                              <p className="text-sm mt-2">
                                Each file will be inscribed sequentially with the fee rate of {field.value} sats/vB.
                              </p>
                              <p className="mt-2 text-orange-600 dark:text-orange-400 font-medium">
                                Be sure to check "Optimize Image" for large files to reduce inscription costs.
                              </p>
                              <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded mt-2 border border-amber-200 dark:border-amber-800">
                                <p className="font-medium">Estimated total fee: 
                                  {batchFileCount > 0 ? 
                                    ` ${(Number(field.value) * 250 * batchFileCount).toLocaleString()} to ${(Number(field.value) * 1000 * batchFileCount).toLocaleString()} sats`
                                    : ' (select files to calculate)'}
                                </p>
                                <p className="text-xs mt-1">Individual fees will vary based on file sizes and optimization settings.</p>
                              </div>
                            </div>
                          </>
                        ) : uploadedFile ? (
                          <>
                            {/* Dynamic fee calculation based on file size */}
                            {(() => {
                              const fileSize = uploadedFile.file.size;
                              // Use optimization setting if available, otherwise check if optimization is available
                              const optimize = form.watch("optimizeImage") || false;
                              const fee = calculateFee(fileSize, Number(field.value), optimize);
                              
                              return (
                                <>
                                  <div className="text-xs space-y-1 text-gray-600 dark:text-gray-300">
                                    <p className="font-semibold text-orange-800 dark:text-orange-300">
                                      Total estimated fee: {fee.sats.toLocaleString()} sats (≈${fee.usd})
                                    </p>
                                    
                                    <div className="pt-1.5 pb-0.5 text-xs text-gray-500 dark:text-gray-400">
                                      <div className="mb-1.5">Transaction breakdown:</div>
                                      <ul className="transaction-breakdown">
                                        <li>
                                          <span>Base tx size:</span>
                                          <span>{fee.breakdown.baseTx} bytes</span>
                                        </li>
                                        <li>
                                          <span>Witness data:</span>
                                          <span>{fee.breakdown.witness} bytes</span>
                                        </li>
                                        <li className="font-medium">
                                          <span>File content:</span>
                                          <span>{Math.round(fee.breakdown.content / 1024)} KB (~{fee.breakdown.content.toLocaleString()} bytes)</span>
                                        </li>
                                        <li>
                                          <span>Inscription size:</span>
                                          <span>{fee.breakdown.inscriptionBytes} bytes</span>
                                        </li>
                                        <li className="pt-1 border-t border-gray-100 dark:border-gray-700 font-medium">
                                          <span>Raw bytes:</span>
                                          <span>{Math.round(fee.bytes / 1024)} KB ({fee.bytes.toLocaleString()} bytes)</span>
                                        </li>
                                        <li className="font-medium text-orange-800 dark:text-orange-300">
                                          <span>Virtual bytes (segwit):</span>
                                          <span>{Math.round(fee.vBytes / 1024)} KB ({fee.vBytes.toLocaleString()} vB)</span>
                                        </li>
                                      </ul>
                                    </div>
                                    
                                    <div className="pt-1.5 pb-0.5 text-xs text-gray-500 dark:text-gray-400">
                                      <div className="mb-1.5">Segwit fee calculation:</div>
                                      <ul className="transaction-breakdown">
                                        <li>
                                          <span>Total vBytes:</span>
                                          <span>{fee.vBytes.toLocaleString()} vB</span>
                                        </li>
                                        <li>
                                          <span>Fee rate:</span>
                                          <span>{Number(field.value)} sats/vB</span>
                                        </li>
                                        <li className="pt-1 border-t border-gray-100 dark:border-gray-700 font-medium text-orange-800 dark:text-orange-300">
                                          <span>Total fee (≈{fee.effectiveFeeRate} sats/B effective):</span>
                                          <span>{fee.sats.toLocaleString()} sats</span>
                                        </li>
                                      </ul>
                                    </div>
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 border-t border-gray-100 dark:border-gray-700 pt-2">
                                    Higher fee rates increase the chance of quicker inscription confirmation.
                                    Current BTC price estimate: ${BTC_PRICE_USD.toLocaleString()} USD
                                  </p>
                                </>
                              );
                            })()}
                          </>
                        ) : (
                          <>
                            {/* Static fee calculation when no file is uploaded */}
                            {(() => {
                              // Create a simplified version of the fee calculation 
                              // for a small sample file (e.g., 5KB)
                              const sampleSize = 5 * 1024; // 5KB
                              const dummyFee = calculateFee(sampleSize, Number(field.value), false);
                              
                              return (
                                <>
                                  <p className="text-xs text-orange-800 dark:text-orange-300">
                                    <strong>Estimated base cost:</strong> {dummyFee.sats.toLocaleString()} sats (≈${dummyFee.usd} at {BTC_PRICE_USD.toLocaleString()} USD/BTC)
                                  </p>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                    <span className="block mb-1">Transaction breakdown:</span>
                                    <ul className="transaction-breakdown">
                                      <li>
                                        <span>Base transaction:</span>
                                        <span>{dummyFee.breakdown.baseTx} bytes</span>
                                      </li>
                                      <li>
                                        <span>Witness data:</span>
                                        <span>{dummyFee.breakdown.witness} bytes</span>
                                      </li>
                                      <li>
                                        <span>Inscription size:</span>
                                        <span>{dummyFee.breakdown.inscriptionBytes} bytes</span>
                                      </li>
                                      <li>
                                        <span>Virtual bytes:</span>
                                        <span>{dummyFee.vBytes} vB</span>
                                      </li>
                                    </ul>
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                    Upload a file to see a more accurate fee calculation based on file size.
                                  </p>
                                </>
                              );
                            })()}
                            
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch 
              id="advanced-mode"
              checked={showAdvanced}
              onCheckedChange={handleAdvancedToggle}
            />
            <label
              htmlFor="advanced-mode"
              className="text-sm font-medium leading-none text-orange-800 dark:text-orange-400 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Enable advanced options
            </label>
          </div>
          
          {showAdvanced && (
            <div className="space-y-6 p-4 bg-white dark:bg-navy-700 rounded-xl border border-orange-200 dark:border-navy-600 shadow-sm">
              <h4 className="font-medium text-sm text-orange-800 dark:text-orange-400">Advanced Inscription Options</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="containerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center justify-between">
                        <span>Docker Container Name</span>
                        {containerStatus === 'valid' && (
                          <span className="inline-flex items-center text-green-600 dark:text-green-500 text-xs">
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />
                            Container exists
                          </span>
                        )}
                        {containerStatus === 'invalid' && (
                          <span className="inline-flex items-center text-red-600 dark:text-red-500 text-xs">
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Container not found
                          </span>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="ordinals_ord_1" {...field} />
                      </FormControl>
                      <FormDescription>
                        The name of your docker container running the ordinals node
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="port"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center justify-between">
                        <span>Web Server Port</span>
                        {portStatus === 'valid' && (
                          <span className="inline-flex items-center text-green-600 dark:text-green-500 text-xs">
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />
                            Port available
                          </span>
                        )}
                        {portStatus === 'invalid' && (
                          <span className="inline-flex items-center text-red-600 dark:text-red-500 text-xs">
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Port in use
                          </span>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="4000" {...field} />
                      </FormControl>
                      <FormDescription>
                        Local port to use for serving the file
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="space-y-4 mt-4">
                {/* Destination address removed as it's in its own section */}
                {/* Rare Sats section moved to its own dedicated section */}

                <div className="flex flex-col space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="sat-point-toggle"
                      checked={showSatPoint}
                      onCheckedChange={handleSatPointToggle}
                    />
                    <label
                      htmlFor="sat-point-toggle"
                      className="text-sm font-medium leading-none text-orange-800 dark:text-orange-400 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Specify Sat Point
                    </label>
                  </div>
                  
                  {showSatPoint && (
                    <FormField
                      control={form.control}
                      name="satPoint"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-orange-800 dark:text-orange-400">Sat Point</FormLabel>
                          <FormControl>
                            <Input placeholder="outpoint:vout:offset" {...field} />
                          </FormControl>
                          <FormDescription>
                            Specific satpoint to inscribe (format: outpoint:vout:offset)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="mime-type-toggle"
                      checked={showMimeType}
                      onCheckedChange={handleMimeTypeToggle}
                    />
                    <label
                      htmlFor="mime-type-toggle"
                      className="text-sm font-medium leading-none text-orange-800 dark:text-orange-400 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Specify MIME Type
                    </label>
                  </div>
                  
                  {showMimeType && (
                    <FormField
                      control={form.control}
                      name="mimeType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-orange-800 dark:text-orange-400">MIME Type</FormLabel>
                          <FormControl>
                            <Input placeholder="image/png, text/plain, etc." {...field} />
                          </FormControl>
                          <FormDescription>
                            Override automatic MIME type detection
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                

              </div>
              
              <div className="space-y-4 mt-4">
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label
                        htmlFor="no-limit-check"
                        className="text-sm font-medium leading-none text-orange-800 dark:text-orange-400 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        No Limit Check
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Skip inscription size limit check
                      </p>
                    </div>
                    <FormField
                      control={form.control}
                      name="noLimitCheck"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Switch 
                              id="no-limit-check"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label
                        htmlFor="dry-run"
                        className="text-sm font-medium leading-none text-orange-800 dark:text-orange-400 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Dry Run
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Perform all checks without creating transaction
                      </p>
                    </div>
                    <FormField
                      control={form.control}
                      name="dryRun"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Switch 
                              id="dry-run"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-orange-50 dark:bg-navy-600 rounded-lg text-xs text-orange-800 dark:text-orange-300">
                <strong>Note:</strong> All files will be saved to {DEFAULT_CONTAINER_PATH} within the container
              </div>
              
              {form.watch("noLimitCheck") && (
                <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg text-xs text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                  <strong>Warning:</strong> Disabling size limit checks may cause transactions to fail if the inscription is too large for the Bitcoin network. Use with caution.
                </div>
              )}
            </div>
          )}
          
          <div className="pt-2">
            <Button type="submit" className="w-full bg-orange-600 dark:bg-orange-700 hover:bg-orange-700 dark:hover:bg-orange-600">
              {isBatchMode ? 'Prepare Batch Processing' : 'Confirm Ordinal Inscription'}
            </Button>
          </div>
        </form>
      </Form>
    </section>
  );
}
