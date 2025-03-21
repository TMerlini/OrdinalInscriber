import React, { useState } from 'react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { InfoIcon } from "lucide-react";

interface MetadataInputProps {
  onMetadataChange: (includeMetadata: boolean, storage: 'on-chain' | 'off-chain', json: string) => void;
}

const DEFAULT_JSON = `{
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
}`;

export default function MetadataInput({ onMetadataChange }: MetadataInputProps) {
  const [includeMetadata, setIncludeMetadata] = useState(false);
  const [storageType, setStorageType] = useState<'on-chain' | 'off-chain'>('on-chain');
  const [metadataJson, setMetadataJson] = useState(DEFAULT_JSON);

  const handleToggleMetadata = (checked: boolean) => {
    setIncludeMetadata(checked);
    onMetadataChange(checked, storageType, metadataJson);
  };

  const handleStorageChange = (value: 'on-chain' | 'off-chain') => {
    setStorageType(value);
    onMetadataChange(includeMetadata, value, metadataJson);
  };

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMetadataJson(e.target.value);
    onMetadataChange(includeMetadata, storageType, e.target.value);
  };

  return (
    <div className="mt-5 space-y-4">
      <div className="flex items-center space-x-2">
        <Switch 
          id="include-metadata" 
          checked={includeMetadata} 
          onCheckedChange={handleToggleMetadata}
        />
        <Label htmlFor="include-metadata" className="font-medium">Include Metadata JSON</Label>
      </div>

      {includeMetadata && (
        <>
          <div className="mt-4">
            <RadioGroup 
              value={storageType} 
              onValueChange={(value) => handleStorageChange(value as 'on-chain' | 'off-chain')}
              className="flex flex-col space-y-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="on-chain" id="on-chain" />
                <Label htmlFor="on-chain" className="font-medium">On-Chain</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="off-chain" id="off-chain" />
                <Label htmlFor="off-chain" className="font-medium">Off-Chain</Label>
              </div>
            </RadioGroup>
          </div>

          <Card className="mt-4 border-orange-200 dark:border-navy-700">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {storageType === 'on-chain' ? 'On-Chain Storage' : 'Off-Chain Storage'}
                  </h3>
                  <InfoIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </div>
                
                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  {storageType === 'on-chain' ? (
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
              </div>
            </CardContent>
          </Card>

          <div className="mt-4">
            <Label htmlFor="metadata-json" className="block mb-2 font-medium">Metadata JSON</Label>
            <Textarea
              id="metadata-json"
              placeholder="Enter JSON metadata here"
              className="font-mono text-sm h-40 min-h-[160px] bg-white dark:bg-navy-900 border-orange-200 dark:border-navy-700"
              value={metadataJson}
              onChange={handleJsonChange}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Enter valid JSON data to be included with your inscription.
            </p>
          </div>
        </>
      )}
    </div>
  );
}