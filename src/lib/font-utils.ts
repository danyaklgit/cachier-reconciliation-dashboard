/**
 * Utility functions for handling Arabic text and fonts
 * 
 * Usage:
 * - Use getFontClass(text) for dynamic font selection based on content
 * - Use getMixedFontClass() for components that might contain both Arabic and English
 * - Use containsArabic(text) to detect Arabic text
 * 
 * Example:
 * <div className={getFontClass("مرحبا")}> // Returns 'font-arabic'
 * <div className={getFontClass("Hello")}> // Returns 'font-sans'
 * <div className={getMixedFontClass()}> // Always returns 'font-arabic'
 */

/**
 * Detects if text contains Arabic characters
 */
export function containsArabic(text: string): boolean {
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return arabicRegex.test(text);
}

/**
 * Returns appropriate font class based on text content
 */
export function getFontClass(text: string): string {
  return containsArabic(text) ? 'font-arabic' : 'font-sans';
}

/**
 * Returns appropriate font class for mixed content (Arabic + English)
 */
export function getMixedFontClass(): string {
  return 'font-arabic'; // Use Arabic font as it handles both Arabic and Latin characters well
}
