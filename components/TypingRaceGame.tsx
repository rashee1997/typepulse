'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { soundFx } from '@/lib/sound';
import { COMMON_WORDS_200 } from '@/lib/word-banks';
import {
  Award,
  ChevronLeft,
  Crown,
  Flag,
  Flame,
  Gauge,
  RotateCcw,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';

interface TypingRaceGameProps {
  onFinish: (
    xp: number,
    position: number,
    wpm: number,
    accuracy: number,
    /**
     * Raw counts and the measured wall-clock duration. Without the duration the
     * caller logged the race with no elapsed time at all, so the session never
     * contributed to lifetime practice time.
     */
    run: { correctKeys: number; totalKeys: number; elapsedSeconds: number }
  ) => void;
  onExit: () => void;
}

export type RaceDivision = 'amateur' | 'pro' | 'apex';

interface Racer {
  id: string;
  name: string;
  avatar: string;
  color: string;
  accentBorder: string;
  isPlayer: boolean;
  targetWpm: number;
  progress: number; // 0 to 100
  currentWpm: number;
  finishTime?: number;
  place?: number;
}

const DIVISION_CONFIG: Record<
  RaceDivision,
  { label: string; badgeColor: string; baseRivalWpm: number; xpMultiplier: number; description: string }
> = {
  amateur: {
    label: 'Amateur Sprint',
    badgeColor: 'bg-success-subtle text-success border-success-border',
    baseRivalWpm: 42,
    xpMultiplier: 1.0,
    description: 'Entry-level pack (38-48 WPM). Great for warming up consistency.',
  },
  pro: {
    label: 'Pro Championship',
    badgeColor: 'bg-primary-subtle text-primary border-primary-border',
    baseRivalWpm: 68,
    xpMultiplier: 1.5,
    description: 'High-speed pack (62-74 WPM). Demands clean rhythm and minimal mistakes.',
  },
  apex: {
    label: 'Apex Grand Prix',
    badgeColor: 'bg-accent-subtle text-accent border-accent-border',
    baseRivalWpm: 94,
    xpMultiplier: 2.2,
    description: 'Elite speedway (90-104 WPM). Extreme velocity for veteran typists.',
  },
};

const RACER_PROFILES = [
  { id: 'racer-1', name: 'Blaze Runner', avatar: '🏎️', color: 'from-danger to-danger-hover', accentBorder: 'border-danger' },
  { id: 'racer-2', name: 'Shadow Pacer', avatar: '🚙', color: 'from-primary to-primary-hover', accentBorder: 'border-primary' },
  { id: 'racer-3', name: 'Volt Vector', avatar: '⚡', color: 'from-accent to-accent-hover', accentBorder: 'border-accent' },
];

function generateRaceWords(): string[] {
  const chosen: string[] = [];
  for (let i = 0; i < 34; i++) {
    const w = COMMON_WORDS_200[Math.floor(Math.random() * COMMON_WORDS_200.length)];
    chosen.push(w);
  }
  return chosen;
}

function createInitialRacers(div: RaceDivision): Racer[] {
  const config = DIVISION_CONFIG[div];
  const botSpeeds = [
    config.baseRivalWpm + (Math.random() * 8 - 4),
    config.baseRivalWpm - 6 + (Math.random() * 6 - 3),
    config.baseRivalWpm + 5 + (Math.random() * 6 - 3),
  ];

  return [
    {
      id: 'player',
      name: 'Player (You)',
      avatar: '🏎️',
      color: 'from-accent to-accent-hover',
      accentBorder: 'border-accent',
      isPlayer: true,
      targetWpm: 0,
      progress: 0,
      currentWpm: 0,
    },
    ...RACER_PROFILES.map((profile, i) => ({
      ...profile,
      isPlayer: false,
      targetWpm: Math.max(25, Math.round(botSpeeds[i])),
      progress: 0,
      currentWpm: Math.max(25, Math.round(botSpeeds[i])),
    })),
  ];
}

export const TypingRaceGame: React.FC<TypingRaceGameProps> = ({ onFinish, onExit }) => {
  const [division, setDivision] = useState<RaceDivision>('pro');
  const [gameState, setGameState] = useState<'ready' | 'countdown' | 'racing' | 'finished'>('ready');
  const [countdown, setCountdown] = useState<number>(3);

  // Track words
  const [words, setWords] = useState<string[]>(generateRaceWords);
  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [inputVal, setInputVal] = useState('');
  const [typedChars, setTypedChars] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [slipstreamActive, setSlipstreamActive] = useState(false);

  // Racers state
  const [racers, setRacers] = useState<Racer[]>(() => createInitialRacers('pro'));
  const [playerPlace, setPlayerPlace] = useState<number>(1);

  // Telemetry
  const [raceElapsed, setRaceElapsed] = useState<number>(0);
  const [playerWpm, setPlayerWpm] = useState<number>(0);
  const [accuracy, setAccuracy] = useState<number>(100);
  const [calculatedXp, setCalculatedXp] = useState<number>(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const raceStartTimeRef = useRef<number>(0);
  const hasFinishedRef = useRef(false);
  const onFinishRef = useRef(onFinish);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const racersRef = useRef<Racer[]>([]);
  const typedCharsRef = useRef(0);
  const errorCountRef = useRef(0);
  const playerWpmRef = useRef(0);

  useEffect(() => {
    racersRef.current = racers;
  }, [racers]);

  useEffect(() => {
    typedCharsRef.current = typedChars;
  }, [typedChars]);

  useEffect(() => {
    errorCountRef.current = errorCount;
  }, [errorCount]);

  useEffect(() => {
    playerWpmRef.current = playerWpm;
  }, [playerWpm]);

  // A countdown clears itself only when it reaches zero. Leaving the game mid-count
  // used to leave it running against a dead component, flipping state and stealing
  // focus after the player was already back in the dashboard.
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // Cadence metronome sound loop
  useEffect(() => {
    if (gameState !== 'racing') return;
    try {
      const stored = localStorage.getItem('typepulse_preferences');
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (!parsed.cadenceMetronomeEnabled) return;
      const targetWpm = Math.max(10, Math.min(250, parsed.cadenceTargetWpm || 60));
      const intervalMs = Math.max(40, (60 / (targetWpm * 5)) * 1000);
      const vol = parsed.cadenceMetronomeVolume ?? 0.15;
      const timer = setInterval(() => {
        soundFx.playMetronomeTick(false, vol);
      }, intervalMs);
      return () => clearInterval(timer);
    } catch {}
  }, [gameState]);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  // Setup racers based on division
  const setupRacers = useCallback((div: RaceDivision) => {
    const initial = createInitialRacers(div);
    racersRef.current = initial;
    setRacers(initial);
  }, []);

  // Reset / initialize race
  const initRace = useCallback(
    (div: RaceDivision) => {
      hasFinishedRef.current = false;
      setWords(generateRaceWords());
      setCurrentWordIdx(0);
      setInputVal('');
      setTypedChars(0);
      setErrorCount(0);
      setStreak(0);
      setSlipstreamActive(false);
      setRaceElapsed(0);
      setPlayerWpm(0);
      setAccuracy(100);
      setPlayerPlace(1);
      setCalculatedXp(0);
      setupRacers(div);
      setGameState('ready');
    },
    [setupRacers]
  );

  // Start Countdown
  const startCountdown = () => {
    hasFinishedRef.current = false;
    setGameState('countdown');
    setCountdown(3);

    let count = 3;
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
        soundFx.playKeyClick();
      } else if (count === 0) {
        setCountdown(0);
        soundFx.playCombo();
      } else {
        if (countdownRef.current) clearInterval(countdownRef.current);
        countdownRef.current = null;
        setGameState('racing');
        raceStartTimeRef.current = Date.now();
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    }, 900);
  };

  // Calculate live rankings
  const updateRankings = (currentRacers: Racer[]): { sorted: Racer[]; playerRank: number } => {
    const sorted = [...currentRacers].sort((a, b) => {
      const aDone = a.progress >= 100 || a.finishTime !== undefined;
      const bDone = b.progress >= 100 || b.finishTime !== undefined;

      // Finished racers rank first, ordered by finishTime (earliest timestamp wins)
      if (aDone && bDone) {
        return (a.finishTime ?? Infinity) - (b.finishTime ?? Infinity);
      }
      if (aDone) return -1;
      if (bDone) return 1;

      // In-flight racers rank by progress (highest first), then by speed
      if (b.progress !== a.progress) {
        return b.progress - a.progress;
      }
      return (b.currentWpm ?? 0) - (a.currentWpm ?? 0);
    });

    const playerIndex = sorted.findIndex((r) => r.isPlayer);
    return { sorted, playerRank: playerIndex + 1 };
  };

  // Complete the Race
  const completeRace = useCallback(
    (
      finalPlace: number,
      finalWpm: number,
      finalAcc: number,
      run: { correctKeys: number; totalKeys: number; elapsedSeconds: number }
    ) => {
      if (hasFinishedRef.current) return;
      hasFinishedRef.current = true;
      setGameState('finished');

      const config = DIVISION_CONFIG[division];
      // Placement XP
      const placeBonus = finalPlace === 1 ? 260 : finalPlace === 2 ? 160 : finalPlace === 3 ? 90 : 40;
      // Base XP
      const baseCompletion = 120;
      // Accuracy and Speed Bonus
      const accBonus = finalAcc >= 95 ? 60 : finalAcc >= 90 ? 30 : 0;
      const speedBonus = Math.round(finalWpm * 1.2);

      const totalXp = Math.round((baseCompletion + placeBonus + accBonus + speedBonus) * config.xpMultiplier);
      setCalculatedXp(totalXp);

      if (finalPlace <= 3) {
        soundFx.playSuccess();
      } else {
        soundFx.playCombo();
      }

      onFinishRef.current(totalXp, finalPlace, finalWpm, finalAcc, run);
    },
    [division]
  );

  // AI bot racing simulation loop
  useEffect(() => {
    if (gameState !== 'racing') return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.max(1, (now - raceStartTimeRef.current) / 1000);
      setRaceElapsed(elapsed);

      setRacers((prev) => {
        let playerFinished = false;

        const updated = prev.map((racer) => {
          if (racer.isPlayer) {
            if (racer.progress >= 100) {
              playerFinished = true;
            }
            return racer;
          }

          // Bot progress: targetWpm * 5 chars/word, with subtle organic variance
          const variance = Math.sin(elapsed * 0.8 + racer.id.charCodeAt(6)) * 0.05 + 1;
          const currentBotWpm = racer.targetWpm * variance;
          const wordsCompleted = (currentBotWpm / 60) * elapsed;
          const botProgress = Math.min(100, Math.round((wordsCompleted / words.length) * 100));

          return {
            ...racer,
            progress: botProgress,
            currentWpm: Math.round(currentBotWpm),
            finishTime: botProgress >= 100 && !racer.finishTime ? now : racer.finishTime,
          };
        });

        racersRef.current = updated;
        const { playerRank } = updateRankings(updated);
        setTimeout(() => {
          setPlayerPlace(playerRank);
          if (playerFinished && !hasFinishedRef.current) {
            const currentTyped = typedCharsRef.current;
            const currentErr = errorCountRef.current;
            const currentAcc = currentTyped > 0 ? Math.max(0, Math.round(((currentTyped - currentErr) / currentTyped) * 100)) : 100;
            completeRace(playerRank, playerWpmRef.current, currentAcc, {
              correctKeys: Math.max(0, currentTyped - currentErr),
              totalKeys: currentTyped,
              elapsedSeconds: Math.max(0, (Date.now() - raceStartTimeRef.current) / 1000),
            });
          }
        }, 0);

        return updated;
      });
    }, 120);

    return () => clearInterval(interval);
  }, [gameState, words.length, completeRace]);

  // Handle Input Changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (gameState !== 'racing') return;
    const value = e.target.value;
    const currentTarget = words[currentWordIdx] || '';

    // Handle spacebar submission or exact match with trailing space
    if (value.endsWith(' ')) {
      const trimmed = value.trim();
      const isCorrect = trimmed === currentTarget;

      const keysSoFar = typedChars + currentTarget.length + 1;
      setTypedChars(keysSoFar);

      if (isCorrect) {
        soundFx.playKeyClick();
        const nextIdx = currentWordIdx + 1;
        setCurrentWordIdx(nextIdx);
        setInputVal('');

        const newStreak = streak + 1;
        setStreak(newStreak);

        // Trigger slipstream turbo boost at 5+ streak
        if (newStreak >= 5 && !slipstreamActive) {
          setSlipstreamActive(true);
          soundFx.playCombo();
        }

        // Calculate player progress and standard WPM
        const newProgress = Math.min(100, Math.round((nextIdx / words.length) * 100));
        const elapsed = Math.max(0.5, (Date.now() - raceStartTimeRef.current) / 1000);
        const wpm = Math.max(0, Math.round(((keysSoFar / 5) / (elapsed / 60))));
        setPlayerWpm(wpm);

        const currentAcc = Math.max(0, Math.round(((keysSoFar - errorCount) / keysSoFar) * 100));
        setAccuracy(currentAcc);

        const runMeasurement = {
          correctKeys: Math.max(0, keysSoFar - errorCount),
          totalKeys: keysSoFar,
          elapsedSeconds: elapsed,
        };

        const now = Date.now();
        const updatedRacers = racersRef.current.map((r) =>
          r.isPlayer
            ? {
                ...r,
                progress: newProgress,
                currentWpm: wpm,
                finishTime: newProgress >= 100 ? (r.finishTime || now) : undefined,
              }
            : r
        );
        racersRef.current = updatedRacers;
        setRacers(updatedRacers);

        if (nextIdx >= words.length) {
          const { playerRank } = updateRankings(updatedRacers);
          setPlayerPlace(playerRank);
          completeRace(playerRank, wpm, currentAcc, runMeasurement);
        }
      } else {
        // Mistake made
        soundFx.playError();
        setErrorCount((prev) => prev + 1);
        setStreak(0);
        setSlipstreamActive(false);
      }
      return;
    }

    // Typing in progress
    setInputVal(value);
    if (!currentTarget.startsWith(value)) {
      // Only penalize if transitioning from correct to error
      if (currentTarget.startsWith(inputVal)) {
        soundFx.playError();
        setErrorCount((prev) => prev + 1);
        setStreak(0);
        setSlipstreamActive(false);
      }
    } else {
      soundFx.playKeyClick();
    }
  };

  const currentTargetWord = words[currentWordIdx] || '';

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-5 animate-fadeIn" id="typing-race-game">
      {/* Top Header & Division Selector */}
      <div className="bg-surface border border-border rounded-3xl p-5 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-2.5 rounded-xl bg-surface-hover hover:bg-surface-active text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1 text-xs font-semibold border border-border"
            id="race-exit-btn"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Arcade</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-accent-subtle text-accent font-mono text-[10px] font-bold tracking-wider border border-accent-border flex items-center gap-1">
                <Flag className="w-3 h-3" />
                GRAND PRIX CIRCUIT
              </span>
              <span className="text-xs text-text-subtle font-mono">4-Racer Asphalt Derby</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-text-primary mt-0.5">Typing Race</h1>
          </div>
        </div>

        {/* Division Selector */}
        <div className="flex items-center gap-1.5 bg-surface-muted p-1 rounded-2xl border border-border">
          {(['amateur', 'pro', 'apex'] as RaceDivision[]).map((div) => {
            const active = division === div;
            const conf = DIVISION_CONFIG[div];
            return (
              <button
                key={div}
                disabled={gameState === 'racing' || gameState === 'countdown'}
                onClick={() => {
                  setDivision(div);
                  initRace(div);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all capitalize ${
                  active
                    ? 'bg-accent text-accent-foreground shadow-sm font-extrabold'
                    : 'text-text-muted hover:text-text-primary disabled:opacity-50'
                }`}
              >
                {conf.label.split(' ')[0]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Racetrack Visualizer - 4 High-Octane Lanes */}
      <div className="relative bg-gradient-to-b from-surface via-surface-muted to-surface border-2 border-border rounded-3xl p-5 sm:p-6 shadow-card overflow-hidden">
        {/* Live Race Telemetry Bar */}
        <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-border">
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 bg-surface-muted px-3 py-1.5 rounded-xl border border-border">
              <Gauge className="w-4 h-4 text-accent" />
              <span className="text-text-muted">Velocity:</span>
              <span className="text-accent font-bold">{playerWpm} WPM</span>
            </div>

            <div className="flex items-center gap-1.5 bg-surface-muted px-3 py-1.5 rounded-xl border border-border">
              <Flame className={`w-4 h-4 ${slipstreamActive ? 'text-accent animate-pulse' : 'text-text-subtle'}`} />
              <span className="text-text-muted">Streak:</span>
              <span className={slipstreamActive ? 'text-accent font-bold' : 'text-text-secondary'}>
                {streak} {slipstreamActive && '🔥 TURBO'}
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 bg-surface-muted px-3 py-1.5 rounded-xl border border-border">
              <span className="text-text-muted">Laps:</span>
              <span className="text-text-primary font-bold">
                {currentWordIdx} / {words.length} Words
              </span>
            </div>
          </div>

          {/* Current Placement Badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted font-mono hidden md:inline">Track Rank:</span>
            <div
              className={`px-3 py-1 rounded-xl text-xs font-black font-mono flex items-center gap-1 border shadow-sm ${
                playerPlace === 1
                  ? 'bg-accent-subtle border-accent text-accent animate-pulse'
                  : playerPlace === 2
                  ? 'bg-surface-active border-border-hover text-text-primary'
                  : playerPlace === 3
                  ? 'bg-primary-subtle border-primary-border text-primary'
                  : 'bg-surface-muted border-border text-text-muted'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              <span>
                {playerPlace === 1
                  ? '1st Place 🥇'
                  : playerPlace === 2
                  ? '2nd Place 🥈'
                  : playerPlace === 3
                  ? '3rd Place 🥉'
                  : '4th Place 🏁'}
              </span>
            </div>
          </div>
        </div>

        {/* 4 Lanes */}
        <div className="flex flex-col gap-3 relative">
          {racers.map((racer, index) => {
            const isUser = racer.isPlayer;
            return (
              <div
                key={racer.id}
                className={`relative p-2.5 sm:p-3 rounded-2xl border transition-all ${
                  isUser
                    ? 'bg-accent-subtle border-accent-border shadow-card'
                    : 'bg-surface border-border'
                }`}
              >
                {/* Lane Info */}
                <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-text-subtle font-bold text-[10px]">LANE {index + 1}</span>
                    <span className={`font-bold ${isUser ? 'text-accent' : 'text-text-primary'}`}>
                      {racer.name}
                    </span>
                    {isUser && slipstreamActive && (
                      <span className="px-1.5 py-0.2 bg-accent text-accent-foreground text-[9px] font-black rounded uppercase">
                        SLIPSTREAM
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-text-muted">{racer.currentWpm} WPM</span>
                    <span className="font-bold text-text-primary">{racer.progress}%</span>
                  </div>
                </div>

                {/* Asphalt Lane Track */}
                <div className="relative h-7 bg-surface-muted rounded-xl border border-border overflow-hidden flex items-center px-1">
                  {/* Dashed center road line */}
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-border pointer-events-none" />

                  {/* Finish Line Checkered Strip */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-5 bg-[repeating-conic-gradient(var(--surface-active)_0_90deg,var(--surface-muted)_0_180deg)] [background-size:8px_8px] opacity-60 border-l border-accent-border"
                    title="Finish Line"
                  />

                  {/* Racer Vehicle on Track */}
                  <div
                    className="absolute transition-all duration-150 ease-out flex items-center"
                    style={{ left: `calc(${Math.min(92, racer.progress * 0.92)}%)` }}
                  >
                    <div
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-lg shadow-sm border text-sm select-none ${
                        isUser
                          ? 'bg-accent border-accent-border text-accent-foreground font-black shadow-glow-accent-sm'
                          : 'bg-surface-active border-border text-text-primary font-bold'
                      }`}
                    >
                      <span>{racer.avatar}</span>
                      <span className="text-[10px] font-mono">{racer.progress}%</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Typing Area */}
      {gameState === 'ready' && (
        <div className="bg-surface border border-border rounded-3xl p-8 text-center flex flex-col items-center justify-center gap-4 shadow-card">
          <div className="w-16 h-16 rounded-3xl bg-accent-subtle border border-accent-border text-accent flex items-center justify-center text-3xl shadow-inner">
            🏎️
          </div>
          <div>
            <h2 className="text-2xl font-black text-text-primary">Ready for Grand Prix Sprint?</h2>
            <p className="text-sm text-text-muted mt-1 max-w-md">
              Race 4 cars across a 34-word circuit. Type accurately and maintain speed to draft past the competition and take 1st place!
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 my-2 text-xs font-mono text-text-muted">
            <span className="px-3 py-1 rounded-xl bg-surface-muted border border-border">
              League: <strong className="text-accent">{DIVISION_CONFIG[division].label}</strong>
            </span>
            <span className="px-3 py-1 rounded-xl bg-surface-muted border border-border">
              Rivals: <strong>3 AI Drivers</strong>
            </span>
            <span className="px-3 py-1 rounded-xl bg-surface-muted border border-border text-accent">
              1st Place Reward: <strong>~{Math.round(420 * DIVISION_CONFIG[division].xpMultiplier)} XP</strong>
            </span>
          </div>

          <button
            onClick={startCountdown}
            className="px-8 py-4 bg-accent hover:bg-accent-hover text-accent-foreground font-black rounded-2xl text-base shadow-glow-accent hover:scale-105 transition-all flex items-center gap-2"
            id="start-typing-race-btn"
          >
            <Flag className="w-5 h-5 fill-accent-foreground" />
            <span>START RACE</span>
          </button>
        </div>
      )}

      {gameState === 'countdown' && (
        <div className="bg-surface border border-border rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-4 shadow-card">
          <span className="text-xs text-accent font-mono tracking-widest uppercase">REV YOUR ENGINES</span>
          <div className="text-7xl font-black font-mono text-accent animate-ping">
            {countdown > 0 ? countdown : 'GO!'}
          </div>
          <p className="text-sm text-text-muted">Get your fingers positioned on home row!</p>
        </div>
      )}

      {gameState === 'racing' && (
        <div className="bg-surface border border-border rounded-3xl p-6 shadow-card flex flex-col gap-4">
          {/* Word Ribbon */}
          <div className="bg-surface-muted p-4 rounded-2xl border border-border flex flex-wrap items-center gap-2 font-mono text-base sm:text-lg min-h-[80px]">
            {words.map((word, idx) => {
              const isPast = idx < currentWordIdx;
              const isCurrent = idx === currentWordIdx;

              if (isPast) {
                return (
                  <span key={idx} className="text-success line-through opacity-70">
                    {word}
                  </span>
                );
              }

              if (isCurrent) {
                return (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-xl bg-accent text-accent-foreground font-bold shadow-sm scale-105 transition-transform"
                  >
                    {word}
                  </span>
                );
              }

              return (
                <span key={idx} className="text-text-muted">
                  {word}
                </span>
              );
            })}
          </div>

          {/* Active Input Box */}
          <div className="relative flex flex-col gap-2">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={inputVal}
                onChange={handleInputChange}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck="false"
                placeholder={`Type "${currentTargetWord}" and press Space...`}
                className="w-full bg-surface-muted border-2 border-accent-border focus:border-accent focus:outline-none rounded-2xl px-5 py-4 text-lg font-mono text-text-primary placeholder:text-text-subtle shadow-inner"
                id="race-active-input"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span className="text-xs text-text-subtle font-mono hidden sm:inline">Press Space to pass</span>
                <span className="px-2 py-1 rounded-lg bg-surface border border-border text-accent text-xs font-mono font-bold">
                  Space ␣
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Finished Podium & Distinct XP Rewards */}
      {gameState === 'finished' && (
        <div className="bg-surface border-2 border-accent-border rounded-3xl p-6 sm:p-8 shadow-dialog flex flex-col items-center text-center gap-6 animate-fadeIn">
          {/* Trophy & Placement Celebration */}
          <div className="flex flex-col items-center gap-2">
            <div
              className={`w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-glow-accent border ${
                playerPlace === 1
                  ? 'bg-accent-subtle border-accent text-accent'
                  : playerPlace === 2
                  ? 'bg-surface-active border-border-hover text-text-primary'
                  : playerPlace === 3
                  ? 'bg-primary-subtle border-primary-border text-primary'
                  : 'bg-surface-muted border-border text-text-muted'
              }`}
            >
              {playerPlace === 1 ? '🏆' : playerPlace === 2 ? '🥈' : playerPlace === 3 ? '🥉' : '🏁'}
            </div>

            <span className="px-3 py-1 rounded-full bg-accent-subtle border border-accent-border text-accent text-xs font-mono font-bold uppercase">
              RACE FINISHED • {DIVISION_CONFIG[division].label}
            </span>

            <h2 className="text-3xl sm:text-4xl font-black text-text-primary mt-1">
              {playerPlace === 1
                ? 'VICTORY! 1st Place Champion'
                : playerPlace === 2
                ? 'Runner Up! 2nd Place Podium'
                : playerPlace === 3
                ? 'Podium Finish! 3rd Place'
                : 'Race Completed! 4th Place'}
            </h2>
            <p className="text-sm text-text-muted max-w-lg">
              {playerPlace === 1
                ? 'Flawless driving! You outpaced all 3 rivals to claim the Grand Prix Gold Trophy.'
                : 'Intense competition on the asphalt! Review your telemetry and take the championship.'}
            </p>
          </div>

          {/* Telemetry Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl">
            <div className="p-3 bg-surface-muted rounded-2xl border border-border">
              <span className="text-[11px] text-text-subtle block">Final Speed</span>
              <span className="text-xl font-mono font-bold text-accent mt-0.5 block">{playerWpm} WPM</span>
            </div>

            <div className="p-3 bg-surface-muted rounded-2xl border border-border">
              <span className="text-[11px] text-text-subtle block">Accuracy</span>
              <span className="text-xl font-mono font-bold text-success mt-0.5 block">{accuracy}%</span>
            </div>

            <div className="p-3 bg-surface-muted rounded-2xl border border-border">
              <span className="text-[11px] text-text-subtle block">Race Duration</span>
              <span className="text-xl font-mono font-bold text-text-primary mt-0.5 block">
                {raceElapsed.toFixed(1)}s
              </span>
            </div>

            <div className="p-3 bg-surface-muted rounded-2xl border border-border">
              <span className="text-[11px] text-text-subtle block">Max Streak</span>
              <span className="text-xl font-mono font-bold text-primary mt-0.5 block">{streak} Words</span>
            </div>
          </div>

          {/* Distinct XP Reward Box */}
          <div className="w-full max-w-md bg-accent-subtle border border-accent-border rounded-2xl p-4 flex items-center justify-between shadow-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/20 text-accent flex items-center justify-center text-xl font-bold">
                ⚡
              </div>
              <div className="text-left">
                <span className="text-[11px] text-text-muted font-mono block">DISTINCT XP REWARD</span>
                <span className="text-xl font-black text-accent font-mono">+{calculatedXp} XP EARNED</span>
              </div>
            </div>
            <div className="text-right text-[11px] font-mono text-text-muted">
              <span className="block text-success font-bold">Credited to Profile</span>
              <span>{DIVISION_CONFIG[division].xpMultiplier}x Multiplier</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => initRace(division)}
              className="px-6 py-3 bg-accent hover:bg-accent-hover text-accent-foreground font-black rounded-xl text-sm transition-all shadow-glow-accent-sm hover:scale-105 flex items-center gap-2"
              id="rematch-race-btn"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Rematch Race</span>
            </button>

            <button
              onClick={onExit}
              className="px-6 py-3 bg-surface-hover hover:bg-surface-active text-text-primary border border-border font-bold rounded-xl text-sm transition-colors flex items-center gap-2"
              id="exit-to-arcade-btn"
            >
              <span>Back to Word Games</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
