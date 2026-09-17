/**
 * Single source of truth for the visual QWERTY layout grid.
 * KeyboardVisualizer and AnimatedHandsGuide both derive finger assignment
 * and reach targets from this module instead of maintaining duplicate,
 * hand-tuned pixel offsets.
 */

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

export interface KeyGridEntry {
  /** 0 = number row, 1 = qwerty row, 2 = home row, 3 = zxcvbnm row */
  row: number;
  /** Column lane - aligned across rows so the same finger always owns the same lane */
  col: number;
  finger: FingerType;
  homeKey: string;
  fingerLabel: string;
  directionLabel: string;
}

/** Horizontal distance (px, at hand-guide scale) between adjacent finger lanes */
export const KEY_GRID_UNIT_X = 15;

/** Vertical distance (px, at hand-guide scale) from the home row for each row index */
export const ROW_DY: Record<number, number> = { 0: -32, 1: -22, 2: 0, 3: 16 };

/** Each finger's resting column lane on the home row */
export const HOME_COLUMNS: Record<FingerType, number> = {
  'left-pinky': 0,
  'left-ring': 1,
  'left-middle': 2,
  'left-index': 3,
  thumb: 0,
  'right-index': 6,
  'right-middle': 7,
  'right-ring': 8,
  'right-pinky': 9,
};

