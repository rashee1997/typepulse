'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AISettings, UserProgress } from '@/types/typing';
import {
  DUEL_OPPONENTS,
  DuelDifficulty,
  DuelPassage,
  generateDuelPassage,
  getInitialDuelPassage,
} from '@/lib/duel-service';
import { soundFx } from '@/lib/sound';
import {
  Award,
  Bot,
  ChevronLeft,
  ChevronRight,
  Flame,
  Gauge,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Swords,
  Target,
  Trophy,
  User,
  Zap,
} from 'lucide-react';

interface TypingDuelGameProps {
  userProgress: UserProgress;
  aiSettings: AISettings;
  onFinishDuel: (totalXp: number, won: boolean, stats: DuelStats) => void;
  onExit: () => void;
}

export interface DuelStats {
  difficulty: DuelDifficulty;
  playerWpm: number;
  rivalWpm: number;
  accuracy: number;
  elapsedSeconds: number;
  won: boolean;
  totalXp: number;
}

interface DuelCareerStats {
  duelsWon: number;
  duelsLost: number;
  totalDuelXp: number;
  highestWpm: number;
}

export const TypingDuelGame: React.FC<TypingDuelGameProps> = ({
  userProgress,
  aiSettings,
  onFinishDuel,
  onExit,
}) => {
  const [difficulty, setDifficulty] = useState<DuelDifficulty>('adept');
  const [passage, setPassage] = useState<DuelPassage>(() => getInitialDuelPassage('adept'));
  const [loadingPassage, setLoadingPassage] = useState(false);

  // Game state: ready -> countdown -> dueling -> finished
  const [gameState, setGameState] = useState<'ready' | 'countdown' | 'dueling' | 'finished'>('ready');
  const [countdown, setCountdown] = useState<number>(3);

  // Input & Progress State
  const [inputChars, setInputChars] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errorsCount, setErrorsCount] = useState(0);
  const [streak, setStreak] = useState(0);

  // Positions & Telemetry
  const [playerProgress, setPlayerProgress] = useState(0);
  const [rivalProgress, setRivalProgress] = useState(0);
  const [playerWpm, setPlayerWpm] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [duelWinner, setDuelWinner] = useState<'player' | 'rival' | null>(null);
  const [finalDuelResult, setFinalDuelResult] = useState<{
    xpBreakdown: { base: number; winBonus: number; accuracyBonus: number; total: number };
    stats: DuelStats;
  } | null>(null);

  // Career stats in localStorage
  const [careerStats, setCareerStats] = useState<DuelCareerStats>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('typepulse_duel_career');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return { duelsWon: 0, duelsLost: 0, totalDuelXp: 0, highestWpm: 0 };
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const raceStartTimeRef = useRef<number>(0);
  const hasFinishedRef = useRef(false);
  const playerWpmRef = useRef(0);
  const onFinishDuelRef = useRef(onFinishDuel);

  useEffect(() => {
    onFinishDuelRef.current = onFinishDuel;
  }, [onFinishDuel]);

  useEffect(() => {
    playerWpmRef.current = playerWpm;
  }, [playerWpm]);

  // Load new passage for selected difficulty
  const loadPassage = useCallback(
    async (diff: DuelDifficulty) => {
      setLoadingPassage(true);
      try {
        const p = await generateDuelPassage(diff, aiSettings);
        setPassage(p);
        setInputChars([]);
        setCurrentIndex(0);
        setErrorsCount(0);
        setStreak(0);
        setPlayerProgress(0);
        setRivalProgress(0);
        setPlayerWpm(0);
        setElapsedSeconds(0);
        setDuelWinner(null);
        setFinalDuelResult(null);
        hasFinishedRef.current = false;
        setGameState('ready');
      } catch (err) {
        console.error('Failed to load duel passage', err);
      } finally {
        setLoadingPassage(false);
      }
    },
    [aiSettings]
  );

  const handleSelectDifficulty = (diff: DuelDifficulty) => {
    setDifficulty(diff);
    loadPassage(diff);
  };

  // Start Countdown Sequence
  const startDuelCountdown = () => {
    hasFinishedRef.current = false;
    setGameState('countdown');
    setCountdown(3);

    let count = 3;
    const countTimer = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
        soundFx.playKeyClick();
      } else if (count === 0) {
        setCountdown(0);
        soundFx.playCombo();
      } else {
        clearInterval(countTimer);
        setGameState('dueling');
        const start = Date.now();
        raceStartTimeRef.current = start;
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    }, 850);
  };

  // Conclude the Duel
  const concludeDuel = useCallback(
    (winner: 'player' | 'rival', finalElapsed: number, finalWpm: number) => {
      if (hasFinishedRef.current || !passage) return;
      hasFinishedRef.current = true;

      setDuelWinner(winner);
      setGameState('finished');

      const opponent = passage.opponent;
      const won = winner === 'player';
      if (won) {
        soundFx.playSuccess();
      } else {
        soundFx.playError();
      }

      // Calculate XP breakdown
      const totalChars = passage.text.length;
      const accuracy = totalChars > 0 ? Math.max(70, Math.round(((totalChars - errorsCount) / totalChars) * 100)) : 100;
      const base = opponent.baseXp;
      const winBonus = won ? opponent.winBonusXp : 40; // Consolation XP for finishing
      const accuracyBonus = accuracy >= 98 ? 80 : accuracy >= 95 ? 40 : 0;
      const totalXp = base + winBonus + accuracyBonus;

      const stats: DuelStats = {
        difficulty,
        playerWpm: finalWpm,
        rivalWpm: opponent.targetWpm,
        accuracy,
        elapsedSeconds: finalElapsed,
        won,
        totalXp,
      };

      setFinalDuelResult({
        xpBreakdown: { base, winBonus, accuracyBonus, total: totalXp },
        stats,
      });

      // Update career stats
      setCareerStats((prev) => {
        const updated = {
          duelsWon: won ? prev.duelsWon + 1 : prev.duelsWon,
          duelsLost: !won ? prev.duelsLost + 1 : prev.duelsLost,
          totalDuelXp: prev.totalDuelXp + totalXp,
          highestWpm: Math.max(prev.highestWpm, finalWpm),
        };
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('typepulse_duel_career', JSON.stringify(updated));
          } catch {}
        }
        return updated;
      });

      // Notify parent
      onFinishDuelRef.current(totalXp, won, stats);
    },
    [passage, difficulty, errorsCount]
  );

  // AI Rival progress simulation
  useEffect(() => {
    if (gameState !== 'dueling' || !passage) return;

    const rivalWpm = passage.opponent.targetWpm;
    const totalChars = passage.text.length;
    // Standard typing: chars per second = (WPM * 5) / 60
    const charsPerSecBase = (rivalWpm * 5) / 60;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.max(0.1, (now - raceStartTimeRef.current) / 1000);
      setElapsedSeconds(elapsed);

      // Add minor organic jitter to AI rival (+/- 7%)
      const jitter = 1 + Math.sin(elapsed * 2.2) * 0.07;
      const rivalCharsCompleted = charsPerSecBase * jitter * elapsed;
      const rivalP = Math.min(100, (rivalCharsCompleted / totalChars) * 100);
      setRivalProgress(rivalP);

      // Rival finish check
      if (rivalP >= 100 && !hasFinishedRef.current) {
        const currentSpeed = playerWpmRef.current;
        concludeDuel('rival', elapsed, currentSpeed);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [gameState, passage, concludeDuel]);

  // Handle typing input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (gameState !== 'dueling' || !passage) return;

    // Ignore modifier keys
    if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta' || e.key === 'Tab') {
      return;
    }

    const text = passage.text;

    if (e.key === 'Backspace') {
      e.preventDefault();
      if (currentIndex > 0) {
        soundFx.playKeyClick();
        const nextIdx = currentIndex - 1;
        setCurrentIndex(nextIdx);
        setInputChars((prev) => prev.slice(0, nextIdx));
        const pProg = (nextIdx / text.length) * 100;
        setPlayerProgress(pProg);
      }
      return;
    }

    if (e.key.length !== 1) return;
    e.preventDefault();

    const expectedChar = text[currentIndex];
    const isCorrect = e.key === expectedChar;

    if (isCorrect) {
      soundFx.playKeyClick();
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      if (nextStreak % 15 === 0) soundFx.playCombo();
    } else {
      soundFx.playError();
      setStreak(0);
      setErrorsCount((prev) => prev + 1);
    }

    const nextIdx = currentIndex + 1;
    const nextInput = [...inputChars, e.key];
    setInputChars(nextInput);
    setCurrentIndex(nextIdx);

    // Calculate progress & live WPM
    const pProg = Math.min(100, (nextIdx / text.length) * 100);
    setPlayerProgress(pProg);

    const elapsedMin = elapsedSeconds / 60;
    if (elapsedMin > 0.04) {
      const currentSpeed = Math.round((nextIdx / 5) / elapsedMin);
      setPlayerWpm(currentSpeed);
    }

    // Player finish check
    if (nextIdx >= text.length && !hasFinishedRef.current) {
      const finalElapsed = Math.max(0.5, (Date.now() - raceStartTimeRef.current) / 1000);
      const finalSpeed = Math.max(20, Math.round((text.length / 5) / (finalElapsed / 60)));
      concludeDuel('player', finalElapsed, finalSpeed);
    }
  };

  const opponent = passage?.opponent || DUEL_OPPONENTS[difficulty];
  const charLead = passage ? Math.round(((playerProgress - rivalProgress) / 100) * passage.text.length) : 0;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-5 animate-fadeIn" id="typing-duel-arena">
      {/* Top Bar Header & Opponent Selector */}
      <div className="bg-surface border border-border px-4 py-3 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-card">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-2 rounded-xl bg-surface-hover hover:bg-surface-active text-text-secondary hover:text-text-primary text-xs font-semibold flex items-center gap-1.5 transition-colors border border-border"
            id="duel-exit-btn"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Arcade Arena</span>
          </button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-accent-subtle border border-accent-border text-accent font-bold">⚔️</span>
            <div>
              <h2 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                Typing Duel
                <span className="px-1.5 py-0.2 rounded bg-accent-subtle text-accent border border-accent-border text-[9px] font-mono font-bold">
                  AI COMBAT
                </span>
              </h2>
              <p className="text-[11px] text-text-muted">Face AI rivals on dynamic passages with bonus XP rewards</p>
            </div>
          </div>
        </div>

        {/* Difficulty Tier Selector */}
        <div className="flex items-center gap-1 bg-surface-muted p-1 rounded-xl border border-border shrink-0">
          {(['novice', 'adept', 'master', 'grandmaster'] as DuelDifficulty[]).map((diff) => {
            const opp = DUEL_OPPONENTS[diff];
            const active = difficulty === diff;

            return (
              <button
                key={diff}
                disabled={gameState === 'dueling' || gameState === 'countdown' || loadingPassage}
                onClick={() => handleSelectDifficulty(diff)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all flex items-center gap-1.5 ${
                  active
                    ? 'bg-accent text-accent-foreground font-bold shadow-sm'
                    : 'text-text-muted hover:text-text-primary disabled:opacity-50'
                }`}
              >
                <span>{opp.avatar}</span>
                <span className="hidden md:inline">{opp.name}</span>
                <span className="text-[10px] font-mono opacity-80">({opp.targetWpm})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Duel Combat HUD & Dual-Lane Progress Visualizer */}
      <div className="relative w-full bg-gradient-to-b from-surface via-surface-muted to-surface border border-border rounded-3xl p-5 sm:p-6 shadow-card overflow-hidden">
        {/* Duel Header Info */}
        <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent-subtle border border-accent-border text-accent flex items-center justify-center text-xl shadow-inner">
              <Swords className="w-5 h-5 text-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-text-primary text-sm">{opponent.name}</span>
                <span className="px-1.5 py-0.2 rounded bg-primary-subtle border border-primary-border text-[10px] text-primary font-mono">
                  {opponent.title}
                </span>
                <span className="text-xs text-accent font-mono font-bold">
                  Target: {opponent.targetWpm} WPM
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">{opponent.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadPassage(difficulty)}
              disabled={gameState === 'dueling' || gameState === 'countdown' || loadingPassage}
              className="px-2.5 py-1.5 bg-surface-hover hover:bg-surface-active text-text-secondary hover:text-accent rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40 border border-border"
              title="Generate new AI text for this difficulty"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingPassage ? 'animate-spin text-accent' : ''}`} />
              <span className="hidden sm:inline">Refresh Text</span>
            </button>
          </div>
        </div>

        {/* Dual Race Tracks */}
        <div className="space-y-3.5">
          {/* Lane 1: Player Track */}
          <div className="bg-surface border border-accent-border rounded-2xl p-3">
            <div className="flex items-center justify-between text-xs font-semibold text-accent mb-1.5">
              <div className="flex items-center gap-2">
                <span className="font-bold">YOU (Contender)</span>
                <span className="font-mono text-text-primary bg-surface-muted px-2 py-0.5 rounded border border-border">
                  {playerWpm} WPM
                </span>
                {streak >= 10 && (
                  <span className="px-1.5 py-0.5 rounded bg-accent-subtle text-accent text-[10px] font-mono animate-pulse flex items-center gap-0.5">
                    <Flame className="w-3 h-3 text-accent" /> {streak} Streak
                  </span>
                )}
              </div>
              <span className="font-mono text-xs">{Math.round(playerProgress)}%</span>
            </div>

            {/* Track Bar */}
            <div className="relative h-9 bg-surface-muted rounded-xl border border-border flex items-center px-3 overflow-hidden">
              <div
                className="absolute left-0 top-0 bottom-0 bg-accent/40 transition-all duration-100 rounded-xl"
                style={{ width: `${playerProgress}%` }}
              />
              <div className="absolute right-0 top-0 bottom-0 w-6 bg-[repeating-linear-gradient(45deg,var(--surface-muted),var(--surface-muted)_4px,var(--surface-active)_4px,var(--surface-active)_8px)] opacity-60 border-l-2 border-accent" />
              <div
                className="absolute top-1/2 -translate-y-1/2 transition-all duration-100 flex items-center gap-1 z-10"
                style={{ left: `calc(${Math.min(95, playerProgress * 0.92)}% + 6px)` }}
              >
                <div className="px-2 py-0.5 bg-accent text-accent-foreground font-black text-[11px] rounded shadow-glow-accent flex items-center gap-1">
                  <span>⚡</span>
                  <span className="font-mono">YOU</span>
                </div>
              </div>
            </div>
          </div>

          {/* Lane 2: AI Opponent Track */}
          <div className="bg-surface border border-primary-border rounded-2xl p-3">
            <div className="flex items-center justify-between text-xs font-semibold text-primary mb-1.5">
              <div className="flex items-center gap-2">
                <span className="font-bold">
                  {opponent.avatar} {opponent.name} ({opponent.title})
                </span>
                <span className="font-mono text-text-primary bg-surface-muted px-2 py-0.5 rounded border border-border">
                  {opponent.targetWpm} WPM
                </span>
              </div>
              <span className="font-mono text-xs">{Math.round(rivalProgress)}%</span>
            </div>

            {/* Track Bar */}
            <div className="relative h-9 bg-surface-muted rounded-xl border border-border flex items-center px-3 overflow-hidden">
              <div
                className="absolute left-0 top-0 bottom-0 bg-primary/40 transition-all duration-100 rounded-xl"
                style={{ width: `${rivalProgress}%` }}
              />
              <div className="absolute right-0 top-0 bottom-0 w-6 bg-[repeating-linear-gradient(45deg,var(--surface-muted),var(--surface-muted)_4px,var(--surface-active)_4px,var(--surface-active)_8px)] opacity-60 border-l-2 border-primary" />
              <div
                className="absolute top-1/2 -translate-y-1/2 transition-all duration-100 flex items-center gap-1 z-10"
                style={{ left: `calc(${Math.min(95, rivalProgress * 0.92)}% + 6px)` }}
              >
                <div className="px-2 py-0.5 bg-primary text-primary-foreground font-black text-[11px] rounded shadow-glow-primary flex items-center gap-1">
                  <span>{opponent.avatar}</span>
                  <span className="font-mono">AI</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lead Differential Indicator */}
        <div className="mt-3 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-text-muted">Pacing:</span>
            {charLead > 0 ? (
              <span className="text-success font-bold">+{charLead} chars Ahead</span>
            ) : charLead < 0 ? (
              <span className="text-danger font-bold">{charLead} chars Behind</span>
            ) : (
              <span className="text-text-muted">Dead Heat (Tied)</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-text-muted">
            <span>Elapsed: <strong className="text-text-primary">{elapsedSeconds.toFixed(1)}s</strong></span>
            <span>Max Reward: <strong className="text-success">+{opponent.baseXp + opponent.winBonusXp} XP</strong></span>
          </div>
        </div>
      </div>

      {/* Duel Arena: Ready / Countdown / Typing / Win-Loss Dashboard */}
      {gameState === 'ready' && (
        <div className="w-full bg-surface border border-border rounded-3xl p-8 flex flex-col items-center justify-center text-center gap-4 shadow-card">
          <div className="w-16 h-16 rounded-2xl bg-accent-subtle border border-accent-border text-accent flex items-center justify-center text-3xl shadow-inner">
            ⚔️
          </div>
          <div>
            <h3 className="text-xl font-bold text-text-primary">
              Ready to Duel {opponent.name}?
            </h3>
            <p className="text-xs text-text-muted max-w-md mt-1.5 leading-relaxed">
              Your opponent types at a calibrated <strong className="text-accent">{opponent.targetWpm} WPM</strong>. Complete the AI-crafted passage before {opponent.name} to claim the victory bonus and earn up to{' '}
              <strong className="text-success">+{opponent.baseXp + opponent.winBonusXp} XP</strong>!
            </p>
          </div>

          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={startDuelCountdown}
              disabled={loadingPassage || !passage}
              className="px-6 py-3 bg-accent hover:bg-accent-hover disabled:opacity-40 text-accent-foreground font-bold rounded-xl text-sm transition-all shadow-glow-accent-sm hover:scale-105 flex items-center gap-2"
              id="duel-start-btn"
            >
              <Zap className="w-4 h-4 fill-accent-foreground" />
              <span>Enter Duel Ring</span>
            </button>
          </div>
        </div>
      )}

      {gameState === 'countdown' && (
        <div className="w-full bg-surface border border-border rounded-3xl p-10 flex flex-col items-center justify-center text-center gap-2 shadow-card">
          <span className="text-xs uppercase tracking-widest text-text-muted font-bold font-mono">
            Duel Commencing in
          </span>
          <span className="text-6xl font-black font-mono text-accent animate-pulse">
            {countdown > 0 ? countdown : 'FIGHT!'}
          </span>
        </div>
      )}

      {gameState === 'dueling' && passage && (
        <div
          onClick={() => inputRef.current?.focus()}
          className="relative w-full bg-surface border-2 border-accent-border rounded-3xl p-6 sm:p-8 flex flex-col gap-6 shadow-card cursor-text select-none"
        >
          {/* Hidden Capture Input */}
          <input
            ref={inputRef}
            type="text"
            onKeyDown={handleKeyDown}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            className="absolute opacity-0 pointer-events-none -top-40 left-0"
            id="duel-keystroke-capture"
          />

          {/* Interactive Passage Text Renderer */}
          <div
            ref={textContainerRef}
            className="font-mono text-base sm:text-lg leading-relaxed tracking-wide text-text-muted break-words"
          >
            {passage.text.split('').map((char, idx) => {
              const hasTyped = idx < currentIndex;
              const isCurrent = idx === currentIndex;
              const typedChar = inputChars[idx];
              const isCorrect = typedChar === char;

              let charClass = 'text-text-muted';
              if (hasTyped) {
                charClass = isCorrect ? 'text-accent font-semibold' : 'text-danger bg-danger-subtle rounded';
              } else if (isCurrent) {
                charClass = 'text-text-primary bg-accent-subtle border-b-2 border-accent animate-pulse';
              }

              return (
                <span key={idx} className={`transition-colors ${charClass}`}>
                  {char}
                </span>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-text-subtle pt-2 border-t border-border">
            <span>
              Characters: <strong className="text-text-primary">{currentIndex}</strong> / {passage.text.length}
            </span>
            <span className="text-accent font-mono">
              Keep typing to outrun {opponent.name}!
            </span>
          </div>
        </div>
      )}

      {/* WIN / LOSS DASHBOARD SCREEN */}
      {gameState === 'finished' && finalDuelResult && (
        <div className="w-full bg-surface border border-border rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center gap-5 shadow-dialog animate-fadeIn" id="duel-results-screen">
          {/* Victory / Defeat Badge */}
          <div
            className={`w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-inner ${
              duelWinner === 'player'
                ? 'bg-accent-subtle border-2 border-accent text-accent shadow-glow-accent'
                : 'bg-danger-subtle border-2 border-danger-border text-danger shadow-glow-danger'
            }`}
          >
            {duelWinner === 'player' ? '🏆' : '💀'}
          </div>

          <div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <span
                className={`px-2.5 py-0.5 rounded-full font-mono text-xs font-extrabold tracking-wider uppercase ${
                  duelWinner === 'player'
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-danger-subtle text-danger border border-danger-border'
                }`}
              >
                {duelWinner === 'player' ? 'VICTORY' : 'DEFEAT'}
              </span>
              <span className="text-xs text-text-muted font-mono">
                vs {opponent.name} ({opponent.targetWpm} WPM)
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-text-primary">
              {duelWinner === 'player'
                ? `You Defeated ${opponent.name}!`
                : `${opponent.name} Outpaced You!`}
            </h2>
            <p className="text-xs sm:text-sm text-text-muted mt-1 max-w-md">
              {duelWinner === 'player'
                ? `Outstanding performance! You maintained ${finalDuelResult.stats.playerWpm} WPM and finished in ${finalDuelResult.stats.elapsedSeconds.toFixed(1)} seconds.`
                : `A valiant effort! You clocked ${finalDuelResult.stats.playerWpm} WPM against ${opponent.name}'s ${opponent.targetWpm} WPM.`}
            </p>
          </div>

          {/* XP Gained Highlight Card */}
          <div className="w-full max-w-lg bg-gradient-to-r from-accent-subtle via-surface-muted to-accent-subtle border border-accent-border rounded-2xl p-4 sm:p-5 shadow-card">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-accent" />
                <span className="text-xs uppercase tracking-wider font-mono font-bold text-text-primary">
                  Duel XP Reward
                </span>
              </div>
              <span className="text-2xl sm:text-3xl font-mono font-black text-accent flex items-center gap-1">
                +{finalDuelResult.xpBreakdown.total} XP
              </span>
            </div>

            {/* XP Breakdown Grid */}
            <div className="grid grid-cols-3 gap-2 text-xs font-mono">
              <div className="p-2 bg-surface-muted rounded-xl border border-border">
                <span className="text-[10px] text-text-subtle block">Base Match</span>
                <span className="font-bold text-text-primary">+{finalDuelResult.xpBreakdown.base} XP</span>
              </div>
              <div className="p-2 bg-surface-muted rounded-xl border border-border">
                <span className="text-[10px] text-text-subtle block">
                  {duelWinner === 'player' ? 'Win Bonus' : 'Consolation'}
                </span>
                <span className={`font-bold ${duelWinner === 'player' ? 'text-accent' : 'text-text-muted'}`}>
                  +{finalDuelResult.xpBreakdown.winBonus} XP
                </span>
              </div>
              <div className="p-2 bg-surface-muted rounded-xl border border-border">
                <span className="text-[10px] text-text-subtle block">Accuracy (≥95%)</span>
                <span className="font-bold text-success">+{finalDuelResult.xpBreakdown.accuracyBonus} XP</span>
              </div>
            </div>
          </div>

          {/* Match Telemetry Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-lg text-xs font-mono">
            <div className="p-3 bg-surface-muted rounded-2xl border border-border">
              <span className="text-[10px] text-text-subtle block">Your Speed</span>
              <span className="text-base font-bold text-accent mt-0.5 block">
                {finalDuelResult.stats.playerWpm} WPM
              </span>
            </div>
            <div className="p-3 bg-surface-muted rounded-2xl border border-border">
              <span className="text-[10px] text-text-subtle block">Rival Speed</span>
              <span className="text-base font-bold text-primary mt-0.5 block">
                {finalDuelResult.stats.rivalWpm} WPM
              </span>
            </div>
            <div className="p-3 bg-surface-muted rounded-2xl border border-border">
              <span className="text-[10px] text-text-subtle block">Accuracy</span>
              <span className="text-base font-bold text-text-primary mt-0.5 block">
                {finalDuelResult.stats.accuracy}%
              </span>
            </div>
            <div className="p-3 bg-surface-muted rounded-2xl border border-border">
              <span className="text-[10px] text-text-subtle block">Time</span>
              <span className="text-base font-bold text-text-primary mt-0.5 block">
                {finalDuelResult.stats.elapsedSeconds.toFixed(1)}s
              </span>
            </div>
          </div>

          {/* Career Record Strip */}
          <div className="flex items-center gap-4 text-xs font-mono text-text-muted pt-2">
            <span>Career Duels: <strong className="text-text-primary">{careerStats.duelsWon + careerStats.duelsLost}</strong></span>
            <span>•</span>
            <span>Record: <strong className="text-success">{careerStats.duelsWon}W</strong> - <strong className="text-danger">{careerStats.duelsLost}L</strong></span>
            <span>•</span>
            <span>Career XP: <strong className="text-accent">{careerStats.totalDuelXp.toLocaleString()} XP</strong></span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 mt-2 flex-wrap justify-center">
            <button
              onClick={() => loadPassage(difficulty)}
              className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-accent-foreground font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-md"
              id="duel-rematch-btn"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Rematch (New Text)</span>
            </button>

            {difficulty !== 'grandmaster' && (
              <button
                onClick={() => {
                  const tiers: DuelDifficulty[] = ['novice', 'adept', 'master', 'grandmaster'];
                  const nextIdx = tiers.indexOf(difficulty) + 1;
                  if (nextIdx < tiers.length) {
                    handleSelectDifficulty(tiers[nextIdx]);
                  }
                }}
                className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5"
                id="duel-next-tier-btn"
              >
                <span>Next Difficulty</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onExit}
              className="px-5 py-2.5 bg-surface-hover hover:bg-surface-active text-text-primary border border-border font-semibold rounded-xl text-xs transition-colors"
            >
              Arcade Arena
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
