import React from 'react';
import { RareSat } from '../lib/rareSats';
import { cn } from "@/lib/utils";

interface SatCardProps {
  sat: RareSat;
  selected: boolean;
  onSelect: (satoshi: string) => void;
  getRarityLabel: (rarity: number) => string;
  isAvailable?: boolean;
}

const SatCard: React.FC<SatCardProps> = ({ 
  sat, 
  selected, 
  onSelect, 
  getRarityLabel,
  isAvailable = true 
}) => {
  const rarityLabel = getRarityLabel(sat.rarity);

  // Get color based on rarity
  const getRarityColor = (rarity: number): string => {
    switch (rarity) {
      case 10: return 'text-purple-600 dark:text-purple-400';
      case 9: return 'text-red-600 dark:text-red-400';
      case 8: return 'text-orange-600 dark:text-orange-400';
      case 7: return 'text-yellow-600 dark:text-yellow-400';
      case 6: 
      case 5: return 'text-teal-600 dark:text-teal-400';
      default: return 'text-green-600 dark:text-green-400';
    }
  };

  // Determine style based on availability
  const cardStyle = cn(
    "relative p-3 rounded-lg border transition-all",
    isAvailable 
      ? "border-green-500 dark:border-green-600 hover:shadow-lg hover:shadow-green-200 dark:hover:shadow-green-900/30 cursor-pointer" 
      : "opacity-70 border border-gray-200 dark:border-gray-800 cursor-not-allowed",
  );

    // Get badge color based on rarity
  const getRarityBadgeColor = (rarity: number) => {
    if (rarity >= 10) return "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300";
    if (rarity >= 9) return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300";
    if (rarity >= 8) return "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300";
    if (rarity >= 7) return "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300";
    if (rarity >= 6) return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300";
    if (rarity >= 5) return "bg-lime-100 dark:bg-lime-900/30 text-lime-800 dark:text-lime-300";
    return "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300";
  };


  return (
    <div 
      onClick={() => isAvailable && onSelect(sat.satoshi)}
      className={cardStyle}
    >
      {!isAvailable && (
        <div className="absolute top-2 right-2 bg-gray-200 dark:bg-gray-700 text-xs px-2 py-0.5 rounded-full">
          Unavailable
        </div>
      )}
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-sm font-semibold">{sat.satoshi}</div>
          <div className={`text-xs font-medium ${getRarityColor(sat.rarity)}`}>
            {sat.type}
          </div>
        </div>
        <div className={`text-xs font-medium px-2 py-0.5 rounded-full ${getRarityBadgeColor(sat.rarity)}`}>
          {rarityLabel}
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
        {sat.description}
      </p>
    </div>
  );
};

export default SatCard;