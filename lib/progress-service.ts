import { Achievement, ArcadeScores, GameMode, Lesson, MasteryTier, TypingSessionSummary, TypingStats, UserProgress, AppPreferences } from '@/types/typing';
import { INITIAL_ACHIEVEMENTS } from './achievements';
import { evaluateSessionAchievements } from './achievement-engine';
import { calculateKeyConfidence, checkAndUpdateKeybrProgression, INITIAL_KEYBR_PROGRESSION } from './adaptive-engine';

const PROGRESS_STORAGE_KEY = 'typepulse_user_progress';
const LEGACY_ARCADE_STORAGE_KEY = 'typepulse_arcade_stats';
const MASTERY_PASS_STORAGE_KEY = 'typepulse_mastery_pass';

export const INITIAL_MASTERY_TIERS: MasteryTier[] = [
  { tier: 1, requiredXp: 150, title: 'Tactile Initiate', reward: 'Topre Sound Profile', unlocked: false, claimed: false, icon: 'Volume2' },
  { tier: 2, requiredXp: 500, title: 'Flow Explorer', reward: 'Matrix Emerald Theme', unlocked: false, claimed: false, icon: 'Palette' },
  { tier: 3, requiredXp: 1000, title: 'Cadence Runner', reward: 'Cherry MX Blue Switchpack', unlocked: false, claimed: false, icon: 'Keyboard' },
  { tier: 4, requiredXp: 1800, title: 'Ghost Hunter', reward: 'Asynchronous Duelist Badge', unlocked: false, claimed: false, icon: 'Ghost' },
  { tier: 5, requiredXp: 2800, title: 'Holy Panda Enthusiast', reward: 'Holy Panda Switchpack', unlocked: false, claimed: false, icon: 'Zap' },
  { tier: 6, requiredXp: 4000, title: 'Code Climber', reward: 'AST Syntax Radar Accent', unlocked: false, claimed: false, icon: 'Code' },
  { tier: 7, requiredXp: 5500, title: 'Remediation Alchemist', reward: 'DDA Flow Particle Trail', unlocked: false, claimed: false, icon: 'Sparkles' },
  { tier: 8, requiredXp: 7500, title: 'Hyper-Velocity Scribe', reward: 'Gateron Red Lubricated Pack', unlocked: false, claimed: false, icon: 'Flame' },
  { tier: 9, requiredXp: 10000, title: 'Cybernetic Master', reward: 'Neon Hologram Caret Style', unlocked: false, claimed: false, icon: 'Terminal' },
  { tier: 10, requiredXp: 14000, title: 'Grandmaster of the Keys', reward: 'Legendary Sovereign Title', unlocked: false, claimed: false, icon: 'Crown' },
];

export function loadMasteryTiers(currentXp: number): MasteryTier[] {
  let claimedTiers: number[] = [];
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(MASTERY_PASS_STORAGE_KEY);
      if (stored) {
        claimedTiers = JSON.parse(stored);
      }
    } catch {}
  }

  return INITIAL_MASTERY_TIERS.map((tier) => ({
    ...tier,
    unlocked: currentXp >= tier.requiredXp,
    claimed: claimedTiers.includes(tier.tier),
  }));
}

export function claimMasteryTier(tierNumber: number, currentXp: number): { success: boolean; reward?: string } {
  const target = INITIAL_MASTERY_TIERS.find((t) => t.tier === tierNumber);
  if (!target || currentXp < target.requiredXp) {
    return { success: false };
  }

  let claimedTiers: number[] = [];
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(MASTERY_PASS_STORAGE_KEY);
      if (stored) claimedTiers = JSON.parse(stored);
      if (!claimedTiers.includes(tierNumber)) {
        claimedTiers.push(tierNumber);
        localStorage.setItem(MASTERY_PASS_STORAGE_KEY, JSON.stringify(claimedTiers));
      }
      return { success: true, reward: target.reward };
    } catch {}
  }
  return { success: false };
}

