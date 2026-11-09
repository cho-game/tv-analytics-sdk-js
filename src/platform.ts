/**
 * Detects runtime platform string conforming to analytics standard.
 * Returns: 'android' | 'ios' | 'web' | 'macos' | 'windows' | 'linux' | 'desktop'
 */
export function detectPlatform(): string {
  // Check browser user agent
  if (typeof navigator !== 'undefined' && navigator.userAgent) {
    const ua = navigator.userAgent.toLowerCase();
    if (/android/i.test(ua)) {
      return 'android';
    }
    if (/iphone|ipad|ipod/i.test(ua)) {
      return 'ios';
    }
    if (/macintosh|mac os x/i.test(ua)) {
      return 'macos';
    }
    if (/windows/i.test(ua)) {
      return 'windows';
    }
    if (/linux/i.test(ua)) {
      return 'linux';
    }
    return 'web';
  }

  // Check Node / Bun / Process environment
  if (typeof process !== 'undefined' && process.platform) {
    switch (process.platform) {
      case 'darwin':
        return 'macos';
      case 'win32':
        return 'windows';
      case 'linux':
        return 'linux';
      default:
        return 'desktop';
    }
  }

  return 'web';
}
