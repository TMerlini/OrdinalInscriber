import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { InfoIcon } from "lucide-react";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";

interface MetadataInputProps {
  form: UseFormReturn<any>;
}

export default function MetadataInput({ form }: MetadataInputProps) {
  const [isValidJson, setIsValidJson] = useState(true);
  const metadataValue = form.watch("metadataJson");
  const includeMetadata = form.watch("includeMetadata");
  const metadataStorage = form.watch("metadataStorage");

  // Validate JSON whenever it changes
  useEffect(() => {
    if (!metadataValue) {
      setIsValidJson(true);
      return;
    }

    try {
      JSON.parse(metadataValue);
      setIsValidJson(true);
    } catch (error) {
      setIsValidJson(false);
    }
  }, [metadataValue]);

  return (
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
      
      {includeMetadata && (
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
                  {metadataStorage === 'on-chain' ? 'On-Chain Storage' : 'Off-Chain Storage'}
                </h5>
                <InfoIcon className="h-4 w-4 text-gray-400" />
              </div>
              
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                {metadataStorage === 'on-chain' ? (
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
                    className={`font-mono min-h-[200px] resize-y bg-gray-50 dark:bg-navy-900 ${!isValidJson ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Enter valid JSON metadata to include with your inscription
                </FormDescription>
                {!isValidJson && (
                  <p className="text-sm font-medium text-red-500 mt-1">
                    Invalid JSON format. Please check your syntax.
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="text-xs text-gray-500 dark:text-gray-400 p-3 bg-orange-50 dark:bg-navy-600 rounded border border-orange-100 dark:border-navy-500">
            <p className="font-medium mb-1">Recommended Metadata Format:</p>
            <pre className="whitespace-pre-wrap overflow-x-auto">
{`{
  "name": "My NFT", 
  "description": "A unique Ordinals inscription",
  "attributes": [
    {
      "trait_type": "Type",
      "value": "Image"
    },
    {
      "trait_type": "Collection",
      "value": "Ordinals"
    }
  ]
}`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}