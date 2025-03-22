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
  BLOCK9 = 'Block9',
  // Additional rare sat types from Ordiscan
  FIRST = 'First Block',
  BLOCK78 = 'Block 78',
  ASCII = 'ASCII',
  BINARY = 'Binary',
  SEQUENCE = 'Sequence',
  REPEATING = 'Repeating',
  RODARMOR = 'Rodarmor',
  ALPHA_MEGA = 'Alpha-Mega',
  PRIME = 'Prime',
  EVIL = 'Evil',
  OMEGA = 'Omega'
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

function isFirstBlock(satNumber: number): boolean {
  // Sats from the genesis block (block height 0)
  return satNumber >= 0 && satNumber <= 50;
}

function isBlock78(satNumber: number): boolean {
  // Block 78 contained a famous message from Satoshi Nakamoto
  const startRange = 3900000;
  const endRange = 3950000;
  return satNumber >= startRange && satNumber <= endRange;
}

function isAscii(satNumber: number): boolean {
  // ASCII character representation in decimal (0-127)
  return satNumber <= 127;
}

function isBinary(satNumber: number): boolean {
  // Number whose binary representation has a special pattern
  const binary = satNumber.toString(2);
  // Example: All ones or all zeros (except leading zeros)
  return /^1+$/.test(binary) || /^10+$/.test(binary);
}

function isSequence(satNumber: number): boolean {
  // Numbers in ascending or descending sequence
  const str = satNumber.toString();
  let ascending = true;
  let descending = true;
  
  for (let i = 1; i < str.length; i++) {
    if (parseInt(str[i]) !== parseInt(str[i-1]) + 1) {
      ascending = false;
    }
    if (parseInt(str[i]) !== parseInt(str[i-1]) - 1) {
      descending = false;
    }
  }
  
  return (ascending || descending) && str.length > 2;
}

function isRepeating(satNumber: number): boolean {
  // Contains repeating digits
  const str = satNumber.toString();
  return /(\d)\1{2,}/.test(str); // 3 or more of the same digit in a row
}

function isRodarmor(satNumber: number): boolean {
  // Named after Casey Rodarmor, creator of Ordinals
  // Using block 78 as reference for this example
  return satNumber === 3939393 || satNumber === 8484848;
}

function isAlphaMega(satNumber: number): boolean {
  // Alpha (first) and Omega (last) of specific ranges
  // For this example, we'll use round numbers
  return satNumber === 1000000 || satNumber === 9999999;
}

function isPrime(satNumber: number): boolean {
  // Prime number check (simplified for lower numbers)
  if (satNumber <= 1) return false;
  if (satNumber <= 3) return true;
  if (satNumber % 2 === 0 || satNumber % 3 === 0) return false;
  
  for (let i = 5; i * i <= satNumber; i += 6) {
    if (satNumber % i === 0 || satNumber % (i + 2) === 0) return false;
  }
  
  return true;
}

function isEvil(satNumber: number): boolean {
  // Evil numbers have an even number of 1s in their binary representation
  const binary = satNumber.toString(2);
  let count = 0;
  for (let char of binary) {
    if (char === '1') count++;
  }
  return count % 2 === 0 && count > 0;
}

function isOmega(satNumber: number): boolean {
  // Last satoshi in significant ranges
  // Using 50th percentile block for this example
  return satNumber === 1050000000000;
}

