'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserProgress, TypingStats, AISettings, QuestState, QuestScene, QuestOption } from '@/types/typing';
import { generateQuestScene } from '@/lib/ai-service';
import { TypingEngine } from '@/lib/typing-engine';
import { soundFx } from '@/lib/sound';
import {
  Compass,
  ArrowLeft,
  Heart,
  Briefcase,
  Terminal,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Zap,
  RotateCcw,
} from 'lucide-react';

interface TypingQuestGameProps {
  userProgress: UserProgress;
  aiSettings: AISettings;
  onFinishSession: (stats: TypingStats, mode: string) => void;
  onExit: () => void;
}

export const TypingQuestGame: React.FC<TypingQuestGameProps> = ({
  userProgress,
  aiSettings,
  onFinishSession,
  onExit,
}) => {
  const [questState, setQuestState] = useState<QuestState>({
    currentSceneId: 'intro',
    health: 100,
    playerHp: 100,
    inventory: ['Neural Interface Deck', 'Bypass Dongle'],
    chapter: 1,
  });

  const [currentScene, setCurrentScene] = useState<QuestScene | null>(null);
  const [selectedOption, setSelectedOption] = useState<QuestOption | null>(null);
  const [engine, setEngine] = useState<TypingEngine>(() => new TypingEngine(''));
  const [isLoading, setIsLoading] = useState(true);
  const [liveStats, setLiveStats] = useState<TypingStats>(() => engine.getStats());

  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    focusInput();
  }, [focusInput, currentScene, selectedOption]);

  const questReqIdRef = useRef(0);
  const questStateRef = useRef(questState);
  useEffect(() => {
    questStateRef.current = questState;
  }, [questState]);

  // Load scene only when quest scene ID changes
  useEffect(() => {
    let active = true;
    const thisReq = ++questReqIdRef.current;
    const fetchScene = async () => {
      try {
        const scene = await generateQuestScene(questStateRef.current, 'success', aiSettings);
        if (!active || questReqIdRef.current !== thisReq) return;
        setCurrentScene(scene);
        setSelectedOption(null);
        const newEngine = new TypingEngine(scene.promptText);
        setEngine(newEngine);
        setLiveStats(newEngine.getStats());
      } finally {
        if (active && questReqIdRef.current === thisReq) {
          setIsLoading(false);
        }
      }
    };

    fetchScene();
    return () => {
      active = false;
    };
  }, [questState.currentSceneId, aiSettings]);

  // Start typing a choice option
  const chooseOption = (opt: QuestOption) => {
    setSelectedOption(opt);
    const newEngine = new TypingEngine(opt.promptText || opt.targetExcerpt || '');
    setEngine(newEngine);
    setLiveStats(newEngine.getStats());
    soundFx.playKeypress();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isLoading || !currentScene) return;

    if (e.key === 'Tab') {
      e.preventDefault();
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
        soundFx.playStreak();
        // If option was chosen, advance to next scene
        if (selectedOption) {
          const nextSceneId = selectedOption.nextSceneId || 'intro';
          const isVictory = nextSceneId.startsWith('victory');
          setQuestState((prev) => ({
            ...prev,
            currentSceneId: nextSceneId,
            chapter: prev.chapter + 1,
          }));

          if (isVictory) {
            soundFx.playVictory();
            onFinishSession(engine.getStats(), 'typing-quest');
          }
        }
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
            id="quest-back-button"
            onClick={onExit}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5" />
                Chapter {questState.chapter}
              </span>
              <span className="text-xs text-slate-400">Cyberpunk Infiltration Quest</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight mt-1">
              {currentScene?.title || 'Loading Scenario...'}
            </h1>
          </div>
        </div>

        {/* Inventory and Vitality */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-xl">
            <Heart className="w-4 h-4 text-rose-400 fill-rose-500/20" />
            <span className="text-xs font-bold text-rose-300">{questState.playerHp} HP</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-xl text-xs text-slate-400">
            <Briefcase className="w-4 h-4 text-amber-400" />
            <span>{questState.inventory.length} Gear</span>
          </div>
        </div>
      </div>

      {/* Main RPG Stage */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden space-y-5">
        {/* Narrative Box */}
        <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-5 font-mono text-sm leading-relaxed text-slate-300">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 mb-2">
            <Terminal className="w-4 h-4" /> SCENARIO LOG //
          </div>
          <p className="italic">{currentScene?.narrative}</p>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Typing Surface */}
        <div className="min-h-[130px] bg-slate-950/80 border border-slate-800 rounded-xl p-5 font-mono text-lg leading-relaxed select-none break-words">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-2">
            {selectedOption ? `Executing Route: ${selectedOption.label}` : 'Current Objective Protocol:'}
          </div>
          <div>
            {currentChars.map((item, idx) => {
              let color = 'text-slate-500';
              if (item.status === 'correct') color = 'text-emerald-400 font-bold';
              if (item.status === 'incorrect') color = 'text-rose-400 bg-rose-500/20 rounded';
              if (item.status === 'corrected') color = 'text-amber-400';
              if (item.status === 'current') color = 'text-white underline decoration-emerald-500 decoration-2 font-bold bg-emerald-500/20 rounded';

              return (
                <span key={idx} className={`${color} transition-colors duration-75`}>
                  {item.char}
                </span>
              );
            })}
          </div>
        </div>

        {/* Branching Choices */}
        {currentScene?.options && currentScene.options.length > 0 && !selectedOption && (
          <div className="space-y-2 pt-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Choose Infiltration Vector:</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentScene.options.map((opt) => (
                <button
                  key={opt.id}
                  id={`quest-opt-${opt.id}`}
                  onClick={() => chooseOption(opt)}
                  className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-800/80 text-left transition-all group"
                >
                  <div className="flex items-center justify-between text-sm font-bold text-white group-hover:text-emerald-300">
                    <span>{opt.label}</span>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Target Pace: {opt.targetWpm} WPM</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Victory Screen */}
        {currentScene?.id.startsWith('victory') && (
          <div className="p-6 bg-slate-950/90 border border-slate-800 rounded-2xl text-center space-y-4 mt-4">
            <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white">Infiltration Triumphant!</h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              You navigated the neural web, bypassed the automated sentries, and liberated the master grid!
            </p>
            <div className="flex justify-center gap-4 pt-2">
              <button
                id="quest-restart-button"
                onClick={() => {
                  setQuestState({
                    currentSceneId: 'intro',
                    health: 100,
                    playerHp: 100,
                    inventory: ['Neural Interface Deck', 'Bypass Dongle'],
                    chapter: 1,
                  });
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm"
              >
                Play Another Route
              </button>
              <button
                id="quest-exit-button"
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
