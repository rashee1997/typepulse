'use client';

import React, { useState } from 'react';
import {
  Check,
  Crown,
  Flame,
  Gift,
  Keyboard,
  Lock,
  Palette,
  Sparkles,
  Terminal,
  Trophy,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import { MasteryTier, SwitchSoundProfile, UserProgress } from '@/types/typing';
import { claimMasteryTier, loadMasteryTiers } from '@/lib/progress-service';

export interface MasteryPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProgress: UserProgress;
  onRewardClaimed?: (reward: string) => void;
  activeProfile?: SwitchSoundProfile;
  onClaimReward?: (tierId: number, reward: { type: string; value: string; title: string }) => void;
}

export const MasteryPassModal: React.FC<MasteryPassModalProps> = ({
  isOpen,
  onClose,
  userProgress,
  onRewardClaimed,
  activeProfile,
  onClaimReward,
}) => {
  const [tiers, setTiers] = useState<MasteryTier[]>(() => loadMasteryTiers(userProgress.xp));
  const [claimedNotice, setClaimedNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClaim = (tierNumber: number) => {
    const res = claimMasteryTier(tierNumber, userProgress.xp);
    if (res.success && res.reward) {
      setTiers(loadMasteryTiers(userProgress.xp));
      setClaimedNotice(`Unlocked Reward: ${res.reward}!`);
      if (onRewardClaimed) onRewardClaimed(res.reward);
      if (onClaimReward) {
        let type = 'badge';
        let value = res.reward;
        const low = res.reward.toLowerCase();
        if (low.includes('topre')) {
          type = 'soundpack';
          value = 'topre';
        } else if (low.includes('cherry')) {
          type = 'soundpack';
          value = 'cherry-blue';
        } else if (low.includes('panda')) {
          type = 'soundpack';
          value = 'holy-panda';
        } else if (low.includes('gateron')) {
          type = 'soundpack';
          value = 'gateron-red';
        }
        onClaimReward(tierNumber, { type, value, title: res.reward });
      }
      setTimeout(() => setClaimedNotice(null), 3500);
    }
  };

  const getTierIcon = (iconName: string) => {
    switch (iconName) {
      case 'Volume2':
        return <Volume2 className="w-4 h-4 text-cyan-400" />;
      case 'Palette':
        return <Palette className="w-4 h-4 text-emerald-400" />;
      case 'Keyboard':
        return <Keyboard className="w-4 h-4 text-blue-400" />;
      case 'Zap':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'Sparkles':
        return <Sparkles className="w-4 h-4 text-pink-400" />;
      case 'Flame':
        return <Flame className="w-4 h-4 text-orange-400" />;
      case 'Terminal':
        return <Terminal className="w-4 h-4 text-green-400" />;
      case 'Crown':
        return <Crown className="w-4 h-4 text-yellow-400" />;
      default:
        return <Trophy className="w-4 h-4 text-accent" />;
    }
  };

  const currentLevel = userProgress.level;
  const currentXp = userProgress.xp;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-surface-overlay backdrop-blur-sm animate-fadeIn"
      id="mastery-pass-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-dialog overflow-hidden flex flex-col max-h-[85vh] animate-scaleUp"
        id="mastery-pass-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Cyber Mastery Pass"
      >
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-surface-subtle">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">Cyber Mastery Pass</h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Season 1
                </span>
              </div>
              <p className="text-xs text-foreground-muted">
                Gain XP across drills & arcade battles to unlock exclusive mechanical switches & accents
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar Header */}
        <div className="px-5 py-3 bg-surface border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-foreground-muted font-medium">Your Progression:</span>
            <span className="text-xs font-bold text-accent font-mono">{currentXp} XP</span>
            <span className="text-xs text-foreground-muted">· Level {currentLevel}</span>
          </div>
          {claimedNotice && (
            <div className="text-xs font-medium text-emerald-400 flex items-center gap-1.5 animate-fadeIn">
              <Sparkles className="w-3.5 h-3.5" /> {claimedNotice}
            </div>
          )}
        </div>

        {/* Tier Cards Grid */}
        <div className="p-5 overflow-y-auto space-y-3">
          {tiers.map((t) => {
            const isUnlockable = t.unlocked && !t.claimed;
            const progressPercent = Math.min(100, Math.round((currentXp / t.requiredXp) * 100));

            return (
              <div
                key={t.tier}
                className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                  t.claimed
                    ? 'border-border/60 bg-surface-subtle/50 opacity-80'
                    : isUnlockable
                    ? 'border-amber-500/50 bg-amber-950/20 shadow-sm shadow-amber-500/10'
                    : 'border-border bg-surface'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                      t.claimed
                        ? 'bg-surface border-border text-foreground-muted'
                        : isUnlockable
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        : 'bg-surface-subtle border-border/80 text-foreground-muted/60'
                    }`}
                  >
                    {t.claimed ? <Check className="w-4 h-4 text-emerald-400" /> : getTierIcon(t.icon)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-foreground-muted">
                        TIER {t.tier}
                      </span>
                      <h4 className="text-sm font-semibold text-foreground truncate">{t.title}</h4>
                    </div>
                    <p className="text-xs text-accent font-medium mt-0.5 truncate flex items-center gap-1">
                      <Gift className="w-3 h-3 inline" /> {t.reward}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-mono text-foreground-muted">
                      {Math.min(currentXp, t.requiredXp)} / {t.requiredXp} XP
                    </div>
                    <div className="w-24 h-1.5 rounded-full bg-surface-subtle border border-border/60 mt-1 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          t.unlocked ? 'bg-amber-400' : 'bg-foreground-muted/40'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {t.claimed ? (
                    <span className="px-3 py-1.5 text-xs font-medium rounded-lg bg-surface border border-border text-foreground-muted flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Claimed
                    </span>
                  ) : isUnlockable ? (
                    <button
                      onClick={() => handleClaim(t.tier)}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-black flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Claim Reward
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-subtle border border-border text-foreground-muted flex items-center gap-1">
                      <Lock className="w-3 h-3 text-foreground-muted" /> Locked
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
