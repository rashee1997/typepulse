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
  'left-pinky': { border: 'border-rose-500/30', bg: 'bg-rose-500/10', text: 'text-rose-400', label: 'Left Pinky' },
  'left-ring': { border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Left Ring' },
  'left-middle': { border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Left Middle' },
  'left-index': { border: 'border-cyan-500/30', bg: 'bg-cyan-500/10', text: 'text-cyan-400', label: 'Left Index' },
  'thumb': { border: 'border-indigo-500/30', bg: 'bg-indigo-500/10', text: 'text-indigo-400', label: 'Thumb' },
  'right-index': { border: 'border-blue-500/30', bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Right Index' },
  'right-middle': { border: 'border-teal-500/30', bg: 'bg-teal-500/10', text: 'text-teal-400', label: 'Right Middle' },
  'right-ring': { border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Right Ring' },
  'right-pinky': { border: 'border-pink-500/30', bg: 'bg-pink-500/10', text: 'text-pink-400', label: 'Right Pinky' },
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
        <div className="w-full mb-3 p-3 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3 min-w-0">
            {/* Target key badge */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Target</span>
              <div className="min-w-8 h-8 px-2 rounded-lg bg-amber-400 text-slate-950 font-mono font-extrabold text-base flex items-center justify-center shadow-[0_0_12px_rgba(251,191,36,0.4)]">
                {targetChar === ' ' ? '␣ SPACE' : targetChar || '—'}
              </div>
            </div>

            {/* Assigned Finger & Coaching */}
            <div className="min-w-0 flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Use Finger:</span>
                {targetInfo ? (
                  <span className={cn('text-xs font-bold px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/80', targetInfo.color)}>
                    {targetInfo.finger}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">Home Row Rest</span>
                )}
                {targetInfo?.needsShift && (
                  <span className="text-[11px] font-bold text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/30">
                    Hold {targetInfo.shiftHand}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400 truncate mt-0.5">
                {getTechniqueHint()}
              </span>
            </div>
          </div>

          {/* Heatmap Error Toggle */}
          <button
            onClick={() => setInternalHeatmap((prev) => !prev)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-colors shrink-0 ${
              internalHeatmap
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
            }`}
            title="Toggle error frequency heatmap"
          >
            {internalHeatmap ? '🔥 Heatmap On' : 'Heatmap'}
          </button>
        </div>
      )}

      {/* Keyboard Bed */}
      <div className="p-2 sm:p-2.5 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-sm w-full max-w-full overflow-x-auto scrollbar-none">
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
                  if (errorCount >= 8) heatmapClass = 'bg-rose-600/30 border-rose-500';
                  else if (errorCount >= 4) heatmapClass = 'bg-amber-600/25 border-amber-500';
                  else heatmapClass = 'bg-yellow-600/15 border-yellow-500/50';
                }

                const fingerStyle = FINGER_COLOR_MAP[kDef.finger] || FINGER_COLOR_MAP['thumb'];

                return (
                  <div
                    key={kDef.key}
                    id={`key-${kDef.key.replace(/\s+/g, '_')}`}
                    className={cn(
                      'relative h-9 rounded-lg border text-xs font-mono flex flex-col items-center justify-center transition-all duration-75',
                      kDef.width || 'w-8 sm:w-9',
                      'bg-slate-800/80 border-slate-700/70 text-slate-300 shadow-sm',
                      fingerStyle.border,
                      // Target Key Glow
                      isTarget && 'bg-amber-400/25 border-amber-400 text-amber-200 shadow-[0_0_14px_rgba(251,191,36,0.6)] scale-105 z-10 font-bold',
                      // Pressed Key Animation
                      isActive && 'bg-emerald-500/35 border-emerald-400 text-emerald-200 scale-95',
                      heatmapClass
                    )}
                  >
                    {/* Bumps on F and J home row anchor keys */}
                    {(kDef.key === 'f' || kDef.key === 'j') && (
                      <span className="absolute bottom-1 w-2.5 h-0.5 bg-amber-400/80 rounded-full" />
                    )}

                    {/* Shift char label if dual character */}
                    {kDef.shiftChar && (
                      <span className="text-[9px] text-slate-500 leading-none">
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
      <div className="flex flex-wrap items-center justify-center gap-3 mt-2 text-[10px] text-slate-400 font-medium">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500/60 border border-rose-400" />
          <span>Pinky</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500/60 border border-amber-400" />
          <span>Ring</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500/60 border border-emerald-400" />
          <span>Middle</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-500/60 border border-cyan-400" />
          <span>Index</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-500/60 border border-indigo-400" />
          <span>Thumbs (Space)</span>
        </div>
      </div>
    </div>
  );
};
