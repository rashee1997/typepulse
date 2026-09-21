/**
 * Model transport: one entry point every prompt in the studio goes through.
 *
 * Extracted from `lib/ai-service.ts` and kept deliberately dumb about *what* is
 * being asked. It owns four things:
 *
 * 1. Multi-turn message lists (`callChatLlm`), which is what makes a real coach
 *    conversation possible — a follow-up like "and how do I drill that?" used to
 *    reach the model with no history to refer to.
 * 2. Response hygiene: house rules appended to every system prompt, JSON mode
 *    inferred or pinned per call, and `parseLlmJson` recovering JSON a model
 *    wrapped in prose or fences.
 * 3. Cancellation semantics (`isAbortError`), so a stale request is discarded
 *    rather than overwriting live state.
 * 4. Text normalisation (`cleanTypingText`) for generated prose that is about to
 *    become typing target text.
 */

import { AISettings } from '@/types/typing';
import { DEFAULT_TASK_SYSTEM_PROMPT, HOUSE_STYLE, applyStyleOverride } from '../ai-prompts';
import { DEFAULT_AI_SETTINGS, resolveTransport } from './providers';
import { toTypeable } from '../typing-engine';

/**
 * True when a rejected request was cancelled by an AbortController rather than
 * failing. Callers must treat this as "silently discard", never as a result —
 * otherwise a stale drill's response can overwrite the active session.
 */
export function isAbortError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as { name?: string; code?: number };
  return e.name === 'AbortError' || e.code === 20;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LlmRequestOptions {
  /** Per-call overrides for this request. */
  signal?: AbortSignal;
  /** Overrides `settings.temperature` for this one call. */
  temperature?: number;
  /** Ask the transport for machine-readable JSON where it supports it. */
  jsonMode?: boolean;
  maxTokens?: number;
}

/** True when a prompt is asking for JSON, so the transport can enforce it. */
function looksLikeJsonRequest(systemPrompt: string): boolean {
  // L15: Only infer JSON mode from the system prompt, not user messages
  return /json/i.test(systemPrompt);
}

/** Creates an AbortSignal that aborts on either caller signal or timeout */
function createRequestSignal(callerSignal?: AbortSignal, timeoutMs = 25000): AbortSignal {
  if (typeof AbortSignal !== 'undefined' && 'any' in AbortSignal && 'timeout' in AbortSignal) {
    return callerSignal
      ? AbortSignal.any([callerSignal, AbortSignal.timeout(timeoutMs)])
      : AbortSignal.timeout(timeoutMs);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('Request timed out')), timeoutMs);
  if (callerSignal) {
    callerSignal.addEventListener('abort', () => {
      clearTimeout(timer);
      controller.abort(callerSignal.reason);
    });
  }
  return controller.signal;
}

/**
 * Guarantees the studio's operating rules are present on every request.
 *
 * Task prompts written in this module already embed HOUSE_STYLE; the rest —
 * including older generators — inherit it here, so no task can invent
 * statistics, pad with filler, or wrap JSON in prose.
 */
function withHouseStyle(systemPrompt: string): string {
  return systemPrompt.includes('Ground every claim in the data')
    ? systemPrompt
    : `${systemPrompt}\n\n${HOUSE_STYLE}`;
}

/**
 * Pulls a JSON object or array out of a model response.
 *
 * Models wrap JSON in prose or fences no matter how firmly the prompt forbids
 * it. The previous `replace(/```json/g, '')` path threw on any trailing
 * sentence, which quietly dropped those whole calls to the deterministic
 * fallback even though the model had answered correctly.
 */
