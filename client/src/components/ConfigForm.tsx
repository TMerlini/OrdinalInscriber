import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfigOptions } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { InfoIcon } from "lucide-react";

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
  metadataStorage: z.enum(['on-chain', 'off-chain']).default('on-chain'),
  metadataJson: z.string().optional(),
});

// Fixed container path that will be used across the application
export const DEFAULT_CONTAINER_PATH = "/ord/data/";

interface ConfigFormProps {
  onGenerateCommands: (config: ConfigOptions) => void;
}

export default function ConfigForm({ onGenerateCommands }: ConfigFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  return (
    <section className="p-6 border-b border-orange-100 dark:border-navy-700 bg-orange-50 dark:bg-navy-800">
      <h2 className="text-xl font-semibold mb-4 text-orange-800 dark:text-orange-400">2. Configure Inscription</h2>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="containerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Docker Container Name</FormLabel>
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
                      <FormLabel>Web Server Port</FormLabel>
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
                
                <FormField
                  control={form.control}
                  name="destination"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destination Address</FormLabel>
                      <FormControl>
                        <Input placeholder="bitcoin address" {...field} />
                      </FormControl>
                      <FormDescription>
                        Address to send the inscription to (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
          
          {/* Metadata Section */}
          <div className="space-y-6 p-4 bg-white dark:bg-navy-700 rounded-xl border border-orange-200 dark:border-navy-600 shadow-sm">
            <h4 className="font-medium text-sm text-orange-800 dark:text-orange-400">Metadata Options</h4>
            
            <FormField
              control={form.control}
              name="includeMetadata"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-orange-100 dark:border-navy-600 p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Include Metadata JSON</FormLabel>
                    <FormDescription>
                      Add JSON metadata to your inscription
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            {form.watch("includeMetadata") && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="metadataStorage"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Storage Type</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="on-chain" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              On-Chain
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="off-chain" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Off-Chain
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Card className="border-orange-100 dark:border-navy-600">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {form.watch("metadataStorage") === 'on-chain' ? 'On-Chain Storage' : 'Off-Chain Storage'}
                      </h5>
                      <InfoIcon className="h-4 w-4 text-gray-400" />
                    </div>
                    
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                      {form.watch("metadataStorage") === 'on-chain' ? (
                        <>
                          <p>• Stored in the Bitcoin Blockchain: visible on any Bitcoin marketplace</p>
                          <p>• Becomes immutable once inscribed</p>
                          <p>• Can be uploaded immediately upon submitting your collection mint</p>
                          <p>• Does not support old collections that are already minted</p>
                        </>
                      ) : (
                        <>
                          <p>• Stored in the in-house database: only visible on Gamma</p>
                          <p>• Can be updated anytime upon request</p>
                          <p>• Uploaded after the collection mint is sold out</p>
                          <p>• Can be applied to old collections without metadata</p>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                <FormField
                  control={form.control}
                  name="metadataJson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Metadata JSON</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter JSON metadata"
                          className="font-mono min-h-[200px] resize-y bg-gray-50 dark:bg-navy-900"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter valid JSON metadata to include with your inscription
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>
          
          <div className="pt-2">
            <Button type="submit" className="w-full bg-orange-600 dark:bg-orange-700 hover:bg-orange-700 dark:hover:bg-orange-600">
              Generate Commands
            </Button>
          </div>
        </form>
      </Form>
    </section>
  );
}
