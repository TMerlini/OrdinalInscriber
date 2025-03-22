import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, RefreshCw } from "lucide-react";
import { RareSat, RareSatType, fetchRareSatsFromWallet, getRarityColor, getRarityBadgeColor } from '@/lib/rareSats';

interface RareSatSelectorProps {
  onSelect: (satoshi: string) => void;
  selectedSatoshi?: string;
}

export default function RareSatSelector({ onSelect, selectedSatoshi }: RareSatSelectorProps) {
  const [rareSats, setRareSats] = useState<RareSat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <div className="grid gap-3">
          {rareSats.map((sat) => (
            <Card 
              key={sat.satoshi} 
              className={`cursor-pointer hover:border-orange-300 dark:hover:border-orange-600 transition-colors ${
                selectedSatoshi === sat.satoshi 
                  ? 'border-orange-500 dark:border-orange-400 bg-orange-50 dark:bg-navy-700/80' 
                  : ''
              }`}
              onClick={() => handleSelectSat(sat.satoshi)}
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
                    {selectedSatoshi === sat.satoshi ? 'Selected for inscription' : 'Click to select'}
                  </span>
                  {selectedSatoshi === sat.satoshi && (
                    <Badge variant="outline" className="text-xs border-orange-300 dark:border-orange-700">
                      Selected
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}