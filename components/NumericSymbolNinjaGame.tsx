'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserProgress, TypingStats } from '@/types/typing';
import { generateNumericSymbolDrill, numericSymbolSets } from '@/lib/word-banks';
import { TypingEngine } from '@/lib/typing-engine';
import { soundFx } from '@/lib/sound';
import {
  Binary,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Flame,
  Gauge,
  ShieldCheck,
  Code2,
  DollarSign,
  Calendar,
  FileSpreadsheet,
  Calculator,
} from 'lucide-react';

interface NumericSymbolNinjaGameProps {
  userProgress: UserProgress;
  onFinishSession: (stats: TypingStats, mode: string) => void;
  onExit: () => void;
}

type NinjaCategory = 'all' | 'dates' | 'currency' | 'invoices' | 'equations' | 'code';

export const NumericSymbolNinjaGame: React.FC<NumericSymbolNinjaGameProps> = ({
  userProgress,
  onFinishSession,
  onExit,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<NinjaCategory>('all');
  const [drillText, setDrillText] = useState<string>(() => generateNumericSymbolDrill(14, 'all'));
  const [engine, setEngine] = useState<TypingEngine>(() => new TypingEngine(drillText));
  const [gameState, setGameState] = useState<'playing' | 'completed'>('playing');
  const [liveStats, setLiveStats] = useState<TypingStats>(() => engine.getStats());

  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    focusInput();
  }, [focusInput, drillText]);

  const switchCategory = (cat: NinjaCategory) => {
    setSelectedCategory(cat);
    const newText = generateNumericSymbolDrill(14, cat);
    setDrillText(newText);
    const newEngine = new TypingEngine(newText);
    setEngine(newEngine);
    setLiveStats(newEngine.getStats());
    setGameState('playing');
    soundFx.playKeypress();
  };

  const restartRound = () => {
    const newText = generateNumericSymbolDrill(14, selectedCategory);
    setDrillText(newText);
    const newEngine = new TypingEngine(newText);
    setEngine(newEngine);
    setLiveStats(newEngine.getStats());
    setGameState('playing');
    soundFx.playKeypress();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (gameState !== 'playing') return;

    if (e.key === 'Tab') {
      e.preventDefault();
      restartRound();
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
        onFinishSession(finalStats, 'numeric-ninja');
      }
    }
  };

  const currentChars = engine.chars;
  const progressPercent = Math.min(100, Math.round((engine.currentIndex / Math.max(1, engine.text.length)) * 100));

  const categories: { id: NinjaCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All Mixed', icon: <Binary className="w-3.5 h-3.5" /> },
    { id: 'code', label: 'Code Syntax', icon: <Code2 className="w-3.5 h-3.5" /> },
    { id: 'currency', label: 'Currency', icon: <DollarSign className="w-3.5 h-3.5" /> },
    { id: 'invoices', label: 'Invoices & IDs', icon: <FileSpreadsheet className="w-3.5 h-3.5" /> },
    { id: 'equations', label: 'Equations', icon: <Calculator className="w-3.5 h-3.5" /> },
    { id: 'dates', label: 'Dates & Time', icon: <Calendar className="w-3.5 h-3.5" /> },
  ];

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
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-4">
          <button
            id="ninja-back-button"
            onClick={onExit}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center gap-1">
                <Binary className="w-3.5 h-3.5" />
                Precision Drill
              </span>
              <span className="text-xs text-slate-400">Numbers • Symbols • Punctuation Mastery</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight mt-1">Numeric & Symbol Ninja</h1>
          </div>
        </div>

        <button
          id="ninja-restart-button"
          onClick={restartRound}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700"
        >
          <RotateCcw className="w-3.5 h-3.5" /> New Pattern
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            id={`ninja-cat-${cat.id}`}
            onClick={() => switchCategory(cat.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              selectedCategory === cat.id
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {cat.icon}
            {cat.label}
          </button>
        ))}
      </div>

      {/* Main Board */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-slate-800 rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-400 transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Live Metrics */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center">
            <div className="text-[11px] text-slate-400 font-medium uppercase flex items-center justify-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-violet-400" /> Velocity
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {liveStats.wpm} <span className="text-xs font-normal text-slate-500">WPM</span>
            </div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center">
            <div className="text-[11px] text-slate-400 font-medium uppercase flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Accuracy
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1">{liveStats.accuracy}%</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center">
            <div className="text-[11px] text-slate-400 font-medium uppercase flex items-center justify-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" /> Symbol Combo
            </div>
            <div className="text-2xl font-black text-amber-400 mt-1">{liveStats.combo}</div>
          </div>
        </div>

        {/* Typing Surface */}
        <div className="min-h-[140px] bg-slate-950/80 border border-slate-800 rounded-xl p-6 font-mono text-xl leading-relaxed select-none break-words">
          {currentChars.map((item, idx) => {
            let color = 'text-slate-500';
            if (item.status === 'correct') color = 'text-violet-300 font-bold';
            if (item.status === 'incorrect') color = 'text-rose-400 bg-rose-500/20 rounded';
            if (item.status === 'corrected') color = 'text-amber-400';
            if (item.status === 'current') color = 'text-white underline decoration-violet-500 decoration-2 font-bold bg-violet-500/20 rounded';

            return (
              <span key={idx} className={`${color} transition-colors duration-75`}>
                {item.char}
              </span>
            );
          })}
        </div>

        {/* Results Modal */}
        {gameState === 'completed' && (
          <div className="mt-6 p-6 bg-slate-950/90 border border-slate-800 rounded-2xl text-center space-y-4">
            <div className="inline-flex p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white">Round Completed!</h2>
            <p className="text-sm text-slate-400">
              You typed specialized symbols with {liveStats.accuracy}% accuracy at {liveStats.wpm} WPM!
            </p>

            <div className="flex justify-center gap-4 pt-2">
              <button
                id="ninja-again-button"
                onClick={restartRound}
                className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm shadow-lg shadow-violet-500/20"
              >
                Next Set
              </button>
              <button
                id="ninja-finish-button"
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
