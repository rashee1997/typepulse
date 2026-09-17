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
      <div className="bg-slate-900/80 border border-slate-800 px-4 py-3 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            id="duel-exit-btn"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Arcade Arena</span>
          </button>
          <div className="h-5 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-400/20 text-amber-400 font-bold">⚔️</span>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                Typing Duel
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-mono font-bold">
                  AI COMBAT
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">Face AI rivals on dynamic passages with bonus XP rewards</p>
            </div>
          </div>
        </div>

        {/* Difficulty Tier Selector */}
        <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800 shrink-0">
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
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 disabled:opacity-50'
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
      <div className="relative w-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl overflow-hidden">
        {/* Duel Header Info */}
        <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-400 flex items-center justify-center text-xl shadow-inner">
              <Swords className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 text-sm">{opponent.name}</span>
                <span className="px-1.5 py-0.2 rounded bg-indigo-950 border border-indigo-800 text-[10px] text-indigo-300 font-mono">
                  {opponent.title}
                </span>
                <span className="text-xs text-amber-400 font-mono font-bold">
                  Target: {opponent.targetWpm} WPM
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{opponent.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadPassage(difficulty)}
              disabled={gameState === 'dueling' || gameState === 'countdown' || loadingPassage}
              className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-amber-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40"
              title="Generate new AI text for this difficulty"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingPassage ? 'animate-spin text-amber-400' : ''}`} />
              <span className="hidden sm:inline">Refresh Text</span>
            </button>
          </div>
        </div>

        {/* Dual Race Tracks */}
        <div className="space-y-3.5">
          {/* Lane 1: Player Track */}
          <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-3">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-400 mb-1.5">
              <div className="flex items-center gap-2">
                <span className="font-bold">YOU (Contender)</span>
                <span className="font-mono text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  {playerWpm} WPM
                </span>
                {streak >= 10 && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono animate-pulse flex items-center gap-0.5">
                    <Flame className="w-3 h-3 text-amber-400" /> {streak} Streak
                  </span>
                )}
              </div>
              <span className="font-mono text-xs">{Math.round(playerProgress)}%</span>
            </div>

            {/* Track Bar */}
            <div className="relative h-9 bg-slate-950/90 rounded-xl border border-slate-800 flex items-center px-3 overflow-hidden">
              <div
                className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-amber-500/30 via-amber-400/40 to-amber-400 transition-all duration-100 rounded-xl"
                style={{ width: `${playerProgress}%` }}
              />
              <div className="absolute right-0 top-0 bottom-0 w-6 bg-[repeating-linear-gradient(45deg,#000,#000_4px,#fff_4px,#fff_8px)] opacity-50 border-l border-amber-400" />
              <div
                className="absolute top-1/2 -translate-y-1/2 transition-all duration-100 flex items-center gap-1 z-10"
                style={{ left: `calc(${Math.min(95, playerProgress * 0.92)}% + 6px)` }}
              >
                <div className="px-2 py-0.5 bg-amber-400 text-slate-950 font-black text-[11px] rounded shadow-[0_0_12px_rgba(251,191,36,0.6)] flex items-center gap-1">
                  <span>⚡</span>
                  <span className="font-mono">YOU</span>
                </div>
              </div>
            </div>
          </div>

          {/* Lane 2: AI Opponent Track */}
          <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-3">
            <div className="flex items-center justify-between text-xs font-semibold text-indigo-400 mb-1.5">
              <div className="flex items-center gap-2">
                <span className="font-bold">
                  {opponent.avatar} {opponent.name} ({opponent.title})
                </span>
                <span className="font-mono text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  {opponent.targetWpm} WPM
                </span>
              </div>
              <span className="font-mono text-xs">{Math.round(rivalProgress)}%</span>
            </div>

            {/* Track Bar */}
            <div className="relative h-9 bg-slate-950/90 rounded-xl border border-slate-800 flex items-center px-3 overflow-hidden">
              <div
                className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-indigo-600/30 via-indigo-500/40 to-indigo-500 transition-all duration-100 rounded-xl"
                style={{ width: `${rivalProgress}%` }}
              />
              <div className="absolute right-0 top-0 bottom-0 w-6 bg-[repeating-linear-gradient(45deg,#000,#000_4px,#fff_4px,#fff_8px)] opacity-50 border-l border-indigo-400" />
              <div
                className="absolute top-1/2 -translate-y-1/2 transition-all duration-100 flex items-center gap-1 z-10"
                style={{ left: `calc(${Math.min(95, rivalProgress * 0.92)}% + 6px)` }}
              >
                <div className="px-2 py-0.5 bg-indigo-600 text-white font-black text-[11px] rounded shadow-[0_0_12px_rgba(99,102,241,0.5)] flex items-center gap-1">
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
            <span className="text-slate-400">Pacing:</span>
            {charLead > 0 ? (
              <span className="text-emerald-400 font-bold">+{charLead} chars Ahead</span>
            ) : charLead < 0 ? (
              <span className="text-rose-400 font-bold">{charLead} chars Behind</span>
            ) : (
              <span className="text-slate-400">Dead Heat (Tied)</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <span>Elapsed: <strong className="text-slate-200">{elapsedSeconds.toFixed(1)}s</strong></span>
            <span>Max Reward: <strong className="text-emerald-400">+{opponent.baseXp + opponent.winBonusXp} XP</strong></span>
          </div>
        </div>
      </div>

      {/* Duel Arena: Ready / Countdown / Typing / Win-Loss Dashboard */}
      {gameState === 'ready' && (
        <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center text-center gap-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-400 flex items-center justify-center text-3xl shadow-inner">
            ⚔️
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-100">
              Ready to Duel {opponent.name}?
            </h3>
            <p className="text-xs text-slate-400 max-w-md mt-1.5 leading-relaxed">
              Your opponent types at a calibrated <strong className="text-amber-400">{opponent.targetWpm} WPM</strong>. Complete the AI-crafted passage before {opponent.name} to claim the victory bonus and earn up to{' '}
              <strong className="text-emerald-400">+{opponent.baseXp + opponent.winBonusXp} XP</strong>!
            </p>
          </div>

          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={startDuelCountdown}
              disabled={loadingPassage || !passage}
              className="px-6 py-3 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg hover:scale-105 flex items-center gap-2"
              id="duel-start-btn"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>Enter Duel Ring</span>
            </button>
          </div>
        </div>
      )}

      {gameState === 'countdown' && (
        <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-10 flex flex-col items-center justify-center text-center gap-2 shadow-xl">
          <span className="text-xs uppercase tracking-widest text-slate-400 font-bold font-mono">
            Duel Commencing in
          </span>
          <span className="text-6xl font-black font-mono text-amber-400 animate-pulse">
            {countdown > 0 ? countdown : 'FIGHT!'}
          </span>
        </div>
      )}

      {gameState === 'dueling' && passage && (
        <div
          onClick={() => inputRef.current?.focus()}
          className="relative w-full bg-slate-900/90 border-2 border-amber-400/40 rounded-3xl p-6 sm:p-8 flex flex-col gap-6 shadow-2xl cursor-text select-none"
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
            className="font-mono text-base sm:text-lg leading-relaxed tracking-wide text-slate-400 break-words"
          >
            {passage.text.split('').map((char, idx) => {
              const hasTyped = idx < currentIndex;
              const isCurrent = idx === currentIndex;
              const typedChar = inputChars[idx];
              const isCorrect = typedChar === char;

              let charClass = 'text-slate-400';
              if (hasTyped) {
                charClass = isCorrect ? 'text-amber-300 font-semibold' : 'text-rose-400 bg-rose-950/60 rounded';
              } else if (isCurrent) {
                charClass = 'text-slate-100 bg-amber-400/30 border-b-2 border-amber-400 animate-pulse';
              }

              return (
                <span key={idx} className={`transition-colors ${charClass}`}>
                  {char}
                </span>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-800/80">
            <span>
              Characters: <strong className="text-slate-300">{currentIndex}</strong> / {passage.text.length}
            </span>
            <span className="text-amber-400 font-mono">
              Keep typing to outrun {opponent.name}!
            </span>
          </div>
        </div>
      )}

      {/* WIN / LOSS DASHBOARD SCREEN */}
      {gameState === 'finished' && finalDuelResult && (
        <div className="w-full bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center gap-5 shadow-2xl animate-fadeIn" id="duel-results-screen">
          {/* Victory / Defeat Badge */}
          <div
            className={`w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-inner ${
              duelWinner === 'player'
                ? 'bg-amber-400/20 border-2 border-amber-400/50 text-amber-300 shadow-[0_0_30px_rgba(251,191,36,0.3)]'
                : 'bg-rose-500/20 border-2 border-rose-500/50 text-rose-300 shadow-[0_0_30px_rgba(244,63,94,0.2)]'
            }`}
          >
            {duelWinner === 'player' ? '🏆' : '💀'}
          </div>

          <div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <span
                className={`px-2.5 py-0.5 rounded-full font-mono text-xs font-extrabold tracking-wider uppercase ${
                  duelWinner === 'player'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}
              >
                {duelWinner === 'player' ? 'VICTORY' : 'DEFEAT'}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                vs {opponent.name} ({opponent.targetWpm} WPM)
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-100">
              {duelWinner === 'player'
                ? `You Defeated ${opponent.name}!`
                : `${opponent.name} Outpaced You!`}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md">
              {duelWinner === 'player'
                ? `Outstanding performance! You maintained ${finalDuelResult.stats.playerWpm} WPM and finished in ${finalDuelResult.stats.elapsedSeconds.toFixed(1)} seconds.`
                : `A valiant effort! You clocked ${finalDuelResult.stats.playerWpm} WPM against ${opponent.name}'s ${opponent.targetWpm} WPM.`}
            </p>
          </div>

          {/* XP Gained Highlight Card */}
          <div className="w-full max-w-lg bg-gradient-to-r from-amber-500/15 via-slate-900 to-amber-500/15 border border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span className="text-xs uppercase tracking-wider font-mono font-bold text-slate-300">
                  Duel XP Reward
                </span>
              </div>
              <span className="text-2xl sm:text-3xl font-mono font-black text-amber-400 flex items-center gap-1">
                +{finalDuelResult.xpBreakdown.total} XP
              </span>
            </div>

            {/* XP Breakdown Grid */}
            <div className="grid grid-cols-3 gap-2 text-xs font-mono">
              <div className="p-2 bg-slate-950/70 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-500 block">Base Match</span>
                <span className="font-bold text-slate-200">+{finalDuelResult.xpBreakdown.base} XP</span>
              </div>
              <div className="p-2 bg-slate-950/70 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-500 block">
                  {duelWinner === 'player' ? 'Win Bonus' : 'Consolation'}
                </span>
                <span className={`font-bold ${duelWinner === 'player' ? 'text-amber-400' : 'text-slate-400'}`}>
                  +{finalDuelResult.xpBreakdown.winBonus} XP
                </span>
              </div>
              <div className="p-2 bg-slate-950/70 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-500 block">Accuracy (≥95%)</span>
                <span className="font-bold text-emerald-400">+{finalDuelResult.xpBreakdown.accuracyBonus} XP</span>
              </div>
            </div>
          </div>

          {/* Match Telemetry Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-lg text-xs font-mono">
            <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Your Speed</span>
              <span className="text-base font-bold text-amber-400 mt-0.5 block">
                {finalDuelResult.stats.playerWpm} WPM
              </span>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Rival Speed</span>
              <span className="text-base font-bold text-indigo-300 mt-0.5 block">
                {finalDuelResult.stats.rivalWpm} WPM
              </span>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Accuracy</span>
              <span className="text-base font-bold text-slate-200 mt-0.5 block">
                {finalDuelResult.stats.accuracy}%
              </span>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Time</span>
              <span className="text-base font-bold text-slate-200 mt-0.5 block">
                {finalDuelResult.stats.elapsedSeconds.toFixed(1)}s
              </span>
            </div>
          </div>

          {/* Career Record Strip */}
          <div className="flex items-center gap-4 text-xs font-mono text-slate-400 pt-2">
            <span>Career Duels: <strong className="text-slate-200">{careerStats.duelsWon + careerStats.duelsLost}</strong></span>
            <span>•</span>
            <span>Record: <strong className="text-emerald-400">{careerStats.duelsWon}W</strong> - <strong className="text-rose-400">{careerStats.duelsLost}L</strong></span>
            <span>•</span>
            <span>Career XP: <strong className="text-amber-400">{careerStats.totalDuelXp.toLocaleString()} XP</strong></span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 mt-2 flex-wrap justify-center">
            <button
              onClick={() => loadPassage(difficulty)}
              className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-md"
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
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5"
                id="duel-next-tier-btn"
              >
                <span>Next Difficulty</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onExit}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition-colors"
            >
              Arcade Arena
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
