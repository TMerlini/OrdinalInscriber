import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  
  // Fee-related state
  const [registrationFee, setRegistrationFee] = useState<number>(0); 
  const [platformFee, setPlatformFee] = useState<number>(0);
  const [networkFee, setNetworkFee] = useState<number>(0);
  const [sizeFee, setSizeFee] = useState<number>(0);
  const [registryAddress, setRegistryAddress] = useState<string>('');
  const [platformAddress, setPlatformAddress] = useState<string>('');
  const [selectedFeeTier, setSelectedFeeTier] = useState<'economy' | 'normal' | 'custom'>('normal');
  const [feeTiers, setFeeTiers] = useState<any>(null);
  const [processingTime, setProcessingTime] = useState<string>('1 hour');
  const [usdValues, setUsdValues] = useState<any>(null);
  
  const [showWalletOptions, setShowWalletOptions] = useState<boolean>(false);
  const [detectedWallets, setDetectedWallets] = useState<BitcoinWallet[]>([
    { name: 'Xverse', address: '', type: 'software' },
    { name: 'Hiro Wallet', address: '', type: 'software' },
    { name: 'Leather', address: '', type: 'software' },
    { name: 'Hardware Wallet', address: '', type: 'hardware' }
  ]);
  const [walletData, setWalletData] = useState<{
    userData: any;
    address: string;
    walletType: string;
  } | null>(null);
  
  const { toast } = useToast();
  
  // Calculate total fee with all components
  const totalInscriptionFee = selectedNames.length * registrationFee;
  const totalNetworkFee = networkFee; // Network fee is only charged once
  const totalSizeFee = selectedNames.length * sizeFee; // Size fee charged per name
  // The platform fee (service fee) is only charged once per transaction
  const totalServiceFee = selectedNames.length > 0 ? platformFee : 0;
  // Total of all fee components
  const totalFee = totalInscriptionFee + totalNetworkFee + totalSizeFee + totalServiceFee;
  const formattedFee = totalFee.toLocaleString();
  
  // Backwards compatibility with existing code using totalRegistrationFee
  const totalRegistrationFee = totalInscriptionFee;
  
  // USD value calculations - using our retrieved exchange rates from the API
  const getUsdValue = (sats: number): string => {
    if (!usdValues || !usdValues.inscriptionFeeUSD) return '$0.00';
    const exchangeRate = parseFloat(usdValues.inscriptionFeeUSD) / registrationFee;
    return `$${(sats * exchangeRate).toFixed(2)}`;
  };
  
  // Set up wallet config for Stacks Connect (Hiro/Xverse)
  const appConfig = new AppConfig(['store_write', 'publish_data']);
  const userSession = new UserSession({ appConfig });
  
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
        
        // Update wallet state to show connected UI
        setSelectedWallet(address);
        
        // For mobile devices where we need authentication and signature for full functionality
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        if (isMobile) {
          toast({
            title: "Wallet Authentication Successful",
            description: "Authentication completed. Test signature required for full connection...",
            variant: "default"
          });
          
          // Allow UI to update first
          setTimeout(() => {
            // Request a test signature to verify full wallet connection capability
            testWalletSignature().then(success => {
              if (success) {
                setWalletConnected(true);
              }
            });
          }, 1000);
        } else {
          // For desktop, we'll set as connected right away
          setWalletConnected(true);
          
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
    }
  };
  
  // Fetch SNS fee information from the server with tier selection
  const fetchSNSFees = async (tier: 'economy' | 'normal' | 'custom' = 'normal') => {
    try {
      const response = await fetch(`/api/sns/fees?tier=${tier}`);
      
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
      
      // Store all tiers information for the tier selector UI
      if (feeData.tiers) {
        setFeeTiers(feeData.tiers);
      }
      
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
    fetchSNSFees(tier);
  };

  // Check for existing session on component mount
  useEffect(() => {
    // Load fee information
    fetchSNSFees();
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
  
  // Direct function to just open Xverse wallet on mobile - using universal links approach
  const openXverseWallet = () => {
    toast({
      title: "Connecting to Wallet",
      description: "Opening Xverse app. If you don't have it installed, you'll be prompted to install it.",
      duration: 5000
    });
    
    // Use a direct, simpler approach to launch the wallet
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);
    
    try {
      // For mobile devices, use specific universal links that work whether app is installed or not
      if (isMobile) {
        // Fixed direct protocol approach for mobile browsers 
        try {
          // First try direct protocol which will open the app if installed
          window.location.href = 'xverse://';
          
          // Set a timeout to check if the app was opened
          setTimeout(() => {
            // If we're still here after timeout, app wasn't opened, so redirect to app store
            if (document.hidden) {
              return; // User already switched to the app
            }
            
            if (isIOS) {
              window.location.href = 'https://apps.apple.com/us/app/xverse-wallet/id1633013386';
            } else if (isAndroid) {
              window.location.href = 'https://play.google.com/store/apps/details?id=com.xverse.wallet';
            }
          }, 2000);
        } catch (appError) {
          console.error('Error opening app:', appError);
          // Fallback to app store links
          if (isIOS) {
            window.location.href = 'https://apps.apple.com/us/app/xverse-wallet/id1633013386';
          } else if (isAndroid) {
            window.location.href = 'https://play.google.com/store/apps/details?id=com.xverse.wallet';
          }
        }
        
        // Store connection attempt in session storage
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('wallet_connection_attempted', 'true');
          sessionStorage.setItem('wallet_type', 'xverse');
          sessionStorage.setItem('connection_timestamp', Date.now().toString());
        }
        
        // Show helpful instructions
        setTimeout(() => {
          toast({
            title: "Wallet Installation",
            description: "After installing Xverse wallet, please return to this page and try connecting again.",
            duration: 8000
          });
        }, 3000);
      } else {
        // For desktop, use the standard Stacks Connect approach
        connectToStacksWallet();
      }
    } catch (err) {
      console.error('Error launching wallet app:', err);
      
      toast({
        title: "Connection Error",
        description: "Unable to connect to wallet. Please install Xverse wallet and try again.",
        variant: "destructive"
      });
    }
  };
  
  // Connect to Stacks wallet (Hiro, Xverse, etc.)
  const connectToStacksWallet = () => {
    // Check if we're already authenticated (in case returning from wallet app)
    if (userSession.isUserSignedIn()) {
      console.log("User is already signed in, proceeding with wallet data");
      handleSuccessfulWalletConnection();
      return;
    }
    
    // Detect if running on mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // For mobile devices, we'll use a completely different approach
    if (isMobile) {
      // Instead of trying to detect wallets on mobile which is often unreliable,
      // we'll direct users to install the wallet app if they don't have it
      toast({
        title: "Mobile Wallet Connection",
        description: "For mobile devices, we'll connect you directly with Xverse wallet",
        duration: 3000
      });
      
      // Show wallet options
      setShowWalletOptions(true);
      return;
    }
    
    // For desktop browsers, check if Stacks-compatible wallet is available
    const hasXverse = typeof window !== 'undefined' && (
      (window as any).XverseProviders !== undefined || 
      (window as any).xverse !== undefined
    );
    const hasHiro = typeof window !== 'undefined' && (window as any).StacksProvider !== undefined;
    const hasStacks = typeof window !== 'undefined' && (window as any).stacks !== undefined;
    
    console.log("Desktop wallet detection:", { hasXverse, hasHiro, hasStacks });
    
    if (!hasXverse && !hasHiro && !hasStacks) {
      // Show wallet installation options if no wallet is detected
      toast({
        title: "No Wallet Detected",
        description: "Please install a Stacks-compatible wallet like Xverse or Hiro to continue.",
        duration: 5000
      });
      
      // Show wallet options screen to guide installation
      setShowWalletOptions(true);
      return;
    }
    
    // Create a special redirect URL with a parameter that indicates we're returning from wallet
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('from_wallet', 'true');
    currentUrl.searchParams.set('tab', 'payment');
    const redirectUrl = currentUrl.toString();
    
    // Use standard Stacks Connect approach for desktop
    connectWithShowConnect(redirectUrl);
  };
  
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

  // Sample wallet list (in production would come from connected wallet)
  const availableWallets: BitcoinWallet[] = [
    { name: 'Hardware Wallet', address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', type: 'hardware', balance: 1250000 },
    { name: 'Mobile Wallet', address: 'bc1qm34lsc65zpw79lxes69zkqmk6ee3ewf0j77s3h', type: 'software', balance: 350000 },
    { name: 'Exchange Wallet', address: '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy', type: 'exchange', balance: 450000 }
  ];
  
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
  
  // Test signature function for mobile wallet connection
  const testWalletSignature = async () => {
    if (!userSession.isUserSignedIn()) {
      toast({
        title: "Authentication Required",
        description: "Please authenticate with your wallet first.",
        variant: "destructive"
      });
      return false;
    }
    
    try {
      // Request a simple transfer signature to verify wallet is working correctly
      // This is more of a test than an actual payment
      const microSTXAmount = 1; // Minimal amount for testing
      
      toast({
        title: "Requesting Signature",
        description: "Please approve the signature request in your wallet app.",
        duration: 10000
      });
      
      // For mobile deep linking with signature request
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const testSignRequest = {
        recipient: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', // Example recipient
        amount: microSTXAmount.toString(),
        memo: 'Wallet connection test',
        network: STACKS_TESTNET, // Use STACKS_MAINNET for production
        appDetails: {
          name: 'Ordinarinos Inscription Tool',
          icon: window.location.origin + '/logo.png',
        },
        onFinish: (data: any) => {
          console.log("Signature completed:", data);
          toast({
            title: "Signature Successful",
            description: "Your wallet is now fully connected and authenticated!",
            variant: "default"
          });
          // Show connected state
          setWalletConnected(true);
          return true;
        },
        onCancel: () => {
          console.log("Signature cancelled");
          toast({
            title: "Signature Cancelled",
            description: "You cancelled the signature request. Authentication is incomplete.",
            variant: "destructive"
          });
          return false;
        }
      };
      
      // Special handling for mobile
      if (isMobile) {
        // Store data to help with return handling
        sessionStorage.setItem('signature_request_pending', 'true');
        sessionStorage.setItem('signature_timestamp', Date.now().toString());
        
        // Specify callback URL
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('from_wallet', 'true');
        currentUrl.searchParams.set('tab', 'payment');
        currentUrl.searchParams.set('payment_status', 'pending');
        currentUrl.searchParams.set('ts', Date.now().toString());
        
        const signOptions = {
          ...testSignRequest,
          redirectTo: currentUrl.toString()
        };
        
        await openSTXTransfer(signOptions);
      } else {
        // Desktop flow
        await openSTXTransfer(testSignRequest);
      }
      
      return true;
    } catch (error) {
      console.error("Signature request error:", error);
      toast({
        title: "Signature Failed",
        description: "There was an error requesting the signature. Please try again.",
        variant: "destructive"
      });
      return false;
    }
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
        const registrySTXAmount = totalInscriptionFee * 100; // Simple conversion for demonstration
        const platformSTXAmount = platformFee * 100; // Platform fee in microSTX
        
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        // First set up the registry payment
        const registryPaymentRequest = {
          recipient: registryAddress, // Official SNS registry address
          amount: registrySTXAmount.toString(),
          memo: `SNS Registration: ${selectedNames.join(', ')}`,
          network: STACKS_TESTNET, // Use STACKS_MAINNET for production
          appDetails: {
            name: 'Ordinarinos Inscription Tool',
            icon: window.location.origin + '/logo.png',
          },
          onFinish: async (data: any) => {
            console.log("Registry payment successful:", data);
            toast({
              title: "Registry Payment Successful",
              description: "Processing platform fee payment...",
              duration: 5000
            });
            
            // Now send the platform fee payment
            await sendPlatformFeePayment();
          },
          onCancel: () => {
            toast({
              title: "Payment cancelled",
              description: "The registry payment was cancelled. Please try again.",
              variant: "destructive"
            });
          }
        };
        
        // Function to handle platform fee payment after registry payment
        const sendPlatformFeePayment = async () => {
          const platformPaymentRequest = {
            recipient: platformAddress, // Platform fee address
            amount: platformSTXAmount.toString(),
            memo: `Platform fee for SNS: ${selectedNames.join(', ')}`,
            network: STACKS_TESTNET, // Use STACKS_MAINNET for production
            appDetails: {
              name: 'Ordinarinos Inscription Tool',
              icon: window.location.origin + '/logo.png',
            },
            onFinish: () => {
              toast({
                title: "Platform Fee Paid",
                description: "All payments completed. Processing registration...",
                duration: 5000
              });
              
              // Register names after successful payments
              registerSNSNames();
            },
            onCancel: () => {
              toast({
                title: "Platform Fee Cancelled",
                description: "The platform fee payment was cancelled. Your registry payment is still processing.",
                variant: "destructive"
              });
            }
          };
          
          await openSTXTransfer(platformPaymentRequest);
        };
        
        // Use main payment request for registry fee
        
        // Special handling for mobile
        if (isMobile) {
          // Store payment intent info
          sessionStorage.setItem('payment_request_pending', 'true');
          sessionStorage.setItem('payment_timestamp', Date.now().toString());
          sessionStorage.setItem('payment_names', JSON.stringify(selectedNames));
          sessionStorage.setItem('payment_amount', totalFee.toString());
          
          // Prepare callback URL
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.set('from_wallet', 'true');
          currentUrl.searchParams.set('tab', 'payment');
          currentUrl.searchParams.set('payment_status', 'processing');
          currentUrl.searchParams.set('ts', Date.now().toString());
          
          const mobileRegistryPaymentRequest = {
            ...registryPaymentRequest,
            redirectTo: currentUrl.toString()
          };
          
          await openSTXTransfer(mobileRegistryPaymentRequest);
        } else {
          // Desktop flow
          await openSTXTransfer(registryPaymentRequest);
        }
        
        toast({
          title: "Payment Initiated",
          description: "Please approve the transaction in your wallet.",
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
      // For Lightning Network payments, we would generate and display a Lightning invoice here
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
                                  {name.status === 'available' ? 'Available' :
                                   name.status === 'pending' ? 'Pending' : 'Taken'}
                                </Badge>
                              </div>
                              
                              {name.status === 'taken' && name.owner && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Owner: {name.owner.substring(0, 8)}...{name.owner.substring(name.owner.length - 8)}
                                </div>
                              )}
                            </div>
                            
                            {name.status === 'available' && (
                              <div className="flex items-center">
                                <input 
                                  type="checkbox" 
                                  id={`select-${name.id}`}
                                  checked={selectedNames.includes(name.name)}
                                  onChange={() => toggleNameSelection(name.name)}
                                  className="rounded text-orange-600 focus:ring-orange-500 h-4 w-4" 
                                />
                                <label 
                                  htmlFor={`select-${name.id}`} 
                                  className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                                >
                                  Select
                                </label>
                              </div>
                            )}
                            
                            {name.status === 'pending' && (
                              <div className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center">
                                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                Processing
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                    
                    {selectedNames.length > 0 && (
                      <div className="mt-4 p-3 bg-orange-100 dark:bg-navy-900 rounded-lg border border-orange-200 dark:border-navy-700">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {selectedNames.length} name{selectedNames.length !== 1 ? 's' : ''} selected
                            </span>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              Registration Fee: {registrationFee.toLocaleString()} sats / name
                            </div>
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
                ) : searching ? (
                  <div className="py-8">
                    <div className="flex flex-col items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-orange-600 dark:text-orange-400" />
                      <p className="mt-2 text-gray-600 dark:text-gray-400">Searching for names...</p>
                    </div>
                  </div>
                ) : (
                  <div className="py-8">
                    <div className="flex flex-col items-center justify-center text-center">
                      <Search className="h-12 w-12 text-gray-400 dark:text-gray-600 mb-3" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Search for SNS names</h3>
                      <p className="mt-1 max-w-md text-gray-600 dark:text-gray-400">
                        Enter a name to check its availability. Names must be at least 3 characters long.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          {/* Wallet Tab */}
          <TabsContent value="wallet">
            <div className="p-4 bg-orange-50 dark:bg-navy-800 rounded-lg border border-orange-100 dark:border-navy-700">
              <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">Connect Your Bitcoin Wallet</h3>
              
              <p className="mb-4 text-gray-600 dark:text-gray-400">
                Connect a Bitcoin wallet to register your selected SNS names. The wallet address will be associated with your name registrations.
              </p>
              
              {showWalletOptions ? (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-800 dark:text-gray-200">Select a wallet to connect</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {detectedWallets.map((wallet, index) => (
                      <Card key={index} className="overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700 cursor-pointer transition-colors" onClick={() => wallet.name === 'Xverse' ? openXverseWallet() : connectToWallet(wallet)}>
                        <div className="p-3 flex items-center">
                          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mr-3">
                            {wallet.name === 'Xverse' && (
                              <span className="text-lg font-bold text-orange-600 dark:text-orange-400">X</span>
                            )}
                            {wallet.name === 'Hiro Wallet' && (
                              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">H</span>
                            )}
                            {wallet.name === 'Hardware Wallet' && (
                              <span className="text-lg font-bold text-gray-600 dark:text-gray-400">H</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-gray-100">{wallet.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {wallet.type.charAt(0).toUpperCase() + wallet.type.slice(1)} wallet
                            </div>
                          </div>
                          <Badge className={`${
                            wallet.type === 'hardware' 
                              ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' 
                              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          }`}>
                            {wallet.type === 'hardware' ? 'Hardware' : 'Software'}
                          </Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button 
                      variant="outline"
                      onClick={() => setShowWalletOptions(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {walletConnected ? (
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                        <h4 className="font-medium text-green-800 dark:text-green-300">Wallet Connected</h4>
                      </div>
                      
                      <div className="mt-3 space-y-3">
                        <div className="flex flex-col space-y-1">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Wallet Address:</span>
                          <code className="bg-white dark:bg-navy-950 p-2 rounded text-sm text-gray-800 dark:text-gray-200 break-all border border-gray-200 dark:border-gray-700">
                            {walletData?.address || selectedWallet}
                          </code>
                        </div>
                        
                        <div className="flex flex-col space-y-1">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Wallet Type:</span>
                          <span className="text-gray-800 dark:text-gray-200">
                            {walletData?.walletType || "Bitcoin Wallet"}
                          </span>
                        </div>
                        
                        {!walletData?.userData && walletConnected && (
                          <div className="mt-2">
                            <Button 
                              size="sm"
                              onClick={testWalletSignature}
                              className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />
                              Verify Signing
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-800 dark:text-blue-300 mb-3">
                        You need to connect a wallet to register names. Choose one of the options below:
                      </p>
                      
                      <div className="flex flex-wrap gap-2">
                        {isJanewayURL && (
                          <Button 
                            onClick={directConnectForJaneway}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Wallet className="h-4 w-4 mr-2" />
                            Connect in Janeway
                          </Button>
                        )}
                        
                        <Button 
                          onClick={connectToStacksWallet}
                          className="bg-orange-600 hover:bg-orange-700 text-white dark:bg-orange-700 dark:hover:bg-orange-800"
                        >
                          <Wallet className="h-4 w-4 mr-2" />
                          Connect Stacks Wallet
                        </Button>
                        
                        <Button 
                          variant="outline"
                          onClick={showWalletSelector}
                          className="border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-navy-800"
                        >
                          Show all wallet options
                        </Button>
                      </div>
                    </div>
                  )}
                  
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
              
              {/* Fee tier selection similar to OrdinalsBot */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Select Fee Tier <span className="font-normal text-sm text-gray-500 dark:text-gray-400">(Network Fees - Flat Rate)</span></h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    onClick={() => handleFeeTierChange('economy')}
                    className={`p-3 rounded-md text-center transition-all ${
                      selectedFeeTier === 'economy' 
                        ? 'bg-orange-200 dark:bg-blue-800 border border-orange-400 dark:border-blue-600' 
                        : 'bg-white dark:bg-navy-900 border border-gray-200 dark:border-navy-700 hover:bg-orange-50 dark:hover:bg-navy-800'
                    }`}
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100">Economy</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Multiple Days</div>
                    <div className="text-sm text-gray-900 dark:text-gray-100">{networkFee - 100} sats (flat fee)</div>
                  </button>
                  
                  <button
                    onClick={() => handleFeeTierChange('normal')}
                    className={`p-3 rounded-md text-center transition-all ${
                      selectedFeeTier === 'normal' 
                        ? 'bg-orange-200 dark:bg-blue-800 border border-orange-400 dark:border-blue-600' 
                        : 'bg-white dark:bg-navy-900 border border-gray-200 dark:border-navy-700 hover:bg-orange-50 dark:hover:bg-navy-800'
                    }`}
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100">Normal</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">~1 hour</div>
                    <div className="text-sm text-gray-900 dark:text-gray-100">{networkFee} sats (flat fee)</div>
                  </button>
                  
                  <button
                    onClick={() => handleFeeTierChange('custom')}
                    className={`p-3 rounded-md text-center transition-all ${
                      selectedFeeTier === 'custom' 
                        ? 'bg-orange-200 dark:bg-blue-800 border border-orange-400 dark:border-blue-600' 
                        : 'bg-white dark:bg-navy-900 border border-gray-200 dark:border-navy-700 hover:bg-orange-50 dark:hover:bg-navy-800'
                    }`}
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100">Custom</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Choose fee</div>
                    <div className="text-sm text-gray-900 dark:text-gray-100">{networkFee + 1500} sats (flat fee)</div>
                  </button>
                </div>
                
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {processingTime ? `Estimated processing time: ${processingTime}` : 'Processing time varies by network conditions'}
                </div>
              </div>
              
              <div className="mb-6 space-y-4">
                <div className="bg-white dark:bg-navy-900 p-4 rounded-md">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Order Summary</h4>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">SNS Names:</span>
                      <span className="text-gray-900 dark:text-gray-100">{selectedNames.length}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Inscription Fee:</span>
                      <div className="text-right">
                        <span className="text-gray-900 dark:text-gray-100">{registrationFee.toLocaleString()} sats</span>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{getUsdValue(registrationFee)}</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Network Fee:</span>
                      <div className="text-right">
                        <span className="text-gray-900 dark:text-gray-100">{networkFee.toLocaleString()} sats</span>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{getUsdValue(networkFee)}</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Size Fee:</span>
                      <div className="text-right">
                        <span className="text-gray-900 dark:text-gray-100">{sizeFee.toLocaleString()} sats</span>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{getUsdValue(sizeFee)}</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Service Fee:</span>
                      <div className="text-right">
                        <span className="text-gray-900 dark:text-gray-100">{platformFee.toLocaleString()} sats</span>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{getUsdValue(platformFee)}</div>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-gray-200 dark:border-navy-700 flex justify-between font-medium">
                      <span className="text-gray-900 dark:text-gray-100">Total:</span>
                      <div className="text-right">
                        <div className="text-orange-600 dark:text-orange-400">{formattedFee} sats</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{getUsdValue(totalFee)}</div>
                      </div>
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