'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  KeybrProgressionState,
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
  withBuiltInCoach,
  DEFAULT_AI_SETTINGS,
} from '@/lib/ai-service';
import { useServerCoach } from '@/hooks/use-server-coach';
import { useStateWithRef } from '@/hooks/use-state-with-ref';
import {
  loadUserProgress,
  saveUserProgress,
  processCompletedSession,
  INITIAL_USER_PROGRESS,
} from '@/lib/progress-service';
import { generateKeybrPracticeText, INITIAL_KEYBR_PROGRESSION } from '@/lib/adaptive-engine';
import { useSystemPrefersDark } from '@/hooks/use-system-prefers-dark';

// Components
import { WordViewport } from '@/components/WordViewport';
import { KeybrGuidanceCard } from '@/components/KeybrGuidanceCard';
import { ShortcutSheet } from '@/components/ShortcutSheet';
import { KeyboardVisualizer } from '@/components/KeyboardVisualizer';
import { SettingsModal } from '@/components/SettingsModal';
import { ResultsModal } from '@/components/ResultsModal';
import { AICoachChat } from '@/components/AICoachChat';
import { ArcadeDashboard } from '@/components/ArcadeDashboard';
import { LessonsView } from '@/components/LessonsView';
import { AnalyticsView } from '@/components/AnalyticsView';
import { AIMissionBoard } from '@/components/AIMissionBoard';
import { AIDrillModal } from '@/components/AIDrillModal';
import { CommandPaletteModal, CommandItem } from '@/components/CommandPaletteModal';
import { BiometricLatencyHUD } from '@/components/BiometricLatencyHUD';
import { GhostDuelModal } from '@/components/GhostDuelModal';
import { MasteryPassModal } from '@/components/MasteryPassModal';
import { CodeClimberModal } from '@/components/CodeClimberModal';
import { CertificationModal } from '@/components/CertificationModal';
import { AICustomDrillModal } from '@/components/AICustomDrillModal';
import { CertificationPassage } from '@/lib/certification-service';
import { parseGhostDuelPayload } from '@/lib/typing-engine';
import { GhostDuelPayload, CodeClimberSnippet, SwitchSoundProfile } from '@/types/typing';

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
  Maximize2,
  Minimize2,
  Moon,
  Quote,
  RotateCcw,
  Search,
  Settings,
  Shield,
  Sparkles,
  Sun,
  Target,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';

type PracticeCategory = 'words' | 'quotes' | 'code' | 'keybr';

interface DrillContentInput {
  mode: GameMode;
  category: PracticeCategory;
  customText?: string;
  lesson?: Lesson | null;
  mission?: AIMission | null;
  progression: KeybrProgressionState;
  wordCount: number;
  punctuation: boolean;
  numbers: boolean;
  codeLanguage: string;
}

/**
 * The single answer to "what should the arena show?".
 *
 * Lessons, missions, duels and certifications carry their own content; reaching
 * the practice category for them is how an AI mission silently renders a weak-key
 * drill instead of its own passage. When such a mode arrives without content the
 * honest fallback is a targeted drill, and it says so loudly.
 */
function resolveDrillContent(input: DrillContentInput): string {
  const supplied = input.customText || input.lesson?.content || input.mission?.content;
  if (supplied) return supplied;

  if (input.mode !== 'practice') {
    console.error(`No content supplied for mode "${input.mode}"; falling back to a weak-key drill.`);
    return generateWeakKeyDrill(input.mission?.focusKeys ?? [], 25);
  }

  if (input.category === 'quotes') return getRandomQuote();
  if (input.category === 'code') {
    return getRandomCodeSnippet(input.codeLanguage === 'all' ? undefined : input.codeLanguage);
  }
  if (input.category === 'keybr') {
    return generateKeybrPracticeText(input.progression, input.wordCount || 25);
  }
  return generateRandomWords(input.wordCount, input.punctuation, input.numbers);
}

