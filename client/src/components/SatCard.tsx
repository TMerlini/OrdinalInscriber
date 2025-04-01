import React from 'react';
import { RareSat } from '../lib/rareSats';
import { cn } from "@/lib/utils";

interface SatCardProps {
  sat: RareSat;
  selected: boolean;
  onSelect: (satoshi: string) => void;
  getRarityLabel: (rarity: number) => string;
  isAvailable?: boolean;
  multiSelectMode?: boolean;
  inMultiSelection?: boolean;
  onToggleMultiSelect?: (satoshi: string, selected: boolean) => void;
}

const SatCard: React.FC<SatCardProps> = ({ 
  sat, 
  selected, 
  onSelect, 
  getRarityLabel,
  isAvailable = true,
  multiSelectMode = false,
  inMultiSelection = false,
  onToggleMultiSelect
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

  // Determine style based on availability and selection state
  const cardStyle = cn(
    "relative p-3 rounded-lg border transition-all",
    selected && "bg-green-50 dark:bg-green-900/20 border-green-600 dark:border-green-500 ring-2 ring-green-500 dark:ring-green-600 ring-opacity-50",
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


  // Handle click based on selection mode
  const handleClick = () => {
    if (!isAvailable) return;
    
    if (multiSelectMode && onToggleMultiSelect) {
      onToggleMultiSelect(sat.satoshi, !inMultiSelection);
    } else {
      onSelect(sat.satoshi);
    }
  };

  return (
    <div 
      onClick={handleClick}
      className={cardStyle}
    >
      {!isAvailable && (
        <div className="absolute top-2 right-2 bg-gray-200 dark:bg-gray-700 text-xs px-2 py-0.5 rounded-full">
          Unavailable
        </div>
      )}
      {multiSelectMode && inMultiSelection && (
        <div className="absolute top-2 right-2 bg-green-500 text-white text-xs p-1 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
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