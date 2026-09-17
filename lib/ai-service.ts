import { AICoachFeedback, AIMission, AISettings, TypingStats } from '@/types/typing';
import { generateWeakKeyDrill } from './word-banks';

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
  systemPrompt: 'You are an elite, encouraging touch typing mentor. Provide crisp, action-oriented typing guidance.',
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

// Test OpenAI-compatible endpoint connection
export async function testAiConnection(settings: AISettings): Promise<{ success: boolean; message: string; models?: string[] }> {
  if (settings.provider === 'gemini') {
    try {
      const res = await fetch('/api/gemini/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Ping connection test. Reply with OK in one word.' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gemini server route error');
      return { success: true, message: 'Connected successfully to Google Gemini server!' };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Failed to connect to Gemini' };
    }
  }

  if (!settings.endpoint) {
    return { success: false, message: 'Please specify an API endpoint URL.' };
  }

  const endpoint = settings.endpoint.replace(/\/+$/, '');
  const url = endpoint.endsWith('/v1') ? `${endpoint}/models` : `${endpoint}/v1/models`;

  // Attempt direct fetch first, if CORS error occurs and useServerProxy is false, suggest proxy
  try {
    if (settings.useServerProxy) {
      const res = await fetch('/api/ai/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: settings.endpoint,
          apiKey: settings.apiKey,
          path: '/models',
          body: {},
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const modelNames = Array.isArray(data?.data) ? data.data.map((m: { id: string }) => m.id).slice(0, 10) : undefined;
      return { success: true, message: 'Connection successful via server proxy!', models: modelNames };
    } else {
      const headers: Record<string, string> = {};
      if (settings.apiKey) {
        headers['Authorization'] = `Bearer ${settings.apiKey.trim()}`;
      }
      const res = await fetch(url, { method: 'GET', headers });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      const modelNames = Array.isArray(data?.data) ? data.data.map((m: { id: string }) => m.id).slice(0, 10) : undefined;
      return { success: true, message: 'Direct connection successful!', models: modelNames };
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Connection failed';
    if (!settings.useServerProxy && (errorMsg.includes('Failed to fetch') || errorMsg.includes('CORS') || errorMsg.includes('NetworkError'))) {
      return {
        success: false,
        message: 'Browser blocked direct request (CORS). Enable the "Use Server Proxy" toggle to connect safely!',
      };
    }
    return { success: false, message: errorMsg };
  }
}

// Low-level call to OpenAI-compatible endpoint or Gemini route
export async function callLlm(prompt: string, systemPrompt: string, settings: AISettings): Promise<string> {
  // If Gemini provider selected
  if (settings.provider === 'gemini') {
    const res = await fetch('/api/gemini/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, systemInstruction: systemPrompt }),
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Gemini coach request failed');
    }
    const data = await res.json();
    return data.text || '';
  }

  // OpenAI-compatible endpoint
  const endpoint = settings.endpoint.replace(/\/+$/, '');
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt },
  ];

  const body = {
    model: settings.model || 'gpt-4o-mini',
    messages,
    temperature: settings.temperature ?? 0.7,
    max_tokens: 600,
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
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Proxy request failed');
    return data?.choices?.[0]?.message?.content || '';
  } else {
    const targetUrl = endpoint.endsWith('/v1') ? `${endpoint}/chat/completions` : `${endpoint}/v1/chat/completions`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (settings.apiKey) {
      headers['Authorization'] = `Bearer ${settings.apiKey.trim()}`;
    }

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || err?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content || '';
  }
}

// Post-session analysis
export async function generateAiCoachFeedback(
  stats: TypingStats,
  context: { mode: string; level: number; userWeakKeys: string[] },
  settings: AISettings
): Promise<AICoachFeedback> {
  // If no key and not gemini, return smart local coaching instantly
  const hasExternalCredentials = Boolean(settings.apiKey || settings.endpoint.includes('localhost') || settings.provider === 'gemini');

  if (!hasExternalCredentials) {
    return generateDeterministicCoachFeedback(stats, context);
  }

  const prompt = `Analyze this typing session:
- Mode: ${context.mode}
- Player Level: ${context.level}
- Speed: ${stats.wpm} WPM (Raw: ${stats.rawWpm} WPM)
- Accuracy: ${stats.accuracy}%
- Consistency: ${stats.consistency}%
- Correct characters: ${stats.correctChars}, Errors: ${stats.incorrectChars}
- Peak Combo: ${stats.maxCombo}
- Weak keys detected: ${stats.weakKeys.join(', ') || 'None'}

Return a clean JSON object with this exact schema:
{
  "wpmSummary": "1 sentence on speed & flow",
  "accuracyAssessment": "1 sentence on precision & rhythm",
  "weaknessIdentified": "1 sentence identifying the exact key or transition causing issues",
  "keyAdvice": "1 actionable technique tip for their next run"
}
Output only valid raw JSON.`;

  try {
    const raw = await callLlm(prompt, 'You are an elite, encouraging touch-typing coach. Answer strictly with valid JSON.', settings);
    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      wpmSummary: parsed.wpmSummary || `You achieved a steady ${stats.wpm} WPM.`,
      accuracyAssessment: parsed.accuracyAssessment || `Your accuracy held at ${stats.accuracy}%.`,
      weaknessIdentified: parsed.weaknessIdentified || (stats.weakKeys.length > 0 ? `Target keys [${stats.weakKeys.join(', ')}] showed hesitation.` : 'Keystroke rhythm was remarkably uniform.'),
      keyAdvice: parsed.keyAdvice || 'Maintain relaxed shoulders and keep fingers floating lightly above home row.',
    };
  } catch (err) {
    console.warn('AI Coach fallback invoked:', err);
    return generateDeterministicCoachFeedback(stats, context);
  }
}

