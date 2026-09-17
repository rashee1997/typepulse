'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { soundFx } from '@/lib/sound';
import { COMMON_WORDS_200 } from '@/lib/word-banks';
import {
  Award,
  ChevronLeft,
  Clock,
  Flame,
  RotateCcw,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';

interface WordBlitzProps {
  onFinish: (score: number, wordsCleared: number, maxMultiplier: number) => void;
  onExit: () => void;
}

export const WordBlitzGame: React.FC<WordBlitzProps> = ({ onFinish, onExit }) => {
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'gameover'>('ready');
  const [timeLeft, setTimeLeft] = useState(45);
  const [currentWord, setCurrentWord] = useState('');
  const [nextWord, setNextWord] = useState('');
  const [inputVal, setInputVal] = useState('');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [wordsCleared, setWordsCleared] = useState(0);
  const [bonusNotification, setBonusNotification] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const hasFinishedRef = useRef(false);

  // Sync refs so callbacks have immediate access without re-triggering effects
  const scoreRef = useRef(score);
  const wordsClearedRef = useRef(wordsCleared);
  const maxComboRef = useRef(maxCombo);
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    wordsClearedRef.current = wordsCleared;
  }, [wordsCleared]);

  useEffect(() => {
    maxComboRef.current = maxCombo;
  }, [maxCombo]);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  // Multiplier calculation based on combo
  const multiplier = Math.min(5, 1 + Math.floor(combo / 4));

  const getRandomWord = () => {
    return COMMON_WORDS_200[Math.floor(Math.random() * COMMON_WORDS_200.length)];
  };

  const endBlitz = useCallback(() => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    setGameState('gameover');
    soundFx.playSuccess();
    const finalMult = Math.min(5, 1 + Math.floor(maxComboRef.current / 4));
    onFinishRef.current(scoreRef.current, wordsClearedRef.current, finalMult);
  }, []);

  const startBlitz = useCallback(() => {
    hasFinishedRef.current = false;
    setTimeLeft(45);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setWordsCleared(0);
    setCurrentWord(getRandomWord());
    setNextWord(getRandomWord());
    setInputVal('');
    setBonusNotification(null);
    setGameState('playing');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // Timer countdown
  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          endBlitz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, endBlitz]);

  // Handle Typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (gameState !== 'playing') return;

    const val = e.target.value;

    if (val === currentWord || (val.endsWith(' ') && val.trim() === currentWord)) {
      // Completed word!
      soundFx.playKeyClick();
      const points = currentWord.length * 10 * multiplier;
      setScore((s) => s + points);

      const nextCombo = combo + 1;
      setCombo(nextCombo);
      setMaxCombo((m) => Math.max(m, nextCombo));
      setWordsCleared((w) => w + 1);

      // Streak Reward: Time Extension every 6 combo
      if (nextCombo > 0 && nextCombo % 6 === 0) {
        soundFx.playCombo();
        setTimeLeft((t) => Math.min(60, t + 3));
        setBonusNotification('+3s Time Freeze Bonus!');
        setTimeout(() => setBonusNotification(null), 1500);
      }

      // Next word transition
      setCurrentWord(nextWord);
      setNextWord(getRandomWord());
      setInputVal('');
    } else {
      if (currentWord.startsWith(val)) {
        soundFx.playKeyClick();
      } else {
        soundFx.playError();
        setCombo(0);
      }
      setInputVal(val);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-4 animate-fadeIn" id="word-blitz-arena">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-slate-900/70 border border-slate-800/80 px-4 py-3 rounded-2xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-slate-100 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            id="blitz-exit-btn"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Arcade</span>
          </button>
          <div className="h-5 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold">⚡</span>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                Word Blitz: Combo Frenzy
              </h2>
              <p className="text-[11px] text-slate-400">45-second high-speed multiplier frenzy</p>
            </div>
          </div>
        </div>

        {/* Multiplier Badge */}
        <div className="flex items-center gap-2">
          <div
            className={`px-3 py-1 rounded-xl border flex items-center gap-1 text-xs font-mono font-black transition-all ${
              multiplier >= 4
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.6)] animate-pulse'
                : multiplier >= 2
                ? 'bg-indigo-950/80 text-indigo-300 border-indigo-700'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>{multiplier}x MULTIPLIER</span>
          </div>
        </div>
      </div>

      {/* Main Blitz HUD */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col items-center">
        {/* HUD Top Strip */}
        <div className="w-full flex items-center justify-between border-b border-slate-800/80 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-400">Time Left:</span>
            <span
              className={`font-mono font-black text-xl ${
                timeLeft <= 10 ? 'text-rose-400 animate-ping' : 'text-amber-400'
              }`}
            >
              {timeLeft}s
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-400">Score:</span>
            <span className="font-mono font-black text-xl text-slate-100">{score.toLocaleString()}</span>
          </div>

          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-400" />
            <span className="text-xs text-slate-400">Streak:</span>
            <span className="font-mono font-black text-xl text-indigo-300">{combo}</span>
          </div>
        </div>

        {/* Bonus Floating Notification */}
        {bonusNotification && (
          <div className="absolute top-16 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold font-mono text-xs animate-bounce shadow-lg">
            {bonusNotification}
          </div>
        )}

        {/* Game State Displays */}
        {gameState === 'ready' && (
          <div className="py-8 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-3xl shadow-inner">
              ⚡
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Ready for the Word Blitz?</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Clear words at maximum velocity. Every 4 consecutive words ramps up your score multiplier up to{' '}
                <strong className="text-amber-400">5x FRENZY</strong>!
              </p>
            </div>
            <button
              onClick={startBlitz}
              className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg hover:scale-105 flex items-center gap-2"
              id="blitz-start-btn"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>Start Blitz (45s)</span>
            </button>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="w-full max-w-md flex flex-col items-center gap-6 py-4">
            {/* Center Stage Word Card */}
            <div className="w-full py-8 bg-slate-950/90 border-2 border-indigo-500/30 rounded-3xl flex flex-col items-center justify-center relative shadow-inner">
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1">Target Word</span>
              <div className="text-4xl sm:text-5xl font-mono font-black text-amber-300 tracking-wider drop-shadow-md">
                {currentWord}
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <span>Next:</span>
                <span className="font-mono text-slate-300 font-semibold">{nextWord}</span>
              </div>
            </div>

            {/* Input Bar */}
            <div className="w-full relative">
              <input
                ref={inputRef}
                type="text"
                value={inputVal}
                onChange={handleInputChange}
                placeholder="Type the word..."
                autoFocus
                spellCheck={false}
                autoComplete="off"
                className="w-full px-5 py-4 bg-slate-950 border-2 border-amber-400 rounded-2xl text-center text-2xl font-mono text-slate-100 placeholder-slate-700 focus:outline-none focus:border-amber-400 shadow-inner"
                id="blitz-typing-input"
              />
            </div>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="py-6 flex flex-col items-center text-center gap-4 animate-fadeIn">
            <div className="w-16 h-16 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-400 flex items-center justify-center text-3xl shadow-inner">
              🎉
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-100">Blitz Complete!</h3>
              <p className="text-xs text-slate-400 mt-1">
                You scored <strong className="text-amber-400 font-mono text-sm">{score.toLocaleString()}</strong> points across{' '}
                <strong className="text-slate-200">{wordsCleared} words</strong>!
              </p>
            </div>

            <div className="flex items-center gap-6 py-3 px-6 bg-slate-950/70 border border-slate-800 rounded-2xl text-xs font-mono">
              <div>
                <span className="text-slate-500 block">Final Score</span>
                <span className="text-amber-400 font-bold text-base">{score.toLocaleString()}</span>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div>
                <span className="text-slate-500 block">Words Cleared</span>
                <span className="text-slate-200 font-bold text-base">{wordsCleared}</span>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div>
                <span className="text-slate-500 block">Max Multiplier</span>
                <span className="text-indigo-300 font-bold text-base">
                  {Math.min(5, 1 + Math.floor(maxCombo / 4))}x
                </span>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div>
                <span className="text-slate-500 block">XP Reward</span>
                <span className="text-emerald-400 font-bold text-base">+{Math.round(score / 20)} XP</span>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={startBlitz}
                className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Play Again</span>
              </button>
              <button
                onClick={onExit}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition-colors"
              >
                Arcade Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
