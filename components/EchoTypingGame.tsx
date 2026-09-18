'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserProgress, TypingStats } from '@/types/typing';
import { generateRandomWords } from '@/lib/word-banks';
import { TypingEngine, calculateGhostPacerIndex } from '@/lib/typing-engine';
import { soundFx } from '@/lib/sound';
import {
  Ghost,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Trophy,
  Gauge,
  ShieldCheck,
  User,
  Zap,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

interface EchoTypingGameProps {
  userProgress: UserProgress;
  onFinishSession: (stats: TypingStats, mode: string) => void;
  onExit: () => void;
}

export const EchoTypingGame: React.FC<EchoTypingGameProps> = ({
  userProgress,
  onFinishSession,
  onExit,
}) => {
  const [ghostWpm, setGhostWpm] = useState<number>(() => {
    const best = userProgress.highScores?.bestWpm || 50;
    return Math.max(35, Math.round(best * 0.95));
  });

  const [passageText, setPassageText] = useState<string>(() => generateRandomWords(32, true, false));
  const [engine, setEngine] = useState<TypingEngine>(() => new TypingEngine(passageText));
  const [gameState, setGameState] = useState<'ready' | 'countdown' | 'racing' | 'completed'>('ready');
  const [countdown, setCountdown] = useState(3);
  const [ghostIndex, setGhostIndex] = useState(0);
  const [liveStats, setLiveStats] = useState<TypingStats>(() => engine.getStats());

  const inputRef = useRef<HTMLInputElement>(null);
  const raceStartTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  const focusInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    focusInput();
  }, [focusInput, gameState]);

  // Ghost loop
  useEffect(() => {
    if (gameState !== 'racing') {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    const loop = () => {
      const elapsed = (Date.now() - raceStartTimeRef.current) / 1000;
      const index = calculateGhostPacerIndex(elapsed, ghostWpm, engine.text.length);
      setGhostIndex(index);

      // Check if ghost finished first
      if (index >= engine.text.length - 1 && engine.currentIndex < engine.text.length) {
        // Ghost finished
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gameState, ghostWpm, engine.text.length, engine.currentIndex]);

  const startRace = () => {
    setGameState('countdown');
    setCountdown(3);
    soundFx.playKeypress();

    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
        soundFx.playKeypress();
      } else {
        clearInterval(interval);
        setCountdown(0);
        setGameState('racing');
        const newEngine = new TypingEngine(passageText);
        setEngine(newEngine);
        setLiveStats(newEngine.getStats());
        setGhostIndex(0);
        raceStartTimeRef.current = Date.now();
        soundFx.playStreak();
      }
    }, 800);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (gameState !== 'racing') return;

    if (e.key === 'Tab') {
      e.preventDefault();
      startRace();
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      onExit();
      return;
    }

    if (e.key.length === 1 || e.key === 'Backspace') {
      const res = engine.handleInput(e.key, e.ctrlKey);
      setLiveStats(engine.getStats());

      if (res.isCorrect) {
        soundFx.playKeypress();
      } else {
        soundFx.playError();
      }

      if (res.isFinished) {
        const finalStats = engine.getStats();
        setGameState('completed');
        soundFx.playVictory();
        onFinishSession(finalStats, 'echo-pacer');
      }
    }
  };

  const currentChars = engine.chars;
  const playerPercent = Math.min(100, Math.round((engine.currentIndex / Math.max(1, engine.text.length)) * 100));
  const ghostPercent = Math.min(100, Math.round((ghostIndex / Math.max(1, engine.text.length)) * 100));
  const deltaChars = engine.currentIndex - ghostIndex;
  const isAhead = deltaChars >= 0;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6" onClick={focusInput}>
      <input
        ref={inputRef}
        type="text"
        className="opacity-0 absolute pointer-events-none w-0 h-0"
        onKeyDown={handleKeyDown}
        value=""
        onChange={() => {}}
        autoFocus
      />

      {/* Top Header */}
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-4">
          <button
            id="echo-back-button"
            onClick={onExit}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-1">
                <Ghost className="w-3.5 h-3.5" />
                Ghost Pacer
              </span>
              <span className="text-xs text-slate-400">Race your target velocity in real time</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight mt-1">Echo Typing</h1>
          </div>
        </div>

        {/* Ghost Speed Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium mr-1">Target Pace:</span>
          {[45, 60, 75, 90, 110].map((pace) => (
            <button
              key={pace}
              id={`echo-pace-${pace}`}
              onClick={() => {
                if (gameState === 'racing') return;
                setGhostWpm(pace);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                ghostWpm === pace
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {pace}
            </button>
          ))}
        </div>
      </div>

      {/* Duel Progress Track */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
        {/* Player Track */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-indigo-400">
              <User className="w-3.5 h-3.5" /> You
            </span>
            <span className="text-white font-mono">{liveStats.wpm} WPM ({playerPercent}%)</span>
          </div>
          <div className="w-full h-3 bg-slate-950 rounded-full p-0.5 border border-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-100"
              style={{ width: `${playerPercent}%` }}
            />
          </div>
        </div>

        {/* Ghost Track */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Ghost className="w-3.5 h-3.5" /> Ghost Echo ({ghostWpm} WPM)
            </span>
            <span className="text-cyan-300 font-mono">{ghostPercent}%</span>
          </div>
          <div className="w-full h-3 bg-slate-950 rounded-full p-0.5 border border-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-sky-400 rounded-full opacity-70 transition-all duration-100"
              style={{ width: `${ghostPercent}%` }}
            />
          </div>
        </div>

        {/* Delta Gauge */}
        <div className="flex items-center justify-center pt-2">
          <div
            className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border ${
              isAhead
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {isAhead ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>
              {isAhead ? `+${Math.round(deltaChars / 5)} words ahead` : `${Math.round(deltaChars / 5)} words behind`}
            </span>
          </div>
        </div>

        {/* Text Canvas */}
        <div className="relative min-h-[160px] bg-slate-950/80 border border-slate-800 rounded-xl p-6 font-mono text-lg leading-relaxed select-none break-words mt-4">
          {gameState === 'ready' && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center z-10 p-6 text-center">
              <Ghost className="w-12 h-12 text-cyan-400 mb-3" />
              <h3 className="text-xl font-bold text-white mb-1">Challenge the {ghostWpm} WPM Ghost</h3>
              <p className="text-sm text-slate-400 max-w-md mb-5">
                The ghost moves at a steady constant {ghostWpm} WPM metronome pace. Can your hands outpace it?
              </p>
              <button
                id="echo-start-button"
                onClick={startRace}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold shadow-lg shadow-cyan-500/20 transition-all"
              >
                Launch Pacer Duel
              </button>
            </div>
          )}

          {gameState === 'countdown' && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="text-7xl font-black text-cyan-400 animate-pulse font-mono">{countdown}</div>
            </div>
          )}

          <div>
            {currentChars.map((item, idx) => {
              let color = 'text-slate-500';
              if (item.status === 'correct') color = 'text-emerald-400';
              if (item.status === 'incorrect') color = 'text-rose-400 bg-rose-500/20 rounded';
              if (item.status === 'corrected') color = 'text-amber-400';
              if (item.status === 'current') color = 'text-white underline decoration-cyan-500 decoration-2 font-bold bg-cyan-500/20 rounded';

              // Ghost position marker
              const isGhostHere = idx === ghostIndex;

              return (
                <span key={idx} className={`relative ${color} transition-colors duration-75`}>
                  {isGhostHere && (
                    <span className="absolute -top-3 left-0 w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
                  )}
                  {item.char}
                </span>
              );
            })}
          </div>
        </div>

        {/* Completed Modal */}
        {gameState === 'completed' && (
          <div className="p-6 bg-slate-950/90 border border-slate-800 rounded-2xl text-center space-y-4 mt-4">
            <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white">
              {liveStats.wpm >= ghostWpm ? '🎉 Victory! You Outpaced the Ghost!' : '⚡ Close Match! The Ghost Crossed First.'}
            </h2>
            <p className="text-sm text-slate-400">
              You averaged {liveStats.wpm} WPM with {liveStats.accuracy}% accuracy against the {ghostWpm} WPM target!
            </p>

            <div className="flex justify-center gap-4 pt-2">
              <button
                id="echo-again-button"
                onClick={() => {
                  setPassageText(generateRandomWords(32, true, false));
                  setGameState('ready');
                }}
                className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm"
              >
                Race Again
              </button>
              <button
                id="echo-exit-button"
                onClick={onExit}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm"
              >
                Return to Arcade
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
