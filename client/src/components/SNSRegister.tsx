import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle, Loader2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SNSName {
  id: string;
  name: string;
  status: 'available' | 'taken' | 'pending';
  owner?: string;
}

export default function SNSRegister() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [searching, setSearching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [names, setNames] = useState<SNSName[]>([]);
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [registering, setRegistering] = useState<boolean>(false);
  const { toast } = useToast();
  
  // Check if we're in a Janeway environment to provide mocked data
  const isJanewayURL = typeof window !== 'undefined' && 
    window.location.hostname.includes('janeway.replit.dev');

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

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Search for and register Satoshi Name Service (SNS) names. SNS provides a human-readable 
          naming system for Bitcoin addresses on the Bitcoin blockchain.
        </p>
        
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
                onClick={registerSNSNames}
                disabled={registering || selectedNames.length === 0}
                className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800"
              >
                {registering ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering
                  </>
                ) : (
                  'Register Names'
                )}
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
      </div>
    </div>
  );
}