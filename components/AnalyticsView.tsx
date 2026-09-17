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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex flex-col items-center justify-center font-extrabold shadow-lg shadow-amber-500/20">
            <span className="text-xl leading-none">{level}</span>
            <span className="text-[10px] uppercase tracking-wider font-semibold">Level</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-100">{title}</h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-mono text-[11px] font-bold flex items-center gap-1 border border-amber-500/30">
                <Flame className="w-3 h-3 text-amber-400" />
                {dailyStreak} Day Streak
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {xp} / {xpNeeded} XP to Level {level + 1} ({xpPercent}%)
            </p>
            <div className="w-48 bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div className="bg-amber-400 h-full rounded-full transition-all" style={{ width: `${xpPercent}%` }} />
            </div>
          </div>
        </div>

        <button
          onClick={onBackToPractice}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 self-start sm:self-center transition-colors"
        >
          Back to Practice
        </button>
      </div>

      {/* Key Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Personal Best</span>
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-amber-400">
              {highScores.bestWpm || 0}
            </span>
            <span className="text-xs text-slate-500 font-mono">WPM</span>
          </div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <Target className="w-4 h-4 text-emerald-400" />
            <span>Best Accuracy</span>
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">
              {highScores.bestAccuracy || 0}%
            </span>
          </div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <Trophy className="w-4 h-4 text-cyan-400" />
            <span>Highest Combo</span>
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-cyan-400">
              {highScores.highestCombo || 0}
            </span>
            <span className="text-xs text-slate-500 font-mono">keys</span>
          </div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>Time Practiced</span>
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-indigo-400">
              {practiceHours}
            </span>
            <span className="text-xs text-slate-500 font-mono">hours</span>
          </div>
        </div>
      </div>

      {/* Weak Keys Diagnosis Section */}
      <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-rose-400" />
              <span>Hesitation & Error Frequency</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Cumulative error frequency recorded across all your typing sessions.
            </p>
          </div>
          {sortedWeakKeys.length > 0 && (
            <button
              onClick={() => onTrainWeakKeys(sortedWeakKeys.slice(0, 4).map(([k]) => k))}
              className="px-3.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold text-xs rounded-xl border border-rose-500/40 transition-colors self-start sm:self-center"
            >
              Train Weakest Keys
            </button>
          )}
        </div>

        {sortedWeakKeys.length === 0 ? (
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400 text-center">
            No persistent weak keys detected yet! Complete more tests to build your muscle-memory heatmap.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {sortedWeakKeys.map(([char, stats]) => (
              <div
                key={char}
                className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between"
              >
                <span className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-amber-400 font-mono font-bold flex items-center justify-center text-sm">
                  {char.toUpperCase()}
                </span>
                <div className="text-right">
                  <div className="text-xs font-mono font-semibold text-rose-400">{stats.errors} errors</div>
                  <div className="text-[10px] text-slate-500">logged</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Visual Achievements & Milestones Gallery */}
      <AchievementsGallery userProgress={userProgress} />

      {/* Recent Sessions History */}
      <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
        <h3 className="font-bold text-slate-100 text-base">Recent Sessions</h3>

        {history.length === 0 ? (
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400 text-center">
            No session history recorded yet. Complete a test to start your analytics ledger.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3">Speed</th>
                  <th className="py-2.5 px-3">Accuracy</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">XP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {history.slice(0, 10).map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-medium text-slate-200">{s.modeTitle}</td>
                    <td className="py-2.5 px-3 font-mono text-amber-400 font-bold">{s.wpm} WPM</td>
                    <td className="py-2.5 px-3 font-mono text-emerald-400">{s.accuracy}%</td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono">{s.durationSeconds}s</td>
                    <td className="py-2.5 px-3 text-indigo-400 font-mono">+{s.xpEarned} XP</td>
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
