'use client';

import React, { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import { Achievement, AICoachFeedback, AIMission, AISettings, GameMode, Lesson, TypingSessionSummary, TypingStats, UserProgress } from '@/types/typing';
import { generateAiCoachFeedback, generateAiMission } from '@/lib/ai-service';
import { getXpForNextLevel } from '@/lib/progress-service';
import confetti from 'canvas-confetti';
import { Award, Bot, Check, CheckCircle2, ChevronRight, Copy, Flame, Ghost, Pause, Play, RotateCcw, Share2, Sparkles, Target, Zap, X } from 'lucide-react';
import { BiometricLatencyHUD } from './BiometricLatencyHUD';

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
  activeLesson?: Lesson | null;
  onNextLesson?: () => void;
  onReturnToLessons?: () => void;
  onOpenAiDrill?: (lesson: Lesson) => void;
  targetText?: string;
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
  activeLesson,
  onNextLesson,
  onReturnToLessons,
  onOpenAiDrill,
  targetText,
}) => {
  const [coachFeedback, setCoachFeedback] = useState<AICoachFeedback | null>(null);
  const [loadingCoach, setLoadingCoach] = useState(true);
  const [generatingMission, setGeneratingMission] = useState(false);
  const [copiedGhost, setCopiedGhost] = useState(false);
  const [replayIdx, setReplayIdx] = useState<number>(0);
  const [isReplaying, setIsReplaying] = useState(false);

  const handleShareGhost = () => {
    if (!stats.replayEvents || stats.replayEvents.length === 0) return;
    const payload = {
      version: 1,
      id: 'ghost_' + Math.random().toString(36).substring(2, 8),
      targetText: targetText || 'Practice makes permanent keystroke rhythm and tactile flow.',
      wpm: stats.wpm,
      accuracy: stats.accuracy,
      author: userProgress.title || 'Ghost Racer',
      events: stats.replayEvents.map((e) => [e.deltaMs, e.index, e.isCorrect]),
    };
    try {
      const encoded = btoa(encodeURIComponent(JSON.stringify(payload)));
      const url = `${window.location.origin}/?duel=${encoded}`;
      navigator.clipboard.writeText(url).then(() => {
        setCopiedGhost(true);
        setTimeout(() => setCopiedGhost(false), 2500);
      });
    } catch {}
  };

  // Replay playhead timer
  useEffect(() => {
    if (!isReplaying || !stats.replayEvents || stats.replayEvents.length === 0) return;
    const interval = setInterval(() => {
      setReplayIdx((prev) => {
        if (prev >= (stats.replayEvents?.length || 1) - 1) {
          setIsReplaying(false);
          return 0;
        }
        return prev + 1;
      });
    }, 60);
    return () => clearInterval(interval);
  }, [isReplaying, stats.replayEvents]);

  useEffect(() => {
    if (!isOpen) return;

    // Trigger celebratory confetti if leveled up or personal best
    if (leveledUp || newAchievements.length > 0 || stats.wpm > userProgress.highScores.bestWpm) {
      try {
        const computed = typeof window !== 'undefined' ? getComputedStyle(document.documentElement) : null;
        const cAccent = computed?.getPropertyValue('--accent').trim();
        const cSuccess = computed?.getPropertyValue('--success').trim();
        const cPrimary = computed?.getPropertyValue('--primary').trim();
        const cInfo = computed?.getPropertyValue('--info').trim();
        const celebrationColors = [cAccent, cSuccess, cPrimary, cInfo].filter(Boolean) as string[];

        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: celebrationColors.length >= 2 ? celebrationColors : ['var(--accent)', 'var(--success)', 'var(--primary)', 'var(--info)'],
        });
      } catch {}
    }

    let isMounted = true;
    let hasFullResult = false;
    // 1. Instant optimistic feedback (<5ms)
    generateAiCoachFeedback(
      stats,
      { mode: modeTitle, level: userProgress.level, userWeakKeys: stats.weakKeys },
      { ...aiSettings, provider: 'offline' }
    ).then((optimistic) => {
      if (isMounted && !hasFullResult) {
        setCoachFeedback(optimistic);
      }
    });

    // 2. Full AI enhancement (if configured)
    generateAiCoachFeedback(
      stats,
      { mode: modeTitle, level: userProgress.level, userWeakKeys: stats.weakKeys },
      aiSettings
    )
      .then((feedback) => {
        if (isMounted) {
          hasFullResult = true;
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

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-overlay backdrop-blur-md overflow-y-auto animate-fadeIn"
      id="results-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="w-full max-w-3xl bg-surface border border-border rounded-2xl shadow-dialog overflow-hidden my-auto"
        id="results-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="results-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-surface-muted flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-accent">Session Complete</span>
            <h2 className="text-xl font-bold text-text-primary" id="results-modal-title">{modeTitle}</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-muted">Duration: {stats.elapsedSeconds}s</span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer"
              title="Close Results (Esc)"
              aria-label="Close session results dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-sm">
          {/* Lesson Mastery Banner (for Academy Lessons) */}
          {mode === 'lesson' && (
            <div
              className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
                stats.accuracy >= (activeLesson?.targetAccuracy || 90)
                  ? 'bg-success-subtle border-success-border text-success'
                  : 'bg-warning-subtle border-warning-border text-warning'
              }`}
            >
              <div className="flex items-center gap-3">
                {stats.accuracy >= (activeLesson?.targetAccuracy || 90) ? (
                  <CheckCircle2 className="w-6 h-6 text-success shrink-0" />
                ) : (
                  <Target className="w-6 h-6 text-warning shrink-0" />
                )}
                <div>
                  <h4 className="font-bold text-text-primary text-sm">
                    {stats.accuracy >= (activeLesson?.targetAccuracy || 90)
                      ? 'Lesson Mastered!'
                      : 'More Practice Recommended'}
                  </h4>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Target: ≥{activeLesson?.targetAccuracy || 90}% Accuracy, {activeLesson?.targetWpm || 15} WPM • You achieved{' '}
                    <span className="font-bold text-text-primary">{stats.accuracy}%</span> at{' '}
                    <span className="font-bold text-text-primary">{stats.wpm} WPM</span>.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {activeLesson && onOpenAiDrill && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAiDrill(activeLesson);
                    }}
                    className="px-3 py-1.5 bg-primary-subtle hover:bg-primary/20 text-accent text-xs font-semibold rounded-lg border border-accent-border shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Generate new practice letter patterns strictly for this lesson"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                    <span>Retry with AI Drill</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onRestart}
                  className="px-3 py-1.5 bg-surface hover:bg-surface-hover text-text-primary text-xs font-semibold rounded-lg border border-border shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Re-practice Same Letters</span>
                </button>
              </div>
            </div>
          )}

          {/* Level Up Banner */}
          {leveledUp && (
            <div className="p-4 bg-accent-subtle border border-accent-border rounded-xl flex items-center gap-3">
              <Award className="w-8 h-8 text-accent animate-bounce" />
              <div>
                <h3 className="font-bold text-text-primary text-base">LEVEL UP! You reached Level {userProgress.level}</h3>
                <p className="text-xs text-text-secondary">New Rank unlocked: {userProgress.title}</p>
              </div>
            </div>
          )}

          {/* New Achievements Banner */}
          {newAchievements.length > 0 && (
            <div className="space-y-2">
              {newAchievements.map((ach) => (
                <div key={ach.id} className="p-3 bg-success-subtle border border-success-border rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-success" />
                    <div>
                      <span className="font-semibold text-text-primary">Achievement Unlocked: {ach.name}</span>
                      <p className="text-text-secondary">{ach.description}</p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-accent">+{ach.xpReward} XP</span>
                </div>
              ))}
            </div>
          )}

          {/* Core Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-surface-muted border border-border rounded-xl flex flex-col">
              <span className="text-xs font-medium text-text-muted">Net Speed</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-extrabold text-accent font-mono">{stats.wpm}</span>
                <span className="text-xs text-text-subtle font-mono">WPM</span>
              </div>
              <span className="text-[11px] text-text-subtle mt-0.5">Raw: {stats.rawWpm} WPM</span>
            </div>

            <div className="p-4 bg-surface-muted border border-border rounded-xl flex flex-col">
              <span className="text-xs font-medium text-text-muted">Accuracy</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className={`text-3xl font-extrabold font-mono ${stats.accuracy >= 95 ? 'text-success' : 'text-accent'}`}>
                  {stats.accuracy}%
                </span>
              </div>
              <span className="text-[11px] text-text-subtle mt-0.5">{stats.incorrectChars} mistakes</span>
            </div>

            <div className="p-4 bg-surface-muted border border-border rounded-xl flex flex-col">
              <span className="text-xs font-medium text-text-muted">
                {stats.confidenceScore !== undefined ? 'Keybr Confidence' : 'Max Combo'}
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                {stats.confidenceScore !== undefined ? (
                  <>
                    <span className="text-3xl font-extrabold text-info font-mono">
                      {Math.round(stats.confidenceScore * 100)}%
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-3xl font-extrabold text-info font-mono">{stats.maxCombo}</span>
                    <span className="text-xs text-text-subtle font-mono">keys</span>
                  </>
                )}
              </div>
              <span className="text-[11px] text-text-subtle mt-0.5">
                {stats.confidenceScore !== undefined
                  ? stats.confidenceScore >= 0.85
                    ? 'Target Mastered 🎯'
                    : 'Target Developing ⚡'
                  : `Rhythm: ${stats.consistency}%`}
              </span>
            </div>

            <div className="p-4 bg-surface-muted border border-border rounded-xl flex flex-col">
              <span className="text-xs font-medium text-text-muted">XP Earned</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-extrabold text-primary font-mono">
                  +{sessionSummary?.xpEarned || 25}
                </span>
                <span className="text-xs text-text-subtle font-mono">XP</span>
              </div>
              <div className="w-full bg-border h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${xpPercent}%` }} />
              </div>
            </div>
          </div>

          {/* DDA Dynamic Difficulty In-Flow Remediation Banner */}
          {stats.remediatedHesitationCount !== undefined && stats.remediatedHesitationCount > 0 && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-emerald-400">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong className="text-foreground">DDA Flow Remediation:</strong>{' '}
                  You conquered {stats.remediatedHesitationCount} hesitation{stats.remediatedHesitationCount > 1 ? 's' : ''} in-flow without breaking rhythm!
                </span>
              </div>
              <span className="font-mono text-[10px] text-emerald-300 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 font-bold shrink-0">
                +{stats.remediatedHesitationCount * 15} XP Bonus
              </span>
            </div>
          )}

          {/* Ghost Replay & Asynchronous Duel Card */}
          {stats.replayEvents && stats.replayEvents.length > 0 && (
            <div className="p-4 bg-surface-muted border border-border rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ghost className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-foreground">
                    Asynchronous Ghost Duel & Replay Theater
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                    {stats.replayEvents.length} Keystrokes
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleShareGhost}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  id="share-ghost-duel-btn"
                >
                  {copiedGhost ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share Ghost Duel</span>
                    </>
                  )}
                </button>
              </div>

              {/* Scrubber Controls */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsReplaying(!isReplaying)}
                  className="p-1.5 rounded-lg bg-surface border border-border text-foreground hover:bg-surface-hover transition-colors"
                  aria-label={isReplaying ? 'Pause replay' : 'Play replay'}
                >
                  {isReplaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                </button>
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={stats.replayEvents.length - 1}
                    value={replayIdx}
                    onChange={(e) => {
                      setIsReplaying(false);
                      setReplayIdx(Number(e.target.value));
                    }}
                    className="w-full accent-purple-500 h-1.5 bg-border rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-foreground-muted shrink-0 w-16 text-right">
                    {stats.replayEvents[replayIdx]?.deltaMs ? `${(stats.replayEvents[replayIdx].deltaMs / 1000).toFixed(1)}s` : '0.0s'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* WPM Timeline Graph */}
          {timelinePoints.length > 2 && (
            <div className="p-4 bg-surface-muted border border-border rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-accent" />
                  Speed Trajectory
                </span>
                <span className="text-[11px] text-text-subtle font-mono">Peak: {maxTimelineWpm} WPM</span>
              </div>
              <div className="w-full overflow-hidden">
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-24 stroke-accent fill-none overflow-visible">
                  {/* Grid baseline */}
                  <line x1="0" y1={svgHeight - 10} x2={svgWidth} y2={svgHeight - 10} stroke="var(--border)" strokeDasharray="3 3" />
                  {/* Polyline */}
                  <polyline
                    fill="none"
                    stroke="var(--accent)"
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
            <div className="p-4 bg-surface-muted border border-border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-danger" />
                  Hesitation Hotspots
                </span>
                <div className="flex items-center gap-2 mt-2">
                  {stats.weakKeys.map((key) => (
                    <span
                      key={key}
                      className="px-2.5 py-1 bg-danger-subtle border border-danger-border text-danger font-mono font-bold text-xs rounded-lg"
                    >
                      {key.toUpperCase()} ({stats.errorsByChar[key] || 1}x)
                    </span>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onTrainWeakKeys(stats.weakKeys)}
                className="px-3.5 py-2 bg-surface-hover hover:bg-surface-active text-text-primary text-xs font-semibold rounded-xl border border-border transition-colors flex items-center gap-1.5 self-start sm:self-center"
              >
                <span>Drill Weak Keys</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Biometric Keystroke Latency HUD */}
          <BiometricLatencyHUD
            stats={stats}
            userProgress={userProgress}
            onDrillKey={(key) => onTrainWeakKeys([key])}
            defaultExpanded={true}
          />

          {/* AI Coach Analysis Card */}
          <div className="p-4 bg-gradient-to-br from-primary-subtle to-surface-muted border border-primary-border rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-semibold text-xs">
                <Bot className="w-4 h-4 text-primary" />
                <span>AI Coach Diagnosis</span>
              </div>
              <span className="text-[11px] text-text-subtle">
                {aiSettings.provider === 'gemini' ? 'Google Gemini' : aiSettings.model || 'Smart Coach'}
              </span>
            </div>

            {loadingCoach ? (
              <div className="py-3 flex items-center gap-2 text-xs text-text-muted">
                <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span>Synthesizing keystroke mechanics and rhythm...</span>
              </div>
            ) : coachFeedback ? (
              <div className="space-y-2 text-xs text-text-secondary leading-relaxed">
                <p>
                  <strong className="text-text-primary">{coachFeedback.wpmSummary}</strong> {coachFeedback.accuracyAssessment}
                </p>
                <div className="p-3 bg-surface rounded-xl border border-border-subtle text-text-secondary">
                  <span className="text-primary font-semibold block mb-1">Sensei Tip: </span>
                  <div className="prose prose-xs max-w-none text-xs text-text-secondary leading-relaxed [&>strong]:text-accent [&>code]:bg-surface-muted [&>code]:text-accent [&>code]:px-1 [&>code]:rounded [&>p]:mb-1 [&>p:last-child]:mb-0">
                    <Markdown>{coachFeedback.keyAdvice}</Markdown>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Launch AI Mission & 1-Click Remediation Sprint CTA */}
            <div className="pt-2 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <span className="text-xs text-text-muted">Coach Actionable Next Step:</span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {coachFeedback?.recommendedMission && (
                  <button
                    type="button"
                    onClick={() => {
                      onStartMission(coachFeedback.recommendedMission!);
                      onClose();
                    }}
                    className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-accent hover:bg-accent/90 text-accent-foreground text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    id="launch-coach-remediation-button"
                    title="Launch instant 60s targeted drill designed by your Coach"
                  >
                    <Zap className="w-3.5 h-3.5 text-accent-foreground" />
                    <span>Launch 60s Remediation Drill</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCreateMission}
                  disabled={generatingMission}
                  className="px-3 py-1.5 bg-surface-hover hover:bg-surface-active border border-border text-text-primary text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                  id="generate-ai-mission-button"
                >
                  {generatingMission ? (
                    <>
                      <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      <span>Custom Mission</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border bg-surface-muted flex flex-col sm:flex-row items-center justify-between gap-3">
          {mode === 'lesson' ? (
            <>
              <button
                type="button"
                onClick={onReturnToLessons || onClose}
                className="text-xs text-text-muted hover:text-text-primary font-medium transition-colors order-2 sm:order-1"
              >
                ← Return to Academy Curriculum
              </button>
              <div className="flex items-center gap-2.5 order-1 sm:order-2 flex-wrap">
                {activeLesson && onOpenAiDrill && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAiDrill(activeLesson);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-primary-subtle to-accent-subtle hover:from-primary/20 hover:to-accent/20 text-accent text-xs font-bold rounded-xl border border-accent-border transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    id="results-ai-drill-button"
                    title="Practice this lesson with AI-generated letter combinations"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                    <span>Retry with AI Drill</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onRestart}
                  className="px-4 py-2 bg-surface-hover hover:bg-surface-active text-text-primary text-xs font-semibold rounded-xl border border-border transition-colors flex items-center gap-1.5 cursor-pointer"
                  id="results-restart-button"
                  title="Reset with the exact same lesson letters for re-practice"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Re-practice Lesson (Tab)</span>
                </button>
                {onNextLesson && (
                  <button
                    type="button"
                    onClick={onNextLesson}
                    className="px-4 py-2 bg-accent hover:bg-accent-hover text-accent-foreground text-xs font-bold rounded-xl shadow-glow-accent-sm transition-all flex items-center gap-1.5 cursor-pointer"
                    id="results-next-lesson-button"
                  >
                    <span>Next Lesson</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-text-muted hover:text-text-primary font-medium transition-colors"
              >
                Close & Review
              </button>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onRestart}
                  className="px-4 py-2 bg-surface-hover hover:bg-surface-active text-text-primary text-xs font-medium rounded-xl border border-border transition-colors flex items-center gap-1.5 cursor-pointer"
                  id="results-restart-button"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Test (Tab+Enter)</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
