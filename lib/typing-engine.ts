import { CharState, TypingStats, WpmSample } from '@/types/typing';

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
  private keyIntervals: number[] = [];
  private lastKeyTimestamp: number = 0;

  constructor(initialText: string = '') {
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
    this.keyIntervals = [];
    this.lastKeyTimestamp = 0;
  }

  public handleInput(key: string, ctrlKey: boolean = false): {
    success: boolean;
    isFinished: boolean;
    charTyped: string;
    targetChar: string;
    isCorrect: boolean;
  } {
    const now = Date.now();

    // Start timer on first valid keystroke
    if (!this.startTime) {
      this.startTime = now;
      this.lastKeyTimestamp = now;
    } else {
      const interval = now - this.lastKeyTimestamp;
      if (interval < 5000) {
        this.keyIntervals.push(interval);
      }
      this.lastKeyTimestamp = now;
    }

    // Handle Backspace
    if (key === 'Backspace') {
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
