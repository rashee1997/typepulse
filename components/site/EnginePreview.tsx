'use client';

import React, {useCallback, useRef, useState} from 'react';
import {RotateCcw} from 'lucide-react';
import {TypingEngine} from '@/lib/typing-engine';
import {CharState, TypingStats} from '@/types/typing';
import {WordViewport} from '@/components/WordViewport';

/** A 43-character passage — the same text shape the studio grades. */
const PASSAGE = 'the quick brown fox jumps over the lazy dog';

/**
 * Live engine preview.
 *
 * This is a genuinely isolated client island: it constructs the **production**
 * `TypingEngine` and renders the **production** `WordViewport`, so what a visitor
 * types here is graded by exactly the code the studio runs. It is deliberately
 * separate from the studio route and shares no state with it — the studio's DOM,
 * providers and style tokens are never touched.
 *
 * Two details worth noting:
 * - Key handling uses React's `onKeyDown` rather than a manual global
 *   `addEventListener`, so there is no listener to leak and no cleanup to forget.
 * - Dynamic difficulty adjustment is disabled, which also disables the engine's
 *   only internal sound call, keeping the preview silent on a documentation page.
 * - `WordViewport` paints untyped glyphs with the studio's `text-subtle` token,
 *   which measures 4.24:1 on the dark canvas (under AA) and 7.24:1 on the light
 *   one. Instead of restyling the shared component — and changing the product's
 *   appearance — the preview scopes a contrast override to itself via the
 *   `data-status` attribute the glyphs already expose.
 *
 * The engine is constructed in a `useState` initializer: `TypingEngine` has no
 * browser dependencies at construction time (it is already instantiated during
 * SSR in the studio), so server and client markup match exactly.
 */
export function EnginePreview() {
  const [engine] = useState(
    () => new TypingEngine(PASSAGE, 'standard', false, false)
  );
  const [chars, setChars] = useState<CharState[]>(() => engine.getCharsSnapshot());
  const [stats, setStats] = useState<TypingStats>(() => engine.getStats());
  const [status, setStatus] = useState('');
  const activeCharRef = useRef<HTMLSpanElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  const sync = useCallback(() => {
    setChars(engine.getCharsSnapshot());
    setStats(engine.getStats());
  }, [engine]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      // Let every non-typing key through untouched, including Tab and Escape, so
      // a keyboard-only visitor is never trapped inside the demo.
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key !== 'Backspace' && event.key.length !== 1) return;

      // Space would scroll the page and `'` opens Firefox quick-find.
      event.preventDefault();

      engine.handleInput(event.key, {
        timestamp: performance.now(),
        repeat: event.repeat,
      });
      sync();

      if (engine.currentIndex >= engine.chars.length) {
        const final = engine.getStats();
        setStatus(
          `Passage complete. ${final.wpm} words per minute at ${final.accuracy} percent accuracy.`
        );
      }
    },
    [engine, sync]
  );

  const handleReset = useCallback(() => {
    engine.reset(PASSAGE);
    sync();
    setStatus('Passage reset.');
    surfaceRef.current?.focus();
  }, [engine, sync]);

  const typed = Math.min(engine.currentIndex, engine.chars.length);
  const progress = Math.round((typed / engine.chars.length) * 100);
  const isFinished = typed >= engine.chars.length;

  const readout = [
    {label: 'WPM', value: String(stats.wpm)},
    {label: 'Accuracy', value: `${stats.accuracy}%`},
    {label: 'Progress', value: `${progress}%`},
    {label: 'Consistency', value: `${stats.consistency}%`},
  ];

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-card sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-accent" />
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            Live — production engine
          </span>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-muted px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary"
        >
          <RotateCcw aria-hidden="true" className="h-3 w-3" />
          Reset
        </button>
      </div>

      <div
        ref={surfaceRef}
        tabIndex={0}
        role="group"
        aria-label="Live typing demonstration"
        aria-describedby="engine-preview-help"
        onKeyDown={handleKeyDown}
        onClick={() => surfaceRef.current?.focus()}
        className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-surface [&_[data-status=pending]]:text-text-secondary"
      >
        <WordViewport
          engineChars={chars}
          engineIndex={engine.currentIndex}
          sessionState={isFinished ? 'completed' : 'playing'}
          gameMode="practice"
          showGhostPacer={false}
          viewportMode="3-line"
          activeCharRef={activeCharRef}
        />
      </div>

      <p id="engine-preview-help" className="mt-3 text-sm text-text-secondary">
        Click the passage or press <kbd className="rounded border border-border bg-surface-muted px-1 font-mono text-[11px]">Tab</kbd> to
        reach it, then type the sentence. <kbd className="rounded border border-border bg-surface-muted px-1 font-mono text-[11px]">Backspace</kbd> corrects,
        and every key you type is graded by the same code path the studio uses.
      </p>

      <span role="status" aria-live="polite" className="sr-only">
        {status}
      </span>

      {/* Fixed-height readout: values change without moving the layout. */}
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {readout.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-border-subtle bg-surface-muted px-3 py-2"
          >
            <dt className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-secondary">
              {item.label}
            </dt>
            <dd className="mt-0.5 font-mono text-lg font-extrabold tabular-nums text-text-primary">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
