/**
 * Boss Gauntlet: one combat round at a time.
 *
 * Extracted from `lib/ai-service.ts`. A round has a hard fairness contract — the
 * attack phrase must be completable inside the time limit it ships with — so the
 * generated time limit is never trusted on its own: it is raised to whatever the
 * phrase needs at 20 WPM before the round is returned.
 */

import { AISettings, BossTurnData, TurnResult } from '@/types/typing';
import { CharacterPersona } from '../character-personas';
import { generateWeakKeyDrill, numericSymbolSets } from '../word-banks';
import { BOSS_SYSTEM_PROMPT } from '../ai-prompts';
import { callLlm, cleanTypingText, countWords, parseLlmJson } from './transport';
import { canUseLlm } from './providers';

/**
 * 4. Boss Gauntlet / Adaptive Boss Fight: Generates boss attacks targeted to player weaknesses
 */
export async function generateBossTurn(
  weakPatterns: string[],
  bossPersona: CharacterPersona,
  lastResult: TurnResult,
  settings?: AISettings
): Promise<BossTurnData> {
  const patterns = weakPatterns.length > 0 ? weakPatterns.slice(0, 3) : ['th', 'er', 'in'];

  // Offline deterministic fallback
  const bossAttacks: Record<string, { name: string; quote: string; baseMultiplier: number }[]> = {
    'titan-omega': [
      { name: 'Seismic Shockwave', quote: 'Brace for crushing pressure!', baseMultiplier: 1.2 },
      { name: 'Fortress Railgun', quote: 'Armored slugs incoming!', baseMultiplier: 1.4 },
      { name: 'Overcharge Blast', quote: 'Deflect this kinetic impact if you can!', baseMultiplier: 1.6 },
    ],
    'chrono-specter': [
      { name: 'Time Dilation Warp', quote: 'Your seconds melt into the void!', baseMultiplier: 1.3 },
      { name: 'Paradox Glitch', quote: 'Can you strike keys that do not yet exist?', baseMultiplier: 1.5 },
      { name: 'Chronometer Freeze', quote: 'Feel the cold paralysis of stalled time!', baseMultiplier: 1.7 },
    ],
    grandmaster: [
      { name: 'Quantum Singularity', quote: 'Order collapses into zero entropy.', baseMultiplier: 1.5 },
      { name: 'Neural Overload', quote: 'Your biological synapses cannot process this frequency.', baseMultiplier: 1.8 },
      { name: 'Terminal Execution', quote: 'Process terminated: return code 0.', baseMultiplier: 2.0 },
    ],
  };

  const attackPool = bossAttacks[bossPersona.id] || bossAttacks['titan-omega'];
  const attack = attackPool[Math.floor(Math.random() * attackPool.length)];

  // Generate attack text embedding weak patterns and symbols
  const weakDrill = generateWeakKeyDrill(patterns, 8);
  const symbolFragment = numericSymbolSets.codeFragments[Math.floor(Math.random() * numericSymbolSets.codeFragments.length)];
  const attackText = Math.random() < 0.5 ? `${weakDrill} ${symbolFragment}` : `${symbolFragment} ${weakDrill}`;

  const timeLimit = Math.max(12, Math.round((attackText.length / 5 / (bossPersona.targetWpm / 60)) * 1.3));

  if (canUseLlm(settings)) {
    try {
      const lastRound = lastResult.playerSuccess ? 'the typist cleared your last attack' : 'the typist failed your last attack';
      const prompt = `Design the next combat round.

BOSS
- ${bossPersona.name}, ${bossPersona.title} (speaks: ${bossPersona.dialogueTone})
- Cruising pace: ${bossPersona.targetWpm} WPM
- Last round: ${lastRound}

TARGET
- N-grams this typist is weakest on: [${patterns.join(', ')}]
- These must appear inside real words, not as key mashing.

Return one JSON object with exactly these keys:
{"attackName": string, "bossDialogue": string, "attackText": string, "timeLimitSeconds": number}

Requirements:
- attackName: 2 to 4 words, dramatic, different from "${attack.name}".
- bossDialogue: one in-character line, at most 14 words, no quotes.
- attackText: 12 to 18 words of natural English, embedded with the n-grams above.
- timeLimitSeconds: an integer between 12 and 25, sized to the length of your attackText.

Output valid JSON only, with no prose before or after it.`;

      const parsed = parseLlmJson<{ attackName?: string; bossDialogue?: string; attackText?: string; timeLimitSeconds?: number }>(
        await callLlm(prompt, BOSS_SYSTEM_PROMPT, settings, { temperature: 0.85, jsonMode: true })
      );

      if (parsed?.attackName && parsed.attackText) {
        const attackText = cleanTypingText(parsed.attackText);
        const words = countWords(attackText);
        if (words >= 6 && words <= 30) {
          // Never hand back a round the typist cannot physically finish: the
          // model's own time limit is raised to whatever 20 WPM needs.
          const fairAtTwentyWpm = Math.max(12, Math.ceil(attackText.length / 5 / (20 / 60)));
          return {
            attackName: parsed.attackName,
            bossDialogue: cleanTypingText(parsed.bossDialogue || attack.quote),
            attackText,
            targetPhrase: attackText,
            damageMultiplier: attack.baseMultiplier,
            timeLimitSeconds: Math.max(Number(parsed.timeLimitSeconds) || 0, fairAtTwentyWpm),
          };
        }
      }
    } catch {
      // Fallback below
    }
  }

  return {
    attackName: attack.name,
    bossDialogue: attack.quote,
    attackText: attackText.trim(),
    targetPhrase: attackText.trim(),
    damageMultiplier: attack.baseMultiplier,
    timeLimitSeconds: timeLimit,
  };
}
