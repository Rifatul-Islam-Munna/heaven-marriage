/** Shared admin text rule: count Unicode words separated by whitespace, not characters. */
export const MAX_CONTENT_WORDS = 3000;
export function countWords(value: string): number {
  const content = value.trim();
  return content ? content.split(/\s+/u).length : 0;
}
