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
  if (address.length <= startChars + endChars) return address;
  
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Determine if an address is a valid Bitcoin address
 * Basic check that can be expanded for more specific validation
 */
export function isValidBitcoinAddress(address: string): boolean {
  if (!address) return false;
  
  // Basic length check
  if (address.length < 26 || address.length > 89) return false;
  
  // Check address prefix
  const validPrefixes = ['1', '3', 'bc1', 'tb1'];
  return validPrefixes.some(prefix => address.startsWith(prefix));
}

/**
 * Determine the type of Bitcoin address (P2PKH, P2SH, Bech32)
 */
export function getBitcoinAddressType(address: string): string {
  if (!address) return 'Unknown';
  
  if (address.startsWith('1')) return 'P2PKH (Legacy)';
  if (address.startsWith('3')) return 'P2SH (Segwit-compatible)';
  if (address.startsWith('bc1q')) return 'P2WPKH (Native Segwit)';
  if (address.startsWith('bc1p')) return 'P2TR (Taproot)';
  if (address.startsWith('tb1')) return 'Testnet';
  
  return 'Unknown';
}