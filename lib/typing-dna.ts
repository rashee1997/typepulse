import {
  UserProgress,
  TypingSessionSummary,
  PatternStat,
  TypingDnaCategoryScore,
  TypingDnaProfile,
  TypingDnaLabel,
} from '@/types/typing';

export const SESSION_WINDOW = 40;
export const SCORE_STRONG = 70;
export const SCORE_AVERAGE = 40;
export const PUNCTUATION_CHARS = new Set([',', '.', "'", '"', ';', ':', '!', '?', '-', '(', ')']);
export const NUMBER_CHARS = new Set('0123456789'.split(''));
export const MIN_CHAR_SAMPLES = 20; // per punctuation/number/capitalization category
export const MIN_PATTERN_SAMPLES = 15; // total bigram attempts across tracked patterns
export const MIN_PATTERN_ATTEMPTS = 5; // minimum attempts per single pattern to qualify

function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

function round(val: number): number {
  return Math.round(val);
}

export function labelFor(score: number | null): TypingDnaLabel {
  if (score === null) return 'insufficient-data';
  if (score >= SCORE_STRONG) return 'strong';
  if (score >= SCORE_AVERAGE) return 'average';
  return 'weak';
}

function speedCategory(window: TypingSessionSummary[], bestWpm: number): TypingDnaCategoryScore {
  if (window.length === 0) {
    return {
      id: 'speed',
      title: 'Speed & Raw Burst',
      score: null,
      label: 'insufficient-data',
      sampleSize: 0,
      detail: 'Need at least 1 session to measure speed',
    };
  }

  const rawWpmSum = window.reduce((acc, s) => acc + (s.rawWpm || s.wpm || 0), 0);
  const avgRawWpm = rawWpmSum / window.length;
  const peakBurst = Math.max(...window.map((s) => s.peakWpm ?? s.wpm ?? 0));
  const ceiling = Math.max(150, (bestWpm || 0) * 1.15);
  const score = clamp(round(((avgRawWpm * 0.6 + peakBurst * 0.4) / ceiling) * 100), 0, 100);

  return {
    id: 'speed',
    title: 'Speed & Raw Burst',
    score,
    label: labelFor(score),
    sampleSize: window.length,
    detail: `based on ${window.length} session${window.length === 1 ? '' : 's'} (${round(avgRawWpm)} avg raw, ${round(peakBurst)} peak)`,
  };
}

function accuracyCategory(window: TypingSessionSummary[]): TypingDnaCategoryScore {
  if (window.length === 0) {
    return {
      id: 'accuracy',
      title: 'Clean Accuracy',
      score: null,
      label: 'insufficient-data',
      sampleSize: 0,
      detail: 'Need at least 1 session to measure accuracy',
    };
  }

  const accSum = window.reduce((acc, s) => acc + (s.accuracy ?? 0), 0);
  const avgAccuracy = accSum / window.length;
  const score = clamp(round(avgAccuracy), 0, 100);

  return {
    id: 'accuracy',
    title: 'Clean Accuracy',
    score,
    label: labelFor(score),
    sampleSize: window.length,
    detail: `based on ${window.length} session${window.length === 1 ? '' : 's'} (${round(avgAccuracy)}% avg)`,
  };
}

function consistencyCategory(window: TypingSessionSummary[]): TypingDnaCategoryScore {
  // Exclude legacy sessions that don't have recorded consistency (> 0)
  const qualifying = window.filter(
    (s) => typeof s.consistency === 'number' && s.consistency > 0
  );

  if (qualifying.length === 0) {
    return {
      id: 'consistency',
      title: 'Rhythm & Consistency',
      score: null,
      label: 'insufficient-data',
      sampleSize: 0,
      detail: window.length > 0
        ? 'Warming up with fresh sessions'
        : 'Complete standard practice runs to calculate consistency',
    };
  }

  const sum = qualifying.reduce((acc, s) => acc + s.consistency!, 0);
  const avgConsistency = sum / qualifying.length;
  const score = clamp(round(avgConsistency), 0, 100);

  return {
    id: 'consistency',
    title: 'Rhythm & Consistency',
    score,
    label: labelFor(score),
    sampleSize: qualifying.length,
    detail: `based on ${qualifying.length} session${qualifying.length === 1 ? '' : 's'} (${round(avgConsistency)}% avg)`,
  };
}

function transitionsCategory(patternStats: Record<string, PatternStat | { typed: number; errors: number }>): TypingDnaCategoryScore {
  const qualifying = Object.entries(patternStats).filter(
    ([, stat]) => stat.typed >= MIN_PATTERN_ATTEMPTS
  );

  const totalTyped = qualifying.reduce((acc, [, s]) => acc + s.typed, 0);

  if (totalTyped < MIN_PATTERN_SAMPLES || qualifying.length === 0) {
    return {
      id: 'transitions',
      title: 'Key Transitions',
      score: null,
      label: 'insufficient-data',
      sampleSize: totalTyped,
      detail: totalTyped === 0
        ? 'No bigram patterns recorded yet'
        : `based on ${totalTyped} bigrams — need ${MIN_PATTERN_SAMPLES}+`,
    };
  }

  const avgErrorRatePct =
    (qualifying.reduce((acc, [, s]) => acc + (s.errors / Math.max(1, s.typed)), 0) /
      qualifying.length) *
    100;

  const score = clamp(round(100 - avgErrorRatePct * 4), 0, 100);

  return {
    id: 'transitions',
    title: 'Key Transitions',
    score,
    label: labelFor(score),
    sampleSize: totalTyped,
    detail: `based on ${totalTyped} bigrams across ${qualifying.length} pattern${qualifying.length === 1 ? '' : 's'}`,
  };
}

