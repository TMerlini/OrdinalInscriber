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
    <section className="p-6 border-b border-orange-100 bg-gradient-to-r from-orange-50 to-transparent">
      <h2 className="text-xl font-semibold mb-4 text-orange-800">3. Configure Inscription</h2>
      
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
            <div className="space-y-6 p-4 bg-white rounded-xl border border-orange-200 shadow-sm">
              <h4 className="font-medium text-sm text-orange-800">Advanced Inscription Options</h4>
              
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
              
              <div className="flex flex-wrap gap-6">
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
              </div>
              
              <div className="p-3 bg-orange-50 rounded-lg text-xs text-orange-800">
                <strong>Note:</strong> All files will be saved to {DEFAULT_CONTAINER_PATH} within the container
              </div>
              
              {form.watch("noLimitCheck") && (
                <div className="p-3 bg-red-50 rounded-lg text-xs text-red-600 border border-red-200">
                  <strong>Warning:</strong> Disabling size limit checks may cause transactions to fail if the inscription is too large for the Bitcoin network. Use with caution.
                </div>
              )}
            </div>
          )}
          
          <div className="pt-2">
            <Button type="submit" className="w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600">
              Generate Commands
            </Button>
          </div>
        </form>
      </Form>
    </section>
  );
}
