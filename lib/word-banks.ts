import { LITERARY_QUOTES } from './quotes';

export const COMMON_WORDS_200 = [
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "i",
  "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
  "this", "but", "his", "by", "from", "they", "we", "say", "her", "she",
  "or", "an", "will", "my", "one", "all", "would", "there", "their", "what",
  "so", "up", "out", "if", "about", "who", "get", "which", "go", "me",
  "when", "make", "can", "like", "time", "no", "just", "him", "know", "take",
  "people", "into", "year", "your", "good", "some", "could", "them", "see", "other",
  "than", "then", "now", "look", "only", "come", "its", "over", "think", "also",
  "back", "after", "use", "two", "how", "our", "work", "first", "well", "way",
  "even", "new", "want", "because", "any", "these", "give", "day", "most", "us",
  "flow", "code", "type", "fast", "mind", "focus", "speed", "skill", "light", "hand",
  "path", "swift", "pulse", "learn", "key", "world", "great", "space", "power", "true",
  "clear", "quick", "press", "reach", "rhythm", "drive", "build", "spark", "track", "glide",
  "shift", "sound", "smart", "steady", "tempo", "zenith", "fluid", "force", "craft", "habit",
  "sharp", "alert", "motion", "master", "action", "growth", "prime", "vivid", "energy", "tempo",
  "brave", "bright", "calm", "dance", "dream", "early", "field", "flame", "fresh", "grace",
  "heart", "honor", "logic", "march", "noble", "orbit", "peace", "quest", "radiant", "shine",
  "silent", "silver", "solace", "spirit", "stream", "stride", "summit", "thrive", "vision", "zenith"
];

export const LANGUAGE_CODE_SNIPPETS: Record<string, string[]> = {
  typescript: [
    "type DeepReadonly<T> = { readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P] };",
    "export const filterById = <T extends { id: string }>(items: T[], id: string): T | undefined => items.find(i => i.id === id);",
    "interface TypingState { readonly text: string; readonly index: number; readonly errors: number; }",
    "const result: Promise<Result<T, E>> = async () => ({ ok: true, data: await fetchPayload() });",
    "export type EventCallback<T extends keyof WindowEventMap> = (ev: WindowEventMap[T]) => void;",
  ],
  react: [
    "const [state, setState] = useState<TypingStats>(() => calculateInitialStats());",
    "useEffect(() => { const timer = setInterval(() => tick(), 1000); return () => clearInterval(timer); }, []);",
    "const handleKey = useCallback((e: React.KeyboardEvent) => { if (e.key === 'Tab') e.preventDefault(); }, []);",
    "const memoizedValue = useMemo(() => computeExpensiveMatrix(data, factor), [data, factor]);",
    "export function Component({ children, className = '' }: PropsWithChildren<{ className?: string }>) { return <div className={className}>{children}</div>; }",
  ],
  python: [
    "def quick_sort(arr: list[int]) -> list[int]: return [x for x in arr[1:] if x < arr[0]] + [arr[0]] if arr else []",
    "@dataclass(frozen=True)\nclass PlayerProfile:\n    username: str\n    peak_wpm: float = 0.0\n    streak: int = 1",
    "async def fetch_leaderboard(db: AsyncSession) -> list[dict]: return await db.execute(select(User).limit(10))",
    "squares = {x: x ** 2 for x in range(1, 20) if x % 2 == 0}",
    "with open('dataset.json', mode='r', encoding='utf-8') as f: data = json.load(f)",
  ],
  sql: [
    "SELECT u.id, u.username, MAX(s.wpm) AS peak_wpm FROM users u JOIN sessions s ON u.id = s.user_id GROUP BY u.id HAVING peak_wpm >= 100;",
    "WITH ranked_scores AS (SELECT user_id, wpm, DENSE_RANK() OVER (PARTITION BY mode ORDER BY wpm DESC) as rnk FROM typing_history) SELECT * FROM ranked_scores WHERE rnk <= 3;",
    "CREATE INDEX CONCURRENTLY idx_sessions_user_created ON sessions(user_id, created_at DESC);",
    "UPDATE player_stats SET total_xp = total_xp + 150, streak = streak + 1 WHERE id = $1 RETURNING *;",
  ],
  rust: [
    "fn fibonacci(n: u64) -> u64 { match n { 0 => 0, 1 => 1, _ => fibonacci(n - 1) + fibonacci(n - 2) } }",
    "pub fn process_event<E: std::error::Error>(payload: &[u8]) -> Result<ProcessedPacket, E> { todo!() }",
    "let mut scores: HashMap<String, u32> = HashMap::with_capacity(64);",
    "impl<'a, T: Clone> Iterator for CustomWindowIter<'a, T> { type Item = &'a [T]; fn next(&mut self) -> Option<Self::Item> { None } }",
  ],
  bash: [
    "git checkout -b feature/adaptive-coach && git commit -m 'feat: neural key diagnosis' && git push origin main",
    "docker run -d --name typepulse-redis -p 6379:6379 -v redis-data:/data redis:7-alpine --appendonly yes",
    "find ./src -type f -name '*.tsx' | xargs grep -n 'processCompletedSession'",
    "curl -sSL https://install.typepulse.dev | bash -s -- --release v2.0",
  ],
};

