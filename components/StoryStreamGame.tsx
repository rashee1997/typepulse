'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserProgress, TypingStats, AISettings, AppPreferences } from '@/types/typing';
import { generateStoryStreamSegment } from '@/lib/ai-service';
import { TypingEngine } from '@/lib/typing-engine';
import { soundFx } from '@/lib/sound';
import {
  BookOpen,
  ChevronRight,
  Sparkles,
  ArrowLeft,
  RotateCcw,
  Gauge,
  Target,
  Flame,
  Bot,
  Compass,
  Feather,
  GitBranch,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface StoryStreamGameProps {
  userProgress: UserProgress;
  aiSettings: AISettings;
  preferences?: AppPreferences;
  onFinishSession: (stats: TypingStats, mode: string) => void;
  onExit: () => void;
}

const GENRES = [
  { id: 'cyberpunk', name: 'Cyberpunk Grid', desc: 'Neural jacks, encrypted packets, chrome sentinels' },
  { id: 'scifi', name: 'Sci-Fi Odyssey', desc: 'Sublight propulsion, orbital stations, uncharted cosmos' },
  { id: 'noir', name: 'Neon Noir', desc: 'Rain-slicked streets, private eyes, whispered secrets' },
  { id: 'techlore', name: 'Tech Lore', desc: 'Consensus protocols, compiler pipelines, kernel zero-copy' },
];

export const StoryStreamGame: React.FC<StoryStreamGameProps> = ({
  userProgress,
  aiSettings,
  preferences,
  onFinishSession,
  onExit,
}) => {
  const [selectedGenre, setSelectedGenre] = useState<string>('cyberpunk');
  const [chapterIndex, setChapterIndex] = useState(1);
  const [storyHistory, setStoryHistory] = useState<{ chapter: number; text: string; wpm: number }[]>([]);
  const [currentText, setCurrentText] = useState<string>('Initializing neural stream narrative...');
  const [isLoading, setIsLoading] = useState(true);
  const [isBranching, setIsBranching] = useState(false);
  const [branchOptions, setBranchOptions] = useState<{ id: string; label: string; prompt: string }[]>([]);
  const [customBranchInput, setCustomBranchInput] = useState('');
  
  const [engine, setEngine] = useState<TypingEngine>(() => new TypingEngine(''));
  const [liveStats, setLiveStats] = useState<TypingStats>(() => engine.getStats());
  const [targetWeakKeys, setTargetWeakKeys] = useState<string[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract weak keys
  const weakKeys = Object.entries(userProgress.keyStats)
    .filter(([char]) => char !== ' ')
    .sort(([, a], [, b]) => b.errors - a.errors)
    .slice(0, 4)
    .map(([char]) => char);

  const focusInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Fetch or generate the next story chapter
  const loadChapter = useCallback(
    async (genre: string, previousContext?: string) => {
      setIsLoading(true);
      setIsBranching(false);
      try {
        const seg = await generateStoryStreamSegment(genre, weakKeys, previousContext, aiSettings);
        setCurrentText(seg.paragraph);
        setTargetWeakKeys(seg.weakKeys);
        
        const newEngine = new TypingEngine(seg.paragraph, preferences?.errorMode || 'standard');
        setEngine(newEngine);
        setLiveStats(newEngine.getStats());
      } catch {
        const fallback = 'Neon rain poured across the dark pavement as the runner accelerated through the alleyway, gripping the neural terminal with fierce concentration and steady hands.';
        setCurrentText(fallback);
        const newEngine = new TypingEngine(fallback);
        setEngine(newEngine);
        setLiveStats(newEngine.getStats());
      } finally {
        setIsLoading(false);
        setTimeout(focusInput, 50);
      }
    },
    [aiSettings, preferences?.errorMode, focusInput, weakKeys]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      loadChapter(selectedGenre);
    }, 0);
    return () => clearTimeout(timer);
  }, [loadChapter, selectedGenre]);

  useEffect(() => {
    focusInput();
  }, [focusInput, currentText, isBranching]);

  // Metronome tick integration
  useEffect(() => {
    if (!preferences?.cadenceMetronomeEnabled || isBranching || isLoading) return;
    const targetWpm = preferences.cadenceTargetWpm || 60;
    const intervalMs = (60 / (targetWpm * 5)) * 1000;
    const vol = preferences.cadenceMetronomeVolume ?? 0.15;

    const timer = setInterval(() => {
      soundFx.playMetronomeTick(false, vol);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [preferences?.cadenceMetronomeEnabled, preferences?.cadenceTargetWpm, preferences?.cadenceMetronomeVolume, isBranching, isLoading]);

  // Handle Keystrokes
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isLoading || isBranching) return;

    if (e.key === 'Tab') {
      e.preventDefault();
      return;
    }

    const res = engine.handleInput(e.key, e.ctrlKey || e.metaKey);
    if (!res.success) return;

    if (res.isCorrect) {
      soundFx.playKeyClick();
    } else {
      soundFx.playError();
    }

    const currentStats = engine.getStats();
    setLiveStats(currentStats);

    // Chapter completed
    if (res.isFinished) {
      soundFx.playCombo();
      const finalStats = engine.getStats();
      setStoryHistory((prev) => [
        ...prev,
        { chapter: chapterIndex, text: currentText, wpm: finalStats.wpm },
      ]);
      onFinishSession(finalStats, 'story-stream');

      // Generate 2 context-aware branching prompts
      const options = [
        {
          id: 'opt-a',
          label: 'Infiltrate the Central Subnet',
          prompt: 'Proceed deeper into the facility and plug into the primary mainframe bus.',
        },
        {
          id: 'opt-b',
          label: 'Evasive Rooftop Extraction',
          prompt: 'Sprint toward the exterior maintenance ladder to evade oncoming aerial sentinels.',
        },
      ];
      setBranchOptions(options);
      setIsBranching(true);
    }
  };

  const handleSelectBranch = (branchPrompt: string) => {
    setChapterIndex((c) => c + 1);
    loadChapter(selectedGenre, branchPrompt);
  };

  const handleCustomBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customBranchInput.trim()) return;
    setChapterIndex((c) => c + 1);
    const chosen = customBranchInput.trim();
    setCustomBranchInput('');
    loadChapter(selectedGenre, chosen);
  };

  return (
    <div
      ref={containerRef}
      onClick={focusInput}
      className="w-full max-w-4xl mx-auto space-y-6 animate-fadeIn cursor-text"
      id="story-stream-game-container"
    >
      {/* Hidden input for capturing keys */}
      <input
        ref={inputRef}
        type="text"
        className="sr-only"
        onKeyDown={handleKeyDown}
        autoFocus
      />

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-surface border border-border rounded-2xl shadow-card">
        <div className="flex items-center gap-3">
          <button
            id="story-stream-back-button"
            onClick={onExit}
            className="p-2 rounded-xl bg-surface-muted hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors border border-border"
            title="Exit Story Stream"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent text-accent-foreground flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                AI Story Stream
              </span>
              <span className="text-xs font-mono font-bold text-accent">
                Chapter {chapterIndex}
              </span>
            </div>
            <h2 className="text-xl font-bold text-text-primary mt-0.5">
              Interactive Branching Narrative
            </h2>
          </div>
        </div>

        {/* Live Telemetry */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-text-secondary">
            <Gauge className="w-4 h-4 text-accent" />
            <span className="text-text-muted">Speed:</span>
            <span className="font-bold text-accent text-sm">{liveStats.wpm} WPM</span>
          </div>
          <div className="flex items-center gap-1.5 text-text-secondary">
            <Target className="w-4 h-4 text-success" />
            <span className="text-text-muted">Acc:</span>
            <span className="font-bold text-success text-sm">{liveStats.accuracy}%</span>
          </div>
          <div className="flex items-center gap-1.5 text-text-secondary">
            <Flame className="w-4 h-4 text-amber-500" />
            <span className="text-text-muted">Streak:</span>
            <span className="font-bold text-text-primary">{engine.combo}</span>
          </div>
        </div>
      </div>

      {/* Genre Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {GENRES.map((g) => (
          <button
            key={g.id}
            disabled={isLoading || isBranching}
            onClick={() => {
              setSelectedGenre(g.id);
              setChapterIndex(1);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
              selectedGenre === g.id
                ? 'bg-accent text-accent-foreground border-accent shadow-glow-accent-sm'
                : 'bg-surface hover:bg-surface-hover text-text-secondary border-border'
            }`}
          >
            {g.name}
          </button>
        ))}
        {targetWeakKeys.length > 0 && (
          <div className="ml-auto flex items-center gap-1 text-xs text-text-muted">
            <Sparkles className="w-3 h-3 text-accent" />
            <span>Targeting keys:</span>
            {targetWeakKeys.map((k) => (
              <span key={k} className="px-1.5 py-0.5 rounded bg-surface-muted border border-border font-mono font-bold text-accent">
                {k.toUpperCase()}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Main Narrative Typing Card */}
      <div className="relative p-6 sm:p-8 bg-surface border border-border rounded-3xl shadow-card min-h-[220px] flex flex-col justify-between">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-text-muted">
            <Bot className="w-8 h-8 text-accent animate-pulse" />
            <p className="text-xs font-mono">Synthesizing narrative prose with embedded weak chords...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Story Prompt Display */}
            <div className="text-lg sm:text-xl font-mono leading-relaxed tracking-wide select-none">
              {engine.chars.map((charObj, index) => {
                let colorClass = 'text-text-muted opacity-40';
                if (charObj.status === 'correct') {
                  colorClass = 'text-accent font-semibold opacity-100';
                } else if (charObj.status === 'incorrect') {
                  colorClass = 'text-danger bg-danger/20 rounded px-0.5 font-bold';
                } else if (charObj.status === 'current') {
                  colorClass = 'text-text-primary underline decoration-accent decoration-2 font-bold';
                }

                return (
                  <span key={index} className={colorClass}>
                    {charObj.char}
                  </span>
                );
              })}
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-surface-muted h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-accent h-full transition-all duration-100"
                style={{
                  width: `${engine.text.length > 0 ? (engine.currentIndex / engine.text.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Branching Narrative Choice Modal / Overlay */}
      {isBranching && (
        <div className="p-6 bg-gradient-to-br from-surface via-surface-muted to-surface border border-accent/40 rounded-3xl shadow-card space-y-4 animate-fadeIn">
          <div className="flex items-center gap-2 text-accent font-bold text-sm">
            <GitBranch className="w-4 h-4" />
            <span>Chapter {chapterIndex} Complete! Choose your narrative direction:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {branchOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleSelectBranch(opt.prompt)}
                className="p-4 rounded-2xl bg-surface hover:bg-surface-hover border border-border hover:border-accent/50 text-left transition-all group flex flex-col justify-between gap-2 shadow-sm"
              >
                <div>
                  <div className="font-bold text-text-primary text-sm group-hover:text-accent transition-colors flex items-center justify-between">
                    <span>{opt.label}</span>
                    <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-accent transition-transform group-hover:translate-x-1" />
                  </div>
                  <p className="text-xs text-text-muted mt-1">{opt.prompt}</p>
                </div>
                <span className="text-[11px] font-mono text-accent font-semibold">+60 XP Chapter Bonus</span>
              </button>
            ))}
          </div>

          {/* Or type a custom branch */}
          <form onSubmit={handleCustomBranch} className="pt-2 flex items-center gap-2">
            <input
              type="text"
              placeholder="Or type your own plot direction (e.g. 'Sneak into the docking bay...')"
              value={customBranchInput}
              onChange={(e) => setCustomBranchInput(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-surface border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={!customBranchInput.trim()}
              className="px-4 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-accent-foreground font-bold text-xs rounded-xl transition-colors shadow-glow-accent-sm whitespace-nowrap"
            >
              Continue Plot
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