export const LEVEL_TITLES: { minLevel: number; title: string }[] = [
  { minLevel: 1, title: 'Keyboard Novice' },
  { minLevel: 4, title: 'Home Row Apprentice' },
  { minLevel: 8, title: 'Keystroke Tactician' },
  { minLevel: 13, title: 'Swift Scribe' },
  { minLevel: 20, title: 'Velocity Artisan' },
  { minLevel: 30, title: 'Cadence Virtuoso' },
  { minLevel: 40, title: 'Typing Grandmaster' },
  { minLevel: 50, title: 'Cybernetic Flow State' },
];

export function getTitleForLevel(level: number): string {
  for (let i = LEVEL_TITLES.length - 1; i >= 0; i--) {
    if (level >= LEVEL_TITLES[i].minLevel) {
      return LEVEL_TITLES[i].title;
    }
  }
  return 'Keyboard Novice';
}

export function getXpForNextLevel(level: number): number {
  return level * 300;
}

export const INITIAL_ARCADE_SCORES: ArcadeScores = {
  raceWins: 0,
  racePodiums: 0,
  raceBestWpm: 0,
  orbitalHighScore: 0,
  orbitalWordsDestroyed: 0,
  bombDefusalHighScore: 0,
  bombsDefusedTotal: 0,
  blitzHighScore: 0,
  blitzMaxMultiplier: 1,
  duelWins: 0,
  duelBestWpm: 0,
  totalGamesPlayed: 0,
};

export const INITIAL_USER_PROGRESS: UserProgress = {
  xp: 0,
  level: 1,
  title: 'Keyboard Novice',
  dailyStreak: 1,
  lastActiveDate: new Date().toISOString().split('T')[0],
  history: [],
  completedLessonIds: [],
  lessonStars: {},
  unlockedAchievements: [],
  highScores: {
    bestWpm: 0,
    bestAccuracy: 0,
    highestCombo: 0,
    totalTimePracticedSeconds: 0,
    totalSessions: 0,
  },
  keyStats: {},
  patternStats: {},
  confidenceScores: {},
  arcadeStats: { ...INITIAL_ARCADE_SCORES },
  keybrProgression: { ...INITIAL_KEYBR_PROGRESSION },
};

export function loadUserProgress(): UserProgress {
  if (typeof window === 'undefined') return INITIAL_USER_PROGRESS;
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    let legacyArcade: Partial<ArcadeScores> = {};
    try {
      const rawArcade = localStorage.getItem(LEGACY_ARCADE_STORAGE_KEY);
      if (rawArcade) {
        legacyArcade = JSON.parse(rawArcade);
      }
    } catch {}

    if (!raw) {
      return {
        ...INITIAL_USER_PROGRESS,
        arcadeStats: { ...INITIAL_ARCADE_SCORES, ...legacyArcade },
        keybrProgression: { ...INITIAL_KEYBR_PROGRESSION },
      };
    }
    const parsed = JSON.parse(raw);
    const keyStats = { ...(parsed.keyStats || {}) };
    const patternStats = { ...(parsed.patternStats || {}) };
    const confidenceScores = parsed.confidenceScores || calculateKeyConfidence(keyStats, patternStats);
    const keybrProgression = parsed.keybrProgression || { ...INITIAL_KEYBR_PROGRESSION };

    const mergedArcadeStats: ArcadeScores = {
      ...INITIAL_ARCADE_SCORES,
      ...legacyArcade,
      ...(parsed.arcadeStats || {}),
    };

    return {
      ...INITIAL_USER_PROGRESS,
      ...parsed,
      highScores: { ...INITIAL_USER_PROGRESS.highScores, ...(parsed.highScores || {}) },
      keyStats,
      patternStats,
      confidenceScores,
      arcadeStats: mergedArcadeStats,
      keybrProgression,
    };
  } catch {
    return INITIAL_USER_PROGRESS;
  }
}

export function saveUserProgress(progress: UserProgress): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch (err) {
    console.error('Failed to save user progress', err);
  }
}

