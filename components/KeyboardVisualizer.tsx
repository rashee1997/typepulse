'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { AnimatedHandsGuide } from './AnimatedHandsGuide';
import { FingerType, FINGER_REACH_MAP, getKeyFinger } from '@/lib/keyboard-geometry';
import { Hand, Sparkles } from 'lucide-react';

interface KeyboardVisualizerProps {
  targetChar?: string;
  activeKey?: string;
  showFingerGuide?: boolean;
  showHeatmap?: boolean;
  keyStats?: Record<string, { typed: number; errors: number }>;
  confidenceScores?: Record<string, number>;
  isBasicLesson?: boolean;
  activeLessonTitle?: string;
  showAnimatedHands?: boolean;
}

const MiniHandIndicator: React.FC<{
  finger: FingerType | null;
}> = ({ finger }) => {
  if (!finger) return null;
  const isLeft = finger.startsWith('left') || finger === 'thumb';
  const isRight = finger.startsWith('right');

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 bg-surface-muted rounded-xl border border-border shrink-0 shadow-inner"
      title={`Assigned finger: ${finger}`}
    >
      <svg viewBox="0 0 46 36" className="w-7 h-5 overflow-visible">
        {/* Palm Base */}
        <path
          d="M 8 34 C 8 20, 14 16, 23 16 C 32 16, 38 20, 38 34 Z"
          className="fill-surface-hover stroke-border"
          strokeWidth="1"
        />
        {/* Left Hand Fingers */}
        {isLeft && (
          <g>
            <rect
              x="4"
              y={finger === 'left-pinky' ? '7' : '12'}
              width="5"
              height={finger === 'left-pinky' ? '23' : '18'}
              rx="2.5"
              className={finger === 'left-pinky' ? 'fill-danger stroke-danger' : 'fill-surface stroke-border'}
            />
            <rect
              x="11"
              y={finger === 'left-ring' ? '4' : '9'}
              width="5"
              height={finger === 'left-ring' ? '26' : '21'}
              rx="2.5"
              className={finger === 'left-ring' ? 'fill-warning stroke-warning' : 'fill-surface stroke-border'}
            />
            <rect
              x="18"
              y={finger === 'left-middle' ? '1' : '6'}
              width="5"
              height={finger === 'left-middle' ? '29' : '24'}
              rx="2.5"
              className={finger === 'left-middle' ? 'fill-success stroke-success' : 'fill-surface stroke-border'}
            />
            <rect
              x="25"
              y={finger === 'left-index' ? '4' : '9'}
              width="5"
              height={finger === 'left-index' ? '26' : '21'}
              rx="2.5"
              className={finger === 'left-index' ? 'fill-info stroke-info' : 'fill-surface stroke-border'}
            />
            <rect
              x="32"
              y={finger === 'thumb' ? '16' : '20'}
              width="5"
              height={finger === 'thumb' ? '16' : '12'}
              rx="2.5"
              className={finger === 'thumb' ? 'fill-primary stroke-primary' : 'fill-surface stroke-border'}
            />
          </g>
        )}
        {/* Right Hand Fingers */}
        {isRight && (
          <g>
            <rect
              x="9"
              y={finger === 'thumb' ? '16' : '20'}
              width="5"
              height={finger === 'thumb' ? '16' : '12'}
              rx="2.5"
              className={finger === 'thumb' ? 'fill-primary stroke-primary' : 'fill-surface stroke-border'}
            />
            <rect
              x="16"
              y={finger === 'right-index' ? '4' : '9'}
              width="5"
              height={finger === 'right-index' ? '26' : '21'}
              rx="2.5"
              className={finger === 'right-index' ? 'fill-info stroke-info' : 'fill-surface stroke-border'}
            />
            <rect
              x="23"
              y={finger === 'right-middle' ? '1' : '6'}
              width="5"
              height={finger === 'right-middle' ? '29' : '24'}
              rx="2.5"
              className={finger === 'right-middle' ? 'fill-success stroke-success' : 'fill-surface stroke-border'}
            />
            <rect
              x="30"
              y={finger === 'right-ring' ? '4' : '9'}
              width="5"
              height={finger === 'right-ring' ? '26' : '21'}
              rx="2.5"
              className={finger === 'right-ring' ? 'fill-warning stroke-warning' : 'fill-surface stroke-border'}
            />
            <rect
              x="37"
              y={finger === 'right-pinky' ? '7' : '12'}
              width="5"
              height={finger === 'right-pinky' ? '23' : '18'}
              rx="2.5"
              className={finger === 'right-pinky' ? 'fill-danger stroke-danger' : 'fill-surface stroke-border'}
            />
          </g>
        )}
      </svg>
      <span className="text-[10px] font-extrabold uppercase tracking-tight text-text-primary">
        {finger.replace('left-', 'L-').replace('right-', 'R-')}
      </span>
    </div>
  );
};

