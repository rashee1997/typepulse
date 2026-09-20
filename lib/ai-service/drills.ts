/**
 * Drill generation: per-lesson AI drills and the local tri-tier daily board.
 *
 * Extracted from `lib/ai-service.ts`. The lesson drill is the one generator with
 * a hard character whitelist, so it is enforced on both sides of the call — the
 * prompt states it and `sanitizePatternToAllowedKeys` strips anything that leaks
 * through — because a single foreign character makes the drill unplayable for a
 * learner who has not unlocked that key yet.
 *
 * The daily board is generated locally and takes no `AISettings`: it is a
 * scheduled board that must be identical on every load and available offline.
 */

import { AIDrillOptions, AIDrillResult, AIMission, AISettings, Lesson } from '@/types/typing';
import {
  generateDeterministicLessonDrill,
  getCumulativeKeysForLesson,
  getLessonTargetKeys,
  sanitizePatternToAllowedKeys,
} from '../curriculum';
import { generateMissionPassage } from '../word-banks';
import { LESSON_DRILL_SYSTEM_PROMPT, formatLessonContext } from '../ai-prompts';
import { callLlm } from './transport';
import { canUseLlm, resolveTransport } from './providers';

/**
 * Generates AI practice drills for one curriculum lesson.
 *
 * The whitelist is enforced after generation as well as in the prompt, so a model
 * that ignores the boundary cannot leak foreign letters into the drill.
 */
export async function generateLessonAiDrill(
  lesson: Lesson,
  options: AIDrillOptions,
  settings?: AISettings,
  userWeakKeys: string[] = []
): Promise<AIDrillResult> {
  const allowedKeys = options.scope === 'target_only'
    ? getLessonTargetKeys(lesson)
    : getCumulativeKeysForLesson(lesson.id);

  const cleanAllowedKeys = allowedKeys.filter((k) => k !== ' ');
  const length = options.length || 25;

  if (canUseLlm(settings)) {
    try {
      const styleDescriptions: Record<string, string> = {
        alternating: 'Strict bilateral alternation between left-hand and right-hand keys with cadence and rhythm.',
        repetition: 'Muscle memory chunks, doubles, triples, and rolls (e.g., fff jjj ffjj jfjf).',
        words: 'Real English words or pronounceable syllables formed strictly and exclusively from the allowed letters.',
        weak_keys: `Heavily focus on practicing these struggle keys in rhythmic combinations: ${userWeakKeys.filter((k) => allowedKeys.includes(k.toLowerCase())).join(', ') || cleanAllowedKeys.slice(0, 2).join(', ')}.`,
        flow: 'Smooth fluid combinations, rolling digraphs, and transition chords.',
      };

      const prompt = `Generate the drill tokens for this lesson.

LESSON CONTEXT
${formatLessonContext(lesson)}

HARD CONSTRAINT — ALLOWED CHARACTERS
Every character in your output must be one of: [${cleanAllowedKeys.join(', ')}] or a space.
Letters that are not in that list do not exist for this learner yet: a single one makes the whole drill unplayable.

STYLE
${styleDescriptions[options.style] || styleDescriptions.alternating}

OUTPUT
- Exactly ${length} space-separated tokens, no punctuation and no capitals.
- Output the raw tokens only: no markdown, no quotes, no numbering, no explanation.`;

      const response = await callLlm(prompt, LESSON_DRILL_SYSTEM_PROMPT, settings, { temperature: 0.6 });
      const cleaned = sanitizePatternToAllowedKeys(response, allowedKeys);
      let tokens = cleaned.split(' ').filter((t) => t.length > 0);

      // Filter out isolated single chars if whitelist permits multi-char words
      if (cleanAllowedKeys.length > 4) {
        tokens = tokens.filter((t) => t.length >= 2);
      }

      // If we got a decent set of valid tokens, pad if needed with procedural tokens
      if (tokens.length >= 5) {
        if (tokens.length < length) {
          const extraProcedural = generateDeterministicLessonDrill(
            lesson,
            options.style,
            options.scope,
            length - tokens.length,
            userWeakKeys
          ).split(' ');
          tokens.push(...extraProcedural);
        }

        return {
          content: tokens.slice(0, length).join(' '),
          allowedKeys,
          style: options.style,
          scope: options.scope,
          source: resolveTransport(settings) === 'gemini' ? 'gemini' : 'openai',
          lessonTitle: lesson.title,
        };
      }
    } catch {
      // Fallback gracefully to deterministic generator
    }
  }

  // Deterministic local generator
  const proceduralContent = generateDeterministicLessonDrill(
    lesson,
    options.style,
    options.scope,
    length,
    userWeakKeys
  );

  return {
    content: proceduralContent,
    allowedKeys,
    style: options.style,
    scope: options.scope,
    source: 'procedural',
    lessonTitle: lesson.title,
  };
}

