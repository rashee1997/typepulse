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

  // Standard QWERTY keys to evaluate plus any extra keys present in keyStats
  const baseKeys = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const extraKeys = Object.keys(keyStats || {});
  const allKeys = Array.from(new Set([...baseKeys, ...extraKeys]));

  allKeys.forEach((char) => {
    const stat = keyStats[char] || keyStats[char.toLowerCase()] || keyStats[char.toUpperCase()];
    const pat = patternStats ? (patternStats[char] || patternStats[char.toLowerCase()]) : undefined;

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

// High-frequency English words used to construct realistic Keybr drills
const COMMON_DICTIONARY_WORDS: string[] = [
  // E N I T R L set words
  'tree', 'line', 'tell', 'tire', 'rent', 'tent', 'nine', 'teen', 'rein', 'tile',
  'enter', 'letter', 'little', 'title', 'entire', 'retire', 'liner', 'inlet', 'tier',
  'elite', 'inert', 'litter', 'titer', 'trill', 'tiller', 'nettle', 'riddle', 'relit',
  'leer', 'tern', 'teen', 'lint', 'rite', 'rite', 'reel', 'reeled', 'intent', 'inter',
  // S additions
  'test', 'rest', 'site', 'list', 'nest', 'rise', 'sister', 'silent', 'listen',
  'street', 'settle', 'series', 'resist', 'stir', 'slit', 'sets', 'senses', 'stress',
  // A additions
  'star', 'train', 'start', 'state', 'stare', 'slate', 'stain', 'raise', 'taste',
  'strain', 'attend', 'tail', 'rain', 'rate', 'late', 'lane', 'near', 'tear',
  'area', 'alert', 'learn', 'plant', 'real', 'alter', 'aerial', 'strait', 'attain',
  // O additions
  'to', 'for', 'on', 'or', 'one', 'word', 'not', 'do', 'how', 'so', 'some', 'more',
  'look', 'two', 'no', 'who', 'oil', 'now', 'long', 'come', 'over', 'sound', 'only',
  // U additions
  'use', 'up', 'out', 'would', 'into', 'number', 'could', 'house', 'study', 'found',
  // D additions
  'had', 'said', 'down', 'did', 'made', 'day', 'order', 'under', 'read', 'need', 'land',
  // C additions
  'can', 'each', 'which', 'call', 'come', 'place', 'city', 'close', 'children',
  // H additions
  'the', 'that', 'with', 'this', 'have', 'from', 'what', 'when', 'there', 'she', 'their',
  // General high-frequency core
  'about', 'many', 'then', 'them', 'these', 'her', 'make', 'like', 'him', 'time',
  'has', 'write', 'go', 'see', 'people', 'my', 'than', 'first', 'water', 'been',
  'its', 'find', 'get', 'part', 'new', 'take', 'work', 'know', 'year', 'live',
  'me', 'back', 'give', 'most', 'very', 'after', 'thing', 'our', 'just', 'name',
  'good', 'sentence', 'man', 'think', 'say', 'great', 'where', 'help', 'through',
  'much', 'before', 'right', 'too', 'mean', 'old', 'any', 'same', 'boy', 'follow',
  'came', 'want', 'show', 'also', 'around', 'form', 'three', 'small', 'set', 'put',
  'end', 'does', 'another', 'well', 'large', 'must', 'big', 'even', 'such', 'because',
  'turn', 'here', 'why', 'ask', 'went', 'men', 'different', 'home', 'us', 'move',
  'try', 'kind', 'hand', 'picture', 'again', 'change', 'off', 'play', 'spell', 'air',
  'away', 'animal', 'point', 'page', 'mother', 'answer', 'still', 'should', 'world',
  'high', 'every', 'food', 'between', 'own', 'below', 'country', 'last', 'school',
  'father', 'keep', 'never', 'earth', 'eye', 'light', 'thought', 'head', 'story',
  'saw', 'far', 'sea', 'draw', 'left', 'run', 'while', 'press', 'night', 'few',
  'north', 'open', 'seem', 'together', 'next', 'white', 'begin', 'got', 'walk',
  'example', 'ease', 'paper', 'group', 'always', 'music', 'those', 'both', 'mark',
  'often', 'until', 'mile', 'river', 'car', 'feet', 'care', 'second', 'book', 'carry',
  'took', 'eat', 'room', 'friend', 'began', 'idea', 'fish', 'mountain', 'stop',
  'once', 'base', 'hear', 'horse', 'cut', 'sure', 'watch', 'color', 'face', 'wood'
];

/**
 * Generates custom phonotactic touch-typing text strictly constrained
 * to the currently unlocked Keybr alphabet, with 65-75% focus on the probationary key.
 * Prioritizes real English words matching the unlocked alphabet for natural reading flow.
 */
export function generateKeybrPracticeText(
  progression: KeybrProgressionState,
  wordCount: number = 25
): string {
  const allowedSet = new Set(progression.activeAlphabet.map((k) => k.toLowerCase()));
  const focusKey = progression.currentFocusKey.toLowerCase();

  // Find all real English words that can be spelled using ONLY the currently unlocked alphabet
  const validRealWords = COMMON_DICTIONARY_WORDS.filter((w) => {
    const lower = w.toLowerCase();
    return lower.length >= 3 && lower.split('').every((char) => allowedSet.has(char));
  });

  // Subset that contains the focus key specifically
  const focusRealWords = validRealWords.filter((w) => w.toLowerCase().includes(focusKey));

  const words: string[] = [];

  for (let i = 0; i < wordCount; i++) {
    const shouldTargetFocus = Math.random() < 0.7;
    let chosenWord = '';

    // 1. Try to pick a real English word 70% of the time if available
    if (Math.random() < 0.75) {
      if (shouldTargetFocus && focusRealWords.length > 0) {
        chosenWord = focusRealWords[Math.floor(Math.random() * focusRealWords.length)];
      } else if (validRealWords.length > 0) {
        chosenWord = validRealWords[Math.floor(Math.random() * validRealWords.length)];
      }
    }

    // 2. If no real word was selected, generate a phonotactic candidate
    if (!chosenWord) {
      for (let attempt = 0; attempt < 30; attempt++) {
        const candidate = generateSinglePseudoWord(shouldTargetFocus ? focusKey : undefined);
        const isCompliant = candidate.split('').every((char) => allowedSet.has(char));
        if (isCompliant && (!shouldTargetFocus || candidate.includes(focusKey))) {
          chosenWord = candidate;
          break;
        }
      }
    }

    // 3. Fallback: build a pronounceable syllable from active alphabet
    if (!chosenWord) {
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

