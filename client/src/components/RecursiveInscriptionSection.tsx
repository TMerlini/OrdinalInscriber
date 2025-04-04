import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  AlertCircle, 
  ChevronRight, 
  FileCode, 
  FileImage, 
  Link2, 
  CopyCheck, 
  Info, 
  RefreshCw, 
  Code, 
  Palette, 
  Loader2, 
  CheckCircle2, 
  Copy 
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// Removed tooltip imports to fix DOM manipulation errors
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

// Type descriptions for tooltip information
const RECURSION_TYPE_INFO = {
  html: "Create web pages that embed and interact with other inscriptions",
  svg: "Create vector graphics that incorporate other inscriptions as elements",
  css: "Create stylesheets that use other inscriptions as backgrounds or design elements",
  custom: "Create your own custom format with a specific MIME type"
};

// Example templates for different recursion types
const TEMPLATES = {
  html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recursive Inscription</title>
  <style>
    body { margin: 0; padding: 0; overflow: hidden; background: #f8f9fa; }
    .parent-container { 
      width: 100vw; 
      height: 100vh; 
      display: flex; 
      justify-content: center; 
      align-items: center;
      flex-direction: column;
    }
    .parent-inscription { 
      max-width: 90%; 
      max-height: 80%; 
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .inscription-title {
      font-family: system-ui, -apple-system, sans-serif;
      margin-bottom: 1rem;
      color: #333;
    }
  </style>
</head>
<body>
  <div class="parent-container">
    <h1 class="inscription-title">Recursive Inscription Frame</h1>
    <img class="parent-inscription" src="/content/{parentId}" />
  </div>
</body>
</html>`,

  svg: `<svg width="600" height="600" xmlns="http://www.w3.org/2000/svg">
  <!-- Background with gradient -->
  <defs>
    <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f8f9fa;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e9ecef;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background rectangle -->
  <rect width="100%" height="100%" fill="url(#bg-gradient)" />
  
  <!-- Border frame with rounded corners -->
  <rect x="40" y="40" width="520" height="520" rx="15" ry="15" fill="none" stroke="#6c757d" stroke-width="5" />
  
  <!-- Parent inscription image in center -->
  <image href="/content/{parentId}" x="70" y="70" width="460" height="460" />
  
  <!-- Title text at top -->
  <text x="300" y="30" font-family="Arial, sans-serif" font-size="22" text-anchor="middle" fill="#212529">Recursive Inscription</text>
  
  <!-- Subtle decoration at corners -->
  <circle cx="40" cy="40" r="8" fill="#fd7e14" />
  <circle cx="560" cy="40" r="8" fill="#fd7e14" />
  <circle cx="40" cy="560" r="8" fill="#fd7e14" />
  <circle cx="560" cy="560" r="8" fill="#fd7e14" />
</svg>`,

  css: `:root {
  --parent-inscription: url("/content/{parentId}")
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

body {
  margin: 0;
  padding: 0;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f8f9fa;
  font-family: system-ui, -apple-system, sans-serif;
}

.parent-frame {
  position: relative;
  width: 90vw;
  height: 90vh;
  max-width: 800px;
  max-height: 800px;
  background-image: var(--parent-inscription);
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  border: 12px solid #495057;
  border-radius: 8px;
  box-shadow: 0 15px 30px rgba(0,0,0,0.2);
  animation: fadeIn 1.2s ease-in-out;
}

.frame-title {
  position: absolute;
  top: -50px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 24px;
  color: #343a40;
  text-shadow: 0 1px 2px rgba(255,255,255,0.8);
}`
};

export default function RecursiveInscriptionSection() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [inscribeCommand, setInscribeCommand] = useState<string | null>(null);
  const [processingTime, setProcessingTime] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [commandCopied, setCommandCopied] = useState(false);
  const { toast } = useToast();

  const form = useForm<RecursiveFormValues>({
    resolver: zodResolver(recursiveSchema),
    defaultValues: {
      parentInscriptionId: "",
      recursionType: "html",
      customContentType: "text/html",
      content: TEMPLATES.html,
      description: "Recursive inscription referencing another inscription",
      feeRate: "5",
      addParentMetadata: true
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
      
      // Also update content type for custom type if needed
      if (recursionType === "html") {
        form.setValue("customContentType", "text/html");
      } else if (recursionType === "svg") {
        form.setValue("customContentType", "image/svg+xml");
      } else if (recursionType === "css") {
        form.setValue("customContentType", "text/css");
      }
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
      
      toast({
        title: "Parent inscription found",
        description: "Preview loaded successfully",
        variant: "default",
      });
    } catch (error) {
      console.error("Error fetching parent inscription:", error);
      setPreviewError(typeof error === 'object' && error !== null ? (error as Error).message : String(error));
      setPreviewUrl(null);
      
      toast({
        title: "Error loading inscription",
        description: typeof error === 'object' && error !== null ? (error as Error).message : String(error),
        variant: "destructive",
      });
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
      setProcessingTime(data.processingTime);
      
      toast({
        title: "Command generated successfully",
        description: `Estimated processing time: ${data.processingTime}`,
        variant: "default",
      });
    } catch (error) {
      console.error("Error generating command:", error);
      setPreviewError(typeof error === 'object' && error !== null ? (error as Error).message : String(error));
      
      toast({
        title: "Error generating command",
        description: typeof error === 'object' && error !== null ? (error as Error).message : String(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCommand = () => {
    if (inscribeCommand) {
      navigator.clipboard.writeText(inscribeCommand);
      setCommandCopied(true);
      
      toast({
        title: "Command copied to clipboard",
        description: "You can now paste and run this command in your ord node",
        variant: "default",
      });
      
      setTimeout(() => setCommandCopied(false), 2000);
    }
  };

  // Helper function to get icon for recursion type
  const getRecursionTypeIcon = (type: string) => {
    switch (type) {
      case 'html':
        return <Code className="h-4 w-4 mr-2" />;
      case 'svg':
        return <FileImage className="h-4 w-4 mr-2" />;
      case 'css':
        return <Palette className="h-4 w-4 mr-2" />;
      default:
        return <FileCode className="h-4 w-4 mr-2" />;
    }
  };

  return (
    <div className="recursive-inscription-section space-y-6">
      <Card className="shadow-md border-orange-200 dark:border-navy-700">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-navy-900 dark:to-navy-800 rounded-t-lg pb-4">
          <div className="flex items-center space-x-2">
            <Link2 className="h-6 w-6 text-orange-600 dark:text-blue-400" />
            <CardTitle className="text-xl font-semibold text-orange-800 dark:text-white">Recursive Inscription Manager</CardTitle>
          </div>
          <CardDescription className="text-muted-foreground mt-1">
            Create inscriptions that reference and display other inscriptions
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6">
          <Alert className="mb-6 bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800">
            <Info className="h-4 w-4" />
            <AlertTitle>What are recursive inscriptions?</AlertTitle>
            <AlertDescription className="mt-2">
              Recursive inscriptions reference other inscriptions using <code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded text-xs">/content/{'{inscriptionId}'}</code> URLs.
              They can create frames, galleries, or interactive views of existing inscriptions.
            </AlertDescription>
          </Alert>
          
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mb-4">
            <div className="space-y-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleGenerateCommand)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="parentInscriptionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Parent Inscription ID
                        </FormLabel>
                        <FormDescription>
                          The inscription ID that this recursive inscription will reference and display.
                          <br />
                          <span className="text-xs">Format: [transaction_id]i[index]</span>
                        </FormDescription>
                        <div className="flex space-x-2">
                          <FormControl>
                            <Input 
                              placeholder="e.g., 38cb0208e113b4242d03ae7d5a2ecb77c0367f153347a68d9e3f65f4f8127a74i0" 
                              {...field} 
                              className="font-mono text-sm"
                            />
                          </FormControl>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={handleFetchParent}
                            disabled={isLoading || !field.value}
                            className="min-w-[100px]"
                          >
                            {isLoading ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4 mr-2" />
                            )}
                            Preview
                          </Button>
                        </div>
                        <FormDescription>
                          Enter the inscription ID you want to reference
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Tabs 
                    defaultValue="html" 
                    onValueChange={(value) => form.setValue("recursionType", value as any)}
                    className="mt-6"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium">
                        Recursion Format
                      </h4>
                      <Badge variant="outline" className="bg-orange-50 text-orange-800 dark:bg-navy-900 dark:text-blue-300 border-orange-200 dark:border-navy-700">
                        {recursionType.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <TabsList className="w-full flex gap-2 p-2 bg-orange-50 dark:bg-navy-800 rounded-lg mb-4">
                      {(["html", "svg", "css", "custom"] as const).map((type) => (
                        <TabsTrigger 
                          key={type}
                          value={type} 
                          className="flex-1 px-4 py-2 data-[state=active]:bg-orange-600 data-[state=active]:text-white dark:data-[state=active]:bg-blue-700"
                        >
                          {getRecursionTypeIcon(type)}
                          <span className="capitalize">{type}</span>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    
                    <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-md text-sm mb-4">
                      <p>
                        {RECURSION_TYPE_INFO[recursionType as keyof typeof RECURSION_TYPE_INFO]}
                      </p>
                    </div>
                    
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
                              MIME type for your custom content (e.g., text/html, image/svg+xml)
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
                        <FormLabel className="flex justify-between items-center">
                          <span>Content</span>
                          <Badge variant="outline" className="text-xs font-mono bg-muted">
                            {recursionType === "html" ? "HTML" : 
                             recursionType === "svg" ? "SVG" : 
                             recursionType === "css" ? "CSS" : "Custom"}
                          </Badge>
                        </FormLabel>
                        <FormControl>
                          <Textarea 
                            className="h-60 font-mono text-sm"
                            placeholder="Enter your recursive inscription content" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Use <code className="bg-muted px-1 py-0.5 rounded text-xs">{'{parentId}'}</code> as a placeholder for the parent inscription ID
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  </div>

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
                    name="addParentMetadata"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-muted/30">
                        <div className="space-y-0.5">
                          <FormLabel>Include Parent Metadata</FormLabel>
                          <FormDescription>
                            Add reference to parent in JSON metadata
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

                  <Button 
                    type="submit" 
                    className="w-full mt-6" 
                    disabled={isLoading}
                    size="lg"
                  >
                    {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Generate Inscription Command
                  </Button>
                </form>
              </Form>
            </div>

            <div className="space-y-4">
              {previewError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{previewError}</AlertDescription>
                </Alert>
              )}

              {previewUrl && (
                <Card className="overflow-hidden border-orange-100 dark:border-navy-700">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-navy-900 dark:to-navy-800 py-3">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <FileImage className="h-4 w-4 mr-2 text-orange-600 dark:text-blue-400" />
                      Parent Inscription Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="border-t border-orange-100 dark:border-navy-700 overflow-hidden bg-muted/30 p-6 flex items-center justify-center min-h-[300px]">
                      <img 
                        src={previewUrl} 
                        alt="Parent Inscription" 
                        className="max-w-full max-h-[300px] object-contain rounded-md shadow-md" 
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="px-4 py-3 bg-orange-50/50 dark:bg-navy-900/50 text-xs text-muted-foreground">
                    ID: <span className="font-mono ml-1 truncate">{parentId}</span>
                  </CardFooter>
                </Card>
              )}

              {inscribeCommand && (
                <Card className="overflow-hidden border-orange-100 dark:border-navy-700">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-navy-900 dark:to-navy-800 py-3">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <Code className="h-4 w-4 mr-2 text-orange-600 dark:text-blue-400" />
                        Inscription Command
                      </CardTitle>
                      {processingTime && (
                        <Badge variant="outline" className="text-xs bg-orange-100/50 text-orange-800 dark:bg-navy-900 dark:text-blue-300 border-orange-200 dark:border-navy-700">
                          Processing: {processingTime}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <pre className="bg-muted/70 p-4 rounded-lg overflow-x-auto text-xs font-mono border-t border-orange-100 dark:border-navy-700">
                      {inscribeCommand}
                    </pre>
                  </CardContent>
                  <CardFooter className="flex justify-between items-center px-4 py-3 bg-orange-50/50 dark:bg-navy-900/50">
                    <span className="text-xs text-muted-foreground">Use this command in your ord node terminal</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleCopyCommand}
                      className="gap-1"
                    >
                      {commandCopied ? (
                        <>
                          <CopyCheck className="h-4 w-4" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          <span>Copy</span>
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              )}

              {!previewUrl && !previewError && !inscribeCommand && (
                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg border-muted-foreground/20 min-h-[300px] bg-muted/10">
                  <FileImage className="h-12 w-12 text-muted-foreground/40 mb-4" />
                  <p className="text-muted-foreground text-center">
                    Enter a parent inscription ID and click "Preview" to see how it will appear in your recursive inscription
                  </p>
                </div>
              )}

              {inscribeCommand && (
                <Alert className="mt-4 bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Command Ready</AlertTitle>
                  <AlertDescription className="mt-2">
                    Your recursive inscription command has been generated. Copy and paste it into your Ordinals node terminal to create the inscription.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}