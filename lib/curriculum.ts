import { Lesson, AIDrillStyle } from '@/types/typing';
import { KEY_GRID } from './keyboard-geometry';
import { COMMON_WORDS_200 } from './word-banks';

export const LESSONS_CURRICULUM: Lesson[] = [
  // TIER 1: HOME ROW FOUNDATION
  {
    id: 'lesson-1-1',
    tier: 1,
    tierTitle: 'Tier 1: Home Row Foundation',
    title: '1.1 The Anchor Keys: F & J',
    description: 'Learn the tactile bumps on F and J. Your index fingers should always rest here.',
    targetKeys: ['f', 'j', ' '],
    targetAccuracy: 95,
    targetWpm: 18,
    content: 'fff jjj fff jjj fjf jfj ff jj f j fff jjj fff jjj fjf jfj',
    unlocked: true,
    completed: false,
    stars: 0,
    xpReward: 100,
  },
  {
    id: 'lesson-1-2',
    tier: 1,
    tierTitle: 'Tier 1: Home Row Foundation',
    title: '1.2 Left Hand Home: A S D F',
    description: 'Place your pinky on A, ring on S, middle on D, and index on F.',
    targetKeys: ['a', 's', 'd', 'f', ' '],
    targetAccuracy: 94,
    targetWpm: 20,
    content: 'asdf fdsa asdf fdsa asdf sad fad dad add sass dads fads lads',
    unlocked: false,
    completed: false,
    stars: 0,
    xpReward: 120,
  },
  {
    id: 'lesson-1-3',
    tier: 1,
    tierTitle: 'Tier 1: Home Row Foundation',
    title: '1.3 Right Hand Home: J K L ;',
    description: 'Place your index on J, middle on K, ring on L, and pinky on semicolon.',
    targetKeys: ['j', 'k', 'l', ';', ' '],
    targetAccuracy: 94,
    targetWpm: 20,
    content: 'jkl; ;lkj jkl; ;lkj all ask fall alas salad flasks fall fads',
    unlocked: false,
    completed: false,
    stars: 0,
    xpReward: 120,
  },
  {
    id: 'lesson-1-4',
    tier: 1,
    tierTitle: 'Tier 1: Home Row Foundation',
    title: '1.4 Reaching Inward: G & H',
    description: 'Stretch your left index to G and right index to H, then return to home.',
    targetKeys: ['g', 'h', 'a', 's', 'd', 'f', 'j', 'k', 'l'],
    targetAccuracy: 94,
    targetWpm: 22,
    content: 'fgf jhj fgf jhj glad half flag dash flash glass shag had gas gag',
    unlocked: false,
    completed: false,
    stars: 0,
    xpReward: 150,
  },

  // TIER 2: TOP & BOTTOM ROWS
  {
    id: 'lesson-2-1',
    tier: 2,
    tierTitle: 'Tier 2: Keyboard Reach',
    title: '2.1 Crucial Vowels: E & I',
    description: 'Left middle finger reaches up to E; right middle finger reaches up to I.',
    targetKeys: ['e', 'i', 'd', 'k'],
    targetAccuracy: 94,
    targetWpm: 24,
    content: 'ded kik ded kik feed seek file hide feel kid life like desk side fill',
    unlocked: false,
    completed: false,
    stars: 0,
    xpReward: 160,
  },
  {
    id: 'lesson-2-2',
    tier: 2,
    tierTitle: 'Tier 2: Keyboard Reach',
    title: '2.2 Index Reach: R & U',
    description: 'Left index reaches up to R; right index reaches up to U.',
    targetKeys: ['r', 'u', 'f', 'j'],
    targetAccuracy: 94,
    targetWpm: 25,
    content: 'frf juj frf juj fur jar run rush rule surf user true pure rug drug',
    unlocked: false,
    completed: false,
    stars: 0,
    xpReward: 180,
  },
  {
    id: 'lesson-2-3',
    tier: 2,
    tierTitle: 'Tier 2: Keyboard Reach',
    title: '2.3 Outer Top: Q, W, O, P',
    description: 'Left ring on W, pinky on Q. Right ring on O, pinky on P.',
    targetKeys: ['q', 'w', 'o', 'p'],
    targetAccuracy: 93,
    targetWpm: 25,
    content: 'sws lol aqa p;p slow pool prow quick power flow loop word pop drop',
    unlocked: false,
    completed: false,
    stars: 0,
    xpReward: 200,
  },
  {
    id: 'lesson-2-4',
    tier: 2,
    tierTitle: 'Tier 2: Keyboard Reach',
    title: '2.4 Bottom Row: Z, X, C, V, B, N, M',
    description: 'Carefully slide downward from home row without lifting whole hand.',
    targetKeys: ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
    targetAccuracy: 93,
    targetWpm: 26,
    content: 'cave zinc back calm view zoom move bold next mask vine scan bomb',
    unlocked: false,
    completed: false,
    stars: 0,
    xpReward: 220,
  },

  // TIER 3: DIGRAPHS & NUMBERS
  {
    id: 'lesson-3-1',
    tier: 3,
    tierTitle: 'Tier 3: Flow & Digraphs',
    title: '3.1 Common Digraphs: th, he, in, er, an',
    description: 'Type these pairs as single fluid motions rather than individual letters.',
    targetKeys: ['t', 'h', 'e', 'i', 'n', 'r', 'a'],
    targetAccuracy: 95,
    targetWpm: 30,
    content: 'the there then their another thin father mother winter enter winner',
    unlocked: false,
    completed: false,
    stars: 0,
    xpReward: 240,
  },
  {
    id: 'lesson-3-2',
    tier: 3,
    tierTitle: 'Tier 3: Flow & Digraphs',
    title: '3.2 Shift & Capitalization',
    description: 'Use opposite hand Shift: right Shift for left hand letters, and vice versa.',
    targetKeys: ['Shift'],
    targetAccuracy: 94,
    targetWpm: 28,
    content: 'The quick Brown Fox jumps over the Lazy Dog with Great Speed and Joy',
    unlocked: false,
    completed: false,
    stars: 0,
    xpReward: 250,
  },
  {
    id: 'lesson-3-3',
    tier: 3,
    tierTitle: 'Tier 3: Flow & Digraphs',
    title: '3.3 Number Row: 1 2 3 4 5 6 7 8 9 0',
    description: 'Reach upward from the top row. Keep your wrists hovering slightly.',
    targetKeys: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    targetAccuracy: 92,
    targetWpm: 25,
    content: 'room 101 code 404 year 2026 count 789 flight 350 speed 100 level 42',
    unlocked: false,
    completed: false,
    stars: 0,
    xpReward: 280,
  },
  {
    id: 'lesson-3-4',
    tier: 3,
    tierTitle: 'Tier 3: Flow & Digraphs',
    title: '3.4 Punctuation Mastery',
    description: 'Commas, periods, question marks, and apostrophes without glancing down.',
    targetKeys: [',', '.', '?', '!', "'"],
    targetAccuracy: 94,
    targetWpm: 30,
    content: "Ready, set, go! Don't look at the keys; feel them. Is it working? Yes, indeed.",
    unlocked: false,
    completed: false,
    stars: 0,
    xpReward: 300,
  },

  // TIER 4: DEVELOPER & SPEED MASTERY
  {
    id: 'lesson-4-1',
    tier: 4,
    tierTitle: 'Tier 4: Master & Code',
    title: '4.1 Developer Brackets & Operators',
    description: 'Brackets, braces, equals, and semicolons common in all programming languages.',
    targetKeys: ['{', '}', '(', ')', '[', ']', '=', ';', '<', '>'],
    targetAccuracy: 93,
    targetWpm: 26,
    content: 'if (x >= 10) { return items[0]; } const fn = () => { let val = 42; };',
    unlocked: false,
    completed: false,
    stars: 0,
    xpReward: 350,
  },
  {
    id: 'lesson-4-2',
    tier: 4,
    tierTitle: 'Tier 4: Master & Code',
    title: '4.2 Rhythmic Prose & Flow',
    description: 'Maintain smooth cadence across full sentence structures and transitions.',
    targetKeys: ['all'],
    targetAccuracy: 96,
    targetWpm: 40,
    content: 'Rhythm is the secret to high speed typing. When your keystrokes land with equal spacing, mistakes vanish and endurance soars effortlessly.',
    unlocked: false,
    completed: false,
    stars: 0,
    xpReward: 400,
  },
  {
    id: 'lesson-4-3',
    tier: 4,
    tierTitle: 'Tier 4: Master & Code',
    title: '4.3 The 50 WPM Velocity Sprint',
    description: 'Pass the 50 Words Per Minute threshold with over 95% accuracy to earn the Velocity badge.',
    targetKeys: ['all'],
    targetAccuracy: 95,
    targetWpm: 50,
    content: 'Velocity is not simply moving fast; it is moving in the right direction without hesitation. Master each letter, maintain calm composure, and let every word flow seamlessly.',
    unlocked: false,
    completed: false,
    stars: 0,
    xpReward: 500,
  }
];

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

  // Fallback: if empty, extract non-whitespace characters from lesson content
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
    // Any outside character is discarded
  }

  return cleaned
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
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

  // Partition keys into Left hand and Right hand
  const leftKeys: string[] = [];
  const rightKeys: string[] = [];
  const neutralKeys: string[] = [];

  allowedKeys.forEach((k) => {
    const lower = k.toLowerCase();
    const gridEntry = KEY_GRID[lower] || KEY_GRID[k];
    if (gridEntry) {
      if (gridEntry.finger.startsWith('left')) {
        leftKeys.push(k);
      } else if (gridEntry.finger.startsWith('right')) {
        rightKeys.push(k);
      } else {
        neutralKeys.push(k);
      }
    } else {
      // Fallback partition for standard English letters
      if ('qwertasdfgzxcvb'.includes(lower)) {
        leftKeys.push(k);
      } else if ('yuiophjklnm'.includes(lower)) {
        rightKeys.push(k);
      } else {
        neutralKeys.push(k);
      }
    }
  });

  // Effective weak keys belonging to this allowed set
  const validWeakKeys = userWeakKeys.filter((wk) => allowedSet.has(wk.toLowerCase()));
  const focusKeys = validWeakKeys.length > 0 ? validWeakKeys : allowedKeys.slice(0, Math.min(3, allowedKeys.length));

  const tokens: string[] = [];

  if (style === 'alternating') {
    // Left-right hand alternation
    const L = leftKeys.length > 0 ? leftKeys : allowedKeys;
    const R = rightKeys.length > 0 ? rightKeys : allowedKeys;

    for (let i = 0; i < wordCount; i++) {
      const l1 = L[Math.floor(Math.random() * L.length)];
      const r1 = R[Math.floor(Math.random() * R.length)];
      const l2 = L[Math.floor(Math.random() * L.length)];
      const r2 = R[Math.floor(Math.random() * R.length)];

      const mode = i % 4;
      if (mode === 0) {
        tokens.push(`${l1}${r1}`);
      } else if (mode === 1) {
        tokens.push(`${r1}${l1}`);
      } else if (mode === 2) {
        tokens.push(`${l1}${r1}${l2}`);
      } else {
        tokens.push(`${r1}${l1}${r2}${l2}`);
      }
    }
  } else if (style === 'repetition') {
    // Muscle-memory doubles, triples, and rolls
    for (let i = 0; i < wordCount; i++) {
      const k1 = allowedKeys[Math.floor(Math.random() * allowedKeys.length)];
      const k2 = allowedKeys[Math.floor(Math.random() * allowedKeys.length)];

      const patternType = i % 5;
      if (patternType === 0) {
        tokens.push(`${k1}${k1}${k1}`);
      } else if (patternType === 1) {
        tokens.push(`${k1}${k1}${k2}${k2}`);
      } else if (patternType === 2) {
        tokens.push(`${k1}${k2}${k1}${k2}`);
      } else if (patternType === 3) {
        tokens.push(`${k1}${k1}`);
      } else {
        tokens.push(`${k2}${k1}${k2}`);
      }
    }
  } else if (style === 'words') {
    // Filter real English words that contain ONLY allowed keys
    const validWords = COMMON_WORDS_200.filter((w) => {
      const chars = w.toLowerCase().split('');
      return chars.every((c) => allowedSet.has(c)) && w.length >= 2;
    });

    // Also include lesson content words if they match
    const lessonWords = lesson.content
      .split(' ')
      .map((w) => w.trim())
      .filter((w) => w.length >= 2 && w.split('').every((c) => allowedSet.has(c.toLowerCase())));

    const mergedWords = Array.from(new Set([...validWords, ...lessonWords]));

    if (mergedWords.length >= 5) {
      for (let i = 0; i < wordCount; i++) {
        const word = mergedWords[Math.floor(Math.random() * mergedWords.length)];
        tokens.push(word);
      }
    } else {
      // Create pronounceable phonotactic combinations strictly from allowed keys
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
    // Emphasize the student's weak keys or target keys in combination with anchor keys
    for (let i = 0; i < wordCount; i++) {
      const focal = focusKeys[Math.floor(Math.random() * focusKeys.length)];
      const partner = allowedKeys[Math.floor(Math.random() * allowedKeys.length)];
      const mode = i % 4;

      if (mode === 0) {
        tokens.push(`${focal}${focal}${partner}`);
      } else if (mode === 1) {
        tokens.push(`${partner}${focal}${partner}`);
      } else if (mode === 2) {
        tokens.push(`${focal}${partner}${focal}${partner}`);
      } else {
        tokens.push(`${focal}${partner}${focal}`);
      }
    }
  } else {
    // 'flow' style: rolling digraphs and trigraphs
    for (let i = 0; i < wordCount; i++) {
      const k1 = allowedKeys[Math.floor(Math.random() * allowedKeys.length)];
      const k2 = allowedKeys[Math.floor(Math.random() * allowedKeys.length)];
      const k3 = allowedKeys[Math.floor(Math.random() * allowedKeys.length)];

      if (i % 2 === 0) {
        tokens.push(`${k1}${k2}${k3}`);
      } else {
        tokens.push(`${k2}${k1}${k3}${k1}`);
      }
    }
  }

  const generated = tokens.slice(0, wordCount).join(' ');
  return sanitizePatternToAllowedKeys(generated, allowedKeys);
}