// Calculate XP earned from a session
export function calculateSessionXp(stats: TypingStats, mode: GameMode): number {
  // Base XP: 1 XP per 5 correct characters
  let xp = Math.round(stats.correctChars / 5);

  // Speed bonus
  if (stats.wpm >= 30) xp += Math.round((stats.wpm - 20) * 1.5);

  // Accuracy bonus
  if (stats.accuracy >= 98) {
    xp += 40;
  } else if (stats.accuracy >= 95) {
    xp += 25;
  }

  // Combo bonus
  if (stats.maxCombo >= 50) xp += 30;
  if (stats.maxCombo >= 100) xp += 60;

  // Game mode multiplier
  if (mode === 'accuracy-challenge' || mode === 'time-attack') {
    xp = Math.round(xp * 1.2);
  } else if (mode === 'ai-mission') {
    xp = Math.round(xp * 1.3);
  } else if (mode === 'code-climber') {
    // Source code demands shifted symbols and exact indentation that prose never
    // asks for, so it pays at the challenge tier rather than plain practice.
    xp = Math.round(xp * 1.2);
  }

  return Math.max(10, xp);
}

/**
 * Real measurements an arcade mode is able to supply.
 *
 * Arcade modes used to hand `onFinishSession` a hand-written `TypingStats` built
 * from magic multipliers — `wpm: Math.round(wordsDestroyed * 4.2)`,
 * `accuracy: 97`, `elapsedSeconds: 45`, `consistency: 90`. Because
 * `processCompletedSession` does `bestWpm: Math.max(prev.bestWpm, stats.wpm)`,
 * a killed-enemy count became the user's "personal best" — and that personal best
 * is what the Ghost PB pacer races against. It also inflated
 * `totalTimePracticedSeconds` by a fabricated 40–45 seconds per run.
 *
 * Supply what the mode actually measured; everything derivable is derived here
 * with the same formula the typing engine uses (1 word = 5 characters), and
 * anything a mode cannot measure stays 0 rather than being invented.
 */
export interface ArcadeMeasurement {
  /** Characters the user typed correctly, as counted by the mode. */
  correctKeys: number;
  /** Total characters attempted. `0` means the mode does not measure this. */
  totalKeys: number;
  /** Measured wall-clock duration of the run, in seconds. */
  elapsedSeconds: number;
  /** Only present when the mode tracks per-character errors. */
  errorsByChar?: Record<string, number>;
}

/**
 * Builds an honest `TypingStats` from a real measurement.
 *
 * `accuracy` and `consistency` are 0 when the mode did not measure them — 0 is
 * the "not measured" sentinel here, since the live engine never returns an
 * accuracy below 0 or a consistency below 10.
 */
export function buildArcadeTypingStats(m: ArcadeMeasurement): TypingStats {
  const correctKeys = Math.max(0, Math.round(m.correctKeys));
  const totalKeys = Math.max(correctKeys, Math.round(m.totalKeys));
  const elapsedMinutes = Math.max(0, m.elapsedSeconds) / 60;

  const wpm = elapsedMinutes > 0 ? Math.round(correctKeys / 5 / elapsedMinutes) : 0;
  const rawWpm = elapsedMinutes > 0 ? Math.round(totalKeys / 5 / elapsedMinutes) : 0;
  const accuracy = totalKeys > 0 ? Math.round((correctKeys / totalKeys) * 1000) / 10 : 0;
  const incorrectChars = Math.max(0, totalKeys - correctKeys);
  const errorsByChar = m.errorsByChar ?? {};

  return {
    wpm,
    rawWpm,
    accuracy,
    correctChars: correctKeys,
    incorrectChars,
    correctedErrors: 0,
    totalKeystrokes: totalKeys,
    elapsedSeconds: Math.round(m.elapsedSeconds * 10) / 10,
    combo: 0,
    maxCombo: 0,
    // Not measured by the arcade modes: 0 reads as "unknown" in the UI.
    consistency: 0,
    errorsByChar,
    weakKeys: Object.entries(errorsByChar)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([char]) => char),
    timeline: [],
  };
}

/**
 * Computes an endurance ratio comparing the final third of a run to the first third.
 * Returns null when the run has too few timeline samples (<6) or duration <45s.
 */