interface KeyDef {
  key: string;
  display?: string;
  width?: string;
  finger: FingerType;
  shiftChar?: string;
}

const KEYBOARD_ROWS: KeyDef[][] = [
  // Row 1 (Numbers & Symbols)
  [
    { key: '`', shiftChar: '~', finger: 'left-pinky' },
    { key: '1', shiftChar: '!', finger: 'left-pinky' },
    { key: '2', shiftChar: '@', finger: 'left-ring' },
    { key: '3', shiftChar: '#', finger: 'left-middle' },
    { key: '4', shiftChar: '$', finger: 'left-index' },
    { key: '5', shiftChar: '%', finger: 'left-index' },
    { key: '6', shiftChar: '^', finger: 'right-index' },
    { key: '7', shiftChar: '&', finger: 'right-index' },
    { key: '8', shiftChar: '*', finger: 'right-middle' },
    { key: '9', shiftChar: '(', finger: 'right-ring' },
    { key: '0', shiftChar: ')', finger: 'right-pinky' },
    { key: '-', shiftChar: '_', finger: 'right-pinky' },
    { key: '=', shiftChar: '+', finger: 'right-pinky' },
    { key: 'Backspace', display: '⌫', width: 'w-14 sm:w-16', finger: 'right-pinky' },
  ],
  // Row 2 (Tab & QWERTY)
  [
    { key: 'Tab', display: 'Tab', width: 'w-12 sm:w-14', finger: 'left-pinky' },
    { key: 'q', shiftChar: 'Q', finger: 'left-pinky' },
    { key: 'w', shiftChar: 'W', finger: 'left-ring' },
    { key: 'e', shiftChar: 'E', finger: 'left-middle' },
    { key: 'r', shiftChar: 'R', finger: 'left-index' },
    { key: 't', shiftChar: 'T', finger: 'left-index' },
    { key: 'y', shiftChar: 'Y', finger: 'right-index' },
    { key: 'u', shiftChar: 'U', finger: 'right-index' },
    { key: 'i', shiftChar: 'I', finger: 'right-middle' },
    { key: 'o', shiftChar: 'O', finger: 'right-ring' },
    { key: 'p', shiftChar: 'P', finger: 'right-pinky' },
    { key: '[', shiftChar: '{', finger: 'right-pinky' },
    { key: ']', shiftChar: '}', finger: 'right-pinky' },
    { key: '\\', shiftChar: '|', width: 'w-10 sm:w-12', finger: 'right-pinky' },
  ],
  // Row 3 (Caps & Home Row)
  [
    { key: 'CapsLock', display: 'Caps', width: 'w-14 sm:w-16', finger: 'left-pinky' },
    { key: 'a', shiftChar: 'A', finger: 'left-pinky' },
    { key: 's', shiftChar: 'S', finger: 'left-ring' },
    { key: 'd', shiftChar: 'D', finger: 'left-middle' },
    { key: 'f', shiftChar: 'F', finger: 'left-index' },
    { key: 'g', shiftChar: 'G', finger: 'left-index' },
    { key: 'h', shiftChar: 'H', finger: 'right-index' },
    { key: 'j', shiftChar: 'J', finger: 'right-index' },
    { key: 'k', shiftChar: 'K', finger: 'right-middle' },
    { key: 'l', shiftChar: 'L', finger: 'right-ring' },
    { key: ';', shiftChar: ':', finger: 'right-pinky' },
    { key: "'", shiftChar: '"', finger: 'right-pinky' },
    { key: 'Enter', display: '↵ Enter', width: 'w-16 sm:w-20', finger: 'right-pinky' },
  ],
  // Row 4 (Left Shift & ZXCVBNM)
  [
    { key: 'ShiftLeft', display: '⇧ Shift', width: 'w-16 sm:w-20', finger: 'left-pinky' },
    { key: 'z', shiftChar: 'Z', finger: 'left-pinky' },
    { key: 'x', shiftChar: 'X', finger: 'left-ring' },
    { key: 'c', shiftChar: 'C', finger: 'left-middle' },
    { key: 'v', shiftChar: 'V', finger: 'left-index' },
    { key: 'b', shiftChar: 'B', finger: 'left-index' },
    { key: 'n', shiftChar: 'N', finger: 'right-index' },
    { key: 'm', shiftChar: 'M', finger: 'right-index' },
    { key: ',', shiftChar: '<', finger: 'right-middle' },
    { key: '.', shiftChar: '>', finger: 'right-ring' },
    { key: '/', shiftChar: '?', finger: 'right-pinky' },
    { key: 'ShiftRight', display: '⇧ Shift', width: 'w-16 sm:w-20', finger: 'right-pinky' },
  ],
  // Row 5 (Spacebar row)
  [
    { key: 'ControlLeft', display: 'Ctrl', width: 'w-12', finger: 'left-pinky' },
    { key: 'AltLeft', display: 'Alt', width: 'w-12', finger: 'left-thumb' as unknown as FingerType },
    { key: ' ', display: 'Space', width: 'flex-1 max-w-sm', finger: 'thumb' },
    { key: 'AltRight', display: 'Alt', width: 'w-12', finger: 'thumb' },
    { key: 'ControlRight', display: 'Ctrl', width: 'w-12', finger: 'right-pinky' },
  ],
];

