export type GameMode =
  | 'practice'
  | 'lesson'
  | 'time-attack'
  | 'accuracy-challenge'
  | 'speed-run'
  | 'word-rush'
  | 'orbital-defense'
  | 'bomb-defusal'
  | 'daily-challenge'
  | 'ai-mission'
  | 'zen-marathon'
  | 'numeric-ninja'
  | 'echo-typing'
  | 'boss-gauntlet'
  | 'weakness-weaver'
  | 'typing-quest'
  | 'adaptive-boss'
  | 'story-stream'
  | 'code-pulse'
  | 'certification-test'
  | 'arcade'
  | 'code-climber';

export type SessionState = 'ready' | 'countdown' | 'playing' | 'paused' | 'completed';

export type CharacterStatus = 'pending' | 'current' | 'correct' | 'incorrect' | 'corrected';

export interface CharState {
  char: string;
  status: CharacterStatus;
  userTyped?: string;
  timestamp?: number;
}

export interface WpmSample {
  time: number; // elapsed seconds
  wpm: number;
  rawWpm: number;
  errors: number;
  combo: number;
}

export interface PatternStat {
  typed: number;
  errors: number;
  totalLatencyMs: number;
  avgLatencyMs: number;
  ewmaScore: number;
}

export type ErrorMode = 'standard' | 'stop-on-error' | 'confidence';

export type SwitchSoundProfile = 'cherry-blue' | 'gateron-red' | 'holy-panda' | 'topre' | 'classic';

export interface ReplayEvent {
  deltaMs: number;
  key: string;
  isCorrect: boolean;
  index: number;
}

export interface GhostDuelPayload {
  version: 1;
  id: string;
  targetText: string;
  wpm: number;
  accuracy: number;
  author: string;
  events: [number, number, boolean][]; // [deltaMs, charIndex, isCorrect]
}

export interface LiveHesitationSignal {
  bigram: string;
  sourceKey: string;
  targetKey: string;
  latencyMs: number;
  baselineMs: number;
  remediated?: boolean;
}

export interface MasteryTier {
  tier: number;
  requiredXp: number;
  title: string;
  reward: string;
  unlocked: boolean;
  claimed: boolean;
  icon: string;
}

export interface CodeClimberSnippet {
  id: string;
  language: 'typescript' | 'python' | 'rust' | 'go';
  title: string;
  repoSource: string;
  code: string;
  symbols: string[];
}

export interface ArcadeScores {
  raceWins: number;
  racePodiums: number;
  raceBestWpm: number;
  orbitalHighScore: number;
  orbitalWordsDestroyed: number;
  bombDefusalHighScore: number;
  bombsDefusedTotal: number;
  blitzHighScore: number;
  blitzMaxMultiplier: number;
  duelWins: number;
  duelBestWpm: number;
  storyStreamBestWpm?: number;
  codePulseBestWpm?: number;
  totalGamesPlayed: number;
}

export interface TypingStats {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  correctChars: number;
  incorrectChars: number;
  correctedErrors: number;
  totalKeystrokes: number;
  elapsedSeconds: number;
  combo: number;
  maxCombo: number;
  consistency: number; // 0-100%
  errorsByChar: Record<string, number>;
  weakKeys: string[];
  timeline: WpmSample[];
  patternStats?: Record<string, { typed: number; errors: number; totalLatencyMs: number; avgLatencyMs: number }>;
  confidenceScores?: Record<string, number>;
  confidenceScore?: number;
  replayEvents?: ReplayEvent[];
  hesitationSignals?: LiveHesitationSignal[];
  remediatedHesitationCount?: number;
}

export interface Lesson {
  id: string;
  tier: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  tierTitle: string;
  title: string;
  description: string;
  targetKeys: string[];
  targetAccuracy: number; // e.g. 95
  targetWpm: number; // e.g. 25
  content: string;
  unlocked: boolean;
  completed: boolean;
  stars: number; // 0-3
  xpReward: number;
}

export type AIDrillStyle = 'alternating' | 'repetition' | 'words' | 'weak_keys' | 'flow';

export interface AIDrillOptions {
  lessonId: string;
  style: AIDrillStyle;
  scope: 'target_only' | 'cumulative';
  length: 15 | 25 | 40;
}

export interface AIDrillResult {
  content: string;
  allowedKeys: string[];
  style: AIDrillStyle;
  scope: 'target_only' | 'cumulative';
  source: 'gemini' | 'openai' | 'procedural';
  lessonTitle: string;
}

export type AIMissionType =
  | 'ACCURACY_TARGET'
  | 'WPM_TARGET'
  | 'WEAK_KEY_DRILL'
  | 'COMBO_CHALLENGE'
  | 'SPEED_SPRINT'
  | 'TIME_ATTACK';

export interface AIMission {
  id: string;
  type: AIMissionType;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Master';
  durationSeconds?: number;
  targetWpm?: number;
  targetAccuracy?: number;
  targetCombo?: number;
  focusKeys?: string[];
  content: string;
  rewardXp: number;
  reason: string;
  completed: boolean;
  createdAt: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'speed' | 'accuracy' | 'streak' | 'lessons' | 'combo' | 'games';
  unlockedAt?: number;
  progress: number;
  maxProgress: number;
  xpReward: number;
}

export interface TypingSessionSummary {
  id: string;
  date: number;
  mode: GameMode;
  modeTitle: string;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  durationSeconds: number;
  totalChars: number;
  errors: number;
  score: number;
  xpEarned: number;
  weakKeys: string[];
  consistency?: number;        // 0-100, copy of TypingStats.consistency at save time
  peakWpm?: number;            // max WpmSample.wpm seen in this run's timeline
  enduranceRatio?: number | null; // null when the run was too short to measure (<45s or <6 samples)
}

