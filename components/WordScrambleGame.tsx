'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { soundFx } from '@/lib/sound';
import {
  Award,
  ChevronLeft,
  Flame,
  HelpCircle,
  Lightbulb,
  Play,
  RotateCcw,
  Shuffle,
  Sparkles,
  Timer,
  Trophy,
  Zap,
} from 'lucide-react';

interface WordScrambleGameProps {
  onFinish: (xp: number, score: number, wordsSolved: number, bestStreak: number) => void;
  onExit: () => void;
}

export type ScrambleMode = 'sprint' | 'gauntlet';

interface ScrambleWordItem {
  word: string;
  category: string;
  hint: string;
  difficulty: 1 | 2 | 3 | 4;
}

const SCRAMBLE_DICTIONARY: ScrambleWordItem[] = [
  // Tech & Coding
  { word: 'ALGORITHM', category: 'Technology', hint: 'Step-by-step logic rule', difficulty: 3 },
  { word: 'COMPILER', category: 'Technology', hint: 'Translates source to machine code', difficulty: 3 },
  { word: 'VARIABLE', category: 'Technology', hint: 'Named storage for a value', difficulty: 2 },
  { word: 'TERMINAL', category: 'Technology', hint: 'Command-line text interface', difficulty: 2 },
  { word: 'FUNCTION', category: 'Technology', hint: 'Reusable block of code', difficulty: 2 },
  { word: 'DATABASE', category: 'Technology', hint: 'Organized data store', difficulty: 2 },
  { word: 'PROTOCOL', category: 'Technology', hint: 'Standard network communication rule', difficulty: 3 },
  { word: 'HARDWARE', category: 'Technology', hint: 'Physical computing components', difficulty: 2 },
  { word: 'SYNTAX', category: 'Technology', hint: 'Grammar of programming language', difficulty: 1 },
  { word: 'SERVER', category: 'Technology', hint: 'Host providing network services', difficulty: 1 },
  { word: 'BINARY', category: 'Technology', hint: 'Base-2 numeric system', difficulty: 1 },
  { word: 'CLIENT', category: 'Technology', hint: 'Device or app making requests', difficulty: 1 },

  // Science & Cosmos
  { word: 'GRAVITY', category: 'Science', hint: 'Natural force pulling masses together', difficulty: 2 },
  { word: 'QUANTUM', category: 'Science', hint: 'Discrete unit in subatomic physics', difficulty: 3 },
  { word: 'ECLIPSE', category: 'Science', hint: 'Obscuring of celestial light', difficulty: 2 },
  { word: 'CATALYST', category: 'Science', hint: 'Substance accelerating a reaction', difficulty: 3 },
  { word: 'SPECTRUM', category: 'Science', hint: 'Band of radiant wavelengths', difficulty: 3 },
  { word: 'PHOTON', category: 'Science', hint: 'Elementary particle of light', difficulty: 1 },
  { word: 'NEBULA', category: 'Science', hint: 'Interstellar cloud of dust and gas', difficulty: 1 },
  { word: 'GALAXY', category: 'Science', hint: 'Gravitationally bound star system', difficulty: 1 },
  { word: 'VELOCITY', category: 'Science', hint: 'Speed with specific direction', difficulty: 3 },
  { word: 'KINETIC', category: 'Science', hint: 'Energy possessed by motion', difficulty: 2 },

  // Nature & Exploration
  { word: 'GLACIER', category: 'Nature', hint: 'Slowly moving mass of dense ice', difficulty: 2 },
  { word: 'HORIZON', category: 'Nature', hint: 'Line where earth meets sky', difficulty: 2 },
  { word: 'VOLCANO', category: 'Nature', hint: 'Rupture in planetary crust', difficulty: 2 },
  { word: 'CANYON', category: 'Nature', hint: 'Deep gorge between cliffs', difficulty: 1 },
  { word: 'FALCON', category: 'Nature', hint: 'Fast bird of prey', difficulty: 1 },
  { word: 'AURORA', category: 'Nature', hint: 'Polar atmospheric light display', difficulty: 1 },
  { word: 'JUNGLE', category: 'Nature', hint: 'Dense tropical forest ecosystem', difficulty: 1 },
  { word: 'CASCADE', category: 'Nature', hint: 'Small waterfall or sequential flow', difficulty: 2 },

  // Speed & Mind
  { word: 'LIGHTNING', category: 'Reflexes', hint: 'High-voltage electric flash', difficulty: 3 },
  { word: 'REFLEXES', category: 'Reflexes', hint: 'Rapid involuntary responses', difficulty: 3 },
  { word: 'IMPULSE', category: 'Reflexes', hint: 'Sudden surge or neural signal', difficulty: 2 },
  { word: 'MOMENTUM', category: 'Reflexes', hint: 'Quantity of moving motion', difficulty: 3 },
  { word: 'PRECISION', category: 'Reflexes', hint: 'Exactness and sharp accuracy', difficulty: 3 },
  { word: 'TACTICS', category: 'Mind', hint: 'Strategic actions to achieve goals', difficulty: 2 },
  { word: 'ENIGMA', category: 'Mind', hint: 'Mysterious or puzzling matter', difficulty: 1 },
  { word: 'LABYRINTH', category: 'Mind', hint: 'Complex network of passages', difficulty: 4 },
];