export const TECH_CODE_SNIPPETS = [
  ...Object.values(LANGUAGE_CODE_SNIPPETS).flat(),
  "const calculateWpm = (chars: number, seconds: number): number => Math.round((chars / 5) / (seconds / 60));",
  "export function useTypingEngine(config: EngineOptions) { const [state, dispatch] = useReducer(reducer, initial); }",
  "async function fetchAiCoachRecommendation(userId: string): Promise<AIMission> { return await api.get('/coach'); }",
  "const filteredKeys = Object.entries(errorStats).sort(([, a], [, b]) => b - a).map(([key]) => key);",
  "function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) { let timer: NodeJS.Timeout; }",
  "export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));",
  "npm install @tanstack/react-query zustand lucide-react framer-motion tailwind-merge",
];

export const INSPIRATIONAL_QUOTES = [
  "Precision is the foundation of speed. Move smooth, keep calm, and speed will follow naturally.",
  "Small daily improvements over time lead to stunning results. Consistency always triumphs over intensity.",
  "Do not focus on your fingers; trust your muscle memory. Let your thoughts flow directly onto the screen.",
  "The master has failed more times than the beginner has even tried. Keep your posture upright and press forward.",
  "True mastery is quiet rhythm. When each stroke matches the breath, typing transforms into effortless thought.",
  "Your keyboard is an extension of your mind. Learn every key until the boundary between thought and letter disappears.",
  "Simplicity is prerequisite for reliability. Write programs that do one thing and do it exceptionally well.",
  "First, solve the problem. Then, write the code. Rhythm comes when the architectural path is completely clear.",
  "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.",
  "It is not that I am so smart, it is just that I stay with problems longer. Persistence is the ultimate multiplier.",
  "The only way to go fast, is to go well. Build the fundamental habits cleanly and the speed will unlock itself.",
  "Stay hungry, stay foolish. Dedicate yourself to deep focus and let distraction fade into silence."
];

export function getRandomCodeSnippet(language?: string): string {
  if (language && language in LANGUAGE_CODE_SNIPPETS) {
    const list = LANGUAGE_CODE_SNIPPETS[language];
    return list[Math.floor(Math.random() * list.length)];
  }
  return TECH_CODE_SNIPPETS[Math.floor(Math.random() * TECH_CODE_SNIPPETS.length)];
}

export function getRandomQuote(): string {
  const pool = [...INSPIRATIONAL_QUOTES, ...LITERARY_QUOTES];
  return pool[Math.floor(Math.random() * pool.length)];
}

