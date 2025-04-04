
import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';
import SectionTitle from './SectionTitle';
import { useToast } from '../hooks/use-toast';

interface RecursiveInscription {
  id: string;
  inscriptionId: string;
  name: string;
  description?: string;
  isReference: boolean;
}

const RecursiveInscriptionSection = () => {
  const { toast } = useToast();
  const [inscriptions, setInscriptions] = useState<RecursiveInscription[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInscriptions, setSelectedInscriptions] = useState<string[]>([]);
  const [primaryInscription, setPrimaryInscription] = useState<string | null>(null);
  const [htmlTemplate, setHtmlTemplate] = useState<string>(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 0; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .inscription { margin-bottom: 20px; border: 1px solid #ccc; padding: 10px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Recursive inscriptions will be added here -->
    <inscription id="REPLACE_WITH_INSCRIPTION_ID"></inscription>
  </div>
</body>
</html>`);

  // Fetch user's inscriptions
  useEffect(() => {
    const fetchInscriptions = async () => {
      try {
        // Replace with your actual API endpoint
        const response = await fetch('/api/inscriptions/owned');
        if (response.ok) {
          const data = await response.json();
          setInscriptions(data);
        }
      } catch (error) {
        console.error('Error fetching inscriptions:', error);
        toast({
          title: 'Error',
          description: 'Failed to load your inscriptions',
          variant: 'destructive',
        });
      }
    };

    fetchInscriptions();
  }, [toast]);

  const filteredInscriptions = inscriptions.filter(
    (inscription) =>
      inscription.inscriptionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inscription.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectionChange = (inscriptionId: string) => {
    setSelectedInscriptions((prev) =>
      prev.includes(inscriptionId)
        ? prev.filter((id) => id !== inscriptionId)
        : [...prev, inscriptionId]
    );
  };

  const handlePrimaryInscriptionChange = (inscriptionId: string) => {
    setPrimaryInscription(inscriptionId === primaryInscription ? null : inscriptionId);
  };

  const handleCreateRecursive = async () => {
    if (!primaryInscription || selectedInscriptions.length === 0) {
      toast({
        title: 'Missing Information',
        description: 'Please select a primary inscription and at least one reference inscription',
        variant: 'destructive',
      });
      return;
    }

    // Generate HTML with inscription references
    const generatedHTML = htmlTemplate.replace(
      'REPLACE_WITH_INSCRIPTION_ID',
      selectedInscriptions.map(id => `<inscription id="${id}"></inscription>`).join('\n    ')
    );

    // Create the recursive inscription
    try {
      const response = await fetch('/api/inscriptions/recursive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          primaryInscriptionId: primaryInscription,
          referenceInscriptions: selectedInscriptions,
          html: generatedHTML,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: 'Success!',
          description: `Created recursive inscription with ID: ${result.inscriptionId}`,
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create recursive inscription');
      }
    } catch (error) {
      console.error('Error creating recursive inscription:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create recursive inscription',
        variant: 'destructive',
      });
    }
  };

  const handlePreviewHTML = () => {
    // Create preview HTML with the current template and selected inscriptions
    const previewHTML = htmlTemplate.replace(
      'REPLACE_WITH_INSCRIPTION_ID',
      selectedInscriptions.map(id => `<inscription id="${id}"></inscription>`).join('\n    ')
    );
    
    // Open preview in a new window/dialog or show within the app
    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      previewWindow.document.write(previewHTML);
      previewWindow.document.close();
    }
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Recursive Inscriptions"
        subtitle="Create and manage recursive inscriptions that reference other inscriptions"
      />

      <Tabs defaultValue="create">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">Create Recursive</TabsTrigger>
          <TabsTrigger value="manage">Manage Recursive</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-4 pt-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Inscriptions</Label>
              <Input
                id="search"
                placeholder="Search by name or inscription ID"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Select Inscriptions to Include</Label>
              <ScrollArea className="h-[300px] border rounded-md p-4">
                {filteredInscriptions.length > 0 ? (
                  <div className="space-y-3">
                    {filteredInscriptions.map((inscription) => (
                      <Card key={inscription.inscriptionId} className="overflow-hidden">
                        <CardContent className="p-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`select-${inscription.inscriptionId}`}
                              checked={selectedInscriptions.includes(inscription.inscriptionId)}
                              onCheckedChange={() => handleSelectionChange(inscription.inscriptionId)}
                            />
                            <div className="flex-1">
                              <div className="font-medium">{inscription.name}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {inscription.inscriptionId}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className={primaryInscription === inscription.inscriptionId ? 'bg-primary text-primary-foreground' : ''}
                              onClick={() => handlePrimaryInscriptionChange(inscription.inscriptionId)}
                            >
                              {primaryInscription === inscription.inscriptionId ? 'Primary' : 'Set as Primary'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No inscriptions found matching your search
                  </div>
                )}
              </ScrollArea>
              <div className="text-sm text-muted-foreground">
                Selected: {selectedInscriptions.length} inscriptions
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="htmlTemplate">HTML Template</Label>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">Edit HTML Template</Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Edit HTML Template</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Textarea
                      className="font-mono text-sm h-[400px]"
                      value={htmlTemplate}
                      onChange={(e) => setHtmlTemplate(e.target.value)}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={handlePreviewHTML}>Preview</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <div className="text-sm text-muted-foreground">
                The HTML template determines how your recursive inscription will be rendered.
                Use the tag <code className="bg-muted px-1 rounded">&lt;inscription id="ID"&gt;&lt;/inscription&gt;</code> to reference other inscriptions.
              </div>
            </div>

            <Alert>
              <AlertDescription>
                Recursive inscriptions require the referenced inscriptions to already exist on the blockchain. 
                The primary inscription will be the one shown in collections and explorers.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end space-x-2 pt-4">
              <Button onClick={handleCreateRecursive} disabled={!primaryInscription || selectedInscriptions.length === 0}>
                Create Recursive Inscription
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="manage" className="space-y-4 pt-4">
          <div className="text-center py-8 text-muted-foreground">
            Coming soon: Tools to manage and update your recursive inscriptions.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RecursiveInscriptionSection;
