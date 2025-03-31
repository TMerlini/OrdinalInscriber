import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RefreshCw, Search, Filter } from "lucide-react";
import { RareSat, RareSatType, fetchRareSatsFromWallet, getRarityColor, getRarityBadgeColor } from '@/lib/rareSats';

interface RareSatSelectorProps {
  onSelect: (satoshi: string) => void;
  selectedSatoshi?: string;
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

export default function RareSatSelector({ onSelect, selectedSatoshi }: RareSatSelectorProps) {
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


  // Simulate fetching all rare sat types -  REPLACE THIS WITH ACTUAL IMPLEMENTATION
  const getAllRareSatTypes = (): RareSat[] => {
    //Example data - replace with your actual data fetching logic
    return [
      { satoshi: "123", type: "TypeA", rarity: 7, description: "Description A", available: true },
      { satoshi: "456", type: "TypeB", rarity: 9, description: "Description B", available: false },
      { satoshi: "789", type: "TypeA", rarity: 5, description: "Description C", available: true },
      { satoshi: "101", type: "TypeC", rarity: 10, description: "Description D", available: false },
    ];
  };

  // Load rare sats with comprehensive error handling
  const loadRareSats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch rare sats from wallet (these are the ones user actually owns)
      const availableResults = await fetchRareSatsFromWallet();

      if (Array.isArray(availableResults)) {
        // Create a set of available satoshi numbers for quick lookup
        const availableSet = new Set(availableResults.map(sat => sat.satoshi));
        setAvailableSatoshis(availableSet);

        // Get all possible rare sat types (from the system, not just wallet)
        const allRareSatTypes = getAllRareSatTypes();

        // Mark each sat with availability status
        const satsWithAvailability = allRareSatTypes.map(sat => ({
          ...sat,
          available: availableSet.has(sat.satoshi)
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

  const handleSelectSat = (satoshi: string) => {
    try {
      onSelect(satoshi);
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
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                try {
                  e.preventDefault();
                  handleRefresh();
                } catch (err) {
                  console.log('Error in refresh button click:', err);
                }
              }}
              disabled={loading || refreshing}
              className="text-xs"
            >
              {refreshing ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Refreshing
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Refresh
                </>
              )}
            </Button>
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={showOnlyAvailable} onChange={(e) => setShowOnlyAvailable(e.target.checked)} />
              Show Only Available
            </label>
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
                <div className="grid gap-3">
                  {Array.isArray(filteredSats) && filteredSats.length > 0 ? (
                    filteredSats.map((sat) => {
                      try {
                        if (!sat || !sat.satoshi) return null;
                        return (
                          <SatCard
                            key={sat.satoshi}
                            sat={sat}
                            selected={selectedSatoshi === sat.satoshi}
                            onSelect={handleSelectSat}
                            getRarityLabel={getRarityLabel}
                          />
                        );
                      } catch (err) {
                        console.log('Error rendering sat card:', err);
                        return null; // Skip rendering problematic card
                      }
                    })
                  ) : (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No satoshis match your search.
                    </div>
                  )}
                </div>
              </TabsContent>

              {rarityGroups.map((group, index) => {
                try {
                  return (
                    <TabsContent key={index} value={index.toString()} className="mt-4">
                      <div className="grid gap-3">
                        {Array.isArray(filteredSats) && filteredSats.length > 0 ? (
                          filteredSats.map((sat) => {
                            try {
                              if (!sat || !sat.satoshi) return null;
                              return (
                                <SatCard
                                  key={sat.satoshi}
                                  sat={sat}
                                  selected={selectedSatoshi === sat.satoshi}
                                  onSelect={handleSelectSat}
                                  getRarityLabel={getRarityLabel}
                                />
                              );
                            } catch (err) {
                              console.log('Error rendering sat card in tab:', err);
                              return null; // Skip rendering problematic card
                            }
                          })
                        ) : (
                          <div className="p-4 text-center text-sm text-gray-500">
                            No satoshis match your search in this category.
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
  getRarityLabel
}: {
  sat: RareSat,
  selected: boolean,
  onSelect: (satoshi: string) => void,
  getRarityLabel: (rarity: number) => string
}) {
  // Safe click handler with error handling
  const handleClick = () => {
    try {
      if (sat && sat.satoshi) {
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
        className={`cursor-pointer hover:border-orange-300 dark:hover:border-orange-600 transition-colors ${getSelectedClasses()} ${sat.available ? '' : 'opacity-50'}`} // Highlight available sats
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
              {selected ? 'Selected for inscription' : 'Click to select'}
            </span>
            {selected && (
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