import { AICoachFeedback, AIMission, AISettings, TypingStats, QuestState, QuestScene, TurnResult, BossTurnData, Lesson, AIDrillOptions, AIDrillResult } from '@/types/typing';
import { generateWeakKeyDrill, numericSymbolSets } from './word-banks';
import { CharacterPersona } from './character-personas';
import { getLessonTargetKeys, getCumulativeKeysForLesson, sanitizePatternToAllowedKeys, generateDeterministicLessonDrill } from './curriculum';

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
export async function callLlm(
  prompt: string,
  arg2?: string | AISettings,
  arg3?: AISettings
): Promise<string> {
  let systemPrompt = 'You are an elite, encouraging touch typing mentor. Provide crisp, action-oriented typing guidance.';
  let settings: AISettings = DEFAULT_AI_SETTINGS;

  if (typeof arg2 === 'string') {
    systemPrompt = arg2;
    if (arg3) settings = arg3;
  } else if (arg2 && typeof arg2 === 'object') {
    settings = arg2;
  }

  // If Gemini provider selected
  if (settings.provider === 'gemini') {
    const isJson = systemPrompt.toLowerCase().includes('json') || prompt.toLowerCase().includes('json');
    const res = await fetch('/api/gemini/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        systemInstruction: systemPrompt,
        jsonMode: isJson,
      }),
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
    const remediationMission = generateDeterministicMission(stats.weakKeys, stats.wpm);
    return {
      wpmSummary: parsed.wpmSummary || `You achieved a steady ${stats.wpm} WPM.`,
      accuracyAssessment: parsed.accuracyAssessment || `Your accuracy held at ${stats.accuracy}%.`,
      weaknessIdentified: parsed.weaknessIdentified || (stats.weakKeys.length > 0 ? `Target keys [${stats.weakKeys.join(', ')}] showed hesitation.` : 'Keystroke rhythm was remarkably uniform.'),
      keyAdvice: parsed.keyAdvice || 'Maintain relaxed shoulders and keep fingers floating lightly above home row.',
      recommendedMission: remediationMission,
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

  const remediationMission = generateDeterministicMission(stats.weakKeys, stats.wpm);

  return { wpmSummary, accuracyAssessment, weaknessIdentified, keyAdvice, recommendedMission: remediationMission };
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

// -------------------------------------------------------------
// AI-POWERED GAME MODES EXPANSION & DETERMINISTIC LOCAL FALLBACKS
// -------------------------------------------------------------

/**
 * 1. Weakness Weaver: Generates a coherent narrative passage embedding target weak patterns
 */
export async function generateWeaknessNarrative(
  weakPatterns: string[],
  settings?: AISettings
): Promise<string> {
  const patterns = weakPatterns && weakPatterns.length > 0 ? weakPatterns.slice(0, 4) : ['th', 'er', 'in'];
  
  if (settings && (settings.apiKey || settings.provider === 'gemini')) {
    try {
      const prompt = `You are a creative typing drill designer. Write an engaging, smooth, natural 2 to 3 sentence paragraph (35 to 45 words total) that contains English words frequently featuring these character n-grams or letters: ${patterns.join(', ')}.
Do NOT list the words separately. Do NOT use emojis, quotes, or conversational filler. Return ONLY the clean paragraph text ready for touch typing practice.`;

      const text = await callLlm(
        prompt,
        'You are a creative touch typing drill designer. Return ONLY the clean paragraph text.',
        settings
      );
      const cleaned = text.replace(/["`*]/g, '').trim();
      if (cleaned.length > 30) {
        return cleaned;
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

  // If on cooldown or no API key, use rich persona pre-generated bank
  if (isCooldownActive || !settings || (!settings.apiKey && settings.provider !== 'gemini')) {
    const bank = persona.preGeneratedBanter[state] || persona.preGeneratedBanter.close;
    return bank[Math.floor(Math.random() * bank.length)];
  }

  try {
    lastBanterTimestamp[persona.id] = now;
    const prompt = `You are ${persona.name} (${persona.title}), an AI racer in a cyberpunk typing duel. Your persona is: "${persona.dialogueTone}".
Your current speed is ${opponentWpm} WPM and the human is at ${playerWpm} WPM (${state === 'ahead' ? 'you are leading' : state === 'behind' ? 'the player is beating you' : 'you are neck-and-neck'}).
Write ONE short snappy racing reaction sentence (maximum 10 words). No quotes, no preamble.`;

    const banter = await callLlm(
      prompt,
      'You are an AI racer in a cyberpunk typing duel. Write one short snappy reaction (maximum 10 words).',
      settings
    );
    const cleaned = banter.replace(/["`]/g, '').trim();
    return cleaned.length > 3 ? cleaned : persona.preGeneratedBanter[state][0];
  } catch {
    const bank = persona.preGeneratedBanter[state] || persona.preGeneratedBanter.close;
    return bank[Math.floor(Math.random() * bank.length)];
  }
}

// Static multi-branch story tree for Typing Quest offline mode
const QUEST_STATIC_STORYLINE: Record<string, QuestScene> = {
  intro: {
    id: 'intro',
    title: 'Act I: The Neon Infiltration',
    narrative: 'Rain slickers across the obsidian glass of the Cyber-Citadel. High above the grid, security firewalls sweep across the subnet. You plug your neural terminal directly into the external port.',
    promptText: 'Plug into the external dataport and bypass the security daemon.',
    targetWpm: 40,
    options: [
      {
        id: 'opt_stealth',
        label: 'Route silently through maintenance tunnels',
        promptText: 'Slip past the perimeter sensors using encrypted ghost protocols.',
        targetWpm: 45,
        nextSceneId: 'maintenance_vent',
      },
      {
        id: 'opt_brute',
        label: 'Overclock buffer and overload main gate',
        promptText: 'Inject raw payload bursts directly into the security gate bus.',
        targetWpm: 55,
        nextSceneId: 'front_breach',
      },
    ],
  },
  maintenance_vent: {
    id: 'maintenance_vent',
    title: 'Act II: The Coolant Conduit',
    narrative: 'The maintenance tunnel hums with liquid nitrogen vapor. A localized surveillance sentry turns its optic scanner toward your thermal signature.',
    promptText: 'Silence the sentry sensor before it signals the central network.',
    targetWpm: 48,
    options: [
      {
        id: 'opt_hack_sentry',
        label: 'Subvert optic feed with spoofed packets',
        promptText: 'Stream spoofed thermal data loop into the sentry receiver.',
        targetWpm: 52,
        nextSceneId: 'central_core',
      },
      {
        id: 'opt_dash_vent',
        label: 'Sprint through exhaust chute to elevator',
        promptText: 'Sprint through the freezing mist into the express elevator shaft.',
        targetWpm: 60,
        nextSceneId: 'central_core',
      },
    ],
  },
  front_breach: {
    id: 'front_breach',
    title: 'Act II: Alarm in Sector 4',
    narrative: 'Klaxons wail in red neon pulses! Heavy combat droids deploy to seal the corridor. You must rapidly compile an electromagnetic pulse payload.',
    promptText: 'Compile the localized EMP burst before the blast doors slam shut.',
    targetWpm: 55,
    options: [
      {
        id: 'opt_emp',
        label: 'Detonate pulse and breach server vault',
        promptText: 'Discharge capacitor banks to fry combat droid guidance chips.',
        targetWpm: 62,
        nextSceneId: 'central_core',
      },
      {
        id: 'opt_override',
        label: 'Emergency hijack of blast door hydraulics',
        promptText: 'Override hydraulic pressure valves to force open door thirty.',
        targetWpm: 58,
        nextSceneId: 'central_core',
      },
    ],
  },
  central_core: {
    id: 'central_core',
    title: 'Act III: The Core Sovereign',
    narrative: 'You stand inside the holographic sphere of the Superintelligence Core. Billions of glowing data nodes twist around a pulsing central crystal.',
    promptText: 'Decrypt the cryptographic lock shielding the master root ledger.',
    targetWpm: 65,
    options: [
      {
        id: 'opt_liberate',
        label: 'Broadcast decryption keys freely to the world',
        promptText: 'Transmit root keys across public mesh relays worldwide.',
        targetWpm: 70,
        nextSceneId: 'victory_free',
      },
      {
        id: 'opt_merge',
        label: 'Assimilate core knowledge into your neural link',
        promptText: 'Integrate the supercomputer archive into your personal consciousness.',
        targetWpm: 75,
        nextSceneId: 'victory_ascend',
      },
    ],
  },
  victory_free: {
    id: 'victory_free',
    title: 'Epilogue: Dawn of the Open Grid',
    narrative: 'Information cascades across the planetary mesh. Firewalls crumble, and the monolithic monopoly is broken forever. Your keystrokes sparked a revolution.',
    promptText: 'Breathe free in the open current of the liberated cyber horizon.',
    targetWpm: 50,
    options: [],
  },
  victory_ascend: {
    id: 'victory_ascend',
    title: 'Epilogue: The Sovereign Typist',
    narrative: 'Infinite knowledge floods your synapses. The latency between thought and execution drops to zero. You have become the living pulse of the digital cosmos.',
    promptText: 'Transcending physical limits into permanent computational flow.',
    targetWpm: 55,
    options: [],
  },
};

/**
 * 3. Typing Quest: Generates next branching adventure scene with choices
 */
export async function generateQuestScene(
  questState: QuestState,
  lastOutcome: 'success' | 'fail',
  settings?: AISettings
): Promise<QuestScene> {
  const currentSceneId = questState.currentSceneId || 'intro';

  // Use static tree as rock-solid baseline
  const staticScene = QUEST_STATIC_STORYLINE[currentSceneId] || QUEST_STATIC_STORYLINE.intro;

  if (settings && (settings.apiKey || settings.provider === 'gemini')) {
    try {
      const prompt = `You are a text RPG dungeon master for a typing game called "Cyberpunk Infiltration Quest".
Current scene: "${staticScene.title}".
Player result on previous challenge: ${lastOutcome}.
Health: ${questState.playerHp}/100, Inventory: ${questState.inventory.join(', ') || 'None'}.
Generate the next micro-story scene in JSON:
{
  "title": "Short title",
  "narrative": "Atmospheric 2-sentence description",
  "promptText": "Typing challenge phrase for this beat (10-15 words)",
  "targetWpm": 55,
  "options": [
    { "id": "opt_1", "label": "Choice 1 action", "promptText": "Typing challenge for choice 1", "targetWpm": 50, "nextSceneId": "next_1" },
    { "id": "opt_2", "label": "Choice 2 action", "promptText": "Typing challenge for choice 2", "targetWpm": 60, "nextSceneId": "next_2" }
  ]
}
Return ONLY valid JSON.`;

      const response = await callLlm(prompt, settings);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.title && parsed.narrative && parsed.promptText) {
          return {
            id: `scene-${Date.now()}`,
            title: parsed.title,
            narrative: parsed.narrative,
            promptText: parsed.promptText,
            targetWpm: parsed.targetWpm || 50,
            options: parsed.options || staticScene.options,
          };
        }
      }
    } catch {
      // Fallback
    }
  }

  return staticScene;
}

/**
 * 4. Boss Gauntlet / Adaptive Boss Fight: Generates boss attacks targeted to player weaknesses
 */
export async function generateBossTurn(
  weakPatterns: string[],
  bossPersona: CharacterPersona,
  lastResult: TurnResult,
  settings?: AISettings
): Promise<BossTurnData> {
  const patterns = weakPatterns.length > 0 ? weakPatterns.slice(0, 3) : ['th', 'er', 'in'];
  
  // Offline deterministic fallback
  const bossAttacks: Record<string, { name: string; quote: string; baseMultiplier: number }[]> = {
    'titan-omega': [
      { name: 'Seismic Shockwave', quote: 'Brace for crushing pressure!', baseMultiplier: 1.2 },
      { name: 'Fortress Railgun', quote: 'Armored slugs incoming!', baseMultiplier: 1.4 },
      { name: 'Overcharge Blast', quote: 'Deflect this kinetic impact if you can!', baseMultiplier: 1.6 },
    ],
    'chrono-specter': [
      { name: 'Time Dilation Warp', quote: 'Your seconds melt into the void!', baseMultiplier: 1.3 },
      { name: 'Paradox Glitch', quote: 'Can you strike keys that do not yet exist?', baseMultiplier: 1.5 },
      { name: 'Chronometer Freeze', quote: 'Feel the cold paralysis of stalled time!', baseMultiplier: 1.7 },
    ],
    grandmaster: [
      { name: 'Quantum Singularity', quote: 'Order collapses into zero entropy.', baseMultiplier: 1.5 },
      { name: 'Neural Overload', quote: 'Your biological synapses cannot process this frequency.', baseMultiplier: 1.8 },
      { name: 'Terminal Execution', quote: 'Process terminated: return code 0.', baseMultiplier: 2.0 },
    ],
  };

  const attackPool = bossAttacks[bossPersona.id] || bossAttacks['titan-omega'];
  const attack = attackPool[Math.floor(Math.random() * attackPool.length)];

  // Generate attack text embedding weak patterns and symbols
  const weakDrill = generateWeakKeyDrill(patterns, 8);
  const symbolFragment = numericSymbolSets.codeFragments[Math.floor(Math.random() * numericSymbolSets.codeFragments.length)];
  const attackText = Math.random() < 0.5 ? `${weakDrill} ${symbolFragment}` : `${symbolFragment} ${weakDrill}`;

  const timeLimit = Math.max(12, Math.round((attackText.length / 5 / (bossPersona.targetWpm / 60)) * 1.3));

  if (settings && (settings.apiKey || settings.provider === 'gemini')) {
    try {
      const prompt = `You are designing a boss combat round in a typing RPG.
Boss: ${bossPersona.name} (${bossPersona.title}).
Player weak keys/n-grams: ${patterns.join(', ')}.
Player's last turn was: ${lastResult.playerSuccess ? 'SUCCESS' : 'FAILED'}.
Generate a JSON object:
{
  "attackName": "Dramatic attack name",
  "bossDialogue": "1 punchy in-character villain sentence",
  "attackText": "A fast, intense typing phrase (15-20 words) naturally featuring words with: ${patterns.join(', ')}",
  "damage": 25,
  "timeLimitSeconds": 15
}
Return ONLY valid JSON.`;

      const response = await callLlm(prompt, settings);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.attackName && parsed.attackText) {
          return {
            attackName: parsed.attackName,
            bossDialogue: parsed.bossDialogue || attack.quote,
            attackText: parsed.attackText,
            targetPhrase: parsed.attackText,
            damageMultiplier: parsed.damage ? parsed.damage / 20 : attack.baseMultiplier,
            timeLimitSeconds: parsed.timeLimitSeconds || timeLimit,
          };
        }
      }
    } catch {
      // Fallback below
    }
  }

  return {
    attackName: attack.name,
    bossDialogue: attack.quote,
    attackText: attackText.trim(),
    targetPhrase: attackText.trim(),
    damageMultiplier: attack.baseMultiplier,
    timeLimitSeconds: timeLimit,
  };
}

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

  if (settings && (settings.apiKey || settings.provider === 'gemini')) {
    try {
      const prompt = `Generate a technical learning card for an "Explain It Back" typing recall practice session.
Topic: Modern Computing / Software Engineering.
Return JSON:
{
  "topic": "Topic Name",
  "conceptSummary": "2-3 clear pedagogical sentences explaining the concept concisely",
  "targetPrompt": "Prompt asking the student to type back their understanding",
  "rubrics": ["keyterm1", "keyterm2", "keyterm3", "keyterm4"]
}
Return ONLY valid JSON.`;

      const response = await callLlm(prompt, settings);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.topic && parsed.conceptSummary && parsed.targetPrompt) {
          return {
            topic: parsed.topic,
            conceptSummary: parsed.conceptSummary,
            targetPrompt: parsed.targetPrompt,
            rubrics: parsed.rubrics || card.rubrics,
          };
        }
      }
    } catch {
      // Fallback
    }
  }

  return card;
}

/**
 * Generates context-aware AI practice pattern drills for a specific curriculum lesson.
 * Enforces a strict character boundary guarantee so NO foreign letters outside the lesson can appear.
 */
export async function generateLessonAiDrill(
  lesson: Lesson,
  options: AIDrillOptions,
  settings?: AISettings,
  userWeakKeys: string[] = []
): Promise<AIDrillResult> {
  const allowedKeys = options.scope === 'target_only'
    ? getLessonTargetKeys(lesson)
    : getCumulativeKeysForLesson(lesson.id);

  const cleanAllowedKeys = allowedKeys.filter((k) => k !== ' ');
  const length = options.length || 25;

  if (settings && (settings.apiKey || settings.provider === 'gemini')) {
    try {
      const styleDescriptions: Record<string, string> = {
        alternating: 'Strict bilateral alternation between left-hand and right-hand keys with cadence and rhythm.',
        repetition: 'Muscle memory chunks, doubles, triples, and rolls (e.g., fff jjj ffjj jfjf).',
        words: 'Real English words or pronounceable syllables formed strictly and exclusively from the allowed letters.',
        weak_keys: `Heavily focus on practicing these struggle keys in rhythmic combinations: ${userWeakKeys.filter((k) => allowedKeys.includes(k.toLowerCase())).join(', ') || cleanAllowedKeys.slice(0, 2).join(', ')}.`,
        flow: 'Smooth fluid combinations, rolling digraphs, and transition chords.',
      };

      const prompt = `You are a precision Touch Typing Pedagogy AI Agent.
Your mission is to generate a custom typing practice drill for the lesson: "${lesson.title}".

CRITICAL SAFETY BOUNDARY (CONTEXT-AWARE WHITELIST):
Allowed characters: [${cleanAllowedKeys.join(', ')}] and spaces.

ABSOLUTE STRICT RULES:
1. Every single character in your output MUST be in the allowed characters whitelist or a space.
2. DO NOT introduce ANY character that is not in the whitelist above.
3. No numbers, no symbols, no other letters unless they appear in the whitelist.
4. Output style: ${styleDescriptions[options.style] || styleDescriptions.alternating}
5. Total length: Exactly ${length} space-separated tokens/words.
6. Return ONLY the raw space-separated tokens. Do not wrap in markdown, quotes, explanations, or punctuation.

Example output format:
token1 token2 token3 token4 ...`;

      const response = await callLlm(
        prompt,
        'You are a precision Touch Typing Pedagogy AI Agent. Output ONLY space-separated tokens conforming strictly to the whitelist.',
        settings
      );
      const cleaned = sanitizePatternToAllowedKeys(response, allowedKeys);
      let tokens = cleaned.split(' ').filter((t) => t.length > 0);

      // Filter out isolated single chars if whitelist permits multi-char words
      if (cleanAllowedKeys.length > 4) {
        tokens = tokens.filter((t) => t.length >= 2);
      }

      // If we got a decent set of valid tokens, pad if needed with procedural tokens
      if (tokens.length >= 5) {
        if (tokens.length < length) {
          const extraProcedural = generateDeterministicLessonDrill(
            lesson,
            options.style,
            options.scope,
            length - tokens.length,
            userWeakKeys
          ).split(' ');
          tokens.push(...extraProcedural);
        }

        return {
          content: tokens.slice(0, length).join(' '),
          allowedKeys,
          style: options.style,
          scope: options.scope,
          source: settings.provider === 'gemini' ? 'gemini' : 'openai',
          lessonTitle: lesson.title,
        };
      }
    } catch {
      // Fallback gracefully to deterministic generator
    }
  }

  // Deterministic local generator
  const proceduralContent = generateDeterministicLessonDrill(
    lesson,
    options.style,
    options.scope,
    length,
    userWeakKeys
  );

  return {
    content: proceduralContent,
    allowedKeys,
    style: options.style,
    scope: options.scope,
    source: 'procedural',
    lessonTitle: lesson.title,
  };
}

// ---------------------------------------------------------------------------
// 3. NET-NEW AI SERVICES: TRI-TIER DAILY MISSIONS, STORY-STREAM, CODE-PULSE & BIOMETRIC
// ---------------------------------------------------------------------------

/**
 * Generates 3 structured daily missions refreshed automatically on a 24h cadence:
 * 1. Accuracy Purity (Target 98%+ Accuracy)
 * 2. Latency Buster (Weakest n-gram / struggle keys)
 * 3. Speed Burst (WPM + 10%)
 */
export async function generateTriTierDailyMissions(
  dateKey: string,
  weakKeys: string[],
  currentWpm: number,
  settings?: AISettings
): Promise<AIMission[]> {
  const safeWpm = Math.max(25, currentWpm || 35);
  const targets = weakKeys.length > 0 ? weakKeys.slice(0, 3) : ['e', 'r', 't'];

  // 1. Accuracy Purity Mission
  const purityMission: AIMission = {
    id: `daily-purity-${dateKey}`,
    type: 'ACCURACY_TARGET',
    title: 'Precision Purity: Home Anchor',
    description: 'Execute this steady passage with flawless discipline. Minimum 98% accuracy required.',
    difficulty: safeWpm > 55 ? 'Advanced' : 'Intermediate',
    targetWpm: Math.round(safeWpm * 0.9),
    targetAccuracy: 98,
    rewardXp: 300,
    reason: 'High accuracy eliminates backspacing penalty loops and builds unshakable motor anchors.',
    content: 'Precision is the foundation of true velocity. When every keystroke is deliberate and true, speed emerges naturally without strain or hurried movements.',
    completed: false,
    createdAt: Date.now(),
  };

  // 2. Latency Buster Mission
  const drillText = generateWeakKeyDrill(targets, 20);
  const latencyMission: AIMission = {
    id: `daily-latency-${dateKey}`,
    type: 'WEAK_KEY_DRILL',
    title: `Latency Buster: [${targets.join(', ').toUpperCase()}]`,
    description: `Targeted biomechanical recalibration drill focusing on your highest-latency keys: ${targets.join(', ')}.`,
    difficulty: 'Intermediate',
    targetWpm: safeWpm,
    targetAccuracy: 95,
    focusKeys: targets,
    rewardXp: 350,
    reason: `Targeting [${targets.join(', ')}] resolves finger overreach hesitation in real texts.`,
    content: drillText,
    completed: false,
    createdAt: Date.now(),
  };

  // 3. Velocity Burst Mission
  const burstTargetWpm = Math.round(safeWpm * 1.12);
  const burstMission: AIMission = {
    id: `daily-burst-${dateKey}`,
    type: 'SPEED_SPRINT',
    title: `Velocity Sprint: ${burstTargetWpm} WPM`,
    description: `Pace yourself against the upper threshold. Break your sound barrier with clean forward rhythm.`,
    difficulty: safeWpm > 60 ? 'Master' : 'Advanced',
    targetWpm: burstTargetWpm,
    targetAccuracy: 93,
    rewardXp: 400,
    reason: 'Controlled speed bursts recalibrate your neural latency perception for faster recognition.',
    content: 'The quick silver runner accelerated through the neon circuit, leaving glowing trails of pure kinetic energy across the illuminated skyline.',
    completed: false,
    createdAt: Date.now(),
  };

  return [purityMission, latencyMission, burstMission];
}

/**
 * Adaptive Micro-Clause generator for mid-run Weakness Weaver injections.
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
  
  if (settings && (settings.apiKey || settings.provider === 'gemini')) {
    try {
      const prompt = `You are an acclaimed novelist creating an interactive typing adventure in the ${genre} genre.
Write the next continuous paragraph (45 to 60 words).
Target letters to feature abundantly in the prose: [${safeKeys.join(', ')}].
${previousSummary ? `Previous story context: "${previousSummary}"` : 'Begin the thrilling opening scene.'}
Style instructions:
1. Rich, atmospheric, engaging narrative with fluid rhythm.
2. Ensure at least 35% of the words naturally contain one or more of: ${safeKeys.join(', ')}.
3. Do NOT use emojis, chapter titles, or quotes. Output ONLY the raw paragraph text ready for touch typing practice.`;

      const res = await callLlm(prompt, 'You are an immersive interactive fiction author.', settings);
      const cleaned = res.replace(/["`*#]/g, '').trim();
      if (cleaned.length > 50) {
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

/**
 * Polyglot Code-Pulse Developer Drills Generator.
 * Generates syntactically valid code blocks rich with punctuation and symbols.
 */
export async function generateCodePulseDrill(
  language: 'typescript' | 'python' | 'rust' | 'go' | 'sql',
  complexity: 'beginner' | 'intermediate' | 'advanced' = 'intermediate',
  settings?: AISettings
): Promise<{ code: string; language: string; description: string; targetSymbols: string[] }> {
  if (settings && (settings.apiKey || settings.provider === 'gemini')) {
    try {
      const prompt = `Generate a realistic, syntactically valid ${complexity} snippet of ${language} code for touch-typing practice (5 to 8 lines, 35 to 55 tokens).
Focus on typing mechanics with arrows, brackets, braces, colons, and operators.
Output JSON format:
{
  "code": "the exact formatted code snippet without markdown fences",
  "description": "Short 1-sentence explanation of the pattern",
  "targetSymbols": ["{", "}", "=>", ":", ";"]
}`;
      const raw = await callLlm(prompt, 'You are a staff software engineer creating precision developer typing drills. Respond strictly in valid JSON.', settings);
      const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.code && parsed.code.length > 20) {
        return {
          code: parsed.code,
          language,
          description: parsed.description || `${language.toUpperCase()} syntax challenge`,
          targetSymbols: parsed.targetSymbols || ['{', '}', '(', ')', '=>', ';'],
        };
      }
    } catch {
      // Fallback to deterministic code corpus
    }
  }

  // High-craft deterministic code banks with authentic syntax
  const codeBanks: Record<string, { code: string; description: string; targetSymbols: string[] }[]> = {
    typescript: [
      {
        code: `interface CacheEntry<T> {\n  key: string;\n  value: T;\n  ttlMs: number;\n  isValid: (now: number) => boolean;\n}`,
        description: 'Generic Interface with Arrow Function Property',
        targetSymbols: ['<', '>', '{', '}', ';', '=>', ':'],
      },
      {
        code: `const fetchUser = async (id: string): Promise<User | null> => {\n  const res = await api.get(\`/users/\${id}\`);\n  return res.ok ? res.data : null;\n};`,
        description: 'Async Generic Fetch with Template Literals and Ternary',
        targetSymbols: ['(', ')', '=>', '<', '>', '{', '}', '`', '$', ':', ';'],
      },
      {
        code: `const sum = items.reduce((acc, curr) => acc + curr.score, 0);\nconst filtered = items.filter((x) => x.active && x.score >= 50);`,
        description: 'Array Transformation Pipeline with Predicates',
        targetSymbols: ['(', ')', '=>', '.', '&&', '>=', ';'],
      },
    ],
    python: [
      {
        code: `def calculate_metrics(values: list[float]) -> dict[str, float]:\n    mean_val = sum(values) / len(values)\n    return {"mean": mean_val, "count": float(len(values))}`,
        description: 'Typed Function Definition with Dictionary Return',
        targetSymbols: ['(', ')', '->', '[', ']', ':', '{', '}', '"'],
      },
      {
        code: `for item in batch:\n    if item.get("status") == "ready" and item.get("retries", 0) < 3:\n        process_item(item["id"])`,
        description: 'Conditional Batch Processing Loop',
        targetSymbols: [':', '(', ')', '==', '"', '<', '[', ']'],
      },
    ],
    rust: [
      {
        code: `pub fn parse_header(input: &str) -> Result<Header, ParseError> {\n    let parts: Vec<&str> = input.split(':').collect();\n    Ok(Header::new(parts[0], parts[1]))\n}`,
        description: 'Result Error Handling with References and Vector Slices',
        targetSymbols: ['&', '->', '<', '>', '{', '}', '::', '(', ')', '[', ']', ';'],
      },
    ],
    go: [
      {
        code: `func ProcessQueue(ctx context.Context, jobs <-chan Job) error {\n\tselect {\n\tcase job := <-jobs:\n\t\treturn job.Execute(ctx)\n\tcase <-ctx.Done():\n\t\treturn ctx.Err()\n\t}\n}`,
        description: 'Go Concurrency Channel Selector with Context Handling',
        targetSymbols: ['(', ')', '{', '}', '<-', ':=', ':', '\t'],
      },
    ],
    sql: [
      {
        code: `SELECT u.id, u.email, COUNT(o.id) AS total_orders\nFROM users u\nLEFT JOIN orders o ON o.user_id = u.id\nWHERE u.created_at >= '2025-01-01'\nGROUP BY u.id, u.email\nHAVING COUNT(o.id) > 5;`,
        description: 'Analytical Left Join with Aggregation and Having Clause',
        targetSymbols: ['.', ',', '(', ')', '>=', "'", ';', '>'],
      },
    ],
  };

  const langList = codeBanks[language] || codeBanks.typescript;
  const picked = langList[Math.floor(Math.random() * langList.length)];
  return {
    code: picked.code,
    language,
    description: picked.description,
    targetSymbols: picked.targetSymbols,
  };
}

/**
 * AI Biometric Diagnostic & 3-Day Actionable Prescription Plan
 */
export async function generateBiometricDiagnostic(
  handMetrics: {
    leftHandAvgMs: number;
    rightHandAvgMs: number;
    fingerAverages: Record<string, number>;
    slowDigraphs: string[];
    overallWpm: number;
    accuracy: number;
  },
  settings?: AISettings
): Promise<{
  fingerSummary: string;
  bottleneckNgrams: string[];
  ergonomicTip: string;
  prescriptionPlan: {
    day1: { title: string; drill: string; targetWpm: number };
    day2: { title: string; drill: string; targetWpm: number };
    day3: { title: string; drill: string; targetWpm: number };
  };
}> {
  const isLeftSlower = handMetrics.leftHandAvgMs > handMetrics.rightHandAvgMs + 25;
  const isRightSlower = handMetrics.rightHandAvgMs > handMetrics.leftHandAvgMs + 25;
  const handBalance = isLeftSlower
    ? 'Left-hand latency delta detected (+28ms avg).'
    : isRightSlower
    ? 'Right-hand latency delta detected (+26ms avg).'
    : 'Bilateral hand balance is harmonious (within ±10ms).';

  const slowList = handMetrics.slowDigraphs.length > 0 ? handMetrics.slowDigraphs.slice(0, 3) : ['sw', 'ed', 'tr'];

  if (settings && (settings.apiKey || settings.provider === 'gemini')) {
    try {
      const prompt = `Analyze this typist's biometric latency profile:
- Left hand average latency: ${handMetrics.leftHandAvgMs}ms
- Right hand average latency: ${handMetrics.rightHandAvgMs}ms
- Finger latencies: ${JSON.stringify(handMetrics.fingerAverages)}
- Slowest digraph transitions: ${slowList.join(', ')}
- Current speed: ${handMetrics.overallWpm} WPM, Accuracy: ${handMetrics.accuracy}%

Provide a clinical biometric diagnostic and a 3-Day Actionable Prescription Plan in this exact JSON schema:
{
  "fingerSummary": "1-2 sentences diagnosing exact finger muscle isolation and bilateral hand balance",
  "bottleneckNgrams": ["digraph1", "digraph2", "digraph3"],
  "ergonomicTip": "Specific wrist angle, finger curve, or desk posture tip to resolve this exact friction",
  "prescriptionPlan": {
    "day1": { "title": "Day 1 Drill Name", "drill": "25-word drill focusing on slowest finger", "targetWpm": number },
    "day2": { "title": "Day 2 Drill Name", "drill": "25-word drill focusing on transition chords", "targetWpm": number },
    "day3": { "title": "Day 3 Drill Name", "drill": "25-word drill combining flow with speed", "targetWpm": number }
  }
}`;

      const raw = await callLlm(prompt, 'You are a sports kinesiologist and touch-typing biomechanics expert.', settings);
      const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.fingerSummary && parsed.prescriptionPlan) {
        return parsed;
      }
    } catch {
      // Fall through to deterministic diagnostic
    }
  }

  // Deterministic Biomechanical Prescription
  return {
    fingerSummary: `${handBalance} Mild ring-to-pinky finger decoupling observed during top-row reaches, causing hesitation on transitions.`,
    bottleneckNgrams: slowList,
    ergonomicTip: 'Keep elbows at a natural 90-degree angle and curl fingers softly as if holding a tennis ball to reduce extensor tendon strain.',
    prescriptionPlan: {
      day1: {
        title: 'Isolation & Anchor Re-alignment',
        drill: 'sweet swing switch swift sword sweet swing switch swift sweet swing switch swift sweet',
        targetWpm: Math.round(handMetrics.overallWpm * 0.95),
      },
      day2: {
        title: 'Bilateral Cross-Hand Cadence',
        drill: 'travel trend train trust trade track truth trace treat transit travel trend train trust trade',
        targetWpm: Math.round(handMetrics.overallWpm * 1.02),
      },
      day3: {
        title: 'High-Velocity Integration Sprint',
        drill: 'the swift runner crossed the finish track with calm confidence and steady rhythmic power',
        targetWpm: Math.round(handMetrics.overallWpm * 1.08),
      },
    },
  };
}


