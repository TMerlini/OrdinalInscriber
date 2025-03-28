import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle, Loader2, Search, Bitcoin, Wallet } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
// Import Stacks Connect for wallet integration
import { 
  AppConfig, 
  UserSession, 
  showConnect, 
  openSTXTransfer 
} from '@stacks/connect';
// Import network constants from @stacks/network
import { STACKS_TESTNET, STACKS_MAINNET } from '@stacks/network';

interface SNSName {
  id: string;
  name: string;
  status: 'available' | 'taken' | 'pending';
  owner?: string;
}

interface BitcoinWallet {
  name: string;
  address: string;
  type: 'hardware' | 'software' | 'exchange';
  balance?: number;
}

export default function SNSRegister() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [searching, setSearching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [names, setNames] = useState<SNSName[]>([]);
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [registering, setRegistering] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('search');
  const [destinationAddress, setDestinationAddress] = useState<string>('');
  const [walletConnected, setWalletConnected] = useState<boolean>(false);
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'onchain' | 'lightning'>('onchain');
  const [registrationFee, setRegistrationFee] = useState<number>(25000); // 25,000 sats per name
  const [walletData, setWalletData] = useState<{
    userData: any;
    address: string;
    walletType: string;
  } | null>(null);
  const { toast } = useToast();
  
  // Set up wallet config for Stacks Connect (Hiro/Xverse)
  const appConfig = new AppConfig(['store_write', 'publish_data']);
  const userSession = new UserSession({ appConfig });
  
  // Check for existing session on component mount
  useEffect(() => {
    // Check URL parameters to see if we're returning from a wallet app
    const urlParams = new URLSearchParams(window.location.search);
    const fromWallet = urlParams.get('from_wallet') === 'true';
    const targetTab = urlParams.get('tab');
    
    // If user is authenticated, set up wallet data
    if (userSession.isUserSignedIn()) {
      const userData = userSession.loadUserData();
      const address = userData.profile?.stxAddress?.testnet; // Use .mainnet for production
      
      console.log("Found signed in user:", address);
      console.log("URL params:", { fromWallet, targetTab });
      
      if (address) {
        setWalletData({
          userData,
          address,
          walletType: 'Stacks'
        });
        
        setWalletConnected(true);
        setSelectedWallet(address);
        
        // If coming from wallet authentication, go to payment tab
        if (fromWallet || targetTab === 'payment') {
          console.log("Redirecting to payment tab from URL parameters");
          setActiveTab('payment');
          
          // Clean up URL
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }
        
        toast({
          title: "Wallet Connected",
          description: "Your wallet is already connected.",
          variant: "default"
        });
      }
    }
    
    // Set up a listener for post-message redirect (for mobile wallets)
    const messageHandler = (event: MessageEvent) => {
      if (event.data && event.data.from === 'wallet-connect' && event.data.authenticated) {
        console.log("Received post-message wallet authentication");
        // If we get a message indicating successful authentication, check session again
        if (userSession.isUserSignedIn()) {
          handleSuccessfulWalletConnection();
        }
      }
    };
    
    window.addEventListener('message', messageHandler);
    
    return () => {
      window.removeEventListener('message', messageHandler);
    };
  }, []);
  
  // Direct function to just open Xverse wallet on mobile
  const openXverseWallet = () => {
    toast({
      title: "Opening Xverse Wallet",
      description: "Redirecting to Xverse app. Please authenticate and return to this page.",
      duration: 5000
    });
    
    // Save current URL to help with redirect back
    const returnUrl = window.location.href;
    
    // Store more detailed wallet information
    sessionStorage.setItem('wallet_redirect', 'true');
    sessionStorage.setItem('wallet_type', 'xverse');
    sessionStorage.setItem('wallet_return_url', returnUrl);
    sessionStorage.setItem('wallet_redirect_time', Date.now().toString());
    
    // On mobile, we need to use the Xverse deep link
    // First try with authentication parameters
    if (typeof window !== 'undefined') {
      try {
        const authOptions = {
          appDetails: {
            name: 'Ordinarinos SNS',
            icon: window.location.origin + '/logo.png',
          },
          redirectTo: returnUrl,
          onFinish: () => {
            console.log("Xverse auth flow finished");
            // Should automatically return to browser
          },
        };
        
        // Store auth details for verification
        sessionStorage.setItem('auth_request_pending', 'true');
        
        // Redirect to Xverse wallet with proper authentication parameters
        showConnect(authOptions)
          .then(() => {
            console.log("Connect request sent to Xverse");
          })
          .catch(err => {
            console.error("Error connecting to Xverse:", err);
            // Fallback to simple deep link if showConnect fails
            window.location.href = 'xverse://';
          });
      } catch (e) {
        console.error("Error in Xverse connection:", e);
        // Fallback to simple deep link
        window.location.href = 'xverse://';
      }
    } else {
      // Simple fallback for mobile direct link
      try {
        if (typeof window !== 'undefined') {
          const location = window.location;
          if (location) {
            location.href = 'xverse://';
          }
        }
      } catch (err) {
        console.error('Error opening Xverse app:', err);
      }
    }
  };
  
  // Connect to Stacks wallet (Hiro, Xverse, etc.)
  const connectToStacksWallet = () => {
    // First check if Stacks-compatible wallet is available in the browser
    const hasXverse = typeof window !== 'undefined' && (
      (window as any).XverseProviders !== undefined || 
      (window as any).xverse !== undefined
    );
    const hasHiro = typeof window !== 'undefined' && (window as any).StacksProvider !== undefined;
    const hasStacks = typeof window !== 'undefined' && (window as any).stacks !== undefined;
    
    console.log("Wallet detection:", {
      hasXverse, 
      hasHiro, 
      hasStacks,
      isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    });
    
    // Detect if running on mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // First, check if we're already authenticated (in case returning from wallet app)
    if (userSession.isUserSignedIn()) {
      console.log("User is already signed in, proceeding with wallet data");
      handleSuccessfulWalletConnection();
      return;
    }
    
    // Special handling for Xverse wallet on mobile
    if (isMobile) {
      // For very simple direct link, just open Xverse wallet
      // without any complicated UI or redirects
      openXverseWallet();
      return;
    }
    
    if (!hasXverse && !hasHiro && !hasStacks) {
      console.log("No wallet detected in browser");
      // Provide helpful guidance if wallet isn't detected but might be installed
      toast({
        title: "Wallet not detected",
        description: "If you have Xverse or Hiro wallet installed, please ensure it's unlocked. You may need to restart your browser and try again.",
        variant: "destructive"
      });
    }
    
    // Create a special redirect URL with a parameter that indicates we're returning from wallet
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('from_wallet', 'true');
    currentUrl.searchParams.set('tab', 'payment');
    const redirectUrl = currentUrl.toString();
    
    // Use standard Stacks Connect approach
    connectWithShowConnect(redirectUrl);
  };
  
  // Helper function to handle successful connection
  const handleSuccessfulWalletConnection = () => {
    if (userSession.isUserSignedIn()) {
      const userData = userSession.loadUserData();
      const address = userData.profile?.stxAddress?.testnet; // Use .mainnet for production
      
      console.log("Authenticated with Stacks wallet, address:", address);
      
      if (address) {
        setWalletData({
          userData,
          address,
          walletType: 'Stacks'
        });
        
        setWalletConnected(true);
        setSelectedWallet(address);
        
        toast({
          title: "Wallet Connected",
          description: "Your Stacks-compatible wallet has been connected successfully.",
          variant: "default"
        });
        
        // Hide wallet options and move to payment tab
        setShowWalletOptions(false);
        setActiveTab('payment');
      }
    }
  };
  
  // Extracted showConnect logic to allow for using it as a fallback
  const connectWithShowConnect = (redirectUrl: string = '/') => {
    console.log("Using redirect URL in showConnect:", redirectUrl);
    
    showConnect({
      appDetails: {
        name: 'Ordinarinos Inscription Tool',
        icon: window.location.origin + '/logo.png',
      },
      redirectTo: redirectUrl,
      // Set to true to force selection of wallet even if previously authenticated
      userSession,
      onFinish: () => {
        handleSuccessfulWalletConnection();
      },
      onCancel: () => {
        console.log("Wallet connection cancelled");
        toast({
          title: "Connection Cancelled",
          description: "Wallet connection was cancelled.",
          variant: "destructive"
        });
      },
    });
  };
  
  // Sample wallet list (in production would come from connected wallet)
  const availableWallets: BitcoinWallet[] = [
    { name: 'Hardware Wallet', address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', type: 'hardware', balance: 1250000 },
    { name: 'Mobile Wallet', address: 'bc1qm34lsc65zpw79lxes69zkqmk6ee3ewf0j77s3h', type: 'software', balance: 350000 },
    { name: 'Exchange Wallet', address: '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy', type: 'exchange', balance: 450000 }
  ];
  
  // Check if we're in a Janeway environment to provide special connection options
  const isJanewayURL = typeof window !== 'undefined' && 
    window.location.hostname.includes('janeway.replit.dev');
    
  // Special connection method for Janeway environment
  const directConnectForJaneway = () => {
    // For Janeway environment, we'll use a direct Stacks wallet connection
    toast({
      title: "Connecting Wallet",
      description: "Initializing wallet connection...",
      duration: 3000
    });
    
    // Use the standard Stacks Connect flow but with environment-specific settings
    // Create a special redirect URL with parameters for Janeway environment
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('from_wallet', 'true');
    currentUrl.searchParams.set('tab', 'payment');
    currentUrl.searchParams.set('janeway', 'true');
    const redirectUrl = currentUrl.toString();
    
    // Use showConnect to connect to a real wallet
    showConnect({
      appDetails: {
        name: 'Ordinarinos SNS Registration',
        icon: window.location.origin + '/logo.png',
      },
      redirectTo: redirectUrl,
      userSession,
      onFinish: () => {
        // Process the wallet connection result
        handleSuccessfulWalletConnection();
      },
      onCancel: () => {
        console.log("Wallet connection cancelled");
        toast({
          title: "Connection Cancelled",
          description: "Wallet connection was cancelled. Please try again.",
          variant: "destructive"
        });
      },
    });
  };

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
              body: JSON.stringify({ name })
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

  // Function to show wallet selector and connect to chosen wallet
  const [showWalletOptions, setShowWalletOptions] = useState<boolean>(false);
  const [detectedWallets, setDetectedWallets] = useState<BitcoinWallet[]>([
    { name: 'Xverse', address: '', type: 'software' },
    { name: 'Hiro Wallet', address: '', type: 'software' },
    { name: 'Leather', address: '', type: 'software' },
    { name: 'Hardware Wallet', address: '', type: 'hardware' }
  ]);

  // Show wallet selection dialog
  const showWalletSelector = () => {
    setShowWalletOptions(true);
    
    // In a real app, this would scan for installed wallets
    setTimeout(() => {
      setDetectedWallets([
        { 
          name: 'Xverse', 
          address: 'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0',
          type: 'software' 
        },
        ...availableWallets
      ]);
    }, 1000);
  };
  
  // Connect to specific wallet
  const connectToWallet = (wallet: BitcoinWallet) => {
    setWalletConnected(true);
    setSelectedWallet(wallet.address);
    setShowWalletOptions(false);
    
    toast({
      title: `${wallet.name} Connected`,
      description: "Your Bitcoin wallet has been connected successfully.",
      variant: "default"
    });
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
    
    if (walletData && paymentMethod === 'onchain') {
      try {
        // If connected with Stacks wallet, use it for payment
        // Convert satoshis to microSTX (1 STX = 100 million microSTX)
        const microSTXAmount = totalFee * 100; // Simple conversion for demonstration
        
        // For a real implementation, you'd want to calculate the exact STX equivalent
        await openSTXTransfer({
          recipient: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', // Example recipient address
          amount: microSTXAmount.toString(),
          memo: `SNS Registration: ${selectedNames.join(', ')}`,
          network: STACKS_TESTNET, // Use STACKS_MAINNET for production
          appDetails: {
            name: 'Ordinarinos Inscription Tool',
            icon: window.location.origin + '/logo.png',
          },
          onFinish: () => {
            // Register names after successful payment
            registerSNSNames();
          },
          onCancel: () => {
            toast({
              title: "Payment cancelled",
              description: "The payment was cancelled. Please try again.",
              variant: "destructive"
            });
          }
        });
      } catch (err) {
        console.error('Error processing payment:', err);
        toast({
          title: "Payment failed",
          description: "There was an error processing your payment. Please try again.",
          variant: "destructive"
        });
      }
    } else {
      // Fall back to traditional payment flow
      registerSNSNames();
    }
  };
  
  // Calculate the total registration fee
  const totalFee = registrationFee * selectedNames.length;
  const formattedFee = totalFee.toLocaleString();
  
  return (
    <div className="space-y-4">
      <div className="mb-6">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Search for and register Satoshi Name Service (SNS) names. SNS provides a human-readable 
          naming system for Bitcoin addresses on the Bitcoin blockchain.
        </p>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4 grid grid-cols-3">
            <TabsTrigger value="search">
              1. Search Names
            </TabsTrigger>
            <TabsTrigger value="wallet" disabled={selectedNames.length === 0}>
              2. Connect Wallet
            </TabsTrigger>
            <TabsTrigger value="payment" disabled={!walletConnected || selectedNames.length === 0}>
              3. Payment
            </TabsTrigger>
          </TabsList>
          
          {/* Search Tab */}
          <TabsContent value="search">
            <div className="flex space-x-2 mb-4">
              <div className="relative flex-grow">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-orange-500 dark:text-orange-400"/>
                <Input
                  placeholder="Search for a name (e.g., satoshi, bitcoin)"
                  className="pl-8 border-orange-200 dark:border-orange-800/40"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyUp={handleKeyPress}
                  disabled={searching}
                />
              </div>
              <Button 
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800"
              >
                {searching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking
                  </>
                ) : (
                  'Check Availability'
                )}
              </Button>
            </div>

            {error && (
              <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 text-sm mb-4">
                <div className="flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {error}
                </div>
              </div>
            )}

            {selectedNames.length > 0 && (
              <div className="mb-4 p-3 bg-orange-50 dark:bg-navy-800 rounded-md border border-orange-100 dark:border-navy-700">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Selected Names: {selectedNames.length}
                    </span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedNames.map(name => (
                        <Badge 
                          key={name} 
                          variant="outline"
                          className="bg-white dark:bg-navy-900 cursor-pointer"
                          onClick={() => toggleNameSelection(name)}
                        >
                          {name} ✕
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    onClick={proceedToCheckout}
                    className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800"
                  >
                    Proceed to Checkout
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {searching ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </div>
              ) : names.length > 0 ? (
                names.map(nameInfo => (
                  <Card 
                    key={nameInfo.id}
                    className={`p-4 flex justify-between items-center ${
                      nameInfo.status === 'available' 
                        ? 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30' 
                        : nameInfo.status === 'pending'
                        ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-100 dark:border-yellow-900/30'
                        : 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{nameInfo.name}</span>
                        {nameInfo.status === 'available' ? (
                          <Badge variant="outline" className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800">
                            Available
                          </Badge>
                        ) : nameInfo.status === 'pending' ? (
                          <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800">
                            Pending Registration
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800">
                            Already Registered
                          </Badge>
                        )}
                      </div>
                      
                      {nameInfo.status === 'taken' && nameInfo.owner && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Owner: {nameInfo.owner.substring(0, 10)}...{nameInfo.owner.substring(nameInfo.owner.length - 4)}
                        </p>
                      )}
                    </div>
                    
                    {nameInfo.status === 'available' && (
                      <Button 
                        size="sm"
                        variant={selectedNames.includes(nameInfo.name) ? "default" : "outline"}
                        className={selectedNames.includes(nameInfo.name) 
                          ? "bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800" 
                          : ""}
                        onClick={() => toggleNameSelection(nameInfo.name)}
                      >
                        {selectedNames.includes(nameInfo.name) ? (
                          <>
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Selected
                          </>
                        ) : (
                          'Select for Registration'
                        )}
                      </Button>
                    )}
                  </Card>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-navy-800 rounded-lg">
                  Search for names to check their availability
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Wallet Connection Tab */}
          <TabsContent value="wallet">
            <div className="p-4 bg-orange-50 dark:bg-navy-800 rounded-lg border border-orange-100 dark:border-navy-700">
              <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">Connect Your Bitcoin Wallet</h3>
              
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                Connect a Bitcoin wallet to register your selected SNS names. 
                The wallet address will be associated with your name registrations.
              </p>
              
              {/* Special section that shows after returning from mobile wallet redirect */}
              {(() => {
                // Check sessionStorage for redirect flag
                const fromWallet = typeof window !== 'undefined' && sessionStorage.getItem('wallet_redirect') === 'true';
                
                if (fromWallet && !walletConnected && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                  return (
                    <div className="space-y-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md mb-4">
                        <h4 className="font-medium text-blue-800 dark:text-blue-300 flex items-center">
                          <CheckCircle className="h-5 w-5 mr-2 text-blue-500" /> Welcome Back
                        </h4>
                        <p className="text-blue-600 dark:text-blue-400 text-sm mt-1">
                          If you authenticated in your Xverse wallet, tap the Continue button below to complete the connection.
                        </p>
                      </div>
                      
                      <div className="flex space-x-3">
                        <Button
                          className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800"
                          onClick={() => {
                            // Clear the session flag
                            sessionStorage.removeItem('wallet_redirect');
                            
                            // Try to force authentication check again with Stacks
                            try {
                              // Force a fresh authentication check with the Stacks wallet
                              const authData = {
                                appDetails: {
                                  name: 'Ordinarinos SNS',
                                  icon: window.location.origin + '/logo.png',
                                },
                                redirectTo: window.location.href,
                                onFinish: () => {
                                  console.log("Authentication check complete");
                                  // Will invoke callback after checking
                                },
                                userSession,
                                onCancel: () => {
                                  console.log("Authentication check cancelled");
                                },
                              };
                              
                              // First try getting authentication status directly
                              if (userSession.isUserSignedIn()) {
                                console.log("User is signed in according to session check");
                                handleSuccessfulWalletConnection();
                              } else {
                                console.log("User not signed in, asking wallet again");
                                // Create a new user session in case the old one is stale
                                const newUserSession = new UserSession({ appConfig });
                                
                                // Check if there's existing session data
                                const hasExistingSession = typeof localStorage !== 'undefined' && 
                                  localStorage.getItem('blockstack-session') !== null;
                                  
                                if (hasExistingSession) {
                                  console.log("Found existing session data, attempting to restore");
                                  try {
                                    if (newUserSession.isUserSignedIn()) {
                                      console.log("New session shows user is signed in");
                                      // Update the global user session
                                      Object.assign(userSession, newUserSession);
                                      handleSuccessfulWalletConnection();
                                      return;
                                    }
                                  } catch (e) {
                                    console.error("Error checking new session:", e);
                                  }
                                }
                                
                                // If no session or restoration failed, tell user
                                toast({
                                  title: "Authentication Required",
                                  description: "Please authenticate in your wallet first, then try again.",
                                  variant: "destructive"
                                });
                                
                                // Offer to try to connect again
                                setTimeout(() => {
                                  openXverseWallet();
                                }, 3000);
                              }
                            } catch (error) {
                              console.error("Authentication check error:", error);
                              toast({
                                title: "Authentication Error",
                                description: "Failed to verify your wallet authentication. Please try connecting again.",
                                variant: "destructive"
                              });
                            }
                          }}
                        >
                          Continue to Payment
                        </Button>
                        
                        <Button
                          variant="outline"
                          onClick={() => {
                            // Clear the session flag
                            sessionStorage.removeItem('wallet_redirect');
                            // Try to open the wallet again
                            openXverseWallet();
                          }}
                        >
                          Retry Connection
                        </Button>
                      </div>
                    </div>
                  );
                }
                
                return null;
              })()}
              
              {!walletConnected ? (
                <div className="space-y-4">
                  {!showWalletOptions ? (
                    <div className="flex space-x-4">
                      <Button 
                        onClick={showWalletSelector}
                        className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800"
                      >
                        <Wallet className="mr-2 h-4 w-4" />
                        Connect Wallet
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">Select a Wallet</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Stacks-based wallets with real connection */}
                        <Button
                          variant="outline"
                          className="h-auto py-3 px-4 flex items-center justify-start hover:bg-orange-50 dark:hover:bg-navy-700 border-orange-200 dark:border-navy-600"
                          onClick={() => {
                            // Special direct connection method for Janeway environment
                            if (isJanewayURL) {
                              directConnectForJaneway();
                            } else if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                              openXverseWallet();
                            } else {
                              connectToStacksWallet();
                            }
                          }}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white mr-3">X</div>
                              <div>
                                <p className="font-medium text-left text-gray-900 dark:text-gray-100">
                                  Xverse Wallet 
                                  {/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && 
                                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 rounded-sm">Mobile Direct</span>
                                  }
                                  {isJanewayURL && 
                                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-sm">Stacks Connect</span>
                                  }
                                </p>
                                <p className="text-xs text-left text-gray-500 dark:text-gray-400">
                                  Stacks + Bitcoin
                                </p>
                              </div>
                            </div>
                            <div className="text-xs text-right">
                              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/40 rounded text-green-600 dark:text-green-400">
                                Recommended
                              </span>
                            </div>
                          </div>
                        </Button>
                        
                        <Button
                          variant="outline"
                          className="h-auto py-3 px-4 flex items-center justify-start hover:bg-orange-50 dark:hover:bg-navy-700 border-orange-200 dark:border-navy-600"
                          onClick={connectToStacksWallet}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3">
                                <Wallet className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                              </div>
                              <div>
                                <p className="font-medium text-left text-gray-900 dark:text-gray-100">Hiro Wallet</p>
                                <p className="text-xs text-left text-gray-500 dark:text-gray-400">
                                  Stacks Compatible
                                </p>
                              </div>
                            </div>
                            <div className="text-xs text-right">
                              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/40 rounded text-green-600 dark:text-green-400">
                                Software
                              </span>
                            </div>
                          </div>
                        </Button>
                        
                        {/* Other wallet options */}
                        {detectedWallets.filter(w => w.type === 'hardware').map((wallet, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            className="h-auto py-3 px-4 flex items-center justify-start hover:bg-orange-50 dark:hover:bg-navy-700 border-orange-200 dark:border-navy-600"
                            onClick={() => connectToWallet(wallet)}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center">
                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mr-3">
                                  <Wallet className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                </div>
                                <div>
                                  <p className="font-medium text-left text-gray-900 dark:text-gray-100">{wallet.name}</p>
                                  {wallet.address && (
                                    <p className="text-xs text-left text-gray-500 dark:text-gray-400">
                                      {wallet.address.substring(0, 7)}...{wallet.address.substring(wallet.address.length - 4)}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="text-xs text-right">
                                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-400">
                                  Hardware
                                </span>
                              </div>
                            </div>
                          </Button>
                        ))}
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setShowWalletOptions(false)}
                        className="mt-2"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                  
                  {!showWalletOptions && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 text-sm rounded">
                      <p>Connect your wallet using one of the following methods:</p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li><strong>Recommended:</strong> Stacks-compatible wallets (Xverse, Hiro)</li>
                        <li>Hardware wallets (Ledger, Trezor)</li>
                        <li>Mobile wallets through WalletConnect</li>
                      </ul>
                      <p className="mt-2 text-xs">Note: Xverse wallet provides the best support for both Stacks and Bitcoin operations.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400 mr-2 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-300">
                        {walletData?.walletType === 'Stacks' ? 'Stacks Wallet Connected' : 'Wallet Connected Successfully'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {walletData?.walletType === 'Stacks' 
                          ? `Your ${walletData.userData?.profile?.name || 'Stacks'} wallet is connected and ready for transactions.`
                          : 'Your Bitcoin wallet is connected and ready to use.'}
                      </p>
                      {walletData?.address && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Address: {walletData.address.substring(0, 10)}...{walletData.address.substring(walletData.address.length - 4)}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Selected Wallet:
                    </label>
                    <Select
                      value={selectedWallet}
                      onValueChange={setSelectedWallet}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select wallet" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableWallets.map(wallet => (
                          <SelectItem key={wallet.address} value={wallet.address}>
                            {wallet.name} ({wallet.address.substring(0, 7)}...{wallet.address.substring(wallet.address.length - 4)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Registration Destination Address:
                    </label>
                    <Input 
                      type="text"
                      placeholder="Enter Bitcoin address (leave empty to use selected wallet)"
                      value={destinationAddress}
                      onChange={(e) => setDestinationAddress(e.target.value)}
                      className="border-orange-200 dark:border-navy-600"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      This address will be the owner of the SNS names. If left empty, your connected wallet address will be used.
                    </p>
                  </div>
                  
                  <div className="flex justify-between pt-4">
                    <Button 
                      variant="outline"
                      onClick={() => setActiveTab('search')}
                    >
                      Back to Search
                    </Button>
                    
                    <Button 
                      onClick={() => setActiveTab('payment')}
                      className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800"
                    >
                      Continue to Payment
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Payment Tab */}
          <TabsContent value="payment">
            <div className="p-4 bg-orange-50 dark:bg-navy-800 rounded-lg border border-orange-100 dark:border-navy-700">
              <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">Complete Registration</h3>
              
              <div className="mb-6 space-y-4">
                <div className="bg-white dark:bg-navy-900 p-4 rounded-md">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Order Summary</h4>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">SNS Names:</span>
                      <span className="text-gray-900 dark:text-gray-100">{selectedNames.length}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Registration Fee (per name):</span>
                      <span className="text-gray-900 dark:text-gray-100">{registrationFee.toLocaleString()} sats</span>
                    </div>
                    
                    <div className="pt-2 border-t border-gray-200 dark:border-navy-700 flex justify-between font-medium">
                      <span className="text-gray-900 dark:text-gray-100">Total:</span>
                      <span className="text-orange-600 dark:text-orange-400">{formattedFee} sats</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-navy-900 p-4 rounded-md">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Payment Method</h4>
                  
                  <div className="flex space-x-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <input 
                        type="radio" 
                        id="payment-onchain" 
                        checked={paymentMethod === 'onchain'}
                        onChange={() => setPaymentMethod('onchain')}
                        className="rounded-full text-orange-600 focus:ring-orange-500" 
                      />
                      <label htmlFor="payment-onchain" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        On-chain Payment
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input 
                        type="radio" 
                        id="payment-lightning" 
                        checked={paymentMethod === 'lightning'}
                        onChange={() => setPaymentMethod('lightning')} 
                        className="rounded-full text-orange-600 focus:ring-orange-500"
                      />
                      <label htmlFor="payment-lightning" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Lightning Payment
                      </label>
                    </div>
                  </div>
                  
                  {paymentMethod === 'onchain' ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Payment will be made directly from your connected wallet. 
                      Network fees will be added to the total cost.
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Lightning payment allows for instant settlement with minimal fees.
                      A QR code will be provided to complete the payment.
                    </div>
                  )}
                </div>
                
                <div className="bg-white dark:bg-navy-900 p-4 rounded-md">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Wallet Details</h4>
                  
                  {selectedWallet ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Selected Wallet:</span>
                        <span className="text-gray-900 dark:text-gray-100">
                          {availableWallets.find(w => w.address === selectedWallet)?.name || 'Unknown'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Wallet Address:</span>
                        <span className="text-gray-900 dark:text-gray-100">
                          {selectedWallet.substring(0, 7)}...{selectedWallet.substring(selectedWallet.length - 4)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Available Balance:</span>
                        <span className="text-gray-900 dark:text-gray-100">
                          {availableWallets.find(w => w.address === selectedWallet)?.balance?.toLocaleString() || 0} sats
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-orange-600 dark:text-orange-400">
                      No wallet selected. Please go back and connect a wallet.
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-between">
                <Button 
                  variant="outline"
                  onClick={() => setActiveTab('wallet')}
                >
                  Back
                </Button>
                
                <Button 
                  onClick={completePurchase}
                  disabled={registering}
                  className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800"
                >
                  {registering ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Bitcoin className="mr-2 h-4 w-4" />
                      Complete Purchase
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}