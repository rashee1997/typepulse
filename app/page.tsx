'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AIDrillResult,
  AIMission,
  AISettings,
  AppPreferences,
  CharState,
  GameMode,
  Lesson,
  SessionState,
  ThemePreference,
  TypingStats,
  UserProgress,
} from '@/types/typing';
import { TypingEngine, calculateGhostPacerIndex } from '@/lib/typing-engine';
import { soundFx } from '@/lib/sound';
import {
  generateRandomWords,
  generateWeakKeyDrill,
  getRandomCodeSnippet,
  getRandomQuote,
  INSPIRATIONAL_QUOTES,
  TECH_CODE_SNIPPETS,
} from '@/lib/word-banks';
import { LESSONS_CURRICULUM } from '@/lib/curriculum';
import {
  loadStoredAiSettings,
  saveStoredAiSettings,
  DEFAULT_AI_SETTINGS,
} from '@/lib/ai-service';
import {
  loadUserProgress,
  processCompletedSession,
  INITIAL_USER_PROGRESS,
} from '@/lib/progress-service';

// Components
import { KeyboardVisualizer } from '@/components/KeyboardVisualizer';
import { SettingsModal } from '@/components/SettingsModal';
import { ResultsModal } from '@/components/ResultsModal';
import { AICoachChat } from '@/components/AICoachChat';
import { ArcadeDashboard } from '@/components/ArcadeDashboard';
import { LessonsView } from '@/components/LessonsView';
import { AnalyticsView } from '@/components/AnalyticsView';
import { AIMissionBoard } from '@/components/AIMissionBoard';
import { AIDrillModal } from '@/components/AIDrillModal';

import {
  Activity,
  Award,
  BookOpen,
  Bot,
  Calendar,
  Clock,
  Code,
  Flame,
  Gamepad2,
  Ghost,
  Keyboard,
  Lock,
  Quote,
  RotateCcw,
  Settings,
  Shield,
  Sparkles,
  Sun,
  Target,
  Trophy,
  Volume2,
  VolumeX,
  Moon,
  Zap,
} from 'lucide-react';

