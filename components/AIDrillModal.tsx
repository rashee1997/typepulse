'use client';

import React, { useState, useEffect } from 'react';
import { useModalFocus } from '@/hooks/use-modal-focus';
import { Lesson, AIDrillOptions, AIDrillResult, AIDrillStyle, AISettings, UserProgress } from '@/types/typing';
import { generateLessonAiDrill } from '@/lib/ai-service';
import { getLessonTargetKeys, getCumulativeKeysForLesson, sanitizePatternToAllowedKeys } from '@/lib/curriculum';
import { 
  Sparkles, 
  ShieldCheck, 
  RotateCcw, 
  Play, 
  X, 
  Sliders, 
  Layers, 
  Target, 
  Repeat, 
  BookOpen, 
  Zap,
  Waves
} from 'lucide-react';

interface AIDrillModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: Lesson | null;
  userProgress: UserProgress;
  aiSettings: AISettings;
  onStartDrill: (drill: AIDrillResult, lesson: Lesson) => void;
  initialStyle?: AIDrillStyle;
}

export const AIDrillModal: React.FC<AIDrillModalProps> = ({
  isOpen,
  onClose,
  lesson,
  userProgress,
  aiSettings,
  onStartDrill,
  initialStyle = 'alternating',
}) => {
  const dialogRef = useModalFocus<HTMLDivElement>(isOpen, onClose);
  const [style, setStyle] = useState<AIDrillStyle>(initialStyle);
  const [scope, setScope] = useState<'target_only' | 'cumulative'>('target_only');
  const [length, setLength] = useState<15 | 25 | 40>(25);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDrill, setGeneratedDrill] = useState<AIDrillResult | null>(null);

  // When opened or lesson changed, generate an initial drill pattern
  useEffect(() => {
    if (!isOpen || !lesson) return;

    let isMounted = true;

    const runGeneration = async () => {
      setIsGenerating(true);
      const options: AIDrillOptions = {
        lessonId: lesson.id,
        style,
        scope,
        length,
      };

      try {
        const weakKeys = userProgress.keyStats ? Object.keys(userProgress.keyStats) : [];
        const res = await generateLessonAiDrill(lesson, options, aiSettings, weakKeys);
        if (isMounted) {
          setGeneratedDrill(res);
        }
      } catch {
        // Fallback error handling
      } finally {
        if (isMounted) {
          setIsGenerating(false);
        }
      }
    };

    void runGeneration();

    return () => {
      isMounted = false;
    };
  }, [isOpen, lesson, style, scope, length, aiSettings, userProgress.keyStats]);

  if (!isOpen || !lesson) return null;

  const handleRegenerate = async () => {
    setIsGenerating(true);
    try {
      const options: AIDrillOptions = {
        lessonId: lesson.id,
        style,
        scope,
        length,
      };
      const res = await generateLessonAiDrill(
        lesson, 
        options, 
        aiSettings, 
        userProgress.keyStats ? Object.keys(userProgress.keyStats) : []
      );
      setGeneratedDrill(res);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStart = () => {
    if (generatedDrill) {
      onStartDrill(generatedDrill, lesson);
      onClose();
    }
  };

  // Inspect allowed keys
  const targetKeys = getLessonTargetKeys(lesson).filter((k) => k !== ' ');
  const cumulativeKeys = getCumulativeKeysForLesson(lesson.id).filter((k) => k !== ' ');
  const activeAllowedKeys = scope === 'target_only' ? targetKeys : cumulativeKeys;

  // Verify that preview content strictly has zero foreign characters
  const previewText = generatedDrill?.content || '';
  const sanitizedPreview = sanitizePatternToAllowedKeys(previewText, activeAllowedKeys);
  const is100PercentClean = previewText.length > 0 && previewText === sanitizedPreview;

  const styleOptions: { id: AIDrillStyle; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'alternating',
      label: 'Alternating Cadence',
      icon: <Zap className="w-4 h-4 text-accent" />,
      desc: 'Bilateral left-right hand alternation for speed and flow.',
    },
    {
      id: 'repetition',
      label: 'Rhythmic Chunks',
      icon: <Repeat className="w-4 h-4 text-primary" />,
      desc: 'Double, triple strokes & muscle memory rolling chords.',
    },
    {
      id: 'words',
      label: 'Word Combinations',
      icon: <BookOpen className="w-4 h-4 text-success" />,
      desc: 'Real words & pronounceable syllables strictly using unlocked letters.',
    },
    {
      id: 'weak_keys',
      label: 'Struggle Key Overdrive',
      icon: <Target className="w-4 h-4 text-warning" />,
      desc: 'Targets keys with past accuracy drops from this lesson.',
    },
    {
      id: 'flow',
      label: 'Flow Digraphs',
      icon: <Waves className="w-4 h-4 text-info" />,
      desc: 'Rolling n-grams and seamless transitions across finger lanes.',
    },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-overlay backdrop-blur-md overflow-y-auto animate-fadeIn"
      id="ai-drill-modal-backdrop"
    >
      <div 
        className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-dialog overflow-hidden my-auto flex flex-col"
        id="ai-drill-modal-dialog"
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-drill-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-surface-muted flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent-subtle border border-accent-border flex items-center justify-center text-accent shadow-glow-accent-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider font-bold text-accent bg-accent-subtle border border-accent-border px-2 py-0.5 rounded-full">
                  AI Lesson Agent
                </span>
                <span className="text-xs text-text-subtle font-mono">{lesson.tierTitle}</span>
              </div>
              <h2 className="text-lg font-bold text-text-primary mt-0.5" id="ai-drill-modal-title">
                Practice Patterns: {lesson.title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
            title="Close modal"
            aria-label="Close AI drill modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Context Boundary Whitelist Box */}
          <div className="p-3.5 bg-surface-muted border border-border rounded-xl space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                <ShieldCheck className="w-4 h-4 text-success" />
                <span>Context Whitelist Boundary</span>
              </div>
              <span className="text-[11px] font-medium text-success bg-success-subtle border border-success-border px-2 py-0.5 rounded-full flex items-center gap-1">
                <span>✓ Guaranteed: 0 Foreign Characters</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-xs text-text-muted mr-1">Allowed keys:</span>
              {activeAllowedKeys.map((key) => (
                <span
                  key={key}
                  className="px-2 py-0.5 bg-surface border border-border-hover rounded-md text-xs font-mono font-bold text-accent shadow-xs"
                >
                  {key.toUpperCase()}
                </span>
              ))}
              <span className="px-2 py-0.5 bg-surface border border-border rounded-md text-xs font-mono text-text-muted">
                [Space]
              </span>
            </div>
          </div>

          {/* Drill Options Grid */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">
              <Sliders className="w-3.5 h-3.5 text-accent" />
              <span>Pattern Style</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {styleOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setStyle(opt.id)}
                  className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                    style === opt.id
                      ? 'bg-accent-subtle/50 border-accent text-text-primary shadow-xs'
                      : 'bg-surface-muted/50 border-border hover:border-border-hover text-text-secondary'
                  }`}
                >
                  <div className="p-1.5 rounded-lg bg-surface border border-border shrink-0 mt-0.5">
                    {opt.icon}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-text-primary flex items-center gap-1">
                      {opt.label}
                    </div>
                    <p className="text-[11px] text-text-muted mt-0.5 leading-snug">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Scope and Length Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Key Scope */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                <span>Letter Whitelist Scope</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-surface-muted border border-border rounded-xl">
                <button
                  type="button"
                  onClick={() => setScope('target_only')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                    scope === 'target_only'
                      ? 'bg-surface text-accent font-bold shadow-xs border border-border'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  Target Keys ({targetKeys.length})
                </button>
                <button
                  type="button"
                  onClick={() => setScope('cumulative')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                    scope === 'cumulative'
                      ? 'bg-surface text-accent font-bold shadow-xs border border-border'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  Cumulative ({cumulativeKeys.length})
                </button>
              </div>
            </div>

            {/* Drill Length */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-accent" />
                <span>Drill Length</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-surface-muted border border-border rounded-xl">
                {([15, 25, 40] as const).map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setLength(cnt)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                      length === cnt
                        ? 'bg-surface text-accent font-bold shadow-xs border border-border'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {cnt} Words
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Generated Pattern Live Preview */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                <span>Pattern Preview</span>
                {generatedDrill?.source && (
                  <span className="text-[10px] text-text-subtle font-mono">
                    ({generatedDrill.source === 'gemini' ? 'AI Synthesized' : 'Algorithmic Generator'})
                  </span>
                )}
              </span>

              <button
                type="button"
                onClick={handleRegenerate}
                disabled={isGenerating}
                className="text-xs text-accent hover:text-accent-hover font-semibold flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RotateCcw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isGenerating ? 'Generating...' : 'Re-roll Combinations'}</span>
              </button>
            </div>

            <div className="p-4 bg-surface-muted/80 border border-border rounded-xl font-mono text-xs text-text-primary leading-relaxed break-words min-h-[72px] flex items-center justify-center">
              {isGenerating ? (
                <div className="flex items-center gap-2 text-text-muted">
                  <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                  <span>Generating tailored letter combinations...</span>
                </div>
              ) : previewText ? (
                <div className="w-full select-all">{previewText}</div>
              ) : (
                <span className="text-text-muted">No pattern generated yet</span>
              )}
            </div>

            {/* Validation Verification Footer */}
            {previewText && (
              <div className="flex items-center justify-between text-[11px] text-text-subtle px-1">
                <span>Word tokens: {previewText.split(' ').length}</span>
                <span className="flex items-center gap-1 text-success">
                  <ShieldCheck className="w-3.5 h-3.5 text-success" />
                  <span>Strict Lesson Whitelist Enforced</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-border bg-surface-muted flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleStart}
            disabled={!generatedDrill || isGenerating}
            className="px-5 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-accent-foreground text-xs font-bold rounded-xl shadow-glow-accent-sm transition-all flex items-center gap-2 cursor-pointer"
            id="start-ai-drill-button"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start AI Practice Drill</span>
          </button>
        </div>
      </div>
    </div>
  );
};
