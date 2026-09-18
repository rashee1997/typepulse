'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserProgress, TypingStats, TurnResult } from '@/types/typing';
import { BOSS_ROSTER, CharacterPersona } from '@/lib/character-personas';
import { generateBossTurn } from '@/lib/ai-service';
import { getWeakestPatterns } from '@/lib/progress-service';
import { TypingEngine } from '@/lib/typing-engine';
import { soundFx } from '@/lib/sound';
import {
  ShieldAlert,
  Swords,
  Heart,
  Zap,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Trophy,
  Flame,
  Clock,
  Skull,
  ShieldCheck,
} from 'lucide-react';

interface BossGauntletGameProps {
  userProgress: UserProgress;
  onFinishSession: (stats: TypingStats, mode: string) => void;
  onExit: () => void;
}

export const BossGauntletGame: React.FC<BossGauntletGameProps> = ({
  userProgress,
  onFinishSession,
  onExit,
}) => {
  const [stageIndex, setStageIndex] = useState(0);
  const currentBoss: CharacterPersona = BOSS_ROSTER[stageIndex] || BOSS_ROSTER[0];

  const [bossHp, setBossHp] = useState(currentBoss.maxHp || 250);
  const [playerHp, setPlayerHp] = useState(100);
  const [roundNumber, setRoundNumber] = useState(1);
  const [roundState, setRoundState] = useState<'intro' | 'fighting' | 'boss_defeated' | 'game_over' | 'gauntlet_cleared'>('intro');

  // Round data
  const [currentAttackName, setCurrentAttackName] = useState('Seismic Slam');
  const [bossDialogue, setBossDialogue] = useState('Brace yourself for impact!');
  const [turnPhrase, setTurnPhrase] = useState('override system failure now');
  const [engine, setEngine] = useState<TypingEngine>(() => new TypingEngine(turnPhrase));
  const [timeLeft, setTimeLeft] = useState(15);
  const [maxTime, setMaxTime] = useState(15);
  const [totalKeystrokesLogged, setTotalKeystrokesLogged] = useState(0);
  const [totalErrorsLogged, setTotalErrorsLogged] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const focusInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    focusInput();
  }, [focusInput, roundState]);

  // Load new turn for current boss
  const loadNewTurn = useCallback(async (lastResult: TurnResult) => {
    const weakPatterns = getWeakestPatterns(3, 'all', userProgress);
    const turnData = await generateBossTurn(weakPatterns, currentBoss, lastResult);

    setCurrentAttackName(turnData.attackName);
    setBossDialogue(turnData.bossDialogue);
    setTurnPhrase(turnData.attackText);
    setTimeLeft(turnData.timeLimitSeconds);
    setMaxTime(turnData.timeLimitSeconds);

    const newEngine = new TypingEngine(turnData.attackText);
    setEngine(newEngine);
    setRoundState('fighting');
  }, [currentBoss, userProgress]);

  // Start boss round
  const startBossFight = () => {
    loadNewTurn({ playerSuccess: true, roundDamageDealt: 0, playerAccuracy: 100, phraseCompleted: true });
  };

  // Turn timer countdown
  useEffect(() => {
    if (roundState !== 'fighting') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          soundFx.playError();
          setTimeout(() => {
            setPlayerHp((hp) => {
              const nextHp = Math.max(0, hp - 25);
              if (nextHp <= 0) {
                setRoundState('game_over');
              } else {
                loadNewTurn({ playerSuccess: false, roundDamageDealt: 0, playerAccuracy: 50, phraseCompleted: false });
              }
              return nextHp;
            });
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [roundState, loadNewTurn]);

  // Handle Keystrokes
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (roundState !== 'fighting') return;

    if (e.key === 'Tab') {
      e.preventDefault();
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      onExit();
      return;
    }

    if (e.key.length === 1 || e.key === 'Backspace') {
      const res = engine.handleInput(e.key, e.ctrlKey);
      setTotalKeystrokesLogged((k) => k + 1);

      if (res.isCorrect) {
        soundFx.playKeypress();
      } else {
        soundFx.playError();
        setTotalErrorsLogged((err) => err + 1);
      }

      if (res.isFinished) {
        // Round typed successfully! Deal damage to boss!
        soundFx.playStreak();
        const stats = engine.getStats();
        const baseDamage = Math.round((stats.wpm * (stats.accuracy / 100)) * 0.8);
        const damageDealt = Math.max(20, baseDamage);

        setBossHp((prevHp) => {
          const newHp = Math.max(0, prevHp - damageDealt);
          if (newHp <= 0) {
            // Boss defeated!
            soundFx.playVictory();
            if (stageIndex >= BOSS_ROSTER.length - 1) {
              setRoundState('gauntlet_cleared');
              onFinishSession(engine.getStats(), 'boss-gauntlet');
            } else {
              setRoundState('boss_defeated');
            }
          } else {
            // Load next turn for this boss
            setRoundNumber((r) => r + 1);
            loadNewTurn({ playerSuccess: true, roundDamageDealt: damageDealt, playerAccuracy: stats.accuracy, phraseCompleted: true });
          }
          return newHp;
        });
      }
    }
  };

  const nextBossStage = () => {
    const nextIdx = stageIndex + 1;
    setStageIndex(nextIdx);
    const nextB = BOSS_ROSTER[nextIdx];
    setBossHp(nextB.maxHp || 250);
    setPlayerHp(100);
    setRoundNumber(1);
    setRoundState('intro');
  };

  const restartGauntlet = () => {
    setStageIndex(0);
    setBossHp(BOSS_ROSTER[0].maxHp || 250);
    setPlayerHp(100);
    setRoundNumber(1);
    setRoundState('intro');
  };

  const currentChars = engine.chars;
  const bossMaxHp = currentBoss.maxHp || 250;
  const bossHpPercent = Math.min(100, Math.round((bossHp / bossMaxHp) * 100));
  const timePercent = Math.min(100, Math.round((timeLeft / maxTime) * 100));

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6" onClick={focusInput}>
      <input
        ref={inputRef}
        type="text"
        className="opacity-0 absolute pointer-events-none w-0 h-0"
        onKeyDown={handleKeyDown}
        value=""
        onChange={() => {}}
        autoFocus
      />

      {/* Header */}
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-4">
          <button
            id="gauntlet-back-button"
            onClick={onExit}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
                <Swords className="w-3.5 h-3.5" />
                Gauntlet Stage {stageIndex + 1} of {BOSS_ROSTER.length}
              </span>
              <span className="text-xs text-slate-400">Survival Battle • Round #{roundNumber}</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight mt-1">Boss Gauntlet</h1>
          </div>
        </div>

        {/* Player HP */}
        <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl">
          <Heart className="w-5 h-5 text-rose-400 fill-rose-500/20" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Player Vitality</div>
            <div className="text-sm font-black text-rose-400">{playerHp} / 100 HP</div>
          </div>
        </div>
      </div>

      {/* Boss Health Bar & Avatar Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl p-3 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner">
              {currentBoss.avatar}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">{currentBoss.name}</h2>
                <span className="text-xs text-amber-400 border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 rounded-md font-semibold">
                  {currentBoss.title}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{currentBoss.description}</p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs font-bold text-rose-400 font-mono">
              {bossHp} / {bossMaxHp} HP
            </div>
            <div className="text-[11px] text-slate-500">Target Pace: {currentBoss.targetWpm} WPM</div>
          </div>
        </div>

        {/* Boss HP Bar */}
        <div className="w-full h-3 bg-slate-950 rounded-full p-0.5 border border-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-rose-600 via-amber-500 to-rose-500 rounded-full transition-all duration-300"
            style={{ width: `${bossHpPercent}%` }}
          />
        </div>

        {/* Dialogue Bubble */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-amber-300">{currentBoss.name}: </span>
            <span className="text-slate-300 italic">&ldquo;{bossDialogue}&rdquo;</span>
          </div>
        </div>

        {/* Combat Area */}
        <div className="relative min-h-[160px] bg-slate-950/90 border border-slate-800 rounded-xl p-6 font-mono text-xl leading-relaxed select-none break-words">
          {/* Turn Timer Bar */}
          {roundState === 'fighting' && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800 overflow-hidden rounded-t-xl">
              <div
                className={`h-full transition-all duration-1000 ${
                  timeLeft <= 4 ? 'bg-rose-500' : 'bg-amber-400'
                }`}
                style={{ width: `${timePercent}%` }}
              />
            </div>
          )}

          {/* Intro Overlay */}
          {roundState === 'intro' && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center z-10 p-6 text-center">
              <Swords className="w-12 h-12 text-rose-400 mb-2" />
              <h3 className="text-xl font-bold text-white mb-1">Stage {stageIndex + 1}: Engage {currentBoss.name}</h3>
              <p className="text-xs text-slate-400 max-w-md mb-4">
                Counter the boss&apos;s attack phrases within the time window. High accuracy delivers critical kinetic strikes.
              </p>
              <button
                id="gauntlet-engage-button"
                onClick={startBossFight}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 text-white font-bold text-sm shadow-lg shadow-rose-600/20"
              >
                Initiate Combat
              </button>
            </div>
          )}

          {/* Boss Defeated Modal */}
          {roundState === 'boss_defeated' && (
            <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center z-10 p-6 text-center">
              <Trophy className="w-12 h-12 text-amber-400 mb-2" />
              <h3 className="text-2xl font-black text-white mb-1">{currentBoss.name} Terminated!</h3>
              <p className="text-sm text-slate-400 max-w-md mb-5">
                Stage {stageIndex + 1} cleared! Prepare yourself for the next boss in the gauntlet.
              </p>
              <button
                id="gauntlet-next-stage-button"
                onClick={nextBossStage}
                className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm"
              >
                Advance to Next Boss
              </button>
            </div>
          )}

          {/* Gauntlet Cleared */}
          {roundState === 'gauntlet_cleared' && (
            <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center z-10 p-6 text-center">
              <Sparkles className="w-12 h-12 text-amber-400 mb-2" />
              <h3 className="text-2xl font-black text-white mb-1">Gauntlet Master! All Bosses Defeated!</h3>
              <p className="text-sm text-slate-400 max-w-md mb-5">
                You conquered all stages of the Gauntlet, demonstrating elite velocity and composure under pressure!
              </p>
              <button
                id="gauntlet-victory-exit"
                onClick={onExit}
                className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm"
              >
                Claim Victory & Return
              </button>
            </div>
          )}

          {/* Game Over */}
          {roundState === 'game_over' && (
            <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center z-10 p-6 text-center">
              <Skull className="w-12 h-12 text-rose-500 mb-2" />
              <h3 className="text-2xl font-black text-white mb-1">Vitality Depleted</h3>
              <p className="text-sm text-slate-400 max-w-md mb-5">
                {currentBoss.name} overwhelmed your defenses. Recalibrate and challenge the Gauntlet again!
              </p>
              <div className="flex gap-3">
                <button
                  id="gauntlet-retry-button"
                  onClick={restartGauntlet}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-sm"
                >
                  Restart Gauntlet
                </button>
                <button
                  id="gauntlet-exit-fail"
                  onClick={onExit}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-sm"
                >
                  Exit
                </button>
              </div>
            </div>
          )}

          {/* Typing Characters */}
          <div>
            {currentChars.map((item, idx) => {
              let color = 'text-slate-500';
              if (item.status === 'correct') color = 'text-emerald-400';
              if (item.status === 'incorrect') color = 'text-rose-400 bg-rose-500/20 rounded';
              if (item.status === 'corrected') color = 'text-amber-400';
              if (item.status === 'current') color = 'text-white underline decoration-rose-500 decoration-2 font-bold bg-rose-500/20 rounded';

              return (
                <span key={idx} className={`${color} transition-colors duration-75`}>
                  {item.char}
                </span>
              );
            })}
          </div>
        </div>

        {/* Turn HUD footer */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
          <span className="font-semibold text-amber-400 flex items-center gap-1.5">
            <Zap className="w-4 h-4" /> Incoming Attack: {currentAttackName}
          </span>
          <span className="font-mono flex items-center gap-1.5 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-amber-400" /> {timeLeft}s remaining
          </span>
        </div>
      </div>
    </div>
  );
};
