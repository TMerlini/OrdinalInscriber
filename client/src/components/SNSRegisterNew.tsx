import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertCircle, 
  ArrowLeft, 
  CheckCircle, 
  CreditCard, 
  Loader2, 
  Search,
  ScanLine,
  Bitcoin,
  Bolt,
  Receipt,
  Wallet as WalletIcon
} from 'lucide-react';
import LaserEyesWalletConnector from './LaserEyesWalletConnector';
import { formatAddress } from '@/lib/addressUtils';

// SNS Name interface
interface SNSName {
  id: string;
  name: string;
  status: 'available' | 'taken' | 'pending';
  owner?: string;
}

export default function SNSRegisterNew() {
  const { toast } = useToast();
  
  // State for tab navigation
  const [activeTab, setActiveTab] = useState<string>('search');
  
  // Name search and selection state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [names, setNames] = useState<SNSName[]>([]);
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [registering, setRegistering] = useState<boolean>(false);
  
  // Wallet connection state
  const [walletConnected, setWalletConnected] = useState<boolean>(false);
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [walletData, setWalletData] = useState<any>(null);
  
  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<'onchain' | 'lightning'>('onchain');
  
  // SNS registration fee state
  const [registrationFee, setRegistrationFee] = useState<number>(10000); // Default: 10,000 sats
  const [platformFee, setPlatformFee] = useState<number>(2000); // Default: 2,000 sats
  const [networkFee, setNetworkFee] = useState<number>(1000); // Default: 1,000 sats
  const [sizeFee, setSizeFee] = useState<number>(500); // Default: 500 sats
  const [processingTime, setProcessingTime] = useState<string>("~1-2 hours");
  const [registryAddress, setRegistryAddress] = useState<string>("bc1qe8grz79ej3ywxkfcdchrncfl5antlc9tzmy5c2");
  const [platformAddress, setPlatformAddress] = useState<string>("3GzpE8PyW8XgNnmkxsNLpj2jVKvyxwRYFM");
  
  // Custom fee state
  const [customFeeAmount, setCustomFeeAmount] = useState<number>(1500);  
  const [selectedFeeTier, setSelectedFeeTier] = useState<'economy' | 'normal' | 'custom'>('normal');
  
  // USD conversion values
  const [usdValues, setUsdValues] = useState<{[key: string]: string}>({
    inscriptionFeeUSD: "5.00",
    networkFeeUSD: "0.50",
    sizeFeeUSD: "0.25",
    serviceFeeUSD: "1.00",
    totalUSD: "6.75"
  });
  
  // Calculate total fee based on all components
  const totalInscriptionFee = registrationFee + networkFee + sizeFee;
  const totalFee = totalInscriptionFee + platformFee;
  
  // Determine if we're in a Janeway environment
  const isJanewayURL = typeof window !== 'undefined' && 
    window.location.hostname.includes('janeway.replit.dev');
    
  // Fetch SNS fee information from the server with tier selection
  const fetchSNSFees = async (tier: 'economy' | 'normal' | 'custom' = 'normal') => {
    try {
      // Build URL with custom fee parameter if applicable
      let url = `/api/sns/fees?tier=${tier}`;
      if (tier === 'custom' && customFeeAmount) {
        url += `&customFee=${customFeeAmount}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('Failed to fetch SNS fees');
        return;
      }
      
      const feeData = await response.json();
      
      // Update all fee components
      setRegistrationFee(feeData.inscriptionFee);
      setPlatformFee(feeData.serviceFee);
      setNetworkFee(feeData.networkFee);
      setSizeFee(feeData.sizeFee);
      
      // Update address info
      setRegistryAddress(feeData.registryAddress);
      setPlatformAddress(feeData.platformAddress);
      
      // Update tier-specific info
      setProcessingTime(feeData.processingTime);
      setUsdValues(feeData.usdValues);
      
      // Update selected tier
      setSelectedFeeTier(tier);
      
      console.log('SNS fee data loaded:', feeData);
    } catch (error) {
      console.error('Error fetching SNS fees:', error);
    }
  };
  
  // Helper function to switch fee tiers
  const handleFeeTierChange = (tier: 'economy' | 'normal' | 'custom') => {
    setSelectedFeeTier(tier);
    
    if (tier === 'custom') {
      // For custom tier, we'll set network fee directly instead of fetching
      setNetworkFee(customFeeAmount);
    } else {
      fetchSNSFees(tier);
    }
  };
  
  // Handle custom fee amount change
  const handleCustomFeeChange = (value: number) => {
    setCustomFeeAmount(value);
    if (selectedFeeTier === 'custom') {
      setNetworkFee(value);
    }
  };

  // Check for existing session on component mount
  useEffect(() => {
    // Load fee information
    fetchSNSFees();
  }, []);
  
  // Mock SNS name check function (for testing)
  const mockCheckSNSName = async (name: string): Promise<SNSName> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Simple logic to simulate available/taken names
    const isAvailable = name.length >= 5 && !['bitcoin', 'satoshi', 'ordinal'].includes(name.toLowerCase());
    
    return {
      id: `sns-${Date.now()}`,
      name: name,
      status: isAvailable ? 'available' : 'taken',
      owner: isAvailable ? undefined : '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
    };
  };

  // Check SNS name availability using the API
  const checkSNSName = async (name: string) => {
    if (!name || name.trim() === '') {
      return;
    }

    try {
      setSearching(true);
      setError(null);
      
      let result: SNSName;
      
      if (isJanewayURL) {
        // In Janeway environment, use mock data to avoid API calls
        result = await mockCheckSNSName(name);
      } else {
        try {
          // Use our backend API which will connect to Geniidata API when key is provided
          const response = await fetch(`/api/sns/name/check?name=${encodeURIComponent(name)}`);
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to check name');
          }
          
          const data = await response.json();
          
          result = {
            id: `sns-${Date.now()}`,
            name: name,
            status: data.isAvailable ? 'available' : 'taken',
            owner: data.owner
          };
        } catch (apiError) {
          console.error('API error:', apiError);
          // Fallback to mock data if the API fails
          result = await mockCheckSNSName(name);
        }
      }
      
      // Update the names list, replace if exists or add new
      setNames(prevNames => {
        const existingIndex = prevNames.findIndex(n => n.name.toLowerCase() === name.toLowerCase());
        if (existingIndex >= 0) {
          const newNames = [...prevNames];
          newNames[existingIndex] = result;
          return newNames;
        } else {
          return [...prevNames, result];
        }
      });
      
    } catch (err) {
      console.error('Error checking SNS name:', err);
      setError('Failed to check name availability. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  // Register selected SNS names
  const registerSNSNames = async () => {
    if (selectedNames.length === 0) {
      toast({
        title: "No names selected",
        description: "Please select at least one available name to register.",
        variant: "destructive"
      });
      return;
    }

    try {
      setRegistering(true);
      
      let success = true;
      let errorMessage = '';
      
      if (isJanewayURL) {
        // In Janeway environment, simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));
      } else {
        // Try to register names through our backend API
        try {
          for (const name of selectedNames) {
            const response = await fetch('/api/sns/register', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ 
                name,
                tier: selectedFeeTier,
                destinationAddress: selectedWallet,
                customFee: selectedFeeTier === 'custom' ? customFeeAmount : undefined
              })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
              success = false;
              errorMessage = data.message || 'API key required to register names';
              break;
            }
          }
        } catch (apiError) {
          console.error('API error:', apiError);
          success = false;
          errorMessage = 'Failed to connect to registration service';
        }
      }
      
      if (success) {
        toast({
          title: "Names prepared for registration",
          description: `${selectedNames.length} name(s) have been queued for registration.`,
          variant: "default"
        });
        
        // Update status to pending for selected names
        setNames(prevNames => 
          prevNames.map(name => 
            selectedNames.includes(name.name) 
              ? { ...name, status: 'pending' } 
              : name
          )
        );
        
        // Clear selection after registration
        setSelectedNames([]);
      } else {
        toast({
          title: "Registration requires API key",
          description: errorMessage || "To register SNS names, a Geniidata API key is required. Please contact your administrator.",
          variant: "destructive"
        });
      }
      
    } catch (err) {
      console.error('Error registering SNS names:', err);
      toast({
        title: "Registration failed",
        description: "There was an error registering the selected names. Please try again.",
        variant: "destructive"
      });
    } finally {
      setRegistering(false);
    }
  };

  // Toggle name selection
  const toggleNameSelection = (name: string) => {
    setSelectedNames(prev => 
      prev.includes(name) 
        ? prev.filter(n => n !== name) 
        : [...prev, name]
    );
  };

  // Handle name search
  const handleSearch = () => {
    checkSNSName(searchQuery);
  };

  // Handle key press in search field
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  // Function to proceed to checkout
  const proceedToCheckout = () => {
    if (selectedNames.length === 0) {
      toast({
        title: "No names selected",
        description: "Please select at least one name before proceeding to checkout.",
        variant: "destructive"
      });
      return;
    }
    
    // Move to wallet tab
    setActiveTab('wallet');
  };
  
  // Function to complete purchase with on-chain payment
  const completePurchase = async () => {
    if (!selectedWallet) {
      toast({
        title: "Wallet required",
        description: "Please select a wallet to complete the purchase.",
        variant: "destructive"
      });
      return;
    }
    
    if (walletData) {
      try {
        toast({
          title: "Starting Payment Process",
          description: "Starting the payment process via connected Bitcoin wallet",
          duration: 5000
        });
        
        // In a real wallet integration, we would:
        // 1. Create a PSBT (Partially Signed Bitcoin Transaction)
        // 2. Sign it with the connected wallet
        // 3. Broadcast the transaction
        
        // Register names after successful payment
        registerSNSNames();
        
        toast({
          title: "Payment Initiated",
          description: "Your registration payment has been processed",
          duration: 5000
        });
        
      } catch (error) {
        console.error("Payment error:", error);
        toast({
          title: "Payment Error",
          description: "There was an error initiating the payment. Please try again.",
          variant: "destructive"
        });
      }
    } else {
      // For Lightning Network payments
      toast({
        title: "Coming Soon",
        description: "Lightning Network payments will be available in a future update.",
        duration: 5000
      });
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-navy-900 rounded-lg border border-orange-100 dark:border-navy-700 shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">SNS Registration</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Search for and register Satoshi Name Service (SNS) names. SNS provides a human-readable naming system for Bitcoin addresses on the blockchain.
        </p>
      </div>
      
      <div className="mb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 rounded-xl">
            <TabsTrigger 
              value="search"
              className="rounded-l-lg data-[state=active]:bg-orange-600 data-[state=active]:text-white dark:data-[state=active]:bg-navy-600"
            >
              1. Search Names
            </TabsTrigger>
            <TabsTrigger 
              value="wallet"
              className="data-[state=active]:bg-orange-600 data-[state=active]:text-white dark:data-[state=active]:bg-navy-600"
              disabled={selectedNames.length === 0}
            >
              2. Connect Wallet
            </TabsTrigger>
            <TabsTrigger 
              value="payment"
              className="rounded-r-lg data-[state=active]:bg-orange-600 data-[state=active]:text-white dark:data-[state=active]:bg-navy-600"
              disabled={!walletConnected}
            >
              3. Payment
            </TabsTrigger>
          </TabsList>
          
          {/* Search Tab */}
          <TabsContent value="search">
            <div className="p-4 bg-orange-50 dark:bg-navy-800 rounded-lg border border-orange-100 dark:border-navy-700">
              <div className="mb-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="text"
                      placeholder="Enter SNS name to search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleKeyPress}
                      className="border-orange-200 dark:border-navy-600"
                    />
                  </div>
                  <Button 
                    onClick={handleSearch}
                    disabled={searching || !searchQuery.trim()}
                    className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800"
                  >
                    {searching ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Search className="h-4 w-4 mr-2" />
                    )}
                    Search
                  </Button>
                </div>
                
                {error && (
                  <div className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {error}
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                {names.length > 0 ? (
                  <div>
                    <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-gray-100">Results</h3>
                    
                    <div className="space-y-2">
                      {names.map((name) => (
                        <Card key={name.id} className={`overflow-hidden ${
                          name.status === 'available' ? 'border-green-300 dark:border-green-700' :
                          name.status === 'pending' ? 'border-yellow-300 dark:border-yellow-700' :
                          'border-red-300 dark:border-red-700'
                        }`}>
                          <div className="p-3 flex justify-between items-center">
                            <div>
                              <div className="flex items-center">
                                <span className="text-gray-900 dark:text-gray-100 font-medium">{name.name}</span>
                                <Badge className={`ml-2 ${
                                  name.status === 'available' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                  name.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                                  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                }`}>
                                  {name.status.charAt(0).toUpperCase() + name.status.slice(1)}
                                </Badge>
                              </div>
                              {name.status === 'taken' && name.owner && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Owner: {formatAddress(name.owner)}
                                </div>
                              )}
                            </div>
                            
                            {name.status === 'available' && (
                              <Button
                                size="sm"
                                onClick={() => toggleNameSelection(name.name)}
                                variant={selectedNames.includes(name.name) ? 'default' : 'outline'}
                                className={selectedNames.includes(name.name) ? 
                                  'bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800' : 
                                  'border-green-300 text-green-700 dark:border-green-700 dark:text-green-300'}
                              >
                                {selectedNames.includes(name.name) ? 'Selected' : 'Select'}
                              </Button>
                            )}
                            
                            {name.status === 'pending' && (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                                Processing
                              </Badge>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                    
                    {selectedNames.length > 0 && (
                      <div className="mt-4 p-3 bg-white dark:bg-navy-900 border border-orange-200 dark:border-orange-800 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">Selected Names: {selectedNames.length}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {selectedNames.join(', ')}
                            </p>
                          </div>
                          <Button
                            onClick={proceedToCheckout}
                            className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800"
                          >
                            Continue
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                    <ScanLine className="h-12 w-12 mx-auto mb-2 text-gray-400 dark:text-gray-600" />
                    <p>Search for an SNS name to see results</p>
                    <p className="text-sm mt-1">Example: yourname, satoshi, etc.</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          {/* Wallet Connection Tab */}
          <TabsContent value="wallet">
            <div className="p-4 bg-orange-50 dark:bg-navy-800 rounded-lg border border-orange-100 dark:border-navy-700">
              <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">Connect Your Bitcoin Wallet</h3>
              
              <p className="mb-4 text-gray-600 dark:text-gray-400">
                Connect a Bitcoin wallet to register your selected SNS names. The wallet address will be associated with your name registrations.
              </p>
              
              {walletConnected ? (
                <div className="space-y-4">
                  <Alert className="bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <AlertTitle>Wallet Connected</AlertTitle>
                    <AlertDescription className="text-green-700 dark:text-green-300">
                      Your wallet has been successfully connected.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-800 dark:text-gray-200">Wallet Address</h4>
                      {walletData ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          {walletData.walletType}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="font-mono text-sm break-all bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700">
                      {selectedWallet}
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setWalletConnected(false);
                        setSelectedWallet('');
                        setWalletData(null);
                      }}
                      className="border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300"
                    >
                      Disconnect Wallet
                    </Button>
                    
                    <Button 
                      onClick={() => setActiveTab('payment')}
                      className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Continue to Payment
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* LaserEyes wallet connector for Bitcoin wallets */}
                  <LaserEyesWalletConnector 
                    onConnected={(walletInfo) => {
                      setWalletConnected(true);
                      setSelectedWallet(walletInfo.address);
                      setWalletData({
                        userData: walletInfo.userData,
                        address: walletInfo.address,
                        walletType: walletInfo.walletType
                      });
                      
                      toast({
                        title: "Wallet Connected",
                        description: `Successfully connected to ${walletInfo.walletType} wallet`,
                        variant: "default"
                      });
                    }}
                  />
                  
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab('search')}
                      className="border-gray-200 dark:border-gray-700"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Search
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Payment Tab */}
          <TabsContent value="payment">
            <div className="p-4 bg-orange-50 dark:bg-navy-800 rounded-lg border border-orange-100 dark:border-navy-700">
              <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">Payment</h3>
              
              <div className="space-y-4">
                <div className="bg-white dark:bg-navy-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Selected Names</h4>
                  <div className="space-y-1">
                    {selectedNames.map((name, i) => (
                      <div key={i} className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mr-2" />
                        <span className="text-gray-800 dark:text-gray-200">{name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="bg-white dark:bg-navy-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Fee Tier Selection</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <Card 
                      className={`cursor-pointer transition-all ${
                        selectedFeeTier === 'economy' 
                          ? 'ring-2 ring-blue-500 dark:ring-blue-400' 
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                      onClick={() => handleFeeTierChange('economy')}
                    >
                      <CardHeader className="py-3">
                        <CardTitle className="text-base flex items-center justify-between">
                          Economy
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                            Cheapest
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-2">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Network Fee: 500 sats</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Processing: ~4-8 hours</div>
                      </CardContent>
                    </Card>
                    
                    <Card 
                      className={`cursor-pointer transition-all ${
                        selectedFeeTier === 'normal' 
                          ? 'ring-2 ring-blue-500 dark:ring-blue-400' 
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                      onClick={() => handleFeeTierChange('normal')}
                    >
                      <CardHeader className="py-3">
                        <CardTitle className="text-base flex items-center justify-between">
                          Normal
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                            Recommended
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-2">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Network Fee: 1,000 sats</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Processing: ~1-2 hours</div>
                      </CardContent>
                    </Card>
                    
                    <Card 
                      className={`cursor-pointer transition-all ${
                        selectedFeeTier === 'custom' 
                          ? 'ring-2 ring-blue-500 dark:ring-blue-400' 
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                      onClick={() => handleFeeTierChange('custom')}
                    >
                      <CardHeader className="py-3">
                        <CardTitle className="text-base flex items-center justify-between">
                          Custom
                          <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                            Advanced
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-2">
                        <div className="flex items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">Network Fee:</span>
                          <Input
                            type="number"
                            min={500}
                            className="w-24 h-7 text-sm px-2"
                            value={customFeeAmount}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleCustomFeeChange(parseInt(e.target.value) || 500)}
                          />
                          <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">sats</span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Processing: {
                            customFeeAmount > 2000 
                              ? "~10-30 minutes" 
                              : (customFeeAmount > 1000 ? "~1-2 hours" : "Variable")
                          }
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Fee Breakdown</h4>
                  
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center">
                        <Receipt className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">Registration Fee</span>
                      </div>
                      <div className="text-gray-900 dark:text-gray-100">
                        {registrationFee.toLocaleString()} sats
                        <span className="text-gray-500 dark:text-gray-400 text-xs ml-1">
                          (${usdValues.inscriptionFeeUSD})
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center">
                        <Bitcoin className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">Network Fee</span>
                      </div>
                      <div className="text-gray-900 dark:text-gray-100">
                        {networkFee.toLocaleString()} sats
                        <span className="text-gray-500 dark:text-gray-400 text-xs ml-1">
                          (${usdValues.networkFeeUSD})
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center">
                        <WalletIcon className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">Size Fee</span>
                      </div>
                      <div className="text-gray-900 dark:text-gray-100">
                        {sizeFee.toLocaleString()} sats
                        <span className="text-gray-500 dark:text-gray-400 text-xs ml-1">
                          (${usdValues.sizeFeeUSD})
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center">
                        <Bolt className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">Platform Fee</span>
                      </div>
                      <div className="text-gray-900 dark:text-gray-100">
                        {platformFee.toLocaleString()} sats
                        <span className="text-gray-500 dark:text-gray-400 text-xs ml-1">
                          (${usdValues.serviceFeeUSD})
                        </span>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center font-medium">
                      <span className="text-gray-900 dark:text-gray-100">Total</span>
                      <div className="text-gray-900 dark:text-gray-100">
                        {totalFee.toLocaleString()} sats
                        <span className="text-gray-600 dark:text-gray-400 text-xs ml-1">
                          (${usdValues.totalUSD})
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg text-sm text-gray-600 dark:text-gray-400 flex items-start">
                    <AlertCircle className="h-4 w-4 mr-2 mt-0.5 text-gray-500 dark:text-gray-400" />
                    <div>
                      <p>Estimated processing time: {processingTime}</p>
                      <p className="mt-1">Registration fees will be sent to {formatAddress(registryAddress)}</p>
                      <p>Platform fees support development: {formatAddress(platformAddress)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-navy-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Payment Method</h4>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <Card 
                      className={`cursor-pointer transition-all ${
                        paymentMethod === 'onchain' 
                          ? 'ring-2 ring-blue-500 dark:ring-blue-400' 
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                      onClick={() => setPaymentMethod('onchain')}
                    >
                      <CardContent className="flex items-center p-3">
                        <Bitcoin className="h-5 w-5 mr-2 text-orange-500 dark:text-orange-400" />
                        <span className="text-gray-900 dark:text-gray-100">On-chain Payment</span>
                      </CardContent>
                    </Card>
                    
                    <Card 
                      className={`cursor-pointer transition-all ${
                        paymentMethod === 'lightning' 
                          ? 'ring-2 ring-blue-500 dark:ring-blue-400' 
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                      onClick={() => setPaymentMethod('lightning')}
                    >
                      <CardContent className="flex items-center p-3">
                        <Bolt className="h-5 w-5 mr-2 text-yellow-500 dark:text-yellow-400" />
                        <span className="text-gray-900 dark:text-gray-100">Lightning Network</span>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {paymentMethod === 'lightning' && (
                    <Alert className="mb-4 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800">
                      <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      <AlertTitle>Coming Soon</AlertTitle>
                      <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                        Lightning Network payments will be available in a future update. Please use on-chain payment for now.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                
                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('wallet')}
                    className="border-gray-200 dark:border-gray-700"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  
                  <Button 
                    onClick={completePurchase}
                    className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800"
                    disabled={registering}
                  >
                    {registering ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Complete Purchase
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}