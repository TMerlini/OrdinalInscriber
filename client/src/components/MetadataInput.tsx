import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface MetadataInputProps {
  form: UseFormReturn<any>;
  isBatchMode?: boolean;
  batchFileCount?: number;
  batchFileNames?: string[];
}

export default function MetadataInput({ 
  form, 
  isBatchMode = false, 
  batchFileCount = 0,
  batchFileNames = []
}: MetadataInputProps) {
  const { watch, setValue } = form;
  const includeMetadata = watch("includeMetadata");

  // Create example metadata for batch or single mode
  function handleGenerateExample() {
    if (isBatchMode && batchFileCount > 0) {
      // For batch mode, create an array of metadata objects
      const metadataArray = [];
      for (let i = 0; i < batchFileCount; i++) {
        const fileName = batchFileNames[i] || `file_${i + 1}`;
        metadataArray.push({
          name: `Inscription ${i + 1}`,
          description: `Description for ${fileName}`,
          collection: "My Ordinals Collection",
          attributes: [
            {
              trait_type: "Type",
              value: "Image"
            },
            {
              trait_type: "Number",
              value: `${i + 1} of ${batchFileCount}`
            }
          ]
        });
      }
      setValue("metadataJson", JSON.stringify(metadataArray, null, 2));
    } else {
      // For single mode, create a single metadata object
      setValue("metadataJson", JSON.stringify({
        name: "My Inscription",
        description: "A unique Ordinals inscription",
        collection: "My Ordinals Collection",
        attributes: [
          {
            trait_type: "Type",
            value: "Image"
          }
        ]
      }, null, 2));
    }
  }

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="includeMetadata"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-orange-100 dark:border-navy-700 p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base text-orange-800 dark:text-orange-400">Include Metadata</FormLabel>
              <FormDescription>
                Store additional information with your {isBatchMode ? "inscriptions" : "inscription"}
              </FormDescription>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={(checked) => {
                  field.onChange(checked);
                  if (checked) {
                    // Generate example metadata when the switch is turned on
                    setTimeout(() => handleGenerateExample(), 0);
                  }
                }}
              />
            </FormControl>
          </FormItem>
        )}
      />

      {includeMetadata && (
        <FormField
          control={form.control}
          name="metadataJson"
          render={({ field }) => (
            <FormItem>
              <div className="flex justify-between items-center mb-1">
                <FormLabel className="text-orange-800 dark:text-orange-400">Metadata JSON</FormLabel>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleGenerateExample}
                  className="text-xs h-7 px-2"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Generate Example
                </Button>
              </div>
              <FormControl>
                <Textarea
                  placeholder="Enter JSON metadata"
                  className="font-mono text-sm h-48 dark:bg-navy-950"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {isBatchMode 
                  ? "This JSON array will be used for all inscriptions. Each object in the array corresponds to a file."
                  : "This JSON will be stored on-chain with your inscription"}
                {isBatchMode && batchFileCount > 0 && (
                  <span className="block mt-1 text-amber-600 dark:text-amber-400">
                    Make sure to provide exactly {batchFileCount} metadata objects for {batchFileCount} files.
                  </span>
                )}
              </FormDescription>
            </FormItem>
          )}
        />
      )}
    </div>
  );
}