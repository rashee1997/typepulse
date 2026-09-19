'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserProgress, TypingStats, AISettings } from '@/types/typing';
import { generateWeaknessNarrative, generateAdaptiveMicroClause } from '@/lib/ai-service';
import { getWeakestPatterns } from '@/lib/progress-service';
import { TypingEngine } from '@/lib/typing-engine';
import { soundFx } from '@/lib/sound';
import {
  Sparkles,
  ArrowLeft,
  RotateCcw,
  Gauge,
  ShieldCheck,
  Flame,
  Brain,
  Layers,
  CheckCircle2,
  Cpu,
  Zap,
} from 'lucide-react';

interface WeaknessWeaverGameProps {
  userProgress: UserProgress;
  aiSettings: AISettings;
  onFinishSession: (stats: TypingStats, mode: string) => void;
  onExit: () => void;
}

export const WeaknessWeaverGame: React.FC<WeaknessWeaverGameProps> = ({
  userProgress,
  aiSettings,
  onFinishSession,
  onExit,
}) => {
  const [weakPatterns, setWeakPatterns] = useState<string[]>(() =>
    getWeakestPatterns(4, 'all', userProgress)
  );

  const [drillText, setDrillText] = useState<string>('Loading neural text pattern...');
  const [engine, setEngine] = useState<TypingEngine>(() => new TypingEngine(''));
  const [isLoading, setIsLoading] = useState(true);
  const [gameState, setGameState] = useState<'playing' | 'completed'>('playing');
  const [liveStats, setLiveStats] = useState<TypingStats>(() => engine.getStats());
  const [activeReinforcement, setActiveReinforcement] = useState<string | null>(null);

  // Dynamic injection limiter per round
  const injectionsCountRef = useRef<number>(0);
  const recentErrorPatternRef = useRef<{ lastChar: string; errorChar: string; count: number }>({
    lastChar: '',
    errorChar: '',
    count: 0,
  });

  // Prefetched next passage to ensure zero latency between rounds
  const prefetchedPassageRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    focusInput();
  }, [focusInput, drillText, gameState]);

  const reqSeqRef = useRef(0);

  // Load drill text
  const loadDrill = useCallback(
    async (patterns: string[]) => {
      const thisSeq = ++reqSeqRef.current;
      setIsLoading(true);
      try {
        let text = prefetchedPassageRef.current;
        if (!text) {
          text = await generateWeaknessNarrative(patterns, aiSettings);
        }
        prefetchedPassageRef.current = null;
        if (reqSeqRef.current !== thisSeq) return;
        setDrillText(text);

        const newEngine = new TypingEngine(text);
        setEngine(newEngine);
        setLiveStats(newEngine.getStats());
        setGameState('playing');

        // Prefetch next round in the background
        generateWeaknessNarrative(patterns, aiSettings).then((next) => {
          prefetchedPassageRef.current = next;
        });
      } finally {
        if (reqSeqRef.current === thisSeq) {
          setIsLoading(false);
        }
      }
    },
    [aiSettings]
  );

  // Load drill text on initial mount strictly once to prevent race condition
  const hasInitDrillRef = useRef(false);
  useEffect(() => {
    if (!hasInitDrillRef.current) {
      hasInitDrillRef.current = true;
      loadDrill(weakPatterns);
    }
  }, [loadDrill, weakPatterns]);

  const restartRound = () => {
    injectionsCountRef.current = 0;
    recentErrorPatternRef.current = { lastChar: '', errorChar: '', count: 0 };
    setActiveReinforcement(null);
    const updated = getWeakestPatterns(4, 'all', userProgress);
    setWeakPatterns(updated);
    loadDrill(updated);
    soundFx.playKeypress();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (gameState !== 'playing' || isLoading) return;

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
      const currentChar = engine.chars[engine.currentIndex]?.char || '';
      const prevChar = engine.chars[engine.currentIndex - 1]?.char || '';
      const res = engine.handleInput(e.key, e.ctrlKey);
      setLiveStats(engine.getStats());

      if (res.isCorrect) {
        soundFx.playKeypress();
      } else {
        soundFx.playError();

        // Bi-gram friction detection
        const targetPattern = (prevChar + currentChar).toLowerCase().replace(/[^a-z]/g, '');
        if (targetPattern.length >= 2 && injectionsCountRef.current < 2) {
          if (recentErrorPatternRef.current.errorChar === currentChar) {
            recentErrorPatternRef.current.count += 1;
          } else {
            recentErrorPatternRef.current = { lastChar: prevChar, errorChar: currentChar, count: 1 };
          }

          if (recentErrorPatternRef.current.count >= 2) {
            injectionsCountRef.current += 1;
            setActiveReinforcement(targetPattern);
            soundFx.playComboMilestone();
            setTimeout(() => setActiveReinforcement(null), 4500);
          }
        }
      }

      if (res.isFinished) {
        const finalStats = engine.getStats();
        setGameState('completed');
        soundFx.playVictory();
        onFinishSession(finalStats, 'weakness-weaver');
      }
    }
  };

  const currentChars = engine.chars;
  const progressPercent = Math.min(100, Math.round((engine.currentIndex / Math.max(1, engine.text.length)) * 100));

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
            id="weaver-back-button"
            onClick={onExit}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 flex items-center gap-1">
                <Brain className="w-3.5 h-3.5" />
                Adaptive Neural Synthesis
              </span>
              <span className="text-xs text-slate-400">Targeting EWMA Statistical Keystroke Hesitations</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight mt-1">Weakness Weaver</h1>
          </div>
        </div>

        <button
          id="weaver-reweave-button"
          onClick={restartRound}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Re-Weave Drill
        </button>
      </div>

      {/* Targeted Pattern Badges */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-fuchsia-400" />
          <span className="text-xs font-bold text-slate-300">Targeted N-Gram Sequences:</span>
          {activeReinforcement && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 animate-pulse">
              <Zap className="w-3 h-3 text-amber-400" />
              Dynamic Recalibration: [{activeReinforcement.toUpperCase()}]
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {weakPatterns.map((pattern, i) => (
            <span
              key={i}
              className="px-3 py-1 rounded-xl text-xs font-black font-mono bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-300 shadow-sm"
            >
              {pattern.toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      {/* Main Board */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-slate-800 rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Live Metrics */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center">
            <div className="text-[11px] text-slate-400 font-medium uppercase flex items-center justify-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-fuchsia-400" /> Velocity
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
              <Flame className="w-3.5 h-3.5 text-amber-400" /> Combo
            </div>
            <div className="text-2xl font-black text-amber-400 mt-1">{liveStats.combo}</div>
          </div>
        </div>

        {/* Text Canvas */}
        <div className="min-h-[150px] bg-slate-950/80 border border-slate-800 rounded-xl p-6 font-mono text-xl leading-relaxed select-none break-words">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-slate-400 text-sm gap-2">
              <Cpu className="w-4 h-4 animate-spin text-fuchsia-400" /> Synthesizing targeted n-gram drill...
            </div>
          ) : (
            currentChars.map((item, idx) => {
              let color = 'text-slate-500';
              if (item.status === 'correct') color = 'text-fuchsia-300 font-bold';
              if (item.status === 'incorrect') color = 'text-rose-400 bg-rose-500/20 rounded';
              if (item.status === 'corrected') color = 'text-amber-400';
              if (item.status === 'current') color = 'text-white underline decoration-fuchsia-500 decoration-2 font-bold bg-fuchsia-500/20 rounded';

              return (
                <span key={idx} className={`${color} transition-colors duration-75`}>
                  {item.char}
                </span>
              );
            })
          )}
        </div>

        {/* Completed Modal */}
        {gameState === 'completed' && (
          <div className="mt-6 p-6 bg-slate-950/90 border border-slate-800 rounded-2xl text-center space-y-4">
            <div className="inline-flex p-3 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white">Neural Drill Completed!</h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Your muscle memory was retrained on sequences: [{weakPatterns.join(', ')}]. EWMA latency records have been successfully updated!
            </p>

            <div className="flex justify-center gap-4 pt-2">
              <button
                id="weaver-next-button"
                onClick={restartRound}
                className="px-5 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-sm shadow-lg shadow-fuchsia-500/20"
              >
                Weave Next Drill
              </button>
              <button
                id="weaver-exit-button"
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
