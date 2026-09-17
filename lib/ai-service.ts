import { AICoachFeedback, AIMission, AISettings, TypingStats, QuestState, QuestScene, TurnResult, BossTurnData } from '@/types/typing';
import { generateWeakKeyDrill, numericSymbolSets } from './word-banks';
import { CharacterPersona } from './character-personas';

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

      const text = await callLlm(prompt, settings);
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

    const banter = await callLlm(prompt, settings);
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

