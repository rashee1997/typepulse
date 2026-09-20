import { CertificationBenchmark, CertificationTierId } from '@/types/typing';

export const CERTIFICATION_BENCHMARKS: CertificationBenchmark[] = [
  {
    id: 'bronze',
    title: 'Bronze Touch Typist',
    badge: '🥉',
    minWpm: 30,
    minAccuracy: 95,
    description: 'Foundation touch typing with confident home and reach row navigation.',
    color: '#cd7f32',
  },
  {
    id: 'silver',
    title: 'Silver Fluid Scribe',
    badge: '🥈',
    minWpm: 50,
    minAccuracy: 96,
    description: 'Exceeds standard professional speed with dependable letter-burst consistency.',
    color: '#c0c0c0',
  },
  {
    id: 'gold',
    title: 'Gold Velocity Master',
    badge: '🥇',
    minWpm: 70,
    minAccuracy: 97,
    description: 'High-octane touch typist cadence capable of sustained executive output.',
    color: '#f59e0b',
  },
  {
    id: 'platinum',
    title: 'Platinum Cadence Elite',
    badge: '💎',
    minWpm: 90,
    minAccuracy: 98,
    description: 'Competitive tier with near-flawless tactile reflex and zero visual glancing.',
    color: '#38bdf8',
  },
  {
    id: 'diamond',
    title: 'Diamond Sovereign Grandmaster',
    badge: '👑',
    minWpm: 110,
    minAccuracy: 99,
    description: 'World-class keystroke velocity and absolute typographic perfection.',
    color: '#a855f7',
  },
];

export interface CertificationPassage {
  id: string;
  title: string;
  wordCount: number;
  content: string;
}

export const STANDARDIZED_CERTIFICATION_PASSAGES: CertificationPassage[] = [
  {
    id: 'cert-pass-1',
    title: 'The Discipline of Rhythmic Velocity',
    wordCount: 78,
    content: 'Speed in touch typing is not born from erratic rushing, but from quiet, disciplined rhythm. When the typist learns to let each finger glide back to its anchor without panic, the barrier between thought and written word dissolves. Accuracy must always precede velocity; once the hands move with metronomic certainty across the keyboard, speed naturally follows like water finding its easiest path through stone.',
  },
  {
    id: 'cert-pass-2',
    title: 'The Evolution of Written Computing',
    wordCount: 82,
    content: 'From mechanical levers struck on inked ribbons to silent solid-state switches, the human desire to capture thought has reshaped engineering. Early typists had to strike each key with physical force, pacing themselves to keep the delicate typebars from colliding. Today, high-frequency capacitive sensors track the slightest fingertip displacement, turning subtle physical impulses into instant digital expression with microsecond fidelity.',
  },
  {
    id: 'cert-pass-3',
    title: 'Architectures of Resilient Systems',
    wordCount: 80,
    content: 'A reliable software system must be built on predictable foundations. Engineers who craft elegant systems know that complexity is the enemy of reliability. Every interface should be minimal, every boundary explicit, and every failure anticipated before it strikes. When each layer solves a single problem with uncompromising precision, the whole structure stands firm against unexpected surges in traffic and cascading faults.',
  },
  {
    id: 'cert-pass-4',
    title: 'Cognitive Flow in Creative Work',
    wordCount: 76,
    content: 'Deep work requires an uninterrupted bridge between human intention and creative medium. When technical friction vanishes, the creator enters a rare state of flow where minutes slip past like seconds. Every tool that demands conscious deliberation pulls focus away from synthesis. Mastering your primary instruments until they operate beneath conscious awareness is the single greatest gift you can grant your creative mind.',
  },
  {
    id: 'cert-pass-5',
    title: 'The Philosophy of Mastery',
    wordCount: 80,
    content: 'True craft is quiet, repetitive, and deeply rewarding. The beginner seeks dramatic breakthroughs in single afternoons, while the master understands the compound interest of daily deliberate practice. An improvement of half a percent, maintained over hundreds of mornings, yields a transformation that looks like magic to the outside observer. Stay patient, trust the trajectory, and respect the fundamentals even when they feel familiar.',
  },
  {
    id: 'cert-pass-6',
    title: 'The Art of Clear Communication',
    wordCount: 74,
    content: 'Clarity is the hardest courtesy a writer can offer the reader. Jargon and ornamentation often disguise incomplete thinking, while simple, vigorous sentences reveal the heart of an argument at once. To write well is to think twice: first to understand what you mean, and second to express it so transparently that misunderstandings become nearly impossible across every cultural and generational boundary.',
  },
];

export function getCertificationTier(wpm: number, accuracy: number): CertificationBenchmark | null {
  const eligible = CERTIFICATION_BENCHMARKS.filter(
    (b) => wpm >= b.minWpm && accuracy >= b.minAccuracy
  );
  if (eligible.length === 0) return null;
  return eligible[eligible.length - 1];
}

export function getRandomCertificationPassage(): CertificationPassage {
  return STANDARDIZED_CERTIFICATION_PASSAGES[
    Math.floor(Math.random() * STANDARDIZED_CERTIFICATION_PASSAGES.length)
  ];
}