/**
 * Generates 3 structured daily missions refreshed automatically on a 24h cadence:
 * 1. Accuracy Purity (Target 98%+ Accuracy)
 * 2. Latency Buster (Weakest n-gram / struggle keys)
 * 3. Speed Burst (WPM + 10%)
 */
/**
 * The daily board is generated locally from the typist's own numbers — it does not
 * call a model, so it takes no AI settings and the board says so in the UI.
 */
export function generateTriTierDailyMissions(
  dateKey: string,
  weakKeys: string[],
  currentWpm: number
): AIMission[] {
  const safeWpm = Math.max(25, currentWpm || 35);
  const targets = weakKeys.length > 0 ? weakKeys.slice(0, 3) : ['e', 'r', 't'];

  // 1. Accuracy Purity Mission
  const purityMission: AIMission = {
    id: `daily-purity-${dateKey}`,
    type: 'ACCURACY_TARGET',
    title: 'Precision Purity: Home Anchor',
    description: 'Execute this steady passage with flawless discipline. Minimum 98% accuracy required.',
    difficulty: safeWpm > 55 ? 'Advanced' : 'Intermediate',
    targetWpm: Math.round(safeWpm * 0.9),
    targetAccuracy: 98,
    rewardXp: 300,
    reason: 'High accuracy eliminates backspacing penalty loops and builds unshakable motor anchors.',
    content: 'Precision is the foundation of true velocity. When every keystroke is deliberate and true, speed emerges naturally without strain or hurried movements.',
    completed: false,
    createdAt: Date.now(),
  };

  // 2. Latency Buster Mission
  const drillText = generateMissionPassage('WEAK_KEY_DRILL', targets, 30);
  const latencyMission: AIMission = {
    id: `daily-latency-${dateKey}`,
    type: 'WEAK_KEY_DRILL',
    title: `Latency Buster: [${targets.join(', ').toUpperCase()}]`,
    description: `Targeted biomechanical recalibration drill focusing on your highest-latency keys: ${targets.join(', ')}.`,
    difficulty: 'Intermediate',
    targetWpm: safeWpm,
    targetAccuracy: 95,
    focusKeys: targets,
    rewardXp: 350,
    reason: `Targeting [${targets.join(', ')}] resolves finger overreach hesitation in real texts.`,
    content: drillText,
    completed: false,
    createdAt: Date.now(),
  };

  // 3. Velocity Burst Mission
  const burstTargetWpm = Math.round(safeWpm * 1.12);
  const burstMission: AIMission = {
    id: `daily-burst-${dateKey}`,
    type: 'SPEED_SPRINT',
    title: `Velocity Sprint: ${burstTargetWpm} WPM`,
    description: `Pace yourself against the upper threshold. Break your sound barrier with clean forward rhythm.`,
    difficulty: safeWpm > 60 ? 'Master' : 'Advanced',
    targetWpm: burstTargetWpm,
    targetAccuracy: 93,
    rewardXp: 400,
    reason: 'Controlled speed bursts recalibrate your neural latency perception for faster recognition.',
    content: 'The quick silver runner accelerated through the neon circuit, leaving glowing trails of pure kinetic energy across the illuminated skyline.',
    completed: false,
    createdAt: Date.now(),
  };

  return [purityMission, latencyMission, burstMission];
}
