/**
 * Provider configuration, settings persistence and transport resolution.
 *
 * Extracted from `lib/ai-service.ts`, which is now a barrel re-exporting this
 * module. Everything here is configuration and state — no task prompts, no
 * model calls — so the rest of the studio can ask "which transport will really
 * run?" without pulling in the generators.
 */

import { AISettings } from '@/types/typing';

export const AI_PROVIDER_PRESETS = [
  {
    id: 'openai',
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
    requiresKey: true,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter (Multi-Model)',
    endpoint: 'https://openrouter.ai/api/v1',
    defaultModel: 'deepseek/deepseek-chat',
    models: [
      'deepseek/deepseek-chat',
      'google/gemini-2.5-flash',
      'meta-llama/llama-3.3-70b-instruct',
      'mistralai/mistral-small-24b-instruct-2501',
      'anthropic/claude-3.5-haiku',
    ],
    requiresKey: true,
  },
  {
    id: 'groq',
    name: 'Groq (Ultra Fast)',
    endpoint: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    requiresKey: true,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    endpoint: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    requiresKey: true,
  },
  {
    id: 'ollama',
    name: 'Ollama (Local AI)',
    endpoint: 'http://localhost:11434/v1',
    defaultModel: 'llama3',
    models: ['llama3', 'mistral', 'qwen2.5', 'codellama', 'phi3'],
    requiresKey: false,
  },
  {
    id: 'lm-studio',
    name: 'LM Studio (Local AI)',
    endpoint: 'http://localhost:1234/v1',
    defaultModel: 'local-model',
    models: ['local-model'],
    requiresKey: false,
  },
  {
    id: 'gemini',
    name: 'Google Gemini (Built-in Server)',
    endpoint: '/api/gemini/coach',
    defaultModel: 'gemini-3.8-flash',
    models: ['gemini-3.8-flash'],
    requiresKey: false,
  },
  {
    id: 'custom',
    name: 'Custom OpenAI-Compatible Endpoint',
    endpoint: '',
    defaultModel: '',
    models: [],
    requiresKey: false,
  },
];

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'openai-compatible',
  endpoint: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
  useServerProxy: false,
  temperature: 0.7,
  /**
   * Optional free-text style override. Empty by default; when set it is appended
   * to every task's system prompt, so the field is no longer dead config.
   */
  systemPrompt: '',
};

const STORAGE_KEY = 'typepulse_ai_settings';

export function loadStoredAiSettings(): AISettings {
  if (typeof window === 'undefined') return DEFAULT_AI_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_AI_SETTINGS;
    return { ...DEFAULT_AI_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

export function saveStoredAiSettings(settings: AISettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save AI settings to localStorage', err);
  }
}

/**
 * Whether this deployment can reach a model on its own.
 *
 * The built-in Gemini route reads GEMINI_API_KEY server-side, so a self-hosted
 * install with a key already has a coach even though the user has pasted nothing
 * into Settings. Without this probe the gates below only ever saw the typed key
 * and quietly served locally generated text on a server that was fully wired up.
 */
let serverCoachAvailable = false;
let serverCoachProbe: Promise<boolean> | null = null;
const serverCoachListeners = new Set<() => void>();

function notifyServerCoach() {
  serverCoachListeners.forEach((listener) => listener());
}

/** Probes the built-in route once per page load; later calls reuse the result. */
export async function probeServerCoach(): Promise<boolean> {
  if (serverCoachProbe) return serverCoachProbe;
  serverCoachProbe = fetch('/api/gemini/coach')
    .then((res) => (res.ok ? res.json() : { available: false }))
    .then((data: { available?: boolean }) => {
      serverCoachAvailable = Boolean(data.available);
      notifyServerCoach();
      return serverCoachAvailable;
    })
    .catch(() => false);
  return serverCoachProbe;
}

export function subscribeServerCoach(listener: () => void): () => void {
  serverCoachListeners.add(listener);
  return () => {
    serverCoachListeners.delete(listener);
  };
}

export function getServerCoachAvailable(): boolean {
  return serverCoachAvailable;
}

export type LlmTransport = 'gemini' | 'openai' | 'none';

/**
 * Which transport a call will actually use.
 *
 * Precedence: an explicitly selected Gemini provider, then a key the user
 * supplied, then a local runtime that needs no key, then this deployment's own
 * server key. This is the single source of truth — the generation gates and
 * `callLlm` both read it, so nothing can be gated out and then silently fall
 * back to procedural text, or gated in and then fail on a missing credential.
 */
export function resolveTransport(settings?: AISettings | null): LlmTransport {
  if (!settings) return 'none';
  // An explicit offline provider must stay offline. Callers use it to request a
  // purely local answer (the results modal's instant first paint, for example),
  // and it used to fall through to whatever key happened to be configured —
  // turning a local computation into a network round trip.
  if (settings.provider === 'offline') return 'none';
  if (settings.provider === 'gemini') return 'gemini';
  if (settings.apiKey) return 'openai';
  if (settings.endpoint.includes('localhost') || settings.endpoint.includes('127.0.0.1')) {
    return 'openai';
  }
  return serverCoachAvailable ? 'gemini' : 'none';
}

export function canUseLlm(settings?: AISettings | null): boolean {
  return resolveTransport(settings) !== 'none';
}

/**
 * Points settings at this deployment's own Gemini route.
 *
 * When the server has a key and the user has configured nothing else, the honest
 * thing is to select the built-in coach rather than keep an unused default
 * provider selected. A key the user typed always wins.
 */
export function withBuiltInCoach(settings: AISettings): AISettings {
  if (settings.apiKey || settings.provider === 'gemini' || settings.provider === 'offline') return settings;
  const preset = AI_PROVIDER_PRESETS.find((provider) => provider.id === 'gemini');
  return {
    ...settings,
    provider: 'gemini',
    endpoint: preset?.endpoint || '/api/gemini/coach',
    model: preset?.defaultModel || settings.model,
  };
}

/** Names the model that will really run, for the footer and provider pills. */
export function describeProvider(settings: AISettings): string {
  const transport = resolveTransport(settings);
  if (transport === 'gemini') return 'Google Gemini (built-in server)';
  if (transport === 'openai') return settings.model || 'OpenAI-compatible endpoint';
  return 'Local generation (no model key)';
}