export default function Home() {
  // Navigation View State
  const [currentView, setCurrentView] = useState<'typing' | 'lessons' | 'word-rush' | 'analytics' | 'ai-missions'>('typing');

  // Game Mode Configuration
  const [gameMode, setGameMode] = useState<GameMode>('practice');
  const [modeTitle, setModeTitle] = useState('Free Practice');
  const [wordCount, setWordCount] = useState<number>(25);
  const [timeLimit, setTimeLimit] = useState<number | null>(null); // null means word count mode
  const [includePunctuation, setIncludePunctuation] = useState(false);
  const [includeNumbers, setIncludeNumbers] = useState(false);
  const [contentCategory, setContentCategory] = useState<'words' | 'quotes' | 'code'>('words');

  // Active Lesson or Mission
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [activeMission, setActiveMission] = useState<AIMission | null>(null);

  // AI Lesson Practice Drill State
  const [isAiDrillModalOpen, setIsAiDrillModalOpen] = useState(false);
  const [drillLesson, setDrillLesson] = useState<Lesson | null>(null);

  const handleOpenAiDrill = useCallback((lesson: Lesson) => {
    setDrillLesson(lesson);
    setIsAiDrillModalOpen(true);
  }, []);

  // Settings & Preferences (Loaded from localStorage on mount to prevent hydration mismatch)
  const [aiSettings, setAiSettings] = useState<AISettings>(DEFAULT_AI_SETTINGS);

  const [preferences, setPreferences] = useState<AppPreferences>({
    soundEnabled: true,
    soundVolume: 0.35,
    showKeyboard: true,
    showFingerGuidance: true,
    smoothCaret: true,
    showGhostPacer: true,
    fontSize: 'medium',
    theme: 'dark-slate',
  });

  // User Progression
  const [userProgress, setUserProgress] = useState<UserProgress>(INITIAL_USER_PROGRESS);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        setAiSettings(loadStoredAiSettings());
        const storedPrefs = localStorage.getItem('typepulse_preferences');
        if (storedPrefs) {
          setPreferences((prev) => ({ ...prev, ...JSON.parse(storedPrefs) }));
        }
        setUserProgress(loadUserProgress());
      } catch {}
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Modals & Drawers
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCoachChatOpen, setIsCoachChatOpen] = useState(false);
  const [isResultsOpen, setIsResultsOpen] = useState(false);

  // Completed Session Result Cache
  const [lastResults, setLastResults] = useState<{
    stats: TypingStats;
    leveledUp: boolean;
    newAchievements: ReturnType<typeof processCompletedSession>['newAchievements'];
    sessionSummary?: ReturnType<typeof processCompletedSession>['sessionSummary'];
  } | null>(null);

  // Core Engine & Input Refs
  const engineRef = useRef<TypingEngine>(new TypingEngine(''));
  const inputRef = useRef<HTMLInputElement>(null);
  const activeCharRef = useRef<HTMLSpanElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);

  // Engine React Mirror State (for React-safe rendering)
  const [engineChars, setEngineChars] = useState<CharState[]>([]);
  const [engineIndex, setEngineIndex] = useState<number>(0);
  const [ghostIndex, setGhostIndex] = useState<number>(0);
  const [liveStats, setLiveStats] = useState<TypingStats>(() => new TypingEngine('').getStats());
  const [sessionState, setSessionState] = useState<SessionState>('ready');
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [activeKeyPressed, setActiveKeyPressed] = useState<string>('');
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');

  // Synchronize Theme class with document.documentElement
  useEffect(() => {
    const root = document.documentElement;
    const currentPref = preferences.theme || 'dark';

    if (currentPref === 'light') {
      root.classList.remove('dark');
    } else if (currentPref === 'dark' || currentPref === 'dark-slate') {
      root.classList.add('dark');
    } else if (currentPref === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const applySystemTheme = () => {
        if (mediaQuery.matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      };
      applySystemTheme();
      mediaQuery.addEventListener('change', applySystemTheme);
      return () => mediaQuery.removeEventListener('change', applySystemTheme);
    }
  }, [preferences.theme]);

  const isDarkMode =
    preferences.theme === 'light'
      ? false
      : preferences.theme === 'system' && typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true;

  const toggleTheme = () => {
    const nextTheme: ThemePreference = isDarkMode ? 'light' : 'dark';
    const updatedPrefs: AppPreferences = { ...preferences, theme: nextTheme };
    setPreferences(updatedPrefs);
    try {
      localStorage.setItem('typepulse_preferences', JSON.stringify(updatedPrefs));
    } catch {}
    if (nextTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  };

  // Synchronization refs for test configuration to avoid race conditions and stale state
  const contentCategoryRef = useRef(contentCategory);
  const wordCountRef = useRef(wordCount);
  const includePunctuationRef = useRef(includePunctuation);
  const includeNumbersRef = useRef(includeNumbers);
  const timeLimitRef = useRef(timeLimit);
  const activeLessonRef = useRef<Lesson | null>(activeLesson);
  const activeMissionRef = useRef<AIMission | null>(activeMission);
  const gameModeRef = useRef<GameMode>(gameMode);

  useEffect(() => {
    contentCategoryRef.current = contentCategory;
    wordCountRef.current = wordCount;
    includePunctuationRef.current = includePunctuation;
    includeNumbersRef.current = includeNumbers;
    timeLimitRef.current = timeLimit;
    activeLessonRef.current = activeLesson;
    activeMissionRef.current = activeMission;
    gameModeRef.current = gameMode;
  }, [
    contentCategory,
    wordCount,
    includePunctuation,
    includeNumbers,
    timeLimit,
    activeLesson,
    activeMission,
    gameMode,
  ]);

  // Generate or configure text based on selected mode
  const setupNewTest = useCallback(
    (
      mode: GameMode,
      customText?: string,
      customTimeLimit?: number | null,
      lessonObj?: Lesson,
      missionObj?: AIMission,
      overrideCategory?: 'words' | 'quotes' | 'code'
    ) => {
      const activeCat = overrideCategory || contentCategoryRef.current;
      let targetText = '';

      if (customText) {
        targetText = customText;
      } else if (lessonObj) {
        targetText = lessonObj.content;
      } else if (mode === 'lesson' && (lessonObj || activeLessonRef.current)) {
        // PRESERVE exact lesson letters for re-practice! Never bleed random words into lessons
        targetText = (lessonObj || activeLessonRef.current)!.content;
      } else if (missionObj) {
        targetText = missionObj.content;
      } else if (mode === 'ai-mission' && (missionObj || activeMissionRef.current)) {
        targetText = (missionObj || activeMissionRef.current)!.content;
      } else if (activeCat === 'quotes') {
        targetText = getRandomQuote();
      } else if (activeCat === 'code') {
        targetText = getRandomCodeSnippet();
      } else {
        targetText = generateRandomWords(
          wordCountRef.current,
          includePunctuationRef.current,
          includeNumbersRef.current
        );
      }

      engineRef.current.reset(targetText);
      setEngineChars([...engineRef.current.chars]);
      setEngineIndex(0);
      setGhostIndex(0);
      setLiveStats(engineRef.current.getStats());
      setSessionState('ready');

      if (mode === 'lesson') {
        setTimeLimit(null);
        setTimeRemaining(null);
      } else if (customTimeLimit !== undefined) {
        setTimeLimit(customTimeLimit);
        setTimeRemaining(customTimeLimit);
      } else if (timeLimitRef.current !== null) {
        setTimeRemaining(timeLimitRef.current);
      } else {
        setTimeRemaining(null);
      }

      // Focus input automatically
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    },
    []
  );

  // Switch back to standard practice mode safely clearing any active lesson/mission
  const switchToPractice = useCallback(() => {
    activeLessonRef.current = null;
    activeMissionRef.current = null;
    gameModeRef.current = 'practice';
    setActiveLesson(null);
    setActiveMission(null);
    setGameMode('practice');
    setModeTitle('Free Practice');
    setCurrentView('typing');
    setupNewTest('practice');
  }, [setupNewTest]);

  // Reset the active session with the exact same content (e.g. same lesson letters for re-practice)
  const handleResetCurrent = useCallback(() => {
    const currentLesson = activeLessonRef.current;
    const currentMission = activeMissionRef.current;
    if (gameModeRef.current === 'lesson' && currentLesson) {
      setupNewTest('lesson', currentLesson.content, null, currentLesson);
    } else if (gameModeRef.current === 'ai-mission' && currentMission) {
      setupNewTest('ai-mission', currentMission.content, currentMission.durationSeconds || null, undefined, currentMission);
    } else {
      setupNewTest('practice');
    }
  }, [setupNewTest]);

  // Complete session & calculate progress
  const finalizeSession = useCallback(() => {
    setSessionState('completed');
    const stats = engineRef.current.getStats();
    setLiveAnnouncement(`Test completed. ${stats.wpm} words per minute, ${stats.accuracy}% accuracy.`);

    // Sound effect
    if (stats.accuracy >= 95) {
      soundFx.playSuccess();
    }

    const { updatedProgress, sessionSummary, newAchievements, leveledUp } = processCompletedSession(
      userProgress,
      stats,
      gameMode,
      modeTitle,
      activeLesson?.id
    );

    setUserProgress(updatedProgress);
    setLastResults({
      stats,
      leveledUp,
      newAchievements,
      sessionSummary,
    });
    setIsResultsOpen(true);
  }, [userProgress, gameMode, modeTitle, activeLesson?.id]);

  // Initial test setup on mount only - runs strictly once to prevent race condition overwriting lessons
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      setupNewTest('practice');
    }
  }, [setupNewTest]);

  // Update sound config when preferences change
  useEffect(() => {
    soundFx.setConfig(preferences.soundEnabled, preferences.soundVolume);
  }, [preferences.soundEnabled, preferences.soundVolume]);

  // Countdown timer effect for timed modes
  useEffect(() => {
    if (sessionState !== 'playing' || timeRemaining === null) return;

    if (timeRemaining <= 0) {
      const timeout = setTimeout(() => finalizeSession(), 0);
      return () => clearTimeout(timeout);
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timer);
          setTimeout(() => finalizeSession(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionState, timeRemaining, finalizeSession]);

  // Real-Time Ghost PB Pacer Effect (strictly practice mode only)
  useEffect(() => {
    if (sessionState !== 'playing' || preferences.showGhostPacer === false || gameMode !== 'practice') {
      return;
    }

    const targetWpm =
      preferences.targetPacerWpm ||
      (userProgress.highScores.bestWpm > 0 ? userProgress.highScores.bestWpm : 50);

    const interval = setInterval(() => {
      const elapsed = engineRef.current.getElapsedSeconds();
      const total = engineRef.current.chars.length;
      const idx = calculateGhostPacerIndex(elapsed, targetWpm, total);
      setGhostIndex(idx);
    }, 120);

    return () => clearInterval(interval);
  }, [
    sessionState,
    preferences.showGhostPacer,
    preferences.targetPacerWpm,
    userProgress.highScores.bestWpm,
    gameMode,
  ]);

  // Cadence Metronome Sound Tick & Rhythm Loop
  useEffect(() => {
    if (sessionState !== 'playing' || !preferences.cadenceMetronomeEnabled) {
      return;
    }

    const targetWpm = preferences.cadenceTargetWpm || 60;
    // Standard typing: 1 word = 5 characters / keystrokes
    const intervalMs = (60 / (targetWpm * 5)) * 1000;
    const vol = preferences.cadenceMetronomeVolume ?? 0.15;

    const timer = setInterval(() => {
      soundFx.playMetronomeTick(false, vol);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [
    sessionState,
    preferences.cadenceMetronomeEnabled,
    preferences.cadenceTargetWpm,
    preferences.cadenceMetronomeVolume,
  ]);

  // Keep active character centered in view
  useEffect(() => {
    if (activeCharRef.current && textContainerRef.current) {
      const charOffsetTop = activeCharRef.current.offsetTop;
      const containerHeight = textContainerRef.current.clientHeight;
      textContainerRef.current.scrollTop = Math.max(0, charOffsetTop - containerHeight / 2 + 20);
    }
  }, [engineIndex]);

  // Handle Keystrokes
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Tab to reset current session (in lessons: re-practices same letters)
    if (e.key === 'Tab') {
      e.preventDefault();
      handleResetCurrent();
      return;
    }

    if (isResultsOpen || isSettingsOpen || isCoachChatOpen) return;

    const key = e.key;

    // Prevent default scrolling for Space
    if (key === ' ') {
      e.preventDefault();
    }

    // Set active key for keyboard visualizer
    setActiveKeyPressed(key);
    setTimeout(() => setActiveKeyPressed(''), 120);

    // Audio cue
    if (key === 'Backspace') {
      soundFx.playKeyClick();
    }

    // Handle typing input inside engine
    const expectedChar = engineRef.current.chars[engineRef.current.currentIndex]?.char;
    const res = engineRef.current.handleInput(key, e.ctrlKey || e.metaKey);
    setEngineChars([...engineRef.current.chars]);
    setEngineIndex(engineRef.current.currentIndex);
    setLiveStats(engineRef.current.getStats());

    if (res.success) {
      if (sessionState === 'ready') {
        setSessionState('playing');
      }

      if (res.isCorrect) {
        soundFx.playKeyClick();
        if (engineRef.current.combo > 0 && engineRef.current.combo % 25 === 0) {
          soundFx.playCombo();
        }
        if (key === ' ') {
          setLiveAnnouncement('Word correct');
        }
      } else {
        soundFx.playError();
        setLiveAnnouncement(
          `Error: typed ${key === ' ' ? 'space' : key}, expected ${expectedChar === ' ' ? 'space' : expectedChar}`
        );
      }

      // Check for completion
      if (res.isFinished) {
        finalizeSession();
      }
    }
  };

  // Launch a Lesson
  const handleSelectLesson = (lesson: Lesson) => {
    activeLessonRef.current = lesson;
    activeMissionRef.current = null;
    gameModeRef.current = 'lesson';
    setActiveLesson(lesson);
    setActiveMission(null);
    setGameMode('lesson');
    setModeTitle(lesson.title);
    setCurrentView('typing');
    setupNewTest('lesson', lesson.content, null, lesson);
  };

  // Start an AI-generated lesson practice drill
  const handleStartAiDrill = (drill: AIDrillResult, lesson: Lesson) => {
    setIsAiDrillModalOpen(false);
    activeLessonRef.current = lesson;
    activeMissionRef.current = null;
    gameModeRef.current = 'lesson';
    setActiveLesson(lesson);
    setActiveMission(null);
    setGameMode('lesson');
    setModeTitle(`${lesson.title} (AI Drill - ${drill.style})`);
    setCurrentView('typing');
    setupNewTest('lesson', drill.content, null, lesson);
  };

  // Launch an AI Mission
  const handleLaunchMission = (mission: AIMission) => {
    activeMissionRef.current = mission;
    activeLessonRef.current = null;
    gameModeRef.current = 'ai-mission';
    setActiveMission(mission);
    setActiveLesson(null);
    setGameMode('ai-mission');
    setModeTitle(mission.title);
    setCurrentView('typing');
    setupNewTest('ai-mission', mission.content, mission.durationSeconds || null, undefined, mission);
  };

  // Train specific weak keys
  const handleTrainWeakKeys = (keys: string[]) => {
    const drillText = generateWeakKeyDrill(keys, 25);
    activeLessonRef.current = null;
    activeMissionRef.current = null;
    gameModeRef.current = 'accuracy-challenge';
    setActiveLesson(null);
    setActiveMission(null);
    setGameMode('accuracy-challenge');
    setModeTitle(`Weak Keys Drill (${keys.map((k) => k.toUpperCase()).join(', ')})`);
    setIsResultsOpen(false);
    setCurrentView('typing');
    setupNewTest('accuracy-challenge', drillText, null);
  };

  const handleLaunchCustomDrill = (drillText: string, title: string = 'Biometric AI Prescription') => {
    activeLessonRef.current = null;
    activeMissionRef.current = null;
    gameModeRef.current = 'practice';
    setActiveLesson(null);
    setActiveMission(null);
    setGameMode('practice');
    setModeTitle(title);
    setIsResultsOpen(false);
    setCurrentView('typing');
    setupNewTest('practice', drillText, null);
  };

  const handleUpdateArcadeXp = useCallback((amount: number) => {
    setUserProgress((prev) => ({
      ...prev,
      xp: prev.xp + amount,
    }));
  }, []);

  const handleArcadeSessionFinish = useCallback(
    (stats: TypingStats, mode: string) => {
      const { updatedProgress } = processCompletedSession(
        userProgress,
        stats,
        'arcade',
        mode
      );
      setUserProgress(updatedProgress);
    },
    [userProgress]
  );

  const currentLessonIndex = activeLesson
    ? LESSONS_CURRICULUM.findIndex((l) => l.id === activeLesson.id)
    : -1;
  const nextLesson =
    currentLessonIndex >= 0 && currentLessonIndex < LESSONS_CURRICULUM.length - 1
      ? LESSONS_CURRICULUM[currentLessonIndex + 1]
      : null;

  const currentChar = engineChars[engineIndex]?.char || '';

  return (
    <div className="h-dvh w-full max-w-full bg-background text-foreground flex flex-col font-sans selection:bg-accent selection:text-accent-foreground overflow-hidden">
      {/* Screen-reader-only status channel for completed words, errors, and session results */}
      <div aria-live="polite" role="status" className="sr-only">
        {liveAnnouncement}
      </div>

      {/* TOP GLOBAL NAVBAR - SLEEK RESPONSIVE HEADER WITH ZERO OVERFLOW */}
      <header className="w-full max-w-full border-b border-border bg-surface/95 backdrop-blur-md sticky top-0 z-40 px-3 sm:px-4 py-2 shrink-0 shadow-sm overflow-x-clip">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3 min-w-0">
          {/* Brand & Logo */}
          <button
            onClick={switchToPractice}
            className="flex items-center gap-1.5 sm:gap-2 hover:opacity-90 transition-opacity shrink-0"
            id="nav-logo"
          >
            <div className="p-1.5 rounded-xl bg-accent text-accent-foreground font-bold shadow-glow-accent-sm shrink-0">
              <Keyboard className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-text-primary">TypePulse</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-subtle border border-accent-border text-accent font-mono font-bold hidden sm:inline">
              AI
            </span>
          </button>

          {/* Center Nav Views - Fully Responsive & Scroll-safe */}
          <nav className="flex items-center gap-1 bg-surface-muted p-1 rounded-xl border border-border shrink min-w-0 overflow-x-auto scrollbar-none">
            <button
              onClick={() => {
                if (currentView !== 'typing' || gameMode !== 'practice') {
                  switchToPractice();
                }
              }}
              title="Practice"
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap ${
                currentView === 'typing' && gameMode === 'practice'
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
              }`}
            >
              <Zap className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Practice</span>
            </button>

            <button
              onClick={() => setCurrentView('lessons')}
              title="Academy Curriculum"
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap ${
                currentView === 'lessons'
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">Academy</span>
            </button>

            <button
              onClick={() => setCurrentView('ai-missions')}
              title="AI Missions"
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap ${
                currentView === 'ai-missions'
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
              }`}
            >
              <Bot className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">Missions</span>
            </button>

            <button
              onClick={() => setCurrentView('word-rush')}
              title="Arcade Arena"
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap ${
                currentView === 'word-rush'
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
              }`}
              id="nav-arcade-btn"
            >
              <Gamepad2 className="w-3.5 h-3.5 shrink-0" />
              <span>Arcade</span>
            </button>

            <button
              onClick={() => setCurrentView('analytics')}
              title="Profile & Stats"
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap ${
                currentView === 'analytics'
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
              }`}
            >
              <Activity className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden lg:inline">Stats</span>
            </button>
          </nav>

          {/* Right Action Icons: Rank, Streak, Coach & Settings */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Daily Streak Pill */}
            <div
              className="px-2 sm:px-2.5 py-1 rounded-xl bg-surface-muted border border-border flex items-center gap-1 text-xs text-accent font-bold font-mono shrink-0"
              title={`${userProgress.dailyStreak} Day Typing Streak`}
            >
              <Flame className="w-3.5 h-3.5 text-accent shrink-0" />
              <span>{userProgress.dailyStreak}d</span>
            </div>

            {/* Level & XP Pill */}
            <button
              onClick={() => setCurrentView('analytics')}
              className="px-2 py-1 rounded-xl bg-surface-muted border border-border hover:border-border-subtle items-center gap-1 text-xs text-text-secondary font-medium transition-colors shrink-0 hidden sm:flex"
              title={`Level ${userProgress.level} (${userProgress.title})`}
            >
              <Award className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Lvl {userProgress.level}</span>
            </button>

            {/* AI Coach Quick Chat Button */}
            <button
              onClick={() => setIsCoachChatOpen(true)}
              className="px-2.5 py-1 rounded-xl bg-primary-subtle border border-primary-border text-primary hover:bg-primary-subtle/80 flex items-center gap-1.5 text-xs font-semibold transition-colors shrink-0"
              title="Open AI Typing Coach (Sensei)"
              id="open-coach-chat-btn"
            >
              <Bot className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="hidden sm:inline">Sensei</span>
            </button>

            {/* Audio Toggle */}
            <button
              onClick={() => {
                const nextSound = !preferences.soundEnabled;
                setPreferences((p) => ({ ...p, soundEnabled: nextSound }));
                soundFx.setConfig(nextSound, preferences.soundVolume);
              }}
              className="p-1.5 rounded-xl bg-surface-muted border border-border text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors shrink-0 cursor-pointer"
              title={preferences.soundEnabled ? 'Mute Mechanical Audio' : 'Unmute Audio'}
            >
              {preferences.soundEnabled ? <Volume2 className="w-4 h-4 text-accent" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Theme Toggle (Light / Dark Mode) */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-xl bg-surface-muted border border-border text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors shrink-0 cursor-pointer flex items-center justify-center"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              id="theme-toggle-button"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-accent hover:rotate-45 transition-transform" />
              ) : (
                <Moon className="w-4 h-4 text-accent hover:-rotate-12 transition-transform" />
              )}
            </button>

            {/* Settings Dialog (OpenAI-Compatible Endpoint & Preferences) */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 rounded-xl bg-surface-muted border border-border text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors relative shrink-0 cursor-pointer"
              title="Settings & Appearance"
              id="open-settings-button"
            >
              <Settings className="w-4 h-4" />
              {aiSettings.apiKey && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-success" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* SCROLLABLE APP BODY - single scroll container beneath the sticky header */}
      <div className="flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
      {/* SUB-VIEW CONDITIONAL RENDERING */}
      <main className="max-w-7xl w-full mx-auto px-4 py-4 flex flex-col justify-start">
        {currentView === 'lessons' && (
          <LessonsView
            lessons={LESSONS_CURRICULUM}
            completedLessonIds={userProgress.completedLessonIds}
            lessonStars={userProgress.lessonStars}
            onSelectLesson={handleSelectLesson}
            onBackToPractice={switchToPractice}
            onOpenAiDrill={handleOpenAiDrill}
          />
        )}

        {currentView === 'ai-missions' && (
          <AIMissionBoard
            userProgress={userProgress}
            aiSettings={aiSettings}
            onLaunchMission={handleLaunchMission}
            onBackToPractice={switchToPractice}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )}

        {currentView === 'word-rush' && (
          <ArcadeDashboard
            userProgress={userProgress}
            aiSettings={aiSettings}
            onUpdateXp={handleUpdateArcadeXp}
            onFinishSession={handleArcadeSessionFinish}
            onBackToPractice={switchToPractice}
          />
        )}

        {currentView === 'analytics' && (
          <AnalyticsView
            userProgress={userProgress}
            aiSettings={aiSettings}
            onTrainWeakKeys={handleTrainWeakKeys}
            onLaunchCustomDrill={handleLaunchCustomDrill}
            onBackToPractice={switchToPractice}
          />
        )}

        {/* PRIMARY TYPING ARENA - DUAL-COLUMN DESKTOP COCKPIT */}
        {currentView === 'typing' && (
          <div className="w-full flex flex-col gap-3 animate-fadeIn">
            {/* Mode Controls Bar (for Free Practice) */}
            {gameMode === 'practice' && (
              <div className="w-full flex flex-wrap items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-2 bg-surface border border-border rounded-2xl text-xs text-text-muted shadow-sm">
                {/* Content Discipline Switcher */}
                <div className="flex items-center gap-1 bg-surface-muted p-1 rounded-xl border border-border">
                  <button
                    onClick={() => {
                      setContentCategory('words');
                      setupNewTest('practice', undefined, timeLimit, undefined, undefined, 'words');
                    }}
                    className={`px-3 py-1 rounded-lg font-medium transition-all ${
                      contentCategory === 'words'
                        ? 'bg-accent text-accent-foreground font-bold shadow-sm'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    Words
                  </button>
                  <button
                    onClick={() => {
                      setContentCategory('quotes');
                      setTimeLimit(null);
                      setTimeRemaining(null);
                      setupNewTest('practice', undefined, null, undefined, undefined, 'quotes');
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all ${
                      contentCategory === 'quotes'
                        ? 'bg-accent text-accent-foreground font-bold shadow-sm'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <Quote className="w-3 h-3" />
                    <span>Quotes</span>
                  </button>
                  <button
                    onClick={() => {
                      setContentCategory('code');
                      setTimeLimit(null);
                      setTimeRemaining(null);
                      setupNewTest('practice', undefined, null, undefined, undefined, 'code');
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all ${
                      contentCategory === 'code'
                        ? 'bg-accent text-accent-foreground font-bold shadow-sm'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <Code className="w-3 h-3" />
                    <span>Code</span>
                  </button>
                </div>

                {/* Sub-parameters based on category */}
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  {contentCategory === 'words' ? (
                    <>
                      {/* Word vs Time Mode */}
                      <div className="flex items-center gap-1 bg-surface-muted p-0.5 rounded-lg border border-border">
                        <button
                          onClick={() => {
                            setTimeLimit(null);
                            setTimeRemaining(null);
                            setupNewTest('practice', undefined, null);
                          }}
                          className={`px-2.5 py-0.5 rounded font-medium transition-colors ${
                            timeLimit === null ? 'bg-surface text-accent font-semibold shadow-sm' : 'hover:text-text-primary'
                          }`}
                        >
                          Count
                        </button>
                        <button
                          onClick={() => {
                            setTimeLimit(30);
                            setTimeRemaining(30);
                            setupNewTest('practice', undefined, 30);
                          }}
                          className={`px-2.5 py-0.5 rounded font-medium transition-colors ${
                            timeLimit !== null ? 'bg-surface text-accent font-semibold shadow-sm' : 'hover:text-text-primary'
                          }`}
                        >
                          Time
                        </button>
                      </div>

                      {timeLimit === null ? (
                        <div className="flex items-center gap-1 border-r border-border pr-2">
                          {[15, 25, 50, 100].map((count) => (
                            <button
                              key={count}
                              onClick={() => {
                                setWordCount(count);
                                setupNewTest('practice');
                              }}
                              className={`px-1.5 py-0.5 rounded font-mono transition-colors ${
                                wordCount === count ? 'text-accent font-bold' : 'hover:text-text-primary'
                              }`}
                            >
                              {count}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 border-r border-border pr-2">
                          {[15, 30, 60, 120].map((seconds) => (
                            <button
                              key={seconds}
                              onClick={() => {
                                setTimeLimit(seconds);
                                setTimeRemaining(seconds);
                                setupNewTest('practice', undefined, seconds);
                              }}
                              className={`px-1.5 py-0.5 rounded font-mono transition-colors ${
                                timeLimit === seconds ? 'text-accent font-bold' : 'hover:text-text-primary'
                              }`}
                            >
                              {seconds}s
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Modifiers */}
                      <button
                        onClick={() => {
                          setIncludePunctuation(!includePunctuation);
                          setupNewTest('practice');
                        }}
                        className={`px-2 py-0.5 rounded transition-colors ${
                          includePunctuation ? 'text-accent font-bold' : 'hover:text-text-primary'
                        }`}
                      >
                        @ punctuation
                      </button>
                      <button
                        onClick={() => {
                          setIncludeNumbers(!includeNumbers);
                          setupNewTest('practice');
                        }}
                        className={`px-2 py-0.5 rounded transition-colors ${
                          includeNumbers ? 'text-accent font-bold' : 'hover:text-text-primary'
                        }`}
                      >
                        # numbers
                      </button>
                    </>
                  ) : contentCategory === 'quotes' ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setupNewTest('practice')}
                        className="flex items-center gap-1 px-2.5 py-1 bg-surface-muted hover:bg-surface-hover text-accent rounded-lg font-medium border border-border transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Next Quote</span>
                      </button>
                      <span className="text-[11px] text-text-subtle font-mono hidden sm:inline">Wisdom & Mindset</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setupNewTest('practice')}
                        className="flex items-center gap-1 px-2.5 py-1 bg-surface-muted hover:bg-surface-hover text-accent rounded-lg font-medium border border-border transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Next Snippet</span>
                      </button>
                      <span className="text-[11px] text-text-subtle font-mono hidden sm:inline">TS · JS · React · SQL · Bash</span>
                    </div>
                  )}

                  {/* Real-Time Ghost Pacer Quick Toggle */}
                  <div className="border-l border-border pl-2">
                    <button
                      onClick={() => {
                        const nextState = preferences.showGhostPacer === false ? true : false;
                        const updated: AppPreferences = { ...preferences, showGhostPacer: nextState };
                        setPreferences(updated);
                        localStorage.setItem('typepulse_preferences', JSON.stringify(updated));
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        preferences.showGhostPacer !== false
                          ? 'bg-primary-subtle text-primary border border-primary-border shadow-sm'
                          : 'text-text-muted hover:text-text-primary border border-transparent'
                      }`}
                      title="Toggle Real-Time Ghost Pacer against your Personal Best"
                    >
                      <Ghost className="w-3.5 h-3.5 text-primary" />
                      <span className="font-mono">
                        Ghost PB: {userProgress.highScores.bestWpm > 0 ? `${userProgress.highScores.bestWpm} WPM` : '50 WPM'}
                      </span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          preferences.showGhostPacer !== false ? 'bg-primary animate-pulse' : 'bg-text-subtle'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* If in Lesson, show dedicated Academy Lesson Cockpit */}
            {gameMode === 'lesson' && activeLesson && (
              <div className="w-full p-3.5 bg-surface border border-accent-border/60 bg-gradient-to-r from-surface via-surface to-accent-subtle/25 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shrink-0 shadow-sm">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-extrabold text-accent uppercase tracking-wider px-2 py-0.5 rounded-md bg-accent-subtle border border-accent-border">
                      {activeLesson.tierTitle || `Tier ${activeLesson.tier}`}
                    </span>
                    {activeLesson.tier === 1 && (
                      <span className="text-[10px] font-bold text-accent bg-accent-subtle border border-accent-border px-2 py-0.5 rounded-md flex items-center gap-1">
                        <span>👋</span> Hands Guide Active
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-text-subtle">
                      Target: ≥{activeLesson.targetAccuracy}% Acc • {activeLesson.targetWpm} WPM
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-text-primary flex items-center gap-2">
                    {activeLesson.title}
                  </h3>
                  <p className="text-xs text-text-secondary">
                    {activeLesson.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center flex-wrap">
                  {/* AI Drill Button in Lesson Cockpit: greyed out until student completes lesson */}
                  {(() => {
                    const isLessonCompleted = userProgress.completedLessonIds.includes(activeLesson.id);
                    return (
                      <button
                        type="button"
                        disabled={!isLessonCompleted}
                        onClick={() => handleOpenAiDrill(activeLesson)}
                        title={
                          isLessonCompleted
                            ? "Practice with AI-generated letter combinations strictly from this lesson"
                            : "Complete this lesson first to unlock AI-generated practice drills"
                        }
                        className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 text-xs transition-all ${
                          isLessonCompleted
                            ? 'bg-gradient-to-r from-primary-subtle to-accent-subtle hover:from-primary/20 hover:to-accent/20 text-accent border border-accent-border shadow-xs cursor-pointer'
                            : 'bg-surface-muted/50 text-text-subtle/50 cursor-not-allowed border border-border/40 opacity-60'
                        }`}
                        id="lesson-cockpit-ai-drill-button"
                      >
                        {isLessonCompleted ? (
                          <Sparkles className="w-3.5 h-3.5 text-accent" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-text-subtle/60" />
                        )}
                        <span>AI Drill</span>
                      </button>
                    );
                  })()}

                  <button
                    onClick={handleResetCurrent}
                    className="px-3 py-1.5 bg-surface hover:bg-surface-hover text-text-primary text-xs font-semibold rounded-xl border border-border shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Reset with the exact same lesson letters to re-practice"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-accent" />
                    <span>Re-practice Lesson</span>
                  </button>
                  <button
                    onClick={() => setCurrentView('lessons')}
                    className="px-3 py-1.5 bg-surface-muted hover:bg-surface-hover text-text-secondary hover:text-text-primary text-xs font-medium rounded-xl border border-border transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="View all Academy curriculum lessons"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Curriculum</span>
                  </button>
                  <button
                    onClick={switchToPractice}
                    className="px-2.5 py-1.5 text-text-muted hover:text-text-primary text-xs rounded-xl transition-colors cursor-pointer"
                    title="Exit to Free Practice"
                  >
                    Exit
                  </button>
                </div>
              </div>
            )}

            {/* If in AI Mission or other non-practice, non-lesson mode */}
            {gameMode !== 'practice' && gameMode !== 'lesson' && (
              <div className="w-full px-4 py-2.5 bg-surface border border-border rounded-2xl flex items-center justify-between shrink-0 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-accent uppercase tracking-wider">
                      {gameMode === 'ai-mission' ? 'AI Mission' : modeTitle}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-text-primary">{modeTitle}</h3>
                  {activeMission && (
                    <p className="text-xs text-primary mt-0.5">{activeMission.reason}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetCurrent}
                    className="px-3 py-1 bg-surface hover:bg-surface-hover text-text-primary text-xs rounded-xl border border-border transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3 text-accent" />
                    <span>Reset</span>
                  </button>
                  <button
                    onClick={switchToPractice}
                    className="px-3 py-1 bg-surface-muted hover:bg-surface-hover text-text-secondary text-xs rounded-xl border border-border transition-colors cursor-pointer"
                  >
                    Exit Mode
                  </button>
                </div>
              </div>
            )}

            {/* DUAL-COLUMN DESKTOP WORKSPACE */}
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* LEFT COLUMN: LIVE METRICS & TYPING STAGE */}
              <div className="lg:col-span-6 flex flex-col gap-3">
                {/* LIVE METRICS HUD */}
                <div className="w-full flex items-center justify-between px-5 py-2.5 bg-surface rounded-2xl border border-border shadow-sm">
                  <div className="flex items-center gap-5">
                    {/* WPM Counter */}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-text-subtle uppercase tracking-wider font-semibold">Speed</span>
                        {sessionState === 'playing' && gameMode === 'practice' && preferences.showGhostPacer !== false && (
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                              engineIndex >= ghostIndex
                                ? 'text-success bg-success-subtle border border-success-border'
                                : 'text-primary bg-primary-subtle border border-primary-border'
                            }`}
                            title="Position relative to your Ghost PB Pacer"
                          >
                            {engineIndex >= ghostIndex
                              ? `+${engineIndex - ghostIndex} PB`
                              : `-${ghostIndex - engineIndex} PB`}
                          </span>
                        )}
                        {preferences.cadenceVisualPacer && (
                          <span
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1 animate-pulse"
                            title={`Cadence Metronome Rhythm: ${preferences.cadenceTargetWpm || 60} WPM`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            {preferences.cadenceTargetWpm || 60} WPM
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-extrabold font-mono text-accent">
                          {liveStats.wpm}
                        </span>
                        <span className="text-[11px] text-text-subtle font-mono">WPM</span>
                      </div>
                    </div>

                    {/* Accuracy */}
                    <div className="flex flex-col">
                      <span className="text-[10px] text-text-subtle uppercase tracking-wider font-semibold">Accuracy</span>
                      <span className="text-2xl font-extrabold font-mono text-success">
                        {liveStats.accuracy}%
                      </span>
                    </div>

                    {/* Timer or Word Counter */}
                    <div className="flex flex-col">
                      <span className="text-[10px] text-text-subtle uppercase tracking-wider font-semibold">
                        {timeRemaining !== null ? 'Time Left' : 'Progress'}
                      </span>
                      <span className="text-2xl font-extrabold font-mono text-text-primary">
                        {timeRemaining !== null
                          ? `${timeRemaining}s`
                          : `${engineIndex}/${engineChars.length}`}
                      </span>
                    </div>
                  </div>

                  {/* Combo Streak Indicator & Quick Restart */}
                  <div className="flex items-center gap-2">
                    {liveStats.combo > 5 && (
                      <div className="px-2.5 py-1 rounded-full bg-accent-subtle border border-accent-border text-accent font-mono text-xs font-bold flex items-center gap-1.5 animate-pulse">
                        <Flame className="w-3.5 h-3.5 text-accent" />
                        <span>{liveStats.combo}</span>
                      </div>
                    )}

                    <button
                      onClick={handleResetCurrent}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-text-muted hover:text-accent hover:bg-surface-hover rounded-xl border border-border text-xs font-semibold transition-colors cursor-pointer"
                      title={gameMode === 'lesson' ? 'Reset current lesson letters for re-practice (Tab)' : 'Restart Test (Tab)'}
                      id="restart-test-button"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{gameMode === 'lesson' ? 'Reset Lesson' : 'Restart'}</span>
                    </button>
                  </div>
                </div>

                {/* THE TYPING TEXT STAGE */}
                <div
                  onClick={() => inputRef.current?.focus()}
                  ref={textContainerRef}
                  className="w-full h-56 bg-surface hover:bg-surface-muted/50 p-5 rounded-2xl border border-border shadow-inner overflow-hidden cursor-text flex flex-col justify-start relative select-none transition-colors focus-within:ring-2 focus-within:ring-accent/60"
                  id="typing-text-canvas"
                >
                  {/* In-flow keystroke capture input - occupies the stage without shifting layout or leaving the viewport */}
                  <input
                    ref={inputRef}
                    type="text"
                    className="absolute inset-0 size-full opacity-0 cursor-default pointer-events-none caret-transparent"
                    onKeyDown={handleKeyDown}
                    autoFocus
                    inputMode="text"
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    aria-label="Typing input stream"
                    tabIndex={0}
                    id="accessible-keystroke-capture"
                  />

                  <div className="text-xl font-mono leading-relaxed tracking-wider break-words">
                    {engineChars.map((charItem, index) => {
                      const isCurrent = index === engineIndex;
                      const isCorrect = charItem.status === 'correct';
                      const isIncorrect = charItem.status === 'incorrect';
                      const isCorrected = charItem.status === 'corrected';
                      const isGhost =
                        sessionState === 'playing' &&
                        gameMode === 'practice' &&
                        preferences.showGhostPacer !== false &&
                        index === ghostIndex &&
                        index !== engineIndex;

                      return (
                        <span
                          key={index}
                          ref={isCurrent ? activeCharRef : undefined}
                          className={`relative transition-colors duration-75 ${
                            isCorrect
                              ? 'text-text-primary font-medium'
                              : isIncorrect
                              ? 'text-error underline decoration-error decoration-2 font-bold bg-error-subtle rounded'
                              : isCorrected
                              ? 'text-accent font-medium'
                              : isCurrent
                              ? 'text-accent font-bold'
                              : 'text-text-subtle'
                          }`}
                        >
                          {/* Blinking Caret on Current Character */}
                          {isCurrent && (
                            <span className="absolute -left-0.5 top-0 bottom-0 w-0.5 bg-accent animate-pulse rounded-full shadow-glow-accent-sm" />
                          )}

                          {/* Real-Time Ghost Pacer Caret */}
                          {isGhost && (
                            <span
                              className="absolute -left-0.5 top-0 bottom-0 w-0.5 bg-primary/90 rounded-full shadow-glow-primary-sm pointer-events-none z-10"
                              title="Ghost PB Pacer"
                            >
                              <span className="absolute -top-3.5 -left-1.5 text-[9px] text-primary font-mono select-none drop-shadow">
                                👻
                              </span>
                            </span>
                          )}

                          {charItem.char}
                        </span>
                      );
                    })}
                  </div>

                  {/* Ready helper hint */}
                  {sessionState === 'ready' && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-surface-muted/90 rounded-full text-xs text-text-primary border border-border backdrop-blur-sm pointer-events-none shadow-sm">
                      Press any key to start typing
                    </div>
                  )}
                </div>

                {/* Quick Hint */}
                <div className="flex items-center justify-between text-[11px] text-text-subtle px-1 font-mono">
                  <span>Press <kbd className="px-1.5 py-0.5 rounded bg-surface-muted border border-border text-text-primary">Tab</kbd> to restart instantly</span>
                  <span>Click canvas to focus</span>
                </div>
              </div>

              {/* RIGHT COLUMN: EYE-LEVEL FINGER HUD & KEYBOARD VISUALIZER */}
              <div className="lg:col-span-6 flex flex-col gap-2">
                {preferences.showKeyboard ? (
                  <KeyboardVisualizer
                    targetChar={currentChar}
                    activeKey={activeKeyPressed}
                    showFingerGuide={preferences.showFingerGuidance}
                    keyStats={userProgress.keyStats}
                    confidenceScores={userProgress.confidenceScores}
                    isBasicLesson={gameMode === 'lesson' && activeLesson?.tier === 1}
                    activeLessonTitle={activeLesson?.title}
                    showAnimatedHands={preferences.showAnimatedHandsInLessons !== false}
                  />
                ) : (
                  <div className="h-64 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center text-text-muted text-xs p-6 text-center">
                    <p>Virtual keyboard visualizer is turned off.</p>
                    <button
                      onClick={() => setPreferences((p) => ({ ...p, showKeyboard: true }))}
                      className="mt-2 text-accent hover:underline"
                    >
                      Enable Keyboard Visualizer
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="w-full border-t border-border py-4 px-4 text-center text-xs text-text-muted">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-text-primary font-semibold">TypePulse AI</span>
            <span>•</span>
            <span>Touch Typing Mastery</span>
            <span>•</span>
            <span className="text-text-muted">
              AI: {aiSettings.provider === 'gemini' ? 'Google Gemini' : aiSettings.model || 'OpenAI Compatible'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span>Tab + Enter to restart</span>
            <span>•</span>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-accent hover:underline"
            >
              Configure AI Endpoint
            </button>
          </div>
        </div>
      </footer>
      </div>

      {/* MODALS & DRAWERS */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        aiSettings={aiSettings}
        onSaveAiSettings={(newAi) => {
          setAiSettings(newAi);
          saveStoredAiSettings(newAi);
        }}
        preferences={preferences}
        onSavePreferences={(newPrefs) => {
          setPreferences(newPrefs);
          try {
            localStorage.setItem('typepulse_preferences', JSON.stringify(newPrefs));
          } catch {}
        }}
      />

      <ResultsModal
        isOpen={isResultsOpen}
        onClose={() => setIsResultsOpen(false)}
        stats={lastResults?.stats || liveStats}
        mode={gameMode}
        modeTitle={modeTitle}
        userProgress={userProgress}
        sessionSummary={lastResults?.sessionSummary}
        newAchievements={lastResults?.newAchievements || []}
        leveledUp={lastResults?.leveledUp || false}
        aiSettings={aiSettings}
        onStartMission={handleLaunchMission}
        onRestart={() => {
          setIsResultsOpen(false);
          handleResetCurrent();
        }}
        onTrainWeakKeys={handleTrainWeakKeys}
        activeLesson={activeLesson}
        onNextLesson={
          nextLesson
            ? () => {
                setIsResultsOpen(false);
                handleSelectLesson(nextLesson);
              }
            : undefined
        }
        onReturnToLessons={() => {
          setIsResultsOpen(false);
          setCurrentView('lessons');
        }}
        onOpenAiDrill={handleOpenAiDrill}
      />

      <AIDrillModal
        isOpen={isAiDrillModalOpen}
        onClose={() => setIsAiDrillModalOpen(false)}
        lesson={drillLesson}
        userProgress={userProgress}
        aiSettings={aiSettings}
        onStartDrill={handleStartAiDrill}
      />

      <AICoachChat
        isOpen={isCoachChatOpen}
        onClose={() => setIsCoachChatOpen(false)}
        aiSettings={aiSettings}
        userProgress={userProgress}
        onOpenSettings={() => {
          setIsCoachChatOpen(false);
          setIsSettingsOpen(true);
        }}
      />
    </div>
  );
}
