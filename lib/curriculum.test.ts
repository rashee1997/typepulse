import { describe, it, expect } from 'vitest';
import { isTierUnlocked, isLessonUnlocked, LESSONS_CURRICULUM } from './curriculum';

describe('Curriculum Gating', () => {
  it('unlocks Tier 1 unconditionally', () => {
    expect(isTierUnlocked(1, [])).toBe(true);
  });

  it('locks Tier 2 until at least 75% of Tier 1 lessons are completed', () => {
    const tier1 = LESSONS_CURRICULUM.filter((l) => l.tier === 1);
    expect(tier1.length).toBeGreaterThan(0);

    // 0 completed
    expect(isTierUnlocked(2, [])).toBe(false);

    // Complete fewer than 75%
    const partial = tier1.slice(0, 1).map((l) => l.id);
    expect(isTierUnlocked(2, partial)).toBe(false);

    // Complete >= 75%
    const threshold = Math.ceil(tier1.length * 0.75);
    const passing = tier1.slice(0, threshold).map((l) => l.id);
    expect(isTierUnlocked(2, passing)).toBe(true);
  });

  it('enforces sequential unlocking within a tier', () => {
    const tier1 = LESSONS_CURRICULUM.filter((l) => l.tier === 1);
    const lesson1 = tier1[0];
    const lesson2 = tier1[1];

    // First lesson in Tier 1 is always unlocked
    expect(isLessonUnlocked(lesson1, [])).toBe(true);

    // Second lesson is locked until lesson 1 is completed
    expect(isLessonUnlocked(lesson2, [])).toBe(false);
    expect(isLessonUnlocked(lesson2, [lesson1.id])).toBe(true);
  });
});
