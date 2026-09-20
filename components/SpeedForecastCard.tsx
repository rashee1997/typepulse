'use client';

import React, { useMemo } from 'react';
import { Gauge, TrendingUp } from 'lucide-react';
import { FORECAST_MIN_SESSIONS, forecastTargetSpeed, SpeedForecast } from '@/lib/speed-forecast';
import { TypingSessionSummary } from '@/types/typing';

interface SpeedForecastCardProps {
  history: TypingSessionSummary[];
  bestWpm: number;
  targetWpm?: number;
}

function describeForecast(forecast: SpeedForecast, targetWpm: number): string {
  if (!forecast.hasEnoughData) {
    const remaining = FORECAST_MIN_SESSIONS - forecast.recordedSessions;
    return `${remaining} more recorded sessions unlock a projection. Speed trends need a baseline before they mean anything.`;
  }
  if (forecast.isTargetMet) {
    return `You are at or above ${targetWpm} WPM. Raise the target to keep the trend honest.`;
  }
  if (forecast.sessionsToTarget === null) {
    return 'Your pace is flat across recent sessions. Accuracy work moves this line before speed drills do.';
  }
  return `At ${forecast.gainPerSession > 0 ? '+' : ''}${forecast.gainPerSession} WPM per session, this is the distance to ${targetWpm} WPM.`;
}

export const SpeedForecastCard: React.FC<SpeedForecastCardProps> = ({ history, bestWpm, targetWpm }) => {
  // No goal set means no invented goal: the target defaults to a modest step
  // above the personal best that is already recorded.
  const goal = targetWpm && targetWpm > 0 ? targetWpm : Math.max(40, Math.round(bestWpm * 1.15));
  const forecast = useMemo(() => forecastTargetSpeed(history, goal), [history, goal]);

  const range =
    forecast.slowestEstimate !== null && forecast.fastestEstimate !== null
      ? `${forecast.slowestEstimate}–${forecast.fastestEstimate}`
      : '—';

  return (
    <section
      aria-labelledby="speed-forecast-heading"
      className="p-6 bg-surface border border-border rounded-2xl space-y-4 shadow-card"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 id="speed-forecast-heading" className="font-bold text-text-primary text-base flex items-center gap-2">
          <Gauge className="w-4 h-4 text-accent" aria-hidden="true" />
          Target Speed Forecast
        </h3>
        <span className="text-[11px] font-mono text-text-muted">
          Goal {goal} WPM
          {targetWpm && targetWpm > 0 ? ' (from Ghost Pacer target)' : ' (derived from best)'}
        </span>
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Recent median', value: forecast.recentWpm > 0 ? `${forecast.recentWpm} WPM` : '—' },
          { label: 'Gain per session', value: forecast.hasEnoughData ? `${forecast.gainPerSession} WPM` : '—' },
          {
            label: 'Sessions to goal',
            value: forecast.isTargetMet ? 'Met' : forecast.sessionsToTarget === null ? 'Not trending' : String(forecast.sessionsToTarget),
          },
          { label: 'Likely range', value: forecast.sessionsToTarget === null ? '—' : range },
        ].map((row) => (
          <div key={row.label} className="rounded-xl border border-border-subtle bg-surface-muted px-3 py-2">
            <dt className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-muted">{row.label}</dt>
            <dd className="mt-0.5 font-mono text-lg font-extrabold tabular-nums text-text-primary">{row.value}</dd>
          </div>
        ))}
      </dl>

      <p className="text-xs text-text-secondary flex items-start gap-2">
        <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
        <span>{describeForecast(forecast, goal)}</span>
      </p>
    </section>
  );
};
