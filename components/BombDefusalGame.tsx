'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { soundFx } from '@/lib/sound';
import { COMMON_WORDS_200 } from '@/lib/word-banks';
import {
  Bomb,
  RotateCcw,
  Trophy,
  Flame,
  ChevronLeft,
  Sparkles,
  Zap,
  Timer,
  AlertTriangle,
  BatteryCharging,
  ShieldAlert,
  Scissors,
  CheckCircle2,
} from 'lucide-react';

interface BombDefusalGameProps {
  onFinish: (
    score: number,
    bombsDefused: number,
    accuracy: number,
    /**
     * What this run actually measured. The caller needs raw counts, not the
     * rounded accuracy percentage: it derives WPM from real characters over
     * real elapsed time instead of inventing a duration.
     */
    run: { correctKeys: number; totalKeys: number; elapsedSeconds: number }
  ) => void;
  onExit: () => void;
}

const WIRE_COLORS = [
  { name: 'Alpha Red', border: 'border-red-500', bg: 'bg-red-500', text: 'text-red-400' },
  { name: 'Beta Blue', border: 'border-blue-500', bg: 'bg-blue-500', text: 'text-blue-400' },
  { name: 'Gamma Amber', border: 'border-amber-500', bg: 'bg-amber-500', text: 'text-amber-400' },
  { name: 'Delta Emerald', border: 'border-emerald-500', bg: 'bg-emerald-500', text: 'text-emerald-400' },
];

