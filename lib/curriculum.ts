import { Lesson, AIDrillStyle } from '@/types/typing';
import { KEY_GRID } from './keyboard-geometry';
import { COMMON_WORDS_200 } from './word-banks';
import { LESSONS_42 } from './curriculum-data';

export const LESSONS_CURRICULUM: Lesson[] = LESSONS_42;

/**
 * Entry-point pace for a profile with no recorded performance.
 *
 * Several features need *a* number to work with before the user has finished a
 * single session — mission generation, the biometric diagnostic, ghost pacing.
 * Each of those used to invent its own constant (50, 35, 30, or a `Math.max(25,…)`
 * floor), which is why a first-time visitor was routinely shown fabricated
 * statistics about themselves. This is the curriculum's own opening target, so the
 * number a new user sees is a designed starting point rather than an invention.
 */
export const STARTING_WPM: number = LESSONS_42[0]?.targetWpm ?? 15;

/**
 * The pace to plan around for a given profile: the recorded best when one exists,
 * otherwise the curriculum entry point. Never returns a hardcoded guess.
 */
export function baselineWpm(recordedBestWpm?: number): number {
  return typeof recordedBestWpm === 'number' && recordedBestWpm > 0
    ? recordedBestWpm
    : STARTING_WPM;
}

/**
 * Extracts strictly the individual valid characters for this lesson,
 * resolving macro identifiers like 'all' or 'Shift'.
 */
export function getLessonTargetKeys(lesson: Lesson): string[] {
  const set = new Set<string>();

  for (const rawKey of lesson.targetKeys) {
    const k = rawKey.trim();
    if (k === 'all') {
      'abcdefghijklmnopqrstuvwxyz'.split('').forEach((c) => set.add(c));
    } else if (k === 'Shift') {
      lesson.content.split('').forEach((c) => {
        if (c !== ' ') set.add(c);
      });
    } else if (k.length === 1) {
      set.add(k.toLowerCase());
    }
  }

  if (set.size === 0) {
    lesson.content.split('').forEach((c) => {
      if (c !== ' ') set.add(c.toLowerCase());
    });
  }

  return Array.from(set);
}

/**
 * Returns all unique keys learned from Lesson 1.1 up to and including the current lesson.
 */
export function getCumulativeKeysForLesson(lessonId: string): string[] {
  const set = new Set<string>();
  const targetIndex = LESSONS_CURRICULUM.findIndex((l) => l.id === lessonId);
  const maxIndex = targetIndex >= 0 ? targetIndex : LESSONS_CURRICULUM.length - 1;

  for (let i = 0; i <= maxIndex; i++) {
    const keys = getLessonTargetKeys(LESSONS_CURRICULUM[i]);
    keys.forEach((k) => set.add(k));
  }

  return Array.from(set);
}

/**
 * Strictly sanitizes any text to guarantee that NO character outside of allowedKeys can slip through.
 * Preserves spaces as token separators.
 */
export function sanitizePatternToAllowedKeys(rawText: string, allowedKeys: string[]): string {
  if (!rawText) return '';
  const allowedSet = new Set<string>();
  allowedKeys.forEach((k) => {
    allowedSet.add(k.toLowerCase());
    allowedSet.add(k);
  });

  const chars = rawText.split('');
  const cleaned: string[] = [];

  for (const ch of chars) {
    if (ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r') {
      cleaned.push(' ');
    } else if (allowedSet.has(ch) || allowedSet.has(ch.toLowerCase())) {
      cleaned.push(ch);
    }
  }

  return cleaned.join('').replace(/\s+/g, ' ').trim();
}

/**
 * Deterministic local drill generator that strictly abides by the allowed character whitelist.
 * Acts as an instant generator and bulletproof fallback.
 */
