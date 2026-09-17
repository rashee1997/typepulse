'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { soundFx } from '@/lib/sound';
import { COMMON_WORDS_200 } from '@/lib/word-banks';
import { Flame, Heart, RotateCcw, Sparkles, Trophy, Zap } from 'lucide-react';

interface WordRushProps {
  onFinish: (score: number, wordsCompleted: number) => void;
  onExit: () => void;
}

interface FallingWord {
  id: string;
  word: string;
  typedSoFar: string;
  x: number; // percentage across screen (10% to 80%)
  y: number; // percentage down screen (0% to 100%)
  speed: number;
}

export const WordRushGame: React.FC<WordRushProps> = ({ onFinish, onExit }) => {
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'gameover'>('ready');
  const [words, setWords] = useState<FallingWord[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lives, setLives] = useState(3);
  const [wordsCleared, setWordsCleared] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const wordsRef = useRef<FallingWord[]>([]);
  const livesRef = useRef(lives);
  const scoreRef = useRef(score);
  const wordsClearedRef = useRef(wordsCleared);
  const onFinishRef = useRef(onFinish);
  const hasEndedRef = useRef(false);

  useEffect(() => {
    wordsRef.current = words;
  }, [words]);

  useEffect(() => {
    livesRef.current = lives;
  }, [lives]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    wordsClearedRef.current = wordsCleared;
  }, [wordsCleared]);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  const handleGameOver = useCallback(() => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    setGameState('gameover');
    soundFx.playError();
    onFinishRef.current(scoreRef.current, wordsClearedRef.current);
  }, []);

  // Main animation loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    let lastSpawn = Date.now();
    let animId: number;

    const gameLoop = () => {
      if (hasEndedRef.current) return;
      const now = Date.now();
      const currentScore = scoreRef.current;

      // Spawn word every 1.8s (scales faster with score)
      const spawnRate = Math.max(900, 1800 - Math.floor(currentScore / 150) * 100);
      if (now - lastSpawn > spawnRate && wordsRef.current.length < 6) {
        lastSpawn = now;
        const randomWord = COMMON_WORDS_200[Math.floor(Math.random() * 150)];
        const newWord: FallingWord = {
          id: `word-${now}-${Math.random()}`,
          word: randomWord,
          typedSoFar: '',
          x: Math.floor(Math.random() * 65) + 10,
          y: 0,
          speed: 0.25 + Math.min(0.5, currentScore / 2000),
        };
        setWords((prev) => [...prev, newWord]);
      }

      // Move words down
      setWords((prev) => {
        let missedCount = 0;
        const nextWords: FallingWord[] = [];

        for (const w of prev) {
          const nextY = w.y + w.speed;
          if (nextY >= 92) {
            missedCount++;
          } else {
            nextWords.push({ ...w, y: nextY });
          }
        }

        if (missedCount > 0) {
          soundFx.playError();
          setCombo(0);
          const remainingLives = Math.max(0, livesRef.current - missedCount);
          livesRef.current = remainingLives;
          setLives(remainingLives);
          if (remainingLives <= 0) {
            handleGameOver();
          }
        }

        return nextWords;
      });

      if (!hasEndedRef.current) {
        animId = requestAnimationFrame(gameLoop);
      }
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, handleGameOver]);

  const startGame = () => {
    hasEndedRef.current = false;
    setGameState('playing');
    setScore(0);
    setCombo(0);
    setLives(3);
    livesRef.current = 3;
    setWordsCleared(0);
    setWords([]);
    setCurrentInput('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim().toLowerCase();
    setCurrentInput(val);

    // Check if input matches any falling word
    const matchedIndex = words.findIndex((w) => w.word === val);

    if (matchedIndex !== -1) {
      // Cleared a word!
      const clearedWord = words[matchedIndex];
      soundFx.playKeyClick();
      setWords((prev) => prev.filter((_, idx) => idx !== matchedIndex));
      setCurrentInput('');

      const newCombo = combo + 1;
      setCombo(newCombo);
      setWordsCleared((c) => c + 1);

      const points = clearedWord.word.length * 20 + newCombo * 10;
      setScore((s) => s + points);

      if (newCombo % 5 === 0) {
        soundFx.playCombo();
      }
    } else {
      soundFx.playKeyClick();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center select-none" id="word-rush-container">
      {/* Top HUD */}
      <div className="w-full flex items-center justify-between px-4 py-3 bg-slate-900/90 border border-slate-800 rounded-2xl mb-4 shadow-lg">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={onExit}
            className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-slate-100 transition-colors flex items-center gap-1 text-xs font-semibold"
            id="rush-back-btn"
          >
            <span>←</span>
            <span className="hidden sm:inline">Arcade</span>
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <Heart
                key={i}
                className={`w-5 h-5 ${i < lives ? 'text-rose-500 fill-rose-500' : 'text-slate-700'}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Score:</span>
            <span className="text-xl font-bold font-mono text-amber-400">{score}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {combo > 2 && (
            <div className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold flex items-center gap-1 animate-pulse">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>{combo}x Combo!</span>
            </div>
          )}
          <button
            onClick={onExit}
            className="px-3 py-1 text-xs text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 border border-slate-700 transition-colors"
          >
            Exit Game
          </button>
        </div>
      </div>

      {/* Game Stage Arena */}
      <div className="relative w-full h-[380px] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between">
        {/* Deadline Line */}
        <div className="absolute bottom-12 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-rose-500/60 to-transparent shadow-[0_0_12px_rgba(244,63,94,0.5)]" />

        {/* Falling Words */}
        {gameState === 'playing' && (
          <div className="absolute inset-0 pointer-events-none">
            {words.map((w) => {
              const isTargeting = currentInput && w.word.startsWith(currentInput);

              return (
                <div
                  key={w.id}
                  style={{ left: `${w.x}%`, top: `${w.y}%` }}
                  className={`absolute px-3 py-1 rounded-xl text-sm font-mono font-bold transition-transform duration-75 border ${
                    isTargeting
                      ? 'bg-amber-400/20 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.6)] scale-110 z-20'
                      : 'bg-slate-800/90 border-slate-700 text-slate-200'
                  }`}
                >
                  {w.word}
                </div>
              );
            })}
          </div>
        )}

        {/* Ready Overlay */}
        {gameState === 'ready' && (
          <div className="absolute inset-0 bg-slate-950/85 flex flex-col items-center justify-center p-6 text-center z-30">
            <Trophy className="w-12 h-12 text-amber-400 mb-3" />
            <h3 className="text-2xl font-bold text-slate-100 mb-1">Word Rush Arcade</h3>
            <p className="text-xs text-slate-400 max-w-sm mb-6">
              Words are dropping toward the deadline! Type whole words rapidly to clear them before they cross the line.
            </p>
            <button
              onClick={startGame}
              className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-sm transition-transform hover:scale-105 shadow-lg shadow-amber-500/20"
              id="start-word-rush-btn"
            >
              Start Game
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center z-30">
            <h3 className="text-2xl font-bold text-rose-400 mb-1">Out of Lives!</h3>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl my-4 space-y-1 w-60">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Final Score:</span>
                <span className="font-mono font-bold text-amber-400">{score}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Words Cleared:</span>
                <span className="font-mono font-bold text-slate-200">{wordsCleared}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={startGame}
                className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Play Again</span>
              </button>
              <button
                onClick={onExit}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition-colors"
              >
                Back to Practice
              </button>
            </div>
          </div>
        )}

        {/* Input Bar At Bottom */}
        <div className="mt-auto p-3 bg-slate-900/90 border-t border-slate-800 flex justify-center z-20">
          <input
            ref={inputRef}
            type="text"
            value={currentInput}
            onChange={handleInputChange}
            disabled={gameState !== 'playing'}
            placeholder={gameState === 'playing' ? 'Type falling word...' : 'Waiting to start...'}
            className="w-full max-w-sm px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-center text-amber-300 font-mono text-base font-bold placeholder-slate-600 focus:outline-none focus:border-amber-400"
            autoFocus
          />
        </div>
      </div>
    </div>
  );
};