function punctuationCategory(keyStats: Record<string, { typed: number; errors: number }>): TypingDnaCategoryScore {
  let totalTyped = 0;
  let totalErrors = 0;

  Object.entries(keyStats).forEach(([char, stat]) => {
    if (PUNCTUATION_CHARS.has(char)) {
      totalTyped += stat.typed;
      totalErrors += stat.errors;
    }
  });

  if (totalTyped < MIN_CHAR_SAMPLES) {
    return {
      id: 'punctuation',
      title: 'Punctuation Handling',
      score: null,
      label: 'insufficient-data',
      sampleSize: totalTyped,
      detail: totalTyped === 0
        ? 'No punctuation typed yet'
        : `based on ${totalTyped} chars — need ${MIN_CHAR_SAMPLES}+`,
    };
  }

  const score = clamp(round((1 - totalErrors / totalTyped) * 100), 0, 100);

  return {
    id: 'punctuation',
    title: 'Punctuation Handling',
    score,
    label: labelFor(score),
    sampleSize: totalTyped,
    detail: `based on ${totalTyped} punctuation keystrokes (${round((1 - totalErrors / totalTyped) * 100)}% accuracy)`,
  };
}

function numbersCategory(keyStats: Record<string, { typed: number; errors: number }>): TypingDnaCategoryScore {
  let totalTyped = 0;
  let totalErrors = 0;

  Object.entries(keyStats).forEach(([char, stat]) => {
    if (NUMBER_CHARS.has(char)) {
      totalTyped += stat.typed;
      totalErrors += stat.errors;
    }
  });

  if (totalTyped < MIN_CHAR_SAMPLES) {
    return {
      id: 'numbers',
      title: 'Number Row Mastery',
      score: null,
      label: 'insufficient-data',
      sampleSize: totalTyped,
      detail: totalTyped === 0
        ? 'No numbers typed yet'
        : `based on ${totalTyped} numbers — need ${MIN_CHAR_SAMPLES}+`,
    };
  }

  const score = clamp(round((1 - totalErrors / totalTyped) * 100), 0, 100);

  return {
    id: 'numbers',
    title: 'Number Row Mastery',
    score,
    label: labelFor(score),
    sampleSize: totalTyped,
    detail: `based on ${totalTyped} number keystrokes (${round((1 - totalErrors / totalTyped) * 100)}% accuracy)`,
  };
}

/**
 * Note: Measures accuracy on capital letters as an approximation of Shift-coordination flow.
 * A future revision may measure Shift-keydown to letter-keydown timestamp delta directly.
 */
function capitalizationCategory(keyStats: Record<string, { typed: number; errors: number }>): TypingDnaCategoryScore {
  let totalTyped = 0;
  let totalErrors = 0;

  Object.entries(keyStats).forEach(([char, stat]) => {
    if (/^[A-Z]$/.test(char)) {
      totalTyped += stat.typed;
      totalErrors += stat.errors;
    }
  });

  if (totalTyped < MIN_CHAR_SAMPLES) {
    return {
      id: 'capitalization',
      title: 'Capitalization Flow',
      score: null,
      label: 'insufficient-data',
      sampleSize: totalTyped,
      detail: totalTyped === 0
        ? 'No capitals typed yet'
        : `based on ${totalTyped} capitals — need ${MIN_CHAR_SAMPLES}+`,
    };
  }

  const score = clamp(round((1 - totalErrors / totalTyped) * 100), 0, 100);

  return {
    id: 'capitalization',
    title: 'Capitalization Flow',
    score,
    label: labelFor(score),
    sampleSize: totalTyped,
    detail: `based on ${totalTyped} capital keystrokes (${round((1 - totalErrors / totalTyped) * 100)}% accuracy)`,
  };
}

function enduranceCategory(window: TypingSessionSummary[]): TypingDnaCategoryScore {
  const qualifying = window.filter(
    (s) => typeof s.enduranceRatio === 'number' && s.enduranceRatio !== null
  );

  if (qualifying.length === 0) {
    return {
      id: 'endurance',
      title: 'Stamina & Endurance',
      score: null,
      label: 'insufficient-data',
      sampleSize: 0,
      detail: 'Take a 45s+ run to unlock this',
    };
  }

  const sum = qualifying.reduce((acc, s) => acc + s.enduranceRatio!, 0);
  const avgRatio = sum / qualifying.length;
  const score = clamp(round(avgRatio * 100), 0, 100);

  return {
    id: 'endurance',
    title: 'Stamina & Endurance',
    score,
    label: labelFor(score),
    sampleSize: qualifying.length,
    detail: `based on ${qualifying.length} endurance run${qualifying.length === 1 ? '' : 's'} (${round(avgRatio * 100)}% pace retention)`,
  };
}

/**
 * Aggregates a typist's historical performance across 8 core dimensions
 * into a standardized 0-100 rubric profile.
 */
export function computeTypingDnaProfile(progress: UserProgress): TypingDnaProfile {
  const window = (progress.history || []).slice(0, SESSION_WINDOW);
  const categories: TypingDnaCategoryScore[] = [
    speedCategory(window, progress.highScores?.bestWpm || 0),
    accuracyCategory(window),
    consistencyCategory(window),
    transitionsCategory(progress.patternStats || {}),
    punctuationCategory(progress.keyStats || {}),
    numbersCategory(progress.keyStats || {}),
    capitalizationCategory(progress.keyStats || {}),
    enduranceCategory(window),
  ];

  const scored = categories.filter((c) => c.score !== null);
  const weakestCategory = scored.length
    ? scored.reduce((min, c) => (c.score! < min.score! ? c : min))
    : null;

  return {
    categories,
    weakestCategory,
    sessionsAnalyzed: window.length,
    generatedAt: Date.now(),
  };
}