function scrambleString(str: string): string {
  const arr = str.split('');
  let attempts = 0;
  let scrambled = str;
  // Ensure the scrambled version is different from the original word
  while (scrambled === str && attempts < 10) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    scrambled = arr.join('');
    attempts++;
  }
  return scrambled;
}

export const WordScrambleGame: React.FC<WordScrambleGameProps> = ({ onFinish, onExit }) => {
  const [gameMode, setGameMode] = useState<ScrambleMode>('sprint');
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'finished'>('ready');

  // Word pool & current word
  const [wordList, setWordList] = useState<ScrambleWordItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [scrambledLetters, setScrambledLetters] = useState<string[]>([]);
  const [typedLetters, setTypedLetters] = useState<string[]>([]);

  // Telemetry & scoring
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [wordsSolved, setWordsSolved] = useState(0);
  const [revealedHints, setRevealedHints] = useState<number[]>([]);
  const [feedbackEffect, setFeedbackEffect] = useState<'correct' | 'wrong' | null>(null);

  // Time tracking
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [calculatedXp, setCalculatedXp] = useState<number>(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const hasFinishedRef = useRef(false);
  const onFinishRef = useRef(onFinish);

  const wordsSolvedRef = useRef(0);
  const bestStreakRef = useRef(0);
  const scoreRef = useRef(0);
  const gameModeRef = useRef<ScrambleMode>('sprint');

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    wordsSolvedRef.current = wordsSolved;
    bestStreakRef.current = bestStreak;
    scoreRef.current = score;
    gameModeRef.current = gameMode;
  }, [wordsSolved, bestStreak, score, gameMode]);

  // Finish Game & XP calculation (declared before loadWordAtIndex)
  const finishGame = useCallback(() => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    setGameState('finished');

    const solved = wordsSolvedRef.current;
    const topStreak = bestStreakRef.current;
    const finalScore = scoreRef.current;
    const mode = gameModeRef.current;

    // Distinct XP Reward calculation:
    const baseWordXp = solved * 35;
    const streakBonus = topStreak * 20;
    const scoreXp = Math.round(finalScore / 12);
    const modeMultiplier = mode === 'gauntlet' ? 1.3 : 1.1;

    const totalXp = Math.max(50, Math.round((baseWordXp + streakBonus + scoreXp) * modeMultiplier));
    setCalculatedXp(totalXp);

    if (solved >= 3) {
      soundFx.playSuccess();
    } else {
      soundFx.playCombo();
    }

    onFinishRef.current(totalXp, finalScore, solved, topStreak);
  }, []);

  // Setup word at current index
  const loadWordAtIndex = useCallback(
    (index: number, deck: ScrambleWordItem[]) => {
      if (index >= deck.length) {
        finishGame();
        return;
      }
      const target = deck[index].word;
      setScrambledLetters(scrambleString(target).split(''));
      setTypedLetters([]);
      setRevealedHints([]);
      setFeedbackEffect(null);
    },
    [finishGame]
  );

  // Generate word deck
  const initWordDeck = useCallback((mode: ScrambleMode) => {
    const shuffled = [...SCRAMBLE_DICTIONARY].sort(() => Math.random() - 0.5);
    let selected: ScrambleWordItem[];
    if (mode === 'gauntlet') {
      // 10 words, ascending difficulty
      selected = shuffled
        .sort((a, b) => a.difficulty - b.difficulty)
        .slice(0, 10);
    } else {
      // 25 words randomized
      selected = shuffled.slice(0, 25);
    }
    setWordList(selected);
    setCurrentIdx(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setWordsSolved(0);
    setRevealedHints([]);
    setTimeLeft(mode === 'sprint' ? 60 : 120);
    hasFinishedRef.current = false;
    setCalculatedXp(0);

    if (selected.length > 0) {
      const firstWord = selected[0].word;
      setScrambledLetters(scrambleString(firstWord).split(''));
      setTypedLetters([]);
    }
  }, []);

  const currentItem = wordList[currentIdx] || null;

  // Start game
  const startGame = (mode: ScrambleMode) => {
    setGameMode(mode);
    initWordDeck(mode);
    setGameState('playing');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Timer countdown
  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          finishGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, finishGame]);

  // Re-shuffle scrambled letters
  const handleShuffle = () => {
    if (!currentItem) return;
    soundFx.playKeyClick();
    setScrambledLetters((prev) => [...prev].sort(() => Math.random() - 0.5));
  };

  // Provide a Hint (reveals next unrevealed correct letter)
  const handleHint = () => {
    if (!currentItem) return;
    const target = currentItem.word;
    const nextIdx = revealedHints.length;

    if (nextIdx < target.length - 1) {
      soundFx.playCombo();
      const updatedHints = [...revealedHints, nextIdx];
      setRevealedHints(updatedHints);

      // Pre-fill revealed hints into typed letters
      const newTyped = target.slice(0, updatedHints.length).split('');
      setTypedLetters(newTyped);

      // Deduct minor penalty for hint
      setScore((prev) => Math.max(0, prev - 25));
    }
  };

  // Handle typing key input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (gameState !== 'playing' || !currentItem) return;

    const key = e.key.toUpperCase();
    const targetWord = currentItem.word;

    // Backspace: remove last typed letter
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (typedLetters.length > revealedHints.length) {
        soundFx.playKeyClick();
        setTypedLetters((prev) => prev.slice(0, -1));
      }
      return;
    }

    // Space / Enter / Tab shortcut to shuffle or skip
    if (e.key === ' ') {
      e.preventDefault();
      handleShuffle();
      return;
    }

    // Only handle alphabetic single characters
    if (/^[A-Z]$/.test(key)) {
      e.preventDefault();

      // Check if this letter is available in scrambled letters that haven't been placed
      const targetLength = targetWord.length;
      if (typedLetters.length >= targetLength) return;

      const newTyped = [...typedLetters, key];
      setTypedLetters(newTyped);
      soundFx.playKeyClick();

      // Check if full word is typed
      if (newTyped.length === targetLength) {
        const assembled = newTyped.join('');
        if (assembled === targetWord) {
          // Correct solve!
          soundFx.playCombo();
          setFeedbackEffect('correct');

          const newStreak = streak + 1;
          setStreak(newStreak);
          setBestStreak((prev) => Math.max(prev, newStreak));
          setWordsSolved((prev) => prev + 1);

          // Calculate points: base word length * 80 * streak multiplier
          const multiplier = Math.min(3.5, 1 + newStreak * 0.25);
          const pointsEarned = Math.round(targetLength * 80 * multiplier);
          setScore((prev) => prev + pointsEarned);

          // Add bonus time in sprint mode (+5s)
          if (gameMode === 'sprint') {
            setTimeLeft((prev) => Math.min(90, prev + 5));
          }

          // Advance to next word after short victory flash
          setTimeout(() => {
            const nextIndex = currentIdx + 1;
            if (nextIndex >= wordList.length) {
              finishGame();
            } else {
              setCurrentIdx(nextIndex);
              loadWordAtIndex(nextIndex, wordList);
            }
          }, 450);
        } else {
          // Mistake
          soundFx.playError();
          setFeedbackEffect('wrong');
          setStreak(0);
          setTimeout(() => {
            setFeedbackEffect(null);
            // Reset typed letters back to revealed hints
            setTypedLetters(targetWord.slice(0, revealedHints.length).split(''));
          }, 500);
        }
      }
    }
  };

  // Determine which scrambled letters have been used in typed letters
  const getRemainingLetterPool = () => {
    if (!currentItem) return [];
    const usedCounts: Record<string, number> = {};
    typedLetters.forEach((char) => {
      usedCounts[char] = (usedCounts[char] || 0) + 1;
    });

    return scrambledLetters.map((char, i) => {
      let isUsed = false;
      if (usedCounts[char] && usedCounts[char] > 0) {
        isUsed = true;
        usedCounts[char]--;
      }
      return { char, index: i, isUsed };
    });
  };

  const poolTiles = getRemainingLetterPool();

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-5 animate-fadeIn" id="word-scramble-game">
      {/* Top Header */}
      <div className="bg-surface border border-border rounded-3xl p-5 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-2.5 rounded-xl bg-surface-hover hover:bg-surface-active text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1 text-xs font-semibold border border-border"
            id="scramble-exit-btn"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Arcade</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-primary-subtle text-primary font-mono text-[10px] font-bold tracking-wider border border-primary-border flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                ANAGRAM MIND DRILL
              </span>
              <span className="text-xs text-text-subtle font-mono">Word Scramble Challenge</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-text-primary mt-0.5">Word Scramble</h1>
          </div>
        </div>

        {/* Game Mode Selector */}
        <div className="flex items-center gap-1.5 bg-surface-muted p-1 rounded-2xl border border-border">
          <button
            disabled={gameState === 'playing'}
            onClick={() => {
              setGameMode('sprint');
              initWordDeck('sprint');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              gameMode === 'sprint'
                ? 'bg-primary text-primary-foreground shadow-sm font-extrabold'
                : 'text-text-muted hover:text-text-primary disabled:opacity-50'
            }`}
          >
            ⚡ 60s Sprint
          </button>
          <button
            disabled={gameState === 'playing'}
            onClick={() => {
              setGameMode('gauntlet');
              initWordDeck('gauntlet');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              gameMode === 'gauntlet'
                ? 'bg-primary text-primary-foreground shadow-sm font-extrabold'
                : 'text-text-muted hover:text-text-primary disabled:opacity-50'
            }`}
          >
            🎯 10-Word Gauntlet
          </button>
        </div>
      </div>

      {/* Main Game Cockpit */}
      {gameState === 'ready' && (
        <div className="bg-surface border border-border rounded-3xl p-8 sm:p-10 text-center flex flex-col items-center justify-center gap-5 shadow-card">
          <div className="w-16 h-16 rounded-3xl bg-primary-subtle border border-primary-border text-primary flex items-center justify-center text-3xl shadow-inner">
            🧩
          </div>
          <div>
            <h2 className="text-2xl font-black text-text-primary">Ready to Unscramble?</h2>
            <p className="text-sm text-text-muted mt-1 max-w-md">
              Letters are scrambled in random order. Type letters on your keyboard or tap tiles to reconstruct the hidden word before time expires!
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg my-2 text-xs font-mono text-text-muted">
            <div className="p-3 bg-surface-muted rounded-2xl border border-border">
              <span className="text-text-subtle block text-[10px]">MODE</span>
              <span className="text-primary font-bold mt-0.5 block">
                {gameMode === 'sprint' ? '60s Speed Sprint' : '10-Word Gauntlet'}
              </span>
            </div>
            <div className="p-3 bg-surface-muted rounded-2xl border border-border">
              <span className="text-text-subtle block text-[10px]">TIME PER WORD</span>
              <span className="text-accent font-bold mt-0.5 block">+5s on solve (Sprint)</span>
            </div>
            <div className="p-3 bg-surface-muted rounded-2xl border border-border">
              <span className="text-text-subtle block text-[10px]">XP REWARD</span>
              <span className="text-success font-bold mt-0.5 block">Up to +450 XP</span>
            </div>
          </div>

          <button
            onClick={() => startGame(gameMode)}
            className="px-8 py-4 bg-primary hover:bg-primary-hover text-primary-foreground font-black rounded-2xl text-base shadow-glow-primary hover:scale-105 transition-all flex items-center gap-2"
            id="start-word-scramble-btn"
          >
            <Play className="w-5 h-5 fill-primary-foreground" />
            <span>START UNSCRAMBLING</span>
          </button>
        </div>
      )}

      {gameState === 'playing' && currentItem && (
        <div className="bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-card flex flex-col gap-6">
          {/* Top Telemetry Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border text-xs font-mono">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-surface-muted px-3 py-1.5 rounded-xl border border-border">
                <Timer className={`w-4 h-4 ${timeLeft <= 10 ? 'text-danger animate-ping' : 'text-primary'}`} />
                <span className="text-text-muted">Time:</span>
                <span className={`font-bold ${timeLeft <= 10 ? 'text-danger' : 'text-text-primary'}`}>
                  {timeLeft}s
                </span>
              </div>

              <div className="flex items-center gap-1.5 bg-surface-muted px-3 py-1.5 rounded-xl border border-border">
                <Flame className={`w-4 h-4 ${streak > 1 ? 'text-accent animate-pulse' : 'text-text-subtle'}`} />
                <span className="text-text-muted">Streak:</span>
                <span className={streak > 1 ? 'text-accent font-bold' : 'text-text-secondary'}>
                  {streak}x
                </span>
              </div>

              <div className="hidden sm:flex items-center gap-1.5 bg-surface-muted px-3 py-1.5 rounded-xl border border-border">
                <Trophy className="w-4 h-4 text-success" />
                <span className="text-text-muted">Solved:</span>
                <span className="text-success font-bold">
                  {wordsSolved} / {gameMode === 'gauntlet' ? wordList.length : '∞'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 bg-primary-subtle border border-primary-border rounded-xl text-primary font-bold">
                Score: {score.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Hidden capture input to catch keyboard input from anywhere */}
          <input
            ref={inputRef}
            type="text"
            className="opacity-0 absolute pointer-events-none -top-40"
            onKeyDown={handleKeyDown}
            autoFocus
          />

          {/* Category Clue Banner */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-muted p-4 rounded-2xl border border-border">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-xl bg-surface border border-border text-primary text-xs font-mono font-bold uppercase">
                {currentItem.category}
              </span>
              <p className="text-xs sm:text-sm text-text-secondary italic">
                &ldquo;{currentItem.hint}&rdquo;
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleShuffle}
                className="px-3 py-1.5 bg-surface-hover hover:bg-surface-active text-text-secondary hover:text-text-primary rounded-xl text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 border border-border"
                title="Shuffle scrambled letters"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Shuffle</span>
              </button>

              <button
                onClick={handleHint}
                disabled={revealedHints.length >= currentItem.word.length - 1}
                className="px-3 py-1.5 bg-accent-subtle hover:bg-accent/20 text-accent rounded-xl text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 border border-accent-border disabled:opacity-40"
                title="Reveal a letter (-25 pts)"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Hint</span>
              </button>
            </div>
          </div>

          {/* Scrambled Letter Tiles Pool */}
          <div className="flex flex-col items-center gap-3">
            <span className="text-xs text-text-subtle font-mono uppercase tracking-wider">
              SCRAMBLED LETTERS (TYPE ON KEYBOARD)
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 py-2">
              {poolTiles.map((tile, i) => (
                <div
                  key={i}
                  className={`w-12 h-14 sm:w-14 sm:h-16 rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-black font-mono transition-all select-none border-b-4 ${
                    tile.isUsed
                      ? 'bg-surface-muted/40 text-text-subtle/30 border-border scale-95 opacity-30'
                      : 'bg-primary hover:bg-primary-hover text-primary-foreground border-primary-border shadow-md hover:scale-105 active:scale-95'
                  }`}
                >
                  {tile.char}
                </div>
              ))}
            </div>
          </div>

          {/* Solution Input Slots */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-text-muted font-mono">YOUR GUESS</span>
            <div
              className={`flex flex-wrap items-center justify-center gap-2 sm:gap-3 p-4 rounded-2xl transition-all ${
                feedbackEffect === 'correct'
                  ? 'bg-success-subtle border-2 border-success scale-105'
                  : feedbackEffect === 'wrong'
                  ? 'bg-danger-subtle border-2 border-danger animate-shake'
                  : 'bg-surface-muted border-2 border-border'
              }`}
            >
              {Array.from({ length: currentItem.word.length }).map((_, i) => {
                const char = typedLetters[i] || '';
                const isHinted = revealedHints.includes(i);
                return (
                  <div
                    key={i}
                    className={`w-12 h-14 sm:w-14 sm:h-16 rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-black font-mono border-2 transition-all ${
                      char
                        ? isHinted
                          ? 'bg-accent-subtle border-accent text-accent'
                          : 'bg-surface border-primary text-primary shadow-sm'
                        : 'bg-surface-muted border-border text-text-subtle/40'
                    }`}
                  >
                    {char || '•'}
                  </div>
                );
              })}
            </div>
            <span className="text-[11px] text-text-subtle font-mono mt-1">
              Press letters to fill • Backspace to undo • Space to shuffle
            </span>
          </div>
        </div>
      )}

      {/* Finished Summary Screen & Distinct XP Rewards */}
      {gameState === 'finished' && (
        <div className="bg-surface border-2 border-primary-border rounded-3xl p-6 sm:p-8 shadow-dialog flex flex-col items-center text-center gap-6 animate-fadeIn">
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 rounded-3xl bg-primary-subtle border border-primary-border text-primary flex items-center justify-center text-4xl shadow-glow-primary">
              🧩
            </div>

            <span className="px-3 py-1 rounded-full bg-primary-subtle border border-primary-border text-primary text-xs font-mono font-bold uppercase">
              CHALLENGE COMPLETED • {gameMode === 'sprint' ? '60s SPRINT' : 'GAUNTLET'}
            </span>

            <h2 className="text-3xl sm:text-4xl font-black text-text-primary mt-1">
              {wordsSolved >= 5 ? 'Master Cryptographer!' : 'Puzzle Completed!'}
            </h2>
            <p className="text-sm text-text-muted max-w-lg">
              You unscrambled {wordsSolved} hidden words with high mental dexterity and quick pattern recognition!
            </p>
          </div>

          {/* Stats Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl">
            <div className="p-3 bg-surface-muted rounded-2xl border border-border">
              <span className="text-[11px] text-text-subtle block">Final Score</span>
              <span className="text-xl font-mono font-bold text-primary mt-0.5 block">
                {score.toLocaleString()}
              </span>
            </div>

            <div className="p-3 bg-surface-muted rounded-2xl border border-border">
              <span className="text-[11px] text-text-subtle block">Words Solved</span>
              <span className="text-xl font-mono font-bold text-success mt-0.5 block">
                {wordsSolved}
              </span>
            </div>

            <div className="p-3 bg-surface-muted rounded-2xl border border-border">
              <span className="text-[11px] text-text-subtle block">Best Streak</span>
              <span className="text-xl font-mono font-bold text-accent mt-0.5 block">
                {bestStreak}x
              </span>
            </div>

            <div className="p-3 bg-surface-muted rounded-2xl border border-border">
              <span className="text-[11px] text-text-subtle block">Time Elapsed</span>
              <span className="text-xl font-mono font-bold text-text-primary mt-0.5 block">
                {gameMode === 'sprint' ? `${60 - timeLeft}s` : 'Completed'}
              </span>
            </div>
          </div>

          {/* Distinct XP Reward Callout */}
          <div className="w-full max-w-md bg-primary-subtle border border-primary-border rounded-2xl p-4 flex items-center justify-between shadow-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center text-xl font-bold">
                ⚡
              </div>
              <div className="text-left">
                <span className="text-[11px] text-text-muted font-mono block">DISTINCT XP REWARD</span>
                <span className="text-xl font-black text-primary font-mono">+{calculatedXp} XP EARNED</span>
              </div>
            </div>
            <div className="text-right text-[11px] font-mono text-text-muted">
              <span className="block text-success font-bold">Credited to Profile</span>
              <span>Anagram Bonus Applied</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => startGame(gameMode)}
              className="px-6 py-3 bg-primary hover:bg-primary-hover text-primary-foreground font-black rounded-xl text-sm transition-all shadow-glow-primary-sm hover:scale-105 flex items-center gap-2"
              id="rematch-scramble-btn"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Play Again</span>
            </button>

            <button
              onClick={onExit}
              className="px-6 py-3 bg-surface-hover hover:bg-surface-active text-text-primary border border-border font-bold rounded-xl text-sm transition-colors flex items-center gap-2"
              id="exit-scramble-btn"
            >
              <span>Back to Word Games</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
