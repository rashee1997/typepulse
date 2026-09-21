import { describe, it, expect } from 'vitest';
import {
  applyXp,
  calculateTotalLifetimeXp,
  processCompletedSession,
  recordArcadeGameResult,
  getLocalDateString,
  getWeakestPatterns,
  loadMasteryTiers,
  INITIAL_USER_PROGRESS,
  INITIAL_ARCADE_SCORES,
} from './progress-service';
import { TypingStats, UserProgress, Lesson } from '@/types/typing';

describe('Progress Service', () => {
  describe('applyXp & totalXpEarned (H6, H7)', () => {
    it('applies XP across level boundaries and tracks lifetime XP', () => {
      const initial: UserProgress = {
        ...INITIAL_USER_PROGRESS,
        level: 1,
        xp: 0,
        totalXpEarned: 0,
      };

      // Level 1 requires 1 * 300 = 300 XP
      const { updatedProgress, leveledUp, newLevel } = applyXp(initial, 350);
      expect(leveledUp).toBe(true);
      expect(newLevel).toBe(2);
      expect(updatedProgress.xp).toBe(50); // 350 - 300
      expect(updatedProgress.totalXpEarned).toBe(350);

      // Level 2 requires 2 * 300 = 600 XP
      const next = applyXp(updatedProgress, 600);
      expect(next.leveledUp).toBe(true);
      expect(next.newLevel).toBe(3);
      expect(next.updatedProgress.xp).toBe(50);
      expect(next.updatedProgress.totalXpEarned).toBe(950);
    });

    it('calculates total lifetime XP correctly from level and current XP', () => {
      // Level 1: 0 base + 50 xp = 50
      expect(calculateTotalLifetimeXp(1, 50)).toBe(50);
      // Level 2: 300 base + 100 xp = 400
      expect(calculateTotalLifetimeXp(2, 100)).toBe(400);
      // Level 3: 300 + 600 = 900 base + 20 xp = 920
      expect(calculateTotalLifetimeXp(3, 20)).toBe(920);
    });
  });

  describe('C3: keyStats merging with typedByChar', () => {
    it('properly accumulates typed counts for cleanly typed keys', () => {
      const prev: UserProgress = {
        ...INITIAL_USER_PROGRESS,
        keyStats: {
          a: { typed: 10, errors: 1 },
        },
      };

      const mockStats: TypingStats = {
        wpm: 60,
        rawWpm: 60,
        accuracy: 95,
        correctChars: 20,
        incorrectChars: 1,
        correctedErrors: 0,
        totalKeystrokes: 21,
        elapsedSeconds: 10,
        combo: 20,
        maxCombo: 20,
        consistency: 90,
        errorsByChar: { a: 1 },
        typedByChar: { a: 5, b: 15 },
        weakKeys: ['a'],
        timeline: [],
      };

      const result = processCompletedSession(prev, mockStats, 'practice', 'Practice');
      const updated = result.updatedProgress.keyStats;

      // 'a' was typed 10 + 5 = 15 times, errors 1 + 1 = 2
      expect(updated['a']).toEqual({ typed: 15, errors: 2 });
      // 'b' was typed cleanly 15 times, errors 0
      expect(updated['b']).toEqual({ typed: 15, errors: 0 });
    });
  });

  describe('H5: Lesson passing and star rating criteria', () => {
    const testLesson: Lesson = {
      id: 'lesson-1',
      tier: 1,
      tierTitle: 'Home Row',
      title: 'Home Row Test',
      description: 'Test lesson',
      targetKeys: ['f', 'j'],
      targetAccuracy: 95,
      targetWpm: 30,
      content: 'ff jj ff jj',
      unlocked: true,
      completed: false,
      stars: 0,
      xpReward: 50,
    };

    it('does not complete lesson if accuracy or WPM are below target', () => {
      const prev = { ...INITIAL_USER_PROGRESS, completedLessonIds: [] };
      const failStats: TypingStats = {
        wpm: 20, // below 30 target
        rawWpm: 25,
        accuracy: 96,
        correctChars: 20,
        incorrectChars: 1,
        correctedErrors: 0,
        totalKeystrokes: 21,
        elapsedSeconds: 10,
        combo: 5,
        maxCombo: 5,
        consistency: 80,
        errorsByChar: {},
        weakKeys: [],
        timeline: [],
      };

      const res = processCompletedSession(prev, failStats, 'lesson', 'Lesson', testLesson.id, testLesson);
      expect(res.updatedProgress.completedLessonIds).not.toContain('lesson-1');
    });

    it('completes lesson and awards stars when targets are met or exceeded', () => {
      const prev = { ...INITIAL_USER_PROGRESS, completedLessonIds: [] };
      const passStats: TypingStats = {
        wpm: 45, // well above 30 target
        rawWpm: 45,
        accuracy: 99, // high accuracy
        correctChars: 50,
        incorrectChars: 0,
        correctedErrors: 0,
        totalKeystrokes: 50,
        elapsedSeconds: 15,
        combo: 50,
        maxCombo: 50,
        consistency: 95,
        errorsByChar: {},
        weakKeys: [],
        timeline: [],
      };

      const res = processCompletedSession(prev, passStats, 'lesson', 'Lesson', testLesson.id, testLesson);
      expect(res.updatedProgress.completedLessonIds).toContain('lesson-1');
      expect(res.updatedProgress.lessonStars['lesson-1']).toBeGreaterThanOrEqual(1);
    });
  });

  describe('M12: getWeakestPatterns', () => {
    it('returns empty array when insufficient pattern data exists', () => {
      const progress: UserProgress = {
        ...INITIAL_USER_PROGRESS,
        patternStats: {},
      };
      const result = getWeakestPatterns(5, 'all', progress);
      expect(result).toEqual([]);
    });
  });

  describe('Arcade persistence (DoD: one arcade game then a reload, stats survive)', () => {
    it('records arcade game result and preserves XP, high scores, and games played across simulated reload', () => {
      const initial: UserProgress = {
        ...INITIAL_USER_PROGRESS,
        xp: 100,
        level: 1,
        totalXpEarned: 100,
        arcadeStats: {
          ...INITIAL_ARCADE_SCORES,
          bombDefusalHighScore: 100,
          bombsDefusedTotal: 2,
          totalGamesPlayed: 5,
        },
      };

      const { updatedProgress, xpEarned } = recordArcadeGameResult(
        'bomb-defusal',
        'Bomb Defusal',
        { score: 350, bombsDefused: 6, accuracy: 98, wpm: 75 },
        initial
      );

      expect(xpEarned).toBeGreaterThan(0);
      expect(updatedProgress.arcadeStats.bombDefusalHighScore).toBe(350);
      expect(updatedProgress.arcadeStats.bombsDefusedTotal).toBe(8);
      expect(updatedProgress.arcadeStats.totalGamesPlayed).toBe(6);
      expect(updatedProgress.totalXpEarned).toBe(100 + xpEarned);

      // Simulate serialization/deserialization to localStorage and reload
      const serialized = JSON.stringify(updatedProgress);
      const reloaded: UserProgress = JSON.parse(serialized);

      expect(reloaded.arcadeStats.bombDefusalHighScore).toBe(350);
      expect(reloaded.arcadeStats.bombsDefusedTotal).toBe(8);
      expect(reloaded.arcadeStats.totalGamesPlayed).toBe(6);
      expect(reloaded.totalXpEarned).toBe(100 + xpEarned);
    });
  });

  describe('Mastery Pass (H8 & lifetime XP)', () => {
    it('uses lifetime XP to unlock tiers even after level ups', () => {
      // User reached level 4 with 200 current XP = 300 + 600 + 900 + 200 = 2000 lifetime XP
      const progress: UserProgress = {
        ...INITIAL_USER_PROGRESS,
        level: 4,
        xp: 200,
        totalXpEarned: 2000,
      };

      const tiers = loadMasteryTiers(progress);
      // Tier 1 (150 XP), Tier 2 (500 XP), Tier 3 (1000 XP), Tier 4 (1800 XP) must all be unlocked
      expect(tiers.find((t) => t.tier === 1)?.unlocked).toBe(true);
      expect(tiers.find((t) => t.tier === 2)?.unlocked).toBe(true);
      expect(tiers.find((t) => t.tier === 3)?.unlocked).toBe(true);
      expect(tiers.find((t) => t.tier === 4)?.unlocked).toBe(true);
      // Tier 5 (2800 XP) should not yet be unlocked
      expect(tiers.find((t) => t.tier === 5)?.unlocked).toBe(false);
    });
  });
});
