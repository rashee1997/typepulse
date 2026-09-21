'use client';

import React, { useState, useCallback } from 'react';
import { AISettings, UserProgress, TypingStats, ArcadeScores } from '@/types/typing';
import { buildArcadeTypingStats, recordArcadeGameResult } from '@/lib/progress-service';

/** Raw measurements a game hands back when a run ends. */
type ArcadeRun = { correctKeys: number; totalKeys: number; elapsedSeconds: number; accuracy?: number };
import { TypingRaceGame } from '@/components/TypingRaceGame';
import { OrbitalDefenseGame } from '@/components/OrbitalDefenseGame';
import { BombDefusalGame } from '@/components/BombDefusalGame';
import { WordBlitzGame } from '@/components/WordBlitzGame';
import { DailyChallengeGame } from '@/components/DailyChallengeGame';
import { TypingDuelGame, DuelStats } from '@/components/TypingDuelGame';
import { NumericSymbolNinjaGame } from '@/components/NumericSymbolNinjaGame';
import { ZenMarathonGame } from '@/components/ZenMarathonGame';
import { WeaknessWeaverGame } from '@/components/WeaknessWeaverGame';
import { BossGauntletGame } from '@/components/BossGauntletGame';
import { StoryStreamGame } from '@/components/StoryStreamGame';
import { CodePulseGame } from '@/components/CodePulseGame';
import {
  Calendar,
  ChevronRight,
  Crosshair,
  Flame,
  Gamepad2,
  Play,
  RotateCcw,
  Sparkles,
  Swords,
  Trophy,
  Zap,
  Bomb,
  Radio,
  Timer,
  Brain,
  Binary,
  Waves,
  Skull,
  ShieldAlert,
  BookOpen,
  Code2,
  Ghost,
  Shield,
} from 'lucide-react';

interface ArcadeDashboardProps {
  userProgress: UserProgress;
  aiSettings: AISettings;
  onUpdateXp: (amount: number) => void;
  onFinishSession?: (stats: TypingStats, mode: string) => void;
  onProgressUpdate?: (updated: UserProgress) => void;
  onBackToPractice: () => void;
  onOpenGhostDuel?: () => void;
  onOpenMasteryPass?: () => void;
  onOpenCodeClimber?: () => void;
}

type ActiveGame =
  | 'none'
  | 'typing-race'
  | 'orbital-defense'
  | 'bomb-defusal'
  | 'word-blitz'
  | 'daily-challenge'
  | 'typing-duel'
  | 'numeric-ninja'
  | 'zen-marathon'
  | 'weakness-weaver'
  | 'boss-gauntlet'
  | 'story-stream'
  | 'code-pulse';

