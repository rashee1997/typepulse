/**
 * The offline coach: answers generated from the typist's own recorded numbers.
 *
 * Extracted from `lib/ai-service.ts`. These are served when no model is
 * configured *and* as the fallback when a configured model fails, so they are
 * written to be honest rather than generic: each one quotes the typist's real
 * figures and names a drill that exists in this app.
 *
 * Deliberately free of network I/O, so this module can never fail.
 */

import { AICoachFeedback, AIMission, TypingStats } from '@/types/typing';
import { generateMissionPassage } from '../word-banks';
import { KEY_GRID } from '../keyboard-geometry';
import { TypistProfile } from '../ai-prompts';

export function generateDeterministicCoachFeedback(stats: TypingStats, context: { mode: string; level: number }): AICoachFeedback {
  const isHighAccuracy = stats.accuracy >= 96;
  const isSpeedFast = stats.wpm >= 50;
  const hasErrors = stats.weakKeys.length > 0;

  const wpmSummary = isSpeedFast
    ? `Exceptional velocity! Clocking in at ${stats.wpm} WPM places you well above the average typist.`
    : `Solid pacing at ${stats.wpm} WPM. Focus on consistency to naturally accelerate your tempo.`;

  const accuracyAssessment = isHighAccuracy
    ? `Superb discipline: ${stats.accuracy}% accuracy demonstrates outstanding finger control.`
    : `Accuracy was ${stats.accuracy}%. Slowing down by just 5% will prevent backspace penalties and elevate raw speed.`;

  const weaknessIdentified = hasErrors
    ? `Key transition hesitation detected on: [${stats.weakKeys.slice(0, 3).join(', ')}].`
    : `Keystroke intervals were smooth with a ${stats.consistency}% consistency rating.`;

  const keyAdvice = !isHighAccuracy
    ? 'Focus on the "Rhythm Rule": do not rush easy letters faster than difficult letters; keep a steady metronome rhythm.'
    : hasErrors
    ? `Practice reaching for '${stats.weakKeys[0]}' without moving your entire wrist—let only the designated finger articulate.`
    : 'Maintain a soft, gliding touch. Minimal finger pressure conserves stamina for extended sessions.';

  const remediationMission = generateDeterministicMission(stats.weakKeys, stats.wpm);

  return { wpmSummary, accuracyAssessment, weaknessIdentified, keyAdvice, recommendedMission: remediationMission };
}

export function generateDeterministicMission(weakKeys: string[], currentWpm: number): AIMission {
  const targets = weakKeys.length > 0 ? weakKeys.slice(0, 3) : ['e', 'r', 't'];
  const drillContent = generateMissionPassage('WEAK_KEY_DRILL', targets, 30);

  return {
    id: `ai-mission-${Date.now()}`,
    title: `Weak Key Recalibration (${targets.join(', ').toUpperCase()})`,
    description: `Targeted precision run designed to solidify muscle memory on ${targets.join(', ')}.`,
    type: 'WEAK_KEY_DRILL',
    difficulty: currentWpm > 50 ? 'Advanced' : 'Intermediate',
    targetWpm: Math.max(25, Math.round(currentWpm * 1.05)),
    targetAccuracy: 96,
    focusKeys: targets,
    content: drillContent,
    rewardXp: 250,
    reason: `Recent error patterns indicate finger overreach on ${targets.join(', ')}. This drill resets your spatial anchor.`,
    completed: false,
    createdAt: Date.now(),
  };
}

/**
 * Offline coach answers.
 *
 * These are served when no model is configured *and* as the fallback when a
 * configured model fails, so they carry the typist's own figures rather than
 * the generic advice the app used to show in both cases.
 */