export function parseLlmJson<T>(raw: string): T | null {
  if (!raw) return null;
  const withoutFences = raw.replace(/```(?:json)?/gi, '').trim();
  const candidates = [withoutFences];

  const firstBracket = withoutFences.search(/[[{]/);
  if (firstBracket >= 0) {
    const lastBracket = Math.max(withoutFences.lastIndexOf('}'), withoutFences.lastIndexOf(']'));
    if (lastBracket > firstBracket) {
      candidates.push(withoutFences.slice(firstBracket, lastBracket + 1));
    }
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object') return parsed as T;
    } catch {
      // try the next extraction strategy
    }
  }
  return null;
}

/**
 * Normalises generated prose that is about to become typing target text.
 *
 * Markdown, quotes, emoji and ellipses all slow typing without training
 * anything, and models add them unprompted. Not for code snippets — those need
 * their quotes and braces intact.
 */
export function cleanTypingText(raw: string): string {
  const stripped = (raw || '')
    .replace(/```[a-z]*/gi, '')
    .replace(/```/g, '')
    .replace(/[*_#`>]/g, '')
    .replace(/["“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return toTypeable(stripped);
}

/** Word count for generator output contracts. Shared by the task modules. */
export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * The single transport-aware entry point for every model call.
 *
 * It takes a full message list, which is what makes a multi-turn coach
 * possible at all: the chat used to send one bare question with no history, so
 * a follow-up like "and how do I drill that?" reached the model with nothing to
 * refer to.
 *
 * Throws when no transport is configured. Callers gate on `canUseLlm` first and
 * treat any throw as "fall back to the local generator".
 */
export async function callChatLlm(
  messages: ChatMessage[],
  settings: AISettings,
  options: LlmRequestOptions = {}
): Promise<string> {
  const transport = resolveTransport(settings);
  if (transport === 'none') {
    throw new Error('No model transport is configured for this deployment.');
  }

  const turns = messages.filter((message) => message.role !== 'system');
  const taskPrompt =
    messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n\n') || DEFAULT_TASK_SYSTEM_PROMPT;
  const systemInstruction = applyStyleOverride(withHouseStyle(taskPrompt), settings);

  const temperature = options.temperature ?? settings.temperature ?? 0.7;
  const maxTokens = options.maxTokens ?? 800;
  const jsonMode =
    options.jsonMode ?? looksLikeJsonRequest(systemInstruction);

  const requestSignal = createRequestSignal(options.signal);

  if (transport === 'gemini') {
    // H19: Only pass model to Gemini if it's explicitly an allowed Gemini model name
    const geminiModel = settings.model?.startsWith('gemini-') ? settings.model : undefined;
    const res = await fetch('/api/gemini/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: turns, systemInstruction, temperature, jsonMode, maxTokens, model: geminiModel }),
      signal: requestSignal,
    });
    const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
    if (!res.ok) throw new Error(data.error || `Gemini coach request failed (HTTP ${res.status})`);
    return data.text || '';
  }

  const endpoint = settings.endpoint.replace(/\/+$/, '');
  const body = {
    model: settings.model || 'gpt-4o-mini',
    messages: [{ role: 'system', content: systemInstruction }, ...turns],
    temperature,
    max_tokens: maxTokens,
  };

  if (settings.useServerProxy) {
    const res = await fetch('/api/ai/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: settings.endpoint,
        apiKey: settings.apiKey,
        path: '/chat/completions',
        body,
      }),
      signal: requestSignal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `Proxy request failed (HTTP ${res.status})`);
    return data?.choices?.[0]?.message?.content || '';
  }

  const targetUrl = endpoint.endsWith('/v1') ? `${endpoint}/chat/completions` : `${endpoint}/v1/chat/completions`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (settings.apiKey) headers['Authorization'] = `Bearer ${settings.apiKey.trim()}`;

  const res = await fetch(targetUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: requestSignal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || err?.message || `HTTP ${res.status}`);
  }

  const data = await res.json().catch(() => ({}));
  return data?.choices?.[0]?.message?.content || '';
}

/**
 * Single-prompt convenience wrapper over `callChatLlm`.
 *
 * `arg4` used to carry only `{ signal }`; it now also carries `jsonMode`,
 * `temperature` and `maxTokens`, so a task can pin its output contract instead
 * of hoping the word "JSON" appears somewhere in the prompt.
 */
export async function callLlm(
  prompt: string,
  arg2?: string | AISettings,
  arg3?: AISettings,
  arg4?: LlmRequestOptions
): Promise<string> {
  let systemPrompt = DEFAULT_TASK_SYSTEM_PROMPT;
  let settings: AISettings = DEFAULT_AI_SETTINGS;

  if (typeof arg2 === 'string') {
    systemPrompt = arg2;
    if (arg3) settings = arg3;
  } else if (arg2 && typeof arg2 === 'object') {
    settings = arg2;
  }

  return callChatLlm(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    settings,
    arg4
  );
}