export const ArcadeDashboard: React.FC<ArcadeDashboardProps> = ({
  userProgress,
  aiSettings,
  onUpdateXp,
  onFinishSession,
  onProgressUpdate,
  onBackToPractice,
  onOpenGhostDuel,
  onOpenMasteryPass,
  onOpenCodeClimber,
}) => {
  const [activeGame, setActiveGame] = useState<ActiveGame>('none');
  const [showSpecializedDrills, setShowSpecializedDrills] = useState(false);

  const INITIAL_ARCADE_SCORES: ArcadeScores = {
    raceWins: 0,
    racePodiums: 0,
    raceBestWpm: 0,
    orbitalHighScore: 0,
    orbitalWordsDestroyed: 0,
    bombDefusalHighScore: 0,
    bombsDefusedTotal: 0,
    blitzHighScore: 0,
    blitzMaxMultiplier: 1,
    duelWins: 0,
    duelBestWpm: 0,
    totalGamesPlayed: 0,
  };

  const scores = userProgress.arcadeStats || INITIAL_ARCADE_SCORES;

  // Grand Prix Race Finish
  const handleRaceFinish = useCallback(
    (totalXp: number, position: number, wpm: number, accuracy: number, run: ArcadeRun) => {
      const isWon = position === 1;
      const isPodium = position <= 3;
      const res = recordArcadeGameResult('nitro-racer', 'Nitro Racer GP', {
        score: Math.round(wpm * 10),
        wpm,
        accuracy,
        elapsedSeconds: run.elapsedSeconds,
        won: isWon,
        podium: isPodium,
      }, userProgress);

      if (onProgressUpdate) {
        onProgressUpdate(res.updatedProgress);
      } else {
        onUpdateXp(res.xpEarned);
      }
    },
    [onProgressUpdate, onUpdateXp, userProgress]
  );

  // Orbital Laser Defense Finish
  const handleOrbitalFinish = useCallback(
    (score: number, wordsDestroyed: number, accuracy: number, run: ArcadeRun) => {
      const res = recordArcadeGameResult('orbital-defense', 'Orbital Defense', {
        score,
        wordsDestroyed,
        accuracy,
        elapsedSeconds: run.elapsedSeconds,
      }, userProgress);

      if (onProgressUpdate) {
        onProgressUpdate(res.updatedProgress);
      } else {
        onUpdateXp(res.xpEarned);
      }
    },
    [onProgressUpdate, onUpdateXp, userProgress]
  );

  // Bomb Defusal Finish
  const handleBombDefusalFinish = useCallback(
    (score: number, bombsDefused: number, accuracy: number, run: ArcadeRun) => {
      const res = recordArcadeGameResult('bomb-defusal', 'Bomb Defusal', {
        score,
        bombsDefused,
        accuracy,
        elapsedSeconds: run.elapsedSeconds,
      }, userProgress);

      if (onProgressUpdate) {
        onProgressUpdate(res.updatedProgress);
      } else {
        onUpdateXp(res.xpEarned);
      }
    },
    [onProgressUpdate, onUpdateXp, userProgress]
  );

  // Word Blitz Finish
  const handleBlitzFinish = useCallback(
    (score: number, words: number, maxMult: number, run: ArcadeRun) => {
      const res = recordArcadeGameResult('word-blitz', 'Word Blitz', {
        score,
        multiplier: maxMult,
        accuracy: run.accuracy ?? (run.totalKeys > 0 ? Math.round((run.correctKeys / run.totalKeys) * 1000) / 10 : 100),
        elapsedSeconds: run.elapsedSeconds,
      }, userProgress);

      if (onProgressUpdate) {
        onProgressUpdate(res.updatedProgress);
      } else {
        onUpdateXp(res.xpEarned);
      }
    },
    [onProgressUpdate, onUpdateXp, userProgress]
  );

  // Typing Duel Finish
  const handleDuelFinish = useCallback(
    (totalXp: number, won: boolean, stats: DuelStats) => {
      const res = recordArcadeGameResult('typing-duel', 'Typing Duel', {
        score: Math.round(stats.playerWpm * 10),
        wpm: stats.playerWpm,
        accuracy: stats.accuracy,
        elapsedSeconds: stats.elapsedSeconds,
        won,
      }, userProgress);

      if (onProgressUpdate) {
        onProgressUpdate(res.updatedProgress);
      } else {
        onUpdateXp(res.xpEarned);
      }
    },
    [onProgressUpdate, onUpdateXp, userProgress]
  );

  // Generic Session Finish (for drills & gauntlets)
  const handleGenericSessionFinish = useCallback(
    (stats: TypingStats, mode: string) => {
      const res = recordArcadeGameResult(mode, mode, {
        score: Math.round(stats.wpm * 10),
        wpm: stats.wpm,
        accuracy: stats.accuracy,
        elapsedSeconds: stats.elapsedSeconds,
      }, userProgress);

      if (onProgressUpdate) {
        onProgressUpdate(res.updatedProgress);
      } else {
        onUpdateXp(res.xpEarned);
      }
      if (onFinishSession) {
        onFinishSession(stats, mode);
      }
    },
    [onProgressUpdate, onUpdateXp, onFinishSession, userProgress]
  );

  // Active Game Render Switches
  if (activeGame === 'typing-race') {
    return <TypingRaceGame onFinish={handleRaceFinish} onExit={() => setActiveGame('none')} />;
  }

  if (activeGame === 'orbital-defense') {
    return <OrbitalDefenseGame onFinish={handleOrbitalFinish} onExit={() => setActiveGame('none')} />;
  }

  if (activeGame === 'bomb-defusal') {
    return <BombDefusalGame onFinish={handleBombDefusalFinish} onExit={() => setActiveGame('none')} />;
  }

  if (activeGame === 'word-blitz') {
    return <WordBlitzGame onFinish={handleBlitzFinish} onExit={() => setActiveGame('none')} />;
  }

  if (activeGame === 'daily-challenge') {
    return (
      <DailyChallengeGame
        userProgress={userProgress}
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

  if (activeGame === 'numeric-ninja') {
    return (
      <NumericSymbolNinjaGame
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

  if (activeGame === 'boss-gauntlet') {
    return (
      <BossGauntletGame
        userProgress={userProgress}
        aiSettings={aiSettings}
        onFinishSession={handleGenericSessionFinish}
        onExit={() => setActiveGame('none')}
      />
    );
  }

  if (activeGame === 'story-stream') {
    return (
      <StoryStreamGame
        userProgress={userProgress}
        aiSettings={aiSettings}
        onFinishSession={handleGenericSessionFinish}
        onExit={() => setActiveGame('none')}
      />
    );
  }

  if (activeGame === 'code-pulse') {
    return (
      <CodePulseGame
        userProgress={userProgress}
        aiSettings={aiSettings}
        onFinishSession={handleGenericSessionFinish}
        onExit={() => setActiveGame('none')}
      />
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 animate-fadeIn pb-12" id="arcade-arena">
      {/* Top Banner & Header */}
      <div className="relative w-full bg-surface border border-border rounded-3xl p-6 sm:p-7 shadow-card overflow-hidden">
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-accent-subtle border border-accent-border text-accent font-mono text-[11px] font-bold tracking-wider flex items-center gap-1">
                <Gamepad2 className="w-3 h-3" />
                ARCADE ARENA
              </span>
              <span className="text-xs text-text-subtle font-mono">Curated Typing Action</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
              Action Arcade
            </h1>
            <p className="text-xs sm:text-sm text-text-muted mt-1 max-w-xl">
              High-velocity, confusion-free typing challenges with immediate tactile feedback, crisp audio cues, and XP rewards.
            </p>
          </div>

          <button
            onClick={onBackToPractice}
            className="px-4 py-2 rounded-xl bg-surface-muted hover:bg-surface-hover text-text-secondary hover:text-text-primary text-xs font-semibold border border-border transition-colors shrink-0 cursor-pointer"
          >
            ← Practice Arena
          </button>
        </div>

        {/* Global Telemetry Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-6 pt-5 border-t border-border text-xs">
          <div className="p-2.5 bg-surface-muted rounded-2xl border border-border">
            <span className="text-[10px] text-text-subtle block">Total Played</span>
            <span className="text-base font-mono font-bold text-text-primary mt-0.5 block">
              {scores.totalGamesPlayed}
            </span>
          </div>

          <div className="p-2.5 bg-surface-muted rounded-2xl border border-border">
            <span className="text-[10px] text-text-subtle block">Grand Prix Wins</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-base font-mono font-bold text-accent">{scores.raceWins || 0}</span>
              {(scores.raceBestWpm || 0) > 0 && (
                <span className="text-[10px] text-text-muted font-mono">({scores.raceBestWpm} WPM)</span>
              )}
            </div>
          </div>

          <div className="p-2.5 bg-surface-muted rounded-2xl border border-border">
            <span className="text-[10px] text-text-subtle block">Orbital Defense PB</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-base font-mono font-bold text-cyan-400">
                {scores.orbitalHighScore > 0 ? scores.orbitalHighScore.toLocaleString() : '—'}
              </span>
            </div>
          </div>

          <div className="p-2.5 bg-surface-muted rounded-2xl border border-border">
            <span className="text-[10px] text-text-subtle block">Bombs Defused</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-base font-mono font-bold text-amber-400">
                {scores.bombsDefusedTotal || 0}
              </span>
              {(scores.bombDefusalHighScore || 0) > 0 && (
                <span className="text-[10px] text-text-muted font-mono">({scores.bombDefusalHighScore} pts)</span>
              )}
            </div>
          </div>

          <div className="p-2.5 bg-surface-muted rounded-2xl border border-border">
            <span className="text-[10px] text-text-subtle block">Word Blitz PB</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-base font-mono font-bold text-success">
                {scores.blitzHighScore > 0 ? scores.blitzHighScore.toLocaleString() : '—'}
              </span>
            </div>
          </div>

          <div className="p-2.5 bg-surface-muted rounded-2xl border border-border">
            <span className="text-[10px] text-text-subtle block">AI Duel Wins</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-base font-mono font-bold text-primary">{scores.duelWins || 0}</span>
              {(scores.duelBestWpm || 0) > 0 && (
                <span className="text-[10px] text-text-muted font-mono">({scores.duelBestWpm} WPM)</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Featured Global Synchronized Event: Worldwide Daily Challenge */}
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
                <span className="text-xs text-text-subtle font-mono">Synchronized Literature Passage</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-text-primary group-hover:text-amber-400 transition-colors">
                Today&apos;s Daily Challenge
              </h2>
              <p className="text-xs sm:text-sm text-text-muted mt-1 max-w-xl leading-relaxed">
                Test yourself against today&apos;s worldwide synchronized literature passage. Maintain your daily streak, beat the target WPM threshold, and earn daily gold honors!
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-text-muted font-mono">
                <span className="px-2 py-0.5 rounded-lg bg-surface-muted border border-border text-amber-400 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400" /> Streak Protected
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
              className="w-full md:w-auto px-6 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-sm transition-all shadow-glow-accent-sm hover:scale-105 flex items-center justify-center gap-2 cursor-pointer"
              id="launch-daily-challenge-btn"
            >
              <Calendar className="w-4 h-4 text-slate-950" />
              <span>Launch Daily Challenge</span>
            </button>
          </div>
        </div>
      </div>

      {/* Featured Competitive & Developer Arenas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Ghost Duels Card */}
        <div className="bg-surface border-2 border-purple-500/30 hover:border-purple-500/70 rounded-3xl p-5 shadow-card flex flex-col justify-between transition-all group hover:-translate-y-1">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-xl shadow-inner border border-purple-500/30">
                👻
              </div>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-mono font-bold uppercase">
                Zero-Lag Shadow
              </span>
            </div>
            <h3 className="text-base font-black text-text-primary group-hover:text-purple-400 transition-colors">
              Asynchronous Ghost Duels
            </h3>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              Race against timestamped replay ghosts of champions or friends. Zero network jitter, instant shadow pacing.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-[11px] font-mono text-purple-400">+120 XP / Win</span>
            {onOpenGhostDuel && (
              <button
                type="button"
                onClick={onOpenGhostDuel}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                id="arcade-open-ghost-duel-btn"
              >
                <Ghost className="w-3.5 h-3.5" />
                <span>Duel Ghosts</span>
              </button>
            )}
          </div>
        </div>

        {/* AST Code Climber Card */}
        <div className="bg-surface border-2 border-blue-500/30 hover:border-blue-500/70 rounded-3xl p-5 shadow-card flex flex-col justify-between transition-all group hover:-translate-y-1">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-xl shadow-inner border border-blue-500/30">
                🧗
              </div>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-mono font-bold uppercase">
                Developer AST
              </span>
            </div>
            <h3 className="text-base font-black text-text-primary group-hover:text-blue-400 transition-colors">
              Code Climber Ascent
            </h3>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              Ascend towering code cliffs in TypeScript, Python, Rust, and Go. Smart auto-indent and delimiter matching.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-[11px] font-mono text-blue-400">4 Languages</span>
            {onOpenCodeClimber && (
              <button
                type="button"
                onClick={onOpenCodeClimber}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                id="arcade-open-code-climber-btn"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Climb Code</span>
              </button>
            )}
          </div>
        </div>

        {/* Mastery Pass Card */}
        <div className="bg-surface border-2 border-amber-500/30 hover:border-amber-500/70 rounded-3xl p-5 shadow-card flex flex-col justify-between transition-all group hover:-translate-y-1">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl shadow-inner border border-amber-500/30">
                👑
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono font-bold uppercase">
                Seasonal Tiers
              </span>
            </div>
            <h3 className="text-base font-black text-text-primary group-hover:text-amber-400 transition-colors">
              Mastery Tier Pass
            </h3>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              Progress through 10 reward tiers. Claim exclusive acoustic switch soundpacks and prestigious player titles.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-[11px] font-mono text-amber-400">10 Tiers</span>
            {onOpenMasteryPass && (
              <button
                type="button"
                onClick={onOpenMasteryPass}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                id="arcade-open-mastery-pass-btn"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>View Rewards</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* The 4 Core Confusion-Free Action Games */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-black text-text-primary tracking-tight">Core Action Games</h2>
            <p className="text-xs text-text-muted">Direct visual metaphors, zero ambiguous rules, instant feedback.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Game 1: Grand Prix Speedway */}
          <div className="bg-surface border-2 border-border hover:border-accent rounded-3xl p-5 sm:p-6 shadow-card flex flex-col justify-between transition-all group hover:-translate-y-1">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-13 h-13 rounded-2xl bg-accent-subtle border border-accent-border text-accent flex items-center justify-center text-2xl shadow-inner">
                  🏎️
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-accent-subtle border border-accent-border text-accent text-[10px] font-mono font-bold tracking-wider uppercase">
                  4-CAR CIRCUIT
                </span>
              </div>

              <h3 className="text-lg font-black text-text-primary group-hover:text-accent transition-colors">
                Grand Prix Speedway
              </h3>
              <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                Compete on a 4-lane track against dynamic AI rivals across 3 division classes (Amateur, Pro, Apex). Clean text passage, smooth lane animations, drafting slipstream turbo, and finish line podiums.
              </p>

              <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center gap-2 text-[11px] text-text-muted font-mono">
                <span className="px-2 py-0.5 rounded-lg bg-surface-muted border border-border text-text-secondary">
                  3 Divisions
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-surface-muted border border-border text-accent">
                  Drafting Slipstream
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-surface-muted border border-border text-text-muted">
                  Podium Trophies
                </span>
              </div>
            </div>

            <button
              onClick={() => setActiveGame('typing-race')}
              className="mt-6 w-full py-3 bg-accent hover:bg-accent-hover text-accent-foreground font-black rounded-xl text-xs transition-all shadow-glow-accent-sm flex items-center justify-center gap-2 cursor-pointer"
              id="play-grand-prix-btn"
            >
              <Play className="w-4 h-4 fill-accent-foreground" />
              <span>Enter Grand Prix</span>
            </button>
          </div>

          {/* Game 2: Orbital Laser Defense */}
          <div className="bg-surface border-2 border-border hover:border-cyan-400/50 rounded-3xl p-5 sm:p-6 shadow-card flex flex-col justify-between transition-all group hover:-translate-y-1">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-13 h-13 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center text-2xl shadow-inner">
                  🚀
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono font-bold tracking-wider uppercase">
                  ZTYPE DEFENSE
                </span>
              </div>

              <h3 className="text-lg font-black text-text-primary group-hover:text-cyan-400 transition-colors">
                Orbital Laser Defense
              </h3>
              <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                Space drones descend toward your perimeter. Type the initial letter to lock targeting lasers onto the nearest enemy, then fire laser bolts on every keystroke. Trigger a screen-clearing EMP blast at 8x streak!
              </p>

              <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center gap-2 text-[11px] text-text-muted font-mono">
                <span className="px-2 py-0.5 rounded-lg bg-surface-muted border border-border text-cyan-400">
                  Auto-Target Lock
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-surface-muted border border-border text-text-secondary">
                  Laser Bolt Impacts
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-surface-muted border border-border text-amber-400">
                  EMP Superweapon
                </span>
              </div>
            </div>

            <button
              onClick={() => setActiveGame('orbital-defense')}
              className="mt-6 w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              id="play-orbital-defense-btn"
            >
              <Crosshair className="w-4 h-4" />
              <span>Engage Defense Systems</span>
            </button>
          </div>

          {/* Game 3: Bomb Squad Defusal Rush */}
          <div className="bg-surface border-2 border-border hover:border-amber-500/50 rounded-3xl p-5 sm:p-6 shadow-card flex flex-col justify-between transition-all group hover:-translate-y-1">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-13 h-13 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-2xl shadow-inner">
                  💣
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold tracking-wider uppercase">
                  COUNTDOWN SURVIVAL
                </span>
              </div>

              <h3 className="text-lg font-black text-text-primary group-hover:text-amber-400 transition-colors">
                Bomb Squad: Defusal Rush
              </h3>
              <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                One explosive device at a time with a burning fuse countdown. Snip circuit wires with spark effects by typing the code sequence accurately before detonation. 3 battery reserves to keep you in the fight.
              </p>

              <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center gap-2 text-[11px] text-text-muted font-mono">
                <span className="px-2 py-0.5 rounded-lg bg-surface-muted border border-border text-amber-400">
                  Burning Fuse Bar
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-surface-muted border border-border text-text-secondary">
                  Wire Snip Sparks
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-surface-muted border border-border text-emerald-400">
                  3 Battery Reserves
                </span>
              </div>
            </div>

            <button
              onClick={() => setActiveGame('bomb-defusal')}
              className="mt-6 w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              id="play-bomb-defusal-btn"
            >
              <Timer className="w-4 h-4" />
              <span>Initiate Defusal Protocol</span>
            </button>
          </div>

          {/* Game 4: Word Blitz: 60s Frenzy */}
          <div className="bg-surface border-2 border-border hover:border-emerald-500/50 rounded-3xl p-5 sm:p-6 shadow-card flex flex-col justify-between transition-all group hover:-translate-y-1">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-13 h-13 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-2xl shadow-inner">
                  ⚡
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold tracking-wider uppercase">
                  SPEED BURST
                </span>
              </div>

              <h3 className="text-lg font-black text-text-primary group-hover:text-emerald-400 transition-colors">
                Word Blitz: 60s Frenzy
              </h3>
              <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                45 to 60-second rapid-fire burst. One clear central word at a time. Consecutive error-free words ramp up your score multiplier up to 5x FRENZY, with +3s time extensions on big streaks.
              </p>

              <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center gap-2 text-[11px] text-text-muted font-mono">
                <span className="px-2 py-0.5 rounded-lg bg-surface-muted border border-border text-emerald-400">
                  5x Frenzy Multiplier
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-surface-muted border border-border text-text-secondary">
                  Time Freeze Extensions
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-surface-muted border border-border text-accent">
                  Streak Combos
                </span>
              </div>
            </div>

            <button
              onClick={() => setActiveGame('word-blitz')}
              className="mt-6 w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              id="play-word-blitz-btn"
            >
              <Zap className="w-4 h-4" />
              <span>Launch Word Blitz</span>
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Section: Specialized Training Drills & Showdowns */}
      <div className="mt-2 pt-6 border-t border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-text-primary">Specialized Drills & AI Duels</h2>
            <p className="text-xs text-text-muted">Targeted muscle-memory training, AI rival showdowns, and calm zen flow.</p>
          </div>
          <button
            onClick={() => setShowSpecializedDrills((prev) => !prev)}
            className="px-3.5 py-1.5 rounded-xl bg-surface-muted hover:bg-surface-hover text-text-secondary hover:text-text-primary text-xs font-semibold border border-border transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>{showSpecializedDrills ? 'Collapse Special Modes' : 'View All 7 Special Modes'}</span>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showSpecializedDrills ? 'rotate-90' : ''}`} />
          </button>
        </div>

        {showSpecializedDrills && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 animate-fadeIn">
            {/* Drill 1: Typing Duel */}
            <div className="p-4 rounded-2xl bg-surface border border-border hover:border-accent flex flex-col justify-between transition-all">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="p-1.5 rounded-lg bg-accent-subtle text-accent text-sm">⚔️</span>
                  <h4 className="font-bold text-sm text-text-primary">Typing Duel</h4>
                </div>
                <p className="text-xs text-text-muted">
                  1v1 live pacing combat against 4 bot rival personas (36 to 114 WPM) with real-time lead meters.
                </p>
              </div>
              <button
                onClick={() => setActiveGame('typing-duel')}
                className="mt-3 w-full py-2 bg-surface-muted hover:bg-surface-hover text-text-primary text-xs font-bold rounded-lg border border-border transition-colors cursor-pointer"
              >
                Enter Duel
              </button>
            </div>

            {/* Drill 2: Numeric & Symbol Ninja */}
            <div className="p-4 rounded-2xl bg-surface border border-border hover:border-primary flex flex-col justify-between transition-all">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="p-1.5 rounded-lg bg-primary-subtle text-primary text-sm">🔢</span>
                  <h4 className="font-bold text-sm text-text-primary">Numeric & Symbol Ninja</h4>
                </div>
                <p className="text-xs text-text-muted">
                  Master the number row, brackets, parentheses, and programming syntax symbols with guided finger cues.
                </p>
              </div>
              <button
                onClick={() => setActiveGame('numeric-ninja')}
                className="mt-3 w-full py-2 bg-surface-muted hover:bg-surface-hover text-text-primary text-xs font-bold rounded-lg border border-border transition-colors cursor-pointer"
              >
                Practice Symbols
              </button>
            </div>

            {/* Drill 3: Zen Flow Marathon */}
            <div className="p-4 rounded-2xl bg-surface border border-border hover:border-cyan-400 flex flex-col justify-between transition-all">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 text-sm">🌊</span>
                  <h4 className="font-bold text-sm text-text-primary">Zen Flow Marathon</h4>
                </div>
                <p className="text-xs text-text-muted">
                  Zero timer, zero penalty, infinite text stream of classical literature and mindful philosophy.
                </p>
              </div>
              <button
                onClick={() => setActiveGame('zen-marathon')}
                className="mt-3 w-full py-2 bg-surface-muted hover:bg-surface-hover text-text-primary text-xs font-bold rounded-lg border border-border transition-colors cursor-pointer"
              >
                Enter Zen Mode
              </button>
            </div>

            {/* Drill 4: Weakness Weaver */}
            <div className="p-4 rounded-2xl bg-surface border border-border hover:border-fuchsia-400 flex flex-col justify-between transition-all">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="p-1.5 rounded-lg bg-fuchsia-500/10 text-fuchsia-400 text-sm">🧠</span>
                  <h4 className="font-bold text-sm text-text-primary">Weakness Weaver</h4>
                </div>
                <p className="text-xs text-text-muted">
                  Adaptive AI drills targeting your statistically slowest N-gram letter combinations.
                </p>
              </div>
              <button
                onClick={() => setActiveGame('weakness-weaver')}
                className="mt-3 w-full py-2 bg-surface-muted hover:bg-surface-hover text-text-primary text-xs font-bold rounded-lg border border-border transition-colors cursor-pointer"
              >
                Weave Drill
              </button>
            </div>

            {/* Drill 5: Boss Gauntlet */}
            <div className="p-4 rounded-2xl bg-surface border border-border hover:border-red-400 flex flex-col justify-between transition-all">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="p-1.5 rounded-lg bg-red-500/10 text-red-400 text-sm">👹</span>
                  <h4 className="font-bold text-sm text-text-primary">Boss Gauntlet</h4>
                </div>
                <p className="text-xs text-text-muted">
                  3-stage critical survival encounter. Deliver high-speed keystroke damage before the turn timer expires.
                </p>
              </div>
              <button
                onClick={() => setActiveGame('boss-gauntlet')}
                className="mt-3 w-full py-2 bg-surface-muted hover:bg-surface-hover text-text-primary text-xs font-bold rounded-lg border border-border transition-colors cursor-pointer"
              >
                Fight Bosses
              </button>
            </div>

            {/* Drill 6: AI Story Stream */}
            <div className="p-4 rounded-2xl bg-surface border border-border hover:border-indigo-400 flex flex-col justify-between transition-all">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm">📖</span>
                  <h4 className="font-bold text-sm text-text-primary">AI Story Stream</h4>
                </div>
                <p className="text-xs text-text-muted">
                  Branching interactive narrative adventure that weaves your struggle keys seamlessly into dynamic story prose.
                </p>
              </div>
              <button
                onClick={() => setActiveGame('story-stream')}
                className="mt-3 w-full py-2 bg-surface-muted hover:bg-surface-hover text-text-primary text-xs font-bold rounded-lg border border-border transition-colors cursor-pointer"
              >
                Stream Stories
              </button>
            </div>

            {/* Drill 7: Code Pulse */}
            <div className="p-4 rounded-2xl bg-surface border border-border hover:border-emerald-400 flex flex-col justify-between transition-all">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm">💻</span>
                  <h4 className="font-bold text-sm text-text-primary">Code Pulse</h4>
                </div>
                <p className="text-xs text-text-muted">
                  Polyglot developer syntax drills covering TypeScript, Python, Rust, Go, and SQL with braces, arrows, and operator speed.
                </p>
              </div>
              <button
                onClick={() => setActiveGame('code-pulse')}
                className="mt-3 w-full py-2 bg-surface-muted hover:bg-surface-hover text-text-primary text-xs font-bold rounded-lg border border-border transition-colors cursor-pointer"
              >
                Pulse Code
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