export function generateDeterministicChatReply(question: string, profile?: TypistProfile): string {
  const q = question.toLowerCase();
  const topKey = profile?.weakKeys[0];
  const topPattern = profile?.weakPatterns[0];
  const pace = profile?.averageRecentWpm ?? profile?.bestWpm ?? 0;
  const keyEvidence = topKey
    ? `Your own numbers back this up: \`${topKey.key}\` fails on ${topKey.errorRatePct}% of ${topKey.typed} attempts.`
    : null;

  // A question that names one of the typist's weak keys gets key-specific advice:
  // which finger owns the key, which home key to launch from, and the drill to run.
  const namedKey = profile?.weakKeys
    .map((insight) => insight.key)
    .find((key) => new RegExp(`(^|[^a-z0-9])${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i').test(q));

  if (namedKey) {
    const geometry = KEY_GRID[namedKey] ?? KEY_GRID[namedKey.toLowerCase()];
    const insight = profile?.weakKeys.find((entry) => entry.key === namedKey);
    const lines = [`\`${namedKey}\` is your weakest recorded key${insight ? ` — ${insight.errors} errors across ${insight.typed} attempts (${insight.errorRatePct}%)` : ''}.`, ''];

    if (geometry) {
      // Home-row keys are anchored rather than reached for, so the reach hint is
      // only useful when it describes an actual movement.
      const anchor = geometry.directionLabel.startsWith('Reach')
        ? ` (${geometry.directionLabel.toLowerCase()}, from home key **${geometry.homeKey}**)`
        : `, anchored on home key **${geometry.homeKey}**`;
      lines.push(
        `It belongs to your **${geometry.fingerLabel}**${anchor}.`,
        '',
        `Most misses on this key come from the whole hand moving instead of just that finger. Do 3 × 30-second runs with the Weakness Weaver locked to \`${namedKey}\`, and keep your other fingers resting on their home keys while you work it.`
      );
    } else {
      lines.push(`Do 3 × 30-second runs in the Weakness Weaver with that key as the focus, keeping the rest of your hand relaxed on home row.`);
    }

    return lines.join('\n');
  }

  if (q.includes('plan') || q.includes('routine') || q.includes('schedule') || q.includes('programme') || q.includes('program')) {
    const base = pace > 0 ? pace : 30;
    const focus = topKey ? `'${topKey.key}'` : 'your weakest keys';
    return [
      `**Three-day plan built from your recorded pace (~${Math.round(base)} WPM):**`,
      '',
      `1. **Day 1 — accuracy first.** 3 × 60-second runs at ${Math.max(15, Math.round(base * 0.9))} WPM. Abandon a run the moment you would have to guess a key. Target 98%+.${profile?.nextLessonTitle ? ` Use Lesson: ${profile.nextLessonTitle}.` : ''}`,
      `2. **Day 2 — the weak key.** 4 × 45-second runs in the Weakness Weaver focused on ${focus}. Deliberately slow that key down; keep every other key at normal pace.`,
      `3. **Day 3 — speed under control.** 5 × 30-second runs in Free Practice at ${Math.max(15, Math.round(base * 1.08))} WPM. A dip to 95% accuracy is acceptable; below that, drop the target.`,
      '',
      'Ten to fifteen focused minutes a day beats one long session — day 2 is usually what moves the needle.',
    ].join('\n');
  }

  // A question about a named transition is more specific than a general speed
  // question, and "how do I speed up the 'ing' transition?" used to be answered
  // by the plateau script because both branches matched and speed came first.
  // The pattern must be quoted ('ing', "ing", `ing`). Bare substring matching is
  // useless here: "ing" hides inside "making" and "th" inside "Anything", which
  // sent posture and accuracy questions to the transition script.
  const quotedPattern = profile?.weakPatterns.find((insight) => {
    const pattern = insight.pattern.toLowerCase();
    return q.includes(`'${pattern}'`) || q.includes(`"${pattern}"`) || q.includes(`\`${pattern}\``);
  });
  const mentionsTransition =
    q.includes('transition') ||
    q.includes('ngram') ||
    q.includes('n-gram') ||
    q.includes('digraph') ||
    q.includes('bigram') ||
    q.includes('chunk');
  const pattern = quotedPattern ?? topPattern;

  if (pattern && (quotedPattern !== undefined || mentionsTransition)) {
    return [
      `Your slowest measured transition is \`${pattern.pattern}\` — ${pattern.errorRatePct}% errors at ${pattern.avgLatencyMs}ms per press.`,
      '',
      `**Drill it:** 4 × 30-second runs in the Weakness Weaver with \`${pattern.pattern}\` as the focus, typing that pair as one motion rather than two presses. Then 2 × 60-second Free Practice runs at your normal pace and check the Biometric Latency HUD — it shows whether the latency actually dropped.`,
    ].join('\n');
  }

  if (
    q.includes('lesson') ||
    q.includes('curriculum') ||
    q.includes('what should i') ||
    q.includes('next step') ||
    q.includes('where do i start') ||
    q.includes('roadmap')
  ) {
    const focus = topKey ? `\`${topKey.key}\`` : 'your weakest recorded key';
    return [
      profile?.nextLessonTitle
        ? `You are ${profile.lessonsCompleted} lessons into the ${profile.lessonsTotal}-lesson curriculum. Take **${profile.nextLessonTitle}** next — it unlocks keys in the order your hands can absorb them.`
        : `All ${profile?.lessonsTotal ?? 42} lessons are complete, so what is left is speed work and precision on the keys you miss.`,
      '',
      `Pair each lesson with one short drill on ${focus}: 3 × 30-second runs in the Weakness Weaver first, then the lesson itself at a pace where you never have to guess a key.`,
      profile?.keybrFocusKey ? `\nThe adaptive progression is currently probing \`${profile.keybrFocusKey}\`.` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (q.includes('fast') || q.includes('speed') || q.includes('wpm') || q.includes('plateau')) {
    return [
      'Speed is a byproduct of precision, not effort. Rushing produces micro-stutters and backspace penalties that drag your average WPM down.',
      keyEvidence ? `\n${keyEvidence}` : '',
      '',
      '**Break the plateau in this order:**',
      '1. **Metronome cadence.** In Settings, enable the cadence metronome at your current pace, then raise it 4 WPM per session. Type to the beat, not to the clock.',
      '2. **Read ahead.** Keep your eyes two to three words past the word your fingers are striking. Look-ahead, not hand speed, is the usual ceiling.',
      '3. **Float the wrists.** Wrists level, elbows near 90°, and no resting weight on the desk — tension caps speed long before your fingers do.',
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (q.includes('accuracy') || q.includes('mistake') || q.includes('error') || q.includes('backspace')) {
    const accuracyNote = profile?.bestAccuracy ? ` Your recorded best accuracy is ${profile.bestAccuracy}%.` : '';
    return [
      `Every mistake is a physical cue: the finger reached before the home-row anchor was confirmed.${accuracyNote}`,
      '',
      '**Fix it like this:**',
      '1. Drop the target 15–20% until you finish three consecutive runs at 98%+ accuracy.',
      '2. Type the error keys at half speed for one run — deliberately, not cautiously.',
      '3. Turn on **Stop on error** in Settings for a week. It removes the backspace reflex and forces the correction at the source.',
      keyEvidence ? `\n${keyEvidence}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (q.includes('posture') || q.includes('finger') || q.includes('hand') || q.includes('wrist') || q.includes('pain') || q.includes('ergonom')) {
    return [
      '**Ergonomic checklist:**',
      '- **Elbows** at 90–100°, level with the keyboard, not resting on the desk edge.',
      '- **Wrists** straight and neutral, floating. Wrist rests are for breaks, not for typing.',
      '- **Home position:** index fingers on the **F** and **J** bumps; every other finger owns its column and returns there after each stroke.',
      '- **Pressure:** only enough force to actuate the switch. Bottoming out hard is what causes finger fatigue.',
      '- **Breaks:** 30 seconds of hand shaking every 10 minutes beats an hour of typing with clenched hands.',
    ].join('\n');
  }

  if (q.includes('transition') || q.includes('ngram') || q.includes('digraph') || q.includes('bigram') || q.includes('chunk')) {
    return 'Type letter pairs like `th` and `ing` as single chords rather than two separate presses, and watch the Biometric Latency HUD after each run to confirm the transition got faster.';
  }

  return [
    'The core of elite touch typing is chunking: your brain stops processing single letters and starts firing whole patterns as one motion.',
    keyEvidence ?? '',
    '',
    `Practise in short focused intervals — 10 to 15 minutes daily — and keep the target pace just above your comfortable speed.${profile?.nextLessonTitle ? ` Your next unlocked lesson is ${profile.nextLessonTitle}.` : ''}`,
  ]
    .filter(Boolean)
    .join('\n');
}
