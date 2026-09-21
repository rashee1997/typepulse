'use client';

import React, { useMemo } from 'react';
import { UserProgress, TypingDnaCategoryScore, TypingDnaProfile } from '@/types/typing';
import { computeTypingDnaProfile } from '@/lib/typing-dna';
import {
  Zap,
  Target,
  Activity,
  ArrowRightLeft,
  Quote,
  Hash,
  Type,
  Timer,
  AlertCircle,
  Sparkles,
  Dna,
} from 'lucide-react';

interface TypingDNAPanelProps {
  userProgress?: UserProgress;
  profile?: TypingDnaProfile;
  compact?: boolean;
  className?: string;
  onSelectCategory?: (category: TypingDnaCategoryScore) => void;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  speed: Zap,
  accuracy: Target,
  consistency: Activity,
  transitions: ArrowRightLeft,
  punctuation: Quote,
  numbers: Hash,
  capitalization: Type,
  endurance: Timer,
};

export const TypingDNAPanel: React.FC<TypingDNAPanelProps> = ({
  userProgress,
  profile: externalProfile,
  compact = false,
  className = '',
  onSelectCategory,
}) => {
  const profile = useMemo(() => {
    if (externalProfile) return externalProfile;
    if (userProgress) return computeTypingDnaProfile(userProgress);
    return null;
  }, [externalProfile, userProgress]);

  if (!profile) return null;

  const { categories, weakestCategory, sessionsAnalyzed } = profile;

  // Calculate overall average score of valid dimensions
  const scoredCategories = categories.filter((c) => c.score !== null);
  const compositeScore =
    scoredCategories.length > 0
      ? Math.round(
          scoredCategories.reduce((sum, c) => sum + c.score!, 0) / scoredCategories.length
        )
      : null;

  return (
    <div
      id="typing-dna-panel"
      className={`bg-surface border border-border rounded-2xl shadow-card transition-all ${
        compact ? 'p-3.5 sm:p-4' : 'p-5 sm:p-6'
      } ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full bg-accent-subtle text-accent font-mono text-[10px] font-bold uppercase tracking-wider border border-accent-border flex items-center gap-1">
              <Dna className="w-3 h-3 text-accent" />
              8-Dimension Rubric
            </span>
            <span className="text-xs text-text-subtle font-mono">
              {sessionsAnalyzed > 0
                ? `${sessionsAnalyzed} recent session${sessionsAnalyzed === 1 ? '' : 's'}`
                : 'Local telemetry'}
            </span>
          </div>
          <h3 className="font-bold text-text-primary text-base flex items-center gap-2">
            <span>Typing DNA Performance Rubric</span>
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Calibrated 0–100 mastery index analyzing speed burst, rhythm variance, transitions, and character mechanics.
          </p>
        </div>

        {compositeScore !== null && (
          <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-text-subtle block leading-tight">
                DNA Index
              </span>
              <span className="text-lg sm:text-xl font-bold font-mono text-accent leading-tight">
                {compositeScore}
                <span className="text-xs font-normal text-text-subtle ml-0.5">/100</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-accent-subtle border border-accent-border flex items-center justify-center text-accent">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
        )}
      </div>

      {/* Weakest Category Alert / Call to Action */}
      {weakestCategory && (
        <div
          id="typing-dna-weakest-callout"
          className="my-3.5 p-3 rounded-xl bg-danger-subtle/70 border border-danger-border flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-danger">Primary Bottleneck:</span>
              <span className="font-semibold text-text-primary">{weakestCategory.title}</span>
              <span className="px-1.5 py-0.2 rounded bg-danger/10 text-danger font-mono font-bold text-[10px]">
                {weakestCategory.score}/100
              </span>
            </div>
            <p className="text-text-muted text-[11px] mt-0.5">
              Focusing your deliberate practice on {weakestCategory.title.toLowerCase()} will yield the largest overall WPM and fluency gains.
            </p>
          </div>
        </div>
      )}

      {/* Categories List */}
      <div
        id="typing-dna-categories-list"
        className={`grid gap-2.5 pt-3.5 ${
          compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'
        }`}
      >
        {categories.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.id] || Sparkles;
          const isWeakest = weakestCategory?.id === cat.id;

          let badgeStyle = 'bg-surface-muted text-text-subtle border-border';
          let barColor = 'bg-surface-muted';
          let labelText = '—';

          if (cat.label === 'strong') {
            badgeStyle = 'bg-success-subtle text-success border-success/40';
            barColor = 'bg-success';
            labelText = 'STRONG';
          } else if (cat.label === 'average') {
            badgeStyle = 'bg-warning-subtle text-warning border-warning/40';
            barColor = 'bg-warning';
            labelText = 'AVERAGE';
          } else if (cat.label === 'weak') {
            badgeStyle = 'bg-danger-subtle text-danger border-danger/40';
            barColor = 'bg-danger';
            labelText = 'WEAK';
          } else {
            labelText = 'DATA NEEDED';
          }

          return (
            <div
              key={cat.id}
              id={`typing-dna-category-${cat.id}`}
              onClick={() => onSelectCategory?.(cat)}
              className={`p-3 rounded-xl border transition-all ${
                isWeakest
                  ? 'border-accent/60 bg-accent-subtle/20 shadow-xs'
                  : 'border-border bg-surface-muted/30 hover:bg-surface-muted/60'
              } ${onSelectCategory ? 'cursor-pointer' : ''}`}
            >
              {/* Category Header Row */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isWeakest
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-surface border border-border text-text-muted'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-text-primary truncate">
                        {cat.title}
                      </span>
                      {isWeakest && (
                        <span className="px-1.5 py-0.2 rounded bg-accent text-accent-foreground text-[9px] font-bold uppercase tracking-wider">
                          Focus Here
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border tracking-wider ${badgeStyle}`}
                  >
                    {labelText}
                  </span>
                  <div className="font-mono text-sm font-bold text-text-primary min-w-[2.2rem] text-right">
                    {cat.score !== null ? (
                      <span>{cat.score}</span>
                    ) : (
                      <span className="text-text-subtle font-normal text-xs">—</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-surface-muted h-2 rounded-full overflow-hidden border border-border relative">
                {cat.score !== null ? (
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${Math.max(4, cat.score)}%` }}
                  />
                ) : (
                  <div className="w-full h-full border border-dashed border-border/80 bg-surface-subtle" />
                )}
              </div>

              {/* Detail Line */}
              <div className="flex items-center justify-between text-[10px] text-text-muted mt-1.5 font-mono">
                <span className="truncate">{cat.detail}</span>
                {cat.score !== null && (
                  <span className="text-text-subtle shrink-0 ml-2">/100</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Calibration Note */}
      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] text-text-subtle">
        <span>
          Scored across your rolling 40-session window, key statistics, and transition latencies.
        </span>
      </div>
    </div>
  );
};
