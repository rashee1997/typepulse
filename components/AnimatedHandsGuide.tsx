'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type FingerType =
  | 'left-pinky'
  | 'left-ring'
  | 'left-middle'
  | 'left-index'
  | 'thumb'
  | 'right-index'
  | 'right-middle'
  | 'right-ring'
  | 'right-pinky';

export interface FingerReachOffset {
  dx: number;
  dy: number;
  directionLabel: string;
  homeKey: string;
  finger: FingerType;
  fingerLabel: string;
}

export const FINGER_REACH_MAP: Record<string, FingerReachOffset> = {
  // Left Pinky (Home: A)
  'a': { dx: 0, dy: 0, directionLabel: 'Home Anchor A', homeKey: 'A', finger: 'left-pinky', fingerLabel: 'Left Pinky' },
  'q': { dx: -4, dy: -22, directionLabel: 'Reach Up to Q', homeKey: 'A', finger: 'left-pinky', fingerLabel: 'Left Pinky' },
  'z': { dx: 2, dy: 16, directionLabel: 'Slide Down to Z', homeKey: 'A', finger: 'left-pinky', fingerLabel: 'Left Pinky' },
  '1': { dx: -6, dy: -32, directionLabel: 'Reach High to 1', homeKey: 'A', finger: 'left-pinky', fingerLabel: 'Left Pinky' },
  '`': { dx: -12, dy: -32, directionLabel: 'Reach High-Left to `', homeKey: 'A', finger: 'left-pinky', fingerLabel: 'Left Pinky' },

  // Left Ring (Home: S)
  's': { dx: 0, dy: 0, directionLabel: 'Home Anchor S', homeKey: 'S', finger: 'left-ring', fingerLabel: 'Left Ring' },
  'w': { dx: 0, dy: -22, directionLabel: 'Reach Up to W', homeKey: 'S', finger: 'left-ring', fingerLabel: 'Left Ring' },
  'x': { dx: 2, dy: 16, directionLabel: 'Slide Down to X', homeKey: 'S', finger: 'left-ring', fingerLabel: 'Left Ring' },
  '2': { dx: 0, dy: -32, directionLabel: 'Reach High to 2', homeKey: 'S', finger: 'left-ring', fingerLabel: 'Left Ring' },

  // Left Middle (Home: D)
  'd': { dx: 0, dy: 0, directionLabel: 'Home Anchor D', homeKey: 'D', finger: 'left-middle', fingerLabel: 'Left Middle' },
  'e': { dx: 0, dy: -22, directionLabel: 'Reach Up to E', homeKey: 'D', finger: 'left-middle', fingerLabel: 'Left Middle' },
  'c': { dx: 2, dy: 16, directionLabel: 'Slide Down to C', homeKey: 'D', finger: 'left-middle', fingerLabel: 'Left Middle' },
  '3': { dx: 0, dy: -32, directionLabel: 'Reach High to 3', homeKey: 'D', finger: 'left-middle', fingerLabel: 'Left Middle' },

  // Left Index (Home: F)
  'f': { dx: 0, dy: 0, directionLabel: 'Home Anchor F (Tactile Bump)', homeKey: 'F', finger: 'left-index', fingerLabel: 'Left Index' },
  'g': { dx: 15, dy: 0, directionLabel: 'Stretch Inward to G', homeKey: 'F', finger: 'left-index', fingerLabel: 'Left Index' },
  'r': { dx: 0, dy: -22, directionLabel: 'Reach Up to R', homeKey: 'F', finger: 'left-index', fingerLabel: 'Left Index' },
  't': { dx: 14, dy: -22, directionLabel: 'Reach Up-Inward to T', homeKey: 'F', finger: 'left-index', fingerLabel: 'Left Index' },
  'v': { dx: 2, dy: 16, directionLabel: 'Slide Down to V', homeKey: 'F', finger: 'left-index', fingerLabel: 'Left Index' },
  'b': { dx: 14, dy: 16, directionLabel: 'Slide Down-Inward to B', homeKey: 'F', finger: 'left-index', fingerLabel: 'Left Index' },
  '4': { dx: 0, dy: -32, directionLabel: 'Reach High to 4', homeKey: 'F', finger: 'left-index', fingerLabel: 'Left Index' },
  '5': { dx: 14, dy: -32, directionLabel: 'Reach High-Inward to 5', homeKey: 'F', finger: 'left-index', fingerLabel: 'Left Index' },

  // Thumbs (Home: Space)
  ' ': { dx: 0, dy: 6, directionLabel: 'Tap Space with Thumb', homeKey: '␣', finger: 'thumb', fingerLabel: 'Thumb' },

  // Right Index (Home: J)
  'j': { dx: 0, dy: 0, directionLabel: 'Home Anchor J (Tactile Bump)', homeKey: 'J', finger: 'right-index', fingerLabel: 'Right Index' },
  'h': { dx: -15, dy: 0, directionLabel: 'Stretch Inward to H', homeKey: 'J', finger: 'right-index', fingerLabel: 'Right Index' },
  'u': { dx: 0, dy: -22, directionLabel: 'Reach Up to U', homeKey: 'J', finger: 'right-index', fingerLabel: 'Right Index' },
  'y': { dx: -14, dy: -22, directionLabel: 'Reach Up-Inward to Y', homeKey: 'J', finger: 'right-index', fingerLabel: 'Right Index' },
  'm': { dx: 0, dy: 16, directionLabel: 'Slide Down to M', homeKey: 'J', finger: 'right-index', fingerLabel: 'Right Index' },
  'n': { dx: -14, dy: 16, directionLabel: 'Slide Down-Inward to N', homeKey: 'J', finger: 'right-index', fingerLabel: 'Right Index' },
  '7': { dx: 0, dy: -32, directionLabel: 'Reach High to 7', homeKey: 'J', finger: 'right-index', fingerLabel: 'Right Index' },
  '6': { dx: -14, dy: -32, directionLabel: 'Reach High-Inward to 6', homeKey: 'J', finger: 'right-index', fingerLabel: 'Right Index' },

  // Right Middle (Home: K)
  'k': { dx: 0, dy: 0, directionLabel: 'Home Anchor K', homeKey: 'K', finger: 'right-middle', fingerLabel: 'Right Middle' },
  'i': { dx: 0, dy: -22, directionLabel: 'Reach Up to I', homeKey: 'K', finger: 'right-middle', fingerLabel: 'Right Middle' },
  ',': { dx: -2, dy: 16, directionLabel: 'Slide Down to ,', homeKey: 'K', finger: 'right-middle', fingerLabel: 'Right Middle' },
  '8': { dx: 0, dy: -32, directionLabel: 'Reach High to 8', homeKey: 'K', finger: 'right-middle', fingerLabel: 'Right Middle' },

  // Right Ring (Home: L)
  'l': { dx: 0, dy: 0, directionLabel: 'Home Anchor L', homeKey: 'L', finger: 'right-ring', fingerLabel: 'Right Ring' },
  'o': { dx: 0, dy: -22, directionLabel: 'Reach Up to O', homeKey: 'L', finger: 'right-ring', fingerLabel: 'Right Ring' },
  '.': { dx: -2, dy: 16, directionLabel: 'Slide Down to .', homeKey: 'L', finger: 'right-ring', fingerLabel: 'Right Ring' },
  '9': { dx: 0, dy: -32, directionLabel: 'Reach High to 9', homeKey: 'L', finger: 'right-ring', fingerLabel: 'Right Ring' },

  // Right Pinky (Home: ;)
  ';': { dx: 0, dy: 0, directionLabel: 'Home Anchor ;', homeKey: ';', finger: 'right-pinky', fingerLabel: 'Right Pinky' },
  'p': { dx: 0, dy: -22, directionLabel: 'Reach Up to P', homeKey: ';', finger: 'right-pinky', fingerLabel: 'Right Pinky' },
  '/': { dx: -2, dy: 16, directionLabel: 'Slide Down to /', homeKey: ';', finger: 'right-pinky', fingerLabel: 'Right Pinky' },
  '\'': { dx: 14, dy: 0, directionLabel: 'Reach Outward to \'', homeKey: ';', finger: 'right-pinky', fingerLabel: 'Right Pinky' },
  '[': { dx: 14, dy: -22, directionLabel: 'Reach Outward to [', homeKey: ';', finger: 'right-pinky', fingerLabel: 'Right Pinky' },
  ']': { dx: 24, dy: -22, directionLabel: 'Reach Far Out to ]', homeKey: ';', finger: 'right-pinky', fingerLabel: 'Right Pinky' },
  '0': { dx: 0, dy: -32, directionLabel: 'Reach High to 0', homeKey: ';', finger: 'right-pinky', fingerLabel: 'Right Pinky' },
  '-': { dx: 12, dy: -32, directionLabel: 'Reach High to -', homeKey: ';', finger: 'right-pinky', fingerLabel: 'Right Pinky' },
  '=': { dx: 22, dy: -32, directionLabel: 'Reach High to =', homeKey: ';', finger: 'right-pinky', fingerLabel: 'Right Pinky' },
};

