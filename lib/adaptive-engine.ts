/**
 * Adaptive Touch-Typing Engine (Keybr Algorithm Implementation)
 * 
 * Generates phonotactically valid English pseudo-words targeted at building
 * character-level kinesthetics and muscle memory without dictionary anticipation.
 * Computes individual per-key Confidence Scores (0.0 to 1.0) based on
 * inter-key transition latencies and error rates.
 */

// Common English syllable components obeying standard phonotactics
const ONSETS = [
  'b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'w',
  'ch', 'sh', 'th', 'wh', 'st', 'sp', 'sc', 'sk', 'sm', 'sn', 'sw', 'pr', 'tr', 'br', 'cr',
  'dr', 'fr', 'gr', 'pl', 'cl', 'bl', 'fl', 'gl', 'sl', 'str', 'spr'
];

const NUCLEI = [
  'a', 'e', 'i', 'o', 'u',
  'ee', 'ea', 'ai', 'oa', 'oo', 'ou', 'oi', 'ar', 'er', 'or', 'ur'
];

const CODAS = [
  't', 'd', 'n', 'm', 'p', 'k', 's', 'l', 'r',
  'ck', 'ng', 'ch', 'sh', 'th', 'nt', 'nd', 'st', 'ct', 'lt', 'mp', 'rk', 'rt', 'nk'
];

/**
 * Calculates a Keybr-style confidence score for each key (0.0 to 1.0)
 * Latency <= 180ms & 0% error => 1.0
 * Latency >= 600ms or high error => < 0.35
 */
export function calculateKeyConfidence(
  keyStats: Record<string, { typed: number; errors: number }>,
  patternStats?: Record<string, { typed: number; errors: number; avgLatencyMs: number }>
): Record<string, number> {
  const confidence: Record<string, number> = {};

  // Standard QWERTY keys to evaluate
  const allKeys = 'abcdefghijklmnopqrstuvwxyz'.split('');

  allKeys.forEach((char) => {
    const stat = keyStats[char];
    const pat = patternStats ? patternStats[char] : undefined;

    if (!stat || stat.typed < 3) {
      // Unproven key starts with baseline confidence
      confidence[char] = 0.5;
      return;
    }

    // 1. Accuracy factor (0.0 to 1.0)
    const errorRate = stat.errors / stat.typed;
    const accFactor = Math.max(0, 1 - errorRate * 3.5);

    // 2. Latency factor (0.0 to 1.0)
    // Target threshold: 180ms = 1.0; 650ms = 0.0
    const avgLatency = pat?.avgLatencyMs || 280;
    const latencyFactor = Math.max(0, Math.min(1, (650 - avgLatency) / (650 - 180)));

    // Combined confidence with weighted bias
    const score = Math.round((accFactor * 0.55 + latencyFactor * 0.45) * 100) / 100;
    confidence[char] = Math.max(0.05, Math.min(1.0, score));
  });

  return confidence;
}

/**
 * Generates a single pronounceable pseudo-word containing desired target characters
 */
export function generateSinglePseudoWord(targetChar?: string): string {
  const needTarget = targetChar && targetChar.length === 1 && /[a-z]/i.test(targetChar.toLowerCase());
  const target = targetChar ? targetChar.toLowerCase() : '';

  // Multi-syllable chance (70% single syllable, 30% two-syllable)
  const isTwoSyllable = Math.random() < 0.3;

  const buildSyllable = (forceChar?: string): string => {
    let onset = ONSETS[Math.floor(Math.random() * ONSETS.length)];
    let nucleus = NUCLEI[Math.floor(Math.random() * NUCLEI.length)];
    let coda = Math.random() < 0.85 ? CODAS[Math.floor(Math.random() * CODAS.length)] : '';

    if (forceChar) {
      // Force character into onset, nucleus, or coda
      if (['a', 'e', 'i', 'o', 'u'].includes(forceChar)) {
        nucleus = forceChar;
      } else if (Math.random() < 0.5) {
        onset = forceChar;
      } else {
        coda = forceChar;
      }
    }

    return `${onset}${nucleus}${coda}`;
  };

  if (!needTarget) {
    if (isTwoSyllable) {
      return `${buildSyllable()}${buildSyllable()}`;
    }
    return buildSyllable();
  }

  // Ensure target character is included
  if (isTwoSyllable) {
    const firstHasTarget = Math.random() < 0.5;
    return `${buildSyllable(firstHasTarget ? target : undefined)}${buildSyllable(!firstHasTarget ? target : undefined)}`;
  }
  return buildSyllable(target);
}

/**
 * Generates a list of adaptive phonetic pseudo-words, heavily weighting
 * the typist's lowest confidence keys.
 */
export function generateAdaptivePseudoWords(
  wordCount: number = 25,
  weakKeys: string[] = [],
  confidenceScores?: Record<string, number>
): string {
  // Determine prioritized characters:
  // 1. Weak keys from recent errors
  // 2. Keys with lowest confidence scores (< 0.7)
  const priorityKeys: string[] = [...weakKeys.map((k) => k.toLowerCase())];

  if (confidenceScores) {
    const sortedByConfidence = Object.entries(confidenceScores)
      .sort(([, a], [, b]) => a - b)
      .filter(([char, score]) => score < 0.75 && /[a-z]/.test(char))
      .map(([char]) => char);

    sortedByConfidence.forEach((k) => {
      if (!priorityKeys.includes(k)) {
        priorityKeys.push(k);
      }
    });
  }

  // If no specific weak keys, pick 3 moderately challenging home-row/extended keys
  const fallbackKeys = ['r', 't', 'p', 'c', 'v', 'b', 'n', 'm'];
  const activeTargets = priorityKeys.length > 0 ? priorityKeys : fallbackKeys;

  const words: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    // 60% of words target a prioritized low-confidence character
    const targetChar = Math.random() < 0.65 ? activeTargets[i % activeTargets.length] : undefined;
    words.push(generateSinglePseudoWord(targetChar));
  }

  return words.join(' ');
}
