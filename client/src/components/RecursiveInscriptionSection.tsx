import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, ChevronRight, FileCode, FileImage, Link2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";

// Form schema for parent/child inscription relationship
const recursiveSchema = z.object({
  parentInscriptionId: z.string().min(1, "Parent inscription ID is required"),
  recursionType: z.enum(["html", "svg", "css", "custom"]),
  customContentType: z.string().optional(),
  content: z.string().min(1, "Content is required"),
  description: z.string().optional(),
  destination: z.string().optional(),
  feeRate: z.string().min(1, "Fee rate is required"),
  addParentMetadata: z.boolean().default(false)
});

type RecursiveFormValues = z.infer<typeof recursiveSchema>;

// Example templates for different recursion types
const TEMPLATES = {
  html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recursive Inscription</title>
  <style>
    body { margin: 0; padding: 0; overflow: hidden; }
    .parent-container { width: 100vw; height: 100vh; display: flex; justify-content: center; align-items: center; }
    .parent-inscription { max-width: 100%; max-height: 100%; }
  </style>
</head>
<body>
  <div class="parent-container">
    <img class="parent-inscription" src="/content/${'{'}parentId{'}'}" />
  </div>
</body>
</html>`,

  svg: `<svg width="600" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f0f0f0" />
  <image href="/content/${'{'}parentId{'}'}" x="50" y="50" width="500" height="500" />
  <rect x="40" y="40" width="520" height="520" fill="none" stroke="#333" stroke-width="5" />
  <text x="300" y="30" font-family="Arial" font-size="20" text-anchor="middle">Recursive Inscription</text>
</svg>`,

  css: `:root {
  --parent-inscription: url("/content/${'{'}parentId{'}'}")
}

body {
  margin: 0;
  padding: 0;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f5f5f5;
}

.parent-frame {
  width: 90vw;
  height: 90vh;
  max-width: 800px;
  max-height: 800px;
  background-image: var(--parent-inscription);
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  border: 10px solid #333;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}`
};

export default function RecursiveInscriptionSection() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [inscribeCommand, setInscribeCommand] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RecursiveFormValues>({
    resolver: zodResolver(recursiveSchema),
    defaultValues: {
      parentInscriptionId: "",
      recursionType: "html",
      customContentType: "",
      content: TEMPLATES.html,
      description: "Recursive inscription referencing another inscription",
      feeRate: "5",
      addParentMetadata: false
    }
  });
  
  // Watch form values to update template when recursion type changes
  const recursionType = form.watch("recursionType");
  const parentId = form.watch("parentInscriptionId");
  
  // Update content template when recursion type changes
  React.useEffect(() => {
    if (recursionType && TEMPLATES[recursionType as keyof typeof TEMPLATES]) {
      let template = TEMPLATES[recursionType as keyof typeof TEMPLATES];
      // Replace the placeholder with the actual parent ID if it exists
      if (parentId) {
        template = template.replace(/\{parentId\}/g, parentId);
      }
      form.setValue("content", template);
    }
  }, [recursionType, parentId, form]);

  const handleFetchParent = async () => {
    const parentId = form.getValues("parentInscriptionId");
    if (!parentId) {
      setPreviewError("Please enter a parent inscription ID");
      return;
    }

    setIsLoading(true);
    setPreviewError(null);
    
    try {
      // Fetch parent inscription preview
      const response = await apiRequest("GET", `/api/inscriptions/preview/${parentId}`);
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to fetch parent inscription");
      }
      
      const data = await response.json();
      setPreviewUrl(data.previewUrl);
    } catch (error) {
      console.error("Error fetching parent inscription:", error);
      setPreviewError(typeof error === 'object' && error !== null ? (error as Error).message : String(error));
      setPreviewUrl(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateCommand = async (values: RecursiveFormValues) => {
    setIsLoading(true);
    setInscribeCommand(null);
    
    try {
      // Generate inscription command
      const response = await apiRequest("POST", "/api/recursive/generate-command", {
        ...values,
        // Replace template placeholders with actual values if they exist
        content: values.content.replace(/\{parentId\}/g, values.parentInscriptionId)
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to generate command");
      }
      
      const data = await response.json();
      setInscribeCommand(data.command);
    } catch (error) {
      console.error("Error generating command:", error);
      setPreviewError(typeof error === 'object' && error !== null ? (error as Error).message : String(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCommand = () => {
    if (inscribeCommand) {
      navigator.clipboard.writeText(inscribeCommand);
      // You could add a toast notification here
    }
  };

  return (
    <div className="recursive-inscription-section space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <Link2 className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-medium">Recursive Inscription Manager</h3>
      </div>
      
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 mb-4">
        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleGenerateCommand)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="parentInscriptionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Inscription ID</FormLabel>
                      <div className="flex space-x-2">
                        <FormControl>
                          <Input 
                            placeholder="e.g., 38cb0208e113b4242d03ae7d5a2ecb77c0367f153347a68d9e3f65f4f8127a74i0" 
                            {...field} 
                          />
                        </FormControl>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={handleFetchParent}
                          disabled={isLoading || !field.value}
                        >
                          Preview
                        </Button>
                      </div>
                      <FormDescription>
                        The inscription you want to reference in your recursive inscription
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Tabs defaultValue="html" onValueChange={(value) => form.setValue("recursionType", value as any)}>
                  <TabsList className="mb-4 w-full flex gap-2 p-2 bg-orange-50 dark:bg-navy-800 rounded-lg">
                    <TabsTrigger 
                      value="html" 
                      className="flex-1 px-4 py-2 data-[state=active]:bg-orange-600 data-[state=active]:text-white"
                    >
                      <FileCode className="h-4 w-4 mr-2" />
                      HTML
                    </TabsTrigger>
                    <TabsTrigger 
                      value="svg" 
                      className="flex-1 px-4 py-2 data-[state=active]:bg-orange-600 data-[state=active]:text-white"
                    >
                      <FileImage className="h-4 w-4 mr-2" />
                      SVG
                    </TabsTrigger>
                    <TabsTrigger 
                      value="css" 
                      className="flex-1 px-4 py-2 data-[state=active]:bg-orange-600 data-[state=active]:text-white"
                    >
                      <FileCode className="h-4 w-4 mr-2" />
                      CSS
                    </TabsTrigger>
                    <TabsTrigger 
                      value="custom" 
                      className="flex-1 px-4 py-2 data-[state=active]:bg-orange-600 data-[state=active]:text-white"
                    >
                      <FileCode className="h-4 w-4 mr-2" />
                      Custom
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="custom">
                    <FormField
                      control={form.control}
                      name="customContentType"
                      render={({ field }) => (
                        <FormItem className="mb-4">
                          <FormLabel>Content Type</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., text/html, image/svg+xml" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            MIME type for your custom content
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                </Tabs>

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content</FormLabel>
                      <FormControl>
                        <Textarea 
                          className="h-60 font-mono text-sm"
                          placeholder="Enter your recursive inscription content" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Use {'{parentId}'} as a placeholder for the parent inscription ID
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Brief description of this recursive inscription" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="destination"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destination Address (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Bitcoin address to receive the inscription" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Leave empty to use ord's default address
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
                        <Input 
                          type="number" 
                          min="1"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="addParentMetadata"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Include Parent Metadata</FormLabel>
                        <FormDescription>
                          Add reference to parent in inscription metadata
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

                <Button type="submit" className="w-full" disabled={isLoading}>
                  Generate Inscription Command
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {previewError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{previewError}</AlertDescription>
            </Alert>
          )}

          {previewUrl && (
            <Card>
              <CardContent className="pt-6">
                <h4 className="text-sm font-medium mb-2">Parent Inscription Preview:</h4>
                <div className="border rounded-lg overflow-hidden bg-muted/30 p-4 flex items-center justify-center">
                  <img 
                    src={previewUrl} 
                    alt="Parent Inscription" 
                    className="max-w-full max-h-[300px] object-contain" 
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {inscribeCommand && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-medium">Inscription Command:</h4>
                  <Button variant="outline" size="sm" onClick={handleCopyCommand}>
                    Copy
                  </Button>
                </div>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                  {inscribeCommand}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}