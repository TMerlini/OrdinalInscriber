/**
 * Utility functions for handling wallet addresses
 */

/**
 * Format a Bitcoin address for display by truncating the middle portion
 * @param address The full Bitcoin address
 * @param startChars Number of characters to show at the start
 * @param endChars Number of characters to show at the end
 * @returns Formatted address (e.g., "bc1q...7f8j")
 */
export function formatAddress(address: string, startChars = 8, endChars = 4): string {
  if (!address) return '';
  
  if (address.length <= startChars + endChars) {
    return address;
  }
  
  return `${address.substring(0, startChars)}...${address.substring(address.length - endChars)}`;
}

/**
 * Determine if an address is a valid Bitcoin address
 * Basic check that can be expanded for more specific validation
 */
export function isValidBitcoinAddress(address: string): boolean {
  // Simple check for common Bitcoin address formats
  // P2PKH: starts with 1
  // P2SH: starts with 3
  // Bech32: starts with bc1
  // Segwit: starts with 2
  const btcRegex = /^(1|3|bc1|2)[a-zA-Z0-9]{25,90}$/;
  return btcRegex.test(address);
}

/**
 * Determine the type of Bitcoin address (P2PKH, P2SH, Bech32)
 */
export function getBitcoinAddressType(address: string): string {
  if (!address) return 'Unknown';
  
  if (address.startsWith('1')) {
    return 'P2PKH';
  } else if (address.startsWith('3')) {
    return 'P2SH';
  } else if (address.startsWith('bc1')) {
    return 'Bech32';
  } else if (address.startsWith('2')) {
    return 'Segwit';
  }
  
  return 'Unknown';
}