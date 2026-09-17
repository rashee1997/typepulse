import { Achievement, GameMode, Lesson, TypingSessionSummary, TypingStats, UserProgress } from '@/types/typing';
import { INITIAL_ACHIEVEMENTS } from './achievements';

const PROGRESS_STORAGE_KEY = 'typepulse_user_progress';

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
};

export function loadUserProgress(): UserProgress {
  if (typeof window === 'undefined') return INITIAL_USER_PROGRESS;
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return INITIAL_USER_PROGRESS;
    const parsed = JSON.parse(raw);
    return {
      ...INITIAL_USER_PROGRESS,
      ...parsed,
      highScores: { ...INITIAL_USER_PROGRESS.highScores, ...(parsed.highScores || {}) },
      keyStats: { ...(parsed.keyStats || {}) },
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
  }

  return Math.max(10, xp);
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
  };

  // Check for new achievements
  const newAchievements: Achievement[] = [];
  const unlockedAchievementIds = [...prev.unlockedAchievements];

  INITIAL_ACHIEVEMENTS.forEach((ach) => {
    if (unlockedAchievementIds.includes(ach.id)) return;

    let unlocked = false;

    if (ach.id === 'first_keystroke') unlocked = true;
    if (ach.id === 'speed_30' && stats.wpm >= 30) unlocked = true;
    if (ach.id === 'speed_60' && stats.wpm >= 60) unlocked = true;
    if (ach.id === 'speed_90' && stats.wpm >= 90) unlocked = true;
    if (ach.id === 'speed_100' && stats.wpm >= 100) unlocked = true;
    if (ach.id === 'accuracy_95' && stats.accuracy >= 95 && stats.totalKeystrokes >= 60) unlocked = true;
    if (ach.id === 'accuracy_98' && stats.accuracy >= 98 && stats.totalKeystrokes >= 80) unlocked = true;
    if (ach.id === 'accuracy_100' && stats.accuracy === 100 && stats.totalKeystrokes >= 50) unlocked = true;
    if (ach.id === 'combo_50' && stats.maxCombo >= 50) unlocked = true;
    if (ach.id === 'combo_100' && stats.maxCombo >= 100) unlocked = true;
    if (ach.id === 'streak_3' && newStreak >= 3) unlocked = true;
    if (ach.id === 'streak_7' && newStreak >= 7) unlocked = true;
    if (ach.id === 'streak_14' && newStreak >= 14) unlocked = true;
    if (ach.id === 'streak_30' && newStreak >= 30) unlocked = true;
    if (ach.id === 'lessons_tier1' && completedLessonIds.filter(id => id.startsWith('lesson-1')).length >= 4) unlocked = true;
    if (ach.id === 'ai_mission_complete' && mode === 'ai-mission') unlocked = true;

    if (unlocked) {
      unlockedAchievementIds.push(ach.id);
      newAchievements.push({ ...ach, unlockedAt: Date.now() });
      totalXp += ach.xpReward;
    }
  });

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
  };

  saveUserProgress(updatedProgress);

  return {
    updatedProgress,
    sessionSummary,
    newAchievements,
    leveledUp,
    newLevel: currentLevel,
  };
}
