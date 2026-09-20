import { CharState, ErrorMode, GhostDuelPayload, LiveHesitationSignal, ReplayEvent, TypingStats, WpmSample } from '@/types/typing';
import { calculateKeyConfidence } from './adaptive-engine';
import { soundFx } from './sound';

export interface InputOptions {
  ctrlKey?: boolean;
  repeat?: boolean;
  timestamp?: number;
  force?: boolean;
}

export interface InputResult {
  success: boolean;
  isFinished: boolean;
  charTyped: string;
  targetChar: string;
  isCorrect: boolean;
  ignored?: boolean;
  reason?: 'hardware_bounce' | 'unwanted_repeat' | 'composing' | 'out_of_bounds' | 'modifier';
  sequenceId?: number;
}

export class TypingEngine {
  public text: string = '';
  public chars: CharState[] = [];
  public currentIndex: number = 0;
  public startTime: number | null = null;
  public endTime: number | null = null;
  public totalKeystrokes: number = 0;
  public correctKeystrokes: number = 0;
  public incorrectKeystrokes: number = 0;
  public correctedErrors: number = 0;
  public combo: number = 0;
  public maxCombo: number = 0;
  public errorsByChar: Record<string, number> = {};
  public timeline: WpmSample[] = [];
  public patternStats: Record<string, { typed: number; errors: number; totalLatencyMs: number; avgLatencyMs: number }> = {};
  public replayEvents: ReplayEvent[] = [];
  public errorMode: ErrorMode = 'standard';
  public quickWordSkip: boolean = false;
  public ddaEnabled: boolean = true;
  public codeAutoIndent: boolean = true;
  public codeBracketSkip: boolean = true;
  public hesitationSignals: LiveHesitationSignal[] = [];
  public remediatedHesitationCount: number = 0;
  public keystrokeSequence: number = 0;

  private keyIntervals: number[] = [];
  private lastKeyTimestamp: number = 0;
  private previousKey: string | null = null;
  private twoKeysAgo: string | null = null;
  private lastProcessedKey: string | null = null;
  private lastProcessedKeyTimestamp: number = 0;
  private isProcessingQueue: boolean = false;
  private inputQueue: Array<{ key: string; options: InputOptions; resolve: (res: InputResult) => void }> = [];
  private static readonly MIN_REPEAT_THRESHOLD_MS: number = 25;

  /**
   * High-resolution monotonic clock.
   *
   * Millisecond keystroke intervals must never be derived from wall-clock time:
   * `Date.now()` can jump forwards or backwards on NTP correction, which corrupts
   * inter-key latency, consistency and DDA baselines. `performance.now()` is
   * monotonic and sub-millisecond, so every derived metric stays stable.
   */
  private now(): number {
    return typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();
  }

  constructor(
    initialText: string = '',
    errorMode: ErrorMode = 'standard',
    quickWordSkip: boolean = false,
    ddaEnabled: boolean = true,
    codeAutoIndent: boolean = true,
    codeBracketSkip: boolean = true
  ) {
    this.errorMode = errorMode;
    this.quickWordSkip = quickWordSkip;
    this.ddaEnabled = ddaEnabled;
    this.codeAutoIndent = codeAutoIndent;
    this.codeBracketSkip = codeBracketSkip;
    this.reset(initialText);
  }

  public reset(newText?: string) {
    if (newText !== undefined) {
      this.text = newText;
    }
    this.chars = this.text.split('').map((char, index) => ({
      char,
      status: index === 0 ? 'current' : 'pending',
    }));
    this.currentIndex = 0;
    this.startTime = null;
    this.endTime = null;
    this.totalKeystrokes = 0;
    this.correctKeystrokes = 0;
    this.incorrectKeystrokes = 0;
    this.correctedErrors = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.errorsByChar = {};
    this.timeline = [];
    this.patternStats = {};
    this.replayEvents = [];
    this.keyIntervals = [];
    this.lastKeyTimestamp = 0;
    this.previousKey = null;
    this.twoKeysAgo = null;
    this.lastProcessedKey = null;
    this.lastProcessedKeyTimestamp = 0;
    this.keystrokeSequence = 0;
    this.hesitationSignals = [];
    this.remediatedHesitationCount = 0;
    this.inputQueue = [];
    this.isProcessingQueue = false;
    this.enforceIndexInvariants();
  }

