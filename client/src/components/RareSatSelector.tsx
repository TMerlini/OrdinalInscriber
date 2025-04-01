import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RefreshCw, Search, Filter } from "lucide-react";
import { RareSat, RareSatType, fetchRareSatsFromWallet, getRarityColor, getRarityBadgeColor } from '@/lib/rareSats';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface RareSatSelectorProps {
  onSelect: (satoshi: string) => void;
  selectedSatoshi?: string;
  batchMode?: boolean;
  batchFileCount?: number;
  onSelectMultiple?: (satoshis: string[]) => void;
  selectedSatoshis?: string[];
}

// Type to track sats with counts for duplicate selection
interface SatCount {
  satoshi: string;
  count: number;
}

// Group satoshis by rarity tier
type RarityGroup = {
  label: string;
  min: number;
  max: number;
  color: string;
};

const rarityGroups: RarityGroup[] = [
  { label: "Legendary", min: 10, max: 10, color: "text-purple-600 dark:text-purple-400" },
  { label: "Epic", min: 9, max: 9, color: "text-red-600 dark:text-red-400" },
  { label: "Very Rare", min: 8, max: 8, color: "text-orange-600 dark:text-orange-400" },
  { label: "Rare", min: 7, max: 7, color: "text-yellow-600 dark:text-yellow-400" },
  { label: "Uncommon", min: 5, max: 6, color: "text-teal-600 dark:text-teal-400" },
  { label: "Common", min: 1, max: 4, color: "text-green-600 dark:text-green-400" },
];