export const BombDefusalGame: React.FC<BombDefusalGameProps> = ({ onFinish, onExit }) => {
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'gameover'>('ready');
  const [bombNumber, setBombNumber] = useState(1);
  const [currentCode, setCurrentCode] = useState('CIPHER');
  const [typedIndex, setTypedIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(9.0);
  const [maxTime, setMaxTime] = useState(9.0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [lives, setLives] = useState(3);
  const [bombsDefused, setBombsDefused] = useState(0);
  const [wireCutSpark, setWireCutSpark] = useState(false);
  const [justDefused, setJustDefused] = useState(false);
  const [totalKeystrokes, setTotalKeystrokes] = useState(0);
  const [correctKeystrokes, setCorrectKeystrokes] = useState(0);

  // Sync refs
  const hasEndedRef = useRef(false);
  const currentCodeRef = useRef(currentCode);
  const typedIndexRef = useRef(typedIndex);
  const scoreRef = useRef(score);
  const comboRef = useRef(combo);
  const maxComboRef = useRef(maxCombo);
  const bombsDefusedRef = useRef(bombsDefused);
  const livesRef = useRef(lives);
  const totalKeysRef = useRef(0);
  const correctKeysRef = useRef(0);
  const startedAtRef = useRef(0);
  const onFinishRef = useRef(onFinish);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    currentCodeRef.current = currentCode;
  }, [currentCode]);

  useEffect(() => {
    typedIndexRef.current = typedIndex;
  }, [typedIndex]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    comboRef.current = combo;
  }, [combo]);

  useEffect(() => {
    maxComboRef.current = maxCombo;
  }, [maxCombo]);

  useEffect(() => {
    bombsDefusedRef.current = bombsDefused;
  }, [bombsDefused]);

  useEffect(() => {
    livesRef.current = lives;
  }, [lives]);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  const getRandomWord = (round: number): string => {
    const minLen = Math.min(4, 3 + Math.floor(round / 5));
    const maxLen = Math.min(9, 5 + Math.floor(round / 4));
    const eligible = COMMON_WORDS_200.filter((w) => w.length >= minLen && w.length <= maxLen);
    const chosen = eligible[Math.floor(Math.random() * eligible.length)] || 'DEFUSE';
    return chosen.toUpperCase();
  };

  const spawnNextBomb = useCallback((nextRound: number) => {
    const nextWord = getRandomWord(nextRound);
    // Base 9 seconds, reduces slightly with rounds down to 5.5s minimum
    const calculatedTime = Math.max(5.5, 9.5 - Math.min(4.0, nextRound * 0.15));

    setCurrentCode(nextWord);
    setTypedIndex(0);
    setTimeLeft(calculatedTime);
    setMaxTime(calculatedTime);
    setJustDefused(false);
  }, []);

  const handleGameOver = useCallback(() => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    setGameState('gameover');
    soundFx.playError();

    const accuracy =
      totalKeysRef.current > 0
        ? Math.round((correctKeysRef.current / totalKeysRef.current) * 100)
        : 100;
    onFinishRef.current(scoreRef.current, bombsDefusedRef.current, accuracy, {
      correctKeys: correctKeysRef.current,
      totalKeys: totalKeysRef.current,
      elapsedSeconds:
        startedAtRef.current > 0 ? (Date.now() - startedAtRef.current) / 1000 : 0,
    });
  }, []);

  // Ticking countdown loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 0.1));
    }, 100);

    return () => clearInterval(timer);
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    if (timeLeft <= 0.05) {
      // Detonation!
      soundFx.playError();
      const newLives = livesRef.current - 1;
      setLives(newLives);
      setCombo(0);

      if (newLives <= 0) {
        handleGameOver();
      } else {
        const nextRound = bombNumber + 1;
        setBombNumber(nextRound);
        spawnNextBomb(nextRound);
      }
    }
  }, [timeLeft, gameState, bombNumber, spawnNextBomb, handleGameOver]);

  const startGame = () => {
    hasEndedRef.current = false;
    totalKeysRef.current = 0;
    correctKeysRef.current = 0;
    startedAtRef.current = Date.now();
    setTotalKeystrokes(0);
    setCorrectKeystrokes(0);
    setGameState('playing');
    setBombNumber(1);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setLives(3);
    setBombsDefused(0);
    spawnNextBomb(1);
  };

  // Keyboard handler for cutting wires
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (gameState !== 'playing' || hasEndedRef.current) return;

      if (e.key.length !== 1 || !/^[a-zA-Z]$/.test(e.key)) {
        return;
      }

      const pressedChar = e.key.toUpperCase();
      totalKeysRef.current += 1;
      setTotalKeystrokes((k) => k + 1);

      const code = currentCodeRef.current;
      const expectedChar = code[typedIndexRef.current];

      if (pressedChar === expectedChar) {
        // Wire cut correctly!
        correctKeysRef.current += 1;
        setCorrectKeystrokes((c) => c + 1);
        soundFx.playKeyClick();
        setWireCutSpark(true);
        setTimeout(() => setWireCutSpark(false), 120);

        const nextIndex = typedIndexRef.current + 1;
        setTypedIndex(nextIndex);

        if (nextIndex >= code.length) {
          // Bomb successfully disarmed!
          soundFx.playCombo();
          setJustDefused(true);

          const newBombsDefused = bombsDefusedRef.current + 1;
          setBombsDefused(newBombsDefused);

          const newCombo = comboRef.current + 1;
          setCombo(newCombo);
          setMaxCombo((m) => Math.max(m, newCombo));

          // Points based on code length, remaining fuse time, and combo
          const timeBonus = Math.round(timeLeft * 25);
          const points = code.length * 40 + timeBonus + newCombo * 20;
          setScore((s) => s + points);

          // Brief celebratory pause before next bomb
          setTimeout(() => {
            const nextRound = bombNumber + 1;
            setBombNumber(nextRound);
            spawnNextBomb(nextRound);
          }, 350);
        }
      } else {
        // Mistyped cut!
        soundFx.playError();
        setCombo(0);
      }
    },
    [gameState, bombNumber, timeLeft, spawnNextBomb]
  );

  useEffect(() => {
    if (gameState === 'playing') {
      containerRef.current?.focus();
    }
  }, [gameState]);

  const accuracy =
    totalKeystrokes > 0 ? Math.round((correctKeystrokes / totalKeystrokes) * 100) : 100;

  const fusePercent = Math.max(0, Math.min(100, (timeLeft / maxTime) * 100));
  const isUrgent = timeLeft <= 2.5;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="w-full max-w-4xl mx-auto flex flex-col items-center select-none outline-none focus:ring-0 focus:outline-none"
      id="bomb-defusal-arena"
    >
      {/* Top HUD */}
      <div className="w-full flex items-center justify-between px-4 py-3 bg-surface border border-border rounded-2xl mb-4 shadow-card">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-2 rounded-xl bg-surface-muted hover:bg-surface-hover border border-border text-text-muted hover:text-text-primary text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Arcade</span>
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-xs font-bold">
            <Bomb className="w-3.5 h-3.5" />
            <span>DEVICE #{bombNumber}</span>
          </div>
        </div>

        {/* Defusal Batteries / Lives */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-text-subtle font-mono mr-1">BATTERIES:</span>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-6 h-3 rounded-sm border transition-colors ${
                i < lives
                  ? 'bg-emerald-500 border-emerald-400 shadow-sm'
                  : 'bg-surface-muted border-border'
              }`}
            />
          ))}
        </div>

        {/* Score & Multiplier */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="text-right">
            <span className="text-text-subtle text-[10px] block">SCORE</span>
            <span className="font-bold text-accent text-sm sm:text-base">{score.toLocaleString()}</span>
          </div>
          <div className="text-right">
            <span className="text-text-subtle text-[10px] block">COMBO</span>
            <span className="font-bold text-primary text-sm sm:text-base">{combo}x</span>
          </div>
        </div>
      </div>

      {/* Main Bomb Defusal Unit Interface */}
      <div className="relative w-full max-w-2xl bg-slate-950 border-4 border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden flex flex-col items-center">
        {/* Metal Screws in corners */}
        <div className="absolute top-3 left-3 w-3 h-3 rounded-full bg-slate-700 border border-slate-600" />
        <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-slate-700 border border-slate-600" />
        <div className="absolute bottom-3 left-3 w-3 h-3 rounded-full bg-slate-700 border border-slate-600" />
        <div className="absolute bottom-3 right-3 w-3 h-3 rounded-full bg-slate-700 border border-slate-600" />

        {/* Digital Countdown Display */}
        <div className="w-full flex items-center justify-between px-4 py-2 bg-slate-900 border-2 border-slate-800 rounded-xl mb-6">
          <div className="flex items-center gap-2">
            <Timer className={`w-5 h-5 ${isUrgent ? 'text-red-500 animate-bounce' : 'text-amber-400'}`} />
            <span className="text-xs font-mono font-bold text-text-subtle tracking-wider uppercase">
              DETONATION FUSE
            </span>
          </div>
          <div className="flex items-baseline gap-1 font-mono">
            <span
              className={`text-2xl sm:text-3xl font-black tracking-widest ${
                isUrgent ? 'text-red-500 animate-pulse' : 'text-amber-400'
              }`}
            >
              {timeLeft.toFixed(1)}s
            </span>
          </div>
        </div>

        {/* Dynamic Burning Fuse Progress Bar */}
        <div className="w-full h-3 bg-slate-900 border border-slate-800 rounded-full overflow-hidden mb-8 p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-100 ${
              isUrgent ? 'bg-red-500' : 'bg-gradient-to-r from-amber-500 to-red-500'
            }`}
            style={{ width: `${fusePercent}%` }}
          />
        </div>

        {/* Central Disarm Code Display */}
        <div className="relative w-full py-8 px-6 bg-slate-900/90 border-2 border-slate-700 rounded-2xl flex flex-col items-center justify-center shadow-inner">
          <span className="text-[11px] font-mono font-bold text-text-subtle mb-3 uppercase tracking-widest flex items-center gap-1.5">
            <Scissors className="w-3.5 h-3.5 text-accent" />
            CIRCUIT DISARM KEY
          </span>

          {/* Letter Tiles Display */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
            {currentCode.split('').map((char, idx) => {
              const isCut = idx < typedIndex;
              const isCurrent = idx === typedIndex;

              return (
                <div
                  key={idx}
                  className={`w-11 h-14 sm:w-14 sm:h-18 rounded-xl flex items-center justify-center font-mono text-2xl sm:text-3xl font-black transition-all ${
                    isCut
                      ? 'bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 scale-95 opacity-80'
                      : isCurrent
                      ? 'bg-accent/20 border-2 border-accent text-accent scale-105 shadow-glow-accent animate-pulse'
                      : 'bg-slate-800/80 border border-slate-700 text-slate-300'
                  }`}
                >
                  {char}
                </div>
              );
            })}
          </div>

          {/* Spark Flash on Wire Cut */}
          {wireCutSpark && (
            <div className="absolute inset-0 pointer-events-none bg-accent/10 rounded-2xl flex items-center justify-center">
              <span className="text-3xl animate-ping">⚡</span>
            </div>
          )}

          {/* Disarmed Flash */}
          {justDefused && (
            <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-sm rounded-2xl flex items-center justify-center gap-2 text-emerald-400 font-mono font-black text-xl animate-fadeIn">
              <CheckCircle2 className="w-7 h-7" />
              <span>CIRCUIT DISARMED!</span>
            </div>
          )}
        </div>

        {/* Color-coded Circuit Wires Visual */}
        <div className="w-full grid grid-cols-4 gap-2 mt-6">
          {WIRE_COLORS.map((wire, idx) => (
            <div
              key={wire.name}
              className={`p-2 rounded-xl bg-slate-900 border ${wire.border} flex flex-col items-center justify-center text-center`}
            >
              <div className={`w-3 h-3 rounded-full ${wire.bg} shadow-sm mb-1`} />
              <span className={`text-[10px] font-mono font-bold ${wire.text}`}>{wire.name}</span>
            </div>
          ))}
        </div>

        {/* Ready Overlay */}
        {gameState === 'ready' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-3xl mb-4 shadow-glow-accent">
              💣
            </div>
            <h2 className="text-2xl font-black text-text-primary">Bomb Squad: Defusal Rush</h2>
            <p className="text-xs sm:text-sm text-text-muted mt-2 max-w-md leading-relaxed">
              High-tension countdown wire cutting. Disarm consecutive explosive devices by typing each code letter before the fuse timer burns down to zero!
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs font-mono text-text-subtle">
              <span className="px-2.5 py-1 rounded-lg bg-surface border border-border text-amber-400">
                1 Active Device at a Time
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-surface border border-border text-accent">
                Wire Spark Mechanical Cuts
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-surface border border-border text-emerald-400">
                3 Battery Reserves
              </span>
            </div>

            <button
              onClick={startGame}
              className="mt-6 px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-glow-accent transition-all hover:scale-105 cursor-pointer"
            >
              Initiate Defusal Protocol
            </button>
          </div>
        )}

        {/* Game Over Modal */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
            <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center text-3xl mb-3">
              💥
            </div>
            <h2 className="text-2xl font-black text-text-primary">Detonation Triggered</h2>
            <p className="text-xs text-text-muted mt-1">Batteries depleted. Outstanding bravery under fire.</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6 w-full max-w-md">
              <div className="p-3 bg-surface rounded-2xl border border-border">
                <span className="text-[10px] text-text-subtle block">FINAL SCORE</span>
                <span className="text-lg font-mono font-bold text-accent">{score.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-surface rounded-2xl border border-border">
                <span className="text-[10px] text-text-subtle block">DISARMED</span>
                <span className="text-lg font-mono font-bold text-primary">{bombsDefused}</span>
              </div>
              <div className="p-3 bg-surface rounded-2xl border border-border">
                <span className="text-[10px] text-text-subtle block">ACCURACY</span>
                <span className="text-lg font-mono font-bold text-success">{accuracy}%</span>
              </div>
              <div className="p-3 bg-surface rounded-2xl border border-border">
                <span className="text-[10px] text-text-subtle block">MAX COMBO</span>
                <span className="text-lg font-mono font-bold text-amber-400">{maxCombo}x</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={startGame}
                className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retry Defusal</span>
              </button>
              <button
                onClick={onExit}
                className="px-5 py-3 rounded-xl bg-surface-muted hover:bg-surface-hover text-text-secondary hover:text-text-primary text-xs font-semibold border border-border transition-colors cursor-pointer"
              >
                Return to Arcade
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Helper Bar */}
      <div className="w-full max-w-2xl mt-3 px-4 py-2 bg-surface border border-border rounded-xl flex items-center justify-between text-xs text-text-muted font-mono">
        <span className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          Type each highlighted letter to cut circuits before the fuse burns out.
        </span>
        <span className="text-text-subtle hidden sm:inline">Defused: {bombsDefused}</span>
      </div>
    </div>
  );
};
