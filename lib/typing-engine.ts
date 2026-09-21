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
  public typedByChar: Record<string, number> = {};
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
  public activeGhostDuel: GhostDuelPayload | null = null;

  private keyIntervals: number[] = [];
  private lastKeyTimestamp: number = 0;
  private previousKey: string | null = null;
  private twoKeysAgo: string | null = null;
  private lastProcessedKey: string | null = null;
  private lastProcessedKeyTimestamp: number = 0;
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
      hadError: false,
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
    this.typedByChar = {};
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
    this.activeGhostDuel = null;
    this.enforceIndexInvariants();
  }

  /**
   * Enforces strict invariants on character statuses relative to currentIndex:
   * 1. 0 <= currentIndex <= chars.length
   * 2. Characters before currentIndex cannot be 'pending' or 'current'
   * 3. Character at currentIndex must be 'current' (if in bounds and not incorrect in stop-on-error)
   * 4. Characters after currentIndex must be 'pending' with userTyped cleared
   */
  public enforceIndexInvariants(): void {
    this.currentIndex = Math.max(0, Math.min(this.chars.length, this.currentIndex));

    for (let i = 0; i < this.currentIndex; i++) {
      const ch = this.chars[i];
      if (ch.status === 'pending' || ch.status === 'current') {
        ch.status = ch.hadError ? 'corrected' : 'correct';
      }
    }

    if (this.currentIndex < this.chars.length) {
      const current = this.chars[this.currentIndex];
      if (current.status !== 'incorrect') {
        current.status = 'current';
      }
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
      hadError: c.hadError,
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
   * Public entrypoint for processing keystrokes with hardware switch bounce protection
   * and OS repeat suppression.
   */
  public handleInput(
    key: string,
    ctrlKeyOrOptions: boolean | InputOptions = false
  ): InputResult {
    const options: InputOptions =
      typeof ctrlKeyOrOptions === 'boolean'
        ? { ctrlKey: ctrlKeyOrOptions }
        : ctrlKeyOrOptions || {};

    return this.processSingleInput(key, options);
  }

  private processSingleInput(key: string, options: InputOptions): InputResult {
    const now = options.timestamp ?? this.now();
    let currentInterval = 180;

    if (this.endTime !== null) {
      return {
        success: false,
        isFinished: true,
        charTyped: key,
        targetChar: '',
        isCorrect: false,
        ignored: true,
        reason: 'finished',
      };
    }

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

    // Ignore modifier and non-typing keys alone
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

    // Start timer on first valid printable keystroke (not Backspace or modifier)
    if (this.startTime === null) {
      this.startTime = now;
      this.lastKeyTimestamp = now;
    } else {
      const interval = now - this.lastKeyTimestamp;
      // Cap at 2000 ms to avoid huge pauses distorting cadence metrics (M5)
      if (interval >= 20 && interval <= 2000) {
        this.keyIntervals.push(interval);
        currentInterval = interval;
      }
      this.lastKeyTimestamp = now;
    }

    // Submit key maps to the newline character used by multi-line code targets.
    const inputKey = key === 'Enter' ? '\n' : key;

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

    const currentCh = this.chars[this.currentIndex];

    // Stop-on-error mode constraint: if current character was already mistyped,
    // require correction (Backspace or typing correct key) before advancing (C7)
    if (this.errorMode === 'stop-on-error' && currentCh && currentCh.status === 'incorrect') {
      if (inputKey !== currentCh.char) {
        this.totalKeystrokes++;
        this.incorrectKeystrokes++;
        this.combo = 0;
        this.typedByChar[currentCh.char] = (this.typedByChar[currentCh.char] || 0) + 1;
        this.errorsByChar[currentCh.char] = (this.errorsByChar[currentCh.char] || 0) + 1;
        return {
          success: false,
          isFinished: false,
          charTyped: key,
          targetChar: currentCh.char,
          isCorrect: false,
        };
      }
    }

    // Quick Word Skip on Space (M3):
    // If typist hits Space mid-word, skip remaining characters in the current word,
    // mark them incorrect, reset combo to 0, count 1 keystroke for Space, and advance.
    if (this.quickWordSkip && inputKey === ' ' && this.chars[this.currentIndex]?.char !== ' ') {
      let spaceIdx = this.currentIndex;
      while (spaceIdx < this.chars.length && this.chars[spaceIdx].char !== ' ') {
        this.chars[spaceIdx].status = 'incorrect';
        this.chars[spaceIdx].hadError = true;
        this.chars[spaceIdx].timestamp = now;
        spaceIdx++;
      }
      if (spaceIdx < this.chars.length && this.chars[spaceIdx].char === ' ') {
        this.chars[spaceIdx].status = 'correct';
        this.chars[spaceIdx].timestamp = now;
        spaceIdx++;
      }
      this.currentIndex = spaceIdx;
      this.combo = 0; // Reset combo (M3)
      this.totalKeystrokes++; // 1 keystroke for Space (M3)
      this.keystrokeSequence++;
      this.enforceIndexInvariants();

      this.lastProcessedKey = ' ';
      this.lastProcessedKeyTimestamp = now;

      // Record skip replay event
      const deltaMs = this.startTime !== null ? now - this.startTime : 0;
      this.replayEvents.push({
        deltaMs,
        key: ' ',
        isCorrect: false,
        index: spaceIdx,
      });

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
    const isCorrect = inputKey === target.char;

    // Track per-character typed occurrences (C3 & H11)
    this.typedByChar[target.char] = (this.typedByChar[target.char] || 0) + 1;

    if (isCorrect) {
      this.correctKeystrokes++;
      this.combo++;
      if (this.combo > this.maxCombo) {
        this.maxCombo = this.combo;
      }
      // If char was previously mistyped, mark it 'corrected' (L2)
      target.status = target.hadError ? 'corrected' : 'correct';
      target.userTyped = inputKey;
      target.timestamp = now;
    } else {
      this.incorrectKeystrokes++;
      this.combo = 0;
      target.status = 'incorrect';
      target.hadError = true;
      target.userTyped = inputKey;
      target.timestamp = now;

      // Track weak key using real target character (H11)
      this.errorsByChar[target.char] = (this.errorsByChar[target.char] || 0) + 1;
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

    // Record n-gram latency & accuracy patterns (unigram, bigram, trigram).
    const normKey = inputKey.toLowerCase();
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

    // C7: In stop-on-error mode, if typed incorrectly, DO NOT advance currentIndex!
    if (this.errorMode === 'stop-on-error' && !isCorrect) {
      this.recordSample();
      return {
        success: false,
        isFinished: false,
        charTyped: key,
        targetChar: target.char,
        isCorrect: false,
        sequenceId: this.keystrokeSequence,
      };
    }

    this.currentIndex++;

    // Code Auto-Indentation & Bracket Matching bypass (M4):
    // Advance index past indentation spaces without granting free keystrokes
    if (isCorrect && this.codeAutoIndent && (inputKey === '\n' || target.char === '\n')) {
      let indentIdx = this.currentIndex;
      while (indentIdx < this.chars.length && this.chars[indentIdx].char === ' ') {
        this.chars[indentIdx].status = 'correct';
        this.chars[indentIdx].userTyped = undefined;
        this.chars[indentIdx].timestamp = now;
        // Do NOT increment correctKeystrokes or totalKeystrokes
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
    // If stop-on-error mode and current character has error, clear it without stepping back
    if (
      this.errorMode === 'stop-on-error' &&
      this.currentIndex < this.chars.length &&
      this.chars[this.currentIndex]?.status === 'incorrect'
    ) {
      this.chars[this.currentIndex].status = 'current';
      this.chars[this.currentIndex].userTyped = undefined;
      this.correctedErrors++;
      return {
        success: true,
        isFinished: false,
        charTyped: 'Backspace',
        targetChar: this.chars[this.currentIndex].char,
        isCorrect: true,
      };
    }

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

  /**
   * Finalizes the test session clock (M2).
   */
  public finish(timestamp?: number): void {
    if (this.endTime === null) {
      this.endTime = timestamp ?? this.now();
      this.recordSample();
    }
  }

  public isFinished(): boolean {
    return this.endTime !== null || this.currentIndex >= this.chars.length;
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
    // Derive net correct characters from the text state (C8)
    const netCorrect = this.chars
      .slice(0, this.currentIndex)
      .filter((c) => (c.status === 'correct' || c.status === 'corrected') && c.userTyped !== undefined).length;

    const wpm = Math.max(0, Math.round((netCorrect / 5) / elapsedMinutes));
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
      hadError: false,
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
    if (this.keyIntervals.length < 5) return 0; // M6: return 0 when insufficient data
    const mean = this.keyIntervals.reduce((a, b) => a + b, 0) / this.keyIntervals.length;
    const variance = this.keyIntervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / this.keyIntervals.length;
    const stdDev = Math.sqrt(variance);
    // Coefficient of variation (lower stdDev relative to mean = higher consistency)
    const cov = mean > 0 ? stdDev / mean : 1;
    // Map cov 0.2 -> 90%, 0.0 -> 100%
    const score = Math.max(10, Math.min(100, Math.round(100 - cov * 50)));
    return score;
  }

  public getStats(): TypingStats {
    const elapsed = this.getElapsedSeconds();
    const elapsedMinutes = elapsed / 60;

    // C8: Derived net correct chars from current text state (excluding untyped auto-indents)
    const netCorrectChars = this.chars
      .slice(0, this.currentIndex)
      .filter((c) => (c.status === 'correct' || c.status === 'corrected') && c.userTyped !== undefined).length;

    // Standard formula: 1 word = 5 characters
    const wpm = elapsedMinutes > 0
      ? Math.max(0, Math.round((netCorrectChars / 5) / elapsedMinutes))
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

    // H12: Calculate Keybr confidence scores for all practiced keys
    const keyStatsForConfidence: Record<string, { typed: number; errors: number }> = {};
    const allKeys = new Set([
      ...Object.keys(this.typedByChar),
      ...Object.keys(this.errorsByChar),
      ...Object.keys(this.patternStats),
    ]);

    for (const ch of allKeys) {
      const typed = this.typedByChar[ch] ?? (this.patternStats[ch]?.typed || 0);
      const errors = this.errorsByChar[ch] ?? 0;
      if (typed > 0 || errors > 0) {
        keyStatsForConfidence[ch] = {
          typed: Math.max(typed, errors),
          errors,
        };
      }
    }

    const confidenceScores = calculateKeyConfidence(keyStatsForConfidence, this.patternStats);
    const confValues = Object.values(confidenceScores);
    const confidenceScore = confValues.length > 0
      ? Math.round((confValues.reduce((a, b) => a + b, 0) / confValues.length) * 100) / 100
      : undefined;

    return {
      wpm,
      rawWpm,
      accuracy,
      correctChars: netCorrectChars,
      incorrectChars: this.incorrectKeystrokes,
      correctedErrors: this.correctedErrors,
      totalKeystrokes: this.totalKeystrokes,
      elapsedSeconds: Math.round(elapsed * 10) / 10,
      combo: this.combo,
      maxCombo: this.maxCombo,
      consistency: this.getConsistency(),
      errorsByChar: { ...this.errorsByChar },
      typedByChar: { ...this.typedByChar },
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
    const firstDelta = this.replayEvents[0]?.deltaMs || 0;
    const isAbsolute = firstDelta > 1000000;
    const baseOffset = isAbsolute ? firstDelta : 0;

    const payload: GhostDuelPayload = {
      version: 1,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? `ghost_${crypto.randomUUID()}` : `ghost_${Math.random().toString(36).substring(2, 9)}`,
      targetText: this.text,
      wpm: stats.wpm,
      accuracy: stats.accuracy,
      author,
      events: this.replayEvents.map((e) => [
        Math.max(0, Math.round(e.deltaMs - baseOffset)),
        e.index,
        e.isCorrect,
      ]),
    };
    try {
      const json = JSON.stringify(payload);
      if (typeof window !== 'undefined') {
        return btoa(encodeURIComponent(json));
      }
      return Buffer.from(encodeURIComponent(json)).toString('base64');
    } catch {
      return '';
    }
  }

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
      const decoded = decodeURIComponent(
        typeof window !== 'undefined' ? atob(raw) : Buffer.from(raw, 'base64').toString('utf-8')
      );
      const parsed = JSON.parse(decoded);
      if (
        parsed &&
        parsed.version === 1 &&
        typeof parsed.targetText === 'string' &&
        Array.isArray(parsed.events)
      ) {
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
