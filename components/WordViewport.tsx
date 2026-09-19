'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
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
  const [translateY, setTranslateY] = useState<number>(0);
  const is3LineMode = viewportMode === '3-line';

  // Track active line vertical offset to keep active line centered on line 2 (of 3)
  useEffect(() => {
    if (!is3LineMode || !activeCharRef?.current || !textStageRef.current) {
      setTranslateY(0);
      return;
    }

    const activeEl = activeCharRef.current;
    const stageEl = textStageRef.current;

    // Relative vertical position of active character inside text stage
    const activeTop = activeEl.offsetTop - stageEl.offsetTop;
    const charHeight = activeEl.offsetHeight || 36;

    // Line 0: top < charHeight * 1.2 -> translateY = 0
    // Line 1: charHeight * 1.2 <= top < charHeight * 2.2 -> translateY = 0 (middle line)
    // Line 2+: top >= charHeight * 2.2 -> shift stage upwards by (lineIndex - 1) * lineHeight
    const lineIndex = Math.floor(activeTop / Math.max(28, charHeight));

    if (lineIndex <= 1) {
      setTranslateY(0);
    } else {
      // Keep active line as line 2 (centered in 3-line view)
      const shift = (lineIndex - 1) * charHeight;
      setTranslateY(-shift);
    }
  }, [engineIndex, is3LineMode, activeCharRef]);

  // Group characters into words for smoother semantic word layout and hyphenation prevention
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

  return (
    <div
      ref={containerRef}
      onClick={onContainerClick}
      className={`w-full relative select-none rounded-2xl border border-border bg-surface transition-colors cursor-text focus-within:ring-2 focus-within:ring-accent/60 shadow-inner overflow-hidden ${
        is3LineMode ? 'h-40 py-4 px-6 flex flex-col justify-center' : 'h-56 p-5 overflow-y-auto'
      }`}
      id="typing-text-canvas"
    >
      {/* Background line guide cues in 3-line mode */}
      {is3LineMode && (
        <div className="absolute inset-x-0 inset-y-3 pointer-events-none flex flex-col justify-between opacity-15">
          <div className="w-full border-b border-dashed border-text-muted"></div>
          <div className="w-full border-b border-solid border-accent/40 bg-accent/5 h-10 rounded"></div>
          <div className="w-full border-b border-dashed border-text-muted"></div>
        </div>
      )}

      {/* Keystroke input capture injected as child */}
      {children}

      {/* Sliding text stage */}
      <div
        ref={textStageRef}
        style={{
          transform: is3LineMode ? `translateY(${translateY}px)` : 'none',
          transition: is3LineMode ? 'transform 0.14s cubic-bezier(0.2, 0, 0, 1)' : 'none',
        }}
        className="text-xl font-mono leading-relaxed tracking-wider break-words flex flex-wrap items-baseline gap-y-1 relative"
      >
        {wordTokens.map((token, tokenIdx) => {
          if (token.isSpace) {
            const { charItem, index } = token.chars[0];
            const isCurrent = index === engineIndex;
            const isCorrect = charItem.status === 'correct';
            const isIncorrect = charItem.status === 'incorrect';
            const isGhost =
              sessionState === 'playing' &&
              gameMode === 'practice' &&
              showGhostPacer !== false &&
              index === ghostIndex &&
              index !== engineIndex;

            return (
              <span
                key={`space-${index}`}
                ref={isCurrent ? activeCharRef : undefined}
                className="relative inline-block w-2.5 h-6 text-center select-none"
              >
                {/* Blinking Caret on Space */}
                {isCurrent && (
                  <span className="absolute left-0 top-0.5 bottom-0.5 w-0.5 bg-accent animate-pulse rounded-full shadow-glow-accent-sm" />
                )}

                {/* Ghost Pacer on Space */}
                {isGhost && (
                  <span
                    className="absolute left-0 top-0.5 bottom-0.5 w-0.5 bg-primary/90 rounded-full shadow-glow-primary-sm pointer-events-none z-10"
                    title="Ghost PB Pacer"
                  >
                    <span className="absolute -top-3.5 -left-1.5 text-[9px] text-primary font-mono select-none drop-shadow">
                      👻
                    </span>
                  </span>
                )}

                <span
                  className={
                    isIncorrect
                      ? 'bg-error/30 text-error rounded px-0.5 font-bold'
                      : isCorrect
                      ? 'text-text-subtle/40'
                      : 'text-text-subtle/30'
                  }
                >
                  &nbsp;
                </span>
              </span>
            );
          }

          return (
            <span key={`word-${tokenIdx}`} className="inline-flex whitespace-nowrap">
              {token.chars.map(({ charItem, index }) => {
                const isCurrent = index === engineIndex;
                const isCorrect = charItem.status === 'correct';
                const isIncorrect = charItem.status === 'incorrect';
                const isCorrected = charItem.status === 'corrected';
                const isGhost =
                  sessionState === 'playing' &&
                  gameMode === 'practice' &&
                  showGhostPacer !== false &&
                  index === ghostIndex &&
                  index !== engineIndex;

                return (
                  <span
                    key={index}
                    ref={isCurrent ? activeCharRef : undefined}
                    className={`relative transition-colors duration-75 ${
                      isCorrect
                        ? 'text-text-primary font-medium'
                        : isIncorrect
                        ? 'text-error underline decoration-error decoration-2 font-bold bg-error-subtle rounded'
                        : isCorrected
                        ? 'text-accent font-medium'
                        : isCurrent
                        ? 'text-accent font-bold'
                        : 'text-text-subtle'
                    }`}
                  >
                    {/* Caret */}
                    {isCurrent && (
                      <span className="absolute -left-0.5 top-0 bottom-0 w-0.5 bg-accent animate-pulse rounded-full shadow-glow-accent-sm" />
                    )}

                    {/* Ghost Pacer Caret */}
                    {isGhost && (
                      <span
                        className="absolute -left-0.5 top-0 bottom-0 w-0.5 bg-primary/90 rounded-full shadow-glow-primary-sm pointer-events-none z-10"
                        title="Ghost PB Pacer"
                      >
                        <span className="absolute -top-3.5 -left-1.5 text-[9px] text-primary font-mono select-none drop-shadow">
                          👻
                        </span>
                      </span>
                    )}

                    {charItem.char}
                  </span>
                );
              })}
            </span>
          );
        })}
      </div>
    </div>
  );
};
