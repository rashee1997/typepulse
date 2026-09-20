'use client';

import React, { useState } from 'react';
import { UserProgress, AISettings } from '@/types/typing';
import { getXpForNextLevel } from '@/lib/progress-service';
import { generateBiometricDiagnostic } from '@/lib/ai-service';
import { baselineWpm } from '@/lib/curriculum';
import { FINGER_REACH_MAP } from '@/lib/keyboard-geometry';
import { CERTIFICATION_BENCHMARKS, getCertificationTier } from '@/lib/certification-service';
import { AchievementsGallery } from './AchievementsGallery';
import {
  Award,
  Calendar,
  Clock,
  Flame,
  Shield,
  Target,
  Trophy,
  Zap,
  Activity,
  Sparkles,
  Bot,
  Play,
  HeartPulse,
  BrainCircuit,
  CheckCircle2,
} from 'lucide-react';
import { SpeedForecastCard } from '@/components/SpeedForecastCard';

interface AnalyticsViewProps {
  userProgress: UserProgress;
  aiSettings?: AISettings;
  onTrainWeakKeys: (keys: string[]) => void;
  onLaunchCustomDrill?: (text: string, title?: string) => void;
  onBackToPractice: () => void;
  targetWpm?: number;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  userProgress,
  aiSettings,
  onTrainWeakKeys,
  onLaunchCustomDrill,
  onBackToPractice,
  targetWpm,
}) => {
  const { highScores, keyStats, unlockedAchievements, history, dailyStreak, level, title, xp } = userProgress;
  const xpNeeded = getXpForNextLevel(level);
  const xpPercent = Math.min(100, Math.round((xp / xpNeeded) * 100));

  // Biometric state
  const [biometricReport, setBiometricReport] = useState<{
    fingerSummary: string;
    bottleneckNgrams: string[];
    ergonomicTip: string;
    prescriptionPlan: {
      day1: { title: string; drill: string; targetWpm: number };
      day2: { title: string; drill: string; targetWpm: number };
      day3: { title: string; drill: string; targetWpm: number };
    };
  } | null>(() => {
    try {
      const cached = localStorage.getItem('typepulse_biometric_report');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  // Top weak keys sorted by error count
  const sortedWeakKeys = Object.entries(keyStats)
    .filter(([char]) => char !== ' ' && char.length === 1)
    .sort(([, a], [, b]) => b.errors - a.errors)
    .slice(0, 8);

  const practiceHours = (highScores.totalTimePracticedSeconds / 3600).toFixed(1);

  // Compute Left Hand vs Right Hand metrics from key stats
  const leftHandKeys = ['q', 'w', 'e', 'r', 't', 'a', 's', 'd', 'f', 'g', 'z', 'x', 'c', 'v', 'b'];
  const rightHandKeys = ['y', 'u', 'i', 'o', 'p', 'h', 'j', 'k', 'l', 'n', 'm'];

  let leftErrors = 0;
  let rightErrors = 0;

  Object.entries(keyStats).forEach(([char, stats]) => {
    const lower = char.toLowerCase();
    if (leftHandKeys.includes(lower)) leftErrors += stats.errors;
    if (rightHandKeys.includes(lower)) rightErrors += stats.errors;
  });

  // Per-finger and per-hand latencies come from the real `patternStats` the
  // typing engine records per key. These used to be a fixed table (leftPinky
  // 195ms, leftRing 180ms, …) that never changed with the user's performance,
  // and the hand averages were `175 + errors * 2` / `168 + errors * 2`.
  const patternStats = userProgress.patternStats || {};
  const fingerLatencyTotals: Record<string, { totalMs: number; typed: number }> = {};
  let leftLatencyMs = 0;
  let leftLatencyTyped = 0;
  let rightLatencyMs = 0;
  let rightLatencyTyped = 0;

  Object.entries(patternStats).forEach(([char, stat]) => {
    if (char.length !== 1 || stat.typed <= 0) return;
    const lower = char.toLowerCase();
    const finger = FINGER_REACH_MAP[lower]?.fingerLabel;
    if (finger) {
      const bucket = fingerLatencyTotals[finger] || { totalMs: 0, typed: 0 };
      bucket.totalMs += stat.totalLatencyMs;
      bucket.typed += stat.typed;
      fingerLatencyTotals[finger] = bucket;
    }
    if (leftHandKeys.includes(lower)) {
      leftLatencyMs += stat.totalLatencyMs;
      leftLatencyTyped += stat.typed;
    } else if (rightHandKeys.includes(lower)) {
      rightLatencyMs += stat.totalLatencyMs;
      rightLatencyTyped += stat.typed;
    }
  });

  const fingerAverages: Record<string, number> = {};
  Object.entries(fingerLatencyTotals).forEach(([finger, bucket]) => {
    fingerAverages[finger] = Math.round(bucket.totalMs / bucket.typed);
  });
  const hasLatencyData = leftLatencyTyped > 0 || rightLatencyTyped > 0;

  const totalErrors = Math.max(1, leftErrors + rightErrors);
  const leftPercent = Math.round((leftErrors / totalErrors) * 100);
  const rightPercent = 100 - leftPercent;

  const handleRunDiagnostic = async () => {
    setIsDiagnosing(true);
    try {
      const leftAvg = leftLatencyTyped > 0 ? Math.round(leftLatencyMs / leftLatencyTyped) : 0;
      const rightAvg = rightLatencyTyped > 0 ? Math.round(rightLatencyMs / rightLatencyTyped) : 0;
      // Real transitions the engine measured, ranked by average latency. The
      // old fallback named 'th'/'er'/'in' regardless of the user's data.
      const slowest = Object.entries(patternStats)
        .filter(([pattern, stat]) => pattern.length === 2 && stat.typed > 0)
        .sort(([, a], [, b]) => b.avgLatencyMs - a.avgLatencyMs)
        .slice(0, 3)
        .map(([pattern]) => pattern);

      const report = await generateBiometricDiagnostic(
        {
          leftHandAvgMs: leftAvg,
          rightHandAvgMs: rightAvg,
          fingerAverages,
          slowDigraphs: slowest,
          overallWpm: highScores.bestWpm,
          accuracy: highScores.bestAccuracy,
        },
        aiSettings
      );

      setBiometricReport(report);
      try {
        localStorage.setItem('typepulse_biometric_report', JSON.stringify(report));
      } catch {}
    } catch {
      // Handled
    } finally {
      setIsDiagnosing(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-fadeIn" id="analytics-view-container">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-surface border border-border rounded-2xl shadow-card">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-accent text-accent-foreground flex flex-col items-center justify-center font-extrabold shadow-glow-accent-sm">
            <span className="text-xl leading-none">{level}</span>
            <span className="text-[10px] uppercase tracking-wider font-semibold">Level</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-text-primary">{title}</h2>
              <span className="px-2 py-0.5 rounded-full bg-accent-subtle text-accent font-mono text-[11px] font-bold flex items-center gap-1 border border-accent-border">
                <Flame className="w-3 h-3 text-accent" />
                {dailyStreak} Day Streak
              </span>
            </div>
            <p className="text-xs text-text-muted mt-1">
              {xp} / {xpNeeded} XP to Level {level + 1} ({xpPercent}%)
            </p>
            <div className="w-48 bg-surface-muted h-1.5 rounded-full mt-1.5 overflow-hidden border border-border">
              <div className="bg-accent h-full rounded-full transition-all" style={{ width: `${xpPercent}%` }} />
            </div>
          </div>
        </div>

        <button
          onClick={onBackToPractice}
          className="px-4 py-2 bg-surface-muted hover:bg-surface-hover text-text-secondary hover:text-text-primary text-xs font-medium rounded-xl border border-border self-start sm:self-center transition-colors"
        >
          Back to Practice
        </button>
      </div>

      {/* Key Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-surface border border-border rounded-xl shadow-card">
          <div className="flex items-center gap-2 text-text-muted text-xs font-medium">
            <Zap className="w-4 h-4 text-accent" />
            <span>Personal Best</span>
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-accent">
              {highScores.bestWpm || 0}
            </span>
            <span className="text-xs text-text-subtle font-mono">WPM</span>
          </div>
        </div>

        <div className="p-4 bg-surface border border-border rounded-xl shadow-card">
          <div className="flex items-center gap-2 text-text-muted text-xs font-medium">
            <Target className="w-4 h-4 text-success" />
            <span>Best Accuracy</span>
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-success">
              {highScores.bestAccuracy || 0}%
            </span>
          </div>
        </div>

        <div className="p-4 bg-surface border border-border rounded-xl shadow-card">
          <div className="flex items-center gap-2 text-text-muted text-xs font-medium">
            <Trophy className="w-4 h-4 text-primary" />
            <span>Highest Combo</span>
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-primary">
              {highScores.highestCombo || 0}
            </span>
            <span className="text-xs text-text-subtle font-mono">keys</span>
          </div>
        </div>

        <div className="p-4 bg-surface border border-border rounded-xl shadow-card">
          <div className="flex items-center gap-2 text-text-muted text-xs font-medium">
            <Clock className="w-4 h-4 text-primary" />
            <span>Time Practiced</span>
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-primary">
              {practiceHours}
            </span>
            <span className="text-xs text-text-subtle font-mono">hours</span>
          </div>
        </div>
      </div>

      {/* International Typing Certification Status */}
      <div className="p-6 bg-surface border border-border rounded-2xl shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full bg-accent-subtle text-accent font-mono text-[10px] font-bold uppercase tracking-wider border border-accent-border">
                Official Accreditation
              </span>
              <span className="text-xs text-text-subtle font-mono">Typing Standards</span>
            </div>
            <h3 className="font-bold text-text-primary text-base flex items-center gap-2">
              <Award className="w-5 h-5 text-accent" />
              <span>International Typing Certification Benchmarks</span>
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Accreditation tiers calibrated to global touch-typing benchmarks: Bronze (30 WPM), Silver (50 WPM), Gold (70 WPM), Platinum (90 WPM), and Diamond (110 WPM).
            </p>
          </div>
          {(() => {
            const highestTier = getCertificationTier(highScores.bestWpm || 0, highScores.bestAccuracy || 0);
            return highestTier ? (
              <div className="px-3 py-1.5 rounded-xl bg-accent-subtle border border-accent-border flex items-center gap-2 shrink-0">
                <span className="text-xl">{highestTier.badge}</span>
                <div>
                  <span className="text-[10px] uppercase font-bold text-text-subtle block leading-tight">Highest Rank</span>
                  <span className="text-xs font-bold text-accent font-mono leading-tight">{highestTier.title}</span>
                </div>
              </div>
            ) : null;
          })()}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
          {CERTIFICATION_BENCHMARKS.map((tier) => {
            const earned = (highScores.bestWpm || 0) >= tier.minWpm && (highScores.bestAccuracy || 0) >= tier.minAccuracy;
            return (
              <div
                key={tier.id}
                className={`p-4 rounded-xl border flex flex-col justify-between gap-2.5 transition-all ${
                  earned
                    ? 'bg-gradient-to-b from-accent-subtle/40 to-surface border-accent shadow-xs'
                    : 'bg-surface-muted/40 border-border opacity-70'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-2xl">{tier.badge}</span>
                  {earned && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-success text-success-foreground">
                      Earned
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-text-primary">{tier.title}</div>
                  <div className="text-[11px] font-mono text-text-muted mt-0.5">
                    &ge;{tier.minWpm} WPM • &ge;{tier.minAccuracy}%
                  </div>
                  <p className="text-[10px] text-text-subtle mt-1 line-clamp-2">{tier.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Keybr-Style Confidence Mastery Engine */}
      <div className="p-6 bg-surface border border-border rounded-2xl space-y-4 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-text-primary text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-accent" />
              <span>Keybr Muscle-Memory Confidence Matrix</span>
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Dual-metric scoring weighing raw keystroke latency (&lt;180ms benchmark) and accuracy penalties.
            </p>
          </div>
          {Object.keys(userProgress.confidenceScores || {}).length > 0 && (
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-success font-medium">
                <span className="w-2 h-2 rounded-full bg-success"></span>
                Mastered (&ge;85%)
              </span>
              <span className="flex items-center gap-1 text-warning font-medium">
                <span className="w-2 h-2 rounded-full bg-warning"></span>
                Developing (60-84%)
              </span>
              <span className="flex items-center gap-1 text-danger font-medium">
                <span className="w-2 h-2 rounded-full bg-danger"></span>
                Needs Focus (&lt;60%)
              </span>
            </div>
          )}
        </div>

        {Object.keys(userProgress.confidenceScores || {}).length === 0 ? (
          <div className="p-4 bg-surface-muted rounded-xl border border-border text-xs text-text-muted text-center">
            Complete your first regular test or Keybr Adaptive drill to populate your key confidence matrix!
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {Object.entries(userProgress.confidenceScores || {})
              .sort(([, a], [, b]) => a - b)
              .map(([char, score]) => {
                const pct = Math.round(score * 100);
                let badgeStyle = 'bg-success-subtle border-success/60 text-success';
                if (score < 0.6) badgeStyle = 'bg-danger-subtle border-danger/60 text-danger font-bold';
                else if (score < 0.85) badgeStyle = 'bg-warning-subtle border-warning/60 text-warning';

                return (
                  <div
                    key={char}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all ${badgeStyle}`}
                  >
                    <span className="font-mono text-base font-bold leading-none">{char.toUpperCase()}</span>
                    <span className="text-[10px] font-mono mt-1 opacity-90">{pct}%</span>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Unified Arcade Career Records */}
      {userProgress.arcadeStats && (
        <div className="p-6 bg-surface border border-border rounded-2xl space-y-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-text-primary text-base flex items-center gap-2">
                <Trophy className="w-4 h-4 text-accent" />
                <span>Arcade Career Records</span>
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                All arcade and drill game modes unify directly into your persistent player XP and stats ledger.
              </p>
            </div>
            <div className="text-xs font-mono text-text-subtle font-semibold">
              {userProgress.arcadeStats.totalGamesPlayed || 0} Arcade Matches Played
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-surface-muted border border-border rounded-xl">
              <div className="text-[11px] text-text-muted font-medium">Nitro Racer GP</div>
              <div className="text-lg font-bold font-mono text-accent mt-0.5">
                {userProgress.arcadeStats.raceWins || 0} Wins
              </div>
              <div className="text-[10px] text-text-subtle mt-0.5">
                Best {userProgress.arcadeStats.raceBestWpm || 0} WPM
              </div>
            </div>

            <div className="p-3 bg-surface-muted border border-border rounded-xl">
              <div className="text-[11px] text-text-muted font-medium">Orbital Laser Defense</div>
              <div className="text-lg font-bold font-mono text-success mt-0.5">
                {userProgress.arcadeStats.orbitalHighScore || 0}
              </div>
              <div className="text-[10px] text-text-subtle mt-0.5">
                {userProgress.arcadeStats.orbitalWordsDestroyed || 0} aliens purged
              </div>
            </div>

            <div className="p-3 bg-surface-muted border border-border rounded-xl">
              <div className="text-[11px] text-text-muted font-medium">Bomb Defusal Unit</div>
              <div className="text-lg font-bold font-mono text-warning mt-0.5">
                {userProgress.arcadeStats.bombDefusalHighScore || 0}
              </div>
              <div className="text-[10px] text-text-subtle mt-0.5">
                {userProgress.arcadeStats.bombsDefusedTotal || 0} bombs defused
              </div>
            </div>

            <div className="p-3 bg-surface-muted border border-border rounded-xl">
              <div className="text-[11px] text-text-muted font-medium">Word Blitz Combos</div>
              <div className="text-lg font-bold font-mono text-primary mt-0.5">
                {userProgress.arcadeStats.blitzHighScore || 0}
              </div>
              <div className="text-[10px] text-text-subtle mt-0.5">
                Max {userProgress.arcadeStats.blitzMaxMultiplier || 1}x Multiplier
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weak Keys Diagnosis Section */}
      <div className="p-6 bg-surface border border-border rounded-2xl space-y-4 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-text-primary text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-danger" />
              <span>Hesitation & Error Frequency</span>
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Cumulative error frequency recorded across all your typing sessions.
            </p>
          </div>
          {sortedWeakKeys.length > 0 && (
            <button
              onClick={() => onTrainWeakKeys(sortedWeakKeys.slice(0, 4).map(([k]) => k))}
              className="px-3.5 py-1.5 bg-danger-subtle hover:bg-danger/20 text-danger font-semibold text-xs rounded-xl border border-danger-border transition-colors self-start sm:self-center"
            >
              Train Weakest Keys
            </button>
          )}
        </div>

        {sortedWeakKeys.length === 0 ? (
          <div className="p-4 bg-surface-muted rounded-xl border border-border text-xs text-text-muted text-center">
            No persistent weak keys detected yet! Complete more tests to build your muscle-memory heatmap.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {sortedWeakKeys.map(([char, stats]) => (
              <div
                key={char}
                className="p-3 bg-surface-muted border border-border rounded-xl flex items-center justify-between"
              >
                <span className="w-8 h-8 rounded-lg bg-surface border border-border text-accent font-mono font-bold flex items-center justify-center text-sm shadow-sm">
                  {char.toUpperCase()}
                </span>
                <div className="text-right">
                  <div className="text-xs font-mono font-semibold text-danger">{stats.errors} errors</div>
                  <div className="text-[10px] text-text-subtle">logged</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Biometric Diagnostic & Ergonomic Prescription Hub */}
      <div className="p-6 bg-surface border border-border rounded-2xl space-y-5 shadow-card" id="biometric-diagnostic-hub">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
                <HeartPulse className="w-3 h-3 text-emerald-400" />
                BIOMETRIC AI
              </span>
              <h3 className="font-bold text-text-primary text-base">
                Biometric Diagnostic & Ergonomic Prescription Hub
              </h3>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Deep muscular latency imbalance, finger fatigue isolation, and tailored 3-day recovery drills.
            </p>
          </div>

          <button
            id="run-biometric-diagnostic-btn"
            disabled={isDiagnosing}
            onClick={handleRunDiagnostic}
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-accent-foreground font-bold text-xs rounded-xl shadow-glow-accent-sm transition-all flex items-center gap-1.5 self-start sm:self-center cursor-pointer disabled:opacity-50"
          >
            {isDiagnosing ? (
              <>
                <Bot className="w-3.5 h-3.5 animate-spin" />
                <span>Analyzing Biometrics...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>{biometricReport ? 'Re-run AI Diagnostic' : 'Run AI Diagnostic'}</span>
              </>
            )}
          </button>
        </div>

        {/* Hand Balance & Speed Distribution Indicator */}
        <div className="p-4 bg-surface-muted border border-border rounded-xl space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-text-primary flex items-center gap-1.5">
              <span>Left Hand vs Right Hand Workload</span>
            </span>
            <span className="font-mono text-text-muted text-[11px]">
              Left: <strong className="text-accent">{leftPercent}%</strong> | Right: <strong className="text-success">{rightPercent}%</strong>
            </span>
          </div>

          <div className="w-full bg-surface h-2.5 rounded-full overflow-hidden flex border border-border">
            <div className="bg-accent h-full transition-all duration-300" style={{ width: `${leftPercent}%` }} />
            <div className="bg-success h-full transition-all duration-300" style={{ width: `${rightPercent}%` }} />
          </div>

          <div className="flex items-center justify-between text-[11px] text-text-muted font-mono">
            <span>Left Errors: {leftErrors}</span>
            <span>Right Errors: {rightErrors}</span>
          </div>

          {/* Measured latencies, or an explicit statement that none exist. The
              diagnostic used to assume 175ms/168ms before any data was typed. */}
          <div className="flex items-center justify-between text-[11px] text-text-muted font-mono">
            {hasLatencyData ? (
              <>
                <span>
                  Left avg:{' '}
                  {leftLatencyTyped > 0 ? `${Math.round(leftLatencyMs / leftLatencyTyped)}ms` : '—'}
                </span>
                <span>
                  Right avg:{' '}
                  {rightLatencyTyped > 0 ? `${Math.round(rightLatencyMs / rightLatencyTyped)}ms` : '—'}
                </span>
              </>
            ) : (
              <span className="text-text-subtle">
                No keystroke latency recorded yet — type a session to populate this.
              </span>
            )}
          </div>
        </div>

        {/* Diagnostic Results View */}
        {biometricReport && (
          <div className="space-y-4 pt-2 border-t border-border animate-fadeIn">
            {/* Diagnosis & Ergonomics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-surface-muted/60 border border-border space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-text-primary">
                  <BrainCircuit className="w-4 h-4 text-accent" />
                  <span>Muscular Isolation Diagnosis</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  {biometricReport.fingerSummary}
                </p>
                {biometricReport.bottleneckNgrams.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1 items-center">
                    <span className="text-[10px] text-text-subtle">Bottlenecks:</span>
                    {biometricReport.bottleneckNgrams.map((ng, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-surface text-[10px] font-mono text-warning border border-border">
                        {ng}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl bg-surface-muted/60 border border-border space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-text-primary">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>Ergonomic & Tendon Health Assessment</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  {biometricReport.ergonomicTip}
                </p>
              </div>
            </div>

            {/* 3-Day Actionable Prescription Plan */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>3-Day Targeted Prescription Drills</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { dayNum: 1, ...biometricReport.prescriptionPlan.day1 },
                  { dayNum: 2, ...biometricReport.prescriptionPlan.day2 },
                  { dayNum: 3, ...biometricReport.prescriptionPlan.day3 },
                ].map((plan) => (
                  <div
                    key={plan.dayNum}
                    className="p-3.5 rounded-xl bg-surface border border-border hover:border-accent flex flex-col justify-between transition-all group shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span className="text-accent font-mono">Day {plan.dayNum}</span>
                        <span className="text-[10px] text-text-muted font-mono">{plan.targetWpm} WPM</span>
                      </div>
                      <h5 className="font-bold text-text-primary text-xs group-hover:text-accent transition-colors">
                        {plan.title}
                      </h5>
                      <p className="text-[11px] text-text-muted mt-1.5 font-mono line-clamp-2 bg-surface-muted p-1.5 rounded-lg border border-border/50">
                        &quot;{plan.drill}&quot;
                      </p>
                    </div>

                    {onLaunchCustomDrill && (
                      <button
                        onClick={() => onLaunchCustomDrill(plan.drill, `Day ${plan.dayNum}: ${plan.title}`)}
                        className="mt-3 w-full py-1.5 bg-accent-subtle hover:bg-accent hover:text-accent-foreground text-accent font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Play className="w-3 h-3" />
                        <span>Launch Drill</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Visual Achievements & Milestones Gallery */}
      <AchievementsGallery userProgress={userProgress} />

      {/* Goal projection derived from recorded history */}
      <SpeedForecastCard history={history} bestWpm={highScores.bestWpm} targetWpm={targetWpm} />

      {/* Recent Sessions History */}
      <div className="p-6 bg-surface border border-border rounded-2xl space-y-4 shadow-card">
        <h3 className="font-bold text-text-primary text-base">Recent Sessions</h3>

        {history.length === 0 ? (
          <div className="p-4 bg-surface-muted rounded-xl border border-border text-xs text-text-muted text-center">
            No session history recorded yet. Complete a test to start your analytics ledger.
          </div>
        ) : (
          <div
            className="overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label="Recent sessions table, scrollable horizontally"
          >
            <table className="w-full text-left text-xs">
              <caption className="sr-only">Your ten most recent typing sessions</caption>
              <thead>
                <tr className="border-b border-border text-text-muted uppercase text-[10px] tracking-wider">
                  <th scope="col" className="py-2.5 px-3">Mode</th>
                  <th scope="col" className="py-2.5 px-3">Speed</th>
                  <th scope="col" className="py-2.5 px-3">Accuracy</th>
                  <th scope="col" className="py-2.5 px-3">Duration</th>
                  <th scope="col" className="py-2.5 px-3">XP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.slice(0, 10).map((s) => (
                  <tr key={s.id} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-text-primary">{s.modeTitle}</td>
                    <td className="py-2.5 px-3 font-mono text-accent font-bold">{s.wpm} WPM</td>
                    <td className="py-2.5 px-3 font-mono text-success">{s.accuracy}%</td>
                    <td className="py-2.5 px-3 text-text-muted font-mono">{s.durationSeconds}s</td>
                    <td className="py-2.5 px-3 text-primary font-mono font-semibold">+{s.xpEarned} XP</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
