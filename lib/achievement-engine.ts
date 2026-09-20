import { Achievement, GameMode, Lesson, TypingStats, UserProgress } from '@/types/typing';
import { INITIAL_ACHIEVEMENTS } from './achievements';
import { getCertificationTier } from './certification-service';

export interface EvaluatedAchievements {
  newAchievements: Achievement[];
  unlockedAchievementIds: string[];
  bonusXp: number;
}

/**
 * Checks all achievement conditions against the updated session/streak state.
 * Isolated from progress-service to keep file sizes modular and single-responsibility.
 */
export function evaluateSessionAchievements(
  prev: UserProgress,
  stats: TypingStats,
  mode: GameMode,
  newStreak: number,
  completedLessonIds: string[]
): EvaluatedAchievements {
  const newAchievements: Achievement[] = [];
  const unlockedAchievementIds = [...prev.unlockedAchievements];
  let bonusXp = 0;

  // Evaluate international certification tier earned in this session
  const certTier = getCertificationTier(stats.wpm, stats.accuracy);

  INITIAL_ACHIEVEMENTS.forEach((ach) => {
    if (unlockedAchievementIds.includes(ach.id)) return;

    let unlocked = false;

    // First keystroke
    if (ach.id === 'first_keystroke') unlocked = true;

    // Speed barriers (min 20 words / 100 strokes to prevent 2-second gaming)
    if (ach.id === 'speed_30' && stats.wpm >= 30) unlocked = true;
    if (ach.id === 'speed_60' && stats.wpm >= 60 && stats.totalKeystrokes >= 80) unlocked = true;
    if (ach.id === 'speed_90' && stats.wpm >= 90 && stats.totalKeystrokes >= 120) unlocked = true;
    if (ach.id === 'speed_100' && stats.wpm >= 100 && stats.totalKeystrokes >= 150) unlocked = true;
    if (ach.id === 'speed_120' && stats.wpm >= 120 && stats.totalKeystrokes >= 180) unlocked = true;

    // Accuracy milestones
    if (ach.id === 'accuracy_95' && stats.accuracy >= 95 && stats.totalKeystrokes >= 60) unlocked = true;
    if (ach.id === 'accuracy_98' && stats.accuracy >= 98 && stats.totalKeystrokes >= 80) unlocked = true;
    if (ach.id === 'accuracy_100' && stats.accuracy === 100 && stats.totalKeystrokes >= 50) unlocked = true;

    // Combos
    if (ach.id === 'combo_50' && stats.maxCombo >= 50) unlocked = true;
    if (ach.id === 'combo_100' && stats.maxCombo >= 100) unlocked = true;

    // Streaks
    if (ach.id === 'streak_3' && newStreak >= 3) unlocked = true;
    if (ach.id === 'streak_7' && newStreak >= 7) unlocked = true;
    if (ach.id === 'streak_14' && newStreak >= 14) unlocked = true;
    if (ach.id === 'streak_30' && newStreak >= 30) unlocked = true;

    // Unit-level certified curriculum progress (6 lessons per unit)
    const unit1Done = completedLessonIds.filter((id) => id.startsWith('lesson-1')).length >= 6;
    const unit2Done = completedLessonIds.filter((id) => id.startsWith('lesson-2')).length >= 6;
    const unit3Done = completedLessonIds.filter((id) => id.startsWith('lesson-3')).length >= 6;
    const unit4Done = completedLessonIds.filter((id) => id.startsWith('lesson-4')).length >= 6;
    const unit5Done = completedLessonIds.filter((id) => id.startsWith('lesson-5')).length >= 6;
    const unit6Done = completedLessonIds.filter((id) => id.startsWith('lesson-6')).length >= 6;
    const unit7Done = completedLessonIds.filter((id) => id.startsWith('lesson-7')).length >= 6;

    if (ach.id === 'lessons_tier1' && unit1Done) unlocked = true;
    if (ach.id === 'unit2_master' && unit2Done) unlocked = true;
    if (ach.id === 'unit3_master' && unit3Done) unlocked = true;
    if (ach.id === 'unit4_master' && unit4Done) unlocked = true;
    if (ach.id === 'unit5_master' && unit5Done) unlocked = true;
    if (ach.id === 'unit6_master' && unit6Done) unlocked = true;
    if (ach.id === 'curriculum_graduate' && completedLessonIds.length >= 42) unlocked = true;

    // Standardized International Certification Tiers
    if (ach.id === 'cert_bronze' && certTier) unlocked = true;
    if (ach.id === 'cert_silver' && (certTier?.id === 'silver' || certTier?.id === 'gold' || certTier?.id === 'platinum' || certTier?.id === 'diamond')) unlocked = true;
    if (ach.id === 'cert_gold' && (certTier?.id === 'gold' || certTier?.id === 'platinum' || certTier?.id === 'diamond')) unlocked = true;
    if (ach.id === 'cert_platinum' && (certTier?.id === 'platinum' || certTier?.id === 'diamond')) unlocked = true;
    if (ach.id === 'cert_diamond' && certTier?.id === 'diamond') unlocked = true;

    // AI Tight Coupling Achievements
    if (ach.id === 'ai_mission_complete' && mode === 'ai-mission') unlocked = true;
    if (ach.id === 'ai_drill_explorer' && mode === 'lesson') unlocked = true;
    if (ach.id === 'ai_polyglot_coder' && mode === 'code-pulse') unlocked = true;

    if (unlocked) {
      unlockedAchievementIds.push(ach.id);
      newAchievements.push({ ...ach, unlockedAt: Date.now() });
      bonusXp += ach.xpReward;
    }
  });

  return { newAchievements, unlockedAchievementIds, bonusXp };
}
