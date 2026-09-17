'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AISettings, UserProgress, TypingStats } from '@/types/typing';
import { WordRushGame } from '@/components/WordRushGame';
import { NitroRacerGame } from '@/components/NitroRacerGame';
import { WordBlitzGame } from '@/components/WordBlitzGame';
import { TypingDuelGame, DuelStats } from '@/components/TypingDuelGame';
import { TypingRaceGame } from '@/components/TypingRaceGame';
import { WordScrambleGame } from '@/components/WordScrambleGame';
import { DailyChallengeGame } from '@/components/DailyChallengeGame';
import { ZenMarathonGame } from '@/components/ZenMarathonGame';
import { NumericSymbolNinjaGame } from '@/components/NumericSymbolNinjaGame';
import { EchoTypingGame } from '@/components/EchoTypingGame';
import { BossGauntletGame } from '@/components/BossGauntletGame';
import { WeaknessWeaverGame } from '@/components/WeaknessWeaverGame';
import { TypingQuestGame } from '@/components/TypingQuestGame';
import { AdaptiveBossFightGame } from '@/components/AdaptiveBossFightGame';
import {
  Award,
  Binary,
  Brain,
  Calendar,
  ChevronRight,
  Compass,
  Flag,
  Flame,
  Gamepad2,
  Ghost,
  Play,
  Puzzle,
  RotateCcw,
  Skull,
  Sparkles,
  Swords,
  Trophy,
  Waves,
  Zap,
} from 'lucide-react';

interface ArcadeDashboardProps {
  userProgress: UserProgress;
  aiSettings: AISettings;
  onUpdateXp: (amount: number) => void;
  onFinishSession?: (stats: TypingStats, mode: string) => void;
  onBackToPractice: () => void;
}

