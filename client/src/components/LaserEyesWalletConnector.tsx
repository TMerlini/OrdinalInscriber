import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LaserEyesProvider, useLaserEyes } from '@omnisat/lasereyes-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, AlertCircle, Wallet as WalletIcon, ExternalLink } from 'lucide-react';
import { formatAddress } from '@/lib/addressUtils';

// Extended LaserEyes context type with our expected properties
interface ExtendedLaserEyesContext {
  isInitialized: boolean;
  isInstalled: boolean;
  isConnected: boolean;
  address?: string;
  currentWallet?: string;
  availableWallets: string[];
  connect: (wallet?: string) => Promise<void>;
  disconnect: () => Promise<void>;
}

interface LaserEyesWalletConnectorProps {
  onConnected?: (walletInfo: {
    address: string;
    walletType: string;
    userData?: any;
  }) => void;
  className?: string;
}

// The actual component that handles wallet connection
function WalletConnector({ onConnected, className }: LaserEyesWalletConnectorProps) {
  const { toast } = useToast();
  // Cast the hook return value to our extended interface
  const { 
    isInitialized,
    isInstalled,
    isConnected,
    address,
    connect,
    disconnect,
    currentWallet,
    availableWallets = []
  } = useLaserEyes() as unknown as ExtendedLaserEyesContext;
  
  const [connecting, setConnecting] = useState(false);
  const [initializationTimeoutReached, setInitializationTimeoutReached] = useState(false);
  
  // Set a timeout to avoid getting stuck forever in initialization
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!isInitialized) {
        console.log("Wallet initialization timed out");
        setInitializationTimeoutReached(true);
      }
    }, 5000); // 5 seconds timeout
    
    return () => clearTimeout(timeoutId);
  }, [isInitialized]);
  
  // Handle successful connection
  useEffect(() => {
    if (isConnected && address && currentWallet && onConnected) {
      console.log('Wallet connected successfully:', { address, currentWallet });
      
      onConnected({
        address,
        walletType: currentWallet,
        userData: {
          wallet: currentWallet,
          address
        }
      });
      
      toast({
        title: "Wallet Connected",
        description: `Successfully connected to ${currentWallet}`,
        variant: "default"
      });
    }
  }, [isConnected, address, currentWallet, onConnected, toast]);
  
  // Handle connection to wallet
  const handleConnect = async (walletName?: string) => {
    try {
      setConnecting(true);
      
      if (!isInitialized) {
        toast({
          title: "Initializing",
          description: "Wallet connection is initializing, please wait...",
          variant: "default"
        });
        return;
      }
      
      if (!isInstalled) {
        toast({
          title: "No Wallet Detected",
          description: "Please install a Bitcoin wallet to connect.",
          variant: "destructive"
        });
        return;
      }
      
      await connect(walletName);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect to wallet",
        variant: "destructive"
      });
    } finally {
      setConnecting(false);
    }
  };
  
  // Handle disconnection
  const handleDisconnect = async () => {
    try {
      await disconnect();
      toast({
        title: "Wallet Disconnected",
        description: "Your wallet has been disconnected",
        variant: "default"
      });
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  };
  
  if (!isInitialized && !initializationTimeoutReached) {
    return (
      <Card className={`${className} w-full max-w-md mx-auto`}>
        <CardHeader>
          <CardTitle>Initializing Wallet</CardTitle>
          <CardDescription>Please wait while we set up wallet connection...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-12 w-12 animate-spin text-orange-500 dark:text-navy-400" />
        </CardContent>
      </Card>
    );
  }
  
  // Show timeout message if initialization takes too long
  if (!isInitialized && initializationTimeoutReached) {
    return (
      <Card className={`${className} w-full max-w-md mx-auto`}>
        <CardHeader>
          <CardTitle>Wallet Connection Issue</CardTitle>
          <CardDescription>
            Unable to initialize wallet connection. This may be due to running in a development environment 
            or because no compatible wallets were detected.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-900/30 p-4 rounded-lg border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
              <div>
                <p>Note: Wallet connections may not work properly in Janeway or other sandboxed environments.</p>
                <p className="mt-1">This feature will work correctly when deployed or run outside of development environments.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!isInstalled) {
    return (
      <Card className={`${className} w-full max-w-md mx-auto`}>
        <CardHeader>
          <CardTitle>Install a Wallet</CardTitle>
          <CardDescription>No compatible Bitcoin wallets detected. Please install one of the following:</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <a 
              href="https://unisat.io/download" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center p-3 border rounded-lg hover:bg-orange-50 dark:hover:bg-navy-800 transition-colors"
            >
              <img src="https://unisat.io/download/img/wallet-logo.svg" alt="Unisat" className="h-8 w-8 mr-3" />
              <div className="flex-1">
                <h3 className="font-medium">Unisat Wallet</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Popular Bitcoin & Ordinals wallet</p>
              </div>
              <ExternalLink className="h-5 w-5 text-gray-400" />
            </a>
            
            <a 
              href="https://www.xverse.app/download" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center p-3 border rounded-lg hover:bg-orange-50 dark:hover:bg-navy-800 transition-colors"
            >
              <img src="https://assets.website-files.com/63970776d6a2a1f18f96c9f0/63a12e0af5f2dea7182d3e7c_xverse-logo-circle.svg" alt="Xverse" className="h-8 w-8 mr-3" />
              <div className="flex-1">
                <h3 className="font-medium">Xverse Wallet</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Bitcoin & Stacks wallet</p>
              </div>
              <ExternalLink className="h-5 w-5 text-gray-400" />
            </a>
            
            <a 
              href="https://www.okx.com/web3/wallet" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center p-3 border rounded-lg hover:bg-orange-50 dark:hover:bg-navy-800 transition-colors"
            >
              <img src="https://www.okx.com/cdn/assets/okx/web3/wallet/v3/download/icon-web.svg" alt="OKX" className="h-8 w-8 mr-3" />
              <div className="flex-1">
                <h3 className="font-medium">OKX Wallet</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Multi-chain crypto wallet</p>
              </div>
              <ExternalLink className="h-5 w-5 text-gray-400" />
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (isConnected && address) {
    return (
      <Card className={`${className} w-full max-w-md mx-auto`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Wallet Connected</CardTitle>
            <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300 flex items-center gap-1">
              <Check className="h-3 w-3" /> Connected
            </Badge>
          </div>
          <CardDescription>
            Your Bitcoin wallet is connected and ready to use.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-orange-50 dark:bg-navy-800 rounded-lg">
            <div className="flex items-center mb-2">
              <WalletIcon className="h-5 w-5 mr-2 text-orange-600 dark:text-navy-300" />
              <span className="font-medium">{currentWallet}</span>
            </div>
            <div className="font-mono text-sm break-all">{formatAddress(address)}</div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            variant="outline"
            onClick={handleDisconnect}
            className="w-full"
          >
            Disconnect Wallet
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  // Show wallet connection options
  return (
    <Card className={`${className} w-full max-w-md mx-auto`}>
      <CardHeader>
        <CardTitle>Connect Wallet</CardTitle>
        <CardDescription>Connect your Bitcoin wallet to continue</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          {availableWallets.map((wallet) => (
            <Button
              key={wallet}
              variant="outline"
              className="flex justify-start items-center h-auto py-3 px-4"
              onClick={() => handleConnect(wallet)}
              disabled={connecting}
            >
              {getWalletIcon(wallet)}
              <div className="flex-1 text-left ml-3">
                <div className="font-medium">{getWalletDisplayName(wallet)}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Connect with {getWalletDisplayName(wallet)}</div>
              </div>
              {connecting && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Utility functions for display
function getWalletDisplayName(wallet: string): string {
  const displayNames: Record<string, string> = {
    unisat: 'Unisat Wallet',
    xverse: 'Xverse Wallet',
    okx: 'OKX Wallet',
    leather: 'Leather Wallet',
  };
  
  return displayNames[wallet.toLowerCase()] || wallet;
}

function getWalletIcon(wallet: string): React.ReactNode {
  const walletIcons: Record<string, string> = {
    unisat: 'https://unisat.io/download/img/wallet-logo.svg',
    xverse: 'https://assets.website-files.com/63970776d6a2a1f18f96c9f0/63a12e0af5f2dea7182d3e7c_xverse-logo-circle.svg',
    okx: 'https://www.okx.com/cdn/assets/okx/web3/wallet/v3/download/icon-web.svg',
  };
  
  const iconUrl = walletIcons[wallet.toLowerCase()];
  
  if (iconUrl) {
    return <img src={iconUrl} alt={wallet} className="h-6 w-6" />;
  }
  
  return <WalletIcon className="h-6 w-6" />;
}

// Wrapper component that provides the LaserEyes context
export default function LaserEyesWalletConnector(props: LaserEyesWalletConnectorProps) {
  return (
    <LaserEyesProvider>
      <WalletConnector {...props} />
    </LaserEyesProvider>
  );
}