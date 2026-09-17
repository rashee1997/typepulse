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

export const TECH_CODE_SNIPPETS = [
  "const calculateWpm = (chars: number, seconds: number): number => Math.round((chars / 5) / (seconds / 60));",
  "export function useTypingEngine(config: EngineOptions) { const [state, dispatch] = useReducer(reducer, initial); }",
  "async function fetchAiCoachRecommendation(userId: string): Promise<AIMission> { return await api.get('/coach'); }",
  "const filteredKeys = Object.entries(errorStats).sort(([, a], [, b]) => b - a).map(([key]) => key);",
  "function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) { let timer: NodeJS.Timeout; }",
  "import { useState, useEffect, useCallback, useMemo } from 'react'; export default function App() {}",
  "git checkout -b feature/adaptive-coach && git commit -m 'feat: neural key diagnosis' && git push origin main",
  "interface PlayerStats { totalKeystrokes: number; accuracy: number; comboStreak: number; currentTier: number; }",
  "const user = await prisma.user.findUnique({ where: { id }, include: { profile: true, sessions: true } });",
  "docker run -d --name typepulse-redis -p 6379:6379 -v redis-data:/data redis:7-alpine --appendonly yes",
  "export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));",
  "const [data, setData] = useState<UserSession | null>(() => loadInitialFromCache());",
  "SELECT u.id, u.username, MAX(s.wpm) AS peak_wpm FROM users u JOIN sessions s ON u.id = s.user_id GROUP BY u.id;",
  "def quick_sort(arr: list[int]) -> list[int]: return [x for x in arr[1:] if x < arr[0]] + [arr[0]] if arr else []",
  "const response = await fetch('/api/ai/coach', { method: 'POST', headers: { 'Content-Type': 'application/json' } });",
  "fn fibonacci(n: u64) -> u64 { match n { 0 => 0, 1 => 1, _ => fibonacci(n - 1) + fibonacci(n - 2) } }",
  "curl -X POST https://api.openai.com/v1/chat/completions -H 'Authorization: Bearer $OPENAI_API_KEY'",
  "const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Enter' && e.ctrlKey) submitForm(); };",
  "type DeepPartial<T> = { [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P] };",
  "npm install @tanstack/react-query zustand lucide-react framer-motion tailwind-merge"
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

export function getRandomCodeSnippet(): string {
  return TECH_CODE_SNIPPETS[Math.floor(Math.random() * TECH_CODE_SNIPPETS.length)];
}

export function getRandomQuote(): string {
  return INSPIRATIONAL_QUOTES[Math.floor(Math.random() * INSPIRATIONAL_QUOTES.length)];
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

// Generate targeted drill for weak keys
export function generateWeakKeyDrill(weakKeys: string[], wordCount: number = 20): string {
  if (!weakKeys || weakKeys.length === 0) {
    weakKeys = ["e", "t", "a", "o", "i", "n"];
  }

  // Filter words that contain at least one of the weak keys
  const matchedWords = COMMON_WORDS_200.filter(w => 
    weakKeys.some(k => w.toLowerCase().includes(k.toLowerCase()))
  );

  const pool = matchedWords.length > 10 ? matchedWords : COMMON_WORDS_200;
  const selected: string[] = [];

  for (let i = 0; i < wordCount; i++) {
    // 50% chance to insert an explicit weak-key pattern like "efe" or "juj"
    if (Math.random() < 0.35 && weakKeys.length > 0) {
      const key = weakKeys[Math.floor(Math.random() * weakKeys.length)];
      selected.push(`${key}${key} ${key}f${key} ${key}j${key}`);
    } else {
      selected.push(pool[Math.floor(Math.random() * pool.length)]);
    }
  }

  return selected.join(" ").trim();
}