// Generates random word text
export function generateRandomWords(count: number = 25, includePunctuation: boolean = false, includeNumbers: boolean = false): string {
  const words: string[] = [];
  const punctuationMarks = [".", ",", "!", "?", ";", ":", "-", "'"];

  for (let i = 0; i < count; i++) {
    let word = COMMON_WORDS_200[Math.floor(Math.random() * COMMON_WORDS_200.length)];

    if (includeNumbers && Math.random() < 0.15) {
      word = String(Math.floor(Math.random() * 900) + 10);
    }

    if (includePunctuation) {
      // Capitalize first word or random word
      if (i === 0 || Math.random() < 0.2) {
        word = word.charAt(0).toUpperCase() + word.slice(1);
      }
      if (Math.random() < 0.25 && i < count - 1) {
        const mark = punctuationMarks[Math.floor(Math.random() * 3)]; // common . , ;
        word += mark;
      }
    }

    words.push(word);
  }

  let result = words.join(" ");
  if (includePunctuation && !result.endsWith(".")) {
    result += ".";
  }
  return result;
}

// Expanded vocabulary for rich n-gram pattern matching
export const EXPANDED_VOCABULARY = [
  ...COMMON_WORDS_200,
  "together", "thought", "through", "nothing", "another", "weather", "brother", "feather", "strength",
  "something", "everything", "anything", "building", "morning", "evening", "running", "writing", "reading",
  "action", "motion", "station", "portion", "section", "fraction", "relation", "solution", "condition",
  "between", "different", "interest", "internet", "interval", "internal", "international", "intensity",
  "computer", "software", "hardware", "network", "keyboard", "keystroke", "monitor", "terminal", "algorithm",
  "precision", "velocity", "cadence", "rhythm", "agility", "discipline", "stamina", "technique", "practice",
  "quantum", "cosmic", "galaxy", "stellar", "orbital", "horizon", "dimension", "spectral", "frequency",
  "serenity", "solitude", "tranquil", "breathe", "whisper", "harmony", "patience", "balance", "silence",
];

// Generate targeted drill for weak keys and n-grams (bigrams/trigrams)
export function generateWeakKeyDrill(weakKeysOrPatterns: string[], wordCount: number = 20): string {
  if (!weakKeysOrPatterns || weakKeysOrPatterns.length === 0) {
    weakKeysOrPatterns = ["th", "er", "in", "e", "t", "a"];
  }

  const normalizedPatterns = weakKeysOrPatterns.map(p => p.toLowerCase().trim()).filter(Boolean);

  // Filter words that contain at least one of the weak keys/n-grams
  const matchedWords = EXPANDED_VOCABULARY.filter(w => {
    const wordLower = w.toLowerCase();
    return normalizedPatterns.some(pat => wordLower.includes(pat));
  });

  const pool = matchedWords.length >= 10 ? matchedWords : EXPANDED_VOCABULARY;
  const selected: string[] = [];

  for (let i = 0; i < wordCount; i++) {
    // 35% chance to insert an explicit rhythmic drill cadence featuring the pattern
    if (Math.random() < 0.35 && normalizedPatterns.length > 0) {
      const pat = normalizedPatterns[Math.floor(Math.random() * normalizedPatterns.length)];
      if (pat.length === 1) {
        selected.push(`${pat}${pat} ${pat}f${pat} ${pat}j${pat}`);
      } else if (pat.length === 2) {
        selected.push(`${pat} ${pat}${pat} re${pat} ${pat}ed`);
      } else {
        selected.push(`${pat} ${pat}ing un${pat}`);
      }
    } else {
      selected.push(pool[Math.floor(Math.random() * pool.length)]);
    }
  }

  return selected.join(" ").trim();
}

/**
 * Prose passages for missions generated without a model.
 *
 * A mission target has to read like a passage someone types under pressure. The
 * rhythmic pattern cadences inside generateWeakKeyDrill ("rr rf rj") belong to the
 * explicit weak-key drill surface; used as a mission target they read as a Keybr
 * progression and misrepresent what the mission is.
 */
const MISSION_PASSAGES: Record<string, string[]> = {
  ACCURACY_TARGET: [
    "Precision is the foundation of real velocity. When every keystroke is deliberate and true, speed arrives without strain.",
    "Slow hands build fast hands. Keep the wrists quiet, land each key the same way, and let the rhythm carry the accuracy.",
  ],
  SPEED_SPRINT: [
    "The silver runner accelerated through the neon circuit, leaving long trails of light across the sleeping skyline.",
    "Momentum rewards the typist who stops checking the scoreboard and starts trusting the next keystroke instead.",
  ],
  WEAK_KEY_DRILL: [
    "The awkward keys are only awkward until they are ordinary. Give them the same calm attention as the easy ones.",
    "Repetition without attention is just noise. Watch the awkward transition, slow it down, then build it back up.",
  ],
};