export const KEY_GRID: Record<string, KeyGridEntry> = {
  // Row 0 - Number row
  '`': { row: 0, col: -1, finger: 'left-pinky', homeKey: 'A', fingerLabel: 'Left Pinky', directionLabel: 'Reach High-Left to `' },
  '1': { row: 0, col: 0, finger: 'left-pinky', homeKey: 'A', fingerLabel: 'Left Pinky', directionLabel: 'Reach High to 1' },
  '2': { row: 0, col: 1, finger: 'left-ring', homeKey: 'S', fingerLabel: 'Left Ring', directionLabel: 'Reach High to 2' },
  '3': { row: 0, col: 2, finger: 'left-middle', homeKey: 'D', fingerLabel: 'Left Middle', directionLabel: 'Reach High to 3' },
  '4': { row: 0, col: 3, finger: 'left-index', homeKey: 'F', fingerLabel: 'Left Index', directionLabel: 'Reach High to 4' },
  '5': { row: 0, col: 4, finger: 'left-index', homeKey: 'F', fingerLabel: 'Left Index', directionLabel: 'Reach High-Inward to 5' },
  '6': { row: 0, col: 5, finger: 'right-index', homeKey: 'J', fingerLabel: 'Right Index', directionLabel: 'Reach High-Inward to 6' },
  '7': { row: 0, col: 6, finger: 'right-index', homeKey: 'J', fingerLabel: 'Right Index', directionLabel: 'Reach High to 7' },
  '8': { row: 0, col: 7, finger: 'right-middle', homeKey: 'K', fingerLabel: 'Right Middle', directionLabel: 'Reach High to 8' },
  '9': { row: 0, col: 8, finger: 'right-ring', homeKey: 'L', fingerLabel: 'Right Ring', directionLabel: 'Reach High to 9' },
  '0': { row: 0, col: 9, finger: 'right-pinky', homeKey: ';', fingerLabel: 'Right Pinky', directionLabel: 'Reach High to 0' },
  '-': { row: 0, col: 10, finger: 'right-pinky', homeKey: ';', fingerLabel: 'Right Pinky', directionLabel: 'Reach High to -' },
  '=': { row: 0, col: 11, finger: 'right-pinky', homeKey: ';', fingerLabel: 'Right Pinky', directionLabel: 'Reach High to =' },

  // Row 1 - QWERTY row
  q: { row: 1, col: 0, finger: 'left-pinky', homeKey: 'A', fingerLabel: 'Left Pinky', directionLabel: 'Reach Up to Q' },
  w: { row: 1, col: 1, finger: 'left-ring', homeKey: 'S', fingerLabel: 'Left Ring', directionLabel: 'Reach Up to W' },
  e: { row: 1, col: 2, finger: 'left-middle', homeKey: 'D', fingerLabel: 'Left Middle', directionLabel: 'Reach Up to E' },
  r: { row: 1, col: 3, finger: 'left-index', homeKey: 'F', fingerLabel: 'Left Index', directionLabel: 'Reach Up to R' },
  t: { row: 1, col: 4, finger: 'left-index', homeKey: 'F', fingerLabel: 'Left Index', directionLabel: 'Reach Up-Inward to T' },
  y: { row: 1, col: 5, finger: 'right-index', homeKey: 'J', fingerLabel: 'Right Index', directionLabel: 'Reach Up-Inward to Y' },
  u: { row: 1, col: 6, finger: 'right-index', homeKey: 'J', fingerLabel: 'Right Index', directionLabel: 'Reach Up to U' },
  i: { row: 1, col: 7, finger: 'right-middle', homeKey: 'K', fingerLabel: 'Right Middle', directionLabel: 'Reach Up to I' },
  o: { row: 1, col: 8, finger: 'right-ring', homeKey: 'L', fingerLabel: 'Right Ring', directionLabel: 'Reach Up to O' },
  p: { row: 1, col: 9, finger: 'right-pinky', homeKey: ';', fingerLabel: 'Right Pinky', directionLabel: 'Reach Up to P' },
  '[': { row: 1, col: 10, finger: 'right-pinky', homeKey: ';', fingerLabel: 'Right Pinky', directionLabel: 'Reach Outward to [' },
  ']': { row: 1, col: 11, finger: 'right-pinky', homeKey: ';', fingerLabel: 'Right Pinky', directionLabel: 'Reach Far Out to ]' },
  '\\': { row: 1, col: 12, finger: 'right-pinky', homeKey: ';', fingerLabel: 'Right Pinky', directionLabel: 'Reach Far Out to \\' },

  // Row 2 - Home row
  a: { row: 2, col: 0, finger: 'left-pinky', homeKey: 'A', fingerLabel: 'Left Pinky', directionLabel: 'Home Anchor A' },
  s: { row: 2, col: 1, finger: 'left-ring', homeKey: 'S', fingerLabel: 'Left Ring', directionLabel: 'Home Anchor S' },
  d: { row: 2, col: 2, finger: 'left-middle', homeKey: 'D', fingerLabel: 'Left Middle', directionLabel: 'Home Anchor D' },
  f: { row: 2, col: 3, finger: 'left-index', homeKey: 'F', fingerLabel: 'Left Index', directionLabel: 'Home Anchor F (Tactile Bump)' },
  g: { row: 2, col: 4, finger: 'left-index', homeKey: 'F', fingerLabel: 'Left Index', directionLabel: 'Stretch Inward to G' },
  h: { row: 2, col: 5, finger: 'right-index', homeKey: 'J', fingerLabel: 'Right Index', directionLabel: 'Stretch Inward to H' },
  j: { row: 2, col: 6, finger: 'right-index', homeKey: 'J', fingerLabel: 'Right Index', directionLabel: 'Home Anchor J (Tactile Bump)' },
  k: { row: 2, col: 7, finger: 'right-middle', homeKey: 'K', fingerLabel: 'Right Middle', directionLabel: 'Home Anchor K' },
  l: { row: 2, col: 8, finger: 'right-ring', homeKey: 'L', fingerLabel: 'Right Ring', directionLabel: 'Home Anchor L' },
  ';': { row: 2, col: 9, finger: 'right-pinky', homeKey: ';', fingerLabel: 'Right Pinky', directionLabel: 'Home Anchor ;' },
  '\'': { row: 2, col: 10, finger: 'right-pinky', homeKey: ';', fingerLabel: 'Right Pinky', directionLabel: "Reach Outward to '" },

  // Row 3 - ZXCVBNM row
  z: { row: 3, col: 0, finger: 'left-pinky', homeKey: 'A', fingerLabel: 'Left Pinky', directionLabel: 'Slide Down to Z' },
  x: { row: 3, col: 1, finger: 'left-ring', homeKey: 'S', fingerLabel: 'Left Ring', directionLabel: 'Slide Down to X' },
  c: { row: 3, col: 2, finger: 'left-middle', homeKey: 'D', fingerLabel: 'Left Middle', directionLabel: 'Slide Down to C' },
  v: { row: 3, col: 3, finger: 'left-index', homeKey: 'F', fingerLabel: 'Left Index', directionLabel: 'Slide Down to V' },
  b: { row: 3, col: 4, finger: 'left-index', homeKey: 'F', fingerLabel: 'Left Index', directionLabel: 'Slide Down-Inward to B' },
  n: { row: 3, col: 5, finger: 'right-index', homeKey: 'J', fingerLabel: 'Right Index', directionLabel: 'Slide Down-Inward to N' },
  m: { row: 3, col: 6, finger: 'right-index', homeKey: 'J', fingerLabel: 'Right Index', directionLabel: 'Slide Down to M' },
  ',': { row: 3, col: 7, finger: 'right-middle', homeKey: 'K', fingerLabel: 'Right Middle', directionLabel: 'Slide Down to ,' },
  '.': { row: 3, col: 8, finger: 'right-ring', homeKey: 'L', fingerLabel: 'Right Ring', directionLabel: 'Slide Down to .' },
  '/': { row: 3, col: 9, finger: 'right-pinky', homeKey: ';', fingerLabel: 'Right Pinky', directionLabel: 'Slide Down to /' },
};

const SPACE_REACH: FingerReachOffset = {
  dx: 0,
  dy: 6,
  directionLabel: 'Tap Space with Thumb',
  homeKey: '␣',
  finger: 'thumb',
  fingerLabel: 'Thumb',
};

function buildReachOffset(entry: KeyGridEntry): FingerReachOffset {
  const homeCol = HOME_COLUMNS[entry.finger];
  return {
    dx: (entry.col - homeCol) * KEY_GRID_UNIT_X,
    dy: ROW_DY[entry.row] ?? 0,
    directionLabel: entry.directionLabel,
    homeKey: entry.homeKey,
    finger: entry.finger,
    fingerLabel: entry.fingerLabel,
  };
}

/** Fingertip reach target (dx, dy) for every typable character, derived from KEY_GRID. */
export const FINGER_REACH_MAP: Record<string, FingerReachOffset> = {
  ...Object.fromEntries(Object.entries(KEY_GRID).map(([char, entry]) => [char, buildReachOffset(entry)])),
  ' ': SPACE_REACH,
};

/** Looks up the finger responsible for a key, falling back for modifier/control keys not in the grid. */
export function getKeyFinger(key: string, fallback: FingerType): FingerType {
  return KEY_GRID[key.toLowerCase()]?.finger ?? fallback;
}
