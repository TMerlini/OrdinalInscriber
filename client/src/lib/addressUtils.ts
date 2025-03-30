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
  if (!address || address.length <= startChars + endChars) {
    return address || '';
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Determine if an address is a valid Bitcoin address
 * Basic check that can be expanded for more specific validation
 */
export function isValidBitcoinAddress(address: string): boolean {
  // Simple regex check for Bitcoin address format
  // More robust validation would require crypto libraries
  
  // Check for legacy addresses (P2PKH) - start with 1
  const p2pkhRegex = /^1[a-km-zA-HJ-NP-Z1-9]{25,34}$/;
  
  // Check for P2SH addresses - start with 3
  const p2shRegex = /^3[a-km-zA-HJ-NP-Z1-9]{25,34}$/;
  
  // Check for Bech32 addresses (segwit) - start with bc1
  const bech32Regex = /^bc1[a-z0-9]{39,59}$/;
  
  // Check for Taproot addresses - start with bc1p
  const taprootRegex = /^bc1p[a-z0-9]{58,73}$/;
  
  return p2pkhRegex.test(address) || 
         p2shRegex.test(address) || 
         bech32Regex.test(address) ||
         taprootRegex.test(address);
}

/**
 * Determine the type of Bitcoin address (P2PKH, P2SH, Bech32)
 */
export function getBitcoinAddressType(address: string): string {
  if (!address) return 'Unknown';
  
  if (address.startsWith('1')) {
    return 'P2PKH (Legacy)';
  } else if (address.startsWith('3')) {
    return 'P2SH';
  } else if (address.startsWith('bc1p')) {
    return 'P2TR (Taproot)';
  } else if (address.startsWith('bc1')) {
    return 'P2WPKH (Segwit)';
  } else {
    return 'Unknown';
  }
}