// Keep finger assignment in sync with the shared keyboard geometry module (single source of truth);
// modifier/control keys absent from the geometry grid keep their explicit fallback above.
KEYBOARD_ROWS.forEach((row) => {
  row.forEach((keyDef) => {
    keyDef.finger = getKeyFinger(keyDef.key, keyDef.finger);
  });
});

const FINGER_COLOR_MAP: Record<FingerType, { border: string; bg: string; text: string; label: string }> = {
  'left-pinky': { border: 'border-danger-border', bg: 'bg-danger-subtle', text: 'text-danger', label: 'Left Pinky' },
  'left-ring': { border: 'border-warning-border', bg: 'bg-warning-subtle', text: 'text-warning', label: 'Left Ring' },
  'left-middle': { border: 'border-success-border', bg: 'bg-success-subtle', text: 'text-success', label: 'Left Middle' },
  'left-index': { border: 'border-info-border', bg: 'bg-info-subtle', text: 'text-info', label: 'Left Index' },
  'thumb': { border: 'border-primary-border', bg: 'bg-primary-subtle', text: 'text-primary', label: 'Thumb' },
  'right-index': { border: 'border-info-border', bg: 'bg-info-subtle', text: 'text-info', label: 'Right Index' },
  'right-middle': { border: 'border-success-border', bg: 'bg-success-subtle', text: 'text-success', label: 'Right Middle' },
  'right-ring': { border: 'border-warning-border', bg: 'bg-warning-subtle', text: 'text-warning', label: 'Right Ring' },
  'right-pinky': { border: 'border-danger-border', bg: 'bg-danger-subtle', text: 'text-danger', label: 'Right Pinky' },
};

