'use client';

import React from 'react';
import { UserProgress } from '@/types/typing';
import { getXpForNextLevel } from '@/lib/progress-service';
import { AchievementsGallery } from './AchievementsGallery';
import { Award, Calendar, Clock, Flame, Shield, Target, Trophy, Zap } from 'lucide-react';

interface AnalyticsViewProps {
  userProgress: UserProgress;
  onTrainWeakKeys: (keys: string[]) => void;
  onBackToPractice: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  userProgress,
  onTrainWeakKeys,
  onBackToPractice,
}) => {
  const { highScores, keyStats, unlockedAchievements, history, dailyStreak, level, title, xp } = userProgress;
  const xpNeeded = getXpForNextLevel(level);
  const xpPercent = Math.min(100, Math.round((xp / xpNeeded) * 100));

  // Top weak keys sorted by error count
  const sortedWeakKeys = Object.entries(keyStats)
    .filter(([char]) => char !== ' ' && char.length === 1)
    .sort(([, a], [, b]) => b.errors - a.errors)
    .slice(0, 8);

  const practiceHours = (highScores.totalTimePracticedSeconds / 3600).toFixed(1);

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

      {/* Visual Achievements & Milestones Gallery */}
      <AchievementsGallery userProgress={userProgress} />

      {/* Recent Sessions History */}
      <div className="p-6 bg-surface border border-border rounded-2xl space-y-4 shadow-card">
        <h3 className="font-bold text-text-primary text-base">Recent Sessions</h3>

        {history.length === 0 ? (
          <div className="p-4 bg-surface-muted rounded-xl border border-border text-xs text-text-muted text-center">
            No session history recorded yet. Complete a test to start your analytics ledger.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-text-muted uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3">Speed</th>
                  <th className="py-2.5 px-3">Accuracy</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">XP</th>
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
