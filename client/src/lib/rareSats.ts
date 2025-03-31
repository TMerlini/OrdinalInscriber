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
  available?: boolean;
}

function isVintage(satNumber: number): boolean {
  return satNumber < 100000;
}

function isUncommon(satNumber: number): boolean {
  return satNumber < 1000000;
}

function isBlack(satNumber: number): boolean {
  // Simplified check for black satoshis
  return satNumber % 10000 === 0;
}

function isWhite(satNumber: number): boolean {
  // Simplified check for white satoshis
  return satNumber % 2100 === 0;
}

function isPalindrome(satNumber: number): boolean {
  const str = satNumber.toString();
  const len = str.length;
  for (let i = 0; i < len / 2; i++) {
    if (str[i] !== str[len - 1 - i]) return false;
  }
  return true;
}

function isPizza(satNumber: number): boolean {
  // Simplified check for pizza transaction satoshis
  // In reality, this would check if the satoshi was part of the famous pizza transaction
  return satNumber.toString().includes('1234567');
}

function isBlock9(satNumber: number): boolean {
  // Simplified check for Block 9 satoshis
  const str = satNumber.toString();
  return str.startsWith('4600') || str.startsWith('4601');
}

function isFirstBlock(satNumber: number): boolean {
  // Simplified check for Genesis block satoshis
  return satNumber < 5000;
}

function isBlock78(satNumber: number): boolean {
  // Simplified check for Block 78 satoshis
  return satNumber.toString().startsWith('39');
}

function isAscii(satNumber: number): boolean {
  return satNumber >= 0 && satNumber <= 127;
}

function isBinary(satNumber: number): boolean {
  // Simplified check for binary pattern satoshis
  const str = satNumber.toString();
  return str.split('').every(c => c === '0' || c === '1');
}

function isSequence(satNumber: number): boolean {
  const str = satNumber.toString();
  let isAscending = true;
  let isDescending = true;

  for (let i = 1; i < str.length; i++) {
    if (parseInt(str[i]) !== parseInt(str[i-1]) + 1) {
      isAscending = false;
    }
    if (parseInt(str[i]) !== parseInt(str[i-1]) - 1) {
      isDescending = false;
    }
    if (!isAscending && !isDescending) break;
  }

  return isAscending || isDescending;
}

function isRepeating(satNumber: number): boolean {
  const str = satNumber.toString();

  // Check for patterns like 123123, 4545, etc.
  for (let patternLen = 1; patternLen <= str.length / 2; patternLen++) {
    const pattern = str.substr(0, patternLen);
    let isRepeating = true;

    for (let i = patternLen; i < str.length; i += patternLen) {
      const segment = str.substr(i, patternLen);
      if (segment !== pattern.substr(0, segment.length)) {
        isRepeating = false;
        break;
      }
    }

    if (isRepeating) return true;
  }

  return false;
}

function isRodarmor(satNumber: number): boolean {
  // Simplified check for satoshis related to Casey Rodarmor
  return satNumber.toString().includes('393939');
}

function isAlphaMega(satNumber: number): boolean {
  // Simplified check for Alpha or Omega satoshis
  // First or last satoshi in a power of 10
  return satNumber === 1000000 || satNumber === 999999;
}

function isPrime(satNumber: number): boolean {
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
  let binary = satNumber.toString(2);
  let count = 0;
  for (let i = 0; i < binary.length; i++) {
    if (binary[i] === '1') count++;
  }
  return count % 2 === 0;
}

function isOmega(satNumber: number): boolean {
  // Simplified check for Omega satoshis
  return satNumber.toString().endsWith('999');
}