export function computeEnduranceRatio(stats: TypingStats): number | null {
  const MIN_SAMPLES = 6;     // need enough timeline density
  const MIN_DURATION_S = 45; // shorter runs don't show fatigue
  if (!stats.timeline || stats.timeline.length < MIN_SAMPLES || stats.elapsedSeconds < MIN_DURATION_S) return null;
  const third = Math.floor(stats.timeline.length / 3);
  if (third === 0) return null;
  const first = stats.timeline.slice(0, third);
  const last = stats.timeline.slice(-third);
  const avg = (xs: { wpm: number }[]) => xs.reduce((a, s) => a + s.wpm, 0) / xs.length;
  const firstAvg = avg(first);
  const lastAvg = avg(last);
  if (firstAvg <= 0) return null;
  return Math.min(1, Math.max(0, lastAvg / firstAvg)); // cap at 1.0 — speeding up over a run isn't a stamina *problem*
}

// Update progress after completing a session
export function processCompletedSession(
  prev: UserProgress,
  stats: TypingStats,
  mode: GameMode,
  modeTitle: string,
  lessonId?: string
): {
  updatedProgress: UserProgress;
  sessionSummary: TypingSessionSummary;
  newAchievements: Achievement[];
  leveledUp: boolean;
  newLevel: number;
  newlyUnlockedKey?: string;
} {
  const today = new Date().toISOString().split('T')[0];
  let newStreak = prev.dailyStreak;

  // Calculate streak based on last active date
  if (prev.lastActiveDate !== today) {
    const lastDate = new Date(prev.lastActiveDate);
    const currentDate = new Date(today);
    const diffDays = Math.round((currentDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));

    if (diffDays === 1) {
      newStreak += 1;
    } else if (diffDays > 1) {
      newStreak = 1;
    }
  }

  const xpEarned = calculateSessionXp(stats, mode);
  let totalXp = prev.xp + xpEarned;
  let currentLevel = prev.level;
  let leveledUp = false;

  // Check for level ups
  while (totalXp >= getXpForNextLevel(currentLevel)) {
    totalXp -= getXpForNextLevel(currentLevel);
    currentLevel += 1;
    leveledUp = true;
  }

  // Update cumulative key stats
  const updatedKeyStats = { ...prev.keyStats };
  Object.entries(stats.errorsByChar).forEach(([char, count]) => {
    if (!updatedKeyStats[char]) {
      updatedKeyStats[char] = { typed: count, errors: count };
    } else {
      updatedKeyStats[char].errors += count;
    }
  });

  // Update cumulative n-gram pattern stats with EWMA (alpha = 0.25)
  const EWMA_ALPHA = 0.25;
  const updatedPatternStats = { ...(prev.patternStats || {}) };
  if (stats.patternStats) {
    Object.entries(stats.patternStats).forEach(([pattern, current]) => {
      const errorRate = current.errors / Math.max(1, current.typed);
      const latencyDeltaPenalty = Math.max(0, (current.avgLatencyMs - 180) / 10);
      const sessionPenalty = errorRate * 100 + latencyDeltaPenalty;

      const prevStat = updatedPatternStats[pattern];
      if (!prevStat) {
        updatedPatternStats[pattern] = {
          typed: current.typed,
          errors: current.errors,
          totalLatencyMs: current.totalLatencyMs,
          avgLatencyMs: current.avgLatencyMs,
          ewmaScore: Math.round(sessionPenalty * 10) / 10,
        };
      } else {
        const totalTyped = prevStat.typed + current.typed;
        const totalErrors = prevStat.errors + current.errors;
        const totalLatency = prevStat.totalLatencyMs + current.totalLatencyMs;
        const avgLatency = Math.round(totalLatency / Math.max(1, totalTyped));
        const newEwma = (1 - EWMA_ALPHA) * prevStat.ewmaScore + EWMA_ALPHA * sessionPenalty;

        updatedPatternStats[pattern] = {
          typed: totalTyped,
          errors: totalErrors,
          totalLatencyMs: totalLatency,
          avgLatencyMs: avgLatency,
          ewmaScore: Math.round(newEwma * 10) / 10,
        };
      }
    });
  }

  // High scores
  const highScores = {
    bestWpm: Math.max(prev.highScores.bestWpm, stats.wpm),
    bestAccuracy: Math.max(prev.highScores.bestAccuracy, stats.accuracy),
    highestCombo: Math.max(prev.highScores.highestCombo, stats.maxCombo),
    totalTimePracticedSeconds: prev.highScores.totalTimePracticedSeconds + Math.round(stats.elapsedSeconds),
    totalSessions: prev.highScores.totalSessions + 1,
  };

  // Completed lessons
  const completedLessonIds = [...prev.completedLessonIds];
  const lessonStars = { ...prev.lessonStars };
  if (lessonId && !completedLessonIds.includes(lessonId)) {
    completedLessonIds.push(lessonId);
  }

  const sessionSummary: TypingSessionSummary = {
    id: `session-${Date.now()}`,
    date: Date.now(),
    mode,
    modeTitle,
    wpm: stats.wpm,
    rawWpm: stats.rawWpm,
    accuracy: stats.accuracy,
    durationSeconds: stats.elapsedSeconds,
    totalChars: stats.totalKeystrokes,
    errors: stats.incorrectChars,
    score: Math.round(stats.wpm * (stats.accuracy / 100) * 10 + stats.maxCombo * 2),
    xpEarned,
    weakKeys: stats.weakKeys,
    consistency: stats.consistency,
    peakWpm: stats.timeline?.length ? Math.max(...stats.timeline.map((s) => s.wpm)) : stats.wpm,
    enduranceRatio: computeEnduranceRatio(stats),
  };

  // Check for new achievements via isolated engine
  const { newAchievements, unlockedAchievementIds, bonusXp } = evaluateSessionAchievements(
    prev,
    stats,
    mode,
    newStreak,
    completedLessonIds
  );
  totalXp += bonusXp;

  const confidenceScores = calculateKeyConfidence(updatedKeyStats, updatedPatternStats);

  // Update Keybr adaptive character progression pipeline
  const currentKeybr = prev.keybrProgression || { ...INITIAL_KEYBR_PROGRESSION };
  const { updated: updatedKeybr, newlyUnlockedKey } = checkAndUpdateKeybrProgression(
    currentKeybr,
    confidenceScores,
    updatedKeyStats
  );

  const updatedProgress: UserProgress = {
    xp: totalXp,
    level: currentLevel,
    title: getTitleForLevel(currentLevel),
    dailyStreak: newStreak,
    lastActiveDate: today,
    history: [sessionSummary, ...prev.history.slice(0, 49)], // Keep last 50 sessions
    completedLessonIds,
    lessonStars,
    unlockedAchievements: unlockedAchievementIds,
    highScores,
    keyStats: updatedKeyStats,
    patternStats: updatedPatternStats,
    confidenceScores,
    arcadeStats: prev.arcadeStats || { ...INITIAL_ARCADE_SCORES },
    keybrProgression: updatedKeybr,
  };

  saveUserProgress(updatedProgress);

  return {
    updatedProgress,
    sessionSummary,
    newAchievements,
    leveledUp,
    newLevel: currentLevel,
    newlyUnlockedKey,
  };
}

