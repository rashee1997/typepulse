'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { soundFx } from '@/lib/sound';
import { COMMON_WORDS_200 } from '@/lib/word-banks';
import {
  Award,
  ChevronLeft,
  Flag,
  Flame,
  Gauge,
  RotateCcw,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';

interface NitroRacerProps {
  onFinish: (score: number, won: boolean, wpm: number) => void;
  onExit: () => void;
}

type Difficulty = 'rookie' | 'pro' | 'master';

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; rivalWpm: number; desc: string; xpMultiplier: number }> = {
  rookie: { label: 'Street Rookie', rivalWpm: 38, desc: 'Friendly pace (38 WPM)', xpMultiplier: 1 },
  pro: { label: 'Speed Pro', rivalWpm: 68, desc: 'High gear contest (68 WPM)', xpMultiplier: 1.5 },
  master: { label: 'Formula Master', rivalWpm: 96, desc: 'Hyper-speed legend (96 WPM)', xpMultiplier: 2.2 },
};

const generateTrackWords = (): string[] => {
  const trackWords: string[] = [];
  for (let i = 0; i < 32; i++) {
    const w = COMMON_WORDS_200[Math.floor(Math.random() * COMMON_WORDS_200.length)];
    trackWords.push(w);
  }
  return trackWords;
};

