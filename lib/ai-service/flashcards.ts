/**
 * "Explain It Back" recall cards for technical typing practice.
 *
 * Extracted from `lib/ai-service.ts`. The curated card list below doubles as the
 * offline bank *and* as the shape validation target: a generated card must supply
 * at least three usable rubric terms, otherwise the curated card is returned, so
 * the grader never receives an empty rubric.
 */

import { AISettings } from '@/types/typing';
import { EXPLAIN_SYSTEM_PROMPT } from '../ai-prompts';
import { callLlm, parseLlmJson } from './transport';
import { canUseLlm } from './providers';

// 5. Explain It Back Technical Flashcards
const TECHNICAL_CONCEPT_CARDS = [
  {
    topic: 'Event Loop in Node.js',
    conceptSummary: 'The event loop allows Node.js to perform non-blocking I/O operations by offloading tasks to the kernel whenever possible. It processes microtasks (promises) before the next phase of macrotasks (timers, I/O callbacks).',
    targetPrompt: 'Explain how Node.js handles asynchronous operations without blocking the single execution thread.',
    rubrics: ['single thread', 'non-blocking', 'microtask', 'callback', 'call stack', 'queue'],
  },
  {
    topic: 'CAP Theorem in Distributed Systems',
    conceptSummary: 'The CAP theorem states that any distributed data store can only simultaneously guarantee at most two of three properties: Consistency (every read gets most recent write), Availability (every request receives non-error response), and Partition Tolerance (system functions despite network drops).',
    targetPrompt: 'Explain why a distributed database cannot achieve both perfect consistency and 100% availability during a network partition.',
    rubrics: ['consistency', 'availability', 'partition', 'tradeoff', 'network', 'distributed'],
  },
  {
    topic: 'Binary Search Algorithm',
    conceptSummary: 'Binary search finds the position of a target value within a sorted array. It repeatedly divides the search interval in half, achieving logarithmic O(log n) time complexity compared to linear O(n) scan.',
    targetPrompt: 'Summarize how binary search cuts search time to logarithmic complexity on a sorted array.',
    rubrics: ['sorted', 'divide in half', 'midpoint', 'logarithmic', 'O(log n)'],
  },
  {
    topic: 'TCP Three-Way Handshake',
    conceptSummary: 'TCP establishes a reliable connection using SYN, SYN-ACK, and ACK packets. The client initiates with SYN, the server responds with SYN-ACK, and the client acknowledges with ACK to synchronize sequence numbers.',
    targetPrompt: 'Outline the steps of the TCP three-way handshake and why sequence numbers are synchronized.',
    rubrics: ['syn', 'syn-ack', 'ack', 'sequence', 'connection', 'handshake'],
  },
];

export async function generateExplainItBackPrompt(
  topicIndex?: number,
  settings?: AISettings
): Promise<{ topic: string; conceptSummary: string; targetPrompt: string; rubrics: string[] }> {
  const index = topicIndex !== undefined ? topicIndex % TECHNICAL_CONCEPT_CARDS.length : Math.floor(Math.random() * TECHNICAL_CONCEPT_CARDS.length);
  const card = TECHNICAL_CONCEPT_CARDS[index];

  if (canUseLlm(settings)) {
    try {
      const prompt = `Write one recall card for an "Explain It Back" typing session, where the learner types their understanding of a concept from memory.

Pick a crisp, checkable concept from computing or software engineering. Do not reuse this one: "${card.topic}".

Return one JSON object with exactly these keys:
{"topic": string, "conceptSummary": string, "targetPrompt": string, "rubrics": string[]}

Requirements:
- topic: 2 to 6 words, the name of the concept.
- conceptSummary: 2 to 3 sentences that state the concept precisely enough that a learner could check an explanation against them.
- targetPrompt: one sentence instructing the learner to explain the concept in their own words. It must not ask them to recite a definition verbatim.
- rubrics: 4 to 6 single lowercase key terms a grader can search for in the typed answer.

Output valid JSON only, with no prose before or after it.`;

      const parsed = parseLlmJson<{ topic?: string; conceptSummary?: string; targetPrompt?: string; rubrics?: unknown }>(
        await callLlm(prompt, EXPLAIN_SYSTEM_PROMPT, settings, { temperature: 0.8, jsonMode: true })
      );

      if (parsed?.topic && parsed.conceptSummary && parsed.targetPrompt) {
        const rubrics = Array.isArray(parsed.rubrics)
          ? parsed.rubrics
              .filter((term): term is string => typeof term === 'string' && term.trim().length > 1)
              .map((term) => term.trim().toLowerCase())
              .slice(0, 6)
          : [];

        return {
          topic: parsed.topic,
          conceptSummary: String(parsed.conceptSummary).trim(),
          targetPrompt: String(parsed.targetPrompt).trim(),
          rubrics: rubrics.length >= 3 ? rubrics : card.rubrics,
        };
      }
    } catch {
      // Fall back to the curated card below.
    }
  }

  return card;
}
