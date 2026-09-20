/**
 * Biometric diagnostic: reads keystroke latency telemetry and prescribes three
 * days of drills.
 *
 * Extracted from `lib/ai-service.ts`. The governing rule is that the diagnostic
 * may only report what was measured — the previous version asserted fixed
 * "+28ms" hand gaps and named three slow digraphs from nowhere, which is worse
 * than saying nothing. An empty metric list is reported as "not recorded yet",
 * and the prescription's pace is anchored to the typist's own speed.
 */

import { AISettings } from '@/types/typing';
import { baselineWpm } from '../curriculum';
import { BIOMETRIC_SYSTEM_PROMPT } from '../ai-prompts';
import { callLlm, parseLlmJson } from './transport';
import { canUseLlm } from './providers';

/** The prescription shape this module returns, in full. */
interface BiometricDiagnostic {
  fingerSummary: string;
  bottleneckNgrams: string[];
  ergonomicTip: string;
  prescriptionPlan: {
    day1: { title: string; drill: string; targetWpm: number };
    day2: { title: string; drill: string; targetWpm: number };
    day3: { title: string; drill: string; targetWpm: number };
  };
}

/** Coerces one generated prescription day, or rejects the whole plan. */
function readPlanDay(value: unknown): { title: string; drill: string; targetWpm: number } | null {
  if (!value || typeof value !== 'object') return null;
  const day = value as { title?: unknown; drill?: unknown; targetWpm?: unknown };
  if (typeof day.title !== 'string' || typeof day.drill !== 'string' || day.title.trim().length === 0) return null;

  const wpm = Number(day.targetWpm);
  return {
    title: day.title.trim(),
    drill: day.drill.trim(),
    targetWpm: Number.isFinite(wpm) ? Math.min(140, Math.max(10, Math.round(wpm))) : 0,
  };
}

/**
 * AI Biometric Diagnostic & 3-Day Actionable Prescription Plan
 */
