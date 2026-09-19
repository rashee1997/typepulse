'use client';

import React, { useState } from 'react';
import { FINGER_REACH_MAP } from '@/lib/keyboard-geometry';
import { TypingStats, UserProgress } from '@/types/typing';
import { Activity, AlertCircle, ChevronDown, ChevronUp, Sparkles, Target, Zap } from 'lucide-react';

interface BiometricLatencyHUDProps {
  stats: TypingStats;
  userProgress?: UserProgress;
  onDrillKey?: (key: string) => void;
  className?: string;
  defaultExpanded?: boolean;
}

export const BiometricLatencyHUD: React.FC<BiometricLatencyHUDProps> = ({
  stats,
  userProgress,
  onDrillKey,
  className = '',
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Compute pattern statistics from current session stats or userProgress key stats
  const patternEntries = Object.entries(stats.patternStats || {}).filter(
    ([key, p]) => key.length === 1 && p.typed >= 2
  );

  // Fallback: If session just started and patternStats is sparse, use userProgress keyStats
  const totalTyped = patternEntries.reduce((acc, [, p]) => acc + p.typed, 0);
  const totalMs = patternEntries.reduce((acc, [, p]) => acc + p.totalLatencyMs, 0);
  const globalAvgMs = totalTyped > 0 ? Math.round(totalMs / totalTyped) : 220;

  // Rank keys by latency penalty relative to global average
  const latencyRanked = patternEntries
    .map(([key, data]) => {
      const avg = Math.round(data.avgLatencyMs || (data.typed > 0 ? data.totalLatencyMs / data.typed : 0));
      const delta = avg - globalAvgMs;
      const percentDelta = globalAvgMs > 0 ? Math.round((delta / globalAvgMs) * 100) : 0;
      const reach = FINGER_REACH_MAP[key.toLowerCase()] || FINGER_REACH_MAP[key];

      return {
        key,
        typed: data.typed,
        errors: data.errors,
        avgMs: avg,
        deltaMs: delta,
        percentDelta,
        fingerLabel: reach?.fingerLabel || 'Standard',
        homeKey: reach?.homeKey || '',
      };
    })
    .sort((a, b) => b.avgMs - a.avgMs);

  // Top 3 bottleneck keys with latency exceeding global avg
  const bottleneckKeys = latencyRanked.filter((k) => k.deltaMs > 30).slice(0, 4);
  // Top 3 flow keys (fastest with 0 errors)
  const flowKeys = latencyRanked.filter((k) => k.deltaMs < -20 && k.errors === 0).slice(0, 3);

  if (patternEntries.length === 0) {
    return null;
  }

  return (
    <div
      className={`w-full bg-surface border border-border rounded-2xl shadow-sm transition-all overflow-hidden ${className}`}
      id="biometric-latency-hud"
    >
      {/* Header Bar */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2.5 bg-surface-muted/60 hover:bg-surface-muted flex items-center justify-between transition-colors text-left cursor-pointer"
        aria-expanded={isExpanded}
        aria-controls="biometric-latency-details"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-accent-subtle text-accent border border-accent-border shrink-0">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-text-primary">Biometric Keystroke Latency</span>
            <span className="text-[11px] font-mono text-text-subtle">
              Baseline: <strong className="text-accent font-semibold">{globalAvgMs}ms</strong>/key
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {bottleneckKeys.length > 0 && !isExpanded && (
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-text-subtle font-mono hidden sm:inline">Hesitations:</span>
              <div className="flex items-center gap-1">
                {bottleneckKeys.slice(0, 3).map((b) => (
                  <span
                    key={b.key}
                    className="px-1.5 py-0.5 rounded bg-danger-subtle border border-danger-border text-danger font-mono text-[11px] font-bold"
                  >
                    {b.key.toUpperCase()} +{b.deltaMs}ms
                  </span>
                ))}
              </div>
            </div>
          )}
          <span className="text-text-muted">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </div>
      </button>

      {/* Expanded Analysis Drawer */}
      {isExpanded && (
        <div id="biometric-latency-details" className="p-4 space-y-3.5 border-t border-border animate-fadeIn">
          {/* Summary Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-2.5 rounded-xl bg-surface-muted border border-border flex flex-col gap-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-text-subtle">Session Average</span>
              <span className="text-lg font-extrabold font-mono text-text-primary">
                {globalAvgMs} <span className="text-xs font-normal text-text-muted">ms</span>
              </span>
              <span className="text-[10px] text-text-muted">Inter-key transition speed</span>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-muted border border-border flex flex-col gap-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-text-subtle">Primary Friction</span>
              <span className="text-lg font-extrabold font-mono text-danger">
                {bottleneckKeys[0] ? `${bottleneckKeys[0].key.toUpperCase()} (+${bottleneckKeys[0].deltaMs}ms)` : 'None'}
              </span>
              <span className="text-[10px] text-text-muted">
                {bottleneckKeys[0] ? bottleneckKeys[0].fingerLabel : 'Smooth typing rhythm'}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-muted border border-border flex flex-col gap-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-text-subtle">Fastest Flow Key</span>
              <span className="text-lg font-extrabold font-mono text-success">
                {flowKeys[0] ? `${flowKeys[0].key.toUpperCase()} (${flowKeys[0].avgMs}ms)` : 'Even flow'}
              </span>
              <span className="text-[10px] text-text-muted">
                {flowKeys[0] ? flowKeys[0].fingerLabel : 'Consistent pacing across fingers'}
              </span>
            </div>
          </div>

          {/* Key Hesitation Matrix */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-accent" />
                Key Reach &amp; Finger Hesitation Breakdown
              </span>
              <span className="text-[10px] font-mono text-text-subtle">vs. {globalAvgMs}ms baseline</span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
              {latencyRanked.slice(0, 8).map((item) => {
                const isFriction = item.deltaMs > 30;
                const isFast = item.deltaMs < -20;
                const maxBarWidth = 140;
                // Normalize bar fill relative to baseline
                const latencyRatio = Math.min(2, item.avgMs / Math.max(1, globalAvgMs));
                const barPercent = Math.min(100, Math.round((latencyRatio / 2) * 100));

                return (
                  <div
                    key={item.key}
                    className="p-2 rounded-xl bg-surface-muted/50 border border-border flex items-center justify-between gap-3 text-xs"
                  >
                    {/* Key badge & Finger */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-surface border border-border font-mono font-bold text-text-primary flex items-center justify-center shrink-0 shadow-xs">
                        {item.key.toUpperCase()}
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-text-primary truncate text-xs">
                          {item.fingerLabel}
                        </span>
                        <span className="text-[10px] text-text-muted font-mono">
                          {item.typed} hits • {item.errors} err
                        </span>
                      </div>
                    </div>

                    {/* Latency Bar & Delta */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="hidden sm:flex flex-col items-end gap-0.5">
                        <div className="w-24 h-2 bg-surface rounded-full overflow-hidden border border-border">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isFriction
                                ? 'bg-danger'
                                : isFast
                                ? 'bg-success'
                                : 'bg-accent'
                            }`}
                            style={{ width: `${barPercent}%` }}
                          />
                        </div>
                      </div>

                      <div className="text-right min-w-[70px]">
                        <span className="font-mono font-bold text-text-primary block">
                          {item.avgMs}ms
                        </span>
                        <span
                          className={`text-[10px] font-mono font-semibold ${
                            isFriction
                              ? 'text-danger'
                              : isFast
                              ? 'text-success'
                              : 'text-text-muted'
                          }`}
                        >
                          {item.deltaMs >= 0 ? `+${item.deltaMs}ms` : `${item.deltaMs}ms`}
                        </span>
                      </div>

                      {onDrillKey && (
                        <button
                          type="button"
                          onClick={() => onDrillKey(item.key)}
                          className="px-2 py-1 bg-surface hover:bg-accent hover:text-accent-foreground text-text-primary border border-border hover:border-accent rounded-lg text-[11px] font-semibold transition-colors shrink-0 shadow-xs"
                          title={`Generate focused drill targeting key '${item.key}'`}
                        >
                          Drill
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live DDA In-Flow Remediation Signals */}
          {stats.hesitationSignals && stats.hesitationSignals.length > 0 && (
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-accent" />
                  DDA In-Flow Remediation Signals
                </span>
                <span className="text-[10px] font-mono text-accent font-semibold">
                  {stats.remediatedHesitationCount || 0} In-Flow Conquered
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {stats.hesitationSignals.slice(-5).map((sig, idx) => (
                  <span
                    key={idx}
                    className={`px-2 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 ${
                      sig.remediated
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    }`}
                  >
                    <span>{(sig.targetKey || sig.bigram || '').toUpperCase()}</span>
                    <span>+{Math.round(sig.latencyMs)}ms</span>
                    <span className="text-[9px] uppercase font-bold tracking-wider opacity-80">
                      {sig.remediated ? 'Remediated ✓' : 'Queued'}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
