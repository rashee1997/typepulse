/**
 * Single source of truth for the public documentation surface.
 *
 * Everything here is derived from the repository source (never invented): lesson
 * counts come from `lib/curriculum-data.ts`, arcade titles from `components/*Game.tsx`,
 * provider presets from `lib/ai-service.ts`, and the API contracts mirror
 * `app/api/**\/route.ts`.
 *
 * The landing page, the JSON-LD graph and the `/llms.txt` routes all read from this
 * module, which is what guarantees the `FAQPage` structured data mirrors the on-page
 * answers word for word.
 *
 * The page renders only `summary`-level fields; the longer `bullets` arrays exist for
 * `/llms-full.txt`, where a model wants the detail and a human does not.
 */

export const SITE = {
  name: 'Runewright',
  /** Previous product name, kept for data-compatibility notes. */
  formerName: 'TypePulse AI',
  tagline: 'An AI-coached touch-typing studio.',
  definition:
    'Offline-first touch-typing studio: 42 keyboard lessons, 12 arcade drills, adaptive weak-key training and an optional AI coach. Self-hosted, no account, progress in localStorage.',
  repoUrl: 'https://github.com/rashee1997/typepulse',
  repoLabel: 'rashee1997/typepulse',
  version: '0.1.0',
  license: 'No LICENSE file',
  entryPath: '/app',
  docsPath: '/docs',
} as const;

/**
 * Canonical origin for canonical tags, the sitemap and absolute OG URLs.
 * Production should override this with NEXT_PUBLIC_SITE_URL.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
).replace(/\/+$/, '');

export interface Fact {
  value: string;
  label: string;
  detail: string;
}

/** Counts read directly out of the source tree. */
export const FACTS: Fact[] = [
  { value: '42', label: 'lessons', detail: 'lib/curriculum-data.ts' },
  // The dashboard's ActiveGame union, not the number of `*Game.tsx` files: six of
  // those files are unreferenced, so counting files overstated this by six.
  { value: '12', label: 'arcade drills', detail: 'components/ArcadeDashboard.tsx' },
  { value: '8', label: 'AI providers', detail: 'lib/ai-service.ts' },
  { value: '1', label: 'grading engine', detail: 'lib/typing-engine.ts' },
];

export interface PipelineStage {
  id: string;
  title: string;
  actor: string;
  detail: string;
}

/** The keystroke → telemetry path, in the order the code executes it. */
export const PIPELINE: PipelineStage[] = [
  {
    id: 'input',
    title: 'keydown',
    actor: 'app/app/page.tsx',
    detail: 'Forwarded to the engine. No analysis in this frame.',
  },
  {
    id: 'engine',
    title: 'TypingEngine.handleInput()',
    actor: 'lib/typing-engine.ts',
    detail: 'FIFO queue, 25ms bounce filter, repeat + modifier guard.',
  },
  {
    id: 'state',
    title: 'CharState[]',
    actor: 'types/typing.ts',
    detail: 'pending · current · correct · incorrect · corrected.',
  },
  {
    id: 'patterns',
    title: 'patternStats',
    actor: 'lib/typing-engine.ts',
    detail: 'Per-bigram latency with an EWMA score.',
  },
  {
    id: 'stats',
    title: 'getStats()',
    actor: 'lib/typing-engine.ts',
    detail: 'wpm, rawWpm, accuracy, consistency, weakKeys, timeline.',
  },
  {
    id: 'persist',
    title: 'processCompletedSession()',
    actor: 'lib/progress-service.ts',
    detail: 'XP, level, achievements merged, then written to localStorage.',
  },
];

export interface Capability {
  id: string;
  title: string;
  summary: string;
  bullets: string[];
}

export const CAPABILITIES: Capability[] = [
  {
    id: 'engine',
    title: 'Deterministic typing engine',
    summary:
      'One framework-free class owns character state, timing and grading. Components never hold typing logic.',
    bullets: [
      'Re-entrancy queue keeps fast keystroke bursts in strict FIFO order',
      'Intervals measured with performance.now(), never Date.now()',
      'Grading modes: standard, stop-on-error, confidence',
    ],
  },
  {
    id: 'adaptive',
    title: 'Adaptive weak-key training',
    summary:
      'Per-key confidence plus dynamic difficulty adjustment rebuilds the next drill from your own error data.',
    bullets: [
      'calculateKeyConfidence() combines typed/error ratios and latency',
      'DDA injects remediation words mid-session',
      'Bigram hesitation signals name the transition that cost you time',
    ],
  },
  {
    id: 'arcade',
    title: '12 arcade drills',
    summary:
      'Canvas and DOM mini-games reuse the same engine, so scores stay comparable across modes.',
    bullets: [
      'Grand Prix Speedway, Orbital Laser Defense, Bomb Squad Defusal, Word Blitz',
      'Ghost duels race your own recorded keystroke timeline',
    ],
  },
  {
    id: 'coach',
    title: 'Provider-agnostic AI coach',
    summary:
      'Eight provider presets behind one settings shape, with a server route for hosted Gemini.',
    bullets: [
      'Gemini via a server-only route; the key never reaches the browser',
      'OpenAI, OpenRouter, Groq, DeepSeek, custom OpenAI-compatible',
      'Fully local via Ollama or LM Studio, no account needed',
    ],
  },
  {
    id: 'data',
    title: 'Local-first data',
    summary:
      'No account, no database, no upload. Progress lives in localStorage and travels as a checksummed token.',
    bullets: [
      'Keys: typepulse_user_progress, typepulse_preferences, typepulse_ai_settings',
      'exportBackupPackage() / importBackupPackage() with a checksum guard',
    ],
  },
  {
    id: 'offline',
    title: 'Offline + installable',
    summary:
      'A service worker caches the static shell; every typing mode works with the network off.',
    bullets: [
      'Cache-first for hashed Next.js assets, cache fallback for navigation',
      'PWA manifest launches straight into the studio at /app',
    ],
  },
];

