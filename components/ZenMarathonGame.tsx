'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserProgress, TypingStats } from '@/types/typing';
import { INSPIRATIONAL_QUOTES, COMMON_WORDS_200 } from '@/lib/word-banks';
import { TypingEngine } from '@/lib/typing-engine';
import { soundFx } from '@/lib/sound';
import {
  Sparkles,
  ArrowLeft,
  Volume2,
  VolumeX,
  Flame,
  Clock,
  Gauge,
  CheckCircle2,
  Pause,
  Play,
  Waves,
} from 'lucide-react';

interface ZenMarathonGameProps {
  userProgress: UserProgress;
  onFinishSession: (stats: TypingStats, mode: string) => void;
  onExit: () => void;
}

export const ZenMarathonGame: React.FC<ZenMarathonGameProps> = ({
  userProgress,
  onFinishSession,
  onExit,
}) => {
  // Generate infinite stream of peaceful text
  const generateZenBatch = () => {
    const quotes = [...INSPIRATIONAL_QUOTES].sort(() => Math.random() - 0.5).slice(0, 3);
    return quotes.join(' ');
  };

  const [engine] = useState<TypingEngine>(() => new TypingEngine(generateZenBatch()));
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [liveStats, setLiveStats] = useState<TypingStats>(() => engine.getStats());
  const [totalCompletedWords, setTotalCompletedWords] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    focusInput();
  }, [focusInput, isPaused]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isPaused) return;

    if (e.key === 'Tab') {
      e.preventDefault();
      setIsPaused((p) => !p);
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      handleEndMarathon();
      return;
    }

    if (e.key.length === 1 || e.key === 'Backspace') {
      const res = engine.handleInput(e.key, e.ctrlKey);
      if (engine.currentIndex > engine.text.length - 80) {
        engine.appendText(' ' + generateZenBatch());
      }
      setLiveStats(engine.getStats());

      if (soundEnabled) {
        if (res.isCorrect) {
          soundFx.playKeypress();
        } else {
          soundFx.playError();
        }
      }

      if (e.key === ' ' && res.isCorrect) {
        setTotalCompletedWords((prev) => prev + 1);
      }
    }
  };

  const handleEndMarathon = () => {
    const finalStats = engine.getStats();
    onFinishSession(finalStats, 'zen-marathon');
    onExit();
  };

  const currentChars = engine.chars;
  // Sliding window around currentIndex for clean view
  const visibleStart = Math.max(0, engine.currentIndex - 45);
  const visibleChars = currentChars.slice(visibleStart, visibleStart + 160);

  // Flow State Rating based on sustained combo
  const flowPercentage = Math.min(100, Math.round((liveStats.combo / 40) * 100));

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

      {/* Header */}
      <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button
            id="zen-back-button"
            onClick={handleEndMarathon}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <Waves className="w-3.5 h-3.5" />
                Endless Flow
              </span>
              <span className="text-xs text-slate-400">No timers • Zero stress • Pure rhythm</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight mt-1">Zen Marathon</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="zen-sound-toggle"
            onClick={() => setSoundEnabled((v) => !v)}
            className={`p-2.5 rounded-xl border transition-colors ${
              soundEnabled
                ? 'bg-slate-800 border-slate-700 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            id="zen-pause-button"
            onClick={() => setIsPaused((p) => !p)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700"
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            id="zen-finish-button"
            onClick={handleEndMarathon}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20"
          >
            Finish Flow
          </button>
        </div>
      </div>

      {/* Flow Stage */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Flow Gauge */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Sparkles className="w-3.5 h-3.5" /> Flow Cadence
            </span>
            <span>{liveStats.combo} Keys in Flow</span>
          </div>
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-teal-500 via-emerald-400 to-cyan-400 rounded-full transition-all duration-200"
              style={{ width: `${flowPercentage}%` }}
            />
          </div>
        </div>

        {/* Live Metrics */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center">
            <div className="text-[11px] text-slate-400 font-medium uppercase">Cadence</div>
            <div className="text-2xl font-black text-white mt-1">
              {liveStats.wpm} <span className="text-xs font-normal text-slate-500">WPM</span>
            </div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center">
            <div className="text-[11px] text-slate-400 font-medium uppercase">Words</div>
            <div className="text-2xl font-black text-teal-400 mt-1">{totalCompletedWords}</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center">
            <div className="text-[11px] text-slate-400 font-medium uppercase">Accuracy</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">{liveStats.accuracy}%</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center">
            <div className="text-[11px] text-slate-400 font-medium uppercase">Time</div>
            <div className="text-2xl font-black text-cyan-400 mt-1">
              {Math.floor(liveStats.elapsedSeconds / 60)}m {Math.round(liveStats.elapsedSeconds % 60)}s
            </div>
          </div>
        </div>

        {/* Text Area */}
        <div className="min-h-[180px] bg-slate-950/70 border border-slate-800/90 rounded-xl p-6 font-mono text-xl leading-relaxed select-none relative">
          {isPaused && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center z-10">
              <h3 className="text-xl font-bold text-white mb-2">Flow Paused</h3>
              <p className="text-sm text-slate-400 mb-4">Press Tab or click Resume to continue typing.</p>
              <button
                id="zen-resume-button"
                onClick={() => setIsPaused(false)}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm"
              >
                Resume Flow
              </button>
            </div>
          )}

          <div className="break-words">
            {visibleChars.map((item, idx) => {
              let color = 'text-slate-500';
              if (item.status === 'correct') color = 'text-emerald-400';
              if (item.status === 'incorrect') color = 'text-rose-400 bg-rose-500/10 rounded';
              if (item.status === 'corrected') color = 'text-teal-400';
              if (item.status === 'current') color = 'text-white underline decoration-emerald-500 decoration-2 font-bold bg-emerald-500/20 rounded';

              return (
                <span key={idx} className={`${color} transition-colors duration-75`}>
                  {item.char}
                </span>
              );
            })}
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-5">
          Tip: Press <span className="text-slate-300 font-mono">Tab</span> to pause, or <span className="text-slate-300 font-mono">Esc</span> to complete and bank your XP.
        </p>
      </div>
    </div>
  );
};