export function classifySat(satNumber: number): RareSat {
  let type = RareSatType.COMMON;
  let description = "A regular satoshi with no special properties.";
  let rarity = 1;

  // Check for rare types - order matters (most rare to least rare)
  if (isFirstBlock(satNumber)) {
    type = RareSatType.FIRST;
    description = "A satoshi from the genesis block, the very first Bitcoin block.";
    rarity = 10;
  } else if (isPalindrome(satNumber) && satNumber < 1000) {
    type = RareSatType.LEGENDARY;
    description = "A palindrome satoshi from the first 1,000 sats. Extremely rare!";
    rarity = 10;
  } else if (isRodarmor(satNumber)) {
    type = RareSatType.RODARMOR;
    description = "A special satoshi named after Casey Rodarmor, creator of Ordinals.";
    rarity = 9;
  } else if (isBlock9(satNumber)) {
    type = RareSatType.BLOCK9;
    description = "A satoshi from Block 9, the first block that sent Bitcoin to another person.";
    rarity = 9;
  } else if (isBlock78(satNumber)) {
    type = RareSatType.BLOCK78;
    description = "A satoshi from Block 78, which contained a special message from Satoshi Nakamoto.";
    rarity = 9;
  } else if (isPizza(satNumber)) {
    type = RareSatType.PIZZA;
    description = "A satoshi from the famous Bitcoin pizza transaction.";
    rarity = 8;
  } else if (isAlphaMega(satNumber)) {
    type = RareSatType.ALPHA_MEGA;
    description = "An Alpha or Omega satoshi - the first or last in a significant range.";
    rarity = 8;
  } else if (isPalindrome(satNumber)) {
    type = RareSatType.PALINDROME;
    description = "A palindrome satoshi that reads the same forwards and backwards.";
    rarity = 7;
  } else if (isSequence(satNumber)) {
    type = RareSatType.SEQUENCE;
    description = "A satoshi with sequential digits (ascending or descending).";
    rarity = 7;
  } else if (isRepeating(satNumber)) {
    type = RareSatType.REPEATING;
    description = "A satoshi with repeating digits pattern.";
    rarity = 6;
  } else if (isPrime(satNumber) && satNumber > 10000) {
    type = RareSatType.PRIME;
    description = "A prime number satoshi - divisible only by 1 and itself.";
    rarity = 6;
  } else if (isBlack(satNumber)) {
    type = RareSatType.BLACK;
    description = "A 'black' satoshi with special cycle properties.";
    rarity = 6;
  } else if (isEvil(satNumber)) {
    type = RareSatType.EVIL;
    description = "An 'evil' satoshi with an even number of 1s in its binary representation.";
    rarity = 5;
  } else if (isWhite(satNumber)) {
    type = RareSatType.WHITE;
    description = "A 'white' satoshi with special numerical properties.";
    rarity = 5;
  } else if (isOmega(satNumber)) {
    type = RareSatType.OMEGA;
    description = "An 'omega' satoshi - the last in a significant range.";
    rarity = 5;
  } else if (isBinary(satNumber)) {
    type = RareSatType.BINARY;
    description = "A satoshi with a special binary pattern.";
    rarity = 5;
  } else if (isVintage(satNumber)) {
    type = RareSatType.VINTAGE;
    description = "One of the first 100,000 satoshis ever created.";
    rarity = 4;
  } else if (isAscii(satNumber)) {
    type = RareSatType.ASCII;
    description = "A satoshi with an ASCII value (0-127).";
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

// Function to simulate fetching rare sats from a wallet
// In a real implementation, this would call the Ord wallet API
export async function fetchRareSatsFromWallet(): Promise<RareSat[]> {
  // Simulate a delay for the API call
  await new Promise(resolve => setTimeout(resolve, 500));

  // In a real implementation, this function would:
  // 1. Connect to the Ord wallet API using the container name and port
  // 2. Query available UTXOs to find rare satoshis
  // 3. Run classification on those satoshis
  // 4. Return only the rare ones that are available in the wallet
  
  // Mock data for demonstration purposes - would be replaced with actual API call
  const mockRareSats: RareSat[] = [
    // Legendary and Epic sats
    {
      satoshi: "21",
      type: RareSatType.FIRST,
      description: "A satoshi from the genesis block, the very first Bitcoin block.",
      rarity: 10
    },
    {
      satoshi: "121",
      type: RareSatType.PALINDROME,
      description: "A palindrome satoshi from the first 1,000 sats. Extremely rare!",
      rarity: 10
    },
    {
      satoshi: "3939393",
      type: RareSatType.RODARMOR,
      description: "A special satoshi named after Casey Rodarmor, creator of Ordinals.",
      rarity: 9
    },
    {
      satoshi: "460000123",
      type: RareSatType.BLOCK9,
      description: "A satoshi from Block 9, the first block that sent Bitcoin to another person.",
      rarity: 9
    },
    {
      satoshi: "3912345",
      type: RareSatType.BLOCK78,
      description: "A satoshi from Block 78, which contained a special message from Satoshi Nakamoto.",
      rarity: 9
    },
    
    // Very Rare sats
    {
      satoshi: "2854123456789",
      type: RareSatType.PIZZA,
      description: "A satoshi from the famous Bitcoin pizza transaction.",
      rarity: 8
    },
    {
      satoshi: "1000000",
      type: RareSatType.ALPHA_MEGA,
      description: "An Alpha or Omega satoshi - the first or last in a significant range.",
      rarity: 8
    },
    
    // Rare sats
    {
      satoshi: "12321",
      type: RareSatType.PALINDROME,
      description: "A palindrome satoshi that reads the same forwards and backwards.",
      rarity: 7
    },
    {
      satoshi: "123456",
      type: RareSatType.SEQUENCE,
      description: "A satoshi with sequential digits (ascending or descending).",
      rarity: 7
    },
    
    // Uncommon sats
    {
      satoshi: "111222",
      type: RareSatType.REPEATING,
      description: "A satoshi with repeating digits pattern.",
      rarity: 6
    },
    {
      satoshi: "10007",
      type: RareSatType.PRIME,
      description: "A prime number satoshi - divisible only by 1 and itself.",
      rarity: 6
    },
    {
      satoshi: "50000",
      type: RareSatType.BLACK,
      description: "A 'black' satoshi with special cycle properties.",
      rarity: 6
    },
    
    // Somewhat Uncommon sats
    {
      satoshi: "10100",
      type: RareSatType.EVIL,
      description: "An 'evil' satoshi with an even number of 1s in its binary representation.",
      rarity: 5
    },
    {
      satoshi: "2100",
      type: RareSatType.WHITE,
      description: "A 'white' satoshi with special numerical properties.",
      rarity: 5
    },
    {
      satoshi: "1111",
      type: RareSatType.BINARY,
      description: "A satoshi with a special binary pattern.",
      rarity: 5
    },
    
    // Common but interesting sats
    {
      satoshi: "1024",
      type: RareSatType.VINTAGE,
      description: "One of the first 100,000 satoshis ever created.",
      rarity: 4
    },
    {
      satoshi: "65",
      type: RareSatType.ASCII,
      description: "A satoshi with an ASCII value (0-127) - represents 'A' in ASCII.",
      rarity: 4
    },
    {
      satoshi: "999999",
      type: RareSatType.UNCOMMON,
      description: "One of the first million satoshis.",
      rarity: 3
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