export default function RareSatSelector({ 
  onSelect, 
  selectedSatoshi,
  batchMode = false,
  batchFileCount = 0,
  onSelectMultiple,
  selectedSatoshis = []
}: RareSatSelectorProps) {
  // State with safe defaults
  const [rareSats, setRareSats] = useState<RareSat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  // State to track available satoshi numbers
  const [availableSatoshis, setAvailableSatoshis] = useState<Set<string>>(new Set());
  const [showOnlyAvailable, setShowOnlyAvailable] = useState<boolean>(false);
  const [multiSelectMode, setMultiSelectMode] = useState<boolean>(batchMode);


  // Get all rare sat types (from the system catalog, not just wallet)
  const getAllRareSatTypes = (): RareSat[] => {
    // Return all possible rare sat types from the RareSatType enum
    return Object.values(RareSatType).map(type => {
      // Create a placeholder rare sat for each type
      return {
        satoshi: "0", // Placeholder, will be replaced with real values for available sats
        type: type,
        rarity: getRarityForType(type),
        description: getDescriptionForType(type),
        available: false // Default to not available, will update with actual availability
      };
    }).filter(sat => sat.type !== RareSatType.COMMON); // Filter out COMMON as it's not "rare"
  };

  // Helper to get rarity score based on satoshi type
  const getRarityForType = (type: RareSatType): number => {
    // Map each type to its rarity level (1-10)
    const rarityMap: Record<RareSatType, number> = {
      [RareSatType.COMMON]: 3,
      [RareSatType.VINTAGE]: 4,
      [RareSatType.ASCII]: 4,
      [RareSatType.EVIL]: 5,
      [RareSatType.WHITE]: 5,
      [RareSatType.BINARY]: 5,
      [RareSatType.UNCOMMON]: 6,
      [RareSatType.REPEATING]: 6,
      [RareSatType.PRIME]: 6,
      [RareSatType.BLACK]: 6,
      [RareSatType.RARE]: 7,
      [RareSatType.PALINDROME]: 7,
      [RareSatType.SEQUENCE]: 7,
      [RareSatType.PIZZA]: 8,
      [RareSatType.ALPHA_MEGA]: 8,
      [RareSatType.RODARMOR]: 9,
      [RareSatType.BLOCK9]: 9,
      [RareSatType.BLOCK78]: 9,
      [RareSatType.EPIC]: 9,
      [RareSatType.FIRST]: 10,
      [RareSatType.LEGENDARY]: 10,
      [RareSatType.MYTHIC]: 10,
      [RareSatType.OMEGA]: 10
    };
    return rarityMap[type] || 3;
  };

  // Helper to get description for each type
  const getDescriptionForType = (type: RareSatType): string => {
    const descriptionMap: Record<RareSatType, string> = {
      [RareSatType.COMMON]: "Common satoshi",
      [RareSatType.VINTAGE]: "One of the first 100,000 satoshis ever created",
      [RareSatType.ASCII]: "A satoshi with an ASCII value (0-127)",
      [RareSatType.EVIL]: "An 'evil' satoshi with an even number of 1s in its binary representation",
      [RareSatType.WHITE]: "A 'white' satoshi with special numerical properties",
      [RareSatType.BINARY]: "A satoshi with a special binary pattern",
      [RareSatType.UNCOMMON]: "Satoshi with slightly rare properties",
      [RareSatType.REPEATING]: "A satoshi with repeating digits pattern",
      [RareSatType.PRIME]: "A prime number satoshi - divisible only by 1 and itself",
      [RareSatType.BLACK]: "A 'black' satoshi with special cycle properties",
      [RareSatType.RARE]: "Satoshi with uncommon properties",
      [RareSatType.PALINDROME]: "A palindrome satoshi that reads the same forwards and backwards",
      [RareSatType.SEQUENCE]: "A satoshi with sequential digits (ascending or descending)",
      [RareSatType.PIZZA]: "A satoshi from the famous Bitcoin pizza transaction",
      [RareSatType.ALPHA_MEGA]: "An Alpha or Omega satoshi - the first or last in a significant range",
      [RareSatType.RODARMOR]: "A special satoshi named after Casey Rodarmor, creator of Ordinals",
      [RareSatType.BLOCK9]: "A satoshi from Block 9, the first block that sent Bitcoin to another person",
      [RareSatType.BLOCK78]: "A satoshi from Block 78, which contained a special message from Satoshi Nakamoto",
      [RareSatType.EPIC]: "Satoshi with exceptional rarity",
      [RareSatType.FIRST]: "A satoshi from the genesis block, the very first Bitcoin block",
      [RareSatType.LEGENDARY]: "Extremely rare satoshi with unique qualities",
      [RareSatType.MYTHIC]: "Mythical satoshi with historical significance",
      [RareSatType.OMEGA]: "The last satoshi in a significant range"
    };
    return descriptionMap[type] || `${type} satoshi`;
  };

  // Load rare sats with comprehensive error handling
  const loadRareSats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch rare sats from wallet (these are the ones user actually owns)
      const availableResults = await fetchRareSatsFromWallet();

      if (Array.isArray(availableResults)) {
        // Create a set of available satoshi types for quick lookup
        const availableTypes = new Set(availableResults.map(sat => sat.type));
        setAvailableSatoshis(new Set(availableResults.map(sat => sat.satoshi)));

        // Get all possible rare sat types 
        const allRareSatTypes = getAllRareSatTypes();

        // Mark which types are available in the user's wallet
        const combinedSatTypes = allRareSatTypes.map(sat => ({
          ...sat,
          available: availableTypes.has(sat.type)
        }));

        // Mark each sat with availability status
        const satsWithAvailability = allRareSatTypes.map(sat => ({
          ...sat,
          available: availableSatoshis.has(sat.satoshi)
        }));
        setRareSats(satsWithAvailability);
      } else {
        console.error('Invalid response format:', availableResults);
        setError('Failed to load rare sats. Please try again.');
      }
    } catch (err) {
      console.error('Error loading rare sats:', err);
      setError('Failed to load rare sats. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Refresh handler with additional error protection
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadRareSats();
    } catch (err) {
      console.error('Error in refresh handler:', err);
      try {
        setError('Failed to refresh rare sats. Please try again later.');
      } catch (stateErr) {}
    } finally {
      try {
        setRefreshing(false);
      } catch (stateErr) {}
    }
  };

  // Load on component mount
  useEffect(() => {
    try {
      loadRareSats();
    } catch (err) {
      console.error('Error in initial load effect:', err);
    }

    // Cleanup function
    return () => {
      // Any cleanup if needed
    };
  }, []);

  // Helper to count satoshi occurrences in the selected array
  const getSatoshiCount = (satoshi: string): number => {
    if (!selectedSatoshis || !Array.isArray(selectedSatoshis)) return 0;
    return selectedSatoshis.filter(s => s === satoshi).length;
  };

  // Add a function to toggle a satoshi in the multi-selection with support for duplicates
  const handleToggleMultiSelect = (satoshi: string, selected: boolean) => {
    try {
      if (!onSelectMultiple || !selectedSatoshis) return;
      
      let newSelectedSatoshis: string[];
      if (selected) {
        // If the number of selected satoshis is already equal to the number of files, 
        // we need to replace the oldest selection
        if (selectedSatoshis.length >= batchFileCount) {
          // Remove the oldest sat and add the new one
          newSelectedSatoshis = [...selectedSatoshis.slice(1), satoshi];
        } else {
          // Simply add the sat to the array (this allows duplicates)
          newSelectedSatoshis = [...selectedSatoshis, satoshi];
        }
      } else {
        // Remove only one instance of the sat from selections
        const index = selectedSatoshis.indexOf(satoshi);
        if (index !== -1) {
          newSelectedSatoshis = [
            ...selectedSatoshis.slice(0, index),
            ...selectedSatoshis.slice(index + 1)
          ];
        } else {
          newSelectedSatoshis = [...selectedSatoshis];
        }
      }
      
      onSelectMultiple(newSelectedSatoshis);
    } catch (err) {
      console.log('Error in multi sat selection:', err);
    }
  };

  const handleSelectSat = (satoshi: string) => {
    try {
      // If in batch mode with multi-select, handle differently
      if (multiSelectMode && onSelectMultiple) {
        // Always allow adding duplicate selections - this allows the same 
        // satoshi (like Pizza sats) to be used multiple times
        handleToggleMultiSelect(satoshi, true);
      } else {
        onSelect(satoshi);
      }
    } catch (err) {
      console.log('Error in satoshi selection:', err);
    }
  };

  // Get rarity description based on rarity level
  const getRarityLabel = (rarity: number): string => {
    switch (rarity) {
      case 10: return 'Legendary';
      case 9: return 'Epic';
      case 8: return 'Very Rare';
      case 7: return 'Rare';
      case 6: return 'Uncommon';
      case 5: return 'Somewhat Uncommon';
      case 4: return 'Vintage';
      case 3: return 'Common';
      default: return 'Regular';
    }
  };

  // Filter sats based on search query and active tab
  const filteredSats = useMemo(() => {
    try {
      // Ensure rareSats is an array
      let filtered = Array.isArray(rareSats) ? rareSats : [];

      // Apply search filter if query exists
      if (searchQuery && searchQuery.trim()) {
        try {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(sat => {
            try {
              // Safely check each property with null checks
              const satoshiMatch = sat?.satoshi?.toLowerCase?.()?.includes?.(query) || false;
              const typeMatch = sat?.type?.toLowerCase?.()?.includes?.(query) || false;
              const descMatch = sat?.description?.toLowerCase?.()?.includes?.(query) || false;
              return satoshiMatch || typeMatch || descMatch;
            } catch (err) {
              console.log('Error filtering individual sat:', err);
              return false; // Skip problematic items
            }
          });
        } catch (searchErr) {
          console.log('Error in search filtering:', searchErr);
          // Fall back to unfiltered array
        }
      }

      // Apply tab filter if not "all"
      if (activeTab && activeTab !== 'all') {
        try {
          const groupIndex = parseInt(activeTab);
          if (!isNaN(groupIndex) && rarityGroups[groupIndex]) {
            const group = rarityGroups[groupIndex];
            filtered = filtered.filter(sat => {
              try {
                return typeof sat?.rarity === 'number' &&
                  sat.rarity >= group.min &&
                  sat.rarity <= group.max;
              } catch (err) {
                console.log('Error filtering sat by rarity:', err);
                return false; // Skip problematic items
              }
            });
          }
        } catch (tabErr) {
          console.log('Error in tab filtering:', tabErr);
          // Fall back to search-filtered array
        }
      }

      // Apply availability filter
      if (showOnlyAvailable) {
        filtered = filtered.filter(sat => sat.available);
      }

      return filtered;
    } catch (err) {
      console.log('Fatal error in filteredSats useMemo:', err);
      return []; // Return empty array as last resort
    }
  }, [rareSats, searchQuery, activeTab, showOnlyAvailable]);

  // Group counts for the tabs
  const groupCounts = useMemo(() => {
    try {
      // Ensure rareSats is an array
      const sats = Array.isArray(rareSats) ? rareSats : [];

      return rarityGroups.map((group, index) => {
        try {
          return sats.filter(sat => {
            try {
              return typeof sat?.rarity === 'number' &&
                sat.rarity >= group.min &&
                sat.rarity <= group.max;
            } catch (err) {
              console.log('Error counting sats in group:', err);
              return false;
            }
          }).length;
        } catch (err) {
          console.log(`Error counting group ${index}:`, err);
          return 0; // Return 0 for problematic groups
        }
      });
    } catch (err) {
      console.log('Fatal error in groupCounts useMemo:', err);
      // Return an array of zeros matching the group count
      return rarityGroups.map(() => 0);
    }
  }, [rareSats]);

  const totalCount = rareSats.length;

  try {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-orange-800 dark:text-orange-400">Rare Sats</h3>
          <div className="flex items-center space-x-2">
            <div className="flex items-center mr-2">
              <Switch
                id="show-available-only"
                checked={showOnlyAvailable}
                onCheckedChange={setShowOnlyAvailable}
                className="mr-2"
              />
              <Label htmlFor="show-available-only" className="text-xs text-orange-700 dark:text-orange-300">
                Show Available Only
              </Label>
            </div>
            {batchMode && (
              <div className="flex items-center mr-2">
                <Switch
                  id="multi-select-mode"
                  checked={multiSelectMode}
                  onCheckedChange={setMultiSelectMode}
                  className="mr-2"
                />
                <Label htmlFor="multi-select-mode" className="text-xs text-orange-700 dark:text-orange-300">
                  Multi-Select Mode {multiSelectMode && selectedSatoshis && `(${selectedSatoshis.length}/${batchFileCount})`}
                </Label>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className="text-sm"
            >
              {refreshing ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Refresh
                </>
              )}
            </Button>
          </div>

        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        ) : error ? (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 text-sm">
            {error}
          </div>
        ) : !Array.isArray(rareSats) || rareSats.length === 0 ? (
          <div className="p-4 rounded-lg bg-orange-50 dark:bg-navy-800 text-orange-800 dark:text-orange-300 text-sm">
            No rare sats found in your wallet. Refresh to check again or add some rare sats to your wallet.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-orange-500 dark:text-orange-400" />
              <Input
                placeholder="Search by sat number, type, or description..."
                className="pl-8 text-sm border-orange-200 dark:border-orange-800/40"
                value={searchQuery}
                onChange={(e) => {
                  try {
                    setSearchQuery(e.target.value);
                  } catch (err) {
                    console.log('Error setting search query:', err);
                  }
                }}
              />
            </div>

            <Tabs
              defaultValue="all"
              value={activeTab}
              onValueChange={(value) => {
                try {
                  setActiveTab(value);
                } catch (err) {
                  console.log('Error setting active tab:', err);
                }
              }}
            >
              <TabsList className="w-full grid grid-cols-7 h-auto">
                <TabsTrigger value="all" className="text-xs py-1">
                  All ({totalCount})
                </TabsTrigger>
                {rarityGroups.map((group, index) => {
                  try {
                    return (
                      <TabsTrigger
                        key={group.label}
                        value={index.toString()}
                        className="text-xs py-1"
                        disabled={groupCounts && groupCounts[index] === 0}
                      >
                        <span className={groupCounts && groupCounts[index] > 0 ? group.color : ''}>
                          {group.label.split(' ')[0]} ({groupCounts && groupCounts[index] || 0})
                        </span>
                      </TabsTrigger>
                    );
                  } catch (err) {
                    console.log(`Error rendering group tab ${index}:`, err);
                    return null; // Skip rendering problematic tab
                  }
                })}
              </TabsList>

              <TabsContent value="all" className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Array.isArray(filteredSats) && filteredSats.length > 0 ? (
                    filteredSats.map((sat) => {
                      try {
                        if (!sat || !sat.satoshi) return null;
                        return (
                          <SatCard
                            key={sat.satoshi}
                            sat={sat}
                            selected={multiSelectMode ? selectedSatoshis?.includes(sat.satoshi) : selectedSatoshi === sat.satoshi}
                            onSelect={handleSelectSat}
                            getRarityLabel={getRarityLabel}
                            isAvailable={sat.available}
                            multiSelectMode={multiSelectMode}
                            inMultiSelection={selectedSatoshis?.includes(sat.satoshi)}
                            onToggleMultiSelect={handleToggleMultiSelect}
                            selectedSatoshis={selectedSatoshis}
                          />
                        );
                      } catch (err) {
                        console.log('Error rendering sat card:', err);
                        return null; // Skip rendering problematic card
                      }
                    })
                  ) : (
                    <div className="col-span-full p-4 text-center text-sm text-gray-500">
                      No satoshis match your search.
                    </div>
                  )}
                  {Array.isArray(filteredSats) && filteredSats.filter(sat => sat.available).length === 0 && (
                    <div className="col-span-full p-4 text-center text-sm text-gray-500">
                      No rare sats available in your wallet. All types are shown but grayed out.
                    </div>
                  )}
                </div>
              </TabsContent>

              {rarityGroups.map((group, index) => {
                try {
                  return (
                    <TabsContent key={index} value={index.toString()} className="mt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {Array.isArray(filteredSats) && filteredSats.length > 0 ? (
                          filteredSats.map((sat) => {
                            try {
                              if (!sat || !sat.satoshi) return null;
                              return (
                                <SatCard
                                  key={sat.satoshi}
                                  sat={sat}
                                  selected={multiSelectMode ? selectedSatoshis?.includes(sat.satoshi) : selectedSatoshi === sat.satoshi}
                                  onSelect={handleSelectSat}
                                  getRarityLabel={getRarityLabel}
                                  isAvailable={sat.available}
                                  multiSelectMode={multiSelectMode}
                                  inMultiSelection={selectedSatoshis?.includes(sat.satoshi)}
                                  onToggleMultiSelect={handleToggleMultiSelect}
                                  selectedSatoshis={selectedSatoshis}
                                />
                              );
                            } catch (err) {
                              console.log('Error rendering sat card in tab:', err);
                              return null; // Skip rendering problematic card
                            }
                          })
                        ) : (
                          <div className="col-span-full p-4 text-center text-sm text-gray-500">
                            No satoshis match your search in this category.
                          </div>
                        )}
                        {Array.isArray(filteredSats) && filteredSats.filter(sat => sat.available).length === 0 && (
                          <div className="col-span-full p-4 text-center text-sm text-gray-500">
                            No rare sats available in your wallet. All types are shown but grayed out.
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  );
                } catch (err) {
                  console.log(`Error rendering tab content ${index}:`, err);
                  return null; // Skip rendering problematic tab content
                }
              })}
            </Tabs>
          </div>
        )}
      </div>
    );
  } catch (err) {
    console.log('Fatal error in RareSatSelector render:', err);
    // Fallback UI in case the entire component crashes
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-orange-800 dark:text-orange-400">Rare Sats</h3>
        </div>
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 text-sm">
          There was an error loading the rare sats selector. Please refresh the page and try again.
        </div>
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
          className="w-full"
        >
          Refresh Page
        </Button>
      </div>
    );
  }
}

