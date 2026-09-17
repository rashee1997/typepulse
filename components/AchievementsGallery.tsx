'use client';

import React, { useState } from 'react';
import { Achievement, UserProgress } from '@/types/typing';
import { INITIAL_ACHIEVEMENTS } from '@/lib/achievements';
import {
  Activity,
  Award,
  BookOpen,
  Bot,
  Calendar,
  CheckCircle2,
  Crosshair,
  Flame,
  Lock,
  Rocket,
  Shield,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  Trophy,
  Zap,
} from 'lucide-react';

interface AchievementsGalleryProps {
  userProgress: UserProgress;
}

type FilterCategory = 'all' | 'streak' | 'accuracy' | 'speed' | 'combo' | 'games';

export const AchievementsGallery: React.FC<AchievementsGalleryProps> = ({ userProgress }) => {
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');
  const { unlockedAchievements, dailyStreak, highScores } = userProgress;

  const totalAchievements = INITIAL_ACHIEVEMENTS.length;
  const unlockedCount = unlockedAchievements.length;
  const percentComplete = Math.round((unlockedCount / totalAchievements) * 100);

  // Calculate total XP claimed from achievements
  const totalXpClaimed = INITIAL_ACHIEVEMENTS.filter((ach) =>
    unlockedAchievements.includes(ach.id)
  ).reduce((sum, ach) => sum + ach.xpReward, 0);

  // Filtered achievements
  const filteredAchievements = INITIAL_ACHIEVEMENTS.filter((ach) => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'streak') return ach.category === 'streak';
    if (activeCategory === 'accuracy') return ach.category === 'accuracy';
    if (activeCategory === 'speed') return ach.category === 'speed';
    if (activeCategory === 'combo') return ach.category === 'combo';
    if (activeCategory === 'games') return ach.category === 'games' || ach.category === 'lessons';
    return true;
  });

  // Render achievement icon based on icon string
  const renderAchievementIcon = (iconName: string, isUnlocked: boolean, category: string) => {
    const iconClass = `w-6 h-6 ${
      isUnlocked
        ? category === 'streak'
          ? 'text-accent'
          : category === 'accuracy'
          ? 'text-success'
          : category === 'speed'
          ? 'text-accent'
          : 'text-primary'
        : 'text-text-subtle'
    }`;

    switch (iconName) {
      case 'Sparkles':
        return <Sparkles className={iconClass} />;
      case 'Zap':
        return <Zap className={iconClass} />;
      case 'Flame':
        return <Flame className={iconClass} />;
      case 'Rocket':
        return <Rocket className={iconClass} />;
      case 'Crosshair':
        return <Crosshair className={iconClass} />;
      case 'Target':
        return <Target className={iconClass} />;
      case 'ShieldCheck':
        return <ShieldCheck className={iconClass} />;
      case 'Activity':
        return <Activity className={iconClass} />;
      case 'Award':
        return <Award className={iconClass} />;
      case 'BookOpen':
        return <BookOpen className={iconClass} />;
      case 'Calendar':
        return <Calendar className={iconClass} />;
      case 'Trophy':
        return <Trophy className={iconClass} />;
      case 'Bot':
        return <Bot className={iconClass} />;
      case 'Timer':
        return <Timer className={iconClass} />;
      default:
        return <Award className={iconClass} />;
    }
  };

  // Calculate live progress for locked achievements
  const getLiveProgress = (ach: Achievement): { current: number; max: number; label: string } => {
    if (ach.category === 'streak') {
      return {
        current: Math.min(ach.maxProgress, dailyStreak),
        max: ach.maxProgress,
        label: `${dailyStreak} / ${ach.maxProgress} Days`,
      };
    }
    if (ach.category === 'speed') {
      const best = highScores.bestWpm || 0;
      return {
        current: Math.min(ach.maxProgress, best),
        max: ach.maxProgress,
        label: `${best} / ${ach.maxProgress} WPM`,
      };
    }
    if (ach.category === 'accuracy') {
      const best = highScores.bestAccuracy || 0;
      return {
        current: best >= (ach.id === 'accuracy_100' ? 100 : ach.id === 'accuracy_98' ? 98 : 95) ? 1 : 0,
        max: 1,
        label: `${best}% Best`,
      };
    }
    if (ach.category === 'combo') {
      const bestCombo = highScores.highestCombo || 0;
      return {
        current: Math.min(ach.maxProgress, bestCombo),
        max: ach.maxProgress,
        label: `${bestCombo} / ${ach.maxProgress} Combo`,
      };
    }
    return {
      current: ach.progress,
      max: ach.maxProgress,
      label: `${ach.progress} / ${ach.maxProgress}`,
    };
  };

  return (
    <div className="w-full space-y-6" id="achievements-gallery-component">
      {/* Overview Stat Strip */}
      <div className="p-5 bg-surface border border-border rounded-2xl shadow-card flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-accent-subtle border border-accent-border flex items-center justify-center text-accent shadow-glow-accent-sm">
            <Trophy className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-text-primary">Milestones & Medals</h3>
              <span className="px-2 py-0.5 rounded-full bg-accent-subtle text-accent font-mono text-xs font-bold border border-accent-border">
                {percentComplete}% Complete
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Unlock badges for consecutive daily streaks, precision accuracy runs, and lightning-fast words per minute.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 divide-x divide-border self-stretch md:self-auto justify-around md:justify-end">
          <div className="px-3 text-center">
            <div className="text-2xl font-bold font-mono text-accent">{unlockedCount}/{totalAchievements}</div>
            <div className="text-[11px] text-text-subtle font-medium">Badges Earned</div>
          </div>
          <div className="pl-6 text-center">
            <div className="text-2xl font-bold font-mono text-primary">+{totalXpClaimed}</div>
            <div className="text-[11px] text-text-subtle font-medium">Bonus XP Claimed</div>
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
            activeCategory === 'all'
              ? 'bg-accent text-accent-foreground shadow-glow-accent-sm'
              : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
          }`}
        >
          All Milestones ({INITIAL_ACHIEVEMENTS.length})
        </button>

        <button
          onClick={() => setActiveCategory('streak')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
            activeCategory === 'streak'
              ? 'bg-accent text-accent-foreground shadow-glow-accent-sm'
              : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-accent" />
          <span>Streak Goals ({INITIAL_ACHIEVEMENTS.filter((a) => a.category === 'streak').length})</span>
        </button>

        <button
          onClick={() => setActiveCategory('accuracy')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
            activeCategory === 'accuracy'
              ? 'bg-success text-success-foreground shadow-sm'
              : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
          }`}
        >
          <Target className="w-3.5 h-3.5 text-success" />
          <span>Accuracy Badges ({INITIAL_ACHIEVEMENTS.filter((a) => a.category === 'accuracy').length})</span>
        </button>

        <button
          onClick={() => setActiveCategory('speed')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
            activeCategory === 'speed'
              ? 'bg-accent text-accent-foreground shadow-glow-accent-sm'
              : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-accent" />
          <span>Velocity Barriers ({INITIAL_ACHIEVEMENTS.filter((a) => a.category === 'speed').length})</span>
        </button>

        <button
          onClick={() => setActiveCategory('combo')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
            activeCategory === 'combo'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-primary" />
          <span>Combos ({INITIAL_ACHIEVEMENTS.filter((a) => a.category === 'combo').length})</span>
        </button>
      </div>

      {/* Grid of Badges */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAchievements.map((ach) => {
          const isUnlocked = unlockedAchievements.includes(ach.id);
          const liveProg = getLiveProgress(ach);
          const progressPercent = Math.min(100, Math.round((liveProg.current / liveProg.max) * 100));

          return (
            <div
              key={ach.id}
              className={`p-4 rounded-2xl border transition-all duration-150 relative overflow-hidden flex flex-col justify-between gap-3 ${
                isUnlocked
                  ? ach.category === 'streak'
                    ? 'bg-surface border-accent-border shadow-card'
                    : ach.category === 'accuracy'
                    ? 'bg-surface border-success-border shadow-card'
                    : 'bg-surface border-primary-border shadow-card'
                  : 'bg-surface-muted/40 border-border opacity-75 hover:opacity-100 hover:border-border-hover'
              }`}
            >
              {/* Top Header: Badge Medallion & Status */}
              <div className="flex items-start gap-3.5">
                {/* Medallion Icon */}
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 shadow-inner ${
                    isUnlocked
                      ? ach.category === 'streak'
                        ? 'bg-accent-subtle border-accent-border text-accent'
                        : ach.category === 'accuracy'
                        ? 'bg-success-subtle border-success-border text-success'
                        : 'bg-primary-subtle border-primary-border text-primary'
                      : 'bg-surface-muted border-border text-text-subtle'
                  }`}
                >
                  {renderAchievementIcon(ach.icon, isUnlocked, ach.category)}
                </div>

                {/* Title & Description */}
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-text-primary text-sm truncate">{ach.name}</h4>
                    {isUnlocked ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-success bg-success-subtle border border-success-border px-2 py-0.5 rounded-full shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>UNLOCKED</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-text-subtle bg-surface-muted px-2 py-0.5 rounded-full shrink-0 border border-border">
                        <Lock className="w-2.5 h-2.5" />
                        <span>LOCKED</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">{ach.description}</p>
                </div>
              </div>

              {/* Bottom Progress Bar & XP Reward */}
              <div className="pt-2 border-t border-border space-y-1.5">
                {!isUnlocked && (
                  <div>
                    <div className="flex justify-between text-[11px] text-text-muted font-mono mb-1">
                      <span>Progress:</span>
                      <span className="text-text-secondary font-semibold">{liveProg.label}</span>
                    </div>
                    <div className="w-full bg-surface-muted h-1.5 rounded-full overflow-hidden border border-border">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          ach.category === 'streak'
                            ? 'bg-accent'
                            : ach.category === 'accuracy'
                            ? 'bg-success'
                            : 'bg-primary'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-semibold text-text-subtle uppercase tracking-wider">
                    {ach.category} milestone
                  </span>
                  <span
                    className={`font-mono font-bold text-xs ${
                      isUnlocked ? 'text-accent' : 'text-text-muted'
                    }`}
                  >
                    +{ach.xpReward} XP
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