  /**
   * Enforces strict invariants on character statuses relative to currentIndex:
   * 1. 0 <= currentIndex <= chars.length
   * 2. Characters before currentIndex cannot be 'pending' or 'current'
   * 3. Character at currentIndex must be 'current' (if in bounds)
   * 4. Characters after currentIndex must be 'pending' with userTyped cleared
   */
  public enforceIndexInvariants(): void {
    this.currentIndex = Math.max(0, Math.min(this.chars.length, this.currentIndex));

    for (let i = 0; i < this.currentIndex; i++) {
      const ch = this.chars[i];
      if (ch.status === 'pending' || ch.status === 'current') {
        ch.status = 'correct';
      }
    }

    if (this.currentIndex < this.chars.length) {
      this.chars[this.currentIndex].status = 'current';
    }

    for (let i = this.currentIndex + 1; i < this.chars.length; i++) {
      const ch = this.chars[i];
      ch.status = 'pending';
      ch.userTyped = undefined;
    }
  }

  /**
   * Returns a deep clone of the character state array to prevent stale React references
   * and tearing during concurrent rendering.
   */
  public getCharsSnapshot(): CharState[] {
    return this.chars.map((c) => ({
      char: c.char,
      status: c.status,
      userTyped: c.userTyped,
      timestamp: c.timestamp,
    }));
  }

  /**
   * Batches multiple keystrokes atomically in sequence without intermediate UI stalls.
   */
  public batchInput(items: Array<{ key: string; ctrlKey?: boolean; repeat?: boolean }>): InputResult[] {
    const results: InputResult[] = [];
    for (const item of items) {
      results.push(this.handleInput(item.key, { ctrlKey: item.ctrlKey, repeat: item.repeat }));
    }
    this.recordSample();
    return results;
  }

