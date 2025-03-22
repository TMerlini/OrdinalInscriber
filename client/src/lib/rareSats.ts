// Types of rare sats as defined in the Ordinals guide
export enum RareSatType {
  COMMON = 'Common',
  VINTAGE = 'Vintage',
  UNCOMMON = 'Uncommon',
  MYTHIC = 'Mythic',
  LEGENDARY = 'Legendary',
  EPIC = 'Epic',
  RARE = 'Rare',
  BLACK = 'Black',
  WHITE = 'White',
  PALINDROME = 'Palindrome',
  PIZZA = 'Pizza',
  BLOCK9 = 'Block9'
}

export interface RareSat {
  satoshi: string;  // The satoshi number/identifier
  type: RareSatType;
  description: string;
  rarity: number;   // 1-10 scale, 10 being the rarest
}

// Utility functions to check if a sat is rare
function isVintage(satNumber: number): boolean {
  return satNumber < 100000; // First 100,000 sats
}

function isUncommon(satNumber: number): boolean {
  return satNumber < 1000000; // First million sats
}

function isBlack(satNumber: number): boolean {
  // Cycle through the first 10,080 blocks
  return satNumber % 5000 === 0; 
}

function isWhite(satNumber: number): boolean {
  // Criteria for white sats
  return satNumber % 2100 === 0;
}

function isPalindrome(satNumber: number): boolean {
  const str = satNumber.toString();
  return str === str.split('').reverse().join('') && str.length > 1;
}

function isPizza(satNumber: number): boolean {
  // Sats from the first pizza transaction block (around block 57043)
  const startRange = 2850000000000;
  const endRange = 2860000000000;
  return satNumber >= startRange && satNumber <= endRange;
}

function isBlock9(satNumber: number): boolean {
  // Block 9 sats (the first block that sent bitcoin to another person)
  const startRange = 450000000;
  const endRange = 500000000;
  return satNumber >= startRange && satNumber <= endRange;
}

export function classifySat(satNumber: number): RareSat {
  let type = RareSatType.COMMON;
  let description = "A regular satoshi with no special properties.";
  let rarity = 1;

  // Check for rare types - order matters (most rare to least rare)
  if (isPalindrome(satNumber) && satNumber < 1000) {
    type = RareSatType.LEGENDARY;
    description = "A palindrome satoshi from the first 1,000 sats. Extremely rare!";
    rarity = 10;
  } else if (isBlock9(satNumber)) {
    type = RareSatType.BLOCK9;
    description = "A satoshi from Block 9, the first block that sent bitcoin to another person.";
    rarity = 9;
  } else if (isPizza(satNumber)) {
    type = RareSatType.PIZZA;
    description = "A satoshi from the famous Bitcoin pizza transaction.";
    rarity = 8;
  } else if (isPalindrome(satNumber)) {
    type = RareSatType.PALINDROME;
    description = "A palindrome satoshi that reads the same forwards and backwards.";
    rarity = 7;
  } else if (isBlack(satNumber)) {
    type = RareSatType.BLACK;
    description = "A 'black' satoshi with special cycle properties.";
    rarity = 6;
  } else if (isWhite(satNumber)) {
    type = RareSatType.WHITE;
    description = "A 'white' satoshi with special numerical properties.";
    rarity = 5;
  } else if (isVintage(satNumber)) {
    type = RareSatType.VINTAGE;
    description = "One of the first 100,000 satoshis ever created.";
    rarity = 4;
  } else if (isUncommon(satNumber)) {
    type = RareSatType.UNCOMMON;
    description = "One of the first million satoshis.";
    rarity = 3;
  }

  return {
    satoshi: satNumber.toString(),
    type,
    description,
    rarity
  };
}

// Mock function to simulate fetching rare sats from a wallet
// In a real implementation, this would call the Ord wallet API
export async function fetchRareSatsFromWallet(): Promise<RareSat[]> {
  // Simulate a delay for the API call
  await new Promise(resolve => setTimeout(resolve, 500));

  // Mock data - would be replaced with actual API call
  const mockRareSats: RareSat[] = [
    {
      satoshi: "1024",
      type: RareSatType.VINTAGE,
      description: "One of the first 100,000 satoshis ever created.",
      rarity: 4
    },
    {
      satoshi: "12321",
      type: RareSatType.PALINDROME,
      description: "A palindrome satoshi that reads the same forwards and backwards.",
      rarity: 7
    },
    {
      satoshi: "50000",
      type: RareSatType.BLACK,
      description: "A 'black' satoshi with special cycle properties.",
      rarity: 6
    },
    {
      satoshi: "2854123456789",
      type: RareSatType.PIZZA,
      description: "A satoshi from the famous Bitcoin pizza transaction.",
      rarity: 8
    },
    {
      satoshi: "460000123",
      type: RareSatType.BLOCK9,
      description: "A satoshi from Block 9, the first block that sent bitcoin to another person.",
      rarity: 9
    }
  ];

  return mockRareSats;
}

export function getRarityColor(rarity: number): string {
  switch (rarity) {
    case 10: return 'text-purple-600 dark:text-purple-400'; // Legendary
    case 9: return 'text-red-600 dark:text-red-400';       // Epic
    case 8: return 'text-orange-600 dark:text-orange-400'; // Very Rare
    case 7: return 'text-yellow-600 dark:text-yellow-400'; // Rare
    case 6: return 'text-teal-600 dark:text-teal-400';     // Uncommon
    case 5: return 'text-blue-600 dark:text-blue-400';     // Somewhat Uncommon
    case 4: return 'text-green-600 dark:text-green-400';   // Vintage
    case 3: return 'text-gray-600 dark:text-gray-400';     // Common
    default: return 'text-gray-500 dark:text-gray-500';    // Regular
  }
}

export function getRarityBadgeColor(rarity: number): string {
  switch (rarity) {
    case 10: return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'; 
    case 9: return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
    case 8: return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200';
    case 7: return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
    case 6: return 'bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200';
    case 5: return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
    case 4: return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
    case 3: return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200';
    default: return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
  }
}