export const KeyboardVisualizer: React.FC<KeyboardVisualizerProps> = ({
  targetChar = '',
  activeKey = '',
  showFingerGuide = true,
  showHeatmap = false,
  keyStats = {},
  confidenceScores = {},
  isBasicLesson = false,
  activeLessonTitle = '',
  showAnimatedHands = true,
}) => {
  // Determine if targetChar requires Shift
  const isShiftRequired = (char: string): boolean => {
    if (!char) return false;
    if (char >= 'A' && char <= 'Z') return true;
    return ['~', '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '{', '}', '|', ':', '"', '<', '>', '?'].includes(char);
  };

  const needsShift = isShiftRequired(targetChar);
  const normalizedChar = targetChar.toLowerCase();
  const reach = FINGER_REACH_MAP[normalizedChar] || null;

  // Find finger info for targetChar
  const getTargetFingerInfo = () => {
    if (!targetChar) return null;
    const lower = targetChar.toLowerCase();

    for (const row of KEYBOARD_ROWS) {
      for (const k of row) {
        if (k.key === lower || k.shiftChar === targetChar || (targetChar === ' ' && k.key === ' ')) {
          const fingerConfig = FINGER_COLOR_MAP[k.finger] || FINGER_COLOR_MAP['thumb'];
          return {
            key: k.display || k.key.toUpperCase(),
            finger: fingerConfig.label,
            fingerKey: k.finger,
            color: fingerConfig.text,
            needsShift,
            shiftHand: k.finger.startsWith('left') ? 'Right Shift' : 'Left Shift',
          };
        }
      }
    }
    return null;
  };

  const targetInfo = getTargetFingerInfo();
  const [heatmapMode, setHeatmapMode] = React.useState<'off' | 'errors' | 'confidence'>(
    showHeatmap ? 'errors' : 'off'
  );

  // Get intuitive coaching advice based on key/finger
  const getTechniqueHint = () => {
    if (!targetChar) return 'Rest fingers on home row (A S D F — J K L ;)';
    if (targetChar === ' ') return 'Tap with thumb without leaving the home keys';
    if (targetInfo?.needsShift) return `Use opposite hand for ${targetInfo.shiftHand}, then strike ${targetInfo.key}`;
    if (targetInfo?.key === 'F' || targetInfo?.key === 'J') return 'Home row anchor key — feel the tactile ridge on the key';
    return `Strike with ${targetInfo?.finger} and return to home row`;
  };

  return (
    <div className="w-full max-w-full overflow-hidden flex flex-col items-center select-none" id="keyboard-visualizer-container">
      {/* Eye-Level Live Finger Placement Cockpit */}
      {showFingerGuide && (
        <div className="w-full order-1 mb-3 p-3 bg-surface border border-border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-card">
          <div className="flex items-center gap-3 min-w-0">
            {/* Target key badge */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-text-subtle">Target</span>
              <div className="min-w-8 h-8 px-2 rounded-lg bg-accent text-accent-foreground font-mono font-extrabold text-base flex items-center justify-center shadow-glow-accent-sm">
                {targetChar === ' ' ? '␣ SPACE' : targetChar || '—'}
              </div>
            </div>

            {/* Visual Animated Mini-Hand Indicator instead of plain text */}
            <div className="flex items-center gap-2.5 min-w-0">
              <MiniHandIndicator finger={targetInfo?.fingerKey || null} />

              <div className="min-w-0 flex flex-col">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={cn('text-xs font-bold', targetInfo?.color || 'text-text-primary')}>
                    {targetInfo ? targetInfo.finger : 'Home Row Rest'}
                  </span>
                  {reach && reach.directionLabel && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-muted text-accent font-semibold border border-border">
                      {reach.directionLabel}
                    </span>
                  )}
                  {targetInfo?.needsShift && (
                    <span className="text-[10px] font-bold text-danger bg-danger-subtle px-1.5 py-0.5 rounded border border-danger-border">
                      Hold {targetInfo.shiftHand}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-text-muted truncate mt-0.5">
                  {getTechniqueHint()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {isBasicLesson && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-bold bg-accent-subtle text-accent border border-accent-border">
                <Sparkles className="w-3 h-3" />
                <span>Foundation Hands Mode</span>
              </span>
            )}

            {/* Confidence & Error Heatmap Toggles */}
            <div className="flex items-center bg-surface-muted p-0.5 rounded-xl border border-border text-[11px]">
              <button
                type="button"
                onClick={() => setHeatmapMode((prev) => (prev === 'errors' ? 'off' : 'errors'))}
                className={`px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  heatmapMode === 'errors'
                    ? 'bg-danger text-white shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
                title="Highlight keys with high mistake counts"
              >
                🔥 Errors
              </button>
              <button
                type="button"
                onClick={() => setHeatmapMode((prev) => (prev === 'confidence' ? 'off' : 'confidence'))}
                className={`px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  heatmapMode === 'confidence'
                    ? 'bg-accent text-accent-foreground shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
                title="Show Keybr-style key mastery confidence (speed + accuracy)"
              >
                🎯 Confidence
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Bed */}
      <div className="order-3 lg:order-2 p-2 sm:p-2.5 bg-surface rounded-2xl border border-border shadow-card backdrop-blur-sm w-full max-w-full overflow-x-auto scrollbar-none">
        <div className="flex flex-col gap-1 min-w-[560px]">
          {KEYBOARD_ROWS.map((row, rIdx) => (
            <div key={rIdx} className="flex justify-center gap-1">
              {row.map((kDef) => {
                const isTarget =
                  (targetChar &&
                    (kDef.key === targetChar.toLowerCase() ||
                      kDef.shiftChar === targetChar ||
                      (targetChar === ' ' && kDef.key === ' '))) ||
                  (needsShift &&
                    ((kDef.key === 'ShiftRight' && targetInfo?.shiftHand === 'Right Shift') ||
                      (kDef.key === 'ShiftLeft' && targetInfo?.shiftHand === 'Left Shift')));

                const isActive = activeKey && (kDef.key.toLowerCase() === activeKey.toLowerCase() || (activeKey === ' ' && kDef.key === ' '));

                // Heatmap error coloring
                const errorCount = keyStats[kDef.key]?.errors || 0;
                let heatmapClass = '';
                if (heatmapMode === 'errors' && errorCount > 0) {
                  if (errorCount >= 8) heatmapClass = 'bg-danger-subtle border-danger text-danger font-bold';
                  else if (errorCount >= 4) heatmapClass = 'bg-warning-subtle border-warning text-warning';
                  else heatmapClass = 'bg-accent-subtle border-accent-border text-accent';
                } else if (heatmapMode === 'confidence') {
                  const conf = confidenceScores ? confidenceScores[kDef.key.toLowerCase()] : undefined;
                  if (conf !== undefined) {
                    if (conf >= 0.85) heatmapClass = 'bg-success-subtle/80 border-success/60 text-success';
                    else if (conf >= 0.6) heatmapClass = 'bg-warning-subtle/80 border-warning/60 text-warning';
                    else heatmapClass = 'bg-danger-subtle/80 border-danger/60 text-danger font-bold';
                  }
                }

                const fingerStyle = FINGER_COLOR_MAP[kDef.finger] || FINGER_COLOR_MAP['thumb'];
                const confScore = confidenceScores ? confidenceScores[kDef.key.toLowerCase()] : undefined;

                return (
                  <div
                    key={kDef.key}
                    id={`key-${kDef.key.replace(/\s+/g, '_')}`}
                    className={cn(
                      'relative h-9 rounded-lg border text-xs font-mono flex flex-col items-center justify-center transition-all duration-75',
                      kDef.width || 'w-8 sm:w-9',
                      'bg-surface-muted border-border text-text-secondary shadow-sm',
                      fingerStyle.border,
                      // Target Key Glow
                      isTarget && 'bg-accent-subtle border-accent text-accent shadow-glow-accent-sm scale-105 z-10 font-bold',
                      // Pressed Key Animation
                      isActive && 'bg-success-subtle border-success text-success scale-95',
                      heatmapClass
                    )}
                  >
                    {/* Keybr Confidence Badge */}
                    {heatmapMode === 'confidence' && confScore !== undefined && (
                      <span className="absolute -top-1.5 right-0.5 px-1 py-0 rounded text-[7px] font-mono font-bold bg-surface border border-border leading-tight">
                        {Math.round(confScore * 100)}%
                      </span>
                    )}

                    {/* Animated Finger Pointer in Basic Lessons */}
                    {isBasicLesson && isTarget && targetInfo && (
                      <span className="absolute -top-3.5 px-1 py-0.2 rounded-full text-[8px] bg-accent text-accent-foreground font-extrabold uppercase shadow-glow-accent-sm animate-bounce z-20 whitespace-nowrap">
                        {targetInfo.finger.replace('Left ', 'L-').replace('Right ', 'R-')}
                      </span>
                    )}

                    {/* Bumps on F and J home row anchor keys */}
                    {(kDef.key === 'f' || kDef.key === 'j') && (
                      <span className="absolute bottom-1 w-2.5 h-0.5 bg-accent rounded-full" />
                    )}

                    {/* Shift char label if dual character */}
                    {kDef.shiftChar && (
                      <span className="text-[9px] text-text-subtle leading-none">
                        {kDef.shiftChar}
                      </span>
                    )}

                    <span className="leading-none font-medium">
                      {kDef.display || kDef.key.toUpperCase()}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* VISUAL ANIMATED HANDS - Active strictly for basic lessons. Ordered before the keyboard bed
          on mobile so the hand cue stays pinned near the typing stage within the primary viewport. */}
      {isBasicLesson && showAnimatedHands !== false && (
        <div className="w-full order-2 lg:order-3 mt-3 animate-fadeIn">
          <AnimatedHandsGuide
            targetChar={targetChar}
            activeKey={activeKey}
          />
        </div>
      )}

      {/* Subtle Finger Zone Legend - Shown when hands guide is not active */}
      {(!isBasicLesson || showAnimatedHands === false) && (
        <div className="order-4 flex flex-wrap items-center justify-center gap-3 mt-2 text-[10px] text-text-muted font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-danger-subtle border border-danger-border" />
            <span>Pinky</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-warning-subtle border border-warning-border" />
            <span>Ring</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success-subtle border border-success-border" />
            <span>Middle</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-info-subtle border border-info-border" />
            <span>Index</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary-subtle border border-primary-border" />
            <span>Thumbs (Space)</span>
          </div>
        </div>
      )}
    </div>
  );
};
