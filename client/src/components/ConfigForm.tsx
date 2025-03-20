import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ConfigOptions } from "@/lib/types";

const formSchema = z.object({
  containerName: z.string().min(1, {
    message: "Container name is required",
  }),
  feeRate: z.coerce.number().min(1, {
    message: "Fee rate must be at least 1",
  }),
  advancedMode: z.boolean().default(false),
  containerPath: z.string().optional(),
  port: z.coerce.number().min(1025).max(65535).optional(),
});

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
      containerPath: "/data/",
      port: 8000,
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    onGenerateCommands(values);
  };

  const handleAdvancedToggle = (checked: boolean) => {
    setShowAdvanced(checked);
    form.setValue("advancedMode", checked);
  };

  return (
    <section className="p-6 border-b border-gray-200">
      <h2 className="text-xl font-medium mb-4">3. Configure Inscription</h2>
      
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
              Enable advanced mode
            </label>
          </div>
          
          {showAdvanced && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-md">
              <h4 className="font-medium text-sm text-gray-700">Advanced Options</h4>
              
              <FormField
                control={form.control}
                name="containerPath"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Container Path</FormLabel>
                    <FormControl>
                      <Input placeholder="/data/" {...field} />
                    </FormControl>
                    <FormDescription>
                      Directory path inside container to save the file
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
            </div>
          )}
          
          <div className="pt-2">
            <Button type="submit" className="w-full">
              Generate Commands
            </Button>
          </div>
        </form>
      </Form>
    </section>
  );
}