export async function generateBiometricDiagnostic(
  handMetrics: {
    leftHandAvgMs: number;
    rightHandAvgMs: number;
    fingerAverages: Record<string, number>;
    slowDigraphs: string[];
    overallWpm: number;
    accuracy: number;
  },
  settings?: AISettings
): Promise<BiometricDiagnostic> {
  const balanceDeltaMs = Math.round(handMetrics.leftHandAvgMs - handMetrics.rightHandAvgMs);
  const isLeftSlower = balanceDeltaMs > 25;
  const isRightSlower = balanceDeltaMs < -25;
  // Report the delta that was actually measured. The previous strings asserted a
  // fixed "+28ms"/"+26ms" no matter what the profile contained.
  const handBalance = isLeftSlower
    ? `Left hand runs ${Math.abs(balanceDeltaMs)}ms slower than the right on average.`
    : isRightSlower
    ? `Right hand runs ${Math.abs(balanceDeltaMs)}ms slower than the left on average.`
    : `Bilateral hand balance is within ${Math.abs(balanceDeltaMs)}ms.`;

  // Do not invent digraphs. An empty list means the profile has no slow
  // transition data yet, and the diagnostic says so instead of naming three.
  const slowList = handMetrics.slowDigraphs.slice(0, 3);
  const fingerKeys = Object.keys(handMetrics.fingerAverages);
  const hasFingerData = fingerKeys.length > 0;

  if (canUseLlm(settings)) {
    try {
      const prompt = `Analyze this typist's biometric latency profile:
- Left hand average latency: ${handMetrics.leftHandAvgMs}ms
- Right hand average latency: ${handMetrics.rightHandAvgMs}ms
- Finger latencies: ${JSON.stringify(handMetrics.fingerAverages)}
- Slowest digraph transitions: ${slowList.length > 0 ? slowList.join(', ') : 'none recorded yet'}
- Current speed: ${handMetrics.overallWpm} WPM, Accuracy: ${handMetrics.accuracy}%

Return one JSON object with exactly these keys:
{"fingerSummary": string, "bottleneckNgrams": string[], "ergonomicTip": string, "prescriptionPlan": {"day1": {"title": string, "drill": string, "targetWpm": number}, "day2": {"title": string, "drill": string, "targetWpm": number}, "day3": {"title": string, "drill": string, "targetWpm": number}}}

Field requirements:
- fingerSummary: 1 to 2 sentences diagnosing finger isolation and bilateral hand balance, using only the latencies listed above. If the digraph list is empty, do not name one.
- bottleneckNgrams: up to 3 digraphs taken from the slowest transitions listed above; an empty array if none were recorded.
- ergonomicTip: one specific wrist angle, finger curve or desk adjustment that addresses the friction you diagnosed.
- prescriptionPlan: three 20 to 30 word English drills in ascending difficulty, each targeting what you diagnosed, with an integer targetWpm pitched near ${handMetrics.overallWpm} WPM.

Output valid JSON only, with no prose before or after it.`;

      const parsed = parseLlmJson<Partial<BiometricDiagnostic>>(
        await callLlm(prompt, BIOMETRIC_SYSTEM_PROMPT, settings, { temperature: 0.5, jsonMode: true })
      );

      const plan = parsed?.prescriptionPlan;
      const day1 = readPlanDay(plan?.day1);
      const day2 = readPlanDay(plan?.day2);
      const day3 = readPlanDay(plan?.day3);

      if (parsed?.fingerSummary && day1 && day2 && day3) {
        const ngrams = Array.isArray(parsed.bottleneckNgrams)
          ? parsed.bottleneckNgrams.filter((ngram): ngram is string => typeof ngram === 'string' && ngram.trim().length > 0).slice(0, 3)
          : [];
        return {
          fingerSummary: parsed.fingerSummary,
          bottleneckNgrams: ngrams,
          ergonomicTip: parsed.ergonomicTip || 'Keep wrists floating with elbows near 90 degrees throughout the run.',
          prescriptionPlan: { day1, day2, day3 },
        };
      }
    } catch {
      // Fall through to deterministic diagnostic
    }
  }

  // Deterministic Biomechanical Prescription. Only states findings that are
  // backed by the measurements passed in.
  const slowestFinger = hasFingerData
    ? fingerKeys.reduce((a, b) => (handMetrics.fingerAverages[a] >= handMetrics.fingerAverages[b] ? a : b))
    : null;
  const fingerFinding = slowestFinger
    ? ` Slowest finger group is ${slowestFinger} at ${Math.round(handMetrics.fingerAverages[slowestFinger])}ms average.`
    : ' No per-finger latency has been recorded yet, so no finger-specific finding can be made.';

  // A prescription needs a target pace. Anchor it to the measured speed, or to
  // the curriculum's opening target when no speed has been recorded.
  const anchorWpm = baselineWpm(handMetrics.overallWpm);

  return {
    fingerSummary: `${handBalance}${fingerFinding}`,
    bottleneckNgrams: slowList,
    ergonomicTip: 'Keep elbows at a natural 90-degree angle and curl fingers softly as if holding a tennis ball to reduce extensor tendon strain.',
    prescriptionPlan: {
      day1: {
        title: 'Isolation & Anchor Re-alignment',
        drill: 'sweet swing switch swift sword sweet swing switch swift sweet swing switch swift sweet',
        targetWpm: Math.round(anchorWpm * 0.95),
      },
      day2: {
        title: 'Bilateral Cross-Hand Cadence',
        drill: 'travel trend train trust trade track truth trace treat transit travel trend train trust trade',
        targetWpm: Math.round(anchorWpm * 1.02),
      },
      day3: {
        title: 'High-Velocity Integration Sprint',
        drill: 'the swift runner crossed the finish track with calm confidence and steady rhythmic power',
        targetWpm: Math.round(anchorWpm * 1.08),
      },
    },
  };
}