type ActiveGame =
  | 'none'
  | 'nitro-racer'
  | 'word-blitz'
  | 'word-rush'
  | 'typing-duel'
  | 'typing-race'
  | 'word-scramble'
  | 'daily-challenge'
  | 'zen-marathon'
  | 'numeric-ninja'
  | 'echo-typing'
  | 'boss-gauntlet'
  | 'weakness-weaver'
  | 'typing-quest'
  | 'adaptive-boss';

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
  onFinishSession,
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

  const handleGenericSessionFinish = useCallback(
    (stats: TypingStats, mode: string) => {
      const earnedXp = Math.max(35, Math.round(stats.wpm * (stats.accuracy / 100) * 1.5));
      onUpdateXp(earnedXp);
      if (onFinishSession) {
        onFinishSession(stats, mode);
      }
      setScores((prev) => {
        const updated = {
          ...prev,
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
    [onUpdateXp, onFinishSession]
  );

  // Active Game Render Switches
  if (activeGame === 'daily-challenge') {
    return (
      <DailyChallengeGame
        userProgress={userProgress}
        onFinishSession={handleGenericSessionFinish}
        onExit={() => setActiveGame('none')}
      />
    );
  }

  if (activeGame === 'zen-marathon') {
    return (
      <ZenMarathonGame
        userProgress={userProgress}
        onFinishSession={handleGenericSessionFinish}
        onExit={() => setActiveGame('none')}
      />
    );
  }

  if (activeGame === 'numeric-ninja') {
    return (
      <NumericSymbolNinjaGame
        userProgress={userProgress}
        onFinishSession={handleGenericSessionFinish}
        onExit={() => setActiveGame('none')}
      />
    );
  }

  if (activeGame === 'echo-typing') {
    return (
      <EchoTypingGame
        userProgress={userProgress}
        onFinishSession={handleGenericSessionFinish}
        onExit={() => setActiveGame('none')}
      />
    );
  }

  if (activeGame === 'boss-gauntlet') {
    return (
      <BossGauntletGame
        userProgress={userProgress}
        onFinishSession={handleGenericSessionFinish}
        onExit={() => setActiveGame('none')}
      />
    );
  }

  if (activeGame === 'weakness-weaver') {
    return (
      <WeaknessWeaverGame
        userProgress={userProgress}
        aiSettings={aiSettings}
        onFinishSession={handleGenericSessionFinish}
        onExit={() => setActiveGame('none')}
      />
    );
  }

  if (activeGame === 'typing-quest') {
    return (
      <TypingQuestGame
        userProgress={userProgress}
        aiSettings={aiSettings}
        onFinishSession={handleGenericSessionFinish}
        onExit={() => setActiveGame('none')}
      />
    );
  }

  if (activeGame === 'adaptive-boss') {
    return (
      <AdaptiveBossFightGame
        userProgress={userProgress}
        aiSettings={aiSettings}
        onFinishSession={handleGenericSessionFinish}
        onExit={() => setActiveGame('none')}
      />
    );
  }

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
      <div className="relative w-full bg-surface border border-border rounded-3xl p-6 sm:p-7 shadow-card overflow-hidden">
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-accent-subtle border border-accent-border text-accent font-mono text-[11px] font-bold tracking-wider flex items-center gap-1">
                <Gamepad2 className="w-3 h-3" />
                ARCADE ARENA
              </span>
              <span className="text-xs text-text-subtle font-mono">Word Games & Speed Drills</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
              Arcade & Word Games
            </h1>
            <p className="text-xs sm:text-sm text-text-muted mt-1 max-w-xl">
              Sharpen vocabulary agility, multi-car racing reflexes, and tactical anagram skills with distinct XP progression.
            </p>
          </div>

          <button
            onClick={onBackToPractice}
            className="px-4 py-2 rounded-xl bg-surface-muted hover:bg-surface-hover text-text-secondary hover:text-text-primary text-xs font-semibold border border-border transition-colors shrink-0"
          >
            ← Practice Arena
          </button>
        </div>

        {/* Arcade Stats Counter Strip - Comprehensive Tracking */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-6 pt-5 border-t border-border text-xs">
          <div className="p-2.5 bg-surface-muted rounded-2xl border border-border">
            <span className="text-[10px] text-text-subtle block">Total Games</span>
            <span className="text-base font-mono font-bold text-text-primary mt-0.5 block">
              {scores.totalGamesPlayed}
            </span>
          </div>

          <div className="p-2.5 bg-surface-muted rounded-2xl border border-border">
            <span className="text-[10px] text-text-subtle block">Typing Race Wins</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-base font-mono font-bold text-accent">{scores.raceWins || 0}</span>
              {(scores.raceBestWpm || 0) > 0 && (
                <span className="text-[10px] text-text-muted font-mono">({scores.raceBestWpm} WPM)</span>
              )}
            </div>
          </div>

          <div className="p-2.5 bg-surface-muted rounded-2xl border border-border">
            <span className="text-[10px] text-text-subtle block">Scramble Solves</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-base font-mono font-bold text-primary">
                {scores.scrambleWordsSolved || 0}
              </span>
              {(scores.scrambleHighScore || 0) > 0 && (
                <span className="text-[10px] text-text-muted font-mono">({scores.scrambleHighScore} pts)</span>
              )}
            </div>
          </div>

          <div className="p-2.5 bg-surface-muted rounded-2xl border border-border">
            <span className="text-[10px] text-text-subtle block">AI Duel Wins</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-base font-mono font-bold text-accent">{scores.duelWins || 0}</span>
              {(scores.duelBestWpm || 0) > 0 && (
                <span className="text-[10px] text-text-muted font-mono">({scores.duelBestWpm} WPM)</span>
              )}
            </div>
          </div>

          <div className="p-2.5 bg-surface-muted rounded-2xl border border-border">
            <span className="text-[10px] text-text-subtle block">Nitro Drag Wins</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-base font-mono font-bold text-accent">{scores.nitroWins}</span>
              {scores.nitroBestWpm > 0 && (
                <span className="text-[10px] text-text-muted font-mono">({scores.nitroBestWpm} WPM)</span>
              )}
            </div>
          </div>

          <div className="p-2.5 bg-surface-muted rounded-2xl border border-border">
            <span className="text-[10px] text-text-subtle block">Word Blitz PB</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-base font-mono font-bold text-success">
                {scores.blitzHighScore > 0 ? scores.blitzHighScore.toLocaleString() : '—'}
              </span>
              {scores.blitzMaxMultiplier > 1 && (
                <span className="text-[10px] text-accent font-mono">({scores.blitzMaxMultiplier}x)</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Worldwide Daily Challenge Banner */}
      <div className="bg-gradient-to-r from-amber-500/15 via-indigo-500/10 to-surface border-2 border-amber-500/30 hover:border-amber-500/50 rounded-3xl p-5 sm:p-6 shadow-card transition-all group">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center text-3xl shadow-glow-accent-sm shrink-0">
              📅
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-mono font-bold tracking-wider uppercase flex items-center gap-1 border border-amber-500/30">
                  <Calendar className="w-3 h-3 text-amber-400" />
                  WORLDWIDE DAILY CHALLENGE
                </span>
                <span className="text-xs text-text-subtle font-mono">Synchronized Global Passage</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-text-primary group-hover:text-amber-400 transition-colors">
                Today&apos;s Daily Challenge
              </h2>
              <p className="text-xs sm:text-sm text-text-muted mt-1 max-w-xl leading-relaxed">
                Test yourself against today&apos;s worldwide synchronized literature passage. Maintain your daily streak, beat the target WPM threshold, and earn daily gold honors!
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-text-muted font-mono">
                <span className="px-2 py-0.5 rounded-lg bg-surface-muted border border-border text-amber-400 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400" /> Daily Streak Protected
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-surface-muted border border-border text-text-secondary">
                  Accuracy Medal Tiers
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-surface-muted border border-border text-accent">
                  +400 Bonus XP
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 w-full md:w-auto shrink-0">
            <button
              onClick={() => setActiveGame('daily-challenge')}
              className="w-full md:w-auto px-6 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-sm transition-all shadow-glow-accent-sm hover:scale-105 flex items-center justify-center gap-2"
              id="launch-daily-challenge-btn"
            >
              <Calendar className="w-4 h-4 text-slate-950" />
              <span>Launch Daily Challenge</span>
            </button>
          </div>
        </div>
      </div>

      {/* Featured Mode: Typing Duel (AI Combat Arena) */}
      <div className="bg-surface border-2 border-accent-border hover:border-accent rounded-3xl p-5 sm:p-6 shadow-card transition-all group">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-accent-subtle border border-accent-border text-accent flex items-center justify-center text-3xl shadow-glow-accent-sm shrink-0">
              ⚔️
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-full bg-accent-subtle text-accent text-[10px] font-mono font-bold tracking-wider uppercase flex items-center gap-1 border border-accent-border">
                  <Sparkles className="w-3 h-3 text-accent" />
                  PREMIER AI COMBAT
                </span>
                <span className="text-xs text-text-subtle font-mono">Dynamic AI Passages</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-text-primary group-hover:text-accent transition-colors">
                Typing Duel
              </h2>
              <p className="text-xs sm:text-sm text-text-muted mt-1 max-w-xl leading-relaxed">
                Step into the duel ring against 4 difficulty tiers of AI rivals (from Rookie Drone at 36 WPM to Synthetic Sovereign at 114 WPM) on dynamically generated prose. Outpace your opponent to claim victory and earn massive XP!
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-text-muted font-mono">
                <span className="px-2 py-0.5 rounded-lg bg-surface-muted border border-border text-text-secondary">4 Difficulty Tiers</span>
                <span className="px-2 py-0.5 rounded-lg bg-surface-muted border border-border text-accent">Up to +1,100 XP / Win</span>
                <span className="px-2 py-0.5 rounded-lg bg-surface-muted border border-border text-primary">Live Pacing Lead Tracker</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 w-full md:w-auto shrink-0">
            <button
              onClick={() => setActiveGame('typing-duel')}
              className="w-full md:w-auto px-6 py-3.5 bg-accent hover:bg-accent-hover text-accent-foreground font-black rounded-xl text-sm transition-all shadow-glow-accent-sm hover:scale-105 flex items-center justify-center gap-2"
              id="launch-typing-duel-btn"
            >
              <Swords className="w-4 h-4 fill-accent-foreground" />
              <span>Enter Typing Duel</span>
            </button>
            <span className="text-[10px] text-text-subtle font-mono self-center md:self-end">
              {(scores.duelWins || 0) > 0 ? `${scores.duelWins} Duels Won • Best: ${scores.duelBestWpm} WPM` : 'Unchallenged'}
            </span>
          </div>
        </div>
      </div>

      {/* AI Intelligence & Narrative Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Weakness Weaver */}
        <div className="bg-surface border border-border hover:border-fuchsia-500/50 rounded-3xl p-5 shadow-card flex flex-col justify-between transition-all group hover:-translate-y-1">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center text-2xl shadow-inner">
                🧠
              </div>
              <span className="px-2 py-0.5 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 text-[10px] font-mono font-bold">
                ADAPTIVE DRILL
              </span>
            </div>

            <h3 className="text-base font-bold text-text-primary group-hover:text-fuchsia-400 transition-colors">
              Weakness Weaver
            </h3>
            <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
              Analyzes your statistical bigram and trigram latency hesitations to weave custom drills targeting your exact muscle memory bottlenecks.
            </p>

            <div className="mt-4 pt-3 border-t border-border flex items-center gap-2 text-[11px] text-text-muted font-mono">
              <span className="px-2 py-0.5 rounded bg-surface-muted border border-border text-text-secondary">EWMA N-Gram Tracking</span>
              <span className="px-2 py-0.5 rounded bg-surface-muted border border-border text-fuchsia-400">Targeted Feedback</span>
            </div>
          </div>

          <button
            onClick={() => setActiveGame('weakness-weaver')}
            className="mt-6 w-full py-2.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
            id="play-weakness-weaver-btn"
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Launch Weaver</span>
          </button>
        </div>

        {/* Typing Quest RPG */}
        <div className="bg-surface border border-border hover:border-emerald-500/50 rounded-3xl p-5 shadow-card flex flex-col justify-between transition-all group hover:-translate-y-1">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl shadow-inner">
                🧭
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
                CYBERPUNK RPG
              </span>
            </div>

            <h3 className="text-base font-bold text-text-primary group-hover:text-emerald-400 transition-colors">
              Typing Quest
            </h3>
            <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
              An interactive narrative adventure where your keystroke velocity and accuracy determine whether you bypass neural firewalls or trigger sentries.
            </p>

            <div className="mt-4 pt-3 border-t border-border flex items-center gap-2 text-[11px] text-text-muted font-mono">
              <span className="px-2 py-0.5 rounded bg-surface-muted border border-border text-text-secondary">Branching Routes</span>
              <span className="px-2 py-0.5 rounded bg-surface-muted border border-border text-emerald-400">Inventory & Vitality</span>
            </div>
          </div>

          <button
            onClick={() => setActiveGame('typing-quest')}
            className="mt-6 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
            id="play-typing-quest-btn"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Embark on Quest</span>
          </button>
        </div>

        {/* Adaptive Boss Fight */}
        <div className="bg-surface border border-border hover:border-purple-500/50 rounded-3xl p-5 shadow-card flex flex-col justify-between transition-all group hover:-translate-y-1">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center text-2xl shadow-inner">
                👑
              </div>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-mono font-bold">
                BOSS SHOWDOWN
              </span>
            </div>

            <h3 className="text-base font-bold text-text-primary group-hover:text-purple-400 transition-colors">
              Adaptive Boss Arena
            </h3>
            <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
              Face the Synthetic Sovereign in a reactive combat arena featuring dynamic trash talk banter and attacks targeting your weakest keys.
            </p>

            <div className="mt-4 pt-3 border-t border-border flex items-center gap-2 text-[11px] text-text-muted font-mono">
              <span className="px-2 py-0.5 rounded bg-surface-muted border border-border text-text-secondary">Reactive Banter</span>
              <span className="px-2 py-0.5 rounded bg-surface-muted border border-border text-purple-400">114 WPM Benchmark</span>
            </div>
          </div>

          <button
            onClick={() => setActiveGame('adaptive-boss')}
            className="mt-6 w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
            id="play-adaptive-boss-btn"
          >
            <Skull className="w-3.5 h-3.5" />
            <span>Enter Boss Arena</span>
          </button>
        </div>
      </div>

      {/* DEDICATED SECTION: WORD GAMES & INTERACTIVE DRILLS */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-primary-subtle text-primary border border-primary-border">
              <Puzzle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-black text-text-primary flex items-center gap-2">
                Word Games
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary-subtle text-primary border border-primary-border">
                  NEW INTERACTIVE CHALLENGES
                </span>
              </h2>
              <p className="text-xs text-text-muted">
                Sharpen anagram decryption, 4-car circuit sprints, and vocabulary agility with distinct XP rewards.
              </p>
            </div>
          </div>
        </div>

        {/* Word Games 2-Column Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Challenge 1: Typing Race */}
          <div className="bg-surface border border-border hover:border-accent-border rounded-3xl p-6 shadow-card flex flex-col justify-between transition-all group hover:-translate-y-1">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-accent-subtle border border-accent-border text-accent flex items-center justify-center text-2xl shadow-inner">
                  🏎️
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-accent-subtle border border-accent-border text-accent text-[10px] font-mono font-bold">
                  4-CAR GRAND PRIX
                </span>
              </div>

              <h3 className="text-lg font-bold text-text-primary group-hover:text-accent transition-colors">
                Typing Race
              </h3>
              <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                Compete on a multi-lane asphalt circuit against 3 AI racers. Hold high typing speed and streak combos to trigger Slipstream turbo drafting and claim the 1st Place Gold Trophy!
              </p>

              <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center gap-2 text-[11px] text-text-muted font-mono">
                <span className="px-2 py-0.5 rounded-lg bg-surface-muted border border-border text-text-secondary">
                  3 Divisions
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-surface-muted border border-border text-accent">
                  Up to +550 XP
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-surface-muted border border-border text-success">
                  Podium Rewards
                </span>
              </div>
            </div>

            <div className="mt-6 pt-2">
              <button
                onClick={() => setActiveGame('typing-race')}
                className="w-full py-3 bg-accent hover:bg-accent-hover text-accent-foreground font-black rounded-xl text-xs transition-all shadow-glow-accent-sm hover:scale-[1.02] flex items-center justify-center gap-2"
                id="play-typing-race-btn"
              >
                <Flag className="w-4 h-4 fill-accent-foreground" />
                <span>Enter Typing Race</span>
              </button>
              <div className="mt-2 text-center text-[11px] text-text-subtle font-mono">
                {(scores.raceWins || 0) > 0
                  ? `${scores.raceWins} Gold Wins • ${scores.racePodiums || 0} Podiums • Best: ${scores.raceBestWpm} WPM`
                  : 'No race records yet'}
              </div>
            </div>
          </div>

          {/* Challenge 2: Word Scramble */}
          <div className="bg-surface border border-border hover:border-primary-border rounded-3xl p-6 shadow-card flex flex-col justify-between transition-all group hover:-translate-y-1">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-subtle border border-primary-border text-primary flex items-center justify-center text-2xl shadow-inner">
                  🧩
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-primary-subtle border border-primary-border text-primary text-[10px] font-mono font-bold">
                  ANAGRAM DRILL
                </span>
              </div>

              <h3 className="text-lg font-bold text-text-primary group-hover:text-primary transition-colors">
                Word Scramble
              </h3>
              <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                Test your pattern recognition and vocabulary by unscrambling randomized letter tiles. Leverage category clues, letter hints, and consecutive solve multipliers under the clock!
              </p>

              <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center gap-2 text-[11px] text-text-muted font-mono">
                <span className="px-2 py-0.5 rounded-lg bg-surface-muted border border-border text-text-secondary">
                  Sprint & Gauntlet
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-surface-muted border border-border text-primary">
                  Up to +450 XP
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-surface-muted border border-border text-accent">
                  Streak Multipliers
                </span>
              </div>
            </div>

            <div className="mt-6 pt-2">
              <button
                onClick={() => setActiveGame('word-scramble')}
                className="w-full py-3 bg-primary hover:bg-primary-hover text-primary-foreground font-black rounded-xl text-xs transition-all shadow-md hover:scale-[1.02] flex items-center justify-center gap-2"
                id="play-word-scramble-btn"
              >
                <Puzzle className="w-4 h-4" />
                <span>Play Word Scramble</span>
              </button>
              <div className="mt-2 text-center text-[11px] text-text-subtle font-mono">
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
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-accent-subtle text-accent border border-accent-border">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-black text-text-primary">Speed & Reflex Drills</h2>
              <p className="text-xs text-text-muted">
                High-pressure burst typing, time-attack frenzy, and falling word orbital defense.
              </p>
            </div>
          </div>
        </div>

        {/* 4-Card Grid for Nitro Racer, Word Blitz, Word Rush, Boss Gauntlet */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Boss Gauntlet */}
          <div className="bg-surface border border-border hover:border-red-500/50 rounded-3xl p-5 shadow-card flex flex-col justify-between transition-all group hover:-translate-y-1">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center text-2xl shadow-inner">
                  👹
                </div>
                <span className="px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-mono font-bold">
                  3-STAGE SURVIVAL
                </span>
              </div>

              <h3 className="text-base font-bold text-text-primary group-hover:text-red-400 transition-colors">
                Boss Gauntlet
              </h3>
              <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                Fight through 3 consecutive bosses of escalating speeds with a shared health pool. Deal critical damage through high-accuracy bursts!
              </p>

              <div className="mt-4 pt-3 border-t border-border flex items-center gap-2 text-[11px] text-text-muted font-mono">
                <span className="px-2 py-0.5 rounded bg-surface-muted border border-border text-text-secondary">3 Boss Stages</span>
                <span className="px-2 py-0.5 rounded bg-surface-muted border border-border text-red-400">Critical Strikes</span>
              </div>
            </div>

            <button
              onClick={() => setActiveGame('boss-gauntlet')}
              className="mt-6 w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
              id="play-boss-gauntlet-btn"
            >
              <Skull className="w-3.5 h-3.5" />
              <span>Enter Gauntlet</span>
            </button>
          </div>

          {/* Nitro Drag Racer */}
          <div className="bg-surface border border-border hover:border-accent-border rounded-3xl p-5 shadow-card flex flex-col justify-between transition-all group hover:-translate-y-1">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-accent-subtle border border-accent-border text-accent flex items-center justify-center text-2xl shadow-inner">
                  🏎️
                </div>
                <span className="px-2 py-0.5 rounded-full bg-accent-subtle border border-accent-border text-accent text-[10px] font-mono font-bold">
                  HEAD-TO-HEAD
                </span>
              </div>

              <h3 className="text-base font-bold text-text-primary group-hover:text-accent transition-colors">
                Nitro Drag Racer
              </h3>
              <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                Sprint along a dual-lane asphalt drag strip against an AI ghost rival. Maintain a 5+ word streak to unleash blistering Nitro speed!
              </p>

              <div className="mt-4 pt-3 border-t border-border flex items-center gap-2 text-[11px] text-text-muted font-mono">
                <span className="px-2 py-0.5 rounded bg-surface-muted border border-border text-text-secondary">3 Difficulties</span>
                <span className="px-2 py-0.5 rounded bg-surface-muted border border-border text-accent">Nitro Boost</span>
              </div>
            </div>

            <button
              onClick={() => setActiveGame('nitro-racer')}
              className="mt-6 w-full py-2.5 bg-accent hover:bg-accent-hover text-accent-foreground font-bold rounded-xl text-xs transition-all shadow-glow-accent-sm flex items-center justify-center gap-1.5"
              id="play-nitro-racer-btn"
            >
              <Play className="w-3.5 h-3.5 fill-accent-foreground" />
              <span>Play Nitro Racer</span>
            </button>
          </div>

          {/* Word Blitz */}
          <div className="bg-surface border border-border hover:border-primary-border rounded-3xl p-5 shadow-card flex flex-col justify-between transition-all group hover:-translate-y-1">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-subtle border border-primary-border text-primary flex items-center justify-center text-2xl shadow-inner">
                  ⚡
                </div>
                <span className="px-2 py-0.5 rounded-full bg-primary-subtle border border-primary-border text-primary text-[10px] font-mono font-bold">
                  TIME ATTACK
                </span>
              </div>

              <h3 className="text-base font-bold text-text-primary group-hover:text-primary transition-colors">
                Word Blitz
              </h3>
              <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                A high-pressure 45-second reflex test. Stack correct words to escalate your combo multiplier up to 5x FRENZY and claim +3s time extensions.
              </p>

              <div className="mt-4 pt-3 border-t border-border flex items-center gap-2 text-[11px] text-text-muted font-mono">
                <span className="px-2 py-0.5 rounded bg-surface-muted border border-border text-text-secondary">45s Clock</span>
                <span className="px-2 py-0.5 rounded bg-surface-muted border border-border text-primary">5x Multiplier</span>
              </div>
            </div>

            <button
              onClick={() => setActiveGame('word-blitz')}
              className="mt-6 w-full py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
              id="play-word-blitz-btn"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>Launch Word Blitz</span>
            </button>
          </div>

          {/* Word Rush */}
          <div className="bg-surface border border-border hover:border-success-border rounded-3xl p-5 shadow-card flex flex-col justify-between transition-all group hover:-translate-y-1">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-success-subtle border border-success-border text-success flex items-center justify-center text-2xl shadow-inner">
                  🚀
                </div>
                <span className="px-2 py-0.5 rounded-full bg-success-subtle border border-success-border text-success text-[10px] font-mono font-bold">
                  SURVIVAL DEFENSE
                </span>
              </div>

              <h3 className="text-base font-bold text-text-primary group-hover:text-success transition-colors">
                Word Rush
              </h3>
              <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                Words descend through orbital space toward your defensive perimeter. Target and vaporize them before they breach the red deadline line!
              </p>

              <div className="mt-4 pt-3 border-t border-border flex items-center gap-2 text-[11px] text-text-muted font-mono">
                <span className="px-2 py-0.5 rounded bg-surface-muted border border-border text-text-secondary">3 Shield Lives</span>
                <span className="px-2 py-0.5 rounded bg-surface-muted border border-border text-success">Dynamic Velocity</span>
              </div>
            </div>

            <button
              onClick={() => setActiveGame('word-rush')}
              className="mt-6 w-full py-2.5 bg-success hover:bg-success/90 text-success-foreground font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
              id="play-word-rush-btn"
            >
              <Play className="w-3.5 h-3.5 fill-success-foreground" />
              <span>Defend in Word Rush</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION: PRECISION, RHYTHM & ENDURANCE */}
      <div className="flex flex-col gap-4 mt-2">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Waves className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-black text-text-primary">Precision, Rhythm & Endurance</h2>
              <p className="text-xs text-text-muted">
                Ghost velocity pacing, specialized numeric and symbol drills, and endless ambient flow.
              </p>
            </div>
          </div>
        </div>

        {/* 3-Card Grid for Echo Typing, Numeric Ninja, Zen Marathon */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Echo Typing */}
          <div className="bg-surface border border-border hover:border-cyan-500/50 rounded-3xl p-5 shadow-card flex flex-col justify-between transition-all group hover:-translate-y-1">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center text-2xl shadow-inner">
                  👻
                </div>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-mono font-bold">
                  PACER MODE
                </span>
              </div>

              <h3 className="text-base font-bold text-text-primary group-hover:text-cyan-400 transition-colors">
                Echo Typing
              </h3>
              <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                Race against a ghost caret paced at your target velocity or past personal best. Train consistent cadence and eliminate micro-pauses.
              </p>

              <div className="mt-4 pt-3 border-t border-border flex items-center gap-2 text-[11px] text-text-muted font-mono">
                <span className="px-2 py-0.5 rounded bg-surface-muted border border-border text-text-secondary">Custom Target WPM</span>
                <span className="px-2 py-0.5 rounded bg-surface-muted border border-border text-cyan-400">Live Delta Gauge</span>
              </div>
            </div>

            <button
              onClick={() => setActiveGame('echo-typing')}
              className="mt-6 w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
              id="play-echo-typing-btn"
            >
              <Ghost className="w-3.5 h-3.5" />
              <span>Launch Echo Pacer</span>
            </button>
          </div>

          {/* Numeric & Symbol Ninja */}
          <div className="bg-surface border border-border hover:border-amber-500/50 rounded-3xl p-5 shadow-card flex flex-col justify-between transition-all group hover:-translate-y-1">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-2xl shadow-inner">
                  🔢
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-mono font-bold">
                  SPECIALIZED DRILL
                </span>
              </div>

              <h3 className="text-base font-bold text-text-primary group-hover:text-amber-400 transition-colors">
                Numeric & Symbol Ninja
              </h3>
              <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                Master programming brackets, mathematical expressions, financial currencies, and number pad precision without looking down.
              </p>

              <div className="mt-4 pt-3 border-t border-border flex items-center gap-2 text-[11px] text-text-muted font-mono">
                <span className="px-2 py-0.5 rounded bg-surface-muted border border-border text-text-secondary">4 Focus Categories</span>
                <span className="px-2 py-0.5 rounded bg-surface-muted border border-border text-amber-400">Code Syntax</span>
              </div>
            </div>

            <button
              onClick={() => setActiveGame('numeric-ninja')}
              className="mt-6 w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
              id="play-numeric-ninja-btn"
            >
              <Binary className="w-3.5 h-3.5" />
              <span>Train Symbols</span>
            </button>
          </div>

          {/* Zen Marathon */}
          <div className="bg-surface border border-border hover:border-teal-500/50 rounded-3xl p-5 shadow-card flex flex-col justify-between transition-all group hover:-translate-y-1">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center text-2xl shadow-inner">
                  🌊
                </div>
                <span className="px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[10px] font-mono font-bold">
                  FLOW STATE
                </span>
              </div>

              <h3 className="text-base font-bold text-text-primary group-hover:text-teal-400 transition-colors">
                Zen Marathon
              </h3>
              <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                Zero timers, zero countdowns, zero pressure. Stream endless literature and philosophy passages with gentle rhythm flow tracking.
              </p>

              <div className="mt-4 pt-3 border-t border-border flex items-center gap-2 text-[11px] text-text-muted font-mono">
                <span className="px-2 py-0.5 rounded bg-surface-muted border border-border text-text-secondary">Infinite Text Stream</span>
                <span className="px-2 py-0.5 rounded bg-surface-muted border border-border text-teal-400">Flow Rating</span>
              </div>
            </div>

            <button
              onClick={() => setActiveGame('zen-marathon')}
              className="mt-6 w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
              id="play-zen-marathon-btn"
            >
              <Waves className="w-3.5 h-3.5" />
              <span>Enter Zen Flow</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

