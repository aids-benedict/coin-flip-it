/**
 * Extract keywords from text for relevance matching
 * Removes common stop words and returns up to 10 meaningful keywords
 */
export function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    "should", "i", "a", "an", "the", "or", "and", "but", "in", "on", "at",
    "to", "for", "of", "with", "by", "from", "up", "about", "into", "through",
    "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
    "do", "does", "did", "will", "would", "could", "can", "my", "me", "it"
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word))
    .slice(0, 10);
}