// Generate an AI Mission
export async function generateAiMission(
  weakKeys: string[],
  currentWpm: number,
  settings: AISettings
): Promise<AIMission> {
  const hasExternalCredentials = Boolean(settings.apiKey || settings.endpoint.includes('localhost') || settings.provider === 'gemini');

  if (!hasExternalCredentials) {
    return generateDeterministicMission(weakKeys, currentWpm);
  }

  const focusKeysList = weakKeys.length > 0 ? weakKeys.slice(0, 3) : ['e', 'r', 't'];
  const prompt = `Create a tailored 60-second typing mission for a player at ${currentWpm} WPM struggling with keys: [${focusKeysList.join(', ')}].
Return a clean JSON object matching this schema:
{
  "title": "Inspiring 3-5 word mission title",
  "description": "1 sentence explaining the objective",
  "type": "WEAK_KEY_DRILL" or "ACCURACY_TARGET" or "SPEED_SPRINT",
  "targetWpm": number (around ${Math.max(20, Math.round(currentWpm * 1.05))}),
  "targetAccuracy": number (e.g. 96),
  "rewardXp": number (between 150 and 300),
  "reason": "1 sentence on why this drill will break their plateau",
  "content": "A 25-30 word drill specifically featuring the target keys naturally"
}
Output only valid JSON.`;

  try {
    const raw = await callLlm(prompt, 'You are a master typing instructor creating personalized training missions.', settings);
    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      id: `ai-mission-${Date.now()}`,
      title: parsed.title || 'Precision Alignment Drill',
      description: parsed.description || 'Eliminate finger hesitation on your most error-prone keys.',
      type: parsed.type || 'WEAK_KEY_DRILL',
      difficulty: currentWpm > 55 ? 'Advanced' : currentWpm > 35 ? 'Intermediate' : 'Beginner',
      targetWpm: parsed.targetWpm || Math.max(20, Math.round(currentWpm * 1.05)),
      targetAccuracy: parsed.targetAccuracy || 96,
      focusKeys: focusKeysList,
      content: parsed.content || generateWeakKeyDrill(focusKeysList, 20),
      rewardXp: parsed.rewardXp || 200,
      reason: parsed.reason || `Reinforces muscle memory on keys ${focusKeysList.join(', ')}.`,
      completed: false,
      createdAt: Date.now(),
    };
  } catch (err) {
    console.warn('AI Mission generation fallback invoked:', err);
    return generateDeterministicMission(weakKeys, currentWpm);
  }
}

// Interactive chat question with Coach
export async function askAiCoachQuestion(
  question: string,
  contextSummary: string,
  settings: AISettings
): Promise<string> {
  const hasExternalCredentials = Boolean(settings.apiKey || settings.endpoint.includes('localhost') || settings.provider === 'gemini');

  if (!hasExternalCredentials) {
    return generateDeterministicChatReply(question);
  }

  const prompt = `Player context:
${contextSummary}

Player's question:
"${question}"

Provide a concise, encouraging, and highly technical touch-typing recommendation (2-3 short paragraphs max). Focus on ergonomics, finger mechanics, and mental rhythm.`;

  try {
    return await callLlm(
      prompt,
      'You are Sensei KeyPulse, an elite touch-typing grandmaster and ergonomic coach.',
      settings
    );
  } catch (err) {
    return generateDeterministicChatReply(question);
  }
}