/**
 * Records an arcade mini-game result directly into the unified UserProgress,
 * awarding XP, updating streak, logging session summary, and updating arcadeStats.
 */
export function recordArcadeGameResult(
  gameId: string,
  gameTitle: string,
  gameStats: {
    score: number;
    wpm?: number;
    accuracy?: number;
    elapsedSeconds?: number;
    won?: boolean;
    podium?: boolean;
    wordsDestroyed?: number;
    bombsDefused?: number;
    multiplier?: number;
    errorsByChar?: Record<string, number>;
    patternStats?: Record<string, { typed: number; errors: number; totalLatencyMs: number; avgLatencyMs: number }>;
    consistency?: number;
    peakWpm?: number;
    enduranceRatio?: number | null;
  }
): {
  updatedProgress: UserProgress;
  leveledUp: boolean;
  xpEarned: number;
} {
  const current = loadUserProgress();
  const today = new Date().toISOString().split('T')[0];
  let newStreak = current.dailyStreak;

  if (current.lastActiveDate !== today) {
    const lastDate = new Date(current.lastActiveDate);
    const currentDate = new Date(today);
    const diffDays = Math.round((currentDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
    if (diffDays === 1) newStreak += 1;
    else if (diffDays > 1) newStreak = 1;
  }

  // Base arcade XP: score / 10 + win bonus
  let xpEarned = Math.max(15, Math.round(gameStats.score / 10));
  if (gameStats.won) xpEarned += 50;

  let totalXp = current.xp + xpEarned;
  let currentLevel = current.level;
  let leveledUp = false;

  while (totalXp >= getXpForNextLevel(currentLevel)) {
    totalXp -= getXpForNextLevel(currentLevel);
    currentLevel += 1;
    leveledUp = true;
  }

  const prevArcade = current.arcadeStats || { ...INITIAL_ARCADE_SCORES };
  const updatedArcade: ArcadeScores = {
    ...prevArcade,
    totalGamesPlayed: prevArcade.totalGamesPlayed + 1,
  };

  if (gameId === 'nitro-racer') {
    if (gameStats.won) updatedArcade.raceWins += 1;
    if (gameStats.podium) updatedArcade.racePodiums += 1;
    if (gameStats.wpm && gameStats.wpm > updatedArcade.raceBestWpm) {
      updatedArcade.raceBestWpm = gameStats.wpm;
    }
  } else if (gameId === 'orbital-defense') {
    if (gameStats.score > updatedArcade.orbitalHighScore) updatedArcade.orbitalHighScore = gameStats.score;
    if (gameStats.wordsDestroyed) updatedArcade.orbitalWordsDestroyed += gameStats.wordsDestroyed;
  } else if (gameId === 'bomb-defusal') {
    if (gameStats.score > updatedArcade.bombDefusalHighScore) updatedArcade.bombDefusalHighScore = gameStats.score;
    if (gameStats.bombsDefused) updatedArcade.bombsDefusedTotal += gameStats.bombsDefused;
  } else if (gameId === 'word-blitz') {
    if (gameStats.score > updatedArcade.blitzHighScore) updatedArcade.blitzHighScore = gameStats.score;
    if (gameStats.multiplier && gameStats.multiplier > updatedArcade.blitzMaxMultiplier) {
      updatedArcade.blitzMaxMultiplier = gameStats.multiplier;
    }
  } else if (gameId === 'typing-duel') {
    if (gameStats.won) updatedArcade.duelWins += 1;
    if (gameStats.wpm && gameStats.wpm > updatedArcade.duelBestWpm) {
      updatedArcade.duelBestWpm = gameStats.wpm;
    }
  }

  // Update cumulative keyStats & patternStats if telemetry provided
  const updatedKeyStats = { ...current.keyStats };
  if (gameStats.errorsByChar) {
    Object.entries(gameStats.errorsByChar).forEach(([char, count]) => {
      if (!updatedKeyStats[char]) {
        updatedKeyStats[char] = { typed: count, errors: count };
      } else {
        updatedKeyStats[char].errors += count;
      }
    });
  }

  const updatedPatternStats = { ...(current.patternStats || {}) };
  if (gameStats.patternStats) {
    Object.entries(gameStats.patternStats).forEach(([pattern, stat]) => {
      const prev = updatedPatternStats[pattern];
      if (!prev) {
        updatedPatternStats[pattern] = {
          typed: stat.typed,
          errors: stat.errors,
          totalLatencyMs: stat.totalLatencyMs,
          avgLatencyMs: stat.avgLatencyMs,
          ewmaScore: Math.round((stat.errors / Math.max(1, stat.typed)) * 100),
        };
      } else {
        const totalTyped = prev.typed + stat.typed;
        const totalErrors = prev.errors + stat.errors;
        const totalLatency = prev.totalLatencyMs + stat.totalLatencyMs;
        updatedPatternStats[pattern] = {
          typed: totalTyped,
          errors: totalErrors,
          totalLatencyMs: totalLatency,
          avgLatencyMs: Math.round(totalLatency / Math.max(1, totalTyped)),
          ewmaScore: Math.round(((prev.ewmaScore * 0.75) + ((stat.errors / Math.max(1, stat.typed)) * 100) * 0.25)),
        };
      }
    });
  }

  const confidenceScores = calculateKeyConfidence(updatedKeyStats, updatedPatternStats);

  const sessionSummary: TypingSessionSummary = {
    id: `arcade-${Date.now()}`,
    date: Date.now(),
    mode: 'word-rush' as GameMode,
    modeTitle: `Arcade: ${gameTitle}`,
    // Record what the game actually reported. The previous fallbacks invented
    // measurements: any arcade run without a duration was stored as a 60-second
    // 30 WPM session at 95% accuracy, and every one of them added a fabricated
    // minute to lifetime practice time. Unknown stays unknown.
    wpm: gameStats.wpm ?? 0,
    rawWpm: gameStats.wpm ?? 0,
    accuracy: gameStats.accuracy ?? 0,
    durationSeconds: gameStats.elapsedSeconds ?? 0,
    totalChars: Math.round(((gameStats.wpm ?? 0) * 5 * (gameStats.elapsedSeconds ?? 0)) / 60),
    errors: 0,
    score: gameStats.score,
    xpEarned,
    weakKeys: [],
    consistency: gameStats.consistency ?? 0,
    peakWpm: gameStats.peakWpm ?? (gameStats.wpm ?? 0),
    enduranceRatio: gameStats.enduranceRatio ?? null,
  };

  const updatedProgress: UserProgress = {
    ...current,
    xp: totalXp,
    level: currentLevel,
    title: getTitleForLevel(currentLevel),
    dailyStreak: newStreak,
    lastActiveDate: today,
    history: [sessionSummary, ...current.history.slice(0, 49)],
    highScores: {
      ...current.highScores,
      totalSessions: current.highScores.totalSessions + 1,
      totalTimePracticedSeconds: current.highScores.totalTimePracticedSeconds + (gameStats.elapsedSeconds ?? 0),
    },
    keyStats: updatedKeyStats,
    patternStats: updatedPatternStats,
    confidenceScores,
    arcadeStats: updatedArcade,
  };

  saveUserProgress(updatedProgress);

  // Keep legacy localStorage in sync for backwards compatibility
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LEGACY_ARCADE_STORAGE_KEY, JSON.stringify(updatedArcade));
    } catch {}
  }

  return {
    updatedProgress,
    leveledUp,
    xpEarned,
  };
}

