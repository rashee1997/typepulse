'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AISettings, UserProgress } from '@/types/typing';
import { WordRushGame } from '@/components/WordRushGame';
import { NitroRacerGame } from '@/components/NitroRacerGame';
import { WordBlitzGame } from '@/components/WordBlitzGame';
import { TypingDuelGame, DuelStats } from '@/components/TypingDuelGame';
import { TypingRaceGame } from '@/components/TypingRaceGame';
import { WordScrambleGame } from '@/components/WordScrambleGame';
import {
  Award,
  ChevronRight,
  Flag,
  Flame,
  Gamepad2,
  Play,
  Puzzle,
  RotateCcw,
  Sparkles,
  Swords,
  Trophy,
  Zap,
} from 'lucide-react';

interface ArcadeDashboardProps {
  userProgress: UserProgress;
  aiSettings: AISettings;
  onUpdateXp: (amount: number) => void;
  onBackToPractice: () => void;
}

type ActiveGame =
  | 'none'
  | 'nitro-racer'
  | 'word-blitz'
  | 'word-rush'
  | 'typing-duel'
  | 'typing-race'
  | 'word-scramble';

interface ArcadeScores {
  nitroWins: number;
  nitroBestWpm: number;
  blitzHighScore: number;
  blitzMaxMultiplier: number;
  rushHighScore: number;
  duelWins: number;
  duelBestWpm: number;
  raceWins: number;
  racePodiums: number;
  raceBestWpm: number;
  scrambleHighScore: number;
  scrambleWordsSolved: number;
  scrambleBestStreak: number;
  totalGamesPlayed: number;
}

