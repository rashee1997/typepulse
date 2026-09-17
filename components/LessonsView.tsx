'use client';

import React from 'react';
import { Lesson } from '@/types/typing';
import { BookOpen, CheckCircle, ChevronRight, Lock, Star, Trophy, Zap } from 'lucide-react';

interface LessonsViewProps {
  lessons: Lesson[];
  completedLessonIds: string[];
  lessonStars: Record<string, number>;
  onSelectLesson: (lesson: Lesson) => void;
  onBackToPractice: () => void;
}

export const LessonsView: React.FC<LessonsViewProps> = ({
  lessons,
  completedLessonIds,
  lessonStars,
  onSelectLesson,
  onBackToPractice,
}) => {
  const tiers = [1, 2, 3, 4] as const;

  const getTierLessons = (tier: number) => lessons.filter((l) => l.tier === tier);

  const isTierUnlocked = (tier: number) => {
    if (tier === 1) return true;
    const prevTierLessons = getTierLessons(tier - 1);
    const completedCount = prevTierLessons.filter((l) => completedLessonIds.includes(l.id)).length;
    return completedCount >= Math.ceil(prevTierLessons.length * 0.75);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-fadeIn" id="lessons-view-container">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-surface border border-border rounded-2xl shadow-card">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-accent text-xs font-semibold uppercase tracking-wider">
            <BookOpen className="w-4 h-4" />
            <span>Structured Curriculum</span>
          </div>
          <h2 className="text-2xl font-bold text-text-primary">Touch Typing Academy</h2>
          <p className="text-xs text-text-muted">
            From the anchor keys F & J to 50+ WPM rhythm mastery. Progress sequentially to build indestructible muscle memory.
          </p>
        </div>
        <button
          onClick={onBackToPractice}
          className="px-4 py-2 bg-surface-muted hover:bg-surface-hover text-text-secondary hover:text-text-primary text-xs font-medium rounded-xl border border-border self-start sm:self-center transition-colors"
        >
          Free Practice
        </button>
      </div>

      {/* Tiers List */}
      <div className="space-y-8">
        {tiers.map((tier) => {
          const tierLessons = getTierLessons(tier);
          const unlocked = isTierUnlocked(tier);
          const completedInTier = tierLessons.filter((l) => completedLessonIds.includes(l.id)).length;
          const tierPercent = Math.round((completedInTier / tierLessons.length) * 100);

          return (
            <div
              key={tier}
              className={`p-6 rounded-2xl border transition-all ${
                unlocked
                  ? 'bg-surface border-border shadow-card'
                  : 'bg-surface-muted/40 border-border opacity-65'
              }`}
            >
              {/* Tier Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm border ${
                      unlocked
                        ? 'bg-accent-subtle border-accent-border text-accent shadow-glow-accent-sm'
                        : 'bg-surface-muted border-border text-text-subtle'
                    }`}
                  >
                    {unlocked ? tier : <Lock className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-text-primary text-base">
                      {tierLessons[0]?.tierTitle || `Tier ${tier}`}
                    </h3>
                    <span className="text-xs text-text-muted">
                      {completedInTier} of {tierLessons.length} completed ({tierPercent}%)
                    </span>
                  </div>
                </div>

                <div className="w-32 bg-surface-muted h-2 rounded-full overflow-hidden hidden sm:block border border-border">
                  <div
                    className="bg-accent h-full rounded-full transition-all"
                    style={{ width: `${tierPercent}%` }}
                  />
                </div>
              </div>

              {/* Lesson Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tierLessons.map((lesson, idx) => {
                  const isCompleted = completedLessonIds.includes(lesson.id);
                  const stars = lessonStars[lesson.id] || (isCompleted ? 3 : 0);

                  // A lesson is unlocked if it's the first one in tier or previous lesson is completed
                  const prevLesson = idx > 0 ? tierLessons[idx - 1] : null;
                  const isLessonUnlocked = unlocked && (!prevLesson || completedLessonIds.includes(prevLesson.id));

                  return (
                    <div
                      key={lesson.id}
                      className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                        isLessonUnlocked
                          ? 'bg-surface-muted border-border hover:border-border-hover hover:bg-surface-hover/80 shadow-sm'
                          : 'bg-surface-muted/30 border-border text-text-subtle'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-text-primary">{lesson.title}</span>
                          {isCompleted ? (
                            <div className="flex items-center gap-0.5 text-accent">
                              {Array.from({ length: 3 }).map((_, s) => (
                                <Star
                                  key={s}
                                  className={`w-3.5 h-3.5 ${s < stars ? 'fill-accent text-accent' : 'text-text-subtle'}`}
                                />
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-accent font-mono">+{lesson.xpReward} XP</span>
                          )}
                        </div>
                        <p className="text-xs text-text-muted line-clamp-2">{lesson.description}</p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border text-[11px] text-text-muted">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 font-mono">
                            <Zap className="w-3 h-3 text-accent" />
                            {lesson.targetWpm} WPM
                          </span>
                          <span className="font-mono">
                            {lesson.targetAccuracy}% Acc
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={!isLessonUnlocked}
                          onClick={() => onSelectLesson(lesson)}
                          className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors text-xs ${
                            isLessonUnlocked
                              ? isCompleted
                                ? 'bg-surface hover:bg-surface-hover text-text-secondary border border-border'
                                : 'bg-accent hover:bg-accent-hover text-accent-foreground shadow-glow-accent-sm'
                              : 'bg-surface-muted/50 text-text-subtle cursor-not-allowed border border-border'
                          }`}
                        >
                          <span>{isCompleted ? 'Review' : 'Start'}</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
