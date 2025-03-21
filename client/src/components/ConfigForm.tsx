import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfigOptions } from "@/lib/types";
import { CheckCircle, XCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

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
}

export default function ConfigForm({ onGenerateCommands }: ConfigFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSatPoint, setShowSatPoint] = useState(false);
  const [showMimeType, setShowMimeType] = useState(false);
  const [containerStatus, setContainerStatus] = useState<'unknown' | 'valid' | 'invalid'>('unknown');
  const [portStatus, setPortStatus] = useState<'unknown' | 'valid' | 'invalid'>('unknown');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      containerName: "ord-container",
      feeRate: 4,
      advancedMode: false,
      port: 8000,
      noLimitCheck: false,
      destination: "",
      satPoint: "",
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
    
    return () => subscription.unsubscribe();
  }, [form.watch]);

  return (
    <section className="p-6 border-b border-orange-100 dark:border-navy-700 bg-orange-50 dark:bg-navy-800">
      <h2 className="text-xl font-semibold mb-4 text-orange-800 dark:text-orange-400">4. Configure Inscription</h2>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <Input placeholder="ord-container" {...field} />
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
              name="feeRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fee Rate (sats/vB)</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} placeholder="4" {...field} />
                  </FormControl>
                  <FormDescription>
                    Transaction fee rate in satoshis per virtual byte
                  </FormDescription>
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
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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
                        <Input type="number" placeholder="8000" {...field} />
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
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="sat-point-toggle"
                      checked={showSatPoint}
                      onCheckedChange={handleSatPointToggle}
                    />
                    <label
                      htmlFor="sat-point-toggle"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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
                          <FormLabel>Sat Point</FormLabel>
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
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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
                          <FormLabel>MIME Type</FormLabel>
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
                
                <FormField
                  control={form.control}
                  name="parentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Inscription ID</FormLabel>
                      <FormControl>
                        <Input placeholder="inscription ID" {...field} />
                      </FormControl>
                      <FormDescription>
                        Create a child inscription under this parent
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex flex-wrap gap-6 mt-4">
                <FormField
                  control={form.control}
                  name="noLimitCheck"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          No Limit Check
                        </FormLabel>
                        <FormDescription>
                          Skip inscription size limit check
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="dryRun"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Dry Run
                        </FormLabel>
                        <FormDescription>
                          Perform all checks without creating transaction
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
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
              Confirm Ordinal Inscription
            </Button>
          </div>
        </form>
      </Form>
    </section>
  );
}