export default function Home() {
  // Navigation View State
  const [currentView, setCurrentView] = useState<'typing' | 'lessons' | 'word-rush' | 'analytics' | 'ai-missions'>('typing');

  // Game Mode Configuration
  const [gameMode, setGameMode] = useState<GameMode>('practice');
  const [modeTitle, setModeTitle] = useState('Free Practice');
  // Test configuration is mirrored into refs on every write: setupNewTest reads it
  // in the same tick the UI sets it, where React state is still one render behind.
  const [wordCount, setWordCount, wordCountRef] = useStateWithRef<number>(25);
  const [timeLimit, setTimeLimit, timeLimitRef] = useStateWithRef<number | null>(null); // null means word count mode
  const [includePunctuation, setIncludePunctuation, includePunctuationRef] = useStateWithRef(false);
  const [includeNumbers, setIncludeNumbers, includeNumbersRef] = useStateWithRef(false);
  const [contentCategory, setContentCategory, contentCategoryRef] = useStateWithRef<PracticeCategory>('words');
  const [selectedCodeLanguage, setSelectedCodeLanguage, selectedCodeLanguageRef] = useStateWithRef<string>('all');
  const [unlockedKeyCelebration, setUnlockedKeyCelebration] = useState<string | null>(null);

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
  // Probes the built-in Gemini route so a server-side key counts as configured.
  const serverCoachAvailable = useServerCoach();
  useEffect(() => {
    if (!serverCoachAvailable) return;
    // Deferred one tick: the studio's own settings load runs on a timeout too, and
    // this adoption must not race it.
    const timer = setTimeout(() => setAiSettings(withBuiltInCoach), 0);
    return () => clearTimeout(timer);
  }, [serverCoachAvailable]);

  const [preferences, setPreferences] = useState<AppPreferences>({
    soundEnabled: true,
    soundVolume: 0.35,
    showKeyboard: true,
    showFingerGuidance: true,
    showGhostPacer: true,
    fontSize: 'medium',
    dyslexicFont: false,
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
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isGhostDuelOpen, setIsGhostDuelOpen] = useState(false);
  const [isMasteryPassOpen, setIsMasteryPassOpen] = useState(false);
  const [isCodeClimberOpen, setIsCodeClimberOpen] = useState(false);
  const [isCertificationModalOpen, setIsCertificationModalOpen] = useState(false);
  const [isAiCustomDrillOpen, setIsAiCustomDrillOpen] = useState(false);
  const [isShortcutSheetOpen, setIsShortcutSheetOpen] = useState(false); // Shift+/ opens the key reference
  const [activeGhostDuel, setActiveGhostDuel] = useState<GhostDuelPayload | null>(null);
  const [currentTargetText, setCurrentTargetText] = useState<string>('');

  // Auto-detect incoming Ghost Duel link from URL query params
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const duelParam = urlParams.get('duel');
      if (duelParam) {
        const payload = parseGhostDuelPayload(duelParam);
        if (payload) {
          setTimeout(() => {
            setActiveGhostDuel(payload);
            setIsGhostDuelOpen(true);
          }, 0);
        }
      }
    } catch {}
  }, []);

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
  /**
   * Pace for the Ghost PB pacer, or `null` when there is nothing honest to race.
   *
   * A brand-new profile has `highScores.bestWpm === 0`. The pacer used to
   * substitute a hardcoded `50` WPM for that case, so a first-time visitor was
   * shown a ghost running at a speed they had never achieved — and the UI printed
   * "Ghost PB: 50 WPM" as though it were their personal best. There is no
   * personal best until a session has been completed, so the pacer now stays
   * inactive instead of inventing one. An explicitly configured pace still wins.
   */
  const ghostTargetWpm = useMemo<number | null>(() => {
    const explicitPace = preferences.targetPacerWpm;
    if (typeof explicitPace === 'number' && explicitPace > 0) return explicitPace;
    return userProgress.highScores.bestWpm > 0 ? userProgress.highScores.bestWpm : null;
  }, [preferences.targetPacerWpm, userProgress.highScores.bestWpm]);

  const [ghostIndexRaw, setGhostIndex] = useState<number>(0);
  /**
   * `-1` means "no ghost". No rendered character index can equal it, so neither
   * the pacer marker nor the delta badge can appear without a real target —
   * without needing to reset state from inside an effect.
   */
  const ghostIndex = ghostTargetWpm === null ? -1 : ghostIndexRaw;
  const [liveStats, setLiveStats] = useState<TypingStats>(() => new TypingEngine('').getStats());
  const [sessionState, setSessionState] = useState<SessionState>('ready');
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [activeKeyPressed, setActiveKeyPressed] = useState<string>('');
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');

  // Hydration-safe OS dark-mode preference, read through useSyncExternalStore so
  // the server snapshot and the first client render always agree.
  const systemPrefersDark = useSystemPrefersDark();

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

  // Synchronize dyslexia-friendly font class with document.documentElement
  useEffect(() => {
    document.documentElement.classList.toggle('dyslexic-font', !!preferences.dyslexicFont);
  }, [preferences.dyslexicFont]);

  // Derived from React state only (never `window`) to guarantee identical
  // server prerender and initial client rehydration.
  const isDarkMode =
    preferences.theme === 'light' ? false : preferences.theme === 'system' ? systemPrefersDark : true;

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

  // Synchronization refs for state that is only read from effects and callbacks
  // that run after the write has committed. Test configuration is not here — it is
  // mirrored eagerly by useStateWithRef, because it is read in the same tick.
  const userProgressRef = useRef(userProgress);
  const activeLessonRef = useRef<Lesson | null>(activeLesson);
  const activeMissionRef = useRef<AIMission | null>(activeMission);
  const gameModeRef = useRef<GameMode>(gameMode);
  const currentTargetTextRef = useRef<string>('');
  const preferencesRef = useRef(preferences);
  // Practice content stays sticky, so returning from a game or mission restores
  // the category the typist last chose for free practice.
  const lastPracticeCategoryRef = useRef<PracticeCategory>(contentCategory);

  useEffect(() => {
    userProgressRef.current = userProgress;
    activeLessonRef.current = activeLesson;
    activeMissionRef.current = activeMission;
    gameModeRef.current = gameMode;
    preferencesRef.current = preferences;
  }, [userProgress, activeLesson, activeMission, gameMode, preferences]);

  // Generate or configure text based on selected mode
  const setupNewTest = useCallback(
    (
      mode: GameMode,
      customText?: string,
      customTimeLimit?: number | null,
      lessonObj?: Lesson,
      missionObj?: AIMission,
      overrideCategory?: 'words' | 'quotes' | 'code' | 'keybr'
    ) => {
      gameModeRef.current = mode;
      setGameMode(mode);

      if (mode === 'lesson') {
        const resolvedLesson = lessonObj || activeLessonRef.current;
        activeLessonRef.current = resolvedLesson;
        setActiveLesson(resolvedLesson);
        activeMissionRef.current = null;
        setActiveMission(null);
        if (resolvedLesson) {
          setModeTitle(resolvedLesson.title);
        }
      } else if (mode === 'ai-mission') {
        const resolvedMission = missionObj || activeMissionRef.current;
        activeMissionRef.current = resolvedMission;
        setActiveMission(resolvedMission);
        activeLessonRef.current = null;
        setActiveLesson(null);
        if (resolvedMission) {
          setModeTitle(resolvedMission.title);
        }
      } else if (mode === 'practice') {
        activeLessonRef.current = null;
        setActiveLesson(null);
        activeMissionRef.current = null;
        setActiveMission(null);
        setModeTitle('Free Practice');
      }

      if (mode === 'practice' && overrideCategory) {
        lastPracticeCategoryRef.current = overrideCategory;
      }

      const targetText = resolveDrillContent({
        mode,
        category: overrideCategory ?? contentCategoryRef.current,
        customText,
        lesson: lessonObj ?? activeLessonRef.current,
        mission: missionObj ?? activeMissionRef.current,
        progression: userProgressRef.current.keybrProgression ?? INITIAL_KEYBR_PROGRESSION,
        wordCount: wordCountRef.current,
        punctuation: includePunctuationRef.current,
        numbers: includeNumbersRef.current,
        codeLanguage: selectedCodeLanguageRef.current,
      });

      currentTargetTextRef.current = targetText;
      setCurrentTargetText(targetText);
      engineRef.current.ddaEnabled = preferencesRef.current.ddaEnabled !== false;
      engineRef.current.errorMode = preferencesRef.current.errorMode ?? 'standard';
      engineRef.current.quickWordSkip = preferencesRef.current.quickWordSkip ?? false;
      engineRef.current.codeAutoIndent = preferencesRef.current.codeAutoIndent !== false;
      engineRef.current.reset(targetText);
      setEngineChars(engineRef.current.getCharsSnapshot());
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
    // Refs and useStateWithRef setters are stable, so this callback stays stable too.
    [
      contentCategoryRef,
      wordCountRef,
      includePunctuationRef,
      includeNumbersRef,
      selectedCodeLanguageRef,
      timeLimitRef,
      setTimeLimit,
    ]
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
    setContentCategory(lastPracticeCategoryRef.current);
    setupNewTest('practice', undefined, null, undefined, undefined, lastPracticeCategoryRef.current);
  }, [setupNewTest, setContentCategory]);

  // Reset the active session with the exact same content (e.g. same lesson letters for re-practice)
  const handleResetCurrent = useCallback(() => {
    const currentLesson = activeLessonRef.current;
    const currentMission = activeMissionRef.current;
    if (gameModeRef.current === 'lesson' && currentLesson) {
      setupNewTest('lesson', currentTargetTextRef.current || currentLesson.content, null, currentLesson);
    } else if (gameModeRef.current === 'ai-mission' && currentMission) {
      setupNewTest('ai-mission', currentTargetTextRef.current || currentMission.content, currentMission.durationSeconds || null, undefined, currentMission);
    } else {
      setupNewTest('practice', currentTargetTextRef.current || undefined);
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

    const { updatedProgress, sessionSummary, newAchievements, leveledUp, newlyUnlockedKey } = processCompletedSession(
      userProgress,
      stats,
      gameMode,
      modeTitle,
      activeLesson?.id
    );

    if (newlyUnlockedKey) {
      setUnlockedKeyCelebration(newlyUnlockedKey);
      soundFx.playLevelUp();
    }

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
    soundFx.setConfig(
      preferences.soundEnabled,
      preferences.soundVolume,
      preferences.switchSoundProfile
    );
  }, [preferences.soundEnabled, preferences.soundVolume, preferences.switchSoundProfile]);

  // Countdown timer effect for timed modes.
  // The interval owns ONLY the decrement via a pure updater. Session finalization
  // lives in a separate effect triggered when the counter reaches zero, so
  // StrictMode's double-invoked updaters can never schedule two completions.
  const isTimedMode = timeRemaining !== null;
  useEffect(() => {
    if (sessionState !== 'playing' || !isTimedMode) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => (prev === null ? null : Math.max(0, prev - 1)));
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionState, isTimedMode]);

  // Finalize exactly once when the countdown reaches zero
  useEffect(() => {
    if (sessionState !== 'playing' || timeRemaining !== 0) return;
    const timeout = setTimeout(() => finalizeSession(), 0);
    return () => clearTimeout(timeout);
  }, [sessionState, timeRemaining, finalizeSession]);

  // Real-Time Ghost PB Pacer Effect (strictly practice mode only)
  useEffect(() => {
    if (
      sessionState !== 'playing' ||
      preferences.showGhostPacer === false ||
      gameMode !== 'practice' ||
      // No recorded personal best (and no explicit pace) means there is nothing
      // to race, so no timer is started at all.
      ghostTargetWpm === null
    ) {
      return;
    }

    const interval = setInterval(() => {
      const elapsed = engineRef.current.getElapsedSeconds();
      const total = engineRef.current.chars.length;
      const idx = calculateGhostPacerIndex(elapsed, ghostTargetWpm, total);
      setGhostIndex(idx);
    }, 120);

    return () => clearInterval(interval);
  }, [sessionState, preferences.showGhostPacer, ghostTargetWpm, gameMode]);

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

  // Global Keyboard Shortcuts (Cmd+K / Ctrl+K Command Palette, Shift+Z Zen Mode, Escape)
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      // An open dialog owns Escape and Tab; chrome toggles must never fire behind
      // an aria-modal surface.
      if (document.querySelector('[role="dialog"]') !== null) return;

      // Cmd+K or Ctrl+K opens Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }
      // Shift+/ opens the shortcut sheet (never while typing into the arena)
      if (e.key === '?' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        setIsShortcutSheetOpen(true);
        return;
      }
      // Shift+Z toggles Zen Mode (when not typing inside an active typing test)
      if (
        e.shiftKey &&
        e.key.toLowerCase() === 'z' &&
        document.activeElement !== inputRef.current
      ) {
        e.preventDefault();
        setIsZenMode((prev) => !prev);
        return;
      }
      // Escape in Zen mode exits Zen mode if no dialogs are open
      if (
        e.key === 'Escape' &&
        isZenMode &&
        !isSettingsOpen &&
        !isCoachChatOpen &&
        !isResultsOpen &&
        !isCommandPaletteOpen
      ) {
        e.preventDefault();
        setIsZenMode(false);
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [isZenMode, isSettingsOpen, isCoachChatOpen, isResultsOpen, isCommandPaletteOpen]);

  // Zero-GC rAF batching for high-frequency typing loop
  const statsRafIdRef = useRef<number | null>(null);
  // Single tracked timeout for the keyboard-visualizer key highlight
  const activeKeyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleStatsUpdate = useCallback(() => {
    if (statsRafIdRef.current !== null) return;
    statsRafIdRef.current = requestAnimationFrame(() => {
      statsRafIdRef.current = null;
      setLiveStats(engineRef.current.getStats());
    });
  }, []);

  useEffect(() => {
    return () => {
      if (statsRafIdRef.current !== null) {
        cancelAnimationFrame(statsRafIdRef.current);
      }
      if (activeKeyTimeoutRef.current !== null) {
        clearTimeout(activeKeyTimeoutRef.current);
        activeKeyTimeoutRef.current = null;
      }
    };
  }, []);

  // Reset Keybr progression back to the initial probationary set
  const handleResetKeybr = () => {
    const resetProgression = { ...INITIAL_KEYBR_PROGRESSION };
    const updated: UserProgress = {
      ...userProgress,
      keybrProgression: resetProgression,
    };
    setUserProgress(updated);
    saveUserProgress(updated);
    setupNewTest('practice', undefined, null, undefined, undefined, 'keybr');
  };

  // Handle Keystrokes
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Command Palette Trigger (Cmd+K or Ctrl+K)
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      setIsCommandPaletteOpen(true);
      return;
    }

    // Tab to reset current session (in lessons: re-practices same letters)
    if (e.key === 'Tab') {
      e.preventDefault();
      if (gameModeRef.current === 'code-climber') {
        // A climber restarts the same snippet; switching to practice would
        // throw away the deliberately chosen text for a random one.
        const snippetText = currentTargetTextRef.current;
        if (snippetText) {
          setupNewTest('code-climber', snippetText, null);
        }
      } else {
        handleResetCurrent();
      }
      return;
    }

    if (currentView !== 'typing' || isResultsOpen || isSettingsOpen || isCoachChatOpen || isCommandPaletteOpen) return;

    // Ignore composition / IME dead keys
    if (e.nativeEvent.isComposing || e.key === 'Process') {
      return;
    }

    const key = e.key;

    // Prevent auto-repeat double-typing on printable characters
    if (e.repeat && key !== 'Backspace') {
      e.preventDefault();
      return;
    }

    // Enter must submit a newline in code targets; prose targets never contain
    // newlines, so this is a no-op outside code modes.
    if (e.key === 'Enter') {
      e.preventDefault();
    }

    // Prevent default browser behavior on handled typing keys to prevent duplicate input,
    // browser back navigation on backspace, page scroll on space, and input field mutation.
    if (
      key === ' ' ||
      key === 'Backspace' ||
      (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey)
    ) {
      e.preventDefault();
    }

    // Set active key for keyboard visualizer. A single tracked timeout replaces
    // one orphaned setTimeout per keystroke, so rapid bursts cannot queue stale
    // state updates or fire after unmount/navigation.
    if (activeKeyTimeoutRef.current !== null) {
      clearTimeout(activeKeyTimeoutRef.current);
    }
    setActiveKeyPressed((prev) => (prev === key ? prev : key));
    activeKeyTimeoutRef.current = setTimeout(() => {
      activeKeyTimeoutRef.current = null;
      setActiveKeyPressed('');
    }, 120);

    // Audio cue
    if (key === 'Backspace') {
      soundFx.playKeyClick();
    }

    // Handle typing input inside engine with strict index tracking and options
    const expectedChar = engineRef.current.chars[engineRef.current.currentIndex]?.char;
    const res = engineRef.current.handleInput(key, {
      ctrlKey: e.ctrlKey || e.metaKey,
      repeat: e.repeat,
    });

    if (res.ignored) {
      return;
    }

    setEngineChars(engineRef.current.getCharsSnapshot());
    setEngineIndex(engineRef.current.currentIndex);
    scheduleStatsUpdate();

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
        if (statsRafIdRef.current !== null) {
          cancelAnimationFrame(statsRafIdRef.current);
          statsRafIdRef.current = null;
        }
        setLiveStats(engineRef.current.getStats());
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

  // Launch Standardized Timed Certification Exam
  const handleStartCertification = (passage: CertificationPassage, durationSeconds: number) => {
    activeLessonRef.current = null;
    activeMissionRef.current = null;
    gameModeRef.current = 'certification-test';
    setActiveLesson(null);
    setActiveMission(null);
    setGameMode('certification-test');
    setModeTitle(`Certification Exam (${durationSeconds}s)`);
    setCurrentView('typing');
    setTimeLimit(durationSeconds);
    setTimeRemaining(durationSeconds);
    setupNewTest('certification-test', passage.content, durationSeconds);
  };

  // Launch Custom AI-Synthesized Practice Material
  const handleLaunchAiCustomDrill = (text: string, title: string) => {
    activeLessonRef.current = null;
    activeMissionRef.current = null;
    gameModeRef.current = 'practice';
    setActiveLesson(null);
    setActiveMission(null);
    setGameMode('practice');
    setModeTitle(title);
    setIsResultsOpen(false);
    setCurrentView('typing');
    setupNewTest('practice', text, null);
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

  // Launch Asynchronous Ghost Duel
  const handleStartGhostDuel = (duel: GhostDuelPayload) => {
    setIsGhostDuelOpen(false);
    activeLessonRef.current = null;
    activeMissionRef.current = null;
    gameModeRef.current = 'practice';
    setActiveLesson(null);
    setActiveMission(null);
    setGameMode('practice');
    setModeTitle(`Ghost Duel vs ${duel.author} (${duel.wpm} WPM)`);
    setCurrentView('typing');

    setCurrentTargetText(duel.targetText);
    engineRef.current.reset(duel.targetText);
    engineRef.current.setGhostDuel(duel);
    setEngineChars([...engineRef.current.chars]);
    setEngineIndex(0);
    setGhostIndex(0);
    setLiveStats(engineRef.current.getStats());
    setSessionState('ready');
    setTimeRemaining(null);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  // Launch AST Code Climber
  //
  // A Code Climber session used to reuse the 'practice' mode wholesale, which
  // rendered the Free Practice chrome (category switcher, ghost PB pacer) over a
  // snippet the typist had deliberately chosen. It is its own GameMode now; the
  // pacer is meaningless when the target text is a fixed snippet, so it stays off
  // here regardless of the user's preference.
  const handleStartCodeClimber = (snippet: CodeClimberSnippet) => {
    setIsCodeClimberOpen(false);
    gameModeRef.current = 'code-climber';
    setGameMode('code-climber');
    setModeTitle(`Code Climber (${snippet.language}): ${snippet.title}`);
    setCurrentView('typing');

    const targetText = snippet.code;
    currentTargetTextRef.current = targetText;
    setCurrentTargetText(targetText);
    engineRef.current.ddaEnabled = preferencesRef.current.ddaEnabled !== false;
    engineRef.current.errorMode = preferencesRef.current.errorMode ?? 'standard';
    engineRef.current.quickWordSkip = false;
    engineRef.current.codeAutoIndent = preferencesRef.current.codeAutoIndent !== false;
    engineRef.current.reset(targetText);
    setEngineChars(engineRef.current.getCharsSnapshot());
    setEngineIndex(0);
    setGhostIndex(0);
    setLiveStats(engineRef.current.getStats());
    setSessionState('ready');
    setTimeLimit(null);
    setTimeRemaining(null);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  // Claim Mastery Reward
  const handleClaimMasteryReward = (tierId: number, reward: { type: string; value: string; title: string }) => {
    if (reward.type === 'soundpack') {
      const nextProfile = reward.value as SwitchSoundProfile;
      setPreferences((prev) => {
        const updated = { ...prev, switchSoundProfile: nextProfile };
        try {
          localStorage.setItem('typepulse_preferences', JSON.stringify(updated));
        } catch {}
        return updated;
      });
      soundFx.setProfile(nextProfile);
      soundFx.playKeyClick(nextProfile);
    }
  };

  const currentLessonIndex = activeLesson
    ? LESSONS_CURRICULUM.findIndex((l) => l.id === activeLesson.id)
    : -1;
  const nextLesson =
    currentLessonIndex >= 0 && currentLessonIndex < LESSONS_CURRICULUM.length - 1
      ? LESSONS_CURRICULUM[currentLessonIndex + 1]
      : null;

  const currentChar = engineChars[engineIndex]?.char || '';

  // Commands list for CommandPaletteModal
  const commandList: CommandItem[] = [
    {
      id: 'mode-words-15',
      title: 'Words: 15 Words',
      subtitle: 'Quick high-speed sprint',
      category: 'Word Count',
      icon: <Zap className="w-4 h-4" />,
      action: () => {
        setContentCategory('words');
        setTimeLimit(null);
        setTimeRemaining(null);
        setWordCount(15);
        setupNewTest('practice', undefined, null);
      },
    },
    {
      id: 'mode-words-25',
      title: 'Words: 25 Words',
      subtitle: 'Standard benchmark test',
      category: 'Word Count',
      icon: <Zap className="w-4 h-4" />,
      action: () => {
        setContentCategory('words');
        setTimeLimit(null);
        setTimeRemaining(null);
        setWordCount(25);
        setupNewTest('practice', undefined, null);
      },
    },
    {
      id: 'mode-words-50',
      title: 'Words: 50 Words',
      subtitle: 'Endurance and consistency run',
      category: 'Word Count',
      icon: <Zap className="w-4 h-4" />,
      action: () => {
        setContentCategory('words');
        setTimeLimit(null);
        setTimeRemaining(null);
        setWordCount(50);
        setupNewTest('practice', undefined, null);
      },
    },
    {
      id: 'mode-words-100',
      title: 'Words: 100 Words',
      subtitle: 'Full marathon discipline',
      category: 'Word Count',
      icon: <Zap className="w-4 h-4" />,
      action: () => {
        setContentCategory('words');
        setTimeLimit(null);
        setTimeRemaining(null);
        setWordCount(100);
        setupNewTest('practice', undefined, null);
      },
    },
    {
      id: 'mode-time-15',
      title: 'Time: 15 Seconds',
      subtitle: 'High intensity blitz test',
      category: 'Time Limit',
      icon: <Clock className="w-4 h-4" />,
      action: () => {
        setContentCategory('words');
        setTimeLimit(15);
        setTimeRemaining(15);
        setupNewTest('practice', undefined, 15);
      },
    },
    {
      id: 'mode-time-30',
      title: 'Time: 30 Seconds',
      subtitle: 'Standard timed benchmark',
      category: 'Time Limit',
      icon: <Clock className="w-4 h-4" />,
      action: () => {
        setContentCategory('words');
        setTimeLimit(30);
        setTimeRemaining(30);
        setupNewTest('practice', undefined, 30);
      },
    },
    {
      id: 'mode-time-60',
      title: 'Time: 60 Seconds',
      subtitle: 'Official 1-minute certification trial',
      category: 'Time Limit',
      icon: <Clock className="w-4 h-4" />,
      action: () => {
        setContentCategory('words');
        setTimeLimit(60);
        setTimeRemaining(60);
        setupNewTest('practice', undefined, 60);
      },
    },
    {
      id: 'category-quotes',
      title: 'Quotes: Famous Wisdom',
      subtitle: 'Punctuation-rich prose and philosophy',
      category: 'Mode',
      icon: <Quote className="w-4 h-4" />,
      action: () => {
        setContentCategory('quotes');
        setTimeLimit(null);
        setTimeRemaining(null);
        setupNewTest('practice', undefined, null, undefined, undefined, 'quotes');
      },
    },
    {
      id: 'category-code',
      title: 'Code: Real Syntax Snippets',
      subtitle: 'TypeScript, React, SQL & Bash symbols',
      category: 'Mode',
      icon: <Code className="w-4 h-4" />,
      action: () => {
        setContentCategory('code');
        setTimeLimit(null);
        setTimeRemaining(null);
        setupNewTest('practice', undefined, null, undefined, undefined, 'code');
      },
    },
    {
      id: 'open-shortcut-sheet',
      title: 'Keyboard Shortcuts & Hotkeys',
      subtitle: 'Every global shortcut, filterable by scope',
      category: 'Settings & Audio',
      icon: <Keyboard className="w-4 h-4" />,
      shortcut: 'Shift+/',
      action: () => setIsShortcutSheetOpen(true),
    },
    {
      id: 'toggle-zen-mode',
      title: isZenMode ? 'Exit Zen Mode' : 'Enter Zen Mode',
      subtitle: isZenMode ? 'Restore header and HUD controls' : 'Distraction-free minimalist typing stage',
      category: 'Mode',
      icon: isZenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />,
      shortcut: 'Shift+Z',
      action: () => setIsZenMode((prev) => !prev),
    },
    {
      id: 'view-academy',
      title: 'Go to Academy Curriculum',
      subtitle: 'Tier 1 to 4 structured touch typing lessons',
      category: 'Views',
      icon: <BookOpen className="w-4 h-4" />,
      action: () => setCurrentView('lessons'),
    },
    {
      id: 'view-ai-missions',
      title: 'Go to AI Missions Board',
      subtitle: 'Adaptive daily quests and challenges',
      category: 'Views',
      icon: <Bot className="w-4 h-4" />,
      action: () => setCurrentView('ai-missions'),
    },
    {
      id: 'view-arcade',
      title: 'Go to Arcade Arena',
      subtitle: 'Nitro Racer, Orbital Defense, Bomb Defusal & more',
      category: 'Views',
      icon: <Gamepad2 className="w-4 h-4" />,
      action: () => setCurrentView('word-rush'),
    },
    {
      id: 'view-analytics',
      title: 'Go to Analytics & Heatmap',
      subtitle: 'Speed trends, accuracy charts, and finger confidence',
      category: 'Views',
      icon: <Activity className="w-4 h-4" />,
      action: () => setCurrentView('analytics'),
    },
    {
      id: 'action-drill-weak',
      title: 'AI Drill: Target Weak Keys',
      subtitle: 'Target your slowest or most error-prone letters',
      category: 'AI & Drills',
      icon: <Sparkles className="w-4 h-4" />,
      action: () => {
        const errorKeys = Object.entries(userProgress.keyStats || {})
          .filter(([_, s]) => s.errors > 0 && s.typed > 2)
          .sort((a, b) => b[1].errors / b[1].typed - a[1].errors / a[1].typed)
          .map(([k]) => k)
          .slice(0, 4);

        if (errorKeys.length > 0) {
          handleTrainWeakKeys(errorKeys);
        } else {
          setupNewTest('practice');
        }
      },
    },
    {
      id: 'action-coach-chat',
      title: 'Open Sensei AI Coach',
      subtitle: 'Ask for ergonomics and rhythm guidance',
      category: 'AI & Drills',
      icon: <Bot className="w-4 h-4" />,
      action: () => setIsCoachChatOpen(true),
    },
    {
      id: 'toggle-theme',
      title: isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme',
      subtitle: 'Daylight or Twilight palette',
      category: 'Settings & Audio',
      icon: isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />,
      action: toggleTheme,
    },
    {
      id: 'toggle-audio',
      title: preferences.soundEnabled ? 'Mute Mechanical Audio' : 'Enable Mechanical Audio',
      subtitle: 'Auditory feedback clicks and combos',
      category: 'Settings & Audio',
      icon: preferences.soundEnabled ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />,
      action: () => {
        const nextSound = !preferences.soundEnabled;
        setPreferences((p) => ({ ...p, soundEnabled: nextSound }));
        soundFx.setConfig(nextSound, preferences.soundVolume);
      },
    },
    {
      id: 'toggle-ghost',
      title: preferences.showGhostPacer !== false ? 'Disable Ghost PB Pacer' : 'Enable Ghost PB Pacer',
      subtitle: 'Real-time race against your personal best',
      category: 'Settings & Audio',
      icon: <Ghost className="w-4 h-4" />,
      action: () => {
        const nextState = preferences.showGhostPacer === false ? true : false;
        const updated: AppPreferences = { ...preferences, showGhostPacer: nextState };
        setPreferences(updated);
        try {
          localStorage.setItem('typepulse_preferences', JSON.stringify(updated));
        } catch {}
      },
    },
    {
      id: 'toggle-keyboard',
      title: preferences.showKeyboard ? 'Hide Virtual Keyboard' : 'Show Virtual Keyboard',
      subtitle: 'Visual finger placement and reach guide',
      category: 'Settings & Audio',
      icon: <Keyboard className="w-4 h-4" />,
      action: () => {
        const updated: AppPreferences = { ...preferences, showKeyboard: !preferences.showKeyboard };
        setPreferences(updated);
        try {
          localStorage.setItem('typepulse_preferences', JSON.stringify(updated));
        } catch {}
      },
    },
    {
      id: 'open-ghost-duels',
      title: 'Asynchronous Ghost Duels',
      subtitle: 'Race against community or friend replay ghosts',
      category: 'Arenas & Pass',
      icon: <Ghost className="w-4 h-4 text-purple-400" />,
      action: () => setIsGhostDuelOpen(true),
    },
    {
      id: 'open-code-climber',
      title: 'AST-Aware Code Climber',
      subtitle: 'Climb syntax cliffs across TypeScript, Python, Rust, Go',
      category: 'Arenas & Pass',
      icon: <Code className="w-4 h-4 text-blue-400" />,
      action: () => setIsCodeClimberOpen(true),
    },
    {
      id: 'open-mastery-pass',
      title: 'Mastery Tier Pass',
      subtitle: 'Claim acoustic soundpacks & prestigious titles',
      category: 'Arenas & Pass',
      icon: <Trophy className="w-4 h-4 text-amber-400" />,
      action: () => setIsMasteryPassOpen(true),
    },
  ];

  return (
    <div className="h-dvh w-full max-w-full bg-background text-foreground flex flex-col font-sans selection:bg-accent selection:text-accent-foreground overflow-hidden">
      {/* Screen-reader-only status channel for completed words, errors, and session results */}
      <div aria-live="polite" role="status" className="sr-only">
        {liveAnnouncement}
      </div>

      <ShortcutSheet
        isOpen={isShortcutSheetOpen}
        onClose={() => setIsShortcutSheetOpen(false)}
      />

      {/* TOP GLOBAL NAVBAR - SLEEK RESPONSIVE HEADER WITH ZERO OVERFLOW */}
      {isZenMode ? (
        <header className="w-full max-w-7xl mx-auto px-4 py-3 flex items-center justify-between shrink-0 bg-transparent z-40">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-xs font-mono text-text-subtle">Zen Focus Mode</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="px-2.5 py-1 rounded-xl bg-surface/70 hover:bg-surface border border-border text-xs text-text-muted hover:text-text-primary transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Command Palette (Cmd+K)"
            >
              <Search className="w-3.5 h-3.5 text-accent" />
              <span className="font-mono text-[10px]">⌘K</span>
            </button>
            <button
              onClick={() => setIsZenMode(false)}
              className="px-3 py-1 rounded-xl bg-surface/80 hover:bg-surface border border-border text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Exit Zen Mode (Esc)"
            >
              <Minimize2 className="w-3.5 h-3.5 text-accent" />
              <span>Exit Zen (Esc)</span>
            </button>
          </div>
        </header>
      ) : (
        <header className="w-full max-w-full border-b border-border bg-surface/95 backdrop-blur-md sticky top-0 z-40 px-3 sm:px-4 py-2 shrink-0 shadow-sm">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-1.5 sm:gap-3 min-w-0">
          {/* Brand & Logo */}
          <button
            onClick={switchToPractice}
            className="flex items-center gap-1.5 sm:gap-2 hover:opacity-90 transition-opacity shrink-0 cursor-pointer"
            id="nav-logo"
          >
            <div className="p-1.5 rounded-xl bg-accent text-accent-foreground font-bold shadow-glow-accent-sm shrink-0">
              <Keyboard className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-text-primary">Runewright</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-subtle border border-accent-border text-accent font-mono font-bold hidden sm:inline">
              STUDIO
            </span>
          </button>

          {/* Center Nav Views - Adaptive Responsive Sizing */}
          <nav className="flex items-center gap-0.5 sm:gap-1 bg-surface-muted p-1 rounded-xl border border-border shrink-0">
            <button
              onClick={() => {
                if (currentView !== 'typing' || gameMode !== 'practice') {
                  switchToPractice();
                }
              }}
              title="Practice Mode"
              aria-current={currentView === 'typing' && gameMode === 'practice' ? 'page' : undefined}
              aria-label="Practice"
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
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
              aria-current={currentView === 'lessons' ? 'page' : undefined}
              aria-label="Academy"
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
                currentView === 'lessons'
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xl:inline">Academy</span>
            </button>

            <button
              onClick={() => setCurrentView('ai-missions')}
              title="AI Missions"
              aria-current={currentView === 'ai-missions' ? 'page' : undefined}
              aria-label="Missions"
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
                currentView === 'ai-missions'
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
              }`}
            >
              <Bot className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xl:inline">Missions</span>
            </button>

            <button
              onClick={() => setCurrentView('word-rush')}
              title="Arcade Arena"
              aria-current={currentView === 'word-rush' ? 'page' : undefined}
              aria-label="Arcade"
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
                currentView === 'word-rush'
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
              }`}
              id="nav-arcade-btn"
            >
              <Gamepad2 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden lg:inline">Arcade</span>
            </button>

            <button
              onClick={() => setCurrentView('analytics')}
              title="Profile & Stats"
              aria-current={currentView === 'analytics' ? 'page' : undefined}
              aria-label="Stats"
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
                currentView === 'analytics'
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
              }`}
            >
              <Activity className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xl:inline">Stats</span>
            </button>
          </nav>

          {/* Right Action Icons: Rank, Streak, Coach & Settings */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Command Palette Launcher */}
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="p-1.5 sm:px-2 sm:py-1 rounded-xl bg-surface-muted border border-border text-text-muted hover:text-text-primary hover:bg-surface-hover flex items-center gap-1.5 text-xs transition-colors shrink-0 cursor-pointer"
              title="Open Command Palette (Cmd+K)"
              aria-label="Open command palette"
              id="open-command-palette-btn"
            >
              <Search className="w-3.5 h-3.5 text-accent shrink-0" />
              <kbd className="hidden lg:inline-block px-1 py-0.2 rounded bg-surface border border-border text-[10px] font-mono text-text-subtle">
                ⌘K
              </kbd>
            </button>

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
              className="px-2 py-1 rounded-xl bg-surface-muted border border-border hover:border-border-subtle items-center gap-1 text-xs text-text-secondary font-medium transition-colors shrink-0 hidden lg:flex cursor-pointer"
              title={`Level ${userProgress.level} (${userProgress.title})`}
            >
              <Award className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Lvl {userProgress.level}</span>
            </button>

            {/* AI Coach Quick Chat Button */}
            <button
              onClick={() => setIsCoachChatOpen(true)}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-primary-subtle border border-primary-border text-primary hover:bg-primary-subtle/80 flex items-center gap-1.5 text-xs font-semibold transition-colors shrink-0 cursor-pointer"
              title="Open AI Typing Coach (Sensei)"
              aria-label="AI typing coach"
              id="open-coach-chat-btn"
            >
              <Bot className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="hidden xl:inline">Sensei</span>
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
              aria-label="Typing sounds"
              aria-pressed={preferences.soundEnabled}
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
      )}

      {/* SCROLLABLE APP BODY - single scroll container beneath the sticky header */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
        data-modal-scroll-lock
      >
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
            onOpenGhostDuel={() => setIsGhostDuelOpen(true)}
            onOpenMasteryPass={() => setIsMasteryPassOpen(true)}
            onOpenCodeClimber={() => setIsCodeClimberOpen(true)}
          />
        )}

        {currentView === 'analytics' && (
          <AnalyticsView
            userProgress={userProgress}
            aiSettings={aiSettings}
            onTrainWeakKeys={handleTrainWeakKeys}
            onLaunchCustomDrill={handleLaunchCustomDrill}
            onBackToPractice={switchToPractice}
            targetWpm={preferences.targetPacerWpm}
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
                  <button
                    onClick={() => {
                      setContentCategory('keybr');
                      setTimeLimit(null);
                      setTimeRemaining(null);
                      setupNewTest('practice', undefined, null, undefined, undefined, 'keybr');
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all ${
                      contentCategory === 'keybr'
                        ? 'bg-accent text-accent-foreground font-bold shadow-sm'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                    title="Keybr Adaptive Sequential Progression"
                  >
                    <Target className="w-3 h-3" />
                    <span>Keybr</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAiCustomDrillOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium text-primary hover:bg-primary-subtle transition-all cursor-pointer border border-primary-border/60"
                    title="Generate custom AI practice material (paragraph or code)"
                  >
                    <Sparkles className="w-3 h-3 text-primary" />
                    <span>AI Material</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCertificationModalOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold text-accent hover:bg-accent-subtle transition-all cursor-pointer border border-accent-border/60"
                    title="Take an official timed International Certification exam"
                  >
                    <Award className="w-3 h-3 text-accent" />
                    <span>Certification</span>
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
                  ) : contentCategory === 'code' ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1 bg-surface-muted p-0.5 rounded-lg border border-border">
                        {['all', 'typescript', 'react', 'python', 'sql', 'rust', 'bash'].map((lang) => (
                          <button
                            key={lang}
                            onClick={() => {
                              setSelectedCodeLanguage(lang);
                              setupNewTest('practice', undefined, null, undefined, undefined, 'code');
                            }}
                            className={`px-2 py-0.5 rounded text-xs capitalize transition-colors ${
                              selectedCodeLanguage === lang
                                ? 'bg-surface text-accent font-bold shadow-sm'
                                : 'hover:text-text-primary text-text-muted'
                            }`}
                          >
                            {lang}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setupNewTest('practice')}
                        className="flex items-center gap-1 px-2.5 py-1 bg-surface-muted hover:bg-surface-hover text-accent rounded-lg font-medium border border-border transition-colors text-xs"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Next Snippet</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {userProgress.keybrProgression?.currentFocusKey && (
                        <span className="px-2 py-0.5 rounded-lg bg-warning/15 text-warning border border-warning/40 font-medium flex items-center gap-1">
                          Focus: <strong className="uppercase font-mono">{userProgress.keybrProgression.currentFocusKey}</strong>
                        </span>
                      )}
                      <div className="flex items-center gap-1 bg-surface-muted p-0.5 rounded-lg border border-border">
                        {[15, 25, 50].map((count) => (
                          <button
                            key={count}
                            onClick={() => {
                              setWordCount(count);
                              wordCountRef.current = count;
                              setupNewTest('practice', undefined, null, undefined, undefined, 'keybr');
                            }}
                            className={`px-2 py-0.5 rounded font-mono transition-colors cursor-pointer ${
                              wordCount === count ? 'bg-surface text-accent font-bold shadow-sm' : 'text-text-muted hover:text-text-primary'
                            }`}
                          >
                            {count}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setupNewTest('practice')}
                        className="flex items-center gap-1 px-2.5 py-1 bg-surface-muted hover:bg-surface-hover text-accent rounded-lg font-medium border border-border transition-colors cursor-pointer text-xs"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>New Drill</span>
                      </button>
                    </div>
                  )}

                  {/* Viewport Mode Quick Toggle */}
                  <div className="border-l border-border pl-2">
                    <button
                      onClick={() => {
                        const nextMode = preferences.viewportMode === 'scrolling' ? '3-line' : 'scrolling';
                        const updated: AppPreferences = { ...preferences, viewportMode: nextMode };
                        setPreferences(updated);
                        try {
                          localStorage.setItem('typepulse_preferences', JSON.stringify(updated));
                        } catch {}
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-border bg-surface hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                      title="Toggle between fixed 3-Line view and standard scrolling view"
                    >
                      <span className="font-mono text-[11px]">{preferences.viewportMode === 'scrolling' ? '📜 Scroll' : '≡ 3 Lines'}</span>
                    </button>
                  </div>

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
                      title={
                        ghostTargetWpm !== null
                          ? `Toggle the Ghost PB pacer, which races your recorded ${ghostTargetWpm} WPM best`
                          : 'No personal best recorded yet — this appears once you finish a practice run'
                      }
                    >
                      <Ghost
                        className={
                          ghostTargetWpm !== null ? 'w-3.5 h-3.5 text-primary' : 'w-3.5 h-3.5 text-text-subtle'
                        }
                      />
                      <span className="font-mono">
                        Ghost PB: {ghostTargetWpm !== null ? `${ghostTargetWpm} WPM` : 'no run yet'}
                      </span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          preferences.showGhostPacer !== false ? 'bg-primary animate-pulse' : 'bg-text-subtle'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Zen Flow Mode Quick Toggle */}
                  <div className="border-l border-border pl-2">
                    <button
                      onClick={() => setIsZenMode((z) => !z)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        isZenMode
                          ? 'bg-accent text-accent-foreground border border-accent-border font-bold shadow-sm'
                          : 'text-text-muted hover:text-text-primary border border-transparent'
                      }`}
                      title="Toggle Minimalist Zen Flow Mode (Shift+Z)"
                      id="zen-mode-toggle-btn"
                    >
                      {isZenMode ? <Minimize2 className="w-3.5 h-3.5 text-accent" /> : <Maximize2 className="w-3.5 h-3.5 text-accent" />}
                      <span>Zen</span>
                      <kbd className="hidden sm:inline-block px-1 rounded bg-surface border border-border text-[9px] font-mono text-text-subtle">
                        Shift+Z
                      </kbd>
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

            {/* DUAL-COLUMN DESKTOP WORKSPACE / MINIMALIST ZEN FLOW */}
            <div
              className={`w-full ${
                isZenMode
                  ? 'max-w-3xl mx-auto flex flex-col gap-4 items-center justify-center py-4'
                  : 'grid grid-cols-1 lg:grid-cols-12 gap-4 items-start'
              }`}
            >
              {/* LEFT COLUMN: LIVE METRICS & TYPING STAGE */}
              <div className={`${isZenMode ? 'w-full' : 'lg:col-span-6'} flex flex-col gap-3`}>
                {/* LIVE METRICS HUD */}
                <div className="w-full flex items-center justify-between px-5 py-2.5 bg-surface rounded-2xl border border-border shadow-sm">
                  <div className="flex items-center gap-5">
                    {/* WPM Counter */}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-text-subtle uppercase tracking-wider font-semibold">Speed</span>
                        {sessionState === 'playing' &&
                          gameMode === 'practice' &&
                          preferences.showGhostPacer !== false &&
                          ghostTargetWpm !== null && (
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

                {/* Keybr Unlocked Key Celebration Alert */}
                {unlockedKeyCelebration && (
                  <div className="w-full mb-3 p-3 bg-accent-subtle border border-accent/40 rounded-xl flex items-center justify-between animate-fade-in shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🎉</span>
                      <p className="text-sm font-medium text-accent">
                        <strong>New Key Mastered & Unlocked: &apos;{unlockedKeyCelebration.toUpperCase()}&apos;!</strong> Added to your active typing alphabet.
                      </p>
                    </div>
                    <button
                      onClick={() => setUnlockedKeyCelebration(null)}
                      className="text-xs text-text-subtle hover:text-text-primary px-2 py-1 rounded cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Keybr Adaptive Progression Guidance Card */}
                {contentCategory === 'keybr' && gameMode === 'practice' && (
                  <KeybrGuidanceCard
                    progression={userProgress.keybrProgression || INITIAL_KEYBR_PROGRESSION}
                    onSwitchToWords={() => {
                      setContentCategory('words');
                      setTimeLimit(null);
                      setTimeRemaining(null);
                      setupNewTest('practice', undefined, null);
                    }}
                    onResetKeybr={handleResetKeybr}
                    onRegenerate={() => setupNewTest('practice')}
                  />
                )}

                {/* THE TYPING TEXT STAGE WITH SMOOTH 3-LINE VIRTUALIZED VIEWPORT */}
                <WordViewport
                  engineChars={engineChars}
                  engineIndex={engineIndex}
                  ghostIndex={ghostIndex}
                  sessionState={sessionState}
                  gameMode={gameMode}
                  showGhostPacer={preferences.showGhostPacer}
                  viewportMode={preferences.viewportMode || '3-line'}
                  onContainerClick={() => inputRef.current?.focus()}
                  activeCharRef={activeCharRef}
                >
                  {/* In-flow keystroke capture input - occupies the stage without shifting layout or leaving the viewport */}
                  <input
                    ref={inputRef}
                    type="text"
                    className="absolute inset-0 size-full opacity-0 cursor-text pointer-events-auto caret-transparent z-10"
                    onKeyDown={handleKeyDown}
                    value=""
                    onChange={() => {}}
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

                  {/* Ready helper hint */}
                  {sessionState === 'ready' && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-surface-muted/90 rounded-full text-xs text-text-primary border border-border backdrop-blur-sm pointer-events-none shadow-sm z-20">
                      Press any key to start typing
                    </div>
                  )}
                </WordViewport>

                {/* Quick Hint */}
                <div className="flex items-center justify-between text-[11px] text-text-subtle px-1 font-mono">
                  <span>Press <kbd className="px-1.5 py-0.5 rounded bg-surface-muted border border-border text-text-primary">Tab</kbd> to restart instantly</span>
                  <span>Click canvas to focus</span>
                </div>
              </div>

              {/* RIGHT COLUMN: EYE-LEVEL FINGER HUD, KEYBOARD VISUALIZER & BIOMETRIC LATENCY */}
              {!isZenMode && (
                <div className="lg:col-span-6 flex flex-col gap-3">
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

                  {/* Real-Time Biometric Keystroke Latency HUD */}
                  <BiometricLatencyHUD
                    stats={liveStats}
                    userProgress={userProgress}
                    onDrillKey={(k) => handleTrainWeakKeys([k])}
                    defaultExpanded={false}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="w-full border-t border-border py-4 px-4 text-center text-xs text-text-muted">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-text-primary font-semibold">Runewright</span>
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
        userProgress={userProgress}
        onProgressImported={(importedProgress) => setUserProgress(importedProgress)}
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
        targetText={currentTargetText}
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

      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        commands={commandList}
      />

      <GhostDuelModal
        isOpen={isGhostDuelOpen}
        onClose={() => {
          setIsGhostDuelOpen(false);
          setActiveGhostDuel(null);
        }}
        initialDuel={activeGhostDuel}
        onStartDuel={handleStartGhostDuel}
        userProgress={userProgress}
      />

      <MasteryPassModal
        isOpen={isMasteryPassOpen}
        onClose={() => setIsMasteryPassOpen(false)}
        userProgress={userProgress}
        activeProfile={preferences.switchSoundProfile}
        onClaimReward={handleClaimMasteryReward}
      />

      <CodeClimberModal
        isOpen={isCodeClimberOpen}
        onClose={() => setIsCodeClimberOpen(false)}
        onStartClimb={handleStartCodeClimber}
      />

      <CertificationModal
        isOpen={isCertificationModalOpen}
        onClose={() => setIsCertificationModalOpen(false)}
        onStartTest={handleStartCertification}
        bestWpm={userProgress.highScores.bestWpm}
        bestAccuracy={userProgress.highScores.bestAccuracy}
      />

      <AICustomDrillModal
        isOpen={isAiCustomDrillOpen}
        onClose={() => setIsAiCustomDrillOpen(false)}
        aiSettings={aiSettings}
        onLaunchDrill={handleLaunchAiCustomDrill}
        userWeakKeys={Object.keys(userProgress.keyStats || {})}
      />
    </div>
  );
}