// Extracted Sat Card component for reuse
function SatCard({
  sat,
  selected,
  onSelect,
  getRarityLabel,
  isAvailable = true,
  multiSelectMode = false,
  inMultiSelection = false,
  onToggleMultiSelect,
  selectedSatoshis = []
}: {
  sat: RareSat,
  selected: boolean,
  onSelect: (satoshi: string) => void,
  getRarityLabel: (rarity: number) => string,
  isAvailable?: boolean,
  multiSelectMode?: boolean,
  inMultiSelection?: boolean,
  onToggleMultiSelect?: (satoshi: string, selected: boolean) => void,
  selectedSatoshis?: string[]
}) {
  // Calculate selection count for this satoshi (how many times it appears in the selection array)
  const selectionCount = selectedSatoshis.filter(s => s === sat.satoshi).length;
  // Safe click handler with error handling
  const handleClick = () => {
    try {
      if (!sat || !sat.satoshi || !isAvailable) return;
      
      if (multiSelectMode && onToggleMultiSelect) {
        // In multi-select mode, always add to selection when clicked
        // The parent will handle managing whether to replace oldest selection
        onSelect(sat.satoshi);
      } else {
        onSelect(sat.satoshi);
      }
    } catch (err) {
      console.log('Error in sat card click:', err);
    }
  };

  // Safely get card color classes with fallbacks
  const getSelectedClasses = () => {
    try {
      return selected
        ? 'border-orange-500 dark:border-orange-400 bg-orange-50 dark:bg-navy-700/80'
        : '';
    } catch (err) {
      console.log('Error in getSelectedClasses:', err);
      return '';
    }
  };

  // Safely get badge color with error handling
  const getBadgeClass = () => {
    try {
      if (sat && typeof sat.rarity === 'number') {
        return getRarityBadgeColor(sat.rarity);
      }
      return '';
    } catch (err) {
      console.log('Error in getBadgeClass:', err);
      return '';
    }
  };

  // Safely get description color with error handling
  const getDescriptionClass = () => {
    try {
      if (sat && typeof sat.rarity === 'number') {
        return `text-xs ${getRarityColor(sat.rarity)}`;
      }
      return 'text-xs';
    } catch (err) {
      console.log('Error in getDescriptionClass:', err);
      return 'text-xs';
    }
  };

  // Safely get label text with error handling
  const getLabel = () => {
    try {
      if (sat && typeof sat.rarity === 'number') {
        return getRarityLabel(sat.rarity);
      }
      return 'Unknown';
    } catch (err) {
      console.log('Error in getLabel:', err);
      return 'Unknown';
    }
  };

  // Render with fallbacks for all values
  try {
    return (
      <Card
        className={`cursor-pointer hover:border-orange-300 dark:hover:border-orange-600 transition-colors 
          ${multiSelectMode && inMultiSelection ? 
            `bg-green-50 dark:bg-green-900/20 border-green-600 dark:border-green-500 ring-2 
             ${selectionCount > 1 ? 'ring-yellow-500 dark:ring-yellow-600' : 'ring-green-500 dark:ring-green-600'} 
             ring-opacity-50` 
            : getSelectedClasses()} 
          ${!isAvailable ? 'opacity-50 cursor-not-allowed' : 'border-2 border-green-300 dark:border-green-600'}`}
        onClick={handleClick}
      >
        <CardHeader className="p-3 pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Sat #{sat?.satoshi || 'Unknown'}
            </CardTitle>
            <Badge className={getBadgeClass()}>
              {sat?.type || 'Unknown'}
            </Badge>
          </div>
          <CardDescription className={getDescriptionClass()}>
            {getLabel()} • {sat?.description || 'No description available'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 pt-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {selected || (multiSelectMode && inMultiSelection) ? 'Selected for inscription' : 'Click to select'}
            </span>
            {isAvailable && (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-xs">
                Available
              </Badge>
            )}
            {multiSelectMode && inMultiSelection && (
              <Badge className={`${selectionCount > 1 ? 'bg-yellow-500' : 'bg-green-500'} text-white text-xs`}>
                {selectionCount > 1 ? 
                  `Selected x${selectionCount}` : 
                  `Selected #${selectedSatoshis?.indexOf(sat.satoshi) + 1}`}
              </Badge>
            )}
            {!multiSelectMode && selected && (
              <Badge variant="outline" className="text-xs border-orange-300 dark:border-orange-700">
                Selected
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  } catch (err) {
    // Ultimate fallback in case the card rendering fails
    console.log('Error rendering SatCard:', err);
    return (
      <Card className="cursor-pointer border-red-300">
        <CardHeader className="p-3">
          <CardTitle className="text-sm">Error displaying sat</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <span className="text-xs text-gray-500">Click to try selecting</span>
        </CardContent>
      </Card>
    );
  }
}