const STOPWORDS = new Set([
  "this",
  "that",
  "these",
  "those",
  "with",
  "from",
  "into",
  "when",
  "while",
  "your",
  "their",
  "there",
  "then",
  "than",
  "they",
  "them",
  "also",
  "just",
  "only",
  "over",
  "about",
  "before",
  "after",
  "because",
  "since",
  "instead",
  "rather",
  "which",
  "where",
  "what",
  "were",
  "been",
  "being",
  "would",
  "could",
  "should",
  "will",
  "wont",
  "cant",
  "dont",
  "each",
  "every",
  "same",
  "still",
  "does",
  "doesn",
  "have",
  "having",
  "more",
  "most",
  "some",
  "such",
  "very",
  "onto",
  "upon",
]);

function significantWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((word) => word.length > 3 && !STOPWORDS.has(word));
}

export interface RecallCoverage {
  /** Fraction (0-1) of the reference's significant words also present in the answer. */
  ratio: number;
  /** A handful of reference words the answer didn't mention. */
  missingTerms: string[];
  /** Whether `reference` had enough vocabulary to make `ratio` meaningful. */
  hasSignal: boolean;
}

/**
 * Heuristic coverage of a reference explanation by a free-text answer. This is
 * a self-assessment prompt, not a correctness grade: a low ratio just means
 * the answer's wording didn't touch the reference's key terms, which is a
 * useful nudge to re-read the reveal critically before marking "Nailed it".
 */
export function recallCoverage(answer: string, reference: string): RecallCoverage {
  const referenceWords = [...new Set(significantWords(reference))];
  if (referenceWords.length < 3) return { ratio: 1, missingTerms: [], hasSignal: false };

  const answerWords = new Set(significantWords(answer));
  const missingTerms = referenceWords.filter((word) => !answerWords.has(word));
  const ratio = (referenceWords.length - missingTerms.length) / referenceWords.length;
  return { ratio, missingTerms, hasSignal: true };
}
