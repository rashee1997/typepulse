'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface KeyboardVisualizerProps {
  targetChar?: string;
  activeKey?: string;
  showFingerGuide?: boolean;
  showHeatmap?: boolean;
  keyStats?: Record<string, { typed: number; errors: number }>;
}

type FingerType = 'left-pinky' | 'left-ring' | 'left-middle' | 'left-index' | 'thumb' | 'right-index' | 'right-middle' | 'right-ring' | 'right-pinky';

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
}) => {
  // Determine if targetChar requires Shift
  const isShiftRequired = (char: string): boolean => {
    if (!char) return false;
    if (char >= 'A' && char <= 'Z') return true;
    return ['~', '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '{', '}', '|', ':', '"', '<', '>', '?'].includes(char);
  };

  const needsShift = isShiftRequired(targetChar);

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
  const [internalHeatmap, setInternalHeatmap] = React.useState(showHeatmap || false);

  // Get intuitive coaching advice based on key/finger
  const getTechniqueHint = () => {
    if (!targetChar) return 'Rest fingers on home row (A S D F — J K L ;)';
    if (targetChar === ' ') return 'Tap with right or left thumb without leaving the home keys';
    if (targetInfo?.needsShift) return `Use opposite hand for ${targetInfo.shiftHand}, then strike ${targetInfo.key}`;
    if (targetInfo?.key === 'F' || targetInfo?.key === 'J') return 'Home row anchor key — feel the tactile ridge on the key';
    return `Strike with ${targetInfo?.finger} and return to home row`;
  };

  return (
    <div className="w-full max-w-full overflow-hidden flex flex-col items-center select-none" id="keyboard-visualizer-container">
      {/* Eye-Level Live Finger Placement Cockpit */}
      {showFingerGuide && (
        <div className="w-full mb-3 p-3 bg-surface border border-border rounded-2xl flex items-center justify-between gap-3 shadow-card">
          <div className="flex items-center gap-3 min-w-0">
            {/* Target key badge */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-text-subtle">Target</span>
              <div className="min-w-8 h-8 px-2 rounded-lg bg-accent text-accent-foreground font-mono font-extrabold text-base flex items-center justify-center shadow-glow-accent-sm">
                {targetChar === ' ' ? '␣ SPACE' : targetChar || '—'}
              </div>
            </div>

            {/* Assigned Finger & Coaching */}
            <div className="min-w-0 flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted font-medium">Use Finger:</span>
                {targetInfo ? (
                  <span className={cn('text-xs font-bold px-2 py-0.5 rounded-md bg-surface-muted border border-border', targetInfo.color)}>
                    {targetInfo.finger}
                  </span>
                ) : (
                  <span className="text-xs text-text-muted">Home Row Rest</span>
                )}
                {targetInfo?.needsShift && (
                  <span className="text-[11px] font-bold text-danger bg-danger-subtle px-2 py-0.5 rounded border border-danger-border">
                    Hold {targetInfo.shiftHand}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-text-muted truncate mt-0.5">
                {getTechniqueHint()}
              </span>
            </div>
          </div>

          {/* Heatmap Error Toggle */}
          <button
            onClick={() => setInternalHeatmap((prev) => !prev)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-colors shrink-0 ${
              internalHeatmap
                ? 'bg-danger-subtle text-danger border border-danger-border'
                : 'bg-surface-hover text-text-muted hover:text-text-primary border border-border'
            }`}
            title="Toggle error frequency heatmap"
          >
            {internalHeatmap ? '🔥 Heatmap On' : 'Heatmap'}
          </button>
        </div>
      )}

      {/* Keyboard Bed */}
      <div className="p-2 sm:p-2.5 bg-surface rounded-2xl border border-border shadow-card backdrop-blur-sm w-full max-w-full overflow-x-auto scrollbar-none">
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
                if (internalHeatmap && errorCount > 0) {
                  if (errorCount >= 8) heatmapClass = 'bg-danger-subtle border-danger text-danger';
                  else if (errorCount >= 4) heatmapClass = 'bg-warning-subtle border-warning text-warning';
                  else heatmapClass = 'bg-accent-subtle border-accent-border text-accent';
                }

                const fingerStyle = FINGER_COLOR_MAP[kDef.finger] || FINGER_COLOR_MAP['thumb'];

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

      {/* Subtle Finger Zone Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-2 text-[10px] text-text-muted font-medium">
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
    </div>
  );
};