function wordsFeaturing(keys: string[], count: number): string[] {
  const focused = keys.filter(Boolean).map((key) => key.toLowerCase());
  const matched = EXPANDED_VOCABULARY.filter((word) =>
    focused.some((key) => word.toLowerCase().includes(key))
  );
  const pool = matched.length >= 8 ? matched : EXPANDED_VOCABULARY;
  return Array.from({ length: count }, () => pool[Math.floor(Math.random() * pool.length)]);
}

/** Mission passage: real prose, then real vocabulary biased to the focus keys. */
export function generateMissionPassage(
  type: string,
  focusKeys: string[] = [],
  wordCount: number = 30
): string {
  const bank = MISSION_PASSAGES[type] ?? MISSION_PASSAGES.WEAK_KEY_DRILL;
  const passage = bank[Math.floor(Math.random() * bank.length)];
  const remaining = Math.max(8, wordCount - passage.split(' ').length);
  return `${passage} ${wordsFeaturing(focusKeys, remaining).join(' ')}`.trim();
}

// Numeric & Symbol Practice Sets
export const numericSymbolSets = {
  dates: [
    "2026-09-17", "1994-08-24", "2030-12-31", "12/05/2022", "04/19/1984", "07/04/1776",
    "08:30:15", "14:45:00", "23:59:59", "06:12:45 UTC", "1999-12-31T23:59:59Z", "2025/10/14",
  ],
  currency: [
    "$1,249.50", "€450.00", "£89.99", "¥125,000", "$4,999.95", "€18.75", "$14.20", "$0.99",
    "+$320.50", "-$12.80", "15.5% APR", "$120,400.00", "VAT @ 20.0%", "NET: $8,750.25",
  ],
  invoices: [
    "INV#9082-A", "PO-4021: $8,420.00", "SKU: 884-XJ-01", "QTY: 48 @ $12.50 = $600.00",
    "TRACKING# 1Z-999-999-01-2345", "ORDER# 44029-TX", "TERMS: NET-30 [TAX 8.25%]",
    "ACCT-ID: 7721-9034-01", "REF: REF-2026-X99", "SERIAL# SN:4839-2048-A1",
  ],
  equations: [
    "x = (-b + Math.sqrt(d)) / (2 * a);",
    "E = m * Math.pow(c, 2);",
    "f(x) = 3 * x^2 + 7 * x - 12;",
    "a^2 + b^2 = c^2;",
    "(x + y) * (x - y) = x^2 - y^2;",
    "delta = b^2 - 4 * a * c;",
    "area = Math.PI * Math.pow(r, 2);",
    "velocity = (d2 - d1) / (t2 - t1);",
  ],
  codeFragments: [
    "const [state, setState] = useState<number[]>([]);",
    "if (status >= 400 && status <= 499) { throw new Error(`Client: ${status}`); }",
    "export const filterById = <T extends { id: string }>(items: T[], id: string): T | undefined => items.find(i => i.id === id);",
    "type Result<T, E = Error> = { ok: true; data: T } | { ok: false; error: E };",
    "const sum = values.reduce((acc, curr) => acc + curr, 0);",
    "git commit -m 'feat(engine): add n-gram EWMA latency tracking (#402)'",
    "docker run -p 3000:3000 --env NODE_ENV=production app:v1.4",
  ],
};

export function generateNumericSymbolDrill(count: number = 18, category?: 'all' | 'dates' | 'currency' | 'invoices' | 'equations' | 'code'): string {
  const categories: (keyof typeof numericSymbolSets)[] =
    category && category !== 'all' && category in numericSymbolSets
      ? [category as keyof typeof numericSymbolSets]
      : ['dates', 'currency', 'invoices', 'equations', 'codeFragments'];

  const selectedItems: string[] = [];
  for (let i = 0; i < count; i++) {
    const cat = categories[Math.floor(Math.random() * categories.length)];
    const items = numericSymbolSets[cat];
    selectedItems.push(items[Math.floor(Math.random() * items.length)]);
  }

  return selectedItems.join(' ');
}

