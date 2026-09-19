import { KeybrProgressionState } from '@/types/typing';

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

/**
 * Generates immediate, natural remediation words targeting an in-flow bigram hesitation
 */
export function generateDdaRemediationWords(
  signal: { bigram: string; targetKey: string },
  count: number = 3
): string[] {
  const cleanBigram = signal.bigram.toLowerCase().replace(/[^a-z]/g, '');
  const target = signal.targetKey.toLowerCase().replace(/[^a-z]/g, '') || 'e';

  const results: string[] = [];
  for (let i = 0; i < count; i++) {
    if (cleanBigram.length === 2 && Math.random() < 0.75) {
      // Embed bigram with natural vowel/consonant wrapper
      const prefix = ['s', 't', 'p', 'b', 'c', 're', 'de', 'un', 'in', ''][Math.floor(Math.random() * 10)];
      const suffix = ['er', 'ed', 'ing', 'ly', 'est', 'y', 'al', 'en', ''][Math.floor(Math.random() * 9)];
      results.push(`${prefix}${cleanBigram}${suffix}`);
    } else {
      results.push(generateSinglePseudoWord(target));
    }
  }

  return results.filter((w) => w.length >= 3 && w.length <= 8);
}

export const INITIAL_KEYBR_PROGRESSION: KeybrProgressionState = {
  activeAlphabet: ['e', 'n', 'i', 't', 'r', 'l'],
  unlockedKeyQueue: [
    's', 'a', 'o', 'u', 'd', 'c', 'h', 'm', 'p', 'g', 'b', 'f', 'y', 'w', 'k', 'v', 'x', 'z', 'j', 'q'
  ],
  currentFocusKey: 'l',
  confidenceMap: { e: 0.5, n: 0.5, i: 0.5, t: 0.5, r: 0.5, l: 0.5 },
  isMastered: false,
  totalKeysUnlocked: 6,
};

/**
 * Checks if the user has mastered all active keys in the current probation set
 * (Confidence >= 0.80 across at least 15 typed occurrences), and if so,
 * unlocks the next letter in the queue.
 */
export function checkAndUpdateKeybrProgression(
  current: KeybrProgressionState,
  confidenceScores: Record<string, number>,
  keyStats: Record<string, { typed: number; errors: number }>
): {
  updated: KeybrProgressionState;
  newlyUnlockedKey?: string;
  focusKeyMastered?: boolean;
} {
  const activeAlphabet = [...current.activeAlphabet];
  const unlockedQueue = [...current.unlockedKeyQueue];
  const confidenceMap = { ...current.confidenceMap };

  // Update confidence map for active keys
  activeAlphabet.forEach((k) => {
    confidenceMap[k] = confidenceScores[k] ?? confidenceMap[k] ?? 0.5;
  });

  // Check if current probationary focus key has reached confidence threshold
  const focusStat = keyStats[current.currentFocusKey];
  const focusConfidence = confidenceMap[current.currentFocusKey] || 0.5;
  const isFocusQualified = focusConfidence >= 0.78 && (focusStat?.typed || 0) >= 12;

  // Check if ALL currently active keys satisfy mastery threshold
  const allActiveQualified = activeAlphabet.every((k) => {
    const score = confidenceMap[k] ?? 0.5;
    const stat = keyStats[k];
    return score >= 0.76 && (stat?.typed || 0) >= 10;
  });

  if (allActiveQualified && unlockedQueue.length > 0) {
    const nextKey = unlockedQueue.shift()!;
    activeAlphabet.push(nextKey);
    confidenceMap[nextKey] = 0.5;

    return {
      updated: {
        activeAlphabet,
        unlockedKeyQueue: unlockedQueue,
        currentFocusKey: nextKey,
        confidenceMap,
        isMastered: unlockedQueue.length === 0,
        totalKeysUnlocked: activeAlphabet.length,
      },
      newlyUnlockedKey: nextKey,
      focusKeyMastered: true,
    };
  }

  return {
    updated: {
      ...current,
      confidenceMap,
    },
    focusKeyMastered: isFocusQualified,
  };
}

/**
 * Generates custom phonotactic touch-typing text strictly constrained
 * to the currently unlocked Keybr alphabet, with 65-75% focus on the probationary key.
 */
export function generateKeybrPracticeText(
  progression: KeybrProgressionState,
  wordCount: number = 25
): string {
  const allowedSet = new Set(progression.activeAlphabet.map((k) => k.toLowerCase()));
  const focusKey = progression.currentFocusKey.toLowerCase();

  const words: string[] = [];
  const maxAttempts = 60;

  for (let i = 0; i < wordCount; i++) {
    const shouldTargetFocus = Math.random() < 0.7;
    let chosenWord = '';

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const candidate = generateSinglePseudoWord(shouldTargetFocus ? focusKey : undefined);
      // Check if all letters in candidate are in allowedSet
      const isCompliant = candidate.split('').every((char) => allowedSet.has(char));
      if (isCompliant && (!shouldTargetFocus || candidate.includes(focusKey))) {
        chosenWord = candidate;
        break;
      }
    }

    if (!chosenWord) {
      // Fallback: build a simple pronounceable combination from active alphabet
      const vowels = progression.activeAlphabet.filter((k) => ['a', 'e', 'i', 'o', 'u'].includes(k));
      const consonants = progression.activeAlphabet.filter((k) => !['a', 'e', 'i', 'o', 'u'].includes(k));

      const v = vowels.length > 0 ? vowels[Math.floor(Math.random() * vowels.length)] : 'e';
      const c1 = consonants.length > 0 ? consonants[Math.floor(Math.random() * consonants.length)] : 't';
      const c2 = consonants.length > 0 ? consonants[Math.floor(Math.random() * consonants.length)] : 'n';

      if (shouldTargetFocus && focusKey) {
        chosenWord = `${c1}${v}${focusKey}`;
      } else {
        chosenWord = `${c1}${v}${c2}`;
      }
    }

    words.push(chosenWord);
  }

  return words.join(' ');
}