export const NitroRacerGame: React.FC<NitroRacerProps> = ({ onFinish, onExit }) => {
  const [difficulty, setDifficulty] = useState<Difficulty>('pro');
  const [gameState, setGameState] = useState<'ready' | 'countdown' | 'racing' | 'finished'>('ready');
  const [countdown, setCountdown] = useState<number>(3);
  
  // Words track
  const [words, setWords] = useState<string[]>(generateTrackWords);
  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [inputVal, setInputVal] = useState('');
  const [streak, setStreak] = useState(0);
  const [nitroActive, setNitroActive] = useState(false);

  // Positions (0% to 100%)
  const [playerProgress, setPlayerProgress] = useState(0);
  const [rivalProgress, setRivalProgress] = useState(0);

  // Telemetry
  const [playerWpm, setPlayerWpm] = useState(0);
  const [raceStartTime, setRaceStartTime] = useState<number>(0);
  const [raceElapsedSeconds, setRaceElapsedSeconds] = useState(0);
  const [winner, setWinner] = useState<'player' | 'rival' | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const totalCharsTypedRef = useRef(0);
  const hasFinishedRef = useRef(false);
  const playerWpmRef = useRef(0);
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    playerWpmRef.current = playerWpm;
  }, [playerWpm]);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  // Initialize a new race course
  const initRace = useCallback(() => {
    hasFinishedRef.current = false;
    setWords(generateTrackWords());
    setCurrentWordIdx(0);
    setInputVal('');
    setStreak(0);
    setNitroActive(false);
    setPlayerProgress(0);
    setRivalProgress(0);
    setPlayerWpm(0);
    setWinner(null);
    setRaceElapsedSeconds(0);
    totalCharsTypedRef.current = 0;
    setGameState('ready');
  }, []);

  // Start Countdown Sequence
  const startCountdown = () => {
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
        setGameState('racing');
        const start = Date.now();
        setRaceStartTime(start);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    }, 850);
  };

  // AI Rival simulation loop & player telemetry
  useEffect(() => {
    if (gameState !== 'racing') return;

    const rivalTargetWpm = DIFFICULTY_CONFIG[difficulty].rivalWpm;
    // Standard 5 chars per word: characters per second = (rivalTargetWpm * 5) / 60
    const totalWordsCount = words.length || 32;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedSec = Math.max(0.1, (now - raceStartTime) / 1000);
      setRaceElapsedSeconds(elapsedSec);

      // Rival progress calculation with slight humanized speed jitter (+/- 8%)
      const jitter = (Math.sin(elapsedSec * 2.5) * 0.08) + 1;
      const rivalCharsPerSec = ((rivalTargetWpm * jitter) * 5) / 60;
      const totalCharsEstimated = totalWordsCount * 5.2;
      const rivalP = Math.min(100, (rivalCharsPerSec * elapsedSec / totalCharsEstimated) * 100);
      setRivalProgress(rivalP);

      // Check if rival crosses finish line first
      if (rivalP >= 100 && !hasFinishedRef.current) {
        hasFinishedRef.current = true;
        setWinner('rival');
        setGameState('finished');
        soundFx.playError();
        const currentSpeed = playerWpmRef.current;
        onFinishRef.current(Math.round(currentSpeed * 10), false, currentSpeed);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [gameState, raceStartTime, difficulty, words.length]);

  // Handle Typing Input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (gameState !== 'racing') return;

    const val = e.target.value;
    const targetWord = words[currentWordIdx];

    // Space or completed match check
    if (val.endsWith(' ') || val === targetWord) {
      const trimmed = val.trim();
      if (trimmed === targetWord) {
        // Correct word!
        soundFx.playKeyClick();
        totalCharsTypedRef.current += targetWord.length + 1;

        const nextIdx = currentWordIdx + 1;
        setCurrentWordIdx(nextIdx);
        setInputVal('');

        const nextStreak = streak + 1;
        setStreak(nextStreak);

        // Nitro boost trigger at 5 streak
        if (nextStreak >= 5) {
          setNitroActive(true);
          if (nextStreak % 5 === 0) soundFx.playCombo();
        }

        // Calculate player progress
        const pProgress = Math.min(100, (nextIdx / words.length) * 100);
        setPlayerProgress(pProgress);

        // Calculate live WPM
        const elapsedMin = raceElapsedSeconds / 60;
        if (elapsedMin > 0.05) {
          const currentSpeed = Math.round((totalCharsTypedRef.current / 5) / elapsedMin);
          setPlayerWpm(currentSpeed);
        }

        // Check if player won!
        if (nextIdx >= words.length && !hasFinishedRef.current) {
          hasFinishedRef.current = true;
          setWinner('player');
          setGameState('finished');
          soundFx.playSuccess();
          const finalWpm = Math.max(30, Math.round((totalCharsTypedRef.current / 5) / (raceElapsedSeconds / 60)));
          const finalScore = Math.round(finalWpm * 25 * DIFFICULTY_CONFIG[difficulty].xpMultiplier);
          onFinishRef.current(finalScore, true, finalWpm);
        }
      } else {
        // Space pressed on wrong word
        soundFx.playError();
        setStreak(0);
        setNitroActive(false);
      }
    } else {
      // Partial typing
      if (targetWord.startsWith(val)) {
        soundFx.playKeyClick();
      } else {
        soundFx.playError();
        setStreak(0);
        setNitroActive(false);
      }
      setInputVal(val);
    }
  };

  const currentWord = words[currentWordIdx] || '';

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-4 animate-fadeIn" id="nitro-racer-arena">
      {/* Top Bar / Navigation */}
      <div className="flex items-center justify-between bg-slate-900/70 border border-slate-800/80 px-4 py-3 rounded-2xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-slate-100 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            id="nitro-exit-btn"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Arcade</span>
          </button>
          <div className="h-5 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-400/20 text-amber-400 font-bold">🏎️</span>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                Nitro Drag Racer
                {nitroActive && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px] tracking-wider animate-pulse flex items-center gap-0.5">
                    <Flame className="w-3 h-3 fill-slate-950" /> NITRO!
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-400">Head-to-head sprint against the AI Ghost rival</p>
            </div>
          </div>
        </div>

        {/* Difficulty Selector */}
        <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
          {(['rookie', 'pro', 'master'] as Difficulty[]).map((diff) => (
            <button
              key={diff}
              disabled={gameState === 'racing' || gameState === 'countdown'}
              onClick={() => {
                setDifficulty(diff);
                initRace();
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                difficulty === diff
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 disabled:opacity-50'
              }`}
            >
              {diff}
            </button>
          ))}
        </div>
      </div>

      {/* Speedway Track Visualizer */}
      <div className="relative w-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-5 shadow-2xl overflow-hidden">
        {/* Track Asphalt Texture & Lane Striping */}
        <div className="space-y-4">
          {/* Lane 1: Player (🏎️ Amber Nitro) */}
          <div className="relative bg-slate-900/90 border border-amber-500/20 rounded-2xl p-3 pt-2">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-400 mb-1">
              <span className="flex items-center gap-1.5">
                <span>YOU (Gold Streak)</span>
                {nitroActive && <span className="text-[10px] text-amber-300 font-mono">⚡ 1.5x Speed</span>}
              </span>
              <span className="font-mono text-xs">{Math.round(playerProgress)}%</span>
            </div>

            {/* Lane Track */}
            <div className="relative h-12 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center px-3 overflow-hidden">
              {/* Lane Dashes */}
              <div className="absolute inset-0 flex items-center justify-around pointer-events-none opacity-20">
                {[...Array(14)].map((_, i) => (
                  <div key={i} className="w-4 h-1 bg-amber-300/40 rounded-full" />
                ))}
              </div>

              {/* Finish Line Checkered Strip */}
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-[repeating-linear-gradient(45deg,#000,#000_6px,#fff_6px,#fff_12px)] opacity-70 border-l border-amber-400" />

              {/* Player Car Avatar */}
              <div
                className="absolute top-1/2 -translate-y-1/2 transition-all duration-150 flex items-center gap-1.5 z-10"
                style={{ left: `calc(${playerProgress * 0.88}% + 8px)` }}
              >
                {nitroActive && (
                  <div className="flex items-center -mr-1">
                    <Flame className="w-5 h-5 text-amber-500 fill-amber-400 animate-bounce" />
                  </div>
                )}
                <div className="px-2 py-1 bg-amber-400 text-slate-950 font-black text-xs rounded-lg shadow-[0_0_15px_rgba(251,191,36,0.6)] flex items-center gap-1">
                  <span>🏎️</span>
                  <span className="text-[10px] font-mono">YOU</span>
                </div>
              </div>
            </div>
          </div>

          {/* Lane 2: AI Rival (🏎️ Indigo Phantom) */}
          <div className="relative bg-slate-900/90 border border-indigo-500/20 rounded-2xl p-3 pt-2">
            <div className="flex items-center justify-between text-xs font-semibold text-indigo-400 mb-1">
              <span className="flex items-center gap-1.5">
                <span>RIVAL ({DIFFICULTY_CONFIG[difficulty].label})</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Target: {DIFFICULTY_CONFIG[difficulty].rivalWpm} WPM
                </span>
              </span>
              <span className="font-mono text-xs">{Math.round(rivalProgress)}%</span>
            </div>

            {/* Lane Track */}
            <div className="relative h-12 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center px-3 overflow-hidden">
              {/* Lane Dashes */}
              <div className="absolute inset-0 flex items-center justify-around pointer-events-none opacity-20">
                {[...Array(14)].map((_, i) => (
                  <div key={i} className="w-4 h-1 bg-indigo-300/40 rounded-full" />
                ))}
              </div>

              {/* Finish Line Checkered Strip */}
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-[repeating-linear-gradient(45deg,#000,#000_6px,#fff_6px,#fff_12px)] opacity-70 border-l border-indigo-400" />

              {/* Rival Car Avatar */}
              <div
                className="absolute top-1/2 -translate-y-1/2 transition-all duration-200 flex items-center gap-1 z-10"
                style={{ left: `calc(${rivalProgress * 0.88}% + 8px)` }}
              >
                <div className="px-2 py-1 bg-indigo-600 text-white font-black text-xs rounded-lg shadow-[0_0_12px_rgba(99,102,241,0.5)] flex items-center gap-1">
                  <span>🏎️</span>
                  <span className="text-[10px] font-mono">AI</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Telemetry Dashboard Strip */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Gauge className="w-4 h-4 text-amber-400" />
              <span className="text-slate-400">Speed:</span>
              <span className="font-mono font-bold text-amber-400 text-sm">{playerWpm} WPM</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Flame className="w-4 h-4 text-amber-400" />
              <span className="text-slate-400">Streak:</span>
              <span className="font-mono font-bold text-slate-200">{streak}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Flag className="w-4 h-4 text-indigo-400" />
              <span className="text-slate-400">Lap Time:</span>
              <span className="font-mono text-slate-200">{raceElapsedSeconds.toFixed(1)}s</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-400">
              Word {Math.min(words.length, currentWordIdx + 1)} of {words.length}
            </span>
          </div>
        </div>
      </div>

      {/* Typing & Word Cockpit */}
      {gameState === 'ready' && (
        <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center text-center gap-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-400 flex items-center justify-center text-3xl shadow-inner">
            🚦
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">Ready for the Drag Race?</h3>
            <p className="text-xs text-slate-400 max-w-md mt-1">
              Type each word accurately to propel your vehicle. Hit 5 consecutive correct words to activate{' '}
              <strong className="text-amber-400">Nitro Boost</strong>!
            </p>
          </div>
          <button
            onClick={startCountdown}
            className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg hover:scale-105 flex items-center gap-2"
            id="nitro-start-btn"
          >
            <Zap className="w-4 h-4 fill-slate-950" />
            <span>Launch Engine</span>
          </button>
        </div>
      )}

      {gameState === 'countdown' && (
        <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-10 flex flex-col items-center justify-center text-center gap-2 shadow-xl">
          <span className="text-xs uppercase tracking-widest text-slate-400 font-bold font-mono">Starting in</span>
          <span className="text-6xl font-black font-mono text-amber-400 animate-pulse">
            {countdown > 0 ? countdown : 'GO!'}
          </span>
        </div>
      )}

      {gameState === 'racing' && (
        <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col items-center gap-5 shadow-xl">
          {/* Active Word Display */}
          <div className="flex items-center gap-3 flex-wrap justify-center font-mono text-lg select-none">
            {words.slice(Math.max(0, currentWordIdx - 1), currentWordIdx + 6).map((w, idx) => {
              const actualIdx = Math.max(0, currentWordIdx - 1) + idx;
              const isCurrent = actualIdx === currentWordIdx;
              const isPast = actualIdx < currentWordIdx;

              return (
                <span
                  key={`${w}-${actualIdx}`}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    isCurrent
                      ? 'bg-amber-400/20 border-2 border-amber-400 text-amber-300 font-extrabold text-xl scale-105 shadow-md'
                      : isPast
                      ? 'text-slate-600 line-through'
                      : 'text-slate-400'
                  }`}
                >
                  {w}
                </span>
              );
            })}
          </div>

          {/* Input Box */}
          <div className="w-full max-w-md relative">
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={handleInputChange}
              placeholder={currentWord}
              autoFocus
              spellCheck={false}
              autoComplete="off"
              className="w-full px-5 py-3.5 bg-slate-950 border-2 border-amber-400/80 rounded-2xl text-center text-xl font-mono text-slate-100 placeholder-slate-700 focus:outline-none focus:border-amber-400 shadow-inner"
              id="nitro-typing-input"
            />
            <span className="block text-center text-[11px] text-slate-500 mt-2">
              Press <strong className="text-slate-300">Space</strong> or complete the word to accelerate
            </span>
          </div>
        </div>
      )}

      {gameState === 'finished' && (
        <div className="w-full bg-slate-900/95 border border-slate-800 rounded-3xl p-8 flex flex-col items-center text-center gap-4 shadow-2xl animate-fadeIn">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-inner ${
              winner === 'player'
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                : 'bg-rose-500/20 border border-rose-500/40 text-rose-400'
            }`}
          >
            {winner === 'player' ? '🏆' : '🥈'}
          </div>

          <div>
            <h3 className="text-xl font-black text-slate-100">
              {winner === 'player' ? 'Victory! You Won the Drag Race!' : 'Close Race! The Rival Crossed First.'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Finished in <strong className="text-amber-400">{raceElapsedSeconds.toFixed(1)}s</strong> at{' '}
              <strong className="text-amber-400">{playerWpm} WPM</strong> average speed!
            </p>
          </div>

          <div className="flex items-center gap-6 py-2 px-6 bg-slate-950/70 border border-slate-800 rounded-2xl text-xs font-mono">
            <div>
              <span className="text-slate-500 block">Speed</span>
              <span className="text-amber-400 font-bold text-sm">{playerWpm} WPM</span>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <span className="text-slate-500 block">Streak</span>
              <span className="text-slate-200 font-bold text-sm">{streak}</span>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <span className="text-slate-500 block">Arcade XP</span>
              <span className="text-emerald-400 font-bold text-sm">
                +{Math.round(playerWpm * 2 * DIFFICULTY_CONFIG[difficulty].xpMultiplier)} XP
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={initRace}
              className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Rematch</span>
            </button>
            <button
              onClick={onExit}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition-colors"
            >
              Arcade Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