// Deterministic Daily Passages Archive (Guarantees every player worldwide receives the exact same daily passage)
export interface DailyPassageData {
  id: string;
  date: string;
  dayNumber: number;
  title: string;
  author: string;
  theme: string;
  targetWpm: number;
  text: string;
}

export const DAILY_PASSAGES_ARCHIVE: Omit<DailyPassageData, 'id' | 'date' | 'dayNumber'>[] = [
  {
    title: "The Architecture of Deep Focus",
    author: "Marcus Aurelius & Modern Cognitive Science",
    theme: "Mindfulness & Flow",
    targetWpm: 60,
    text: "True mastery begins when the mind surrenders anxiety about speed and settles into deliberate presence. When your fingers strike each switch with quiet composure, the boundary between conscious intention and physical execution disappears completely.",
  },
  {
    title: "The Voyage of Discovery",
    author: "Marcel Proust",
    theme: "Exploration",
    targetWpm: 65,
    text: "The real voyage of discovery consists not in seeking new landscapes, but in having new eyes. Every keystroke is an opportunity to cultivate pristine clarity, allowing thought to flow directly into the luminous digital canvas without resistance.",
  },
  {
    title: "Silicon & Starlight",
    author: "Runewright Archive",
    theme: "Technology & Cosmology",
    targetWpm: 70,
    text: "Beneath the glowing glass of modern displays lies a web of billions of transistors pulsing in synchronized harmony. Our keyboards are musical instruments through which human creativity commands the electric architecture of the cosmos.",
  },
  {
    title: "The Discipline of the Craftsman",
    author: "Richard Sennett",
    theme: "Artisanship",
    targetWpm: 62,
    text: "The craftsman represents the special human condition of being engaged in the work for its own sake. When rhythm replaces haste, velocity emerges as a natural consequence of precision, patience, and unyielding dedication to form.",
  },
  {
    title: "Echoes Across the Horizon",
    author: "Alexander von Humboldt",
    theme: "Natural History",
    targetWpm: 68,
    text: "Nature in every zone is an emblem of the sublime, where living forces operate in perpetual equilibrium. To touch-type with elegance is to embody that same harmonious balance, striking every key with measured and peaceful cadence.",
  },
  {
    title: "The Metronome Principle",
    author: "Master Typist Cadence Manual",
    theme: "Ergonomics & Velocity",
    targetWpm: 75,
    text: "Do not rush through simple words only to stumble upon complex punctuation. Let your hands embody the steady ticking of an acoustic metronome. Consistency is the secret gateway through which human velocity surpasses ordinary limits.",
  },
  {
    title: "Infinite Complexity in Finite Strings",
    author: "Ada Lovelace",
    theme: "Origins of Computing",
    targetWpm: 64,
    text: "The engine weaves algebraic patterns just as the Jacquard loom weaves flowers and leaves. In the physical act of typing, we translate abstract symbolic imagination into persistent digital reality with each decisive strike.",
  },
];

/**
 * Deterministically generates today's daily passage based on YYYY-MM-DD.
 * All clients worldwide get the exact same passage for that day.
 */
export function getDailyPassage(dateString?: string): DailyPassageData {
  const date = dateString || new Date().toISOString().split('T')[0];
  
  // Deterministic string hash
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    hash = (hash << 5) - hash + date.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);
  const index = positiveHash % DAILY_PASSAGES_ARCHIVE.length;
  const template = DAILY_PASSAGES_ARCHIVE[index];

  // Day number since epoch start (e.g. 2026-01-01)
  const epoch = new Date('2026-01-01').getTime();
  const current = new Date(date).getTime();
  const dayNumber = Math.max(1, Math.floor((current - epoch) / (1000 * 60 * 60 * 24)) + 1);

  return {
    id: `daily-${date}`,
    date,
    dayNumber,
    ...template,
  };
}
