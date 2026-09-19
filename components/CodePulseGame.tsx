'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserProgress, TypingStats, AISettings, AppPreferences } from '@/types/typing';
import { generateCodePulseDrill } from '@/lib/ai-service';
import { TypingEngine } from '@/lib/typing-engine';
import { soundFx } from '@/lib/sound';
import {
  Code2,
  Terminal,
  ArrowLeft,
  RotateCcw,
  Gauge,
  Target,
  Flame,
  Bot,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Braces,
  Cpu,
} from 'lucide-react';

interface CodePulseGameProps {
  userProgress: UserProgress;
  aiSettings: AISettings;
  preferences?: AppPreferences;
  onFinishSession: (stats: TypingStats, mode: string) => void;
  onExit: () => void;
}

type SupportedLanguage = 'typescript' | 'python' | 'rust' | 'go' | 'sql';
type Complexity = 'beginner' | 'intermediate' | 'advanced';

const LANGUAGES: { id: SupportedLanguage; label: string; icon: string }[] = [
  { id: 'typescript', label: 'TypeScript', icon: 'TS' },
  { id: 'python', label: 'Python', icon: 'PY' },
  { id: 'rust', label: 'Rust', icon: 'RS' },
  { id: 'go', label: 'Go', icon: 'GO' },
  { id: 'sql', label: 'SQL', icon: 'DB' },
];

