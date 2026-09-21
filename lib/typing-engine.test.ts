import { describe, it, expect, beforeEach } from 'vitest';
import { TypingEngine, calculateGhostPacerIndex } from './typing-engine';

describe('TypingEngine', () => {
  it('initializes with correct characters and state', () => {
    const engine = new TypingEngine('hello');
    expect(engine.chars.length).toBe(5);
    expect(engine.chars[0].char).toBe('h');
    expect(engine.chars[0].status).toBe('current');
    expect(engine.chars[1].status).toBe('pending');
    expect(engine.currentIndex).toBe(0);
  });

  describe('C7: Stop-on-error mode', () => {
    it('does not advance currentIndex on incorrect input in stop-on-error mode', () => {
      const engine = new TypingEngine('test', 'stop-on-error');
      // Correct input
      const r1 = engine.handleInput('t');
      expect(r1.success).toBe(true);
      expect(r1.isCorrect).toBe(true);
      expect(engine.currentIndex).toBe(1);
      expect(engine.chars[0].status).toBe('correct');

      // Incorrect input
      const r2 = engine.handleInput('x');
      expect(r2.success).toBe(false);
      expect(r2.isCorrect).toBe(false);
      // Crucial: currentIndex MUST NOT advance
      expect(engine.currentIndex).toBe(1);
      expect(engine.chars[1].status).toBe('incorrect');

      // Subsequent incorrect input while uncorrected must also be blocked
      const r3 = engine.handleInput('y');
      expect(r3.success).toBe(false);
      expect(engine.currentIndex).toBe(1);

      // Backspace clears the error on the current character
      const rb = engine.handleInput('Backspace');
      expect(rb.success).toBe(true);
      expect(engine.currentIndex).toBe(1);
      expect(engine.chars[1].status).toBe('current');

      // Typing correct character now succeeds and advances
      const r4 = engine.handleInput('e');
      expect(r4.success).toBe(true);
      expect(r4.isCorrect).toBe(true);
      expect(engine.currentIndex).toBe(2);
    });
  });

  describe('C8: WPM calculation and backspace inflation', () => {
    it('does not inflate WPM when backspacing and retyping the same character repeatedly', () => {
      const engine = new TypingEngine('hello');
      const start = 1000;
      // Type 'h'
      engine.handleInput('h', { timestamp: start });
      // Backspace and retype 10 times in 1 second
      for (let i = 0; i < 10; i++) {
        engine.handleInput('Backspace', { timestamp: start + i * 50 + 20 });
        engine.handleInput('h', { timestamp: start + i * 50 + 40 });
      }
      // Finish the word
      engine.handleInput('e', { timestamp: start + 600 });
      engine.handleInput('l', { timestamp: start + 700 });
      engine.handleInput('l', { timestamp: start + 800 });
      engine.handleInput('o', { timestamp: start + 900 });

      const stats = engine.getStats();
      // 'hello' is 5 characters = 1 word
      // Net correct characters in final text is 5, not 5 + 10 = 15!
      expect(stats.correctChars).toBe(5);
    });
  });

  describe('C3 & H11 & H12: Per-character typed tracking & case sensitivity', () => {
    it('tracks typedByChar for all typed characters including clean ones', () => {
      const engine = new TypingEngine('Abc');
      engine.handleInput('A'); // clean
      engine.handleInput('x'); // error on 'b'
      engine.handleInput('Backspace');
      engine.handleInput('b'); // clean
      engine.handleInput('c'); // clean

      const stats = engine.getStats();
      expect(stats.typedByChar).toBeDefined();
      expect(stats.typedByChar?.['A']).toBe(1);
      expect(stats.typedByChar?.['b']).toBe(2); // 'x' attempt + 'b' attempt
      expect(stats.typedByChar?.['c']).toBe(1);
      expect(stats.errorsByChar['b']).toBe(1);
      expect(stats.errorsByChar['A']).toBeUndefined();

      // Confidence scores must be computed for practiced keys (0.5 baseline for <3 attempts)
      expect(stats.confidenceScores).toBeDefined();
      expect(stats.confidenceScores?.['A']).toBe(0.5);
      expect(stats.confidenceScores?.['c']).toBe(0.5);

      // Proven key (3+ attempts without errors at good latency) gets high confidence score
      const provenEngine = new TypingEngine('aaaa');
      provenEngine.handleInput('a', { timestamp: 1000 });
      provenEngine.handleInput('a', { timestamp: 1200 });
      provenEngine.handleInput('a', { timestamp: 1400 });
      const provenStats = provenEngine.getStats();
      expect(provenStats.confidenceScores?.['a']).toBeGreaterThan(0.7);
    });
  });

  describe('M1: Timer starting condition', () => {
    it('does not start timer on initial Backspace or modifier key', () => {
      const engine = new TypingEngine('word');
      engine.handleInput('Backspace');
      expect(engine.getElapsedSeconds()).toBe(0);
      engine.handleInput('Shift');
      expect(engine.getElapsedSeconds()).toBe(0);

      engine.handleInput('w');
      expect(engine.getElapsedSeconds()).toBeGreaterThan(0);
    });
  });

  describe('M3: Quick Word Skip on Space', () => {
    it('resets combo to 0 and records 1 keystroke for Space', () => {
      const engine = new TypingEngine('quick brown', 'standard', true);
      engine.handleInput('q');
      engine.handleInput('u');
      expect(engine.getStats().combo).toBe(2);

      // Hit space mid-word
      engine.handleInput(' ');
      const stats = engine.getStats();
      expect(stats.combo).toBe(0);
      // Index should be at the start of 'brown' (index 6)
      expect(engine.currentIndex).toBe(6);
    });
  });

  describe('M4: Code auto-indent keystroke counting', () => {
    it('does not award free correct or total keystrokes for auto-indented spaces', () => {
      const engine = new TypingEngine('a\n  b', 'standard', false, false, true);
      engine.handleInput('a');
      engine.handleInput('Enter');

      const stats = engine.getStats();
      // Should have only 2 keystrokes ('a' and Enter), not 4!
      expect(stats.totalKeystrokes).toBe(2);
      expect(stats.correctChars).toBe(2);
      // But currentIndex should have advanced past the 2 indented spaces to 'b' (index 4)
      expect(engine.currentIndex).toBe(4);
    });
  });

  describe('L2: Corrected status after backspacing an error', () => {
    it('sets status to corrected when an erroneous character is retyped correctly', () => {
      const engine = new TypingEngine('cat');
      engine.handleInput('c');
      engine.handleInput('x'); // wrong
      expect(engine.chars[1].status).toBe('incorrect');

      engine.handleInput('Backspace');
      expect(engine.chars[1].status).toBe('current');

      engine.handleInput('a'); // now correct
      expect(engine.chars[1].status).toBe('corrected');
    });
  });

  describe('Ghost pacer calculation', () => {
    it('calculates correct index at target WPM', () => {
      // 60 WPM = 1 word/s = 5 chars/s
      // After 2 seconds, expected index is 10
      const idx = calculateGhostPacerIndex(2, 60, 100);
      expect(idx).toBe(10);
    });
  });

  describe('Session Clock & Finish (60s timed test DoD)', () => {
    it('locks elapsed time when finish() is called on timed test expiration', () => {
      const engine = new TypingEngine('A very long passage intended for a sixty second timed typing test');
      engine.handleInput('A', { timestamp: 1000 });
      engine.handleInput(' ', { timestamp: 2000 });

      // Simulate 60-second timer expiring
      engine.finish(61000);
      expect(engine.isFinished()).toBe(true);
      const elapsedAtFinish = engine.getElapsedSeconds();
      expect(elapsedAtFinish).toBe(60);

      // Subsequent input attempts after finish are rejected
      const res = engine.handleInput('v');
      expect(res.success).toBe(false);
      expect(engine.getElapsedSeconds()).toBe(elapsedAtFinish);
    });
  });

  describe('Ghost duel relative export (H4)', () => {
    it('normalizes absolute performance.now() timestamps into relative offsets starting from 0', () => {
      const engine = new TypingEngine('hi');
      // Simulate performance.now() returning large numbers
      engine.handleInput('h', { timestamp: 15432100 });
      engine.handleInput('i', { timestamp: 15432300 });

      const exported = engine.exportGhostPayload('Tester');
      expect(exported).toBeTruthy();

      const decoded = JSON.parse(decodeURIComponent(Buffer.from(exported, 'base64').toString('utf-8')));
      expect(decoded.targetText).toBe('hi');
      expect(decoded.events.length).toBe(2);
      // First event must be 0 (relative)
      expect(decoded.events[0][0]).toBe(0);
      // Second event must be around 200ms
      expect(decoded.events[1][0]).toBe(200);
    });
  });
});
