import React from "react";
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface MetadataInputProps {
  form: UseFormReturn<any>;
}

export default function MetadataInput({ form }: MetadataInputProps) {
  const { watch, setValue } = form;
  const includeMetadata = watch("includeMetadata");

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="includeMetadata"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-orange-100 dark:border-navy-700 p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Include Metadata</FormLabel>
              <FormDescription>
                Store additional information with your inscription
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
        <FormField
          control={form.control}
          name="metadataJson"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Metadata JSON</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter JSON metadata"
                  className="font-mono text-sm h-48 dark:bg-navy-950"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                This JSON will be stored on-chain with your inscription
              </FormDescription>
            </FormItem>
          )}
        />
      )}
    </div>
  );
}