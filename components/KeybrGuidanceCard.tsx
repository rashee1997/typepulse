'use client';

import React, { useState } from 'react';
import { KeybrProgressionState } from '@/types/typing';
import { Target, HelpCircle, ChevronDown, ChevronUp, RotateCcw, Type, Sparkles, CheckCircle2 } from 'lucide-react';

interface KeybrGuidanceCardProps {
  progression?: KeybrProgressionState;
  onSwitchToWords: () => void;
  onResetKeybr: () => void;
  onRegenerate: () => void;
}

export const KeybrGuidanceCard: React.FC<KeybrGuidanceCardProps> = ({
  progression,
  onSwitchToWords,
  onResetKeybr,
  onRegenerate,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  if (!progression) return null;

  const { activeAlphabet, unlockedKeyQueue, currentFocusKey, confidenceMap, totalKeysUnlocked } = progression;
  const focusConfidence = Math.round((confidenceMap[currentFocusKey] || 0.5) * 100);
  const percentComplete = Math.round((totalKeysUnlocked / 26) * 100);

  return (
    <div className="w-full bg-surface-muted/90 rounded-2xl border border-border/80 p-3.5 sm:p-4 mb-3 transition-all shadow-sm">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-accent-subtle rounded-xl text-accent">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-text-primary">Keybr Adaptive Progression</h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent-subtle text-accent font-semibold border border-accent/30">
                {totalKeysUnlocked} / 26 Keys Unlocked ({percentComplete}%)
              </span>
            </div>
            <p className="text-xs text-text-subtle mt-0.5">
              Sequential muscle memory training. Drills only contain your unlocked letters.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-text-muted hover:text-text-primary rounded-lg border border-border bg-surface hover:bg-surface-hover transition-colors cursor-pointer"
            aria-label={isExpanded ? 'Collapse Keybr guide' : 'Expand Keybr guide'}
          >
            <HelpCircle className="w-3.5 h-3.5 text-accent" />
            <span className="hidden xs:inline">{isExpanded ? 'Hide Guide' : 'How it works'}</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <button
            onClick={onSwitchToWords}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-accent hover:bg-accent-subtle rounded-lg border border-accent/30 font-medium transition-colors cursor-pointer"
            title="Switch to regular English words mode"
          >
            <Type className="w-3.5 h-3.5" />
            <span>Regular Words</span>
          </button>
        </div>
      </div>

      {/* Probation Focus & Key Visualizer */}
      <div className="mt-3 pt-3 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Focus key highlight */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-xl border border-border shadow-sm">
            <span className="text-xs text-text-muted font-medium">Target Focus Key:</span>
            <span className="px-2 py-0.5 rounded-lg bg-warning/15 text-warning font-mono font-bold text-sm border border-warning/40 animate-pulse">
              {currentFocusKey.toUpperCase()}
            </span>
            <span className="text-xs font-mono text-text-subtle">
              Confidence: <strong className="text-text-primary">{focusConfidence}%</strong> / 78%
            </span>
          </div>

          <button
            onClick={onRegenerate}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-text-muted hover:text-accent rounded-lg border border-border bg-surface hover:bg-surface-hover transition-colors cursor-pointer"
            title="Generate a fresh practice drill"
          >
            <RotateCcw className="w-3 h-3" />
            <span>New Drill</span>
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 w-full sm:w-48">
          <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden border border-border">
            <div
              className="h-full bg-accent transition-all duration-300 rounded-full"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
          <span className="text-[11px] font-mono text-text-subtle font-semibold whitespace-nowrap">
            {totalKeysUnlocked}/26
          </span>
        </div>
      </div>

      {/* Collapsible Explanatory Guide */}
      {isExpanded && (
        <div className="mt-3 p-3 bg-surface rounded-xl border border-border/70 text-xs space-y-2 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-text-muted">
            <div className="p-2 bg-surface-muted/60 rounded-lg">
              <span className="font-semibold text-text-primary flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-accent" /> 1. Unlocked Alphabet
              </span>
              <p className="text-[11px] leading-relaxed">
                You begin with high-frequency keys (<strong>E, N, I, T, R, L</strong>). Only words matching these letters are generated.
              </p>
            </div>

            <div className="p-2 bg-surface-muted/60 rounded-lg">
              <span className="font-semibold text-text-primary flex items-center gap-1.5 mb-1">
                <Target className="w-3.5 h-3.5 text-warning" /> 2. Target Focus
              </span>
              <p className="text-[11px] leading-relaxed">
                Your current probationary letter is <strong className="text-warning font-mono uppercase">{currentFocusKey}</strong>. Type accurately to build muscle memory.
              </p>
            </div>

            <div className="p-2 bg-surface-muted/60 rounded-lg">
              <span className="font-semibold text-text-primary flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" /> 3. Automatic Unlock
              </span>
              <p className="text-[11px] leading-relaxed">
                Reach <strong>78%+ confidence</strong> on {currentFocusKey.toUpperCase()}, and Keybr automatically unlocks the next letter ({unlockedKeyQueue[0]?.toUpperCase() || 'Done'}).
              </p>
            </div>
          </div>

          {/* Letter Chips Progression Map */}
          <div className="pt-2 border-t border-border/50">
            <div className="text-[11px] text-text-subtle mb-1.5 font-medium flex items-center justify-between">
              <span>Alphabet Unlock Pipeline:</span>
              <button
                onClick={() => {
                  if (window.confirm('Reset Keybr progression back to initial 6 keys (E, N, I, T, R, L)?')) {
                    onResetKeybr();
                  }
                }}
                className="text-[10px] text-text-muted hover:text-error underline cursor-pointer"
              >
                Reset Keybr Progression
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {activeAlphabet.map((k) => {
                const isFocus = k === currentFocusKey;
                const conf = Math.round((confidenceMap[k] || 0.5) * 100);
                return (
                  <span
                    key={k}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold uppercase transition-all ${
                      isFocus
                        ? 'bg-warning text-surface border border-warning shadow-sm animate-pulse'
                        : 'bg-accent/15 text-accent border border-accent/30'
                    }`}
                    title={`Key '${k.toUpperCase()}': ${conf}% confidence`}
                  >
                    {k}
                    <span className="text-[9px] opacity-75 font-normal">{conf}%</span>
                  </span>
                );
              })}

              {unlockedKeyQueue.map((k, idx) => (
                <span
                  key={k}
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono uppercase text-text-subtle/50 border border-border/40 bg-surface-muted/40 ${
                    idx === 0 ? 'border-dashed border-text-muted text-text-muted' : ''
                  }`}
                  title={idx === 0 ? `Next letter in queue: ${k.toUpperCase()}` : `Locked: ${k.toUpperCase()}`}
                >
                  {k}
                  {idx === 0 && <span className="text-[9px] text-text-subtle ml-0.5">next</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
