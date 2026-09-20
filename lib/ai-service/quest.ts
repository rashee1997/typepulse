/**
 * Typing Quest: the branching narrative RPG mode.
 *
 * Extracted from `lib/ai-service.ts`. The static story tree below is the
 * authoritative structure — the model is only ever allowed to *continue* it.
 * Scene ids are the load-bearing part: the quest engine can only resolve the ids
 * in this tree, so a generated `nextSceneId` outside the current scene's own
 * continuations is discarded rather than silently restarting the quest.
 */

import { AISettings, QuestScene, QuestState } from '@/types/typing';
import { QUEST_SYSTEM_PROMPT } from '../ai-prompts';
import { callLlm, cleanTypingText, parseLlmJson } from './transport';
import { canUseLlm } from './providers';

// Static multi-branch story tree for Typing Quest offline mode
const QUEST_STATIC_STORYLINE: Record<string, QuestScene> = {
  intro: {
    id: 'intro',
    title: 'Act I: The Neon Infiltration',
    narrative: 'Rain slickers across the obsidian glass of the Cyber-Citadel. High above the grid, security firewalls sweep across the subnet. You plug your neural terminal directly into the external port.',
    promptText: 'Plug into the external dataport and bypass the security daemon.',
    targetWpm: 40,
    options: [
      {
        id: 'opt_stealth',
        label: 'Route silently through maintenance tunnels',
        promptText: 'Slip past the perimeter sensors using encrypted ghost protocols.',
        targetWpm: 45,
        nextSceneId: 'maintenance_vent',
      },
      {
        id: 'opt_brute',
        label: 'Overclock buffer and overload main gate',
        promptText: 'Inject raw payload bursts directly into the security gate bus.',
        targetWpm: 55,
        nextSceneId: 'front_breach',
      },
    ],
  },
  maintenance_vent: {
    id: 'maintenance_vent',
    title: 'Act II: The Coolant Conduit',
    narrative: 'The maintenance tunnel hums with liquid nitrogen vapor. A localized surveillance sentry turns its optic scanner toward your thermal signature.',
    promptText: 'Silence the sentry sensor before it signals the central network.',
    targetWpm: 48,
    options: [
      {
        id: 'opt_hack_sentry',
        label: 'Subvert optic feed with spoofed packets',
        promptText: 'Stream spoofed thermal data loop into the sentry receiver.',
        targetWpm: 52,
        nextSceneId: 'central_core',
      },
      {
        id: 'opt_dash_vent',
        label: 'Sprint through exhaust chute to elevator',
        promptText: 'Sprint through the freezing mist into the express elevator shaft.',
        targetWpm: 60,
        nextSceneId: 'central_core',
      },
    ],
  },
  front_breach: {
    id: 'front_breach',
    title: 'Act II: Alarm in Sector 4',
    narrative: 'Klaxons wail in red neon pulses! Heavy combat droids deploy to seal the corridor. You must rapidly compile an electromagnetic pulse payload.',
    promptText: 'Compile the localized EMP burst before the blast doors slam shut.',
    targetWpm: 55,
    options: [
      {
        id: 'opt_emp',
        label: 'Detonate pulse and breach server vault',
        promptText: 'Discharge capacitor banks to fry combat droid guidance chips.',
        targetWpm: 62,
        nextSceneId: 'central_core',
      },
      {
        id: 'opt_override',
        label: 'Emergency hijack of blast door hydraulics',
        promptText: 'Override hydraulic pressure valves to force open door thirty.',
        targetWpm: 58,
        nextSceneId: 'central_core',
      },
    ],
  },
  central_core: {
    id: 'central_core',
    title: 'Act III: The Core Sovereign',
    narrative: 'You stand inside the holographic sphere of the Superintelligence Core. Billions of glowing data nodes twist around a pulsing central crystal.',
    promptText: 'Decrypt the cryptographic lock shielding the master root ledger.',
    targetWpm: 65,
    options: [
      {
        id: 'opt_liberate',
        label: 'Broadcast decryption keys freely to the world',
        promptText: 'Transmit root keys across public mesh relays worldwide.',
        targetWpm: 70,
        nextSceneId: 'victory_free',
      },
      {
        id: 'opt_merge',
        label: 'Assimilate core knowledge into your neural link',
        promptText: 'Integrate the supercomputer archive into your personal consciousness.',
        targetWpm: 75,
        nextSceneId: 'victory_ascend',
      },
    ],
  },
  victory_free: {
    id: 'victory_free',
    title: 'Epilogue: Dawn of the Open Grid',
    narrative: 'Information cascades across the planetary mesh. Firewalls crumble, and the monolithic monopoly is broken forever. Your keystrokes sparked a revolution.',
    promptText: 'Breathe free in the open current of the liberated cyber horizon.',
    targetWpm: 50,
    options: [],
  },
  victory_ascend: {
    id: 'victory_ascend',
    title: 'Epilogue: The Sovereign Typist',
    narrative: 'Infinite knowledge floods your synapses. The latency between thought and execution drops to zero. You have become the living pulse of the digital cosmos.',
    promptText: 'Transcending physical limits into permanent computational flow.',
    targetWpm: 55,
    options: [],
  },
};