export function classifySat(satNumber: number): RareSat {
  let type = RareSatType.COMMON;
  let description = "A regular satoshi with no special properties.";
  let rarity = 1;

  // Check from most rare to least rare
  if (isFirstBlock(satNumber)) {
    type = RareSatType.FIRST;
    description = "A satoshi from the genesis block, the very first Bitcoin block.";
    rarity = 10;
  } else if (isBlock9(satNumber)) {
    type = RareSatType.BLOCK9;
    description = "A satoshi from Block 9, the first block that sent Bitcoin to another person.";
    rarity = 9;
  } else if (isBlock78(satNumber)) {
    type = RareSatType.BLOCK78;
    description = "A satoshi from Block 78, which contained a special message from Satoshi Nakamoto.";
    rarity = 9;
  } else if (isRodarmor(satNumber)) {
    type = RareSatType.RODARMOR;
    description = "A special satoshi named after Casey Rodarmor, creator of Ordinals.";
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
  } else if (isWhite(satNumber)) {
    type = RareSatType.WHITE;
    description = "A 'white' satoshi with special numerical properties.";
    rarity = 5;
  } else if (isEvil(satNumber)) {
    type = RareSatType.EVIL;
    description = "An 'evil' satoshi with an even number of 1s in its binary representation.";
    rarity = 5;
  } else if (isOmega(satNumber)) {
    type = RareSatType.OMEGA;
    description = "An Omega satoshi at the end of a numerical range.";
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

// Get complete list of all possible rare sat types 
export function getAllRareSatTypes(): RareSat[] {
  // This function returns examples of all possible rare sat types
  // in a real implementation, this would come from a predefined list or database
  return [
    // Legendary sats (rarity 10)
    {
      satoshi: "21",
      type: RareSatType.FIRST,
      description: "A satoshi from the genesis block, the very first Bitcoin block.",
      rarity: 10,
      available: false
    },
    {
      satoshi: "121",
      type: RareSatType.LEGENDARY,
      description: "Extremely rare satoshi with unique qualities.",
      rarity: 10,
      available: false
    },
    {
      satoshi: "7331",
      type: RareSatType.MYTHIC,
      description: "Mythical satoshi with historical significance.",
      rarity: 10,
      available: false
    },

    // Epic sats (rarity 9)
    {
      satoshi: "3939393",
      type: RareSatType.RODARMOR,
      description: "A special satoshi named after Casey Rodarmor, creator of Ordinals.",
      rarity: 9,
      available: false
    },
    {
      satoshi: "460000123",
      type: RareSatType.BLOCK9,
      description: "A satoshi from Block 9, the first block that sent Bitcoin to another person.",
      rarity: 9,
      available: false
    },
    {
      satoshi: "3912345",
      type: RareSatType.BLOCK78,
      description: "A satoshi from Block 78, which contained a special message from Satoshi Nakamoto.",
      rarity: 9,
      available: false
    },
    {
      satoshi: "9999999",
      type: RareSatType.EPIC,
      description: "Satoshi with exceptional rarity.",
      rarity: 9,
      available: false
    },

    // Very Rare sats (rarity 8)
    {
      satoshi: "2854123456789",
      type: RareSatType.PIZZA,
      description: "A satoshi from the famous Bitcoin pizza transaction.",
      rarity: 8,
      available: false
    },
    {
      satoshi: "1000000",
      type: RareSatType.ALPHA_MEGA,
      description: "An Alpha or Omega satoshi - the first or last in a significant range.",
      rarity: 8,
      available: false
    },

    // Rare sats (rarity 7)
    {
      satoshi: "12321",
      type: RareSatType.PALINDROME,
      description: "A palindrome satoshi that reads the same forwards and backwards.",
      rarity: 7,
      available: false
    },
    {
      satoshi: "123456",
      type: RareSatType.SEQUENCE,
      description: "A satoshi with sequential digits (ascending or descending).",
      rarity: 7,
      available: false
    },
    {
      satoshi: "77777",
      type: RareSatType.RARE,
      description: "Satoshi with uncommon properties.",
      rarity: 7,
      available: false
    },

    // Uncommon sats (rarity 6)
    {
      satoshi: "111222",
      type: RareSatType.REPEATING,
      description: "A satoshi with repeating digits pattern.",
      rarity: 6,
      available: false
    },
    {
      satoshi: "10007",
      type: RareSatType.PRIME,
      description: "A prime number satoshi - divisible only by 1 and itself.",
      rarity: 6,
      available: false
    },
    {
      satoshi: "50000",
      type: RareSatType.BLACK,
      description: "A 'black' satoshi with special cycle properties.",
      rarity: 6,
      available: false
    },
    {
      satoshi: "654321",
      type: RareSatType.UNCOMMON,
      description: "Satoshi with slightly rare properties.",
      rarity: 6,
      available: false
    },

    // Somewhat Uncommon sats (rarity 5)
    {
      satoshi: "10100",
      type: RareSatType.EVIL,
      description: "An 'evil' satoshi with an even number of 1s in its binary representation.",
      rarity: 5,
      available: false
    },
    {
      satoshi: "2100",
      type: RareSatType.WHITE,
      description: "A 'white' satoshi with special numerical properties.",
      rarity: 5,
      available: false
    },
    {
      satoshi: "1111",
      type: RareSatType.BINARY,
      description: "A satoshi with a special binary pattern.",
      rarity: 5,
      available: false
    },

    // Common but interesting sats (rarity 4)
    {
      satoshi: "1024",
      type: RareSatType.VINTAGE,
      description: "One of the first 100,000 satoshis ever created.",
      rarity: 4,
      available: false
    },
    {
      satoshi: "65",
      type: RareSatType.ASCII,
      description: "A satoshi with an ASCII value (0-127) - represents 'A' in ASCII.",
      rarity: 4,
      available: false
    },

    // Common sats (rarity 3)
    {
      satoshi: "999999",
      type: RareSatType.COMMON,
      description: "One of the first million satoshis.",
      rarity: 3,
      available: false
    }
  ];
}

// Function to get all rare sat types defined in the system
export function getAllRareSatTypesDefinitions(): RareSatType[] {
  return Object.values(RareSatType);
}

// Mock function to fetch rare sats from wallet
export async function fetchRareSatsFromWallet(hasRareSats = true): Promise<RareSat[]> {
  try {
    // Special handling for Janeway URL to prevent runtime errors
    if (typeof window !== 'undefined' && 
        window.location && 
        window.location.hostname.includes('janeway.replit.dev')) {
      console.log('*** JANEWAY URL DETECTED - RETURNING MOCK DATA FOR RARE SATS ***');
      // In Janeway environment, immediately return mock data instead of making API calls
      // that might cause runtime errors
      return [
        {
          satoshi: "12345",
          type: RareSatType.VINTAGE,
          description: "Mock sat for Janeway environment",
          rarity: 4,
          available: true
        },
        {
          satoshi: "54321",
          type: RareSatType.UNCOMMON,
          description: "Another mock sat for Janeway environment",
          rarity: 3,
          available: true
        }
      ];
    }

    // For non-Janeway environments, proceed with normal logic:

    // Simulate a delay for the API call
    await new Promise(resolve => setTimeout(resolve, 500));

    // In a real implementation, this would:
    // 1. Connect to the Ord wallet API using the container name and port
    // 2. Query available UTXOs to find rare satoshis
    // 3. Run classification on those satoshis
    // 4. Return only the rare ones that are available in the wallet

    // Enable mock data for easier testing
    //const hasRareSats = true;

    // Always return data for development/testing purposes
    console.log('Simulating rare sats in wallet');

    // Mock data for demonstration purposes - would be replaced with actual API call
    const mockRareSats: RareSat[] = [
      // Legendary and Epic sats
      {
        satoshi: "21",
        type: RareSatType.FIRST,
        description: "A satoshi from the genesis block, the very first Bitcoin block.",
        rarity: 10,
        available: true
      },
      {
        satoshi: "121",
        type: RareSatType.PALINDROME,
        description: "A palindrome satoshi from the first 1,000 sats. Extremely rare!",
        rarity: 10,
        available: true
      },
      {
        satoshi: "3939393",
        type: RareSatType.RODARMOR,
        description: "A special satoshi named after Casey Rodarmor, creator of Ordinals.",
        rarity: 9,
        available: true
      },
      {
        satoshi: "460000123",
        type: RareSatType.BLOCK9,
        description: "A satoshi from Block 9, the first block that sent Bitcoin to another person.",
        rarity: 9,
        available: true
      },
      {
        satoshi: "3912345",
        type: RareSatType.BLOCK78,
        description: "A satoshi from Block 78, which contained a special message from Satoshi Nakamoto.",
        rarity: 9,
        available: true
      },

      // Very Rare sats
      {
        satoshi: "2854123456789",
        type: RareSatType.PIZZA,
        description: "A satoshi from the famous Bitcoin pizza transaction.",
        rarity: 8,
        available: true
      },
      {
        satoshi: "1000000",
        type: RareSatType.ALPHA_MEGA,
        description: "An Alpha or Omega satoshi - the first or last in a significant range.",
        rarity: 8,
        available: true
      },

      // Rare sats
      {
        satoshi: "12321",
        type: RareSatType.PALINDROME,
        description: "A palindrome satoshi that reads the same forwards and backwards.",
        rarity: 7,
        available: true
      },
      {
        satoshi: "123456",
        type: RareSatType.SEQUENCE,
        description: "A satoshi with sequential digits (ascending or descending).",
        rarity: 7,
        available: true
      },

      // Uncommon sats
      {
        satoshi: "111222",
        type: RareSatType.REPEATING,
        description: "A satoshi with repeating digits pattern.",
        rarity: 6,
        available: true
      },
      {
        satoshi: "10007",
        type: RareSatType.PRIME,
        description: "A prime number satoshi - divisible only by 1 and itself.",
        rarity: 6,
        available: true
      },
      {
        satoshi: "50000",
        type: RareSatType.BLACK,
        description: "A 'black' satoshi with special cycle properties.",
        rarity: 6,
        available: true
      },

      // Somewhat Uncommon sats
      {
        satoshi: "10100",
        type: RareSatType.EVIL,
        description: "An 'evil' satoshi with an even number of 1s in its binary representation.",
        rarity: 5,
        available: true
      },
      {
        satoshi: "2100",
        type: RareSatType.WHITE,
        description: "A 'white' satoshi with special numerical properties.",
        rarity: 5,
        available: true
      },
      {
        satoshi: "1111",
        type: RareSatType.BINARY,
        description: "A satoshi with a special binary pattern.",
        rarity: 5,
        available: true
      },

      // Common but interesting sats
      {
        satoshi: "1024",
        type: RareSatType.VINTAGE,
        description: "One of the first 100,000 satoshis ever created.",
        rarity: 4,
        available: true
      },
      {
        satoshi: "65",
        type: RareSatType.ASCII,
        description: "A satoshi with an ASCII value (0-127) - represents 'A' in ASCII.",
        rarity: 4,
        available: true
      },
      {
        satoshi: "999999",
        type: RareSatType.UNCOMMON,
        description: "One of the first million satoshis.",
        rarity: 3,
        available: true
      }
    ];

    return mockRareSats;
  } catch (err) {
    console.error('Error fetching rare sats from wallet:', err);
    throw new Error('Failed to load rare sats from wallet. Please try again later.');
  }
}

export function getRarityColor(rarity: number): string {
  try {
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
  } catch (err) {
    console.log('Error in getRarityColor:', err);
    return 'text-gray-500 dark:text-gray-500';  // Fallback
  }
}

export function getRarityBadgeColor(rarity: number): string {
  try {
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
  } catch (err) {
    console.log('Error in getRarityBadgeColor:', err);
    return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'; // Fallback
  }
}