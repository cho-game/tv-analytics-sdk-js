/**
 * Generates a clean UUID v4 string without hyphens (matching V SDK format).
 * Format: 32 lowercase hex characters.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '');
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    // Set UUID v4 variant and version bits
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback using Math.random
  let result = '';
  for (let i = 0; i < 32; i++) {
    const r = (Math.random() * 16) | 0;
    if (i === 12) {
      result += '4';
    } else if (i === 16) {
      result += ((r & 0x3) | 0x8).toString(16);
    } else {
      result += r.toString(16);
    }
  }
  return result;
}
