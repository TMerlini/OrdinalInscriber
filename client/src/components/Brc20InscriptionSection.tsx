import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import axios from 'axios';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2, RotateCw, Info, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface Brc20InscriptionSectionProps {
  onGenerateCommands?: (commands: string[]) => void;
  defaultFeeRate?: number;
  defaultDestinationAddress?: string;
}

// Token is 1-4 alphanumeric characters, all uppercase
const BRC20_TICKER_REGEX = /^[A-Z0-9]{1,4}$/;

// Define the deploy operation schema
const deploySchema = z.object({
  ticker: z.string()
    .min(1, "Ticker is required")
    .max(4, "Ticker must be 1-4 characters")
    .refine(val => BRC20_TICKER_REGEX.test(val.toUpperCase()), {
      message: "Ticker must be 1-4 alphanumeric characters"
    }),
  maxSupply: z.string()
    .min(1, "Max supply is required")
    .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Max supply must be a positive number"
    }),
  mintLimit: z.string()
    .optional()
    .refine(val => !val || (!isNaN(Number(val)) && Number(val) > 0), {
      message: "Mint limit must be a positive number or empty"
    }),
  feeRate: z.number()
    .min(1, "Fee rate must be at least 1 sat/vbyte"),
  destinationAddress: z.string().optional(),
});

// Define the mint operation schema
const mintSchema = z.object({
  ticker: z.string()
    .min(1, "Ticker is required")
    .max(4, "Ticker must be 1-4 characters")
    .refine(val => BRC20_TICKER_REGEX.test(val.toUpperCase()), {
      message: "Ticker must be 1-4 alphanumeric characters"
    }),
  amount: z.string()
    .min(1, "Amount is required")
    .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Amount must be a positive number"
    }),
  feeRate: z.number()
    .min(1, "Fee rate must be at least 1 sat/vbyte"),
  destinationAddress: z.string().optional(),
});

// Define the transfer operation schema
const transferSchema = z.object({
  ticker: z.string()
    .min(1, "Ticker is required")
    .max(4, "Ticker must be 1-4 characters")
    .refine(val => BRC20_TICKER_REGEX.test(val.toUpperCase()), {
      message: "Ticker must be 1-4 alphanumeric characters"
    }),
  amount: z.string()
    .min(1, "Amount is required")
    .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Amount must be a positive number"
    }),
  feeRate: z.number()
    .min(1, "Fee rate must be at least 1 sat/vbyte"),
  destinationAddress: z.string().optional(),
});

interface TokenInfo {
  tick: string;
  max: string;
  lim?: string;
  deployed: boolean;
  totalMinted?: string;
  maxMintPerInscription?: string;
  mintingComplete?: boolean;
  available?: boolean;
  message?: string;
}

interface FeeDetails {
  vbyte: number;
  baseFee: number;
  inscriptionFee: number;
  totalFee: number;
  feeRate: number;
  processingTime: string;
  estimatedUsd?: number | null;
}

