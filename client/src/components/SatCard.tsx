
import React from 'react';
import { RareSat } from '../lib/rareSats';

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

  return (
    <div 
      onClick={() => isAvailable && onSelect(sat.satoshi)}
      className={`
        relative p-3 rounded-lg border transition-all
        ${selected ? 'border-orange-500 dark:border-orange-400 bg-orange-50 dark:bg-orange-900/20' : 'border-gray-200 dark:border-gray-800'}
        ${isAvailable 
          ? 'cursor-pointer hover:border-orange-300 dark:hover:border-orange-600 hover:shadow-sm' 
          : 'opacity-60 cursor-not-allowed'
        }
      `}
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
        <div className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">
          {rarityLabel}
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
        {sat.description}
      </p>
    </div>
  );
};

export default SatCard;