  /**
   * Public entrypoint for processing keystrokes with concurrency re-entrancy queue,
   * hardware switch bounce protection, and OS repeat suppression.
   */
  public handleInput(
    key: string,
    ctrlKeyOrOptions: boolean | InputOptions = false
  ): InputResult {
    const options: InputOptions =
      typeof ctrlKeyOrOptions === 'boolean'
        ? { ctrlKey: ctrlKeyOrOptions }
        : ctrlKeyOrOptions || {};

    // Re-entrancy guard: if an input is already actively being processed,
    // queue the new input and drain in strict FIFO order
    if (this.isProcessingQueue) {
      let resolvedResult: InputResult | null = null;
      this.inputQueue.push({
        key,
        options,
        resolve: (r) => {
          resolvedResult = r;
        },
      });
      return (
        resolvedResult || {
          success: false,
          isFinished: this.currentIndex >= this.chars.length,
          charTyped: key,
          targetChar: this.chars[this.currentIndex]?.char || '',
          isCorrect: false,
          ignored: true,
        }
      );
    }

    this.isProcessingQueue = true;
    try {
      const initialResult = this.processSingleInput(key, options);

      while (this.inputQueue.length > 0) {
        const next = this.inputQueue.shift()!;
        const nextResult = this.processSingleInput(next.key, next.options);
        next.resolve(nextResult);
      }

      return initialResult;
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private processSingleInput(key: string, options: InputOptions): InputResult {
    const now = options.timestamp ?? this.now();
    let currentInterval = 180;

    // Reject unwanted OS auto-repeat for printable characters to prevent
    // accidental double-typing on consecutive identical letters (e.g. 'tt' in 'letter')
    if (options.repeat && key !== 'Backspace') {
      return {
        success: false,
        isFinished: false,
        charTyped: key,
        targetChar: this.chars[this.currentIndex]?.char || '',
        isCorrect: false,
        ignored: true,
        reason: 'unwanted_repeat',
      };
    }

    // Hardware switch chatter / bounce debouncing for identical consecutive keys
    // Physical single-finger re-actuation takes >= 40-50ms for human typists.
    if (
      key === this.lastProcessedKey &&
      !options.ctrlKey &&
      key !== 'Backspace' &&
      !options.force
    ) {
      const timeSinceLast = now - this.lastProcessedKeyTimestamp;
      if (timeSinceLast < TypingEngine.MIN_REPEAT_THRESHOLD_MS) {
        return {
          success: false,
          isFinished: false,
          charTyped: key,
          targetChar: this.chars[this.currentIndex]?.char || '',
          isCorrect: false,
          ignored: true,
          reason: 'hardware_bounce',
        };
      }
    }

    // Ignore modifier keys alone
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape'].includes(key)) {
      return {
        success: false,
        isFinished: false,
        charTyped: key,
        targetChar: this.chars[this.currentIndex]?.char || '',
        isCorrect: false,
        ignored: true,
        reason: 'modifier',
      };
    }

    // Start timer on first valid keystroke
    if (this.startTime === null) {
      this.startTime = now;
      this.lastKeyTimestamp = now;
    } else {
      const interval = now - this.lastKeyTimestamp;
      if (interval < 5000) {
        this.keyIntervals.push(interval);
        currentInterval = interval;
      }
      this.lastKeyTimestamp = now;
    }

    // Handle Backspace
    if (key === 'Backspace') {
      this.lastProcessedKey = 'Backspace';
      this.lastProcessedKeyTimestamp = now;
      if (this.errorMode === 'confidence') {
        // Confidence mode: no backspacing permitted!
        return {
          success: false,
          isFinished: false,
          charTyped: 'Backspace',
          targetChar: this.chars[this.currentIndex]?.char || '',
          isCorrect: false,
        };
      }
      const backspaceResult = this.handleBackspace(options.ctrlKey || false);
      this.enforceIndexInvariants();
      return backspaceResult;
    }

    if (this.currentIndex >= this.chars.length) {
      return {
        success: false,
        isFinished: true,
        charTyped: key,
        targetChar: '',
        isCorrect: false,
        ignored: true,
        reason: 'out_of_bounds',
      };
    }

    // Stop-on-error mode constraint: if current character was already mistyped,
    // block typing further characters until corrected via backspace
    if (this.errorMode === 'stop-on-error') {
      const currentCh = this.chars[this.currentIndex];
      if (currentCh && currentCh.status === 'incorrect' && key !== currentCh.char) {
        return {
          success: false,
          isFinished: false,
          charTyped: key,
          targetChar: currentCh.char,
          isCorrect: false,
        };
      }
    }

    // Quick Word Skip on Space:
    // If typist hits Space mid-word, skip remaining characters in the current word,
    // mark them incorrect, and advance to next word boundary.
    if (this.quickWordSkip && key === ' ' && this.chars[this.currentIndex]?.char !== ' ') {
      let spaceIdx = this.currentIndex;
      while (spaceIdx < this.chars.length && this.chars[spaceIdx].char !== ' ') {
        this.chars[spaceIdx].status = 'incorrect';
        this.chars[spaceIdx].timestamp = now;
        this.incorrectKeystrokes++;
        this.totalKeystrokes++;
        spaceIdx++;
      }
      if (spaceIdx < this.chars.length && this.chars[spaceIdx].char === ' ') {
        this.chars[spaceIdx].status = 'correct';
        this.chars[spaceIdx].timestamp = now;
        this.correctKeystrokes++;
        this.totalKeystrokes++;
        spaceIdx++;
      }
      this.currentIndex = spaceIdx;
      this.enforceIndexInvariants();

      this.lastProcessedKey = ' ';
      this.lastProcessedKeyTimestamp = now;
      this.keystrokeSequence++;

      const isFinished = this.currentIndex >= this.chars.length;
      if (isFinished) this.endTime = now;
      this.recordSample();

      return {
        success: true,
        isFinished,
        charTyped: ' ',
        targetChar: ' ',
        isCorrect: true,
        sequenceId: this.keystrokeSequence,
      };
    }

    this.totalKeystrokes++;
    this.keystrokeSequence++;
    const target = this.chars[this.currentIndex];
    const isCorrect = key === target.char;

    if (isCorrect) {
      this.correctKeystrokes++;
      this.combo++;
      if (this.combo > this.maxCombo) {
        this.maxCombo = this.combo;
      }
      target.status = target.status === 'incorrect' ? 'corrected' : 'correct';
      target.userTyped = key;
      target.timestamp = now;
    } else {
      this.incorrectKeystrokes++;
      this.combo = 0;
      target.status = 'incorrect';
      target.userTyped = key;
      target.timestamp = now;

      // Track weak key
      const expectedChar = target.char.toLowerCase();
      this.errorsByChar[expectedChar] = (this.errorsByChar[expectedChar] || 0) + 1;
    }

    this.lastProcessedKey = key;
    this.lastProcessedKeyTimestamp = now;

    // Record replay event stream
    const deltaMs = this.startTime !== null ? now - this.startTime : 0;
    this.replayEvents.push({
      deltaMs,
      key,
      isCorrect,
      index: this.currentIndex,
    });

    // Record n-gram latency & accuracy patterns (unigram, bigram, trigram)
    const normKey = key.toLowerCase();
    const patternsToTrack: string[] = [normKey];
    if (this.previousKey) {
      patternsToTrack.push((this.previousKey + normKey).toLowerCase());
    }
    if (this.twoKeysAgo && this.previousKey) {
      patternsToTrack.push((this.twoKeysAgo + this.previousKey + normKey).toLowerCase());
    }

    // Dynamic Difficulty Adjustment (DDA) monitoring on bigrams
    if (this.ddaEnabled && this.previousKey && normKey && normKey !== ' ') {
      const bigram = (this.previousKey + normKey).toLowerCase();
      const recentIntervals = this.keyIntervals.slice(-12);
      const baseline =
        recentIntervals.length >= 4
          ? recentIntervals.reduce((a, b) => a + b, 0) / recentIntervals.length
          : 220;

      const pendingHesitation = this.hesitationSignals.find(
        (h) => h.bigram === bigram && !h.remediated
      );
      if (pendingHesitation && isCorrect && currentInterval <= baseline * 1.15) {
        pendingHesitation.remediated = true;
        this.remediatedHesitationCount++;
        soundFx.playDdaRemediationChime();
      } else if ((currentInterval > baseline * 1.85 || !isCorrect) && !pendingHesitation) {
        const signal: LiveHesitationSignal = {
          bigram,
          sourceKey: this.previousKey,
          targetKey: normKey,
          latencyMs: currentInterval,
          baselineMs: Math.round(baseline),
          remediated: false,
        };
        this.hesitationSignals.push(signal);
      }
    }

    patternsToTrack.forEach((pattern) => {
      if (!this.patternStats[pattern]) {
        this.patternStats[pattern] = {
          typed: 0,
          errors: 0,
          totalLatencyMs: 0,
          avgLatencyMs: 0,
        };
      }
      const stat = this.patternStats[pattern];
      stat.typed += 1;
      if (!isCorrect) {
        stat.errors += 1;
      }
      stat.totalLatencyMs += currentInterval;
      stat.avgLatencyMs = Math.round(stat.totalLatencyMs / stat.typed);
    });

    this.twoKeysAgo = this.previousKey;
    this.previousKey = normKey;

    this.currentIndex++;

    // Code Auto-Indentation & Bracket Matching bypass
    if (isCorrect && this.codeAutoIndent && (key === '\n' || target.char === '\n')) {
      let indentIdx = this.currentIndex;
      while (indentIdx < this.chars.length && this.chars[indentIdx].char === ' ') {
        this.chars[indentIdx].status = 'correct';
        this.chars[indentIdx].timestamp = now;
        this.correctKeystrokes++;
        this.totalKeystrokes++;
        indentIdx++;
      }
      this.currentIndex = indentIdx;
    }

    this.enforceIndexInvariants();

    const isFinished = this.currentIndex >= this.chars.length;
    if (isFinished) {
      this.endTime = now;
    }

    // Record timeline sample
    this.recordSample();

    return {
      success: true,
      isFinished,
      charTyped: key,
      targetChar: target.char,
      isCorrect,
      sequenceId: this.keystrokeSequence,
    };
  }

  private handleBackspace(ctrlKey: boolean): {
    success: boolean;
    isFinished: boolean;
    charTyped: string;
    targetChar: string;
    isCorrect: boolean;
  } {
    if (this.currentIndex <= 0) {
      return {
        success: false,
        isFinished: false,
        charTyped: 'Backspace',
        targetChar: this.chars[0]?.char || '',
        isCorrect: false,
      };
    }

    if (ctrlKey) {
      // Delete previous word
      let deleteCount = 0;
      // Skip trailing spaces
      while (this.currentIndex > 0 && this.chars[this.currentIndex - 1].char === ' ') {
        this.stepBackChar();
        deleteCount++;
      }
      // Delete word characters
      while (this.currentIndex > 0 && this.chars[this.currentIndex - 1].char !== ' ') {
        this.stepBackChar();
        deleteCount++;
      }
    } else {
      this.stepBackChar();
    }

    return {
      success: true,
      isFinished: false,
      charTyped: 'Backspace',
      targetChar: this.chars[this.currentIndex]?.char || '',
      isCorrect: true,
    };
  }

  private stepBackChar() {
    if (this.currentIndex < this.chars.length) {
      this.chars[this.currentIndex].status = 'pending';
    }
    this.currentIndex--;
    const prev = this.chars[this.currentIndex];
    if (prev.status === 'incorrect') {
      this.correctedErrors++;
    }
    prev.status = 'current';
    prev.userTyped = undefined;
  }

  public getElapsedSeconds(): number {
    if (this.startTime === null) return 0;
    const end = this.endTime ?? this.now();
    return Math.max(0.1, (end - this.startTime) / 1000);
  }

  public recordSample() {
    const elapsed = this.getElapsedSeconds();
    if (elapsed < 0.5) return;

    // Throttle timeline samples to every ~1 second or on completion
    const lastSample = this.timeline[this.timeline.length - 1];
    if (lastSample && elapsed - lastSample.time < 1 && this.currentIndex < this.chars.length) {
      return;
    }

    const elapsedMinutes = elapsed / 60;
    const wpm = Math.max(0, Math.round((this.correctKeystrokes / 5) / elapsedMinutes));
    const rawWpm = Math.max(0, Math.round((this.totalKeystrokes / 5) / elapsedMinutes));

    this.timeline.push({
      time: Math.round(elapsed * 10) / 10,
      wpm,
      rawWpm,
      errors: this.incorrectKeystrokes,
      combo: this.combo,
    });
  }

  public appendText(extraText: string) {
    if (!extraText) return;
    const startIdx = this.chars.length;
    this.text += extraText;
    const newChars = extraText.split('').map((char, index) => ({
      char,
      status: (startIdx + index === this.currentIndex) ? ('current' as const) : ('pending' as const),
    }));
    this.chars.push(...newChars);
  }

  public getRollingCadence(): {
    ikiv: number;
    status: 'locked-in' | 'smooth' | 'rushing' | 'stuttering';
    currentTempoWpm: number;
    variance: number;
  } {
    const recent = this.keyIntervals.slice(-10);
    if (recent.length < 4) {
      return { ikiv: 0, status: 'smooth', currentTempoWpm: 0, variance: 0 };
    }
    const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
    const variance = recent.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / recent.length;
    const stdDev = Math.sqrt(variance);
    const cov = mean > 0 ? stdDev / mean : 1;
    const currentTempoWpm = mean > 0 ? Math.round((60000 / mean) / 5) : 0;

    let status: 'locked-in' | 'smooth' | 'rushing' | 'stuttering' = 'smooth';
    if (cov < 0.22 && recent.length >= 7) {
      status = 'locked-in';
    } else if (cov < 0.38) {
      status = 'smooth';
    } else if (mean < 140 && cov >= 0.38) {
      status = 'rushing';
    } else {
      status = 'stuttering';
    }

    return {
      ikiv: Math.round(cov * 100),
      status,
      currentTempoWpm,
      variance: Math.round(variance),
    };
  }

  public getConsistency(): number {
    if (this.keyIntervals.length < 5) return 90;
    const mean = this.keyIntervals.reduce((a, b) => a + b, 0) / this.keyIntervals.length;
    const variance = this.keyIntervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / this.keyIntervals.length;
    const stdDev = Math.sqrt(variance);
    // Coefficient of variation (lower stdDev relative to mean = higher consistency)
    const cov = mean > 0 ? stdDev / mean : 1;
    // Map cov of 0.2 to 100%, cov of 1.2 to 50%
    const score = Math.max(10, Math.min(100, Math.round(100 - cov * 50)));
    return score;
  }

  public getStats(): TypingStats {
    const elapsed = this.getElapsedSeconds();
    const elapsedMinutes = elapsed / 60;

    // Standard formula: 1 word = 5 characters
    const wpm = elapsedMinutes > 0
      ? Math.max(0, Math.round((this.correctKeystrokes / 5) / elapsedMinutes))
      : 0;

    const rawWpm = elapsedMinutes > 0
      ? Math.max(0, Math.round((this.totalKeystrokes / 5) / elapsedMinutes))
      : 0;

    const accuracy = this.totalKeystrokes > 0
      ? Math.round((this.correctKeystrokes / this.totalKeystrokes) * 1000) / 10
      : 100;

    // Identify weak keys (sorted by error count descending)
    const weakKeys = Object.entries(this.errorsByChar)
      .filter(([char]) => char !== ' ')
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([char]) => char);

    // Calculate Keybr confidence scores
    const keyStatsForConfidence: Record<string, { typed: number; errors: number }> = {};
    Object.keys(this.errorsByChar).forEach((ch) => {
      keyStatsForConfidence[ch] = {
        typed: (this.patternStats[ch]?.typed || 0) + this.errorsByChar[ch],
        errors: this.errorsByChar[ch],
      };
    });
    const confidenceScores = calculateKeyConfidence(keyStatsForConfidence, this.patternStats);
    const confValues = Object.values(confidenceScores);
    const confidenceScore = confValues.length > 0
      ? Math.round((confValues.reduce((a, b) => a + b, 0) / confValues.length) * 100) / 100
      : undefined;

    return {
      wpm,
      rawWpm,
      accuracy,
      correctChars: this.correctKeystrokes,
      incorrectChars: this.incorrectKeystrokes,
      correctedErrors: this.correctedErrors,
      totalKeystrokes: this.totalKeystrokes,
      elapsedSeconds: Math.round(elapsed * 10) / 10,
      combo: this.combo,
      maxCombo: this.maxCombo,
      consistency: this.getConsistency(),
      errorsByChar: { ...this.errorsByChar },
      weakKeys,
      timeline: [...this.timeline],
      patternStats: { ...this.patternStats },
      confidenceScores,
      confidenceScore,
      replayEvents: [...this.replayEvents],
      hesitationSignals: [...this.hesitationSignals],
      remediatedHesitationCount: this.remediatedHesitationCount,
    };
  }