/**
 * Returns ranked problem sequences (unigram, bigram, trigram) based on highest EWMA penalty.
 */
export function getWeakestPatterns(
  limit: number = 5,
  type: 'all' | 'bigram' | 'trigram' = 'all',
  progress?: UserProgress
): string[] {
  const p = progress || (typeof window !== 'undefined' ? loadUserProgress() : null);
  if (!p || !p.patternStats || Object.keys(p.patternStats).length === 0) {
    // If no pattern stats collected yet, extrapolate from keyStats or supply common high-frequency transition targets
    if (p?.keyStats && Object.keys(p.keyStats).length > 0) {
      const topKeys = Object.entries(p.keyStats)
        .sort(([, a], [, b]) => (b.errors / Math.max(1, b.typed)) - (a.errors / Math.max(1, a.typed)))
        .map(([k]) => k)
        .filter((k) => k !== ' ');
      if (topKeys.length > 0) {
        if (type === 'bigram') {
          return topKeys.slice(0, limit).map((k) => `${k}e`);
        }
        if (type === 'trigram') {
          return topKeys.slice(0, limit).map((k) => `${k}in`);
        }
        return topKeys.slice(0, limit);
      }
    }
    const defaults = type === 'bigram' 
      ? ['th', 'er', 'in', 'on', 'at', 're'] 
      : type === 'trigram' 
      ? ['the', 'ing', 'and', 'ion', 'ent'] 
      : ['th', 'er', 'the', 'ing', 'on'];
    return defaults.slice(0, limit);
  }

  const entries = Object.entries(p.patternStats).filter(([pattern]) => {
    const len = pattern.length;
    if (pattern.includes(' ')) return false;
    if (type === 'bigram') return len === 2;
    if (type === 'trigram') return len === 3;
    return len >= 2 && len <= 3;
  });

  if (entries.length === 0) {
    const defaults = type === 'bigram' ? ['th', 'er', 'in', 'on'] : ['the', 'ing', 'and'];
    return defaults.slice(0, limit);
  }

  return entries
    .sort(([, a], [, b]) => b.ewmaScore - a.ewmaScore)
    .slice(0, limit)
    .map(([pattern]) => pattern);
}