export type TypingDnaCategoryId =
  | 'speed'
  | 'accuracy'
  | 'consistency'
  | 'transitions'
  | 'punctuation'
  | 'numbers'
  | 'capitalization'
  | 'endurance';

export type TypingDnaLabel = 'strong' | 'average' | 'weak' | 'insufficient-data';

export interface TypingDnaCategoryScore {
  id: TypingDnaCategoryId;
  title: string;          // display name, e.g. "Key Transitions"
  score: number | null;   // 0-100, null when insufficient-data
  label: TypingDnaLabel;
  sampleSize: number;      // sessions or chars/bigrams the score is based on
  detail: string;          // one short sentence, e.g. "based on 23 sessions"
}

export interface TypingDnaProfile {
  categories: TypingDnaCategoryScore[];
  weakestCategory: TypingDnaCategoryScore | null; // lowest scored, excluding insufficient-data
  sessionsAnalyzed: number; // how many of history were actually used (<= 40)
  generatedAt: number;
}

export interface KeybrProgressionState {
  activeAlphabet: string[];   // Starts with ['e', 'n', 'i', 't', 'r', 'l']
  unlockedKeyQueue: string[]; // Remaining keys: ['s', 'a', 'o', 'u', 'd', 'c', 'h', 'm', 'p', 'g', 'b', 'f', 'y', 'w', 'k', 'v', 'x', 'z', 'j', 'q']
  currentFocusKey: string;    // The probationary key currently targeted
  confidenceMap: Record<string, number>; // 0.0 - 1.0 per active key
  isMastered: boolean;
  totalKeysUnlocked: number;
}

export type CertificationTierId = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface CertificationBenchmark {
  id: CertificationTierId;
  title: string;
  badge: string;
  minWpm: number;
  minAccuracy: number; // e.g. 95
  description: string;
  color: string;
}

export interface CertificationResult {
  earnedTier: CertificationBenchmark | null;
  wpm: number;
  accuracy: number;
  date: number;
  durationSeconds: number;
  passed: boolean;
}

export interface RunewrightBackupPackage {
  schemaVersion: 2;
  timestamp: number;
  userProgress: UserProgress;
  preferences?: AppPreferences;
  checksum: string;
}

export interface UserProgress {
  xp: number;
  level: number;
  title: string;
  dailyStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  history: TypingSessionSummary[];
  completedLessonIds: string[];
  lessonStars: Record<string, number>;
  unlockedAchievements: string[];
  highScores: {
    bestWpm: number;
    bestAccuracy: number;
    highestCombo: number;
    totalTimePracticedSeconds: number;
    totalSessions: number;
  };
  keyStats: Record<string, { typed: number; errors: number }>;
  patternStats?: Record<string, PatternStat>;
  confidenceScores?: Record<string, number>; // 0.0 - 1.0 (Keybr confidence metric)
  arcadeStats?: ArcadeScores; // Unified arcade performance metrics
  keybrProgression?: KeybrProgressionState; // Sequential touch-typing unlock pipeline
}

export interface QuestOption {
  id: string;
  label: string;
  promptText?: string;
  targetExcerpt?: string;
  consequenceSummary?: string;
  targetWpm?: number;
  nextSceneId?: string;
}

export interface QuestScene {
  id: string;
  title?: string;
  sceneTitle?: string;
  narrative: string;
  promptText: string;
  targetWpm?: number;
  options: QuestOption[];
  isEnding?: boolean;
}

export interface QuestState {
  chapter: number;
  health: number;
  maxHealth?: number;
  playerHp?: number;
  inventory: string[];
  history?: string[];
  currentSceneId: string;
}

export interface TurnResult {
  playerDamage?: number;
  bossDamage?: number;
  combo?: number;
  accuracy?: number;
  playerSuccess?: boolean;
  roundDamageDealt?: number;
  playerAccuracy?: number;
  phraseCompleted?: boolean;
  weakPatternTriggered?: string;
}

export interface BossTurnData {
  bossDialogue: string;
  attackName: string;
  targetPhrase: string;
  attackText: string;
  timeLimitSeconds: number;
  damageMultiplier: number;
  dangerLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export interface AISettings {
  provider: 'openai-compatible' | 'gemini' | 'offline';
  endpoint: string;
  apiKey: string;
  model: string;
  useServerProxy: boolean;
  temperature: number;
  systemPrompt?: string;
}

export type ThemePreference = 'dark' | 'light' | 'system' | 'dark-slate' | 'cyber-amber' | 'emerald-focus';

export interface AppPreferences {
  soundEnabled: boolean;
  soundVolume: number; // 0.0 - 1.0
  showKeyboard: boolean;
  showFingerGuidance: boolean;
  showAnimatedHandsInLessons?: boolean;
  showGhostPacer?: boolean;
  targetPacerWpm?: number;
  cadenceMetronomeEnabled?: boolean;
  cadenceMetronomeVolume?: number; // 0.0 - 1.0
  cadenceTargetWpm?: number;
  cadenceVisualPacer?: boolean;
  fontSize: 'small' | 'medium' | 'large';
  dyslexicFont?: boolean;
  theme: ThemePreference;
  errorMode?: ErrorMode; // 'standard' | 'stop-on-error' | 'confidence'
  quickWordSkip?: boolean;
  viewportMode?: '3-line' | 'scrolling';
  switchSoundProfile?: SwitchSoundProfile;
  ddaEnabled?: boolean;
  codeAutoIndent?: boolean;
  codeBracketSkip?: boolean;
}

export interface AICoachFeedback {
  wpmSummary: string;
  accuracyAssessment: string;
  weaknessIdentified: string;
  keyAdvice: string;
  recommendedMission?: AIMission;
}