export const CodePulseGame: React.FC<CodePulseGameProps> = ({
  userProgress,
  aiSettings,
  preferences,
  onFinishSession,
  onExit,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('typescript');
  const [complexity, setComplexity] = useState<Complexity>('intermediate');
  const [codeSnippet, setCodeSnippet] = useState<string>('// Loading developer code pulse...');
  const [description, setDescription] = useState<string>('');
  const [targetSymbols, setTargetSymbols] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  const [engine, setEngine] = useState<TypingEngine>(() => new TypingEngine(''));
  const [liveStats, setLiveStats] = useState<TypingStats>(() => engine.getStats());

  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const reqIdRef = useRef(0);

  const loadDrill = useCallback(
    async (lang: SupportedLanguage, comp: Complexity) => {
      const thisReqId = ++reqIdRef.current;
      setIsLoading(true);
      setIsCompleted(false);
      try {
        const drill = await generateCodePulseDrill(lang, comp, aiSettings);
        if (reqIdRef.current !== thisReqId) return;
        setCodeSnippet(drill.code);
        setDescription(drill.description);
        setTargetSymbols(drill.targetSymbols);

        const newEngine = new TypingEngine(drill.code, preferences?.errorMode || 'standard');
        setEngine(newEngine);
        setLiveStats(newEngine.getStats());
      } catch {
        if (reqIdRef.current !== thisReqId) return;
        const fallback = 'const calc = (items: number[]): number => items.reduce((a, b) => a + b, 0);';
        setCodeSnippet(fallback);
        setDescription('Array Reduction with Typed Parameter');
        setTargetSymbols(['(', ')', ':', '[', ']', '=>', '{', '}']);
        const newEngine = new TypingEngine(fallback);
        setEngine(newEngine);
        setLiveStats(newEngine.getStats());
      } finally {
        if (reqIdRef.current === thisReqId) {
          setIsLoading(false);
          setTimeout(focusInput, 50);
        }
      }
    },
    [aiSettings, preferences?.errorMode, focusInput]
  );

  const hasLoadedRef = useRef(false);
  const prevLangCompRef = useRef(`${selectedLanguage}-${complexity}`);
  useEffect(() => {
    const key = `${selectedLanguage}-${complexity}`;
    if (!hasLoadedRef.current || prevLangCompRef.current !== key) {
      hasLoadedRef.current = true;
      prevLangCompRef.current = key;
      loadDrill(selectedLanguage, complexity);
    }
  }, [loadDrill, selectedLanguage, complexity]);

  useEffect(() => {
    focusInput();
  }, [focusInput, codeSnippet, isCompleted]);

  // Metronome tick integration
  useEffect(() => {
    if (!preferences?.cadenceMetronomeEnabled || isCompleted || isLoading) return;
    const targetWpm = preferences.cadenceTargetWpm || 55;
    const intervalMs = (60 / (targetWpm * 5)) * 1000;
    const vol = preferences.cadenceMetronomeVolume ?? 0.15;

    const timer = setInterval(() => {
      soundFx.playMetronomeTick(false, vol);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [preferences?.cadenceMetronomeEnabled, preferences?.cadenceTargetWpm, preferences?.cadenceMetronomeVolume, isCompleted, isLoading]);

  // Handle Keystrokes
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isLoading || isCompleted) return;

    if (e.key === 'Tab') {
      e.preventDefault();
      // Translate tab into two spaces or single space
      const res = engine.handleInput(' ', false);
      if (res.success) {
        setLiveStats(engine.getStats());
      }
      return;
    }

    // Convert Enter to newline match if expected
    let inputKey = e.key;
    if (e.key === 'Enter') {
      inputKey = '\n';
    }

    const res = engine.handleInput(inputKey, e.ctrlKey || e.metaKey);
    if (!res.success) return;

    if (res.isCorrect) {
      soundFx.playKeyClick();
    } else {
      soundFx.playError();
    }

    const currentStats = engine.getStats();
    setLiveStats(currentStats);

    if (res.isFinished) {
      soundFx.playCombo();
      setIsCompleted(true);
      onFinishSession(currentStats, 'code-pulse');
    }
  };

  return (
    <div
      onClick={focusInput}
      className="w-full max-w-4xl mx-auto space-y-6 animate-fadeIn cursor-text"
      id="code-pulse-game-container"
    >
      {/* Hidden input for capturing keys */}
      <input
        ref={inputRef}
        type="text"
        className="sr-only"
        onKeyDown={handleKeyDown}
        value=""
        onChange={() => {}}
        autoFocus
      />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-surface border border-border rounded-2xl shadow-card">
        <div className="flex items-center gap-3">
          <button
            id="code-pulse-back-button"
            onClick={onExit}
            className="p-2 rounded-xl bg-surface-muted hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors border border-border"
            title="Exit Code Pulse"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                <Code2 className="w-3 h-3" />
                Code Pulse Developer Drill
              </span>
              <span className="text-xs font-mono font-bold text-accent">
                {selectedLanguage.toUpperCase()}
              </span>
            </div>
            <h2 className="text-xl font-bold text-text-primary mt-0.5">
              Syntax, Braces & Operator Velocity
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

      {/* Language & Complexity Selectors */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Language Tabs */}
        <div className="flex items-center gap-1.5 bg-surface p-1 rounded-xl border border-border">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              disabled={isLoading}
              onClick={() => setSelectedLanguage(lang.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                selectedLanguage === lang.id
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <span className="font-mono text-[10px] opacity-70">{lang.icon}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>

        {/* Complexity Pills */}
        <div className="flex items-center gap-1 bg-surface-muted p-1 rounded-xl border border-border">
          {(['beginner', 'intermediate', 'advanced'] as Complexity[]).map((c) => (
            <button
              key={c}
              disabled={isLoading}
              onClick={() => setComplexity(c)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                complexity === c
                  ? 'bg-surface text-text-primary border border-border shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Code Editor Window */}
      <div className="relative bg-[#0d1117] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        {/* Mac OS Window Header */}
        <div className="px-5 py-3 bg-[#161b22] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
            <span className="ml-3 text-xs font-mono text-slate-400">
              drill.{selectedLanguage === 'typescript' ? 'ts' : selectedLanguage === 'python' ? 'py' : selectedLanguage === 'rust' ? 'rs' : selectedLanguage === 'go' ? 'go' : 'sql'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Braces className="w-3.5 h-3.5 text-accent" />
            <span>{description}</span>
          </div>
        </div>

        {/* Code Canvas */}
        <div className="p-6 font-mono text-sm leading-relaxed overflow-x-auto select-none min-h-[200px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500">
              <Cpu className="w-8 h-8 text-accent animate-pulse" />
              <p className="text-xs font-mono">Generating authentic {selectedLanguage} syntax snippet...</p>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap break-all">
              {engine.chars.map((charObj, index) => {
                let colorClass = 'text-slate-500';
                if (charObj.status === 'correct') {
                  colorClass = 'text-emerald-400 font-semibold';
                } else if (charObj.status === 'incorrect') {
                  colorClass = 'text-red-400 bg-red-950/60 rounded px-0.5 font-bold';
                } else if (charObj.status === 'current') {
                  colorClass = 'text-white bg-accent/30 rounded px-0.5 underline font-bold';
                }

                return (
                  <span key={index} className={colorClass}>
                    {charObj.char === '\n' ? '↵\n' : charObj.char}
                  </span>
                );
              })}
            </pre>
          )}
        </div>

        {/* Targeted Symbols Bar */}
        <div className="px-5 py-2.5 bg-[#161b22] border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Target Symbols:</span>
            {targetSymbols.map((s, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded bg-slate-800 text-accent font-bold">
                {s}
              </span>
            ))}
          </div>

          <button
            onClick={() => loadDrill(selectedLanguage, complexity)}
            className="text-xs text-accent hover:underline flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> New Snippet
          </button>
        </div>
      </div>

      {/* Completion Modal / Banner */}
      {isCompleted && (
        <div className="p-6 bg-surface border border-emerald-500/40 rounded-3xl shadow-card flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-text-primary text-base">Snippet Executed Cleanly!</h3>
              <p className="text-xs text-text-muted">
                Paced at {liveStats.wpm} WPM with {liveStats.accuracy}% accuracy across developer symbols.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => loadDrill(selectedLanguage, complexity)}
              className="px-4 py-2 bg-surface-muted hover:bg-surface-hover text-text-secondary text-xs font-medium rounded-xl border border-border"
            >
              Next Snippet
            </button>
            <button
              onClick={onExit}
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-accent-foreground text-xs font-bold rounded-xl shadow-glow-accent-sm"
            >
              Back to Arcade
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
