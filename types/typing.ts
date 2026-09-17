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
  | 'arcade';

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

export interface ReplayEvent {
  deltaMs: number;
  key: string;
  isCorrect: boolean;
  index: number;
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
}

export interface Lesson {
  id: string;
  tier: 1 | 2 | 3 | 4;
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
  smoothCaret: boolean;
  showGhostPacer?: boolean;
  targetPacerWpm?: number;
  cadenceMetronomeEnabled?: boolean;
  cadenceMetronomeVolume?: number; // 0.0 - 1.0
  cadenceTargetWpm?: number;
  cadenceVisualPacer?: boolean;
  challengerTwinEnabled?: boolean;
  fontSize: 'small' | 'medium' | 'large';
  theme: ThemePreference;
  errorMode?: ErrorMode; // 'standard' | 'stop-on-error' | 'confidence'
  quickWordSkip?: boolean;
  viewportMode?: '3-line' | 'scrolling';
}

export interface AICoachFeedback {
  wpmSummary: string;
  accuracyAssessment: string;
  weaknessIdentified: string;
  keyAdvice: string;
  recommendedMission?: AIMission;
}