// --- DETERMINISTIC FALLBACKS (Guarantees zero downtime / zero breaking) ---

function generateDeterministicCoachFeedback(stats: TypingStats, context: { mode: string; level: number }): AICoachFeedback {
  const isHighAccuracy = stats.accuracy >= 96;
  const isSpeedFast = stats.wpm >= 50;
  const hasErrors = stats.weakKeys.length > 0;

  const wpmSummary = isSpeedFast
    ? `Exceptional velocity! Clocking in at ${stats.wpm} WPM places you well above the average typist.`
    : `Solid pacing at ${stats.wpm} WPM. Focus on consistency to naturally accelerate your tempo.`;

  const accuracyAssessment = isHighAccuracy
    ? `Superb discipline: ${stats.accuracy}% accuracy demonstrates outstanding finger control.`
    : `Accuracy was ${stats.accuracy}%. Slowing down by just 5% will prevent backspace penalties and elevate raw speed.`;

  const weaknessIdentified = hasErrors
    ? `Key transition hesitation detected on: [${stats.weakKeys.slice(0, 3).join(', ')}].`
    : `Keystroke intervals were smooth with a ${stats.consistency}% consistency rating.`;

  const keyAdvice = !isHighAccuracy
    ? 'Focus on the "Rhythm Rule": do not rush easy letters faster than difficult letters; keep a steady metronome rhythm.'
    : hasErrors
    ? `Practice reaching for '${stats.weakKeys[0]}' without moving your entire wrist—let only the designated finger articulate.`
    : 'Maintain a soft, gliding touch. Minimal finger pressure conserves stamina for extended sessions.';

  return { wpmSummary, accuracyAssessment, weaknessIdentified, keyAdvice };
}

function generateDeterministicMission(weakKeys: string[], currentWpm: number): AIMission {
  const targets = weakKeys.length > 0 ? weakKeys.slice(0, 3) : ['e', 'r', 't'];
  const drillContent = generateWeakKeyDrill(targets, 22);

  return {
    id: `ai-mission-${Date.now()}`,
    title: `Weak Key Recalibration (${targets.join(', ').toUpperCase()})`,
    description: `Targeted precision run designed to solidify muscle memory on ${targets.join(', ')}.`,
    type: 'WEAK_KEY_DRILL',
    difficulty: currentWpm > 50 ? 'Advanced' : 'Intermediate',
    targetWpm: Math.max(25, Math.round(currentWpm * 1.05)),
    targetAccuracy: 96,
    focusKeys: targets,
    content: drillContent,
    rewardXp: 250,
    reason: `Recent error patterns indicate finger overreach on ${targets.join(', ')}. This drill resets your spatial anchor.`,
    completed: false,
    createdAt: Date.now(),
  };
}

function generateDeterministicChatReply(question: string): string {
  const q = question.toLowerCase();

  if (q.includes('fast') || q.includes('speed') || q.includes('wpm')) {
    return `Speed is a byproduct of precision, not exertion. When you rush, you generate micro-stutters and backspace penalties that destroy your average WPM.\n\n**Three core rules to break through speed plateaus:**\n1. **The Metronome Effect**: Type at a rhythm where every key lands with equal acoustic spacing.\n2. **Look Ahead**: Keep your eyes 2 to 3 words ahead of what your fingers are currently striking.\n3. **Relax the Wrist**: Keep wrists elevated off the desk or resting very lightly on a palm rest.`;
  }

  if (q.includes('accuracy') || q.includes('mistake') || q.includes('error')) {
    return `To master accuracy, treat every mistake as a physical cue: your finger reached without confirming its home row anchor first.\n\n**Tactical Drill:** Reduce your current typing speed by 15-20% until you can complete 3 consecutive tests with 98%+ accuracy. Once accuracy is stabilized, speed will naturally ratchet up without additional effort.`;
  }

  if (q.includes('posture') || q.includes('finger') || q.includes('hand') || q.includes('pain')) {
    return `**Ergonomic Checklist:**\n- **Elbows**: Bent at 90 to 100 degrees, level with the keyboard surface.\n- **Wrists**: Straight and neutral—never angled upward or bent outwards.\n- **Home Position**: F and J have tactile bumps; let your index fingers return there like magnets after every stroke.\n- **Touch**: Use only enough pressure to actuate the switch; bottoming out hard causes finger fatigue.`;
  }

  return `Great question! The secret to elite touch typing is **chunking**: your brain stops processing individual letters ('t', 'h', 'e') and begins executing whole muscle patterns as single reflexive chords ('the', 'ing', 'tion'). Keep practicing daily in 10-15 minute focused intervals!`;
}