export function generateDeterministicLessonDrill(
  lesson: Lesson,
  style: AIDrillStyle,
  scope: 'target_only' | 'cumulative',
  wordCount: number = 25,
  userWeakKeys: string[] = []
): string {
  const allowedKeys = scope === 'target_only'
    ? getLessonTargetKeys(lesson)
    : getCumulativeKeysForLesson(lesson.id);

  if (allowedKeys.length === 0) {
    return lesson.content;
  }

  const allowedSet = new Set(allowedKeys.map((k) => k.toLowerCase()));

  const leftKeys: string[] = [];
  const rightKeys: string[] = [];

  allowedKeys.forEach((k) => {
    const lower = k.toLowerCase();
    const gridEntry = KEY_GRID[lower] || KEY_GRID[k];
    if (gridEntry) {
      if (gridEntry.finger.startsWith('left')) leftKeys.push(k);
      else if (gridEntry.finger.startsWith('right')) rightKeys.push(k);
    } else {
      if ('qwertasdfgzxcvb'.includes(lower)) leftKeys.push(k);
      else if ('yuiophjklnm'.includes(lower)) rightKeys.push(k);
    }
  });

  const validWeakKeys = userWeakKeys.filter((wk) => allowedSet.has(wk.toLowerCase()));
  const focusKeys = validWeakKeys.length > 0 ? validWeakKeys : allowedKeys.slice(0, Math.min(3, allowedKeys.length));
  const tokens: string[] = [];

  if (style === 'alternating') {
    const L = leftKeys.length > 0 ? leftKeys : allowedKeys;
    const R = rightKeys.length > 0 ? rightKeys : allowedKeys;

    for (let i = 0; i < wordCount; i++) {
      const l1 = L[Math.floor(Math.random() * L.length)];
      const r1 = R[Math.floor(Math.random() * R.length)];
      const l2 = L[Math.floor(Math.random() * L.length)];
      const r2 = R[Math.floor(Math.random() * R.length)];

      const mode = i % 4;
      if (mode === 0) tokens.push(`${l1}${r1}`);
      else if (mode === 1) tokens.push(`${r1}${l1}`);
      else if (mode === 2) tokens.push(`${l1}${r1}${l2}`);
      else tokens.push(`${r1}${l1}${r2}${l2}`);
    }
  } else if (style === 'repetition') {
    for (let i = 0; i < wordCount; i++) {
      const k1 = allowedKeys[Math.floor(Math.random() * allowedKeys.length)];
      const k2 = allowedKeys[Math.floor(Math.random() * allowedKeys.length)];

      const patternType = i % 5;
      if (patternType === 0) tokens.push(`${k1}${k1}${k1}`);
      else if (patternType === 1) tokens.push(`${k1}${k1}${k2}${k2}`);
      else if (patternType === 2) tokens.push(`${k1}${k2}${k1}${k2}`);
      else if (patternType === 3) tokens.push(`${k1}${k1}`);
      else tokens.push(`${k2}${k1}${k2}`);
    }
  } else if (style === 'words') {
    const validWords = COMMON_WORDS_200.filter((w) => {
      const chars = w.toLowerCase().split('');
      return chars.every((c) => allowedSet.has(c)) && w.length >= 2;
    });

    const lessonWords = lesson.content
      .split(' ')
      .map((w) => w.trim())
      .filter((w) => w.length >= 2 && w.split('').every((c) => allowedSet.has(c.toLowerCase())));

    const mergedWords = Array.from(new Set([...validWords, ...lessonWords]));

    if (mergedWords.length >= 5) {
      for (let i = 0; i < wordCount; i++) {
        tokens.push(mergedWords[Math.floor(Math.random() * mergedWords.length)]);
      }
    } else {
      for (let i = 0; i < wordCount; i++) {
        const len = 2 + (i % 3);
        let token = '';
        for (let j = 0; j < len; j++) {
          token += allowedKeys[Math.floor(Math.random() * allowedKeys.length)];
        }
        tokens.push(token);
      }
    }
  } else if (style === 'weak_keys') {
    for (let i = 0; i < wordCount; i++) {
      const focal = focusKeys[Math.floor(Math.random() * focusKeys.length)];
      const partner = allowedKeys[Math.floor(Math.random() * allowedKeys.length)];
      const mode = i % 4;

      if (mode === 0) tokens.push(`${focal}${focal}${partner}`);
      else if (mode === 1) tokens.push(`${partner}${focal}${partner}`);
      else if (mode === 2) tokens.push(`${focal}${partner}${focal}${partner}`);
      else tokens.push(`${focal}${partner}${focal}`);
    }
  } else {
    for (let i = 0; i < wordCount; i++) {
      const k1 = allowedKeys[Math.floor(Math.random() * allowedKeys.length)];
      const k2 = allowedKeys[Math.floor(Math.random() * allowedKeys.length)];
      const k3 = allowedKeys[Math.floor(Math.random() * allowedKeys.length)];

      if (i % 2 === 0) tokens.push(`${k1}${k2}${k3}`);
      else tokens.push(`${k2}${k1}${k3}${k1}`);
    }
  }

  const generated = tokens.slice(0, wordCount).join(' ');
  return sanitizePatternToAllowedKeys(generated, allowedKeys);
}
