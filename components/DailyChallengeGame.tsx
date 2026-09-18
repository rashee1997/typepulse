'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserProgress, TypingStats } from '@/types/typing';
import { getDailyPassage, DailyPassageData } from '@/lib/word-banks';
import { TypingEngine } from '@/lib/typing-engine';
import { soundFx } from '@/lib/sound';
import {
  Calendar,
  Clock,
  Sparkles,
  Trophy,
  Flame,
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  Gauge,
  Target,
  ShieldCheck,
} from 'lucide-react';

interface DailyChallengeGameProps {
  userProgress: UserProgress;
  onFinishSession: (stats: TypingStats, mode: string) => void;
  onExit: () => void;
}

export const DailyChallengeGame: React.FC<DailyChallengeGameProps> = ({
  userProgress,
  onFinishSession,
  onExit,
}) => {
  const [passage, setPassage] = useState<DailyPassageData>(() => getDailyPassage());
  const [engine, setEngine] = useState<TypingEngine>(() => new TypingEngine(getDailyPassage().text));
  const [gameState, setGameState] = useState<'ready' | 'countdown' | 'playing' | 'completed'>('ready');
  const [countdown, setCountdown] = useState(3);
  const [liveStats, setLiveStats] = useState<TypingStats>(() => engine.getStats());
  const [dailyStreak, setDailyStreak] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('typepulse_daily_challenge_record');
        if (saved) {
          const parsed = JSON.parse(saved);
          return parsed.streak || userProgress.dailyStreak || 1;
        }
      } catch {}
    }
    return userProgress.dailyStreak || 1;
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus input
  const focusInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    focusInput();
  }, [focusInput, gameState]);

  // Start countdown
  const startChallenge = () => {
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
        setGameState('playing');
        const newEngine = new TypingEngine(passage.text);
        setEngine(newEngine);
        setLiveStats(newEngine.getStats());
        soundFx.playStreak();
      }
    }, 800);
  };

  // Keystroke handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (gameState !== 'playing') return;

    if (e.key === 'Tab') {
      e.preventDefault();
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      onExit();
      return;
    }

    // Process character in TypingEngine
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

        // Save daily challenge streak
        if (typeof window !== 'undefined') {
          try {
            const today = new Date().toISOString().split('T')[0];
            const newStreak = dailyStreak + 1;
            setDailyStreak(newStreak);
            localStorage.setItem(
              'typepulse_daily_challenge_record',
              JSON.stringify({ lastCompletedDate: today, streak: newStreak })
            );
          } catch {}
        }

        onFinishSession(finalStats, 'daily-challenge');
      }
    }
  };

  const currentChars = engine.chars;
  const progressPercent = Math.min(100, Math.round((engine.currentIndex / Math.max(1, engine.text.length)) * 100));

  // Determine Daily Medal
  const isGold = liveStats.wpm >= passage.targetWpm && liveStats.accuracy >= 98;
  const isSilver = liveStats.wpm >= passage.targetWpm * 0.85 && liveStats.accuracy >= 95;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6" ref={containerRef} onClick={focusInput}>
      {/* Hidden input for physical keyboard capture */}
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
            id="daily-back-button"
            onClick={onExit}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {passage.date}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Day #{passage.dayNumber}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight mt-1">{passage.title}</h1>
            <p className="text-xs text-slate-400">By {passage.author} • {passage.theme}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 rounded-xl">
            <Flame className="w-4 h-4 text-amber-400" />
            <div className="text-right">
              <div className="text-[10px] text-amber-400/80 uppercase font-bold tracking-wider">Streak</div>
              <div className="text-base font-black text-amber-300">{dailyStreak} Days</div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-2 rounded-xl">
            <Target className="w-4 h-4 text-indigo-400" />
            <div className="text-right">
              <div className="text-[10px] text-indigo-400/80 uppercase font-bold tracking-wider">Target Pace</div>
              <div className="text-base font-black text-indigo-300">{passage.targetWpm} WPM</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-slate-800 rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Live HUD telemetry */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center">
            <div className="text-[11px] text-slate-400 font-medium uppercase flex items-center justify-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-indigo-400" />
              Velocity
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {liveStats.wpm} <span className="text-xs font-normal text-slate-500">WPM</span>
            </div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center">
            <div className="text-[11px] text-slate-400 font-medium uppercase flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Accuracy
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {liveStats.accuracy}%
            </div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center">
            <div className="text-[11px] text-slate-400 font-medium uppercase flex items-center justify-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              Combo
            </div>
            <div className="text-2xl font-black text-amber-400 mt-1">
              {liveStats.combo}
            </div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center">
            <div className="text-[11px] text-slate-400 font-medium uppercase flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              Time
            </div>
            <div className="text-2xl font-black text-sky-400 mt-1">
              {liveStats.elapsedSeconds}s
            </div>
          </div>
        </div>

        {/* Text Display Canvas */}
        <div className="relative min-h-[160px] bg-slate-950/80 border border-slate-800 rounded-xl p-6 font-mono text-lg leading-relaxed select-none">
          {gameState === 'ready' && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center z-10 p-6 text-center">
              <Trophy className="w-12 h-12 text-amber-400 mb-3" />
              <h3 className="text-xl font-bold text-white mb-1">Today&apos;s Worldwide Challenge</h3>
              <p className="text-sm text-slate-400 max-w-md mb-5">
                Complete today&apos;s synchronized passage with at least {passage.targetWpm} WPM and 96% accuracy to claim today&apos;s gold honor.
              </p>
              <button
                id="daily-start-button"
                onClick={startChallenge}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-bold shadow-lg shadow-amber-500/20 transition-all"
              >
                Begin Daily Challenge
              </button>
            </div>
          )}

          {gameState === 'countdown' && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="text-7xl font-black text-amber-400 animate-pulse font-mono">
                {countdown}
              </div>
            </div>
          )}

          <div className="break-words">
            {currentChars.map((item, idx) => {
              let colorClass = 'text-slate-500';
              if (item.status === 'correct') colorClass = 'text-emerald-400';
              if (item.status === 'incorrect') colorClass = 'text-rose-400 bg-rose-500/20 rounded';
              if (item.status === 'corrected') colorClass = 'text-amber-400';
              if (item.status === 'current') colorClass = 'text-white underline decoration-indigo-500 decoration-2 font-bold bg-indigo-500/20 rounded';

              return (
                <span key={idx} className={`${colorClass} transition-colors duration-75`}>
                  {item.char}
                </span>
              );
            })}
          </div>
        </div>

        {/* Completed Modal View */}
        {gameState === 'completed' && (
          <div className="mt-6 p-6 bg-slate-950/90 border border-slate-800 rounded-2xl text-center space-y-4">
            <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Daily Challenge Conquered!</h2>
              <p className="text-slate-400 text-sm mt-1">
                {isGold
                  ? '🏅 Gold Standard Achieved! Outstanding velocity and precision!'
                  : isSilver
                  ? '🥈 Silver Ribbon! Solid execution on today’s daily run!'
                  : '🥉 Daily Run Complete! Consistency builds mastery!'}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2">
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                <div className="text-xs text-slate-400">Speed</div>
                <div className="text-xl font-bold text-white">{liveStats.wpm} WPM</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                <div className="text-xs text-slate-400">Accuracy</div>
                <div className="text-xl font-bold text-emerald-400">{liveStats.accuracy}%</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                <div className="text-xs text-slate-400">New Streak</div>
                <div className="text-xl font-bold text-amber-400">{dailyStreak} Days</div>
              </div>
            </div>

            <div className="flex justify-center gap-4 pt-3">
              <button
                id="daily-retry-button"
                onClick={() => {
                  const newEngine = new TypingEngine(passage.text);
                  setEngine(newEngine);
                  setLiveStats(newEngine.getStats());
                  setGameState('ready');
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center gap-2 text-sm"
              >
                <RotateCcw className="w-4 h-4" /> Practice Again
              </button>
              <button
                id="daily-exit-button"
                onClick={onExit}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm"
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
