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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <BookOpen className="w-4 h-4" />
            <span>Structured Curriculum</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-100">Touch Typing Academy</h2>
          <p className="text-xs text-slate-400">
            From the anchor keys F & J to 50+ WPM rhythm mastery. Progress sequentially to build indestructible muscle memory.
          </p>
        </div>
        <button
          onClick={onBackToPractice}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 self-start sm:self-center transition-colors"
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
                  ? 'bg-slate-900/60 border-slate-800 shadow-lg'
                  : 'bg-slate-950/40 border-slate-800/50 opacity-65'
              }`}
            >
              {/* Tier Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm border ${
                      unlocked
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                        : 'bg-slate-800 border-slate-700 text-slate-500'
                    }`}
                  >
                    {unlocked ? tier : <Lock className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-100 text-base">
                      {tierLessons[0]?.tierTitle || `Tier ${tier}`}
                    </h3>
                    <span className="text-xs text-slate-400">
                      {completedInTier} of {tierLessons.length} completed ({tierPercent}%)
                    </span>
                  </div>
                </div>

                <div className="w-32 bg-slate-800 h-2 rounded-full overflow-hidden hidden sm:block">
                  <div
                    className="bg-amber-400 h-full rounded-full transition-all"
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
                          ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90 shadow-sm'
                          : 'bg-slate-950/30 border-slate-900 text-slate-600'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200">{lesson.title}</span>
                          {isCompleted ? (
                            <div className="flex items-center gap-0.5 text-amber-400">
                              {Array.from({ length: 3 }).map((_, s) => (
                                <Star
                                  key={s}
                                  className={`w-3.5 h-3.5 ${s < stars ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`}
                                />
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-amber-400/80 font-mono">+{lesson.xpReward} XP</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2">{lesson.description}</p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 font-mono">
                            <Zap className="w-3 h-3 text-amber-400" />
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
                                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                                : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-sm'
                              : 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
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
