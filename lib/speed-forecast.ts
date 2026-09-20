import { TypingSessionSummary } from '@/types/typing';

export interface SpeedForecast {
  recordedSessions: number;
  recentWpm: number;
  gainPerSession: number;
  sessionsToTarget: number | null;
  fastestEstimate: number | null;
  slowestEstimate: number | null;
  isTargetMet: boolean;
  hasEnoughData: boolean;
}

const FORECAST_WINDOW = 10;
export const FORECAST_MIN_SESSIONS = 5;
const FLAT_TREND = 0.05;
const MAX_PROJECTION = 200;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

/** Least-squares slope of wpm against session index. */
function wpmSlope(recent: number[]): number {
  const meanIndex = (recent.length - 1) / 2;
  const meanWpm = recent.reduce((sum, wpm) => sum + wpm, 0) / recent.length;
  const covariance = recent.reduce((sum, wpm, index) => sum + (index - meanIndex) * (wpm - meanWpm), 0);
  const variance = recent.reduce((sum, _wpm, index) => sum + (index - meanIndex) ** 2, 0);
  return variance === 0 ? 0 : covariance / variance;
}

function sessionsFromSlope(recentWpm: number, targetWpm: number, slope: number): number | null {
  if (slope <= FLAT_TREND) return null;
  return Math.min(MAX_PROJECTION, Math.max(1, Math.ceil((targetWpm - recentWpm) / slope)));
}

/**
 * Projects how many more sessions a target speed needs.
 *
 * Everything here comes from recorded history: recent speed is the median of the
 * last five sessions, the trend is a least-squares fit over the last ten, and the
 * range re-fits the same data with the gain under- and over-stated by a quarter. A
 * flat or declining trend returns null — an invented estimate is worse than none.
 */
export function forecastTargetSpeed(
  history: TypingSessionSummary[],
  targetWpm: number
): SpeedForecast {
  const recorded = history.filter((session) => session.wpm > 0);
  const recent = recorded.slice(0, FORECAST_WINDOW).map((session) => session.wpm).reverse();
  const recentWpm = recent.length === 0 ? 0 : Math.round(median(recent.slice(-5)));

  const empty: SpeedForecast = {
    recordedSessions: recorded.length,
    recentWpm,
    gainPerSession: 0,
    sessionsToTarget: null,
    fastestEstimate: null,
    slowestEstimate: null,
    isTargetMet: false,
    hasEnoughData: false,
  };

  if (recent.length < FORECAST_MIN_SESSIONS) return empty;
  if (recentWpm >= targetWpm) {
    return { ...empty, hasEnoughData: true, isTargetMet: true, sessionsToTarget: 0 };
  }

  const slope = wpmSlope(recent);
  return {
    recordedSessions: recorded.length,
    recentWpm,
    gainPerSession: Math.round(slope * 10) / 10,
    sessionsToTarget: sessionsFromSlope(recentWpm, targetWpm, slope),
    fastestEstimate: sessionsFromSlope(recentWpm, targetWpm, slope * 1.25),
    slowestEstimate: sessionsFromSlope(recentWpm, targetWpm, slope * 0.75),
    isTargetMet: false,
    hasEnoughData: true,
  };
}
