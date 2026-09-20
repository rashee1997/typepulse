/**
 * Story Stream: continuous generated narrative paragraphs used as typing text.
 *
 * Extracted from `lib/ai-service.ts`. Each segment becomes the next typing
 * passage, so continuity matters as much as prose quality — the prompt carries
 * the previous segment forward and the module keeps a per-genre bank for the
 * offline path, which is what a session falls back to when no model is reachable
 * mid-story.
 */

import { AISettings } from '@/types/typing';
import { STORY_SYSTEM_PROMPT } from '../ai-prompts';
import { callLlm, cleanTypingText, countWords } from './transport';
import { canUseLlm } from './providers';

/**
 * Contextual Adaptive Story-Stream generator.
 * Streams continuous immersive narrative paragraphs embedding struggle keys.
 */
export async function generateStoryStreamSegment(
  genre: string,
  weakKeys: string[],
  previousSummary?: string,
  settings?: AISettings
): Promise<{ paragraph: string; genre: string; weakKeys: string[] }> {
  const safeKeys = weakKeys.length > 0 ? weakKeys.slice(0, 4) : ['e', 't', 'a', 'o'];

  if (canUseLlm(settings)) {
    try {
      const prompt = `Continue this typing story.

GENRE: ${genre}
LETTERS TO FAVOUR (inside real words): [${safeKeys.join(', ')}]
${previousSummary ? `STORY SO FAR: "${previousSummary}"` : 'This is the opening scene, so establish the setting and the stakes.'}

Return one paragraph of 45 to 60 words. No headings, no quotes around the paragraph, no summary of what you wrote.`;

      const res = await callLlm(prompt, STORY_SYSTEM_PROMPT, settings, { temperature: 0.85 });
      const cleaned = cleanTypingText(res);
      const words = countWords(cleaned);
      if (cleaned.length > 50 && words >= 30) {
        return { paragraph: cleaned, genre, weakKeys: safeKeys };
      }
    } catch {
      // Fall through to deterministic narrative banks
    }
  }

  // Deterministic high-craft story banks per genre
  const genreBanks: Record<string, string[]> = {
    cyberpunk: [
      'Neon rain dripped down the chrome conduits of Sector Nine. A hooded courier sliced through the encrypted subnet, transferring classified memory clusters into a portable neural deck before automated security sentinels detected the intrusion.',
      'Distant hovercraft rumbled across the smoggy canyon of monolithic skyscrapers. With nimble fingers dancing over the holographic terminal, the ghost hacker rerouted the grid coordinates, silencing alarms just as the blast doors locked into place.',
      'The synaptic link hummed at maximum capacity. Quantum packets cascaded through the terminal screen in luminous cyan waves, illuminating the dark workshop where antique mechanical switches clicked with rhythmic clockwork precision.',
    ],
    scifi: [
      'The orbital explorer glided past the rings of Saturn, scanning deep radio frequencies for anomalous gravitational pulses. Systems verified atmospheric stability while the captain calibrated propulsion thrusters toward the uncharted lunar outpost.',
      'Sublight engines engaged with a quiet celestial vibration. Stellar dust sparkled against the reinforced viewing bay as automated navigation charts mapped the quickest vector through the outer asteroid belt into deep cosmic space.',
    ],
    noir: [
      'Shadows stretched across the wet asphalt outside the deserted railway station. A flickering street lamp hummed softly under the evening fog, while the private investigator adjusted his trench coat and double-checked the address scribbled on a damp matchbook.',
      'The antique typewriter in the corner office ticked steadily into the late hours. Smoke drifted toward the ceiling fan as secrets hidden behind corporate ledgers finally began to reveal their true dangerous connections.',
    ],
    techlore: [
      'Distributed consensus protocols synchronized across five thousand validator nodes. The immutable ledger verified zero-knowledge cryptographic proofs within milliseconds, confirming state execution without revealing confidential transaction details.',
      'Compiling kernel modules required absolute syntactic perfection. The compiler linked dynamic memory addresses into cache-aligned arrays, achieving sub-microsecond latency across high-throughput data processing pipelines.',
    ],
  };

  const bank = genreBanks[genre.toLowerCase()] || genreBanks.cyberpunk;
  const paragraph = bank[Math.floor(Math.random() * bank.length)];
  return { paragraph, genre, weakKeys: safeKeys };
}
