import { CharState, ErrorMode, ReplayEvent, TypingStats, WpmSample } from '@/types/typing';
import { calculateKeyConfidence } from './adaptive-engine';

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
  private keyIntervals: number[] = [];
  private lastKeyTimestamp: number = 0;
  private previousKey: string | null = null;
  private twoKeysAgo: string | null = null;

  constructor(initialText: string = '', errorMode: ErrorMode = 'standard', quickWordSkip: boolean = false) {
    this.errorMode = errorMode;
    this.quickWordSkip = quickWordSkip;
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
  }

  public handleInput(key: string, ctrlKey: boolean = false): {
    success: boolean;
    isFinished: boolean;
    charTyped: string;
    targetChar: string;
    isCorrect: boolean;
  } {
    const now = Date.now();
    let currentInterval = 180;

    // Start timer on first valid keystroke
    if (!this.startTime) {
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
      return this.handleBackspace(ctrlKey);
    }

    // Ignore modifier keys alone
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape'].includes(key)) {
      return {
        success: false,
        isFinished: false,
        charTyped: key,
        targetChar: this.chars[this.currentIndex]?.char || '',
        isCorrect: false,
      };
    }

    if (this.currentIndex >= this.chars.length) {
      return {
        success: false,
        isFinished: true,
        charTyped: key,
        targetChar: '',
        isCorrect: false,
      };
    }

    // Stop-on-error mode constraint: if the current character has already been mistyped,
    // block typing further characters until corrected via backspace!
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
      if (this.currentIndex < this.chars.length) {
        this.chars[this.currentIndex].status = 'current';
      }
      const isFinished = this.currentIndex >= this.chars.length;
      if (isFinished) this.endTime = now;
      this.recordSample();
      return {
        success: true,
        isFinished,
        charTyped: ' ',
        targetChar: ' ',
        isCorrect: true,
      };
    }

    this.totalKeystrokes++;
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

    // Record replay event stream
    const deltaMs = this.startTime ? now - this.startTime : 0;
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

    // Mark next character as current if within bounds
    if (this.currentIndex < this.chars.length) {
      this.chars[this.currentIndex].status = 'current';
    }

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
    if (!this.startTime) return 0;
    const end = this.endTime || Date.now();
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
    };
  }
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
