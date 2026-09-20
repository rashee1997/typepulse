/**
 * The AI layer's public entry point — an orchestrator barrel.
 *
 * This file used to be a 1,909-line monolith holding provider config, transport,
 * the coach, nine generators and their offline fallbacks. It is now the stable
 * seam: it re-exports every symbol the rest of the studio imports, and the
 * implementation lives in cohesive modules under `lib/ai-service/`:
 *
 *   providers.ts    Provider presets, stored settings, transport resolution.
 *   connection.ts   The Settings → AI Provider connection probe.
 *   transport.ts    `callChatLlm`/`callLlm`, JSON recovery, text normalisation.
 *   coach.ts        Debrief, mission design, the multi-turn coach chat.
 *   coach-offline.ts Deterministic answers from the typist's own numbers.
 *   narrative.ts    Weakness Weaver passages, rival banter, micro-clauses.
 *   quest.ts        The branching Typing Quest story tree and scene generation.
 *   boss.ts         Boss Gauntlet combat rounds.
 *   flashcards.ts   "Explain It Back" recall cards.
 *   drills.ts       Per-lesson AI drills and the tri-tier daily board.
 *   story-stream.ts Continuous narrative segments for Story Stream.
 *   code-pulse.ts   Real source-code drills for Code Pulse.
 *   biometric.ts    Keystroke-latency diagnostic and 3-day prescription.
 *
 * Two invariants hold across the split, and they are the reason it was done this
 * way rather than by re-authoring the code:
 *
 * 1. **No consumer changes.** Every existing `import { … } from '@/lib/ai-service'`
 *    keeps working, including type-only imports, because the barrel re-exports
 *    the original 35-symbol surface unchanged.
 * 2. **One direction of dependency.** Modules depend on `providers` and
 *    `transport`, never on each other sideways, so there are no cycles and the
 *    transport remains the single place a model call can be made from.
 */

// --- Provider configuration, settings and transport resolution -------------
export {
  AI_PROVIDER_PRESETS,
  DEFAULT_AI_SETTINGS,
  canUseLlm,
  describeProvider,
  getServerCoachAvailable,
  loadStoredAiSettings,
  probeServerCoach,
  resolveTransport,
  saveStoredAiSettings,
  subscribeServerCoach,
  withBuiltInCoach,
} from './ai-service/providers';
export type { LlmTransport } from './ai-service/providers';

// --- Connection diagnostics ------------------------------------------------
export { testAiConnection } from './ai-service/connection';

// --- Transport, JSON recovery and text normalisation -----------------------
export { callChatLlm, callLlm, cleanTypingText, isAbortError, parseLlmJson } from './ai-service/transport';
export type { ChatMessage, LlmRequestOptions } from './ai-service/transport';

// --- The coach -------------------------------------------------------------
export { askAiCoachQuestion, generateAiCoachFeedback, generateAiMission } from './ai-service/coach';
export type { CoachChatRequest } from './ai-service/coach';

// --- Game modes and material generators ------------------------------------
export { generateAdaptiveMicroClause, generateOpponentBanter, generateWeaknessNarrative } from './ai-service/narrative';
export { generateQuestScene } from './ai-service/quest';
export { generateBossTurn } from './ai-service/boss';
export { generateExplainItBackPrompt } from './ai-service/flashcards';
export { generateLessonAiDrill, generateTriTierDailyMissions } from './ai-service/drills';
export { generateStoryStreamSegment } from './ai-service/story-stream';
export { generateCodePulseDrill } from './ai-service/code-pulse';
export { generateBiometricDiagnostic } from './ai-service/biometric';