export const ArcadeDashboard: React.FC<ArcadeDashboardProps> = ({
  userProgress,
  aiSettings,
  onUpdateXp,
  onBackToPractice,
}) => {
  const [activeGame, setActiveGame] = useState<ActiveGame>('none');
  const [scores, setScores] = useState<ArcadeScores>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('typepulse_arcade_stats');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {
      nitroWins: 0,
      nitroBestWpm: 0,
      blitzHighScore: 0,
      blitzMaxMultiplier: 1,
      rushHighScore: 0,
      duelWins: 0,
      duelBestWpm: 0,
      raceWins: 0,
      racePodiums: 0,
      raceBestWpm: 0,
      scrambleHighScore: 0,
      scrambleWordsSolved: 0,
      scrambleBestStreak: 0,
      totalGamesPlayed: 0,
    };
  });

  // Duel Finish Handler
  const handleDuelFinish = useCallback(
    (totalXp: number, won: boolean, stats: DuelStats) => {
      onUpdateXp(totalXp);
      setScores((prev) => {
        const updated = {
          ...prev,
          duelWins: won ? (prev.duelWins || 0) + 1 : (prev.duelWins || 0),
          duelBestWpm: Math.max(prev.duelBestWpm || 0, stats.playerWpm),
          totalGamesPlayed: prev.totalGamesPlayed + 1,
        };
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('typepulse_arcade_stats', JSON.stringify(updated));
          } catch {}
        }
        return updated;
      });
    },
    [onUpdateXp]
  );

  // Typing Race Finish Handler
  const handleRaceFinish = useCallback(
    (totalXp: number, position: number, wpm: number, _accuracy: number) => {
      onUpdateXp(totalXp);
      setScores((prev) => {
        const updated = {
          ...prev,
          raceWins: position === 1 ? (prev.raceWins || 0) + 1 : (prev.raceWins || 0),
          racePodiums: position <= 3 ? (prev.racePodiums || 0) + 1 : (prev.racePodiums || 0),
          raceBestWpm: Math.max(prev.raceBestWpm || 0, wpm),
          totalGamesPlayed: prev.totalGamesPlayed + 1,
        };
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('typepulse_arcade_stats', JSON.stringify(updated));
          } catch {}
        }
        return updated;
      });
    },
    [onUpdateXp]
  );

  // Word Scramble Finish Handler
  const handleScrambleFinish = useCallback(
    (totalXp: number, score: number, wordsSolved: number, bestStreak: number) => {
      onUpdateXp(totalXp);
      setScores((prev) => {
        const updated = {
          ...prev,
          scrambleHighScore: Math.max(prev.scrambleHighScore || 0, score),
          scrambleWordsSolved: (prev.scrambleWordsSolved || 0) + wordsSolved,
          scrambleBestStreak: Math.max(prev.scrambleBestStreak || 0, bestStreak),
          totalGamesPlayed: prev.totalGamesPlayed + 1,
        };
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('typepulse_arcade_stats', JSON.stringify(updated));
          } catch {}
        }
        return updated;
      });
    },
    [onUpdateXp]
  );

  const handleNitroFinish = useCallback(
    (score: number, won: boolean, wpm: number) => {
      const xp = Math.round(score / 8);
      onUpdateXp(xp);
      setScores((prev) => {
        const updated = {
          ...prev,
          nitroWins: won ? prev.nitroWins + 1 : prev.nitroWins,
          nitroBestWpm: Math.max(prev.nitroBestWpm, wpm),
          totalGamesPlayed: prev.totalGamesPlayed + 1,
        };
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('typepulse_arcade_stats', JSON.stringify(updated));
          } catch {}
        }
        return updated;
      });
    },
    [onUpdateXp]
  );

  const handleBlitzFinish = useCallback(
    (score: number, _words: number, maxMult: number) => {
      const xp = Math.round(score / 15);
      onUpdateXp(xp);
      setScores((prev) => {
        const updated = {
          ...prev,
          blitzHighScore: Math.max(prev.blitzHighScore, score),
          blitzMaxMultiplier: Math.max(prev.blitzMaxMultiplier, maxMult),
          totalGamesPlayed: prev.totalGamesPlayed + 1,
        };
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('typepulse_arcade_stats', JSON.stringify(updated));
          } catch {}
        }
        return updated;
      });
    },
    [onUpdateXp]
  );

  const handleRushFinish = useCallback(
    (score: number) => {
      const xp = Math.round(score / 10);
      onUpdateXp(xp);
      setScores((prev) => {
        const updated = {
          ...prev,
          rushHighScore: Math.max(prev.rushHighScore, score),
          totalGamesPlayed: prev.totalGamesPlayed + 1,
        };
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('typepulse_arcade_stats', JSON.stringify(updated));
          } catch {}
        }
        return updated;
      });
    },
    [onUpdateXp]
  );

  // Active Game Render Switches
  if (activeGame === 'typing-duel') {
    return (
      <TypingDuelGame
        userProgress={userProgress}
        aiSettings={aiSettings}
        onFinishDuel={handleDuelFinish}
        onExit={() => setActiveGame('none')}
      />
    );
  }

  if (activeGame === 'typing-race') {
    return (
      <TypingRaceGame
        onFinish={handleRaceFinish}
        onExit={() => setActiveGame('none')}
      />
    );
  }

  if (activeGame === 'word-scramble') {
    return (
      <WordScrambleGame
        onFinish={handleScrambleFinish}
        onExit={() => setActiveGame('none')}
      />
    );
  }

  if (activeGame === 'nitro-racer') {
    return (
      <NitroRacerGame
        onFinish={handleNitroFinish}
        onExit={() => setActiveGame('none')}
      />
    );
  }

  if (activeGame === 'word-blitz') {
    return (
      <WordBlitzGame
        onFinish={handleBlitzFinish}
        onExit={() => setActiveGame('none')}
      />
    );
  }

  if (activeGame === 'word-rush') {
    return (
      <WordRushGame
        onFinish={handleRushFinish}
        onExit={() => setActiveGame('none')}
      />
    );
  }

  // Otherwise, render the Arcade Games Dashboard
  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 animate-fadeIn" id="arcade-dashboard">
      {/* Arcade Header Banner */}
      <div className="relative w-full bg-gradient-to-r from-indigo-950/80 via-slate-900 to-amber-950/40 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 font-mono text-[11px] font-bold tracking-wider flex items-center gap-1">
                <Gamepad2 className="w-3 h-3" />
                ARCADE ARENA
              </span>
              <span className="text-xs text-slate-500 font-mono">Word Games & Speed Drills</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
              Arcade & Word Games
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
              Sharpen vocabulary agility, multi-car racing reflexes, and tactical anagram skills with distinct XP progression.
            </p>
          </div>

          <button
            onClick={onBackToPractice}
            className="px-4 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-slate-100 text-xs font-semibold transition-colors shrink-0"
          >
            ← Practice Arena
          </button>
        </div>

        {/* Arcade Stats Counter Strip - Comprehensive Tracking */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-6 pt-5 border-t border-slate-800/80 text-xs">
          <div className="p-2.5 bg-slate-950/60 rounded-2xl border border-slate-800/70">
            <span className="text-[10px] text-slate-500 block">Total Games</span>
            <span className="text-base font-mono font-bold text-slate-200 mt-0.5 block">
              {scores.totalGamesPlayed}
            </span>
          </div>

          <div className="p-2.5 bg-slate-950/60 rounded-2xl border border-slate-800/70">
            <span className="text-[10px] text-slate-500 block">Typing Race Wins</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-base font-mono font-bold text-amber-400">{scores.raceWins || 0}</span>
              {(scores.raceBestWpm || 0) > 0 && (
                <span className="text-[10px] text-slate-400 font-mono">({scores.raceBestWpm} WPM)</span>
              )}
            </div>
          </div>

          <div className="p-2.5 bg-slate-950/60 rounded-2xl border border-slate-800/70">
            <span className="text-[10px] text-slate-500 block">Scramble Solves</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-base font-mono font-bold text-indigo-300">
                {scores.scrambleWordsSolved || 0}
              </span>
              {(scores.scrambleHighScore || 0) > 0 && (
                <span className="text-[10px] text-slate-400 font-mono">({scores.scrambleHighScore} pts)</span>
              )}
            </div>
          </div>

          <div className="p-2.5 bg-slate-950/60 rounded-2xl border border-slate-800/70">
            <span className="text-[10px] text-slate-500 block">AI Duel Wins</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-base font-mono font-bold text-amber-400">{scores.duelWins || 0}</span>
              {(scores.duelBestWpm || 0) > 0 && (
                <span className="text-[10px] text-slate-400 font-mono">({scores.duelBestWpm} WPM)</span>
              )}
            </div>
          </div>

          <div className="p-2.5 bg-slate-950/60 rounded-2xl border border-slate-800/70">
            <span className="text-[10px] text-slate-500 block">Nitro Drag Wins</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-base font-mono font-bold text-amber-400">{scores.nitroWins}</span>
              {scores.nitroBestWpm > 0 && (
                <span className="text-[10px] text-slate-400 font-mono">({scores.nitroBestWpm} WPM)</span>
              )}
            </div>
          </div>

          <div className="p-2.5 bg-slate-950/60 rounded-2xl border border-slate-800/70">
            <span className="text-[10px] text-slate-500 block">Word Blitz PB</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-base font-mono font-bold text-emerald-400">
                {scores.blitzHighScore > 0 ? scores.blitzHighScore.toLocaleString() : '—'}
              </span>
              {scores.blitzMaxMultiplier > 1 && (
                <span className="text-[10px] text-amber-400 font-mono">({scores.blitzMaxMultiplier}x)</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Featured Mode: Typing Duel (AI Combat Arena) */}
      <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-indigo-950/40 border-2 border-amber-500/40 hover:border-amber-400 rounded-3xl p-5 sm:p-6 shadow-2xl transition-all group">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-400 flex items-center justify-center text-3xl shadow-inner shrink-0">
              ⚔️
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-mono font-bold tracking-wider uppercase flex items-center gap-1 border border-amber-400/30">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  PREMIER AI COMBAT
                </span>
                <span className="text-xs text-slate-500 font-mono">Dynamic AI Passages</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-100 group-hover:text-amber-300 transition-colors">
                Typing Duel
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl leading-relaxed">
                Step into the duel ring against 4 difficulty tiers of AI rivals (from Rookie Drone at 36 WPM to Synthetic Sovereign at 114 WPM) on dynamically generated prose. Outpace your opponent to claim victory and earn massive XP!
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400 font-mono">
                <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">4 Difficulty Tiers</span>
                <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-amber-400">Up to +1,100 XP / Win</span>
                <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-indigo-300">Live Pacing Lead Tracker</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 w-full md:w-auto shrink-0">
            <button
              onClick={() => setActiveGame('typing-duel')}
              className="w-full md:w-auto px-6 py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black rounded-xl text-sm transition-all shadow-lg hover:scale-105 flex items-center justify-center gap-2"
              id="launch-typing-duel-btn"
            >
              <Swords className="w-4 h-4 fill-slate-950" />
              <span>Enter Typing Duel</span>
            </button>
            <span className="text-[10px] text-slate-500 font-mono self-center md:self-end">
              {(scores.duelWins || 0) > 0 ? `${scores.duelWins} Duels Won • Best: ${scores.duelBestWpm} WPM` : 'Unchallenged'}
            </span>
          </div>
        </div>
      </div>

      {/* DEDICATED SECTION: WORD GAMES & INTERACTIVE DRILLS */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Puzzle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
                Word Games
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  NEW INTERACTIVE CHALLENGES
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Sharpen anagram decryption, 4-car circuit sprints, and vocabulary agility with distinct XP rewards.
              </p>
            </div>
          </div>
        </div>

        {/* Word Games 2-Column Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Challenge 1: Typing Race */}
          <div className="bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800 hover:border-amber-400/50 rounded-3xl p-6 shadow-xl flex flex-col justify-between transition-all group hover:-translate-y-1">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-400 flex items-center justify-center text-2xl shadow-inner">
                  🏎️
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[10px] font-mono font-bold">
                  4-CAR GRAND PRIX
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                Typing Race
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Compete on a multi-lane asphalt circuit against 3 AI racers. Hold high typing speed and streak combos to trigger Slipstream turbo drafting and claim the 1st Place Gold Trophy!
              </p>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-[11px] text-slate-400 font-mono">
                <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                  3 Divisions
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-amber-400">
                  Up to +550 XP
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-emerald-400">
                  Podium Rewards
                </span>
              </div>
            </div>

            <div className="mt-6 pt-2">
              <button
                onClick={() => setActiveGame('typing-race')}
                className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md hover:scale-[1.02] flex items-center justify-center gap-2"
                id="play-typing-race-btn"
              >
                <Flag className="w-4 h-4 fill-slate-950" />
                <span>Enter Typing Race</span>
              </button>
              <div className="mt-2 text-center text-[11px] text-slate-500 font-mono">
                {(scores.raceWins || 0) > 0
                  ? `${scores.raceWins} Gold Wins • ${scores.racePodiums || 0} Podiums • Best: ${scores.raceBestWpm} WPM`
                  : 'No race records yet'}
              </div>
            </div>
          </div>

          {/* Challenge 2: Word Scramble */}
          <div className="bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800 hover:border-indigo-400/50 rounded-3xl p-6 shadow-xl flex flex-col justify-between transition-all group hover:-translate-y-1">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-2xl shadow-inner">
                  🧩
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[10px] font-mono font-bold">
                  ANAGRAM DRILL
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                Word Scramble
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Test your pattern recognition and vocabulary by unscrambling randomized letter tiles. Leverage category clues, letter hints, and consecutive solve multipliers under the clock!
              </p>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-[11px] text-slate-400 font-mono">
                <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                  Sprint & Gauntlet
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-indigo-300">
                  Up to +450 XP
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-amber-400">
                  Streak Multipliers
                </span>
              </div>
            </div>

            <div className="mt-6 pt-2">
              <button
                onClick={() => setActiveGame('word-scramble')}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl text-xs transition-all shadow-md hover:scale-[1.02] flex items-center justify-center gap-2"
                id="play-word-scramble-btn"
              >
                <Puzzle className="w-4 h-4" />
                <span>Play Word Scramble</span>
              </button>
              <div className="mt-2 text-center text-[11px] text-slate-500 font-mono">
                {(scores.scrambleWordsSolved || 0) > 0
                  ? `${scores.scrambleWordsSolved} Words Solved • High Score: ${scores.scrambleHighScore.toLocaleString()} pts`
                  : 'Unscrambled: 0 words'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: SPEED & REFLEX DRILLS */}
      <div className="flex flex-col gap-4 mt-2">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-100">Speed & Reflex Drills</h2>
              <p className="text-xs text-slate-400">
                High-pressure burst typing, time-attack frenzy, and falling word orbital defense.
              </p>
            </div>
          </div>
        </div>

        {/* 3-Card Grid for Nitro Racer, Word Blitz, Word Rush */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Nitro Drag Racer */}
          <div className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 rounded-3xl p-5 shadow-xl flex flex-col justify-between transition-all group hover:-translate-y-1">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-400 flex items-center justify-center text-2xl shadow-inner">
                  🏎️
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-800/60 text-amber-300 text-[10px] font-mono font-bold">
                  HEAD-TO-HEAD
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                Nitro Drag Racer
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Sprint along a dual-lane asphalt drag strip against an AI ghost rival. Maintain a 5+ word streak to unleash blistering Nitro speed!
              </p>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">3 Difficulties</span>
                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">Nitro Boost</span>
              </div>
            </div>

            <button
              onClick={() => setActiveGame('nitro-racer')}
              className="mt-6 w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
              id="play-nitro-racer-btn"
            >
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              <span>Play Nitro Racer</span>
            </button>
          </div>

          {/* Word Blitz */}
          <div className="bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 rounded-3xl p-5 shadow-xl flex flex-col justify-between transition-all group hover:-translate-y-1">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-2xl shadow-inner">
                  ⚡
                </div>
                <span className="px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-800/60 text-indigo-300 text-[10px] font-mono font-bold">
                  TIME ATTACK
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                Word Blitz
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                A high-pressure 45-second reflex test. Stack correct words to escalate your combo multiplier up to 5x FRENZY and claim +3s time extensions.
              </p>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">45s Clock</span>
                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">5x Multiplier</span>
              </div>
            </div>

            <button
              onClick={() => setActiveGame('word-blitz')}
              className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
              id="play-word-blitz-btn"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>Launch Word Blitz</span>
            </button>
          </div>

          {/* Word Rush */}
          <div className="bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 rounded-3xl p-5 shadow-xl flex flex-col justify-between transition-all group hover:-translate-y-1">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-2xl shadow-inner">
                  🚀
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 text-[10px] font-mono font-bold">
                  SURVIVAL DEFENSE
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
                Word Rush
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Words descend through orbital space toward your defensive perimeter. Target and vaporize them before they breach the red deadline line!
              </p>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">3 Shield Lives</span>
                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">Dynamic Velocity</span>
              </div>
            </div>

            <button
              onClick={() => setActiveGame('word-rush')}
              className="mt-6 w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
              id="play-word-rush-btn"
            >
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              <span>Defend in Word Rush</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