export const FINGER_PALETTE: Record<
  FingerType,
  {
    border: string;
    bg: string;
    text: string;
    glow: string;
    dot: string;
    activeText: string;
  }
> = {
  'left-pinky': {
    border: 'border-danger-border',
    bg: 'bg-danger-subtle',
    text: 'text-danger',
    glow: 'shadow-glow-danger-sm',
    dot: 'bg-danger',
    activeText: 'text-danger',
  },
  'left-ring': {
    border: 'border-warning-border',
    bg: 'bg-warning-subtle',
    text: 'text-warning',
    glow: 'shadow-glow-accent-sm',
    dot: 'bg-warning',
    activeText: 'text-warning',
  },
  'left-middle': {
    border: 'border-success-border',
    bg: 'bg-success-subtle',
    text: 'text-success',
    glow: 'shadow-glow-accent-sm',
    dot: 'bg-success',
    activeText: 'text-success',
  },
  'left-index': {
    border: 'border-info-border',
    bg: 'bg-info-subtle',
    text: 'text-info',
    glow: 'shadow-glow-accent-sm',
    dot: 'bg-info',
    activeText: 'text-info',
  },
  'thumb': {
    border: 'border-primary-border',
    bg: 'bg-primary-subtle',
    text: 'text-primary',
    glow: 'shadow-glow-primary-sm',
    dot: 'bg-primary',
    activeText: 'text-primary',
  },
  'right-index': {
    border: 'border-info-border',
    bg: 'bg-info-subtle',
    text: 'text-info',
    glow: 'shadow-glow-accent-sm',
    dot: 'bg-info',
    activeText: 'text-info',
  },
  'right-middle': {
    border: 'border-success-border',
    bg: 'bg-success-subtle',
    text: 'text-success',
    glow: 'shadow-glow-accent-sm',
    dot: 'bg-success',
    activeText: 'text-success',
  },
  'right-ring': {
    border: 'border-warning-border',
    bg: 'bg-warning-subtle',
    text: 'text-warning',
    glow: 'shadow-glow-accent-sm',
    dot: 'bg-warning',
    activeText: 'text-warning',
  },
  'right-pinky': {
    border: 'border-danger-border',
    bg: 'bg-danger-subtle',
    text: 'text-danger',
    glow: 'shadow-glow-danger-sm',
    dot: 'bg-danger',
    activeText: 'text-danger',
  },
};

interface AnimatedHandsGuideProps {
  targetChar?: string;
  activeKey?: string;
  className?: string;
}

export const AnimatedHandsGuide: React.FC<AnimatedHandsGuideProps> = ({
  targetChar = '',
  activeKey = '',
  className,
}) => {
  const normalizedChar = targetChar.toLowerCase();
  const reach = FINGER_REACH_MAP[normalizedChar] || {
    dx: 0,
    dy: 0,
    directionLabel: 'Home Row Resting Position',
    homeKey: '—',
    finger: (normalizedChar === ' ' ? 'thumb' : 'left-index') as FingerType,
    fingerLabel: normalizedChar === ' ' ? 'Thumb' : 'Anchor',
  };

  const activeFinger = targetChar ? reach.finger : null;
  const isTargetPressed =
    activeKey &&
    (activeKey.toLowerCase() === normalizedChar || (normalizedChar === ' ' && activeKey === ' '));

  // Finger definitions for visual rendering
  const leftFingers: { id: FingerType; name: string; home: string; baseHeight: number; x: number; hasRidge?: boolean }[] = [
    { id: 'left-pinky', name: 'Pinky', home: 'A', baseHeight: 62, x: 26 },
    { id: 'left-ring', name: 'Ring', home: 'S', baseHeight: 74, x: 54 },
    { id: 'left-middle', name: 'Middle', home: 'D', baseHeight: 84, x: 82 },
    { id: 'left-index', name: 'Index', home: 'F', baseHeight: 76, x: 110, hasRidge: true },
    { id: 'thumb', name: 'Thumb', home: '␣', baseHeight: 46, x: 140 },
  ];

  const rightFingers: { id: FingerType; name: string; home: string; baseHeight: number; x: number; hasRidge?: boolean }[] = [
    { id: 'thumb', name: 'Thumb', home: '␣', baseHeight: 46, x: 42 },
    { id: 'right-index', name: 'Index', home: 'J', baseHeight: 76, x: 72, hasRidge: true },
    { id: 'right-middle', name: 'Middle', home: 'K', baseHeight: 84, x: 100 },
    { id: 'right-ring', name: 'Ring', home: 'L', baseHeight: 74, x: 128 },
    { id: 'right-pinky', name: 'Pinky', home: ';', baseHeight: 62, x: 156 },
  ];

  return (
    <div
      className={cn(
        'w-full bg-surface border border-border rounded-2xl p-3.5 flex flex-col items-center shadow-card select-none relative overflow-hidden transition-all',
        className
      )}
      id="animated-hands-guide"
    >
      {/* Dynamic Instruction Banner */}
      <div className="w-full flex items-center justify-between pb-3 border-b border-border/70 mb-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
            Tactile Hand Motion Guide
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-text-primary">
            {targetChar ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="text-text-muted text-[11px]">Stroke:</span>
                <span className="font-bold text-accent px-1.5 py-0.5 rounded bg-accent-subtle border border-accent-border font-mono text-xs">
                  {targetChar === ' ' ? 'SPACE' : targetChar.toUpperCase()}
                </span>
                <span className="text-text-secondary text-xs">({reach.directionLabel})</span>
              </span>
            ) : (
              <span className="text-text-muted text-xs">Anchor fingers on Home Row (ASDF & JKL;)</span>
            )}
          </span>
        </div>
      </div>

      {/* Dual Hands Visual Canvas */}
      <div className="w-full max-w-lg grid grid-cols-2 gap-4 sm:gap-8 pt-1">
        {/* LEFT HAND */}
        <div className="flex flex-col items-center">
          <span className="text-[11px] font-bold text-text-muted mb-1 flex items-center gap-1">
            <span>Left Hand</span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 bg-surface-muted rounded text-text-subtle">A S D F</span>
          </span>

          <svg viewBox="0 0 170 145" className="w-full max-w-[190px] h-auto overflow-visible" aria-label="Left Hand Touch Typing Position">
            {/* Palm Base */}
            <path
              d="M 22 135 C 22 95, 30 78, 48 78 C 75 78, 105 78, 132 82 C 145 84, 155 105, 152 135 Z"
              className="fill-surface-muted stroke-border"
              strokeWidth="1.5"
            />

            {/* Left Fingers */}
            {leftFingers.map((f) => {
              const isActive = activeFinger === f.id;
              const palette = FINGER_PALETTE[f.id];
              const dx = isActive ? reach.dx : 0;
              const dy = isActive ? reach.dy : 0;
              const isPressed = isActive && isTargetPressed;

              return (
                <g
                  key={f.id}
                  style={{
                    transform: `translate(${dx}px, ${dy}px) ${isPressed ? 'scale(0.93)' : ''}`,
                    transformOrigin: `${f.x}px 115px`,
                    transition: 'transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                  className="cursor-default"
                >
                  {/* Motion Trajectory Indicator if Reaching */}
                  {isActive && (dx !== 0 || dy !== 0) && (
                    <line
                      x1={f.x}
                      y1={115 - f.baseHeight}
                      x2={f.x - dx}
                      y2={115 - f.baseHeight - dy}
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray="3 3"
                      className={cn(palette.text, 'opacity-70 animate-pulse')}
                    />
                  )}

                  {/* Finger Body */}
                  <rect
                    x={f.x - 9}
                    y={115 - f.baseHeight}
                    width={18}
                    height={f.baseHeight}
                    rx={9}
                    className={cn(
                      'transition-colors duration-150',
                      isActive
                        ? `${palette.bg} ${palette.border} stroke-[2]`
                        : 'fill-surface-hover stroke-border stroke-[1.2]'
                    )}
                  />

                  {/* Tactile Ridge on Index (F) */}
                  {f.hasRidge && (
                    <line
                      x1={f.x - 4}
                      y1={115 - f.baseHeight + 16}
                      x2={f.x + 4}
                      y2={115 - f.baseHeight + 16}
                      className={cn(isActive ? 'stroke-accent' : 'stroke-text-muted', 'stroke-[2]')}
                      strokeLinecap="round"
                    />
                  )}

                  {/* Fingertip Tap Beacon Glow when Active */}
                  {isActive && (
                    <circle
                      cx={f.x}
                      y={115 - f.baseHeight + 9}
                      r={11}
                      className={cn(palette.dot, 'opacity-25 animate-ping')}
                    />
                  )}

                  {/* Key Label on Fingertip */}
                  <circle
                    cx={f.x}
                    y={115 - f.baseHeight + 9}
                    r={8}
                    className={cn(
                      'transition-colors',
                      isActive
                        ? `${palette.dot} fill-current shadow-sm`
                        : 'fill-surface stroke-border stroke-[1]'
                    )}
                  />

                  <text
                    x={f.x}
                    y={115 - f.baseHeight + 12}
                    textAnchor="middle"
                    className={cn(
                      'text-[9px] font-mono font-bold select-none',
                      isActive ? 'fill-white' : 'fill-text-secondary'
                    )}
                  >
                    {isActive && targetChar && targetChar !== ' ' ? targetChar.toUpperCase() : f.home}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* RIGHT HAND */}
        <div className="flex flex-col items-center">
          <span className="text-[11px] font-bold text-text-muted mb-1 flex items-center gap-1">
            <span>Right Hand</span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 bg-surface-muted rounded text-text-subtle">J K L ;</span>
          </span>

          <svg viewBox="0 0 170 145" className="w-full max-w-[190px] h-auto overflow-visible" aria-label="Right Hand Touch Typing Position">
            {/* Palm Base */}
            <path
              d="M 18 135 C 15 105, 25 84, 38 82 C 65 78, 95 78, 122 78 C 140 78, 148 95, 148 135 Z"
              className="fill-surface-muted stroke-border"
              strokeWidth="1.5"
            />

            {/* Right Fingers */}
            {rightFingers.map((f) => {
              const isActive = activeFinger === f.id;
              const palette = FINGER_PALETTE[f.id];
              const dx = isActive ? reach.dx : 0;
              const dy = isActive ? reach.dy : 0;
              const isPressed = isActive && isTargetPressed;

              return (
                <g
                  key={f.id}
                  style={{
                    transform: `translate(${dx}px, ${dy}px) ${isPressed ? 'scale(0.93)' : ''}`,
                    transformOrigin: `${f.x}px 115px`,
                    transition: 'transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                  className="cursor-default"
                >
                  {/* Motion Trajectory Indicator if Reaching */}
                  {isActive && (dx !== 0 || dy !== 0) && (
                    <line
                      x1={f.x}
                      y1={115 - f.baseHeight}
                      x2={f.x - dx}
                      y2={115 - f.baseHeight - dy}
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray="3 3"
                      className={cn(palette.text, 'opacity-70 animate-pulse')}
                    />
                  )}

                  {/* Finger Body */}
                  <rect
                    x={f.x - 9}
                    y={115 - f.baseHeight}
                    width={18}
                    height={f.baseHeight}
                    rx={9}
                    className={cn(
                      'transition-colors duration-150',
                      isActive
                        ? `${palette.bg} ${palette.border} stroke-[2]`
                        : 'fill-surface-hover stroke-border stroke-[1.2]'
                    )}
                  />

                  {/* Tactile Ridge on Index (J) */}
                  {f.hasRidge && (
                    <line
                      x1={f.x - 4}
                      y1={115 - f.baseHeight + 16}
                      x2={f.x + 4}
                      y2={115 - f.baseHeight + 16}
                      className={cn(isActive ? 'stroke-accent' : 'stroke-text-muted', 'stroke-[2]')}
                      strokeLinecap="round"
                    />
                  )}

                  {/* Fingertip Tap Beacon Glow when Active */}
                  {isActive && (
                    <circle
                      cx={f.x}
                      y={115 - f.baseHeight + 9}
                      r={11}
                      className={cn(palette.dot, 'opacity-25 animate-ping')}
                    />
                  )}

                  {/* Key Label on Fingertip */}
                  <circle
                    cx={f.x}
                    y={115 - f.baseHeight + 9}
                    r={8}
                    className={cn(
                      'transition-colors',
                      isActive
                        ? `${palette.dot} fill-current shadow-sm`
                        : 'fill-surface stroke-border stroke-[1]'
                    )}
                  />

                  <text
                    x={f.x}
                    y={115 - f.baseHeight + 12}
                    textAnchor="middle"
                    className={cn(
                      'text-[9px] font-mono font-bold select-none',
                      isActive ? 'fill-white' : 'fill-text-secondary'
                    )}
                  >
                    {isActive && targetChar && targetChar !== ' ' ? targetChar.toUpperCase() : f.home}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Touch-Typing Golden Rule Footer */}
      <div className="w-full mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span>Keep non-typing fingers resting lightly on Home Row</span>
        </span>
        <span className="hidden sm:inline font-medium text-text-subtle">
          Feel F & J bumps • Return after each reach
        </span>
      </div>
    </div>
  );
};
