import { AISettings } from '@/types/typing';
import { callLlm, canUseLlm } from './ai-service';
import { DUEL_SYSTEM_PROMPT } from './ai-prompts';
import { toTypeable } from './typing-engine';

export type DuelDifficulty = 'novice' | 'adept' | 'master' | 'grandmaster';

export interface DuelOpponentConfig {
  id: DuelDifficulty;
  name: string;
  title: string;
  avatar: string;
  color: string;
  targetWpm: number;
  wordCount: number;
  baseXp: number;
  winBonusXp: number;
  description: string;
}

export interface DuelPassage {
  id: string;
  difficulty: DuelDifficulty;
  title: string;
  opponent: DuelOpponentConfig;
  text: string;
}

export const DUEL_OPPONENTS: Record<DuelDifficulty, DuelOpponentConfig> = {
  novice: {
    id: 'novice',
    name: 'Byte-01',
    title: 'Rookie AI Drone',
    avatar: '🤖',
    color: 'emerald',
    targetWpm: 36,
    wordCount: 30,
    baseXp: 120,
    winBonusXp: 100,
    description: 'A calibration bot with steady, relaxed keystrokes. Ideal for warmups.',
  },
  adept: {
    id: 'adept',
    name: 'Cipher-V',
    title: 'Cyber Specialist',
    avatar: '⚡',
    color: 'indigo',
    targetWpm: 64,
    wordCount: 42,
    baseXp: 220,
    winBonusXp: 180,
    description: 'Fast-acting neural agent. Capable of consistent mid-tier speed with high accuracy.',
  },
  master: {
    id: 'master',
    name: 'Valkyrie-9',
    title: 'Speed Phantom',
    avatar: '🔥',
    color: 'amber',
    targetWpm: 90,
    wordCount: 52,
    baseXp: 380,
    winBonusXp: 320,
    description: 'An aggressive speed daemon that maintains relentless pressure across complex punctuation.',
  },
  grandmaster: {
    id: 'grandmaster',
    name: 'Overlord Zero',
    title: 'Synthetic Sovereign',
    avatar: '👑',
    color: 'purple',
    targetWpm: 114,
    wordCount: 65,
    baseXp: 600,
    winBonusXp: 500,
    description: 'Supreme computational intelligence with superhuman burst velocity and flawless rhythm.',
  },
};

// Curated AI-Generated High Quality Procedural Vault for Instant Zero-Latency Loading
const DUEL_FALLBACK_PASSAGES: Record<DuelDifficulty, string[]> = {
  novice: [
    'Every day begins with a single intentional choice. Breathe deeply and let your fingertips rest on the home row as your rhythm smoothly takes shape.',
    'Clear water flows down the quiet stone stream while morning sunlight warms the forest floor. A calm typist strikes each switch with effortless grace.',
    'The golden light touched the open meadow where gentle breezes carried the scent of summer rain. Patience and focus unlock the true speed within.',
    'Small habits repeated daily create monumental transformations over time. Trust the position of your fingers and strike each key with quiet confidence.',
  ],
  adept: [
    'Digital architectures operate on microscopic pulses of light, routing information through silicon pathways at lightning speed to connect disparate minds across the globe.',
    'The engineer calibrated the orbital thrusters, ensuring telemetry packets synchronized with ground control before initiating the lunar descent trajectory.',
    'Modern software systems balance asynchronous events with deterministic memory safety, transforming abstract algorithmic blueprints into responsive human experiences.',
    'True mastery of touch typing emerges when the cognitive bridge between thought and physical articulation dissolves into pure subconscious fluid execution.',
  ],
  master: [
    'Consciousness navigates an intricate labyrinth of sensory impressions, synthesizing fleeting electromagnetic spectra into a coherent perception of reality, space, and time.',
    'Quantum superposition challenges classical deterministic intuition, proposing that particles occupy multiple probability amplitudes until observed by an external apparatus.',
    'Beneath the luminous canopy of the metropolis, decentralized consensus protocols mediated billions of microscopic cryptographic transactions across distributed planetary ledgers.',
    'Rhetorical precision and typographic cadence mirror the discipline of a virtuoso pianist, where nuance, velocity, and dynamic restraint dictate the aesthetic outcome.',
  ],
  grandmaster: [
    'Hyper-dimensional tensor projections undergo recursive gradient descent across distributed clusters, optimizing synaptic weights to synthesize abstract mathematical paradigms with terrifying precision.',
    'Thermodynamic entropy dictates that closed cosmological structures inevitably drift toward maximum disorder, yet biological cognition constructs intricate localized islands of extraordinary complexity.',
    'Asynchronous telemetry streams intertwined with speculative execution branches, dynamically recalibrating cryogenic quantum logic gates before macroscopic decoherence could corrupt the calculation.',
    'The convergence of bio-synthetic cybernetics and artificial general intelligence will fundamentally redefine the boundaries of anthropogenic identity, consciousness, and metaphysical destiny.',
  ],
};

export function getInitialDuelPassage(difficulty: DuelDifficulty): DuelPassage {
  const opponent = DUEL_OPPONENTS[difficulty];
  const options = DUEL_FALLBACK_PASSAGES[difficulty];
  const selectedText = options[Math.floor(Math.random() * options.length)];
  return {
    id: `duel-${difficulty}-init`,
    difficulty,
    title: `${opponent.name} Duel`,
    opponent,
    text: selectedText,
  };
}

export async function generateDuelPassage(
  difficulty: DuelDifficulty,
  settings?: AISettings
): Promise<DuelPassage> {
  const opponent = DUEL_OPPONENTS[difficulty];

  // Try dynamic generation when a model is actually reachable
  if (canUseLlm(settings)) {
    try {
      const prompt = `Write the passage for a ${difficulty.toUpperCase()} duel against ${opponent.name}, ${opponent.title}.

Requirements:
- One paragraph, strictly between ${opponent.wordCount - 5} and ${opponent.wordCount + 5} words.
- Tone: ${
        difficulty === 'novice'
          ? 'inspiring, simple, positive everyday prose'
          : difficulty === 'adept'
          ? 'modern technology and futuristic systems, in an engaging narrative'
          : difficulty === 'master'
          ? 'scientific discovery and philosophy with a rich vocabulary'
          : 'high-concept cybernetics, astrophysics or deep philosophy'
      }.
- Plain sentences a typist can read at speed: no semicolon chains, no rare punctuation, no repeated words inside one sentence.
- Return the paragraph text only: no heading, no quotes around it, no markdown.`;

      const aiText = await callLlm(prompt, DUEL_SYSTEM_PROMPT, settings, {
        temperature: 0.8,
        maxTokens: 500,
      });

      const cleaned = toTypeable(aiText.replace(/["`]/g, '').trim());
      if (cleaned.length > 40 && cleaned.split(/\s+/).length >= 20) {
        return {
          id: `duel-${difficulty}-${Date.now()}`,
          difficulty,
          title: `${opponent.name} Duel`,
          opponent,
          text: cleaned,
        };
      }
    } catch (err) {
      console.warn('AI Duel text generation fallback to curated bank:', err);
    }
  }

  // Instant Fallback from Curated Procedural Bank
  const options = DUEL_FALLBACK_PASSAGES[difficulty];
  const selectedText = options[Math.floor(Math.random() * options.length)];

  return {
    id: `duel-${difficulty}-${Date.now()}`,
    difficulty,
    title: `${opponent.name} Duel`,
    opponent,
    text: selectedText,
  };
}
