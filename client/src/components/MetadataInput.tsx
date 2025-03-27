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
    this.generateExample = this.generateExample.bind(this);
  }

  // Create example metadata for batch or single mode
  generateExample() {
    try {
      const { form, isBatchMode, batchFileCount, batchFileNames } = this.props;
      
      // Safety check to make sure form is available
      if (!form || typeof form.setValue !== 'function') {
        console.log('Form not properly initialized');
        return;
      }
      
      if (isBatchMode && batchFileCount && batchFileCount > 0) {
        // For batch mode, create an array of metadata objects
        const metadataArray = [];
        const safeCount = Math.min(batchFileCount, 100); // Limit to reasonable size
        
        for (let i = 0; i < safeCount; i++) {
          const fileName = batchFileNames && batchFileNames[i] ? batchFileNames[i] : `file_${i + 1}`;
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
                value: `${i + 1} of ${safeCount}`
              }
            ]
          });
        }
        
        form.setValue("metadataJson", JSON.stringify(metadataArray, null, 2));
      } else {
        // For single mode, create a single metadata object
        form.setValue("metadataJson", JSON.stringify({
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
    } catch (err) {
      console.log('Error in generateExample:', err);
      // Fallback to simple metadata to avoid crashing
      try {
        const { form } = this.props;
        form.setValue("metadataJson", JSON.stringify({ name: "Example Inscription" }, null, 2));
      } catch (fallbackErr) {
        console.log('Fallback metadata generation failed:', fallbackErr);
      }
    }
  }

  handleMetadataToggle(checked: boolean, onChange: (value: boolean) => void) {
    try {
      // First update the form control
      onChange(checked);
      
      // If enabled, generate example metadata
      if (checked) {
        // Use setTimeout to defer the execution, avoiding potential React lifecycle issues
        setTimeout(() => {
          try {
            this.generateExample();
          } catch (err) {
            console.log('Error generating example metadata:', err);
            
            // Fallback to a simple metadata example if the main one fails
            const { form, isBatchMode } = this.props;
            const fallbackMetadata = isBatchMode 
              ? JSON.stringify([{ name: "Example Inscription" }], null, 2)
              : JSON.stringify({ name: "Example Inscription" }, null, 2);
              
            form.setValue("metadataJson", fallbackMetadata);
          }
        }, 0);
      }
    } catch (err) {
      console.log('Error toggling metadata:', err);
      // Don't let errors bubble up
    }
  }

  render() {
    try {
      // Get props with safety checks
      const { form, isBatchMode, batchFileCount } = this.props;
      
      // Safely get includeMetadata value
      let includeMetadata = false;
      try {
        if (form && typeof form.watch === 'function') {
          includeMetadata = form.watch("includeMetadata");
        }
      } catch (err) {
        console.log('Error watching includeMetadata:', err);
      }

      return (
        <div className="space-y-4">
          {/* Form field for the metadata toggle switch */}
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
                    checked={field.value || false}
                    onCheckedChange={(checked) => {
                      try {
                        this.handleMetadataToggle(checked, field.onChange);
                      } catch (err) {
                        console.log('Error in switch change handler:', err);
                        // Try direct update as fallback
                        try { field.onChange(checked); } catch(e) {}
                      }
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Only render the JSON textarea if metadata is enabled */}
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
                      value={field.value || ''}
                      onChange={(e) => {
                        try {
                          field.onChange(e);
                        } catch (err) {
                          console.log('Error in textarea change:', err);
                        }
                      }}
                      onBlur={(e) => {
                        try {
                          field.onBlur();
                        } catch (err) {
                          console.log('Error in textarea blur:', err);
                        }
                      }}
                      name={field.name}
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
    } catch (err) {
      console.log('Error rendering MetadataInput:', err);
      // Render fallback UI in case of error
      return (
        <div className="space-y-4">
          <div className="p-4 border border-orange-100 dark:border-navy-700 rounded-lg">
            <div className="text-base text-orange-800 dark:text-orange-400">Include Metadata</div>
            <div className="text-sm text-gray-500">
              Store additional information with your inscription
            </div>
            <div className="mt-2">
              <Switch 
                checked={false}
                onCheckedChange={() => {
                  console.log('Trying to toggle metadata in fallback UI');
                }}
              />
            </div>
          </div>
        </div>
      );
    }
  }
}

export default MetadataInput;