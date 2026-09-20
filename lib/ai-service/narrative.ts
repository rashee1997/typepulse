/**
 * In-run prose generation: Weakness Weaver passages, rival banter and the
 * mid-run micro-clause injections.
 *
 * Extracted from `lib/ai-service.ts`. These run *during* a live typing session,
 * so each one is latency- and contract-sensitive: banter is capped by a cooldown
 * and by token count, and the Weaver passage is validated for length before it
 * is allowed on screen. A slow or rambling response is not acceptable here, so
 * every path falls back to a pre-written local bank.
 */

import { AISettings } from '@/types/typing';
import { CharacterPersona } from '../character-personas';
import { generateWeakKeyDrill } from '../word-banks';
import { BANTER_SYSTEM_PROMPT, NARRATIVE_SYSTEM_PROMPT } from '../ai-prompts';
import { callLlm, cleanTypingText, countWords } from './transport';
import { canUseLlm } from './providers';

/**
 * 1. Weakness Weaver: Generates a coherent narrative passage embedding target weak patterns
 */
export async function generateWeaknessNarrative(
  weakPatterns: string[],
  settings?: AISettings
): Promise<string> {
  const patterns = weakPatterns && weakPatterns.length > 0 ? weakPatterns.slice(0, 4) : ['th', 'er', 'in'];

  if (canUseLlm(settings)) {
    try {
      const prompt = `Write one typing passage that drills these patterns: [${patterns.join(', ')}].

Requirements:
- 35 to 45 words in 2 or 3 connected sentences of natural English prose.
- Use real words that genuinely contain the patterns. Do not repeat one word to reach the word count.
- Commas, full stops and apostrophes only. No quotes, brackets, digits, emoji, headings or markdown.
- Return the passage text only, with no title, no explanation and no list of the words you used.`;

      const text = cleanTypingText(
        await callLlm(prompt, NARRATIVE_SYSTEM_PROMPT, settings, { temperature: 0.8 })
      );
      if (text.length > 30 && countWords(text) >= 25) {
        return text;
      }
    } catch {
      // Gracefully fall back to local procedural generator
    }
  }

  return generateWeakKeyDrill(patterns, 25);
}

// Rate limiting map for dynamic banter (minimum 8s interval)
const lastBanterTimestamp: Record<string, number> = {};

/**
 * 2. Opponent Racing Banter: Generates reactive racing dialogue with strict token cap
 */
export async function generateOpponentBanter(
  playerWpm: number,
  opponentWpm: number,
  persona: CharacterPersona,
  settings?: AISettings
): Promise<string> {
  const now = Date.now();
  const lastTime = lastBanterTimestamp[persona.id] || 0;
  const isCooldownActive = now - lastTime < 8000;

  // Relative status
  const diff = opponentWpm - playerWpm;
  const state: 'ahead' | 'behind' | 'close' = diff > 4 ? 'ahead' : diff < -4 ? 'behind' : 'close';

  // On cooldown, or with no model reachable, use the persona's pre-written bank
  if (isCooldownActive || !canUseLlm(settings)) {
    const bank = persona.preGeneratedBanter[state] || persona.preGeneratedBanter.close;
    return bank[Math.floor(Math.random() * bank.length)];
  }

  try {
    lastBanterTimestamp[persona.id] = now;
    const prompt = `You are ${persona.name}, ${persona.title}, mid-race against this typist.
Your voice: ${persona.dialogueTone}.
Scoreline: you are at ${opponentWpm} WPM, the typist is at ${playerWpm} WPM — ${state === 'ahead' ? 'you are leading' : state === 'behind' ? 'they are beating you' : 'you are level'}.

Return one line of dialogue reacting to that exact scoreline: at most 12 words, in character, no quotes, nothing but the line.`;

    const banter = await callLlm(prompt, BANTER_SYSTEM_PROMPT, settings, { temperature: 0.9, maxTokens: 60 });
    const cleaned = cleanTypingText(banter);
    return cleaned.length > 3 ? cleaned : persona.preGeneratedBanter[state][0];
  } catch {
    const bank = persona.preGeneratedBanter[state] || persona.preGeneratedBanter.close;
    return bank[Math.floor(Math.random() * bank.length)];
  }
}

/**
 * Adaptive Micro-Clause generator for mid-run Weakness Weaver injections.
 *
 * Local and synchronous by design: it fires while the typist is mid-run, where a
 * network round trip would arrive too late to matter.
 */
export function generateAdaptiveMicroClause(failingPattern: string): string {
  const pat = failingPattern.toLowerCase();
  const bank: Record<string, string[]> = {
    th: ['through the path', 'think other thoughts', 'their northern breath'],
    er: ['faster every river', 'server error recovery', 'better under pressure'],
    in: ['inside infinite line', 'winning dynamic point', 'finding distinct insight'],
    qu: ['quick quiet quest', 'equal quantum query', 'acquire unique quality'],
    tr: ['true travel track', 'trust the transparent trail', 'matrix stream transfer'],
    ch: ['touch each choice', 'launch chain reaction', 'reach rich search'],
    st: ['fast steady star', 'first custom state', 'frosty stone step'],
    sw: ['swift sweet swing', 'switch sword swiftness', 'swim southward sweep'],
  };

  const matches = bank[pat] || [
    `practice the ${pat} rhythm`,
    `steady ${pat} stroke now`,
    `focus on ${pat} key control`,
  ];

  return matches[Math.floor(Math.random() * matches.length)];
}
