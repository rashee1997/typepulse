'use client';

import React, { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import { Achievement, AICoachFeedback, AIMission, AISettings, GameMode, TypingSessionSummary, TypingStats, UserProgress } from '@/types/typing';
import { generateAiCoachFeedback, generateAiMission } from '@/lib/ai-service';
import { getXpForNextLevel } from '@/lib/progress-service';
import confetti from 'canvas-confetti';
import { Award, Bot, CheckCircle2, ChevronRight, Flame, RotateCcw, Sparkles, Target, Zap } from 'lucide-react';

interface ResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: TypingStats;
  mode: GameMode;
  modeTitle: string;
  userProgress: UserProgress;
  sessionSummary?: TypingSessionSummary;
  newAchievements: Achievement[];
  leveledUp: boolean;
  aiSettings: AISettings;
  onStartMission: (mission: AIMission) => void;
  onRestart: () => void;
  onTrainWeakKeys: (weakKeys: string[]) => void;
}

export const ResultsModal: React.FC<ResultsModalProps> = ({
  isOpen,
  onClose,
  stats,
  mode,
  modeTitle,
  userProgress,
  sessionSummary,
  newAchievements,
  leveledUp,
  aiSettings,
  onStartMission,
  onRestart,
  onTrainWeakKeys,
}) => {
  const [coachFeedback, setCoachFeedback] = useState<AICoachFeedback | null>(null);
  const [loadingCoach, setLoadingCoach] = useState(true);
  const [generatingMission, setGeneratingMission] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Trigger celebratory confetti if leveled up or personal best
    if (leveledUp || newAchievements.length > 0 || stats.wpm > userProgress.highScores.bestWpm) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#10b981', '#6366f1', '#ec4899'],
        });
      } catch {}
    }

    let isMounted = true;
    generateAiCoachFeedback(
      stats,
      { mode: modeTitle, level: userProgress.level, userWeakKeys: stats.weakKeys },
      aiSettings
    )
      .then((feedback) => {
        if (isMounted) {
          setCoachFeedback(feedback);
          setLoadingCoach(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoadingCoach(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, stats, modeTitle, userProgress.level, userProgress.highScores.bestWpm, aiSettings, leveledUp, newAchievements.length]);

  if (!isOpen) return null;

  const handleCreateMission = async () => {
    setGeneratingMission(true);
    try {
      const mission = await generateAiMission(stats.weakKeys, stats.wpm, aiSettings);
      onStartMission(mission);
      onClose();
    } finally {
      setGeneratingMission(false);
    }
  };

  const xpNeeded = getXpForNextLevel(userProgress.level);
  const xpPercent = Math.min(100, Math.round((userProgress.xp / xpNeeded) * 100));

  // Build SVG Points for WPM Timeline
  const timelinePoints = stats.timeline;
  const maxTimelineWpm = Math.max(30, ...timelinePoints.map((p) => Math.max(p.wpm, p.rawWpm)));
  const svgWidth = 460;
  const svgHeight = 100;

  const getSvgCoordinates = (sample: { time: number; wpm: number }, index: number) => {
    const x = timelinePoints.length > 1 ? (index / (timelinePoints.length - 1)) * svgWidth : svgWidth / 2;
    const y = svgHeight - (sample.wpm / maxTimelineWpm) * (svgHeight - 20) - 10;
    return `${x},${y}`;
  };

  const polylinePoints = timelinePoints.map(getSvgCoordinates).join(' ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn" id="results-modal-backdrop">
      <div 
        className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto"
        id="results-modal-dialog"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-amber-400">Session Complete</span>
            <h2 className="text-xl font-bold text-slate-100">{modeTitle}</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Duration: {stats.elapsedSeconds}s</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-sm">
          {/* Level Up Banner */}
          {leveledUp && (
            <div className="p-4 bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-transparent border border-amber-500/40 rounded-xl flex items-center gap-3">
              <Award className="w-8 h-8 text-amber-400 animate-bounce" />
              <div>
                <h3 className="font-bold text-amber-300 text-base">LEVEL UP! You reached Level {userProgress.level}</h3>
                <p className="text-xs text-amber-200/80">New Rank unlocked: {userProgress.title}</p>
              </div>
            </div>
          )}

          {/* New Achievements Banner */}
          {newAchievements.length > 0 && (
            <div className="space-y-2">
              {newAchievements.map((ach) => (
                <div key={ach.id} className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="font-semibold text-emerald-300">Achievement Unlocked: {ach.name}</span>
                      <p className="text-emerald-400/80">{ach.description}</p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-amber-400">+{ach.xpReward} XP</span>
                </div>
              ))}
            </div>
          )}

          {/* Core Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-col">
              <span className="text-xs font-medium text-slate-400">Net Speed</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-extrabold text-amber-400 font-mono">{stats.wpm}</span>
                <span className="text-xs text-slate-500 font-mono">WPM</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5">Raw: {stats.rawWpm} WPM</span>
            </div>

            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-col">
              <span className="text-xs font-medium text-slate-400">Accuracy</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className={`text-3xl font-extrabold font-mono ${stats.accuracy >= 95 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {stats.accuracy}%
                </span>
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5">{stats.incorrectChars} mistakes</span>
            </div>

            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-col">
              <span className="text-xs font-medium text-slate-400">Max Combo</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-extrabold text-cyan-400 font-mono">{stats.maxCombo}</span>
                <span className="text-xs text-slate-500 font-mono">keys</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5">Rhythm: {stats.consistency}%</span>
            </div>

            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-col">
              <span className="text-xs font-medium text-slate-400">XP Earned</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-extrabold text-indigo-400 font-mono">
                  +{sessionSummary?.xpEarned || 25}
                </span>
                <span className="text-xs text-slate-500 font-mono">XP</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${xpPercent}%` }} />
              </div>
            </div>
          </div>

          {/* WPM Timeline Graph */}
          {timelinePoints.length > 2 && (
            <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Speed Trajectory
                </span>
                <span className="text-[11px] text-slate-500 font-mono">Peak: {maxTimelineWpm} WPM</span>
              </div>
              <div className="w-full overflow-hidden">
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-24 stroke-amber-400 fill-none overflow-visible">
                  {/* Grid baseline */}
                  <line x1="0" y1={svgHeight - 10} x2={svgWidth} y2={svgHeight - 10} stroke="#334155" strokeDasharray="3 3" />
                  {/* Polyline */}
                  <polyline
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={polylinePoints}
                  />
                </svg>
              </div>
            </div>
          )}

          {/* Weak Keys Diagnosis */}
          {stats.weakKeys.length > 0 && (
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-rose-400" />
                  Hesitation Hotspots
                </span>
                <div className="flex items-center gap-2 mt-2">
                  {stats.weakKeys.map((key) => (
                    <span
                      key={key}
                      className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono font-bold text-xs rounded-lg"
                    >
                      {key.toUpperCase()} ({stats.errorsByChar[key] || 1}x)
                    </span>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onTrainWeakKeys(stats.weakKeys)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 self-start sm:self-center"
              >
                <span>Drill Weak Keys</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* AI Coach Analysis Card */}
          <div className="p-4 bg-gradient-to-br from-indigo-950/30 to-slate-950 border border-indigo-500/30 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs">
                <Bot className="w-4 h-4 text-indigo-400" />
                <span>AI Coach Diagnosis</span>
              </div>
              <span className="text-[11px] text-slate-500">
                {aiSettings.provider === 'gemini' ? 'Google Gemini' : aiSettings.model || 'Smart Coach'}
              </span>
            </div>

            {loadingCoach ? (
              <div className="py-3 flex items-center gap-2 text-xs text-slate-400">
                <div className="w-3 h-3 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                <span>Synthesizing keystroke mechanics and rhythm...</span>
              </div>
            ) : coachFeedback ? (
              <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                <p>
                  <strong className="text-slate-100">{coachFeedback.wpmSummary}</strong> {coachFeedback.accuracyAssessment}
                </p>
                <div className="p-3 bg-slate-900/80 rounded-xl border border-indigo-500/20 text-indigo-200">
                  <span className="text-indigo-400 font-semibold block mb-1">Sensei Tip: </span>
                  <div className="prose prose-invert prose-xs max-w-none text-xs text-indigo-200 leading-relaxed [&>strong]:text-amber-300 [&>code]:bg-slate-950 [&>code]:text-amber-300 [&>code]:px-1 [&>code]:rounded [&>p]:mb-1 [&>p:last-child]:mb-0">
                    <Markdown>{coachFeedback.keyAdvice}</Markdown>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Launch AI Mission CTA */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-xs text-slate-400">Ready for tailored practice?</span>
              <button
                type="button"
                onClick={handleCreateMission}
                disabled={generatingMission}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                id="generate-ai-mission-button"
              >
                {generatingMission ? (
                  <>
                    <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate AI Mission</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-200 font-medium"
          >
            Close & Review
          </button>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onRestart}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
              id="results-restart-button"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Test (Tab+Enter)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
