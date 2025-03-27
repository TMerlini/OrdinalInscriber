import React from "react";
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface MetadataInputProps {
  form: UseFormReturn<any>;
  isBatchMode?: boolean;
  batchFileCount?: number;
  batchFileNames?: string[];
}

// Using a class component instead of hooks to avoid runtime errors
class MetadataInput extends React.Component<MetadataInputProps> {
  constructor(props: MetadataInputProps) {
    super(props);
    this.handleMetadataToggle = this.handleMetadataToggle.bind(this);
  }

  handleMetadataToggle(checked: boolean, onChange: (value: boolean) => void) {
    onChange(checked);
    if (checked) {
      // Initialize empty metadata structure
      const { form, isBatchMode, batchFileCount } = this.props;
      if (isBatchMode && batchFileCount && batchFileCount > 0) {
        // Empty array of objects for batch mode
        form.setValue("metadataJson", JSON.stringify(Array(batchFileCount).fill({}), null, 2));
      } else {
        // Empty object for single mode
        form.setValue("metadataJson", JSON.stringify({}, null, 2));
      }
    }
  }

  render() {
    const { form, isBatchMode, batchFileCount } = this.props;
    const includeMetadata = form.watch("includeMetadata");

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
                  onCheckedChange={(checked) => this.handleMetadataToggle(checked, field.onChange)}
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
                <div className="mb-1">
                  <FormLabel className="text-orange-800 dark:text-orange-400">Metadata JSON</FormLabel>
                </div>
                <FormControl>
                  <Textarea
                    placeholder="Enter JSON metadata"
                    className="font-mono text-sm h-48 dark:bg-navy-950"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormDescription>
                  {isBatchMode 
                    ? "This JSON array will be used for all inscriptions. Each object in the array corresponds to a file."
                    : "This JSON will be stored on-chain with your inscription"}
                  {isBatchMode && batchFileCount && batchFileCount > 0 && (
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
}

export default MetadataInput;