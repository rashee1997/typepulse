/**
 * The live coach: post-run debrief, mission design and the conversational chat.
 *
 * Extracted from `lib/ai-service.ts`. These three are the tasks where the model
 * *must* reason about the typist's real data, so each one builds its prompt from
 * computed run facts rather than restating raw stats back at the model.
 *
 * Every path here falls back to `./coach-offline` on failure, and rethrows only
 * aborts — a cancelled request must never be answered.
 */

import { AICoachFeedback, AIMission, AISettings, TypingStats } from '@/types/typing';
import { CHAT_SYSTEM_PROMPT, MISSION_SYSTEM_PROMPT, SESSION_ANALYSIS_SYSTEM_PROMPT, TypistProfile, typistProfileBlock } from '../ai-prompts';
import { ChatMessage, callChatLlm, callLlm, cleanTypingText, countWords, isAbortError, parseLlmJson } from './transport';
import { canUseLlm, describeProvider } from './providers';
import { generateDeterministicChatReply, generateDeterministicCoachFeedback, generateDeterministicMission } from './coach-offline';

// ---------------------------------------------------------------------------
// Run diagnostics. These describe the finished run's own shape so the model
// reasons about the actual run instead of restating wpm and accuracy back at
// the typist, which is what made the old debrief read like a template.
// ---------------------------------------------------------------------------

/** Where the run's pace went: started fast and faded, or built through it. */
function describePaceShape(timeline: TypingStats['timeline']): string {
  const samples = (timeline || []).filter((sample) => typeof sample.wpm === 'number');
  if (samples.length < 4) return 'too few samples to judge pace shape';

  const half = Math.floor(samples.length / 2);
  const early = samples.slice(0, half).reduce((sum, s) => sum + s.wpm, 0) / Math.max(1, half);
  const late = samples.slice(half).reduce((sum, s) => sum + s.wpm, 0) / Math.max(1, samples.length - half);
  const peak = Math.max(...samples.map((s) => s.wpm));
  const delta = late - early;

  const shape =
    delta > Math.max(3, early * 0.06)
      ? `climbed from ~${Math.round(early)} to ~${Math.round(late)} WPM`
      : delta < -Math.max(3, early * 0.06)
      ? `faded from ~${Math.round(early)} to ~${Math.round(late)} WPM`
      : `held near ${Math.round(early)} WPM throughout`;

  return `${shape} (peak ${peak} WPM)`;
}

/** Which characters actually took the errors in this run. */
function describeErrorHotspots(stats: TypingStats): string {
  const entries = Object.entries(stats.errorsByChar || {})
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  if (entries.length === 0) {
    return stats.incorrectChars > 0
      ? `${stats.incorrectChars} wrong keystrokes, but no single character stands out`
      : 'no incorrect keystrokes';
  }

  return entries.map(([char, count]) => `${char === ' ' ? 'space' : `'${char}'`} x${count}`).join(', ');
}

/** The measured slow transitions, which are what actually cost time. */
function describeHesitations(stats: TypingStats): string {
  const signals = stats.hesitationSignals || [];
  if (signals.length === 0) return 'none recorded';

  return signals
    .slice(0, 3)
    .map((signal) => `'${signal.bigram}' took ${Math.round(signal.latencyMs)}ms against a ${Math.round(signal.baselineMs)}ms baseline`)
    .join('; ');
}