export interface CodeSample {
  id: string;
  label: string;
  language: string;
  code: string;
}

export const CODE_SAMPLES: CodeSample[] = [
  {
    id: 'engine',
    label: 'lib/typing-engine.ts',
    language: 'ts',
    code: `const engine = new TypingEngine(
  'the quick brown fox jumps over the lazy dog',
  'standard', // 'standard' | 'stop-on-error' | 'confidence'
  false,      // quickWordSkip
  true,       // ddaEnabled
);

const result = engine.handleInput('t', { timestamp: performance.now() });
// → { success, isCorrect, isFinished, charTyped, targetChar, reason? }

engine.getStats();
// → { wpm, rawWpm, accuracy, consistency, weakKeys, timeline }`,
  },
  {
    id: 'coach',
    label: 'app/api/gemini/coach',
    language: 'ts',
    code: `const res = await fetch('/api/gemini/coach', {
  method: 'POST',
  signal: abortController.signal,   // cancel when the drill ends
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'My weak keys are ; and q.', stream: true }),
});

// stream: true  → text/event-stream frames: data: {"text":"..."}
// stream: false → { "text": "..." }`,
  },
  {
    id: 'ghost',
    label: 'Ghost duels',
    language: 'ts',
    code: `const payload = engine.exportGhostPayload('Ada');
const url = \`\${location.origin}/app?duel=\${encodeURIComponent(payload)}\`;

import { calculateGhostPacerIndex } from '@/lib/typing-engine';
const pacer = calculateGhostPacerIndex(elapsedSeconds, targetWpm, totalChars);`,
  },
];

export interface ParamRow {
  name: string;
  type: string;
  required: string;
  description: string;
}

export interface ApiEndpoint {
  id: string;
  method: 'POST';
  path: string;
  description: string;
  params: ParamRow[];
  response: string;
  notes: string[];
}

export const API_ENDPOINTS: ApiEndpoint[] = [
  {
    id: 'coach',
    method: 'POST',
    path: '/api/gemini/coach',
    description:
      'Server-only proxy to Gemini. Reads GEMINI_API_KEY from the environment; the key never reaches the browser.',
    params: [
      { name: 'prompt', type: 'string', required: 'required', description: 'The user turn. 400 when missing.' },
      { name: 'systemInstruction', type: 'string', required: 'optional', description: 'Overrides the coach persona instruction.' },
      { name: 'temperature', type: 'number', required: 'optional', description: 'Sampling temperature. Default 0.7.' },
      { name: 'stream', type: 'boolean', required: 'optional', description: 'Returns text/event-stream frames terminated by data: [DONE].' },
      { name: 'jsonMode', type: 'boolean', required: 'optional', description: 'Requests application/json from the model.' },
    ],
    response: `{ "text": "…" }`,
    notes: [
      'HTTP 503 until GEMINI_API_KEY is set.',
      'Model: gemini-3.8-flash.',
    ],
  },
  {
    id: 'proxy',
    method: 'POST',
    path: '/api/ai/proxy',
    description:
      'Optional relay for any OpenAI-compatible endpoint, so a browser session never holds a provider key.',
    params: [
      { name: 'endpoint', type: 'string', required: 'required', description: 'Base URL, e.g. https://api.openai.com/v1.' },
      { name: 'body', type: 'object', required: 'required', description: 'Forwarded verbatim as the chat-completions payload.' },
      { name: 'apiKey', type: 'string', required: 'optional', description: 'Sent as an Authorization: Bearer header.' },
      { name: 'path', type: 'string', required: 'optional', description: 'Defaults to /chat/completions.' },
    ],
    response: `{ /* upstream JSON, passed through */ }`,
    notes: ['Appends /v1 when absent.', 'Outbound requests carry a 15s timeout.'],
  },
];