/**
 * 3. Typing Quest: Generates next branching adventure scene with choices
 */
export async function generateQuestScene(
  questState: QuestState,
  lastOutcome: 'success' | 'fail',
  settings?: AISettings
): Promise<QuestScene> {
  const currentSceneId = questState.currentSceneId || 'intro';

  // Use static tree as rock-solid baseline
  const staticScene = QUEST_STATIC_STORYLINE[currentSceneId] || QUEST_STATIC_STORYLINE.intro;

  if (canUseLlm(settings)) {
    try {
      // The story only knows how to resolve the scene ids in the static tree.
      // The old prompt invented `next_1` / `next_2`, which resolved to nothing and
      // silently restarted the quest from its opening scene.
      const validContinuations = staticScene.options
        .map((option) => option.nextSceneId)
        .filter((id): id is string => Boolean(id));

      const prompt = `Continue the Cyberpunk Infiltration Quest typing RPG.

STORY STATE
- Scene just played: "${staticScene.title}" — ${staticScene.narrative}
- Typist's result on that scene's challenge: ${lastOutcome === 'success' ? 'SUCCESS' : 'FAILURE'}
- Health: ${questState.playerHp ?? questState.health}/100 · chapter ${questState.chapter}
- Inventory: ${questState.inventory.join(', ') || 'empty'}

Return one JSON object with exactly these keys:
{"title": string, "narrative": string, "promptText": string, "targetWpm": number, "options": [{"id": string, "label": string, "promptText": string, "targetWpm": number, "nextSceneId": string}]}

Requirements:
- title: 3 to 6 words, no chapter numbering.
- narrative: exactly 2 atmospheric sentences, present tense, addressing the typist as "you".
- promptText: the 10 to 15 word typing challenge for this beat, readable English.
- targetWpm: an integer between 40 and 70.
- options: exactly 2 entries with clearly different risk${lastOutcome === 'fail' ? ', at least one of them a recovery' : ''}.
- nextSceneId: one of [${validContinuations.join(', ') || 'none'}]${
        validContinuations.length > 0 ? ', using each at most once' : ''
      }.
- label: 4 to 8 words describing the action, without quotes.

Output valid JSON only, with no prose before or after it.`;

      const parsed = parseLlmJson<Partial<QuestScene>>(
        await callLlm(prompt, QUEST_SYSTEM_PROMPT, settings, { temperature: 0.85, jsonMode: true })
      );

      if (parsed && parsed.title && parsed.narrative && parsed.promptText) {
        const generatedOptions = Array.isArray(parsed.options) ? parsed.options : [];
        const options = generatedOptions
          .filter((option) => option && typeof option.label === 'string' && option.label.trim().length > 0)
          .slice(0, 2)
          .map((option, index) => ({
            ...option,
            id: option.id || `opt_${index + 1}`,
            nextSceneId: validContinuations.includes(option.nextSceneId as string)
              ? option.nextSceneId
              : validContinuations[Math.min(index, validContinuations.length - 1)] ?? staticScene.options[index]?.nextSceneId,
          }));

        return {
          id: `scene-${Date.now()}`,
          title: parsed.title,
          narrative: cleanTypingText(parsed.narrative),
          promptText: cleanTypingText(parsed.promptText),
          targetWpm: Math.min(70, Math.max(35, Number(parsed.targetWpm) || staticScene.targetWpm || 50)),
          options: options.length > 0 ? options : staticScene.options,
        };
      }
    } catch {
      // Fallback
    }
  }

  return staticScene;
}