// Post-session analysis
export async function generateAiCoachFeedback(
  stats: TypingStats,
  context: { mode: string; level: number; userWeakKeys: string[] },
  settings: AISettings,
  signal?: AbortSignal
): Promise<AICoachFeedback> {
  // If no key and not gemini, return smart local coaching instantly
  if (!canUseLlm(settings)) {
    return generateDeterministicCoachFeedback(stats, context);
  }

  const prompt = `Write the debrief for this finished typing run.

RUN FACTS
- Mode: ${context.mode} · player level ${context.level}
- Net ${stats.wpm} WPM · raw ${stats.rawWpm} WPM · consistency ${stats.consistency}%
- Accuracy ${stats.accuracy}% (${stats.correctChars} correct, ${stats.incorrectChars} wrong, ${stats.correctedErrors} corrected)
- Duration ${stats.elapsedSeconds}s · peak combo ${stats.maxCombo}
- Pace shape: ${describePaceShape(stats.timeline)}
- Characters that took the errors: ${describeErrorHotspots(stats)}
- Measured slow transitions: ${describeHesitations(stats)}
- Keys this account already struggles with: ${context.userWeakKeys.join(', ') || 'none recorded'}

Return one JSON object with exactly these keys:
{"wpmSummary": string, "accuracyAssessment": string, "weaknessIdentified": string, "keyAdvice": string}

Field requirements:
- wpmSummary: one sentence on pace and its shape, quoting this run's own figures.
- accuracyAssessment: one sentence on precision, saying whether the errors were concentrated on a character or spread out.
- weaknessIdentified: one sentence naming the exact key or transition this run convicts, or state plainly that nothing stood out.
- keyAdvice: one imperative sentence the typist can apply in their very next run, naming the key, drill or setting to change.

Output valid JSON only, with no prose before or after it.`;

  try {
    const raw = await callLlm(prompt, SESSION_ANALYSIS_SYSTEM_PROMPT, settings, { signal, temperature: 0.4, jsonMode: true });
    const parsed = parseLlmJson<Partial<AICoachFeedback>>(raw);
    if (!parsed) throw new Error('Coach feedback was not valid JSON');

    const remediationMission = generateDeterministicMission(stats.weakKeys, stats.wpm);
    const firstSentence = (value: unknown, fallback: string) =>
      typeof value === 'string' && value.trim().length > 8 ? value.trim() : fallback;

    return {
      wpmSummary: firstSentence(parsed.wpmSummary, `You held ${stats.wpm} WPM at ${stats.consistency}% consistency.`),
      accuracyAssessment: firstSentence(parsed.accuracyAssessment, `Accuracy landed at ${stats.accuracy}% with ${stats.correctedErrors} corrected keystrokes.`),
      weaknessIdentified: firstSentence(
        parsed.weaknessIdentified,
        stats.weakKeys.length > 0
          ? `Transition hesitation on [${stats.weakKeys.slice(0, 3).join(', ')}].`
          : 'No single key stood out as the bottleneck in this run.'
      ),
      keyAdvice: firstSentence(parsed.keyAdvice, generateDeterministicCoachFeedback(stats, context).keyAdvice),
      recommendedMission: remediationMission,
    };
  } catch (err) {
    if (isAbortError(err)) throw err;
    console.warn('AI Coach fallback invoked:', err);
    return generateDeterministicCoachFeedback(stats, context);
  }
}