/**
 * Generates an integer checksum for payload integrity verification
 */
export function generateChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

/**
 * Exports complete player ledger, achievements, history, and preferences as valid JSON
 */
export function exportBackupPackage(userProgress: UserProgress, preferences?: AppPreferences): string {
  const payload = {
    schemaVersion: 2 as const,
    timestamp: Date.now(),
    userProgress,
    preferences,
    checksum: '',
  };
  payload.checksum = generateChecksum(JSON.stringify({ p: userProgress, pr: preferences }));
  return JSON.stringify(payload, null, 2);
}

/**
 * Encodes backup package into a portable base64 sync token for seamless clipboard transfers
 */
export function exportSyncToken(userProgress: UserProgress, preferences?: AppPreferences): string {
  const json = exportBackupPackage(userProgress, preferences);
  if (typeof window !== 'undefined') {
    return btoa(encodeURIComponent(json));
  }
  return Buffer.from(json).toString('base64');
}

/**
 * Non-destructively imports and merges user progress and preferences from JSON or base64 token
 */
export function importBackupPackage(rawJsonOrToken: string): {
  success: boolean;
  message: string;
  updatedProgress?: UserProgress;
  restoredPreferences?: AppPreferences;
} {
  try {
    let cleanJson = rawJsonOrToken.trim();
    if (!cleanJson) {
      return { success: false, message: 'Empty input provided.' };
    }

    // Decode base64 token if not plain JSON
    if (!cleanJson.startsWith('{')) {
      try {
        cleanJson = decodeURIComponent(atob(cleanJson));
      } catch {
        return { success: false, message: 'Invalid or corrupted sync token format.' };
      }
    }

    const parsed = JSON.parse(cleanJson);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, message: 'Invalid data payload structure.' };
    }

    const importedProgress = (parsed.userProgress || parsed) as Partial<UserProgress>;
    if (typeof importedProgress.xp !== 'number' || typeof importedProgress.level !== 'number') {
      return { success: false, message: 'Missing essential user progress fields (xp, level).' };
    }

    const current = loadUserProgress();
    const merged: UserProgress = {
      ...current,
      ...importedProgress,
      xp: Math.max(current.xp, importedProgress.xp || 0),
      level: Math.max(current.level, importedProgress.level || 1),
      dailyStreak: Math.max(current.dailyStreak, importedProgress.dailyStreak || 1),
      completedLessonIds: Array.from(
        new Set([...(current.completedLessonIds || []), ...(importedProgress.completedLessonIds || [])])
      ),
      unlockedAchievements: Array.from(
        new Set([...(current.unlockedAchievements || []), ...(importedProgress.unlockedAchievements || [])])
      ),
      highScores: {
        bestWpm: Math.max(current.highScores.bestWpm, importedProgress.highScores?.bestWpm || 0),
        bestAccuracy: Math.max(current.highScores.bestAccuracy, importedProgress.highScores?.bestAccuracy || 0),
        highestCombo: Math.max(current.highScores.highestCombo, importedProgress.highScores?.highestCombo || 0),
        totalTimePracticedSeconds:
          (current.highScores.totalTimePracticedSeconds || 0) +
          (importedProgress.highScores?.totalTimePracticedSeconds || 0),
        totalSessions: (current.highScores.totalSessions || 0) + (importedProgress.highScores?.totalSessions || 0),
      },
      keyStats: { ...(current.keyStats || {}), ...(importedProgress.keyStats || {}) },
      confidenceScores: { ...(current.confidenceScores || {}), ...(importedProgress.confidenceScores || {}) },
      arcadeStats: {
        ...(current.arcadeStats || INITIAL_USER_PROGRESS.arcadeStats!),
        ...(importedProgress.arcadeStats || {}),
      },
      keybrProgression: importedProgress.keybrProgression || current.keybrProgression || { ...INITIAL_KEYBR_PROGRESSION },
    };

    saveUserProgress(merged);

    let restoredPreferences: AppPreferences | undefined;
    if (parsed.preferences && typeof window !== 'undefined') {
      try {
        localStorage.setItem('typepulse_preferences', JSON.stringify(parsed.preferences));
        restoredPreferences = parsed.preferences;
      } catch {}
    }

    return {
      success: true,
      message: `Restored progress: Level ${merged.level} (${merged.highScores.totalSessions} sessions, ${merged.unlockedAchievements.length} achievements).`,
      updatedProgress: merged,
      restoredPreferences,
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to import backup package.' };
  }
}

