'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AIMission,
  AISettings,
  AppPreferences,
  CharState,
  GameMode,
  Lesson,
  SessionState,
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
  Quote,
  RotateCcw,
  Settings,
  Shield,
  Sparkles,
  Target,
  Trophy,
  Volume2,
  VolumeX,
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

  // Settings & Preferences (Loaded from localStorage)
  const [aiSettings, setAiSettings] = useState<AISettings>(() => {
    if (typeof window !== 'undefined') return loadStoredAiSettings();
    return DEFAULT_AI_SETTINGS;
  });

  const [preferences, setPreferences] = useState<AppPreferences>(() => {
    const defaultPrefs: AppPreferences = {
      soundEnabled: true,
      soundVolume: 0.35,
      showKeyboard: true,
      showFingerGuidance: true,
      smoothCaret: true,
      showGhostPacer: true,
      fontSize: 'medium',
      theme: 'dark-slate',
    };
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('typepulse_preferences');
        if (stored) return { ...defaultPrefs, ...JSON.parse(stored) };
      } catch {}
    }
    return defaultPrefs;
  });

  // User Progression
  const [userProgress, setUserProgress] = useState<UserProgress>(() => {
    if (typeof window !== 'undefined') return loadUserProgress();
    return INITIAL_USER_PROGRESS;
  });

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
      const activeCat = overrideCategory || contentCategory;
      let targetText = '';

      if (customText) {
        targetText = customText;
      } else if (lessonObj) {
        targetText = lessonObj.content;
      } else if (missionObj) {
        targetText = missionObj.content;
      } else if (activeCat === 'quotes') {
        targetText = getRandomQuote();
      } else if (activeCat === 'code') {
        targetText = getRandomCodeSnippet();
      } else {
        targetText = generateRandomWords(wordCount, includePunctuation, includeNumbers);
      }

      engineRef.current.reset(targetText);
      setEngineChars([...engineRef.current.chars]);
      setEngineIndex(0);
      setGhostIndex(0);
      setLiveStats(engineRef.current.getStats());
      setSessionState('ready');

      if (customTimeLimit !== undefined) {
        setTimeLimit(customTimeLimit);
        setTimeRemaining(customTimeLimit);
      } else if (timeLimit !== null) {
        setTimeRemaining(timeLimit);
      } else {
        setTimeRemaining(null);
      }

      // Focus input automatically
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    },
    [contentCategory, wordCount, includePunctuation, includeNumbers, timeLimit]
  );

  // Complete session & calculate progress
  const finalizeSession = useCallback(() => {
    setSessionState('completed');
    const stats = engineRef.current.getStats();

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

  // Initial test setup on mount
  useEffect(() => {
    setupNewTest('practice');
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

  // Real-Time Ghost PB Pacer Effect
  useEffect(() => {
    if (sessionState !== 'playing' || preferences.showGhostPacer === false) {
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
    // Tab + Enter to restart quickly
    if (e.key === 'Tab') {
      e.preventDefault();
      setupNewTest(gameMode);
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
      } else {
        soundFx.playError();
      }

      // Check for completion
      if (res.isFinished) {
        finalizeSession();
      }
    }
  };

  // Launch a Lesson
  const handleSelectLesson = (lesson: Lesson) => {
    setActiveLesson(lesson);
    setActiveMission(null);
    setGameMode('lesson');
    setModeTitle(lesson.title);
    setCurrentView('typing');
    setupNewTest('lesson', lesson.content, null, lesson);
  };

  // Launch an AI Mission
  const handleLaunchMission = (mission: AIMission) => {
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
    setActiveLesson(null);
    setActiveMission(null);
    setGameMode('accuracy-challenge');
    setModeTitle(`Weak Keys Drill (${keys.map((k) => k.toUpperCase()).join(', ')})`);
    setIsResultsOpen(false);
    setCurrentView('typing');
    setupNewTest('accuracy-challenge', drillText, null);
  };

  const handleUpdateArcadeXp = useCallback((amount: number) => {
    setUserProgress((prev) => ({
      ...prev,
      xp: prev.xp + amount,
    }));
  }, []);

  const currentChar = engineChars[engineIndex]?.char || '';

  return (
    <div className="min-h-screen w-full max-w-full bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950 overflow-x-hidden">
      {/* Hidden input to capture keystrokes from any physical or virtual keyboard */}
      <input
        ref={inputRef}
        type="text"
        className="absolute opacity-0 pointer-events-none -top-40 left-0"
        onKeyDown={handleKeyDown}
        autoFocus
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck="false"
        id="accessible-keystroke-capture"
      />

      {/* TOP GLOBAL NAVBAR - SLEEK RESPONSIVE HEADER WITH ZERO OVERFLOW */}
      <header className="w-full max-w-full border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-md sticky top-0 z-40 px-3 sm:px-4 py-2 shrink-0 shadow-md overflow-x-clip">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3 min-w-0">
          {/* Brand & Logo */}
          <button
            onClick={() => {
              setCurrentView('typing');
              setGameMode('practice');
              setModeTitle('Free Practice');
              setupNewTest('practice');
            }}
            className="flex items-center gap-1.5 sm:gap-2 hover:opacity-90 transition-opacity shrink-0"
            id="nav-logo"
          >
            <div className="p-1.5 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-bold shadow-md shadow-amber-500/20 shrink-0">
              <Keyboard className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-100">TypePulse</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/20 border border-amber-400/40 text-amber-300 font-mono font-bold hidden sm:inline">
              AI
            </span>
          </button>

          {/* Center Nav Views - Fully Responsive & Scroll-safe */}
          <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 shrink min-w-0 overflow-x-auto scrollbar-none">
            <button
              onClick={() => {
                setCurrentView('typing');
                if (gameMode !== 'practice') {
                  setGameMode('practice');
                  setModeTitle('Free Practice');
                  setupNewTest('practice');
                }
              }}
              title="Practice"
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap ${
                currentView === 'typing' && gameMode === 'practice'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
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
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
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
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Bot className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">Missions</span>
            </button>

            <button
              onClick={() => setCurrentView('word-rush')}
              title="Arcade & Word Games"
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap ${
                currentView === 'word-rush'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5 shrink-0" />
              <span>Word Games</span>
            </button>

            <button
              onClick={() => setCurrentView('analytics')}
              title="Profile & Stats"
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap ${
                currentView === 'analytics'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
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
              className="px-2 sm:px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1 text-xs text-amber-400 font-bold font-mono shrink-0"
              title={`${userProgress.dailyStreak} Day Typing Streak`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{userProgress.dailyStreak}d</span>
            </div>

            {/* Level & XP Pill */}
            <button
              onClick={() => setCurrentView('analytics')}
              className="px-2 py-1 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 items-center gap-1 text-xs text-slate-300 font-medium transition-colors shrink-0 hidden sm:flex"
              title={`Level ${userProgress.level} (${userProgress.title})`}
            >
              <Award className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Lvl {userProgress.level}</span>
            </button>

            {/* AI Coach Quick Chat Button */}
            <button
              onClick={() => setIsCoachChatOpen(true)}
              className="px-2.5 py-1 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/30 flex items-center gap-1.5 text-xs font-semibold transition-colors shrink-0"
              title="Open AI Typing Coach (Sensei)"
              id="open-coach-chat-btn"
            >
              <Bot className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="hidden sm:inline">Sensei</span>
            </button>

            {/* Audio Toggle */}
            <button
              onClick={() => {
                const nextSound = !preferences.soundEnabled;
                setPreferences((p) => ({ ...p, soundEnabled: nextSound }));
                soundFx.setConfig(nextSound, preferences.soundVolume);
              }}
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors shrink-0"
              title={preferences.soundEnabled ? 'Mute Mechanical Audio' : 'Unmute Audio'}
            >
              {preferences.soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Settings Dialog (OpenAI-Compatible Endpoint) */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors relative shrink-0"
              title="OpenAI Endpoint & AI Settings"
              id="open-settings-button"
            >
              <Settings className="w-4 h-4" />
              {aiSettings.apiKey && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* SUB-VIEW CONDITIONAL RENDERING */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-4 flex flex-col justify-start">
        {currentView === 'lessons' && (
          <LessonsView
            lessons={LESSONS_CURRICULUM}
            completedLessonIds={userProgress.completedLessonIds}
            lessonStars={userProgress.lessonStars}
            onSelectLesson={handleSelectLesson}
            onBackToPractice={() => {
              setCurrentView('typing');
              setGameMode('practice');
              setModeTitle('Free Practice');
              setupNewTest('practice');
            }}
          />
        )}

        {currentView === 'ai-missions' && (
          <AIMissionBoard
            userProgress={userProgress}
            aiSettings={aiSettings}
            onLaunchMission={handleLaunchMission}
            onBackToPractice={() => {
              setCurrentView('typing');
              setupNewTest('practice');
            }}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )}

        {currentView === 'word-rush' && (
          <ArcadeDashboard
            userProgress={userProgress}
            aiSettings={aiSettings}
            onUpdateXp={handleUpdateArcadeXp}
            onBackToPractice={() => {
              setCurrentView('typing');
              setupNewTest('practice');
            }}
          />
        )}

        {currentView === 'analytics' && (
          <AnalyticsView
            userProgress={userProgress}
            onTrainWeakKeys={handleTrainWeakKeys}
            onBackToPractice={() => {
              setCurrentView('typing');
              setupNewTest('practice');
            }}
          />
        )}

        {/* PRIMARY TYPING ARENA - DUAL-COLUMN DESKTOP COCKPIT */}
        {currentView === 'typing' && (
          <div className="w-full flex flex-col gap-3 animate-fadeIn">
            {/* Mode Controls Bar (for Free Practice) */}
            {gameMode === 'practice' && (
              <div className="w-full flex flex-wrap items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-2 bg-slate-900/60 border border-slate-800/80 rounded-2xl text-xs text-slate-400">
                {/* Content Discipline Switcher */}
                <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80">
                  <button
                    onClick={() => {
                      setContentCategory('words');
                      setupNewTest('practice', undefined, timeLimit, undefined, undefined, 'words');
                    }}
                    className={`px-3 py-1 rounded-lg font-medium transition-all ${
                      contentCategory === 'words'
                        ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
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
                        ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
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
                        ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
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
                      <div className="flex items-center gap-1 bg-slate-950/40 p-0.5 rounded-lg border border-slate-800">
                        <button
                          onClick={() => {
                            setTimeLimit(null);
                            setTimeRemaining(null);
                            setupNewTest('practice', undefined, null);
                          }}
                          className={`px-2.5 py-0.5 rounded font-medium transition-colors ${
                            timeLimit === null ? 'bg-slate-800 text-amber-400 font-semibold' : 'hover:text-slate-200'
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
                            timeLimit !== null ? 'bg-slate-800 text-amber-400 font-semibold' : 'hover:text-slate-200'
                          }`}
                        >
                          Time
                        </button>
                      </div>

                      {timeLimit === null ? (
                        <div className="flex items-center gap-1 border-r border-slate-800 pr-2">
                          {[15, 25, 50, 100].map((count) => (
                            <button
                              key={count}
                              onClick={() => {
                                setWordCount(count);
                                setupNewTest('practice');
                              }}
                              className={`px-1.5 py-0.5 rounded font-mono transition-colors ${
                                wordCount === count ? 'text-amber-400 font-bold' : 'hover:text-slate-200'
                              }`}
                            >
                              {count}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 border-r border-slate-800 pr-2">
                          {[15, 30, 60, 120].map((seconds) => (
                            <button
                              key={seconds}
                              onClick={() => {
                                setTimeLimit(seconds);
                                setTimeRemaining(seconds);
                                setupNewTest('practice', undefined, seconds);
                              }}
                              className={`px-1.5 py-0.5 rounded font-mono transition-colors ${
                                timeLimit === seconds ? 'text-amber-400 font-bold' : 'hover:text-slate-200'
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
                          includePunctuation ? 'text-amber-400 font-bold' : 'hover:text-slate-200'
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
                          includeNumbers ? 'text-amber-400 font-bold' : 'hover:text-slate-200'
                        }`}
                      >
                        # numbers
                      </button>
                    </>
                  ) : contentCategory === 'quotes' ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setupNewTest('practice')}
                        className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-amber-400 rounded-lg font-medium transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Next Quote</span>
                      </button>
                      <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">Wisdom & Mindset</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setupNewTest('practice')}
                        className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-amber-400 rounded-lg font-medium transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Next Snippet</span>
                      </button>
                      <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">TS · JS · React · SQL · Bash</span>
                    </div>
                  )}

                  {/* Real-Time Ghost Pacer Quick Toggle */}
                  <div className="border-l border-slate-800 pl-2">
                    <button
                      onClick={() => {
                        const nextState = preferences.showGhostPacer === false ? true : false;
                        const updated: AppPreferences = { ...preferences, showGhostPacer: nextState };
                        setPreferences(updated);
                        localStorage.setItem('typepulse_preferences', JSON.stringify(updated));
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        preferences.showGhostPacer !== false
                          ? 'bg-indigo-950/70 text-indigo-300 border border-indigo-700/50 shadow-sm'
                          : 'text-slate-500 hover:text-slate-300 border border-transparent'
                      }`}
                      title="Toggle Real-Time Ghost Pacer against your Personal Best"
                    >
                      <Ghost className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="font-mono">
                        Ghost PB: {userProgress.highScores.bestWpm > 0 ? `${userProgress.highScores.bestWpm} WPM` : '50 WPM'}
                      </span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          preferences.showGhostPacer !== false ? 'bg-indigo-400 animate-pulse' : 'bg-slate-600'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* If in Lesson or Mission, show active header */}
            {gameMode !== 'practice' && (
              <div className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center justify-between shrink-0">
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                    {gameMode === 'lesson' ? 'Academy Lesson' : 'AI Mission'}
                  </span>
                  <h3 className="text-sm font-bold text-slate-100">{modeTitle}</h3>
                  {activeMission && (
                    <p className="text-xs text-indigo-300 mt-0.5">{activeMission.reason}</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setGameMode('practice');
                    setModeTitle('Free Practice');
                    setActiveLesson(null);
                    setActiveMission(null);
                    setupNewTest('practice');
                  }}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition-colors"
                >
                  Exit Mode
                </button>
              </div>
            )}

            {/* DUAL-COLUMN DESKTOP WORKSPACE */}
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* LEFT COLUMN: LIVE METRICS & TYPING STAGE */}
              <div className="lg:col-span-6 flex flex-col gap-3">
                {/* LIVE METRICS HUD */}
                <div className="w-full flex items-center justify-between px-5 py-2.5 bg-slate-900/60 rounded-2xl border border-slate-800/70 shadow-sm">
                  <div className="flex items-center gap-5">
                    {/* WPM Counter */}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Speed</span>
                        {sessionState === 'playing' && preferences.showGhostPacer !== false && (
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                              engineIndex >= ghostIndex
                                ? 'text-emerald-300 bg-emerald-950/60 border border-emerald-800/40'
                                : 'text-indigo-300 bg-indigo-950/60 border border-indigo-800/40'
                            }`}
                            title="Position relative to your Ghost PB Pacer"
                          >
                            {engineIndex >= ghostIndex
                              ? `+${engineIndex - ghostIndex} PB`
                              : `-${ghostIndex - engineIndex} PB`}
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-extrabold font-mono text-amber-400">
                          {liveStats.wpm}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">WPM</span>
                      </div>
                    </div>

                    {/* Accuracy */}
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Accuracy</span>
                      <span className="text-2xl font-extrabold font-mono text-emerald-400">
                        {liveStats.accuracy}%
                      </span>
                    </div>

                    {/* Timer or Word Counter */}
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                        {timeRemaining !== null ? 'Time Left' : 'Progress'}
                      </span>
                      <span className="text-2xl font-extrabold font-mono text-slate-200">
                        {timeRemaining !== null
                          ? `${timeRemaining}s`
                          : `${engineIndex}/${engineChars.length}`}
                      </span>
                    </div>
                  </div>

                  {/* Combo Streak Indicator & Quick Restart */}
                  <div className="flex items-center gap-2">
                    {liveStats.combo > 5 && (
                      <div className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold flex items-center gap-1.5 animate-pulse">
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                        <span>{liveStats.combo}</span>
                      </div>
                    )}

                    <button
                      onClick={() => setupNewTest(gameMode)}
                      className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800/80 rounded-xl transition-colors"
                      title="Restart Test (Tab)"
                      id="restart-test-button"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* THE TYPING TEXT STAGE */}
                <div
                  onClick={() => inputRef.current?.focus()}
                  ref={textContainerRef}
                  className="w-full h-56 bg-slate-900/50 hover:bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-inner overflow-hidden cursor-text flex flex-col justify-start relative select-none transition-colors"
                  id="typing-text-canvas"
                >
                  <div className="text-xl font-mono leading-relaxed tracking-wider break-words">
                    {engineChars.map((charItem, index) => {
                      const isCurrent = index === engineIndex;
                      const isCorrect = charItem.status === 'correct';
                      const isIncorrect = charItem.status === 'incorrect';
                      const isCorrected = charItem.status === 'corrected';
                      const isGhost =
                        sessionState === 'playing' &&
                        preferences.showGhostPacer !== false &&
                        index === ghostIndex &&
                        index !== engineIndex;

                      return (
                        <span
                          key={index}
                          ref={isCurrent ? activeCharRef : undefined}
                          className={`relative transition-colors duration-75 ${
                            isCorrect
                              ? 'text-slate-100 font-medium'
                              : isIncorrect
                              ? 'text-rose-400 underline decoration-rose-500 decoration-2 font-bold bg-rose-500/10 rounded'
                              : isCorrected
                              ? 'text-amber-300 font-medium'
                              : isCurrent
                              ? 'text-amber-400 font-bold'
                              : 'text-slate-600'
                          }`}
                        >
                          {/* Blinking Caret on Current Character */}
                          {isCurrent && (
                            <span className="absolute -left-0.5 top-0 bottom-0 w-0.5 bg-amber-400 animate-pulse rounded-full shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                          )}

                          {/* Real-Time Ghost Pacer Caret */}
                          {isGhost && (
                            <span
                              className="absolute -left-0.5 top-0 bottom-0 w-0.5 bg-indigo-400/90 rounded-full shadow-[0_0_8px_rgba(129,140,248,0.8)] pointer-events-none z-10"
                              title="Ghost PB Pacer"
                            >
                              <span className="absolute -top-3.5 -left-1.5 text-[9px] text-indigo-300 font-mono select-none drop-shadow">
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
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-slate-800/90 rounded-full text-xs text-slate-300 border border-slate-700/80 backdrop-blur-sm pointer-events-none">
                      Press any key to start typing
                    </div>
                  )}
                </div>

                {/* Quick Hint */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 font-mono">
                  <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">Tab</kbd> to restart instantly</span>
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
                  />
                ) : (
                  <div className="h-64 rounded-2xl border border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-500 text-xs p-6 text-center">
                    <p>Virtual keyboard visualizer is turned off.</p>
                    <button
                      onClick={() => setPreferences((p) => ({ ...p, showKeyboard: true }))}
                      className="mt-2 text-amber-400 hover:underline"
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
      <footer className="w-full border-t border-slate-800/60 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span>TypePulse AI • Touch Typing Mastery</span>
            <span>•</span>
            <span className="text-slate-400">
              AI: {aiSettings.provider === 'gemini' ? 'Google Gemini' : aiSettings.model || 'OpenAI Compatible'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span>Tab + Enter to restart</span>
            <span>•</span>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-amber-400 hover:underline"
            >
              Configure AI Endpoint
            </button>
          </div>
        </div>
      </footer>

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
          setupNewTest(gameMode);
        }}
        onTrainWeakKeys={handleTrainWeakKeys}
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