export interface FaqEntry {
  question: string;
  answer: string;
}

/**
 * Rendered verbatim by the landing page and emitted verbatim into the `FAQPage`
 * JSON-LD graph. Do not paraphrase one without the other.
 */
export const FAQ: FaqEntry[] = [
  {
    question: 'What is Runewright?',
    answer:
      "A touch-typing studio that runs entirely in the browser: 42 progressive lessons, 12 arcade drills, adaptive weak-key training and an optional AI coach. Typing logic lives in one dependency-free class, TypingEngine in lib/typing-engine.ts.",
  },
  {
    question: 'Where is my typing data stored?',
    answer:
      'In your browser only. Progress, preferences, arcade scores and AI settings are written to localStorage under typepulse_user_progress, typepulse_preferences, typepulse_ai_settings and typepulse_arcade_stats. There is no account system, no server database and no upload. The typepulse_ prefix is deliberate: renaming those keys would silently discard existing progress.',
  },
  {
    question: 'Does it work offline?',
    answer:
      'Yes. Every typing mode runs locally, and a service worker registered from the root layout caches the static shell so an installed session keeps working with the network off. Only the hosted coach needs a connection, and pointing the coach at Ollama or LM Studio removes that too.',
  },
  {
    question: 'Which AI providers can I use, and how do I set the key?',
    answer:
      'Eight presets: Gemini through the built-in server route, plus OpenAI, OpenRouter, Groq, DeepSeek, Ollama, LM Studio and a custom OpenAI-compatible endpoint. Set GEMINI_API_KEY in your environment — it is read server-side only by app/api/gemini/coach/route.ts and is never sent to the browser. Provider keys typed into Settings stay in your own localStorage and go only to the endpoint you chose. With no key configured the route answers HTTP 503 and everything except the hosted coach keeps working.',
  },
  {
    question: 'How are WPM, accuracy and consistency calculated?',
    answer:
      'WPM is correctKeystrokes divided by 5, normalised to one minute. Raw WPM counts every keystroke including errors. Accuracy is correctKeystrokes over totalKeystrokes to one decimal. Consistency is the coefficient of variation of your inter-key intervals mapped to a 10–100 score. Intervals use performance.now() rather than Date.now(), because a clock correction would otherwise corrupt latency, consistency and the adaptive difficulty baselines.',
  },
  {
    question: 'How does the adaptive engine choose drills?',
    answer:
      'calculateKeyConfidence() combines each key\'s typed count, error count and measured latency into a confidence score, and generateKeybrPracticeText() builds practice text around the least confident keys. Dynamic difficulty adjustment can inject remediation words into the passage you are already typing, and hesitation signals record the exact bigram that slowed you down. Lessons restrict their text to their cumulative unlocked key set.',
  },
  {
    question: 'Can I export or move my progress?',
    answer:
      'Yes. exportBackupPackage() produces a JSON package, exportSyncToken() condenses it into one portable string, and importBackupPackage() accepts either and rejects a truncated token via a checksum. Ghost duels are portable separately: exportGhostPayload() returns a URL-safe keystroke timeline you can paste into a link as /app?duel=<payload>.',
  },
  {
    question: 'What license is it under?',
    answer:
      'None declared yet — the repository has no LICENSE file, so default copyright applies and the code is not formally licensed for redistribution. Add a LICENSE file (MIT or Apache-2.0 are the conventional choices) before relying on it as open source.',
  },
];

/** Copyable setup commands. These are the real scripts from package.json. */
export const QUICKSTART = [
  {
    id: 'install',
    step: '01',
    title: 'Install',
    code: `git clone https://github.com/rashee1997/typepulse.git runewright
cd runewright
bun install`,
  },
  {
    id: 'key',
    step: '02',
    title: 'Optional: coach key',
    code: `# .env.local — server-side only
GEMINI_API_KEY=your-key-here`,
  },
  {
    id: 'run',
    step: '03',
    title: 'Run',
    code: `bun dev      # landing / · docs /docs · studio /app
bun run build && bun run start   # production`,
  },
];

/** Hosted providers a user can point the coach at without touching env vars. */
export const PROVIDER_NAMES = [
  'Google Gemini (server route)',
  'OpenAI',
  'OpenRouter',
  'Groq',
  'DeepSeek',
  'Ollama (local)',
  'LM Studio (local)',
  'Custom OpenAI-compatible',
];

/** In-page anchors for the documentation route, absolute so / can link to them too. */
export const NAV_LINKS = [
  { href: '/docs#quickstart', label: 'Quickstart' },
  { href: '/docs#engine', label: 'Engine' },
  { href: '/docs#api', label: 'API' },
  { href: '/docs#faq', label: 'FAQ' },
];

/** Flattened answer text used by the JSON-LD FAQPage graph. */
export function faqAnswerText(entry: FaqEntry): string {
  return entry.answer;
}
