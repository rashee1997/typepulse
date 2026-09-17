'use client';

import React from 'react';
import { motion, useReducedMotion, type Transition } from 'motion/react';
import { cn } from '@/lib/utils';
import {
  FingerType,
  FingerReachOffset,
  FINGER_REACH_MAP,
  KEY_GRID_UNIT_X,
} from '@/lib/keyboard-geometry';

export type { FingerType };
export { FINGER_REACH_MAP };

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
  thumb: {
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
  /** Beginner-tier extra cues (dashed trajectory + pulsing beacon). Off by default to keep the guide calm. */
  showTrajectoryHints?: boolean;
}

/** Joint rotation pose for a single finger, derived from its reach target instead of a translate offset. */
interface FingerPose {
  mcpAngle: number; // knuckle (MCP) rotation, degrees
  pipCurl: number; // proximal interphalangeal flex, degrees
  dipCurl: number; // distal interphalangeal flex, degrees
}

const REST_PIP = 9;
const REST_DIP = 6;
const ANGLE_PER_LANE = 6.5; // degrees of knuckle rotation per horizontal key-lane
const CURL_PER_DY = 0.5; // degrees of joint flex per px of row displacement
const PRESS_PIP = 16;
const PRESS_DIP = 11;

function computeFingerPose(finger: FingerType, reach: FingerReachOffset, isPressed: boolean): FingerPose {
  if (finger === 'thumb') {
    return {
      mcpAngle: 0,
      pipCurl: isPressed ? REST_PIP + PRESS_PIP : REST_PIP,
      dipCurl: isPressed ? REST_DIP + PRESS_DIP : REST_DIP,
    };
  }

  const maxAngle = finger.endsWith('pinky') ? 30 : 26;
  const mcpAngle = Math.max(-maxAngle, Math.min(maxAngle, (reach.dx / KEY_GRID_UNIT_X) * ANGLE_PER_LANE));

  let pipCurl = Math.max(-10, Math.min(24, REST_PIP + reach.dy * CURL_PER_DY));
  let dipCurl = Math.max(-6, Math.min(16, REST_DIP + reach.dy * CURL_PER_DY * 0.65));

  if (isPressed) {
    pipCurl += PRESS_PIP;
    dipCurl += PRESS_DIP;
  }

  return { mcpAngle, pipCurl, dipCurl };
}

/** Differentiated spring authority per finger, and softer/slower springs for multi-row reaches. */
function getFingerTransition(finger: FingerType, magnitude: number, reducedMotion: boolean): Transition {
  if (reducedMotion) return { duration: 0 };

  const isLongReach = magnitude > 24;
  const isPinky = finger.endsWith('pinky');
  const isAuthority = finger === 'thumb' || finger.endsWith('index');

  if (isPinky) {
    return {
      type: 'spring',
      stiffness: isLongReach ? 260 : 460,
      damping: isLongReach ? 18 : 22,
      mass: 0.35,
    };
  }

  if (isAuthority) {
    return {
      type: 'spring',
      stiffness: isLongReach ? 220 : 300,
      damping: isLongReach ? 28 : 32,
      mass: 0.9,
    };
  }

  return {
    type: 'spring',
    stiffness: isLongReach ? 240 : 360,
    damping: isLongReach ? 22 : 24,
    mass: 0.55,
  };
}

interface FingerDef {
  id: FingerType;
  name: string;
  home: string;
  baseLength: number;
  x: number;
  hasRidge?: boolean;
}

const LEFT_FINGERS: FingerDef[] = [
  { id: 'left-pinky', name: 'Pinky', home: 'A', baseLength: 62, x: 26 },
  { id: 'left-ring', name: 'Ring', home: 'S', baseLength: 74, x: 54 },
  { id: 'left-middle', name: 'Middle', home: 'D', baseLength: 84, x: 82 },
  { id: 'left-index', name: 'Index', home: 'F', baseLength: 76, x: 110, hasRidge: true },
  { id: 'thumb', name: 'Thumb', home: '␣', baseLength: 42, x: 140 },
];

