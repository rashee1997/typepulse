'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { CharState, GameMode, SessionState } from '@/types/typing';

interface WordViewportProps {
  engineChars: CharState[];
  engineIndex: number;
  ghostIndex?: number;
  sessionState: SessionState;
  gameMode: GameMode;
  showGhostPacer?: boolean;
  viewportMode?: '3-line' | 'scrolling';
  onContainerClick?: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  activeCharRef?: React.RefObject<HTMLSpanElement | null>;
  children?: React.ReactNode;
}

// Fixed uniform line height in pixels (matches font-mono text-xl leading-10)
const LINE_HEIGHT = 40;

/**
 * Uniform glyph box. Every character shares an identical, fixed bounding box and
 * font weight; emphasis is expressed ONLY through colour, background and underline.
 *
 * Why: changing font-weight (normal -> bold) or adding horizontal padding changes a
 * glyph's advance width in most monospace faces, which shoves every downstream
 * character sideways on each keystroke. Keeping width constant means CLS = 0.
 * Ligatures are disabled so `fi`, `->` etc. can never merge into a single glyph.
 */
const CHAR_BASE =
  'relative inline-block h-10 leading-10 align-baseline select-none transition-colors duration-75 [font-variant-ligatures:none]';

const CHAR_STATE_CLASS: Record<CharState['status'], string> = {
  pending: 'text-text-subtle',
  current: 'text-accent bg-accent/10 rounded',
  correct: 'text-text-primary',
  incorrect: 'text-error bg-error-subtle rounded underline decoration-error decoration-2 underline-offset-4',
  corrected: 'text-accent',
};

interface TypingCharProps {
  char: string;
  status: CharState['status'];
  isCurrent: boolean;
  isGhost: boolean;
  activeCharRef?: React.RefObject<HTMLSpanElement | null>;
}

/**
 * Memoized glyph. Because all props are primitives (plus a stable ref object),
 * React skips re-rendering every character that did not change this keystroke —
 * only the previous caret glyph, the new caret glyph and the typed glyph update.
 */
const TypingChar = React.memo(function TypingChar({
  char,
  status,
  isCurrent,
  isGhost,
  activeCharRef,
}: TypingCharProps) {
  return (
    <span
      ref={isCurrent ? activeCharRef : undefined}
      data-status={status}
      className={`${CHAR_BASE} ${CHAR_STATE_CLASS[status]}`}
    >
      {/* Caret: absolutely positioned overlay, never part of document flow */}
      {isCurrent && (
        <span
          aria-hidden="true"
          className="absolute -left-px top-1 bottom-1 w-0.5 rounded-full bg-accent shadow-glow-accent-sm animate-caret z-10"
        />
      )}

      {/* Ghost PB pacer marker */}
      {isGhost && (
        <span
          aria-hidden="true"
          title="Ghost PB Pacer"
          className="absolute -left-px top-1 bottom-1 w-0.5 rounded-full bg-primary/90 shadow-glow-primary-sm pointer-events-none z-10"
        >
          <span className="absolute -top-3.5 -left-1.5 text-[9px] text-primary font-mono select-none drop-shadow">
            👻
          </span>
        </span>
      )}

      {char}
    </span>
  );
});