export default function Brc20InscriptionSection({
  onGenerateCommands,
  defaultFeeRate = 5,
  defaultDestinationAddress = '',
}: Brc20InscriptionSectionProps) {
  const [activeTab, setActiveTab] = useState<string>('deploy');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCheckingToken, setIsCheckingToken] = useState<boolean>(false);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [command, setCommand] = useState<string>('');
  const [feeDetails, setFeeDetails] = useState<FeeDetails | null>(null);
  const [containerName, setContainerName] = useState<string>('bitcoin-ordinals');
  const { toast } = useToast();

  // Initialize the forms for each operation
  const deployForm = useForm<z.infer<typeof deploySchema>>({
    resolver: zodResolver(deploySchema),
    defaultValues: {
      ticker: '',
      maxSupply: '',
      mintLimit: '',
      feeRate: defaultFeeRate,
      destinationAddress: defaultDestinationAddress,
    },
  });

  const mintForm = useForm<z.infer<typeof mintSchema>>({
    resolver: zodResolver(mintSchema),
    defaultValues: {
      ticker: '',
      amount: '',
      feeRate: defaultFeeRate,
      destinationAddress: defaultDestinationAddress,
    },
  });

  const transferForm = useForm<z.infer<typeof transferSchema>>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      ticker: '',
      amount: '',
      feeRate: defaultFeeRate,
      destinationAddress: defaultDestinationAddress,
    },
  });

  // Get environment info to determine container name
  useEffect(() => {
    async function fetchEnvironmentInfo() {
      try {
        const response = await axios.get('/api/environment');
        if (response.data && response.data.containerName) {
          setContainerName(response.data.containerName);
        }
      } catch (error) {
        console.error('Error fetching environment info:', error);
      }
    }

    fetchEnvironmentInfo();
  }, []);

  // Function to check token information
  const checkToken = async (ticker: string) => {
    if (!ticker || !BRC20_TICKER_REGEX.test(ticker.toUpperCase())) return;
    
    setIsCheckingToken(true);
    setTokenInfo(null);
    
    try {
      const response = await axios.get(`/api/brc20/token/${ticker.toUpperCase()}`);
      setTokenInfo(response.data);
    } catch (error) {
      console.error('Error checking token:', error);
      toast({
        title: 'Error',
        description: 'Failed to check token information',
        variant: 'destructive',
      });
    } finally {
      setIsCheckingToken(false);
    }
  };

  // Function to generate BRC-20 commands
  const generateBrc20Command = async (operation: 'deploy' | 'mint' | 'transfer', data: any) => {
    setIsLoading(true);
    setCommand('');
    setFeeDetails(null);
    
    try {
      const payload = {
        operation,
        ticker: data.ticker.toUpperCase(),
        amount: data.amount,
        maxSupply: data.maxSupply,
        mintLimit: data.mintLimit,
        feeRate: data.feeRate,
        destinationAddress: data.destinationAddress,
        containerName
      };
      
      const response = await axios.post('/api/brc20/generate-command', payload);
      setCommand(response.data.command);
      setFeeDetails(response.data.feeDetails);
      
      if (onGenerateCommands) {
        onGenerateCommands([response.data.command]);
      }
      
      toast({
        title: 'Command Generated',
        description: 'BRC-20 inscription command has been generated successfully',
      });
    } catch (error) {
      console.error('Error generating command:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate BRC-20 inscription command',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle deploy form submission
  const onDeploySubmit = (data: z.infer<typeof deploySchema>) => {
    generateBrc20Command('deploy', data);
  };

  // Handle mint form submission
  const onMintSubmit = (data: z.infer<typeof mintSchema>) => {
    generateBrc20Command('mint', data);
  };

  // Handle transfer form submission
  const onTransferSubmit = (data: z.infer<typeof transferSchema>) => {
    generateBrc20Command('transfer', data);
  };

  return (
    <Card className="w-full border border-border/40 shadow-md">
      <CardHeader>
        <CardTitle className="text-xl font-bold">BRC-20 Token Inscription</CardTitle>
        <CardDescription>
          Create, mint, or transfer BRC-20 tokens using the Ordinals protocol
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="deploy">Deploy</TabsTrigger>
            <TabsTrigger value="mint">Mint</TabsTrigger>
            <TabsTrigger value="transfer">Transfer</TabsTrigger>
          </TabsList>
          
          {/* Deploy Tab Content */}
          <TabsContent value="deploy">
            <div className="space-y-4">
              <div className="space-y-2">
                <Alert className="bg-primary/5 border-primary/20">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Deploy a New BRC-20 Token</AlertTitle>
                  <AlertDescription>
                    This creates a new BRC-20 token. Once deployed, you can mint tokens up to the maximum supply.
                  </AlertDescription>
                </Alert>
              </div>
              
              <Form {...deployForm}>
                <form onSubmit={deployForm.handleSubmit(onDeploySubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={deployForm.control}
                      name="ticker"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Token Ticker (1-4 characters)</FormLabel>
                          <div className="flex items-center space-x-2">
                            <FormControl>
                              <Input 
                                placeholder="EXMP" 
                                {...field} 
                                onChange={(e) => {
                                  // Update the form field
                                  field.onChange(e.target.value.toUpperCase());
                                }}
                                onBlur={() => checkToken(field.value)}
                              />
                            </FormControl>
                            {isCheckingToken && (
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            )}
                          </div>
                          <FormMessage />
                          {tokenInfo && (
                            <div className="mt-2">
                              {tokenInfo.deployed ? (
                                <Badge variant="destructive" className="mt-1">
                                  Token already deployed
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 mt-1">
                                  Available for deployment
                                </Badge>
                              )}
                            </div>
                          )}
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={deployForm.control}
                      name="maxSupply"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Supply</FormLabel>
                          <FormControl>
                            <Input placeholder="21000000" {...field} />
                          </FormControl>
                          <FormDescription>
                            Total supply of tokens that can ever be minted
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={deployForm.control}
                      name="mintLimit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mint Limit (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="1000" {...field} />
                          </FormControl>
                          <FormDescription>
                            Maximum amount per mint transaction
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={deployForm.control}
                      name="feeRate"
                      render={({ field: { onChange, value, ...rest } }) => (
                        <FormItem>
                          <FormLabel>Fee Rate (sats/vbyte)</FormLabel>
                          <div className="space-y-2">
                            <FormControl>
                              <Input 
                                type="number" 
                                min={1}
                                placeholder="5" 
                                {...rest}
                                value={value}
                                onChange={(e) => onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <RadioGroup
                              onValueChange={(val) => onChange(Number(val))}
                              defaultValue={value.toString()}
                              className="flex space-x-2"
                            >
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem value="5" id="deploy-economy" />
                                <Label htmlFor="deploy-economy">Economy (5)</Label>
                              </div>
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem value="15" id="deploy-average" />
                                <Label htmlFor="deploy-average">Average (15)</Label>
                              </div>
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem value="30" id="deploy-priority" />
                                <Label htmlFor="deploy-priority">Priority (30)</Label>
                              </div>
                            </RadioGroup>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={deployForm.control}
                    name="destinationAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Destination Address (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="bc1q..." {...field} />
                        </FormControl>
                        <FormDescription>
                          Bitcoin address to receive the inscription. If not provided, it will go to your Ordinals wallet.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="pt-2">
                    <Button 
                      type="submit" 
                      disabled={isLoading || deployForm.formState.isSubmitting}
                      className="w-full sm:w-auto"
                    >
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Generate Deploy Command
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </TabsContent>
          
          {/* Mint Tab Content */}
          <TabsContent value="mint">
            <div className="space-y-4">
              <div className="space-y-2">
                <Alert className="bg-primary/5 border-primary/20">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Mint BRC-20 Tokens</AlertTitle>
                  <AlertDescription>
                    Mint tokens from an existing BRC-20 token. The amount must be within the token's mint limit.
                  </AlertDescription>
                </Alert>
              </div>
              
              <Form {...mintForm}>
                <form onSubmit={mintForm.handleSubmit(onMintSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={mintForm.control}
                      name="ticker"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Token Ticker</FormLabel>
                          <div className="flex items-center space-x-2">
                            <FormControl>
                              <Input 
                                placeholder="EXMP" 
                                {...field} 
                                onChange={(e) => {
                                  field.onChange(e.target.value.toUpperCase());
                                }}
                                onBlur={() => checkToken(field.value)}
                              />
                            </FormControl>
                            {isCheckingToken && (
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            )}
                          </div>
                          <FormMessage />
                          {tokenInfo && (
                            <div className="mt-2">
                              {!tokenInfo.deployed ? (
                                <Badge variant="destructive" className="mt-1">
                                  Token not deployed yet
                                </Badge>
                              ) : tokenInfo.mintingComplete ? (
                                <Badge variant="destructive" className="mt-1">
                                  Minting complete
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 mt-1">
                                  Available for minting
                                </Badge>
                              )}
                            </div>
                          )}
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={mintForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount to Mint</FormLabel>
                          <FormControl>
                            <Input placeholder="1000" {...field} />
                          </FormControl>
                          {tokenInfo && tokenInfo.maxMintPerInscription && (
                            <FormDescription>
                              Maximum per mint: {tokenInfo.maxMintPerInscription}
                            </FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={mintForm.control}
                      name="feeRate"
                      render={({ field: { onChange, value, ...rest } }) => (
                        <FormItem>
                          <FormLabel>Fee Rate (sats/vbyte)</FormLabel>
                          <div className="space-y-2">
                            <FormControl>
                              <Input 
                                type="number" 
                                min={1}
                                placeholder="5" 
                                {...rest}
                                value={value}
                                onChange={(e) => onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <RadioGroup
                              onValueChange={(val) => onChange(Number(val))}
                              defaultValue={value.toString()}
                              className="flex space-x-2"
                            >
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem value="5" id="mint-economy" />
                                <Label htmlFor="mint-economy">Economy (5)</Label>
                              </div>
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem value="15" id="mint-average" />
                                <Label htmlFor="mint-average">Average (15)</Label>
                              </div>
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem value="30" id="mint-priority" />
                                <Label htmlFor="mint-priority">Priority (30)</Label>
                              </div>
                            </RadioGroup>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={mintForm.control}
                      name="destinationAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Destination Address (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="bc1q..." {...field} />
                          </FormControl>
                          <FormDescription>
                            Bitcoin address to receive the inscription
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="pt-2">
                    <Button 
                      type="submit" 
                      disabled={isLoading || mintForm.formState.isSubmitting}
                      className="w-full sm:w-auto"
                    >
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Generate Mint Command
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </TabsContent>
          
          {/* Transfer Tab Content */}
          <TabsContent value="transfer">
            <div className="space-y-4">
              <div className="space-y-2">
                <Alert className="bg-primary/5 border-primary/20">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Transfer BRC-20 Tokens</AlertTitle>
                  <AlertDescription>
                    Create a transfer inscription. After this step, you'll need to send the transfer inscription to the recipient's address.
                  </AlertDescription>
                </Alert>
              </div>
              
              <Form {...transferForm}>
                <form onSubmit={transferForm.handleSubmit(onTransferSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={transferForm.control}
                      name="ticker"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Token Ticker</FormLabel>
                          <div className="flex items-center space-x-2">
                            <FormControl>
                              <Input 
                                placeholder="EXMP" 
                                {...field} 
                                onChange={(e) => {
                                  field.onChange(e.target.value.toUpperCase());
                                }}
                                onBlur={() => checkToken(field.value)}
                              />
                            </FormControl>
                            {isCheckingToken && (
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            )}
                          </div>
                          <FormMessage />
                          {tokenInfo && (
                            <div className="mt-2">
                              {!tokenInfo.deployed ? (
                                <Badge variant="destructive" className="mt-1">
                                  Token does not exist
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 mt-1">
                                  Token exists
                                </Badge>
                              )}
                            </div>
                          )}
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={transferForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount to Transfer</FormLabel>
                          <FormControl>
                            <Input placeholder="100" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={transferForm.control}
                      name="feeRate"
                      render={({ field: { onChange, value, ...rest } }) => (
                        <FormItem>
                          <FormLabel>Fee Rate (sats/vbyte)</FormLabel>
                          <div className="space-y-2">
                            <FormControl>
                              <Input 
                                type="number" 
                                min={1}
                                placeholder="5" 
                                {...rest}
                                value={value}
                                onChange={(e) => onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <RadioGroup
                              onValueChange={(val) => onChange(Number(val))}
                              defaultValue={value.toString()}
                              className="flex space-x-2"
                            >
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem value="5" id="transfer-economy" />
                                <Label htmlFor="transfer-economy">Economy (5)</Label>
                              </div>
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem value="15" id="transfer-average" />
                                <Label htmlFor="transfer-average">Average (15)</Label>
                              </div>
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem value="30" id="transfer-priority" />
                                <Label htmlFor="transfer-priority">Priority (30)</Label>
                              </div>
                            </RadioGroup>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={transferForm.control}
                      name="destinationAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Destination Address (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="bc1q..." {...field} />
                          </FormControl>
                          <FormDescription>
                            Bitcoin address to receive the transfer inscription
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="pt-2">
                    <Button 
                      type="submit" 
                      disabled={isLoading || transferForm.formState.isSubmitting}
                      className="w-full sm:w-auto"
                    >
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Generate Transfer Command
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Fee Details Section */}
        {feeDetails && (
          <div className="mt-6 border rounded-md p-4 bg-secondary/10">
            <h3 className="text-sm font-medium mb-2 flex items-center">
              <ArrowRight className="h-4 w-4 mr-1 text-primary" />
              Inscription Fee Details
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Size:</p>
                <p className="font-medium">{feeDetails.vbyte} vbytes</p>
              </div>
              <div>
                <p className="text-muted-foreground">Base Fee:</p>
                <p className="font-medium">{feeDetails.baseFee} sats</p>
              </div>
              <div>
                <p className="text-muted-foreground">Inscription Fee:</p>
                <p className="font-medium">{feeDetails.inscriptionFee} sats</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Fee:</p>
                <p className="font-medium">{feeDetails.totalFee} sats</p>
              </div>
              <div>
                <p className="text-muted-foreground">Fee Rate:</p>
                <p className="font-medium">{feeDetails.feeRate} sats/vbyte</p>
              </div>
              <div>
                <p className="text-muted-foreground">Processing Time:</p>
                <p className="font-medium">{feeDetails.processingTime}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Generated Command */}
        {command && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">Generated Command</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(command);
                  toast({
                    title: 'Copied',
                    description: 'Command copied to clipboard',
                    duration: 2000,
                  });
                }}
              >
                Copy
              </Button>
            </div>
            <pre className="bg-secondary/10 p-4 rounded-md text-xs md:text-sm overflow-x-auto whitespace-pre-wrap break-all">
              {command}
            </pre>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-start text-sm text-muted-foreground">
        <div className="mb-2">
          <strong>Note:</strong> BRC-20 is a token standard on the Bitcoin blockchain using Ordinals.
        </div>
        <div className="text-xs space-y-1">
          <p>• Deploy: Creates a new token with a specified max supply</p>
          <p>• Mint: Mints tokens from an existing token (up to mint limit)</p>
          <p>• Transfer: Creates a transfer inscription for sending tokens</p>
        </div>
      </CardFooter>
    </Card>
  );
}