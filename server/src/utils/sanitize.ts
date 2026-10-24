/**
 * Input sanitization utility for real-time messaging and social interactions.
 * Enforces strict XSS prevention and Zero-Emoji Policy compliance.
 */

// Regular expression matching emoji code points across Unicode blocks
const EMOJI_REGEX = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F680}-\u{1F6C5}\u{1F9A0}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu;

/**
 * Escapes sensitive HTML control characters to prevent Cross-Site Scripting (XSS).
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/`/g, '&#x60;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitizes chat and text inputs:
 * 1. Strips non-printable ASCII and Unicode control characters.
 * 2. Enforces the Zero-Emoji Policy by stripping all emoji symbols.
 * 3. Trims whitespace and normalizes spaces.
 * 4. Enforces character length bounds (1 to 500 characters).
 * 5. Escapes HTML entities to neutralize XSS injection attacks.
 */
export function sanitizeChatMessage(input: unknown): string {
  if (typeof input !== 'string') {
    throw new Error('Message content must be a text string.');
  }

  // 1. Remove emojis to enforce the Zero-Emoji Policy
  let cleaned = input.replace(EMOJI_REGEX, '');

  // 2. Strip dangerous control characters (0x00 to 0x1F, excluding space and newline)
  cleaned = cleaned.replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, '');

  // 3. Normalize whitespace
  cleaned = cleaned.trim();

  if (cleaned.length === 0) {
    throw new Error('Message content cannot be empty.');
  }

  if (cleaned.length > 500) {
    throw new Error('Message content exceeds maximum allowed length of 500 characters.');
  }

  // 4. Escape HTML
  return escapeHtml(cleaned);
}
