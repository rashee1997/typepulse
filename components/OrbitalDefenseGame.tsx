'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { soundFx } from '@/lib/sound';
import { COMMON_WORDS_200 } from '@/lib/word-banks';
import {
  Shield,
  Zap,
  RotateCcw,
  Trophy,
  Flame,
  Radio,
  ChevronLeft,
  Sparkles,
  Crosshair,
  Bomb,
  Heart,
  AlertTriangle,
} from 'lucide-react';

interface OrbitalDefenseGameProps {
  onFinish: (score: number, wordsDestroyed: number, accuracy: number) => void;
  onExit: () => void;
}

interface EnemyShip {
  id: string;
  word: string;
  typedLetters: number;
  x: number; // percentage horizontally (8% to 80%)
  y: number; // percentage vertically (5% to 88%)
  speed: number;
  hue: number;
}

interface LaserBeam {
  id: string;
  targetX: number;
  targetY: number;
}

interface Explosion {
  id: string;
  x: number;
  y: number;
  word: string;
}

export const OrbitalDefenseGame: React.FC<OrbitalDefenseGameProps> = ({ onFinish, onExit }) => {
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'gameover'>('ready');
  const [enemies, setEnemies] = useState<EnemyShip[]>([]);
  const [lockedTargetId, setLockedTargetId] = useState<string | null>(null);
  const [lasers, setLasers] = useState<LaserBeam[]>([]);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [lives, setLives] = useState(3);
  const [wordsDestroyed, setWordsDestroyed] = useState(0);
  const [wave, setWave] = useState(1);
  const [empReady, setEmpReady] = useState(false);
  const [totalKeystrokes, setTotalKeystrokes] = useState(0);
  const [correctKeystrokes, setCorrectKeystrokes] = useState(0);

  // Synchronized refs for real-time game loop
  const enemiesRef = useRef<EnemyShip[]>([]);
  const lockedIdRef = useRef<string | null>(null);
  const livesRef = useRef(lives);
  const scoreRef = useRef(score);
  const comboRef = useRef(combo);
  const maxComboRef = useRef(maxCombo);
  const wordsDestroyedRef = useRef(wordsDestroyed);
  const waveRef = useRef(wave);
  const hasEndedRef = useRef(false);
  const totalKeysRef = useRef(0);
  const correctKeysRef = useRef(0);
  const onFinishRef = useRef(onFinish);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    enemiesRef.current = enemies;
  }, [enemies]);

  useEffect(() => {
    lockedIdRef.current = lockedTargetId;
  }, [lockedTargetId]);

  useEffect(() => {
    livesRef.current = lives;
  }, [lives]);

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
    wordsDestroyedRef.current = wordsDestroyed;
  }, [wordsDestroyed]);

  useEffect(() => {
    waveRef.current = wave;
  }, [wave]);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  const handleGameOver = useCallback(() => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    setGameState('gameover');
    soundFx.playError();

    const accuracy =
      totalKeysRef.current > 0
        ? Math.round((correctKeysRef.current / totalKeysRef.current) * 100)
        : 100;
    onFinishRef.current(scoreRef.current, wordsDestroyedRef.current, accuracy);
  }, []);

  // Trigger EMP Superweapon
  const triggerEmp = useCallback(() => {
    if (!empReady || enemiesRef.current.length === 0) return;
    soundFx.playSuccess();
    setEmpReady(false);

    // Explode all on-screen enemies
    const cleared = enemiesRef.current;
    setExplosions((prev) => [
      ...prev,
      ...cleared.map((e) => ({
        id: `emp-exp-${Date.now()}-${Math.random()}`,
        x: e.x,
        y: e.y,
        word: e.word,
      })),
    ]);

    const bonusPoints = cleared.length * 150;
    setScore((s) => s + bonusPoints);
    setWordsDestroyed((w) => w + cleared.length);
    setEnemies([]);
    setLockedTargetId(null);
  }, [empReady]);

  // Main game animation loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    let lastSpawnTime = Date.now();
    let animId: number;

    const gameLoop = () => {
      if (hasEndedRef.current) return;
      const now = Date.now();
      const currentWave = waveRef.current;

      // Spawn new enemy ship if capacity allows
      const spawnInterval = Math.max(1100, 2400 - currentWave * 150);
      const maxEnemiesOnScreen = Math.min(6, 3 + Math.floor(currentWave / 2));

      let currentEnemies = enemiesRef.current;

      if (now - lastSpawnTime > spawnInterval && currentEnemies.length < maxEnemiesOnScreen) {
        lastSpawnTime = now;
        const availableWords = COMMON_WORDS_200.filter((w) => w.length >= 3 && w.length <= 7);
        const randomWord = availableWords[Math.floor(Math.random() * availableWords.length)];

        // Choose horizontal slot to avoid overlapping
        const newEnemy: EnemyShip = {
          id: `ship-${now}-${Math.random().toString(36).substring(2, 6)}`,
          word: randomWord,
          typedLetters: 0,
          x: 10 + Math.random() * 70,
          y: 6,
          speed: 0.16 + currentWave * 0.025 + Math.random() * 0.04,
          hue: (now % 360),
        };

        currentEnemies = [...currentEnemies, newEnemy];
        setEnemies(currentEnemies);
      }

      // Update positions of existing ships
      let breachCount = 0;
      let targetLost = false;
      const nextShips: EnemyShip[] = [];

      for (const ship of currentEnemies) {
        const nextY = ship.y + ship.speed;

        if (nextY >= 86) {
          breachCount++;
          if (lockedIdRef.current === ship.id) {
            targetLost = true;
          }
        } else {
          nextShips.push({ ...ship, y: nextY });
        }
      }

      setEnemies(nextShips);

      if (breachCount > 0) {
        soundFx.playError();
        if (targetLost) {
          setLockedTargetId(null);
        }
        const newLives = Math.max(0, livesRef.current - breachCount);
        setLives(newLives);
        setCombo(0);
        if (newLives <= 0) {
          handleGameOver();
          return;
        }
      }

      // Clear expired laser beams
      setLasers((prev) => (prev.length > 0 ? prev.slice(-3) : prev));

      // Clear finished explosions after 700ms
      setExplosions((prev) =>
        prev.filter((exp) => {
          const createdAt = parseInt(exp.id.split('-')[2] || '0', 10);
          return now - createdAt < 700;
        })
      );

      if (!hasEndedRef.current) {
        animId = requestAnimationFrame(gameLoop);
      }
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, handleGameOver]);

  // Start new game
  const startGame = () => {
    hasEndedRef.current = false;
    totalKeysRef.current = 0;
    correctKeysRef.current = 0;
    setTotalKeystrokes(0);
    setCorrectKeystrokes(0);
    setGameState('playing');
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setLives(3);
    setWave(1);
    setWordsDestroyed(0);
    setEnemies([]);
    setLockedTargetId(null);
    setLasers([]);
    setExplosions([]);
    setEmpReady(false);
  };

  // Keyboard handler: Auto-target lock or advance current target
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (gameState !== 'playing' || hasEndedRef.current) return;

      // Space or Enter fires EMP if ready
      if ((e.key === ' ' || e.key === 'Enter') && empReady) {
        e.preventDefault();
        triggerEmp();
        return;
      }

      // We only care about standard alphabet keys
      if (e.key.length !== 1 || !/^[a-zA-Z]$/.test(e.key)) {
        return;
      }

      const pressedChar = e.key.toLowerCase();
      totalKeysRef.current += 1;
      setTotalKeystrokes((k) => k + 1);

      const currentEnemies = enemiesRef.current;
      const currentLockedId = lockedIdRef.current;

      let activeTarget = currentEnemies.find((ship) => ship.id === currentLockedId);

      if (!activeTarget) {
        // Find all enemies starting with pressedChar, sort by lowest Y (closest to bottom/danger)
        const eligible = currentEnemies
          .filter((ship) => ship.word[0].toLowerCase() === pressedChar)
          .sort((a, b) => b.y - a.y);

        if (eligible.length > 0) {
          activeTarget = eligible[0];
          setLockedTargetId(activeTarget.id);
        }
      }

      if (activeTarget) {
        const expectedChar = activeTarget.word[activeTarget.typedLetters].toLowerCase();

        if (pressedChar === expectedChar) {
          // Correct key hit!
          correctKeysRef.current += 1;
          setCorrectKeystrokes((c) => c + 1);
          soundFx.playKeyClick();

          const nextTyped = activeTarget.typedLetters + 1;
          const targetX = activeTarget.x;
          const targetY = activeTarget.y;

          // Spawn laser blast line
          setLasers((prev) => [
            ...prev,
            { id: `laser-${Date.now()}-${Math.random()}`, targetX, targetY },
          ]);

          if (nextTyped >= activeTarget.word.length) {
            // Ship destroyed!
            soundFx.playCombo();
            const newWordsDestroyed = wordsDestroyedRef.current + 1;
            setWordsDestroyed(newWordsDestroyed);

            const newCombo = comboRef.current + 1;
            setCombo(newCombo);
            setMaxCombo((m) => Math.max(m, newCombo));

            // Award EMP on every 8-word streak
            if (newCombo >= 8 && !empReady) {
              setEmpReady(true);
            }

            // Award score based on word length and combo multiplier
            const points = activeTarget.word.length * 30 + newCombo * 15;
            setScore((s) => s + points);

            // Trigger explosion effect
            setExplosions((prev) => [
              ...prev,
              {
                id: `exp-${Date.now()}-${Math.random()}`,
                x: targetX,
                y: targetY,
                word: activeTarget.word,
              },
            ]);

            // Advance wave every 6 destroyed ships
            if (newWordsDestroyed % 6 === 0) {
              setWave((w) => w + 1);
            }

            // Remove destroyed ship & release lock
            setEnemies((prev) => prev.filter((s) => s.id !== activeTarget!.id));
            setLockedTargetId(null);
          } else {
            // Update partially typed word
            setEnemies((prev) =>
              prev.map((s) => (s.id === activeTarget!.id ? { ...s, typedLetters: nextTyped } : s))
            );
          }
        } else {
          // Mistyped key!
          soundFx.playError();
          setCombo(0);
        }
      } else {
        // No enemy starts with this key
        soundFx.playError();
        setCombo(0);
      }
    },
    [gameState, empReady, triggerEmp]
  );

  // Auto-focus container when playing
  useEffect(() => {
    if (gameState === 'playing') {
      containerRef.current?.focus();
    }
  }, [gameState]);

  const accuracy =
    totalKeystrokes > 0 ? Math.round((correctKeystrokes / totalKeystrokes) * 100) : 100;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="w-full max-w-4xl mx-auto flex flex-col items-center select-none outline-none focus:ring-0 focus:outline-none"
      id="orbital-defense-arena"
    >
      {/* Top HUD Display */}
      <div className="w-full flex items-center justify-between px-4 py-3 bg-surface border border-border rounded-2xl mb-4 shadow-card">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-2 rounded-xl bg-surface-muted hover:bg-surface-hover border border-border text-text-muted hover:text-text-primary text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Arcade</span>
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono text-xs font-bold">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>WAVE {wave}</span>
          </div>
        </div>

        {/* Vital Shields */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-text-subtle font-mono mr-1">SHIELDS:</span>
          {[0, 1, 2].map((i) => (
            <Heart
              key={i}
              className={`w-5 h-5 transition-colors ${
                i < lives ? 'text-red-500 fill-red-500' : 'text-surface-muted fill-surface-muted'
              }`}
            />
          ))}
        </div>

        {/* Live Score & Telemetry */}
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

      {/* Main Space Combat Canvas */}
      <div className="relative w-full h-[460px] bg-slate-950 border-2 border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between">
        {/* Deep Space Background Stars Grid */}
        <div className="absolute inset-0 opacity-25 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]" />

        {/* EMP Ready Notification Banner */}
        {empReady && gameState === 'playing' && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold animate-bounce flex items-center gap-1.5 shadow-glow-accent-sm">
            <Bomb className="w-3.5 h-3.5 text-amber-400" />
            <span>EMP READY! PRESS [SPACE] TO BLAST ALL TARGETS</span>
          </div>
        )}

        {/* Laser Beams Layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          {lasers.map((laser) => (
            <line
              key={laser.id}
              x1="50%"
              y1="90%"
              x2={`${laser.targetX}%`}
              y2={`${laser.targetY}%`}
              stroke="#38bdf8"
              strokeWidth="3"
              strokeLinecap="round"
              className="animate-pulse opacity-90 shadow-cyan-400"
            />
          ))}
        </svg>

        {/* Active Descending Enemies */}
        {gameState === 'playing' &&
          enemies.map((enemy) => {
            const isLocked = enemy.id === lockedTargetId;
            const typedPart = enemy.word.slice(0, enemy.typedLetters);
            const remainingPart = enemy.word.slice(enemy.typedLetters);

            return (
              <div
                key={enemy.id}
                className="absolute transition-all duration-75 flex flex-col items-center z-10"
                style={{
                  left: `${enemy.x}%`,
                  top: `${enemy.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {/* Target Lock Reticle */}
                {isLocked && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-cyan-400 animate-spin">
                    <Crosshair className="w-5 h-5 text-cyan-400" />
                  </div>
                )}

                {/* Drone Visual */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black transition-transform ${
                    isLocked
                      ? 'bg-cyan-500/20 border-2 border-cyan-400 shadow-glow-accent scale-110'
                      : 'bg-surface/80 border border-border shadow-md'
                  }`}
                >
                  👾
                </div>

                {/* Word Label with Prefix Highlight */}
                <div
                  className={`mt-1 px-2.5 py-0.5 rounded-lg font-mono text-xs font-bold tracking-wider uppercase border transition-all ${
                    isLocked
                      ? 'bg-slate-900/95 border-cyan-400 text-text-primary shadow-lg ring-1 ring-cyan-400'
                      : 'bg-slate-900/80 border-slate-700 text-slate-300'
                  }`}
                >
                  <span className="text-cyan-400 font-black">{typedPart}</span>
                  <span className="text-slate-200">{remainingPart}</span>
                </div>
              </div>
            );
          })}

        {/* Explosion Effects */}
        {explosions.map((exp) => (
          <div
            key={exp.id}
            className="absolute pointer-events-none z-20 flex flex-col items-center animate-ping"
            style={{
              left: `${exp.x}%`,
              top: `${exp.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="text-2xl">💥</div>
            <span className="text-[10px] font-mono font-bold text-cyan-300">{exp.word}</span>
          </div>
        ))}

        {/* Bottom Defense Line / Turret */}
        <div className="absolute bottom-0 inset-x-0 h-16 border-t border-cyan-500/30 bg-gradient-to-t from-cyan-950/40 to-transparent flex flex-col items-center justify-center z-10">
          <div className="relative flex flex-col items-center">
            {/* Cannon Turret */}
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-lg shadow-glow-accent-sm">
              🚀
            </div>
            <span className="text-[10px] font-mono text-cyan-400/80 mt-1 uppercase tracking-wider">
              {lockedTargetId ? 'TARGET LOCKED • FIRE VIA KEYBOARD' : 'READY • PRESS INITIAL LETTER TO LOCK'}
            </span>
          </div>
        </div>

        {/* Ready Overlay */}
        {gameState === 'ready' && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center text-3xl mb-4 shadow-glow-accent">
              🚀
            </div>
            <h2 className="text-2xl font-black text-text-primary">Orbital Laser Defense</h2>
            <p className="text-xs sm:text-sm text-text-muted mt-2 max-w-md leading-relaxed">
              Target incoming space drones before they reach your perimeter. Type the first letter of any word to lock lasers, then type the rest of the letters to destroy it!
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs font-mono text-text-subtle">
              <span className="px-2.5 py-1 rounded-lg bg-surface border border-border text-cyan-400">
                Auto-Target Lock
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-surface border border-border text-accent">
                Laser Bolt Impacts
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-surface border border-border text-amber-400">
                EMP Screen-Clear at 8x Streak
              </span>
            </div>

            <button
              onClick={startGame}
              className="mt-6 px-8 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm shadow-glow-accent transition-all hover:scale-105 cursor-pointer"
            >
              Engage Defense Systems
            </button>
          </div>
        )}

        {/* Game Over Modal Overlay */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
            <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center text-3xl mb-3">
              💥
            </div>
            <h2 className="text-2xl font-black text-text-primary">Shield Perimeter Breached</h2>
            <p className="text-xs text-text-muted mt-1">Excellent defensive effort, Commander.</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6 w-full max-w-md">
              <div className="p-3 bg-surface rounded-2xl border border-border">
                <span className="text-[10px] text-text-subtle block">FINAL SCORE</span>
                <span className="text-lg font-mono font-bold text-accent">{score.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-surface rounded-2xl border border-border">
                <span className="text-[10px] text-text-subtle block">VAPORIZED</span>
                <span className="text-lg font-mono font-bold text-primary">{wordsDestroyed}</span>
              </div>
              <div className="p-3 bg-surface rounded-2xl border border-border">
                <span className="text-[10px] text-text-subtle block">ACCURACY</span>
                <span className="text-lg font-mono font-bold text-success">{accuracy}%</span>
              </div>
              <div className="p-3 bg-surface rounded-2xl border border-border">
                <span className="text-[10px] text-text-subtle block">MAX COMBO</span>
                <span className="text-lg font-mono font-bold text-cyan-400">{maxCombo}x</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={startGame}
                className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Play Again</span>
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

      {/* Interactive Helper Banner */}
      <div className="w-full mt-3 px-4 py-2 bg-surface border border-border rounded-xl flex items-center justify-between text-xs text-text-muted font-mono">
        <span className="flex items-center gap-1.5">
          <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
          Press the first letter of any descending word to lock lasers.
        </span>
        <span className="text-text-subtle hidden sm:inline">Accuracy: {accuracy}%</span>
      </div>
    </div>
  );
};
