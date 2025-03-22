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
  const [rareSats, setRareSats] = useState<RareSat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const loadRareSats = async () => {
    try {
      setLoading(true);
      setError(null);
      const sats = await fetchRareSatsFromWallet();
      setRareSats(sats);
    } catch (err) {
      setError('Failed to load rare sats from wallet. Please ensure your wallet is synced and try again.');
      console.error('Error fetching rare sats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRareSats();
    setRefreshing(false);
  };

  useEffect(() => {
    loadRareSats();
  }, []);

  const handleSelectSat = (satoshi: string) => {
    onSelect(satoshi);
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
    let filtered = rareSats;
    
    // Apply search filter if query exists
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(sat => 
        sat.satoshi.toLowerCase().includes(query) || 
        sat.type.toLowerCase().includes(query) ||
        sat.description.toLowerCase().includes(query)
      );
    }
    
    // Apply tab filter if not "all"
    if (activeTab !== 'all') {
      const groupIndex = parseInt(activeTab);
      const group = rarityGroups[groupIndex];
      filtered = filtered.filter(sat => 
        sat.rarity >= group.min && sat.rarity <= group.max
      );
    }
    
    return filtered;
  }, [rareSats, searchQuery, activeTab]);
  
  // Group counts for the tabs
  const groupCounts = useMemo(() => {
    return rarityGroups.map((group, index) => {
      return rareSats.filter(sat => 
        sat.rarity >= group.min && sat.rarity <= group.max
      ).length;
    });
  }, [rareSats]);
  
  const totalCount = rareSats.length;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-orange-800 dark:text-orange-400">Rare Sats</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh} 
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
      ) : rareSats.length === 0 ? (
        <div className="p-4 rounded-lg bg-orange-50 dark:bg-navy-800 text-orange-800 dark:text-orange-300 text-sm">
          No rare sats found in your wallet. Refresh to check again or add some rare sats to your wallet.
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-orange-500 dark:text-orange-400"/>
            <Input
              placeholder="Search by sat number, type, or description..."
              className="pl-8 text-sm border-orange-200 dark:border-orange-800/40"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-7 h-auto">
              <TabsTrigger value="all" className="text-xs py-1">
                All ({totalCount})
              </TabsTrigger>
              {rarityGroups.map((group, index) => (
                <TabsTrigger 
                  key={group.label} 
                  value={index.toString()}
                  className="text-xs py-1"
                  disabled={groupCounts[index] === 0}
                >
                  <span className={groupCounts[index] > 0 ? group.color : ''}>
                    {group.label.split(' ')[0]} ({groupCounts[index]})
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
            
            <TabsContent value="all" className="mt-4">
              <div className="grid gap-3">
                {filteredSats.length > 0 ? (
                  filteredSats.map((sat) => (
                    <SatCard 
                      key={sat.satoshi}
                      sat={sat}
                      selected={selectedSatoshi === sat.satoshi}
                      onSelect={handleSelectSat}
                      getRarityLabel={getRarityLabel}
                    />
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-gray-500">
                    No satoshis match your search.
                  </div>
                )}
              </div>
            </TabsContent>
            
            {rarityGroups.map((group, index) => (
              <TabsContent key={index} value={index.toString()} className="mt-4">
                <div className="grid gap-3">
                  {filteredSats.length > 0 ? (
                    filteredSats.map((sat) => (
                      <SatCard 
                        key={sat.satoshi}
                        sat={sat}
                        selected={selectedSatoshi === sat.satoshi}
                        onSelect={handleSelectSat}
                        getRarityLabel={getRarityLabel}
                      />
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No satoshis match your search in this category.
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </>
      )}
    </div>
  );
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
  return (
    <Card 
      key={sat.satoshi} 
      className={`cursor-pointer hover:border-orange-300 dark:hover:border-orange-600 transition-colors ${
        selected 
          ? 'border-orange-500 dark:border-orange-400 bg-orange-50 dark:bg-navy-700/80' 
          : ''
      }`}
      onClick={() => onSelect(sat.satoshi)}
    >
      <CardHeader className="p-3 pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Sat #{sat.satoshi}
          </CardTitle>
          <Badge className={`${getRarityBadgeColor(sat.rarity)}`}>
            {sat.type}
          </Badge>
        </div>
        <CardDescription className={`text-xs ${getRarityColor(sat.rarity)}`}>
          {getRarityLabel(sat.rarity)} • {sat.description}
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
}