const RIGHT_FINGERS: FingerDef[] = [
  { id: 'thumb', name: 'Thumb', home: '␣', baseLength: 42, x: 42 },
  { id: 'right-index', name: 'Index', home: 'J', baseLength: 76, x: 72, hasRidge: true },
  { id: 'right-middle', name: 'Middle', home: 'K', baseLength: 84, x: 100 },
  { id: 'right-ring', name: 'Ring', home: 'L', baseLength: 74, x: 128 },
  { id: 'right-pinky', name: 'Pinky', home: ';', baseLength: 62, x: 156 },
];

const PALM_Y = 115;

const IDLE_BREATH_KEYFRAMES = [0, 1, 0, -1, 0];

interface JointedFingerProps {
  f: FingerDef;
  hand: 'left' | 'right';
  isActive: boolean;
  isPressed: boolean;
  reach: FingerReachOffset;
  targetChar: string;
  reducedMotion: boolean;
  showTrajectoryHints: boolean;
  idlePhase: number;
}

const JointedFinger: React.FC<JointedFingerProps> = ({
  f,
  hand,
  isActive,
  isPressed,
  reach,
  targetChar,
  reducedMotion,
  showTrajectoryHints,
  idlePhase,
}) => {
  const palette = FINGER_PALETTE[f.id];
  const isThumb = f.id === 'thumb';
  const pose = computeFingerPose(f.id, reach, isPressed);
  const magnitude = Math.hypot(reach.dx, reach.dy);
  const transition = getFingerTransition(f.id, magnitude, reducedMotion);

  // Thumbs sit at a natural opposition angle rather than parallel to the fingers.
  const thumbBaseAngle = hand === 'left' ? 30 : -30;
  const mcpTarget = isThumb ? thumbBaseAngle : isActive ? pose.mcpAngle : 0;

  const proximalLen = isThumb ? f.baseLength * 0.55 : f.baseLength * 0.42;
  const intermediateLen = isThumb ? f.baseLength * 0.45 : f.baseLength * 0.33;
  const distalLen = f.baseLength * 0.25;

  const width = isThumb ? 20 : 17;
  const distalWidth = isThumb ? 17 : 13;

  const pipPivotY = PALM_Y - proximalLen;
  const dipPivotY = pipPivotY - intermediateLen;

  const idleAnimate =
    !isActive && !reducedMotion
      ? { rotate: IDLE_BREATH_KEYFRAMES.map((v) => v + mcpTarget) }
      : { rotate: mcpTarget };
  const idleTransition =
    !isActive && !reducedMotion
      ? { duration: 3.6 + idlePhase * 0.35, repeat: Infinity, ease: 'easeInOut' as const }
      : transition;

  return (
    <motion.g
      style={{ transformOrigin: `${f.x}px ${PALM_Y}px` }}
      animate={idleAnimate}
      transition={idleTransition}
      className="cursor-default"
    >
      {/* Trajectory hint - beginner-tier only, off by default to keep the guide calm */}
      {showTrajectoryHints && isActive && (reach.dx !== 0 || reach.dy !== 0) && (
        <line
          x1={f.x}
          y1={PALM_Y - f.baseLength}
          x2={f.x - reach.dx}
          y2={PALM_Y - f.baseLength - reach.dy}
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="3 3"
          className={cn(palette.text, 'opacity-60')}
        />
      )}

      {/* Proximal phalanx - rotates at the knuckle (MCP) pivot */}
      <>
        <rect
          x={f.x - width / 2}
          y={PALM_Y - proximalLen}
          width={width}
          height={proximalLen}
          rx={width / 2}
          className={cn(
            'transition-colors duration-150',
            isActive ? `${palette.bg} ${palette.border} stroke-[2]` : 'fill-surface-hover stroke-border stroke-[1.2]'
          )}
        />

        {/* Intermediate + Distal phalanx group - rotates at the PIP pivot, nested inside the MCP chain */}
        <motion.g
          style={{ transformOrigin: `${f.x}px ${pipPivotY}px` }}
          animate={{ rotate: isActive || isThumb ? pose.pipCurl : REST_PIP }}
          transition={transition}
        >
          <rect
            x={f.x - width / 2 + 1}
            y={pipPivotY - intermediateLen}
            width={width - 2}
            height={intermediateLen}
            rx={(width - 2) / 2}
            className={cn(
              'transition-colors duration-150',
              isActive ? `${palette.bg} ${palette.border} stroke-[1.5]` : 'fill-surface-hover stroke-border stroke-[1]'
            )}
          />

          {/* Tactile ridge on the home-row anchor finger (F / J) */}
          {f.hasRidge && (
            <line
              x1={f.x - 4}
              y1={pipPivotY - intermediateLen + 10}
              x2={f.x + 4}
              y2={pipPivotY - intermediateLen + 10}
              className={cn(isActive ? 'stroke-accent' : 'stroke-text-muted', 'stroke-[2]')}
              strokeLinecap="round"
            />
          )}

          {/* Distal phalanx - rotates at the DIP pivot */}
          <motion.g
            style={{ transformOrigin: `${f.x}px ${dipPivotY}px` }}
            animate={{ rotate: isActive || isThumb ? pose.dipCurl : REST_DIP }}
            transition={transition}
          >
            <rect
              x={f.x - distalWidth / 2}
              y={dipPivotY - distalLen}
              width={distalWidth}
              height={distalLen}
              rx={distalWidth / 2}
              className={cn(
                'transition-colors duration-150',
                isActive ? `${palette.bg} ${palette.border} stroke-[1.5]` : 'fill-surface-hover stroke-border stroke-[1]'
              )}
            />

            {/* Fingertip highlight - the single primary active-state cue */}
            <circle
              cx={f.x}
              cy={dipPivotY - distalLen + 8}
              r={8}
              className={cn(
                'transition-colors',
                isActive ? `${palette.dot} fill-current shadow-sm` : 'fill-surface stroke-border stroke-[1]'
              )}
            />

            <text
              x={f.x}
              y={dipPivotY - distalLen + 11}
              textAnchor="middle"
              className={cn(
                'text-[9px] font-mono font-bold select-none',
                isActive ? 'fill-white' : 'fill-text-secondary'
              )}
            >
              {isActive && targetChar && targetChar !== ' ' ? targetChar.toUpperCase() : f.home}
            </text>
          </motion.g>
        </motion.g>
      </>
    </motion.g>
  );
};

export const AnimatedHandsGuide: React.FC<AnimatedHandsGuideProps> = ({
  targetChar = '',
  activeKey = '',
  className,
  showTrajectoryHints = false,
}) => {
  const reducedMotion = useReducedMotion() ?? false;
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
  const isTargetPressed = Boolean(
    activeKey && (activeKey.toLowerCase() === normalizedChar || (normalizedChar === ' ' && activeKey === ' '))
  );

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
            {!reducedMotion && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            )}
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
            <path
              d="M 22 135 C 22 95, 30 78, 48 78 C 75 78, 105 78, 132 82 C 145 84, 155 105, 152 135 Z"
              className="fill-surface-muted stroke-border"
              strokeWidth="1.5"
            />

            {LEFT_FINGERS.map((f, i) => (
              <JointedFinger
                key={f.id}
                f={f}
                hand="left"
                isActive={activeFinger === f.id}
                isPressed={activeFinger === f.id && isTargetPressed}
                reach={reach}
                targetChar={targetChar}
                reducedMotion={reducedMotion}
                showTrajectoryHints={showTrajectoryHints}
                idlePhase={i}
              />
            ))}
          </svg>
        </div>

        {/* RIGHT HAND */}
        <div className="flex flex-col items-center">
          <span className="text-[11px] font-bold text-text-muted mb-1 flex items-center gap-1">
            <span>Right Hand</span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 bg-surface-muted rounded text-text-subtle">J K L ;</span>
          </span>

          <svg viewBox="0 0 170 145" className="w-full max-w-[190px] h-auto overflow-visible" aria-label="Right Hand Touch Typing Position">
            <path
              d="M 18 135 C 15 105, 25 84, 38 82 C 65 78, 95 78, 122 78 C 140 78, 148 95, 148 135 Z"
              className="fill-surface-muted stroke-border"
              strokeWidth="1.5"
            />

            {RIGHT_FINGERS.map((f, i) => (
              <JointedFinger
                key={f.id}
                f={f}
                hand="right"
                isActive={activeFinger === f.id}
                isPressed={activeFinger === f.id && isTargetPressed}
                reach={reach}
                targetChar={targetChar}
                reducedMotion={reducedMotion}
                showTrajectoryHints={showTrajectoryHints}
                idlePhase={i}
              />
            ))}
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