// Generate an AI Mission
export async function generateAiMission(
  weakKeys: string[],
  currentWpm: number,
  settings: AISettings,
  signal?: AbortSignal
): Promise<AIMission> {
  if (!canUseLlm(settings)) {
    return generateDeterministicMission(weakKeys, currentWpm);
  }

  const focusKeysList = weakKeys.length > 0 ? weakKeys.slice(0, 3) : ['e', 'r', 't'];
  const suggestedWpm = Math.max(20, Math.round(currentWpm * 1.05));
  const difficulty = currentWpm > 55 ? 'Advanced' : currentWpm > 35 ? 'Intermediate' : 'Beginner';

  const prompt = `Design one typing mission for this typist.

TYPIST FACTS
- Falls back to ${currentWpm} WPM when their recorded speed is unavailable
- Keys this mission must target: [${focusKeysList.join(', ')}]

Return one JSON object with exactly these keys:
{"title": string, "description": string, "type": "WEAK_KEY_DRILL" | "ACCURACY_TARGET" | "SPEED_SPRINT", "targetWpm": number, "targetAccuracy": number, "rewardXp": number, "reason": string, "content": string}

Field requirements:
- title: an imperative of at most 5 words, no quotes, no exclamation marks.
- description: one sentence naming the objective and the key it targets.
- type: pick the one that fits the weakness, not always WEAK_KEY_DRILL.
- targetWpm: an integer within 5% of ${suggestedWpm} — a pace they can reach with clean form.
- targetAccuracy: an integer between 90 and 99.
- rewardXp: an integer between 150 and 300.
- reason: one sentence naming the specific weakness observed on those keys.
- content: 25 to 35 words of natural English prose in which the target keys appear inside real words. Commas and full stops only — no quotes, brackets, digits, headings or line breaks.

Output valid JSON only, with no prose before or after it.`;

  try {
    const raw = await callLlm(prompt, MISSION_SYSTEM_PROMPT, settings, { signal, temperature: 0.7, jsonMode: true });
    const parsed = parseLlmJson<Partial<AIMission>>(raw);
    if (!parsed) throw new Error('Mission response was not valid JSON');

    const missionTypes = ['ACCURACY_TARGET', 'WPM_TARGET', 'WEAK_KEY_DRILL', 'COMBO_CHALLENGE', 'SPEED_SPRINT', 'TIME_ATTACK'];
    const content = cleanTypingText(String(parsed.content || ''));
    const words = countWords(content);

    // A mission whose drill text is unusable is worse than the local one: the
    // typist would be sent into an empty or untypeable session.
    if (words < 15 || words > 70) {
      throw new Error(`Mission drill text was ${words} words`);
    }

    const clamp = (value: unknown, min: number, max: number, fallback: number) => {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? Math.min(max, Math.max(min, Math.round(numeric))) : fallback;
    };

    return {
      id: `ai-mission-${Date.now()}`,
      title: String(parsed.title || 'Precision Alignment Drill').replace(/["!]/g, '').trim().slice(0, 48),
      description: String(parsed.description || 'Eliminate finger hesitation on your most error-prone keys.'),
      type: missionTypes.includes(String(parsed.type)) ? (parsed.type as AIMission['type']) : 'WEAK_KEY_DRILL',
      difficulty,
      targetWpm: clamp(parsed.targetWpm, 10, Math.max(40, Math.round(currentWpm * 1.6)), suggestedWpm),
      targetAccuracy: clamp(parsed.targetAccuracy, 85, 99, 96),
      focusKeys: focusKeysList,
      content,
      rewardXp: clamp(parsed.rewardXp, 100, 400, 200),
      reason: String(parsed.reason || `Reinforces muscle memory on ${focusKeysList.join(', ')}.`),
      completed: false,
      createdAt: Date.now(),
    };
  } catch (err) {
    if (isAbortError(err)) throw err;
    console.warn('AI Mission generation fallback invoked:', err);
    return generateDeterministicMission(weakKeys, currentWpm);
  }
}

/** Turns of history sent with each chat request, oldest dropped first. */
const MAX_CHAT_TURNS = 8;

export interface CoachChatRequest {
  question: string;
  /** The typist's measured profile — this is what makes the answer specific. */
  profile: TypistProfile;
  settings: AISettings;
  /** Prior turns, oldest first, including the opening briefing. */
  history?: ChatMessage[];
  signal?: AbortSignal;
}

/**
 * Answers one coach question with the typist's measured profile and the whole
 * conversation in context.
 *
 * The old signature took a five-field `contextSummary` string and no history,
 * so the model never saw a weak key, a recent run, or the previous turn.
 */
export async function askAiCoachQuestion(request: CoachChatRequest): Promise<string> {
  const { question, profile, settings, signal } = request;
  const history = (request.history ?? [])
    .filter((message) => message.role !== 'system')
    .slice(-MAX_CHAT_TURNS);

  if (!canUseLlm(settings)) {
    return generateDeterministicChatReply(question, profile);
  }

  try {
    const reply = await callChatLlm(
      [
        { role: 'system', content: `${CHAT_SYSTEM_PROMPT}\n\n${typistProfileBlock(profile)}` },
        ...history,
        { role: 'user', content: question },
      ],
      settings,
      { signal, temperature: 0.6, maxTokens: 700 }
    );

    const cleaned = reply.trim();
    if (!cleaned) throw new Error('Empty coach reply');
    return cleaned;
  } catch (err) {
    if (isAbortError(err)) throw err;
    // The provider was reachable but failed. Still answer from the typist's own
    // numbers, and say which answer this is instead of returning a platitude.
    console.warn('AI coach chat fell back to the offline coach:', err);
    return `${generateDeterministicChatReply(question, profile)}\n\n_(${describeProvider(settings)} did not respond, so this answer comes from your local profile only.)_`;
  }
}
