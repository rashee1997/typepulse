'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserProgress, TypingStats, AISettings, TurnResult } from '@/types/typing';
import { CHARACTER_PERSONAS, CharacterPersona } from '@/lib/character-personas';
import { generateBossTurn, generateOpponentBanter } from '@/lib/ai-service';
import { getWeakestPatterns } from '@/lib/progress-service';
import { TypingEngine } from '@/lib/typing-engine';
import { soundFx } from '@/lib/sound';
import {
  Skull,
  Swords,
  Heart,
  Zap,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Trophy,
  Flame,
  Clock,
  ShieldCheck,
  ShieldAlert,
  MessageSquareQuote,
} from 'lucide-react';

interface AdaptiveBossFightGameProps {
  userProgress: UserProgress;
  aiSettings: AISettings;
  onFinishSession: (stats: TypingStats, mode: string) => void;
  onExit: () => void;
}

export const AdaptiveBossFightGame: React.FC<AdaptiveBossFightGameProps> = ({
  userProgress,
  aiSettings,
  onFinishSession,
  onExit,
}) => {
  const [selectedBossId, setSelectedBossId] = useState<string>('grandmaster');
  const boss: CharacterPersona = CHARACTER_PERSONAS[selectedBossId] || CHARACTER_PERSONAS.grandmaster;

  const [bossHp, setBossHp] = useState(boss.maxHp || 300);
  const [playerHp, setPlayerHp] = useState(100);
  const [roundNumber, setRoundNumber] = useState(1);
  const [combatState, setCombatState] = useState<'intro' | 'active' | 'victory' | 'defeat'>('intro');

  const [attackName, setAttackName] = useState('Quantum Singularity');
  const [bossDialogue, setBossDialogue] = useState('Your keystrokes are bounded by latency.');
  const [attackText, setAttackText] = useState('execute protocol zero immediately');
  const [engine, setEngine] = useState<TypingEngine>(() => new TypingEngine(attackText));
  const [timeLeft, setTimeLeft] = useState(16);
  const [maxTime, setMaxTime] = useState(16);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const focusInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    focusInput();
  }, [focusInput, combatState]);

  // Load new turn
  const loadTurn = useCallback(
    async (lastResult: TurnResult) => {
      const patterns = getWeakestPatterns(3, 'all', userProgress);
      const turn = await generateBossTurn(patterns, boss, lastResult, aiSettings);

      setAttackName(turn.attackName);
      setBossDialogue(turn.bossDialogue);
      setAttackText(turn.attackText);
      setTimeLeft(turn.timeLimitSeconds);
      setMaxTime(turn.timeLimitSeconds);

      const newEngine = new TypingEngine(turn.attackText);
      setEngine(newEngine);
      setCombatState('active');

      // Trigger reactive dynamic banter
      const currentStats = engine.getStats();
      generateOpponentBanter(currentStats.wpm || 50, boss.targetWpm, boss, aiSettings).then((b) => {
        if (b) setBossDialogue(b);
      });
    },
    [boss, userProgress, aiSettings, engine]
  );

  const startFight = () => {
    setBossHp(boss.maxHp || 300);
    setPlayerHp(100);
    setRoundNumber(1);
    loadTurn({ playerSuccess: true, roundDamageDealt: 0, playerAccuracy: 100, phraseCompleted: true });
  };

  // Timer loop
  useEffect(() => {
    if (combatState !== 'active') {
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
                setCombatState('defeat');
              } else {
                loadTurn({ playerSuccess: false, roundDamageDealt: 0, playerAccuracy: 40, phraseCompleted: false });
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
  }, [combatState, loadTurn]);

  // Keystrokes
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (combatState !== 'active') return;

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

      if (res.isCorrect) {
        soundFx.playKeypress();
      } else {
        soundFx.playError();
      }

      if (res.isFinished) {
        soundFx.playStreak();
        const stats = engine.getStats();
        const damage = Math.max(25, Math.round((stats.wpm * (stats.accuracy / 100)) * 0.9));

        setBossHp((hp) => {
          const nextHp = Math.max(0, hp - damage);
          if (nextHp <= 0) {
            soundFx.playVictory();
            setCombatState('victory');
            onFinishSession(engine.getStats(), 'adaptive-boss');
          } else {
            setRoundNumber((r) => r + 1);
            loadTurn({ playerSuccess: true, roundDamageDealt: damage, playerAccuracy: stats.accuracy, phraseCompleted: true });
          }
          return nextHp;
        });
      }
    }
  };

  const currentChars = engine.chars;
  const bossMaxHp = boss.maxHp || 300;
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
            id="boss-back-button"
            onClick={onExit}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
                <Skull className="w-3.5 h-3.5" />
                Adaptive AI Boss Arena
              </span>
              <span className="text-xs text-slate-400">Round #{roundNumber}</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight mt-1">{boss.name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl">
          <Heart className="w-5 h-5 text-rose-400 fill-rose-500/20" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Your Vitality</div>
            <div className="text-sm font-black text-rose-400">{playerHp} / 100 HP</div>
          </div>
        </div>
      </div>

      {/* Boss Stage Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl p-3 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner">
              {boss.avatar}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">{boss.name}</h2>
                <span className="text-xs text-purple-400 border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 rounded-md font-semibold">
                  {boss.title}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Special Move: {boss.specialMove}</p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs font-bold text-purple-400 font-mono">
              {bossHp} / {bossMaxHp} HP
            </div>
            <div className="text-[11px] text-slate-500">Benchmark Pace: {boss.targetWpm} WPM</div>
          </div>
        </div>

        {/* Boss HP Bar */}
        <div className="w-full h-3 bg-slate-950 rounded-full p-0.5 border border-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-rose-500 rounded-full transition-all duration-300"
            style={{ width: `${bossHpPercent}%` }}
          />
        </div>

        {/* Dynamic Banter Box */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 flex items-start gap-3">
          <MessageSquareQuote className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-purple-300">{boss.name}: </span>
            <span className="text-slate-300 italic">&ldquo;{bossDialogue}&rdquo;</span>
          </div>
        </div>

        {/* Typing Canvas */}
        <div className="relative min-h-[160px] bg-slate-950/90 border border-slate-800 rounded-xl p-6 font-mono text-xl leading-relaxed select-none break-words">
          {combatState === 'active' && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800 overflow-hidden rounded-t-xl">
              <div
                className={`h-full transition-all duration-1000 ${
                  timeLeft <= 4 ? 'bg-rose-500' : 'bg-purple-400'
                }`}
                style={{ width: `${timePercent}%` }}
              />
            </div>
          )}

          {combatState === 'intro' && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center z-10 p-6 text-center">
              <Skull className="w-12 h-12 text-purple-400 mb-2" />
              <h3 className="text-xl font-bold text-white mb-1">Challenge {boss.name}</h3>
              <p className="text-xs text-slate-400 max-w-md mb-4">
                The boss dynamically weaponizes your statistical weak keystrokes. Defeat {boss.name} before your health reaches 0!
              </p>
              <button
                id="boss-fight-start"
                onClick={startFight}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-rose-600 text-white font-bold text-sm shadow-lg shadow-purple-600/20"
              >
                Commence Duel
              </button>
            </div>
          )}

          {combatState === 'victory' && (
            <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center z-10 p-6 text-center">
              <Trophy className="w-12 h-12 text-amber-400 mb-2" />
              <h3 className="text-2xl font-black text-white mb-1">{boss.name} Overthrown!</h3>
              <p className="text-sm text-slate-400 max-w-md mb-5">
                You shattered the Sovereign&apos;s quantum defenses with superior human velocity and precision!
              </p>
              <button
                id="boss-victory-exit"
                onClick={onExit}
                className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm"
              >
                Claim Victory & Return
              </button>
            </div>
          )}

          {combatState === 'defeat' && (
            <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center z-10 p-6 text-center">
              <Skull className="w-12 h-12 text-rose-500 mb-2" />
              <h3 className="text-2xl font-black text-white mb-1">Defeated by {boss.name}</h3>
              <p className="text-sm text-slate-400 max-w-md mb-5">
                The boss exploited your timing errors. Review your weak patterns and strike back!
              </p>
              <div className="flex gap-3">
                <button
                  id="boss-retry"
                  onClick={startFight}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-sm"
                >
                  Retry Showdown
                </button>
                <button
                  id="boss-exit-fail"
                  onClick={onExit}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-sm"
                >
                  Exit
                </button>
              </div>
            </div>
          )}

          <div>
            {currentChars.map((item, idx) => {
              let color = 'text-slate-500';
              if (item.status === 'correct') color = 'text-purple-300 font-bold';
              if (item.status === 'incorrect') color = 'text-rose-400 bg-rose-500/20 rounded';
              if (item.status === 'corrected') color = 'text-amber-400';
              if (item.status === 'current') color = 'text-white underline decoration-purple-500 decoration-2 font-bold bg-purple-500/20 rounded';

              return (
                <span key={idx} className={`${color} transition-colors duration-75`}>
                  {item.char}
                </span>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
          <span className="font-semibold text-purple-400 flex items-center gap-1.5">
            <Zap className="w-4 h-4" /> Incoming Attack: {attackName}
          </span>
          <span className="font-mono flex items-center gap-1.5 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-purple-400" /> {timeLeft}s remaining
          </span>
        </div>
      </div>
    </div>
  );
};
