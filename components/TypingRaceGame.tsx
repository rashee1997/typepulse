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
  onFinish: (xp: number, position: number, wpm: number, accuracy: number) => void;
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
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    baseRivalWpm: 42,
    xpMultiplier: 1.0,
    description: 'Entry-level pack (38-48 WPM). Great for warming up consistency.',
  },
  pro: {
    label: 'Pro Championship',
    badgeColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    baseRivalWpm: 68,
    xpMultiplier: 1.5,
    description: 'High-speed pack (62-74 WPM). Demands clean rhythm and minimal mistakes.',
  },
  apex: {
    label: 'Apex Grand Prix',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    baseRivalWpm: 94,
    xpMultiplier: 2.2,
    description: 'Elite speedway (90-104 WPM). Extreme velocity for veteran typists.',
  },
};

const RACER_PROFILES = [
  { id: 'racer-1', name: 'Blaze Runner', avatar: '🏎️', color: 'from-rose-500 to-red-600', accentBorder: 'border-rose-500' },
  { id: 'racer-2', name: 'Shadow Pacer', avatar: '🚙', color: 'from-indigo-500 to-purple-600', accentBorder: 'border-indigo-500' },
  { id: 'racer-3', name: 'Volt Vector', avatar: '⚡', color: 'from-amber-400 to-orange-500', accentBorder: 'border-amber-400' },
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
      color: 'from-amber-400 to-amber-500',
      accentBorder: 'border-amber-400',
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

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  // Setup racers based on division
  const setupRacers = useCallback((div: RaceDivision) => {
    setRacers(createInitialRacers(div));
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
    const timer = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
        soundFx.playKeyClick();
      } else if (count === 0) {
        setCountdown(0);
        soundFx.playCombo();
      } else {
        clearInterval(timer);
        setGameState('racing');
        raceStartTimeRef.current = Date.now();
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    }, 900);
  };

  // Calculate live rankings
  const updateRankings = (currentRacers: Racer[]): { sorted: Racer[]; playerRank: number } => {
    const sorted = [...currentRacers].sort((a, b) => {
      if (b.progress !== a.progress) {
        return b.progress - a.progress;
      }
      return (b.finishTime || Infinity) - (a.finishTime || Infinity);
    });

    const playerIndex = sorted.findIndex((r) => r.isPlayer);
    return { sorted, playerRank: playerIndex + 1 };
  };

  // Complete the Race
  const completeRace = useCallback(
    (finalPlace: number, finalWpm: number, finalAcc: number) => {
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

      onFinishRef.current(totalXp, finalPlace, finalWpm, finalAcc);
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
        let finalPlace = 1;

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

        // Determine rankings
        const { playerRank } = updateRankings(updated);
        setPlayerPlace(playerRank);
        finalPlace = playerRank;

        // Check if player crossed finish line
        if (playerFinished && !hasFinishedRef.current) {
          const currentAcc = typedChars > 0 ? Math.max(0, Math.round(((typedChars - errorCount) / typedChars) * 100)) : 100;
          completeRace(finalPlace, playerWpm, currentAcc);
        }

        return updated;
      });
    }, 120);

    return () => clearInterval(interval);
  }, [gameState, words.length, typedChars, errorCount, playerWpm, completeRace]);

  // Handle Input Changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (gameState !== 'racing') return;
    const value = e.target.value;
    const currentTarget = words[currentWordIdx] || '';

    // Handle spacebar submission or exact match with trailing space
    if (value.endsWith(' ')) {
      const trimmed = value.trim();
      const isCorrect = trimmed === currentTarget;

      setTypedChars((prev) => prev + currentTarget.length + 1);

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

        // Calculate player progress
        const newProgress = Math.min(100, Math.round((nextIdx / words.length) * 100));
        const elapsed = Math.max(1, (Date.now() - raceStartTimeRef.current) / 1000);
        const wpm = Math.round((nextIdx / elapsed) * 60);
        setPlayerWpm(wpm);

        const currentAcc = Math.max(0, Math.round(((typedChars - errorCount) / Math.max(1, typedChars)) * 100));
        setAccuracy(currentAcc);

        setRacers((prev) =>
          prev.map((r) =>
            r.isPlayer
              ? {
                  ...r,
                  progress: newProgress,
                  currentWpm: wpm,
                  finishTime: newProgress >= 100 ? Date.now() : undefined,
                }
              : r
          )
        );

        if (nextIdx >= words.length) {
          const { playerRank } = updateRankings(racers);
          completeRace(playerRank, wpm, currentAcc);
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
      soundFx.playError();
      setErrorCount((prev) => prev + 1);
      setStreak(0);
      setSlipstreamActive(false);
    } else {
      soundFx.playKeyClick();
    }
  };

  const currentTargetWord = words[currentWordIdx] || '';

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-5 animate-fadeIn" id="typing-race-game">
      {/* Top Header & Division Selector */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-xs font-semibold"
            id="race-exit-btn"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Arcade</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-mono text-[10px] font-bold tracking-wider border border-amber-400/30 flex items-center gap-1">
                <Flag className="w-3 h-3" />
                GRAND PRIX CIRCUIT
              </span>
              <span className="text-xs text-slate-500 font-mono">4-Racer Asphalt Derby</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-100 mt-0.5">Typing Race</h1>
          </div>
        </div>

        {/* Division Selector */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800/80">
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
                    ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-slate-200 disabled:opacity-50'
                }`}
              >
                {conf.label.split(' ')[0]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Racetrack Visualizer - 4 High-Octane Lanes */}
      <div className="relative bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-2 border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl overflow-hidden">
        {/* Asphalt Texture and Track Markings */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        {/* Live Race Telemetry Bar */}
        <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
              <Gauge className="w-4 h-4 text-amber-400" />
              <span className="text-slate-400">Velocity:</span>
              <span className="text-amber-400 font-bold">{playerWpm} WPM</span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
              <Flame className={`w-4 h-4 ${slipstreamActive ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
              <span className="text-slate-400">Streak:</span>
              <span className={slipstreamActive ? 'text-amber-300 font-bold' : 'text-slate-300'}>
                {streak} {slipstreamActive && '🔥 TURBO'}
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-slate-400">Laps:</span>
              <span className="text-slate-200 font-bold">
                {currentWordIdx} / {words.length} Words
              </span>
            </div>
          </div>

          {/* Current Placement Badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono hidden md:inline">Track Rank:</span>
            <div
              className={`px-3 py-1 rounded-xl text-xs font-black font-mono flex items-center gap-1 border shadow-sm ${
                playerPlace === 1
                  ? 'bg-amber-400/20 border-amber-400 text-amber-300 animate-pulse'
                  : playerPlace === 2
                  ? 'bg-slate-300/20 border-slate-300 text-slate-200'
                  : playerPlace === 3
                  ? 'bg-amber-700/20 border-amber-700 text-amber-500'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
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
                    ? 'bg-gradient-to-r from-amber-500/10 via-slate-900/90 to-amber-500/5 border-amber-500/50 shadow-lg'
                    : 'bg-slate-950/60 border-slate-800/80'
                }`}
              >
                {/* Lane Info */}
                <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-bold text-[10px]">LANE {index + 1}</span>
                    <span className={`font-bold ${isUser ? 'text-amber-400' : 'text-slate-300'}`}>
                      {racer.name}
                    </span>
                    {isUser && slipstreamActive && (
                      <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 text-[9px] font-black rounded uppercase">
                        SLIPSTREAM
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-slate-400">{racer.currentWpm} WPM</span>
                    <span className="font-bold text-slate-200">{racer.progress}%</span>
                  </div>
                </div>

                {/* Asphalt Lane Track */}
                <div className="relative h-7 bg-slate-950 rounded-xl border border-slate-800/90 overflow-hidden flex items-center px-1">
                  {/* Dashed center road line */}
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-slate-800 pointer-events-none" />

                  {/* Finish Line Checkered Strip */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-5 bg-[repeating-conic-gradient(#fff_0_90deg,#000_0_180deg)] [background-size:8px_8px] opacity-40 border-l border-amber-400/50"
                    title="Finish Line"
                  />

                  {/* Racer Vehicle on Track */}
                  <div
                    className="absolute transition-all duration-150 ease-out flex items-center"
                    style={{ left: `calc(${Math.min(92, racer.progress * 0.92)}%)` }}
                  >
                    <div
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-lg shadow-md border text-sm select-none ${
                        isUser
                          ? 'bg-amber-400 border-amber-300 text-slate-950 font-black shadow-amber-400/30'
                          : 'bg-slate-800 border-slate-700 text-slate-200 font-bold'
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
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center flex flex-col items-center justify-center gap-4 shadow-xl">
          <div className="w-16 h-16 rounded-3xl bg-amber-400/10 border border-amber-400/30 text-amber-400 flex items-center justify-center text-3xl shadow-inner">
            🏎️
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-100">Ready for Grand Prix Sprint?</h2>
            <p className="text-sm text-slate-400 mt-1 max-w-md">
              Race 4 cars across a 34-word circuit. Type accurately and maintain speed to draft past the competition and take 1st place!
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 my-2 text-xs font-mono text-slate-400">
            <span className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800">
              League: <strong className="text-amber-400">{DIVISION_CONFIG[division].label}</strong>
            </span>
            <span className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800">
              Rivals: <strong>3 AI Drivers</strong>
            </span>
            <span className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-amber-400">
              1st Place Reward: <strong>~{Math.round(420 * DIVISION_CONFIG[division].xpMultiplier)} XP</strong>
            </span>
          </div>

          <button
            onClick={startCountdown}
            className="px-8 py-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black rounded-2xl text-base shadow-xl hover:scale-105 transition-all flex items-center gap-2"
            id="start-typing-race-btn"
          >
            <Flag className="w-5 h-5 fill-slate-950" />
            <span>START RACE</span>
          </button>
        </div>
      )}

      {gameState === 'countdown' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-4 shadow-xl">
          <span className="text-xs text-amber-400 font-mono tracking-widest uppercase">REV YOUR ENGINES</span>
          <div className="text-7xl font-black font-mono text-amber-400 animate-ping">
            {countdown > 0 ? countdown : 'GO!'}
          </div>
          <p className="text-sm text-slate-400">Get your fingers positioned on home row!</p>
        </div>
      )}

      {gameState === 'racing' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
          {/* Word Ribbon */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/90 flex flex-wrap items-center gap-2 font-mono text-base sm:text-lg min-h-[80px]">
            {words.map((word, idx) => {
              const isPast = idx < currentWordIdx;
              const isCurrent = idx === currentWordIdx;

              if (isPast) {
                return (
                  <span key={idx} className="text-emerald-400 line-through opacity-70">
                    {word}
                  </span>
                );
              }

              if (isCurrent) {
                return (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-xl bg-amber-400 text-slate-950 font-bold shadow-md scale-105 transition-transform"
                  >
                    {word}
                  </span>
                );
              }

              return (
                <span key={idx} className="text-slate-500">
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
                className="w-full bg-slate-950 border-2 border-amber-400/70 focus:border-amber-400 focus:outline-none rounded-2xl px-5 py-4 text-lg font-mono text-slate-100 placeholder-slate-600 shadow-inner"
                id="race-active-input"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span className="text-xs text-slate-500 font-mono hidden sm:inline">Press Space to pass</span>
                <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-amber-400 text-xs font-mono font-bold">
                  Space ␣
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Finished Podium & Distinct XP Rewards */}
      {gameState === 'finished' && (
        <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-amber-400/50 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center gap-6 animate-fadeIn">
          {/* Trophy & Placement Celebration */}
          <div className="flex flex-col items-center gap-2">
            <div
              className={`w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-2xl border ${
                playerPlace === 1
                  ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                  : playerPlace === 2
                  ? 'bg-slate-300/20 border-slate-300 text-slate-200'
                  : playerPlace === 3
                  ? 'bg-amber-700/20 border-amber-700 text-amber-500'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {playerPlace === 1 ? '🏆' : playerPlace === 2 ? '🥈' : playerPlace === 3 ? '🥉' : '🏁'}
            </div>

            <span className="px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-mono font-bold uppercase">
              RACE FINISHED • {DIVISION_CONFIG[division].label}
            </span>

            <h2 className="text-3xl sm:text-4xl font-black text-slate-100 mt-1">
              {playerPlace === 1
                ? 'VICTORY! 1st Place Champion'
                : playerPlace === 2
                ? 'Runner Up! 2nd Place Podium'
                : playerPlace === 3
                ? 'Podium Finish! 3rd Place'
                : 'Race Completed! 4th Place'}
            </h2>
            <p className="text-sm text-slate-400 max-w-lg">
              {playerPlace === 1
                ? 'Flawless driving! You outpaced all 3 rivals to claim the Grand Prix Gold Trophy.'
                : 'Intense competition on the asphalt! Review your telemetry and take the championship.'}
            </p>
          </div>

          {/* Telemetry Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl">
            <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800">
              <span className="text-[11px] text-slate-500 block">Final Speed</span>
              <span className="text-xl font-mono font-bold text-amber-400 mt-0.5 block">{playerWpm} WPM</span>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800">
              <span className="text-[11px] text-slate-500 block">Accuracy</span>
              <span className="text-xl font-mono font-bold text-emerald-400 mt-0.5 block">{accuracy}%</span>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800">
              <span className="text-[11px] text-slate-500 block">Race Duration</span>
              <span className="text-xl font-mono font-bold text-slate-200 mt-0.5 block">
                {raceElapsed.toFixed(1)}s
              </span>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800">
              <span className="text-[11px] text-slate-500 block">Max Streak</span>
              <span className="text-xl font-mono font-bold text-indigo-300 mt-0.5 block">{streak} Words</span>
            </div>
          </div>

          {/* Distinct XP Reward Box */}
          <div className="w-full max-w-md bg-gradient-to-r from-amber-500/20 via-slate-950 to-amber-500/10 border border-amber-400/40 rounded-2xl p-4 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center text-xl font-bold">
                ⚡
              </div>
              <div className="text-left">
                <span className="text-[11px] text-slate-400 font-mono block">DISTINCT XP REWARD</span>
                <span className="text-xl font-black text-amber-300 font-mono">+{calculatedXp} XP EARNED</span>
              </div>
            </div>
            <div className="text-right text-[11px] font-mono text-slate-400">
              <span className="block text-emerald-400 font-bold">Credited to Profile</span>
              <span>{DIVISION_CONFIG[division].xpMultiplier}x Multiplier</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => initRace(division)}
              className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-sm transition-all shadow-lg hover:scale-105 flex items-center gap-2"
              id="rematch-race-btn"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Rematch Race</span>
            </button>

            <button
              onClick={onExit}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-sm transition-colors flex items-center gap-2"
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
