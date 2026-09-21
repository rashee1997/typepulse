import {
  API_ENDPOINTS,
  CAPABILITIES,
  CODE_SAMPLES,
  FACTS,
  FAQ,
  PIPELINE,
  PROVIDER_NAMES,
  QUICKSTART,
  SITE,
  SITE_URL,
  faqAnswerText,
} from '@/lib/site-content';

export const dynamic = 'force-static';

/**
 * `/llms.txt` — a single, plainly summarised entry point for language models.
 *
 * This is the concise layer: what the project is, how it is built, what the
 * interfaces are, and where to go for the long form. It is generated from the
 * same content module the documentation page renders, so it cannot drift out of
 * date relative to the site.
 */
export function GET() {
  const bullets = (items: string[]) =>
    items.map((item) => `- ${item}`).join('\n');

  const body = `# ${SITE.name}

> ${SITE.definition}

${SITE.name} (previously released as ${SITE.formerName}) is a self-hostable,
offline-first touch-typing studio built as a Next.js 15 App Router application
with React 19 and TypeScript. Typing logic is isolated in a single
framework-free class; the AI coach is an optional layer on top of it. Progress
is stored in the browser's localStorage — there is no account system and no
server-side database.

## Key facts

${bullets([
  `Repository: ${SITE.repoUrl}`,
  `Version: v${SITE.version} — no git tags or published releases yet`,
  `License: ${SITE.license}. The full text is in the LICENSE file at the repository root. Bundled third-party packages keep their own licenses (MIT, ISC, Apache-2.0); the README lists them.`,
  `Stack: Next.js 15 (App Router, standalone output), React 19.2, TypeScript 5.9, Tailwind CSS 4.1, @google/genai 2.x, motion 12, canvas-confetti 1.9`,
  `Runtime requirement: Node.js 20+. No database, object storage, or queue.`,
  `Documentation entry point: ${SITE_URL}${SITE.docsPath}`,
  `Interactive studio: ${SITE_URL}/ (direct-to-app, zero friction)`,
  `Long-form machine-readable docs: ${SITE_URL}/llms-full.txt`,
])}

## What is in the box

${bullets(FACTS.map((fact) => `${fact.value} ${fact.label.toLowerCase()} (${fact.detail})`))}

## Architecture

The keystroke path, in execution order:

${PIPELINE.map(
  (stage, index) => `${index + 1}. ${stage.title} — ${stage.actor}: ${stage.detail}`
).join('\n')}

Subsystems:

${bullets(CAPABILITIES.map((capability) => `${capability.title} — ${capability.summary}`))}

Two design constraints are worth carrying into any reasoning about this codebase:
keystroke intervals are measured with \`performance.now()\` (monotonic) rather than
\`Date.now()\` so clock corrections cannot corrupt latency or adaptive difficulty,
and the progress schema in localStorage is treated as stable — the storage keys
keep their legacy \`typepulse_\` prefix precisely because renaming them would
silently discard existing user progress.

## HTTP API

${API_ENDPOINTS.map(
  (endpoint) =>
    `### ${endpoint.method} ${endpoint.path}\n\n${endpoint.description}\n\nParameters: ${endpoint.params
      .map((param) => `${param.name} (${param.type}, ${param.required}) — ${param.description}`)
      .join('; ')}\n\nNotes: ${endpoint.notes.join(' ')}`
).join('\n\n')}

## Library entry points

${bullets(CODE_SAMPLES.map((sample) => `${sample.label}: see ${SITE_URL}${SITE.docsPath}#engine`))}

- \`lib/typing-engine.ts\` — \`TypingEngine\`: \`handleInput(key, options)\`, \`getStats()\`, \`getCharsSnapshot()\`, \`getRollingCadence()\`, \`getConsistency()\`, \`exportGhostPayload(author)\`, \`setGhostDuel(payload)\`, \`getGhostIndexAtTime(ms)\`
- \`lib/typing-engine.ts\` — \`calculateGhostPacerIndex(elapsedSeconds, targetWpm, totalChars)\`, \`parseGhostDuelPayload(raw)\`
- \`lib/adaptive-engine.ts\` — \`calculateKeyConfidence(...)\`, \`generateKeybrPracticeText(...)\`, \`generateDdaRemediationWords(...)\`, \`checkAndUpdateKeybrProgression(...)\`
- \`lib/curriculum.ts\` — \`LESSONS_CURRICULUM\`, \`getLessonTargetKeys(lesson)\`, \`getCumulativeKeysForLesson(id)\`, \`generateDeterministicLessonDrill(...)\`
- \`lib/progress-service.ts\` — \`loadUserProgress()\`, \`saveUserProgress(progress)\`, \`processCompletedSession(...)\`, \`exportBackupPackage(...)\`, \`importBackupPackage(raw)\`
- \`lib/ai-service.ts\` — the AI layer's public barrel; re-exports every symbol below unchanged, so consumers keep importing from this one path — \`AI_PROVIDER_PRESETS\`, \`DEFAULT_AI_SETTINGS\`, \`loadStoredAiSettings()\`, \`saveStoredAiSettings(settings)\`, \`resolveTransport(settings)\`, \`canUseLlm(settings)\`, \`callChatLlm(messages, settings)\`, \`askAiCoachQuestion(request)\`
- \`lib/ai-service/*.ts\` — implementation modules behind that barrel: \`providers\`, \`connection\`, \`transport\`, \`coach\`, \`coach-offline\`, \`narrative\`, \`quest\`, \`boss\`, \`flashcards\`, \`drills\`, \`story-stream\`, \`code-pulse\`, \`biometric\`
- \`lib/ai-prompts.ts\` — \`buildTypistProfile(progress, context)\`, \`formatTypistProfile(profile)\`, \`buildStarterBriefing(profile)\`, \`buildSuggestedQuestions(profile)\`, \`HOUSE_STYLE\` and the per-task system prompts
- \`lib/word-banks.ts\` — \`generateRandomWords(...)\`, \`generateWeakKeyDrill(keys, count)\`, \`getRandomCodeSnippet(lang)\`, \`getRandomQuote()\`

## Self-hosting

\`\`\`bash
git clone ${SITE.repoUrl} runewright
cd runewright
bun install
bun dev   # studio / · docs /docs
\`\`\`

Optional runtime secret: \`GEMINI_API_KEY\`, read server-side only by
\`app/api/gemini/coach/route.ts\`. Without it the coach route answers HTTP 503 and
every other feature keeps working.

Supported coach providers: ${PROVIDER_NAMES.join(', ')}.

## FAQ

${FAQ.map((entry) => `### ${entry.question}\n\n${faqAnswerText(entry)}`).join('\n\n')}

## Documentation index

- [Interactive studio](${SITE_URL}/): the application itself (direct-to-app, zero landing friction)
- [${SITE.name} documentation](${SITE_URL}${SITE.docsPath}): architecture, engine API, HTTP API, quickstart, FAQ
- [Full machine-readable documentation](${SITE_URL}/llms-full.txt): this document expanded with complete code samples and parameter tables
- [Source repository](${SITE.repoUrl})
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