  public exportGhostPayload(author: string = 'Challenger'): string {
    const stats = this.getStats();
    const payload: GhostDuelPayload = {
      version: 1,
      id: 'ghost_' + Math.random().toString(36).substring(2, 9),
      targetText: this.text,
      wpm: stats.wpm,
      accuracy: stats.accuracy,
      author,
      events: this.replayEvents.map((e) => [e.deltaMs, e.index, e.isCorrect]),
    };
    try {
      if (typeof window !== 'undefined') {
        return btoa(encodeURIComponent(JSON.stringify(payload)));
      }
      return '';
    } catch {
      return '';
    }
  }

  public activeGhostDuel: GhostDuelPayload | null = null;

  public setGhostDuel(duel: GhostDuelPayload | null): void {
    this.activeGhostDuel = duel;
  }

  public getGhostIndexAtTime(elapsedMs: number): number {
    if (!this.activeGhostDuel || !this.activeGhostDuel.events.length) return 0;
    let index = 0;
    for (const [deltaMs, charIdx] of this.activeGhostDuel.events) {
      if (deltaMs <= elapsedMs) {
        index = charIdx;
      } else {
        break;
      }
    }
    return index;
  }

  public static parseGhostPayload(raw: string): GhostDuelPayload | null {
    if (!raw) return null;
    try {
      const decoded = decodeURIComponent(atob(raw));
      const parsed = JSON.parse(decoded);
      if (
        parsed &&
        parsed.version === 1 &&
        typeof parsed.targetText === 'string' &&
        Array.isArray(parsed.events)
      ) {
        // Validate each event is [deltaMs, charIdx, isCorrect]
        const validEvents = parsed.events.every(
          (e: unknown) =>
            Array.isArray(e) &&
            typeof e[0] === 'number' &&
            typeof e[1] === 'number'
        );
        if (!validEvents) return null;
        return parsed as GhostDuelPayload;
      }
      return null;
    } catch {
      return null;
    }
  }
}

export function parseGhostDuelPayload(raw: string): GhostDuelPayload | null {
  return TypingEngine.parseGhostPayload(raw);
}

/**
 * Calculates the target character index for a ghost pacer moving at targetWpm
 * Standard formula: 1 word = 5 characters
 * Chars per second = (targetWpm * 5) / 60
 */
export function calculateGhostPacerIndex(
  elapsedSeconds: number,
  targetWpm: number,
  totalChars: number
): number {
  if (elapsedSeconds <= 0 || targetWpm <= 0 || totalChars <= 0) return 0;
  const charsPerSecond = (targetWpm * 5) / 60;
  const targetChars = Math.floor(elapsedSeconds * charsPerSecond);
  return Math.min(totalChars - 1, Math.max(0, targetChars));
}