export const WordViewport: React.FC<WordViewportProps> = ({
  engineChars,
  engineIndex,
  ghostIndex = 0,
  sessionState,
  gameMode,
  showGhostPacer = true,
  viewportMode = '3-line',
  onContainerClick,
  activeCharRef,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textStageRef = useRef<HTMLDivElement>(null);
  const translateYRef = useRef(0);
  const is3LineMode = viewportMode === '3-line';

  /**
   * Keep the active line locked to the middle row without re-rendering React.
   * The transform is written straight to the DOM node, and only when the active
   * LINE actually changes (not on every character), so a keystroke costs at most
   * one `offsetTop` read and one transform write — never an extra render pass.
   * `transform` is never part of the React `style` object, so React leaves the
   * imperatively written value untouched across renders.
   */
  useEffect(() => {
    const stage = textStageRef.current;
    const activeEl = activeCharRef?.current;

    if (!stage) return;

    if (!is3LineMode) {
      translateYRef.current = 0;
      stage.style.transform = 'none';
      const container = containerRef.current;
      if (container && activeEl) {
        container.scrollTop = Math.max(
          0,
          activeEl.offsetTop - container.clientHeight / 2 + LINE_HEIGHT
        );
      }
      return;
    }

    if (!activeEl) {
      translateYRef.current = 0;
      stage.style.transform = 'translate3d(0, 0, 0)';
      return;
    }

    const lineIndex = Math.floor((activeEl.offsetTop + 4) / LINE_HEIGHT);
    const nextY = lineIndex <= 1 ? 0 : -((lineIndex - 1) * LINE_HEIGHT);
    if (nextY === translateYRef.current) return;

    translateYRef.current = nextY;
    stage.style.transform = `translate3d(0, ${nextY}px, 0)`;
  }, [engineIndex, is3LineMode, activeCharRef]);

  // Group characters into words so words never break mid-token across lines.
  const wordTokens = useMemo(() => {
    const tokens: { chars: { charItem: CharState; index: number }[]; isSpace: boolean }[] = [];
    let currentWord: { charItem: CharState; index: number }[] = [];

    engineChars.forEach((charItem, index) => {
      if (charItem.char === ' ' || charItem.char === '\n') {
        if (currentWord.length > 0) {
          tokens.push({ chars: currentWord, isSpace: false });
          currentWord = [];
        }
        tokens.push({ chars: [{ charItem, index }], isSpace: true });
      } else {
        currentWord.push({ charItem, index });
      }
    });

    if (currentWord.length > 0) {
      tokens.push({ chars: currentWord, isSpace: false });
    }

    return tokens;
  }, [engineChars]);

  const showGhost = sessionState === 'playing' && gameMode === 'practice' && showGhostPacer !== false;

  return (
    <div
      ref={containerRef}
      onClick={onContainerClick}
      className={`w-full relative select-none rounded-2xl border border-border bg-surface transition-colors cursor-text focus-within:ring-2 focus-within:ring-accent/60 shadow-inner overflow-hidden ${
        is3LineMode
          ? 'h-[142px] pt-2.5 pb-2 px-5 sm:px-7 flex flex-col justify-start'
          : 'h-56 p-5 overflow-y-auto'
      }`}
      id="typing-text-canvas"
    >
      {/* Background line guide cues in 3-line mode */}
      {is3LineMode && (
        <div className="absolute inset-x-0 top-2.5 h-[120px] pointer-events-none flex flex-col justify-between opacity-10">
          <div className="w-full h-10 border-b border-dashed border-text-muted"></div>
          <div className="w-full h-10 border-b border-solid border-accent/40 bg-accent/5"></div>
          <div className="w-full h-10 border-b border-dashed border-text-muted"></div>
        </div>
      )}

      {/* Keystroke input capture injected as child */}
      {children}

      {/* Sliding text stage (transform is driven imperatively, see effect above) */}
      <div
        ref={textStageRef}
        style={{
          transition: is3LineMode ? 'transform 0.12s cubic-bezier(0.2, 0, 0, 1)' : 'none',
        }}
        className="text-xl font-mono leading-10 tracking-wider tabular-nums break-words flex flex-wrap items-baseline relative z-0 [font-variant-ligatures:none]"
      >
        {wordTokens.map((token) => {
          if (token.isSpace) {
            const { charItem, index } = token.chars[0];
            const isCurrent = index === engineIndex;
            const isIncorrect = charItem.status === 'incorrect';

            return (
              <span
                key={`space-${index}`}
                ref={isCurrent ? activeCharRef : undefined}
                className={`relative inline-block w-3 h-10 leading-10 text-center select-none align-baseline ${
                  isIncorrect ? 'bg-error-subtle rounded' : ''
                }`}
              >
                {isCurrent && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-accent shadow-glow-accent-sm animate-caret z-10"
                  />
                )}
                {showGhost && index === ghostIndex && !isCurrent && (
                  <span
                    aria-hidden="true"
                    title="Ghost PB Pacer"
                    className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-primary/90 shadow-glow-primary-sm pointer-events-none z-10"
                  />
                )}
                <span className={charItem.status === 'correct' ? 'text-text-subtle/30' : 'text-text-subtle/20'}>
                  &nbsp;
                </span>
              </span>
            );
          }

          // Deterministic, content-stable key: the absolute index of the word's first glyph.
          const firstIndex = token.chars[0].index;

          return (
            <span
              key={`word-${firstIndex}`}
              className="inline-flex whitespace-nowrap h-10 leading-10 items-baseline"
            >
              {token.chars.map(({ charItem, index }) => (
                <TypingChar
                  key={index}
                  char={charItem.char}
                  status={charItem.status}
                  isCurrent={index === engineIndex}
                  isGhost={showGhost && index === ghostIndex && index !== engineIndex}
                  activeCharRef={activeCharRef}
                />
              ))}
            </span>
          );
        })}
      </div>
    </div>
  );
};
