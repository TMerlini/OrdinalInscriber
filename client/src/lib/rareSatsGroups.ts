
import { RareSatType } from './rareSats';

// Define the rarity tiers with their associated satoshi types
export const rareSatGroups = {
  // Rarity level 10 - Legendary
  legendary: [
    RareSatType.FIRST,
    RareSatType.LEGENDARY,
    RareSatType.MYTHIC
  ],

  // Rarity level 9 - Epic
  epic: [
    RareSatType.EPIC,
    RareSatType.RODARMOR,
    RareSatType.BLOCK9,
    RareSatType.BLOCK78
  ],

  // Rarity level 8 - Very Rare
  veryRare: [
    RareSatType.PIZZA,
    RareSatType.ALPHA_MEGA
  ],

  // Rarity level 7 - Rare
  rare: [
    RareSatType.RARE,
    RareSatType.PALINDROME,
    RareSatType.SEQUENCE
  ],

  // Rarity level 6 - Uncommon
  uncommon: [
    RareSatType.UNCOMMON,
    RareSatType.REPEATING,
    RareSatType.PRIME,
    RareSatType.BLACK
  ],

  // Rarity level 5 - Somewhat Uncommon
  somewhatUncommon: [
    RareSatType.EVIL,
    RareSatType.WHITE,
    RareSatType.BINARY
  ],

  // Rarity level 4 - Vintage
  vintage: [
    RareSatType.VINTAGE,
    RareSatType.ASCII
  ],

  // Rarity level 3 and below - Common
  common: [
    RareSatType.COMMON
  ]
};

// Helper function to get the rarity tier of a sat type
export function getRarityTier(satType: RareSatType): string {
  for (const [tier, types] of Object.entries(rareSatGroups)) {
    if (types.includes(satType)) {
      return tier;
    }
  }
  return 'common'; // Default fallback
}

// Get all sat types from a specific rarity tier
export function getSatTypesByTier(tier: string): RareSatType[] {
  return rareSatGroups[tier as keyof typeof rareSatGroups] || [];
}

// Get display names for tiers
export function getTierDisplayName(tier: string): string {
  const displayNames: Record<string, string> = {
    legendary: 'Legendary',
    epic: 'Epic',
    veryRare: 'Very Rare',
    rare: 'Rare',
    uncommon: 'Uncommon',
    somewhatUncommon: 'Somewhat Uncommon',
    vintage: 'Vintage',
    common: 'Common'
  };
  
  return displayNames[tier] || tier.charAt(0).toUpperCase() + tier.slice(1);
}
