'use client';

import React, { useState } from 'react';
import { useModalFocus } from '@/hooks/use-modal-focus';
import { AISettings } from '@/types/typing';
import { callLlm, canUseLlm } from '@/lib/ai-service';
import { MATERIAL_SYSTEM_PROMPT } from '@/lib/ai-prompts';
import { Bot, ChevronRight, Code, FileText, Loader2, Sparkles, X, Zap } from 'lucide-react';

interface AICustomDrillModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiSettings: AISettings;
  onLaunchDrill: (text: string, title: string) => void;
  userWeakKeys?: string[];
}

export const AICustomDrillModal: React.FC<AICustomDrillModalProps> = ({
  isOpen,
  onClose,
  aiSettings,
  onLaunchDrill,
  userWeakKeys = [],
}) => {
  const dialogRef = useModalFocus<HTMLDivElement>(isOpen, onClose);
  const [kind, setKind] = useState<'paragraph' | 'code'>('paragraph');
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState<'typescript' | 'python' | 'rust' | 'go' | 'sql'>('typescript');
  const [complexity, setComplexity] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [targetFocus, setTargetFocus] = useState(userWeakKeys.slice(0, 4).join(', '));
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setGenerating(true);
    setErrorMsg(null);

    const weakList = targetFocus
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length === 1);

    // With no provider reachable there is nothing to wait for: use the built-in
    // material immediately instead of making a request that cannot succeed.
    if (!canUseLlm(aiSettings)) {
      if (kind === 'paragraph') {
        onLaunchDrill(
          'Rhythmic cadence is the true heart of velocity. When keystrokes land with calm, uniform tempo across every word, the barrier between conscious thought and digital expression vanishes effortlessly.',
          'Local Practice Passage'
        );
      } else {
        onLaunchDrill(
          `interface Task<T> {\n  id: string;\n  run: (ctx: Context) => Promise<T>;\n  retries: number;\n}`,
          `Local ${language.toUpperCase()} Drill`
        );
      }
      onClose();
      return;
    }

    try {
      if (kind === 'paragraph') {
        const theme = topic.trim() || 'scientific discovery and modern craftsmanship';
        const prompt = `Write one typing practice passage about "${theme}".

Requirements:
- 60 to 80 words in a single paragraph of 3 to 5 sentences.
- Natural, rhythmic English: even sentence lengths, no tongue-twisters, no rare punctuation.
- ${
          weakList.length > 0
            ? `Include words containing these letters naturally: ${weakList.join(', ')}.`
            : 'Do not pad the passage with filler sentences.'
        }
- Return the passage text only: no title, no introduction, no markdown and no quotes around it.`;

        const raw = await callLlm(prompt, MATERIAL_SYSTEM_PROMPT, aiSettings, {
          temperature: 0.8,
          maxTokens: 400,
        });
        const text = raw.replace(/```/g, '').trim();
        const words = text.split(/\s+/).filter(Boolean).length;
        if (text.length >= 25 && words >= 25) {
          onLaunchDrill(text, `AI Passage: ${theme.slice(0, 24)}`);
          onClose();
          return;
        }
      } else {
        const prompt = `Write a ${complexity} ${language} code snippet for typing practice.

Requirements:
- 5 to 8 lines of valid, idiomatic ${language}.
- Rich in brackets, braces, arrows, colons and operators.
- No comments explaining the code, no placeholder ellipses, no markdown fences.
- Return the raw code only, with correct indentation.`;

        const raw = await callLlm(prompt, MATERIAL_SYSTEM_PROMPT, aiSettings, {
          temperature: 0.6,
          maxTokens: 400,
        });
        const code = raw.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim();
        if (code.length >= 25) {
          onLaunchDrill(code, `AI Code (${language.toUpperCase()}): ${complexity}`);
          onClose();
          return;
        }
      }
      setErrorMsg('The generated material came back too short to practise. Try again, or pick another format.');
    } catch {
      // Deterministic instant fallback if the provider fails mid-request
      if (kind === 'paragraph') {
        const fallback =
          'Rhythmic cadence is the true heart of velocity. When keystrokes land with calm, uniform tempo across every word, the barrier between conscious thought and digital expression vanishes effortlessly.';
        onLaunchDrill(fallback, 'AI Offline Practice Passage');
        onClose();
      } else {
        const codeFallback = `interface Task<T> {\n  id: string;\n  run: (ctx: Context) => Promise<T>;\n  retries: number;\n}`;
        onLaunchDrill(codeFallback, `AI ${language.toUpperCase()} Fallback Drill`);
        onClose();
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-overlay backdrop-blur-md overflow-y-auto animate-fadeIn"
      id="ai-custom-drill-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-xl bg-surface border border-border rounded-2xl shadow-dialog overflow-hidden my-auto flex flex-col max-h-[90vh]"
        id="ai-custom-drill-modal-dialog"
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-custom-drill-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-surface-muted flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-subtle border border-primary-border flex items-center justify-center text-primary shadow-inner">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider font-bold text-primary bg-primary-subtle border border-primary-border px-2 py-0.5 rounded-full">
                  AI Generator
                </span>
                <span className="text-xs text-text-subtle font-mono">Custom Material</span>
              </div>
              <h2 className="text-lg font-bold text-text-primary mt-0.5" id="ai-custom-drill-modal-title">
                Synthesize Practice Material
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
            aria-label="Close AI drill generator modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Material Type Switch */}
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wider font-bold text-text-secondary">
              Material Format
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setKind('paragraph')}
                className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                  kind === 'paragraph'
                    ? 'bg-primary-subtle border-primary text-primary font-bold shadow-xs'
                    : 'bg-surface hover:bg-surface-hover border-border text-text-secondary'
                }`}
              >
                <FileText className="w-4 h-4 text-primary" />
                <div className="text-left">
                  <div className="text-xs">Fluent Prose Paragraph</div>
                  <div className="text-[10px] text-text-muted font-normal">Narrative flow & cadence</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setKind('code')}
                className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                  kind === 'code'
                    ? 'bg-primary-subtle border-primary text-primary font-bold shadow-xs'
                    : 'bg-surface hover:bg-surface-hover border-border text-text-secondary'
                }`}
              >
                <Code className="w-4 h-4 text-primary" />
                <div className="text-left">
                  <div className="text-xs">Developer Code Snippet</div>
                  <div className="text-[10px] text-text-muted font-normal">Brackets, arrows & syntax</div>
                </div>
              </button>
            </div>
          </div>

          {kind === 'paragraph' ? (
            <>
              {/* Topic Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary block">
                  Paragraph Theme or Topic (Optional)
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. quantum computing, deep sea exploration, stoic philosophy"
                  className="w-full px-3.5 py-2.5 bg-surface-muted border border-border rounded-xl text-xs text-text-primary placeholder:text-text-subtle focus:outline-none focus:border-accent"
                />
              </div>

              {/* Weak Keys Focus */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary block">
                  Focus Keys to Embed (Optional comma-separated)
                </label>
                <input
                  type="text"
                  value={targetFocus}
                  onChange={(e) => setTargetFocus(e.target.value)}
                  placeholder="e.g. z, q, p, x"
                  className="w-full px-3.5 py-2.5 bg-surface-muted border border-border rounded-xl text-xs font-mono text-text-primary placeholder:text-text-subtle focus:outline-none focus:border-accent"
                />
              </div>
            </>
          ) : (
            <>
              {/* Language Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary block">
                  Programming Language
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(['typescript', 'python', 'rust', 'go', 'sql'] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setLanguage(lang)}
                      className={`py-2 px-1 rounded-xl border text-xs font-mono font-bold capitalize transition-all cursor-pointer ${
                        language === lang
                          ? 'bg-accent text-accent-foreground border-accent shadow-xs'
                          : 'bg-surface hover:bg-surface-hover border-border text-text-secondary'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              {/* Complexity */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary block">
                  Syntax Complexity
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setComplexity(lvl)}
                      className={`py-2 px-2 rounded-xl border text-xs font-medium capitalize transition-all cursor-pointer ${
                        complexity === lvl
                          ? 'bg-primary-subtle text-primary border-primary font-bold'
                          : 'bg-surface hover:bg-surface-hover border-border text-text-secondary'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {errorMsg && (
            <div className="p-3 bg-danger-subtle border border-danger-border rounded-xl text-xs text-danger font-medium">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface-muted flex items-center justify-between shrink-0">
          <span className="text-xs text-text-subtle font-mono hidden sm:inline">
            Zero-downtime offline fallback active
          </span>
          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary rounded-xl hover:bg-surface-hover transition-colors border border-border cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={generating}
              onClick={handleGenerate}
              className="px-5 py-2 text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-xl transition-colors shadow-glow-accent-sm flex items-center gap-1.5 cursor-pointer"
              id="synthesize-practice-text-button"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate & Practice</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
