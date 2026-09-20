'use client';

import React, { useState } from 'react';
import { useModalFocus } from '@/hooks/use-modal-focus';
import {
  CERTIFICATION_BENCHMARKS,
  CertificationPassage,
  STANDARDIZED_CERTIFICATION_PASSAGES,
} from '@/lib/certification-service';
import { CertificationBenchmark } from '@/types/typing';
import { Award, CheckCircle2, ChevronRight, Clock, ShieldCheck, Sparkles, Target, Trophy, X, Zap } from 'lucide-react';

interface CertificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTest: (passage: CertificationPassage, durationSeconds: number) => void;
  bestWpm?: number;
  bestAccuracy?: number;
}

export const CertificationModal: React.FC<CertificationModalProps> = ({
  isOpen,
  onClose,
  onStartTest,
  bestWpm = 0,
  bestAccuracy = 0,
}) => {
  const dialogRef = useModalFocus<HTMLDivElement>(isOpen, onClose);
  const [selectedDuration, setSelectedDuration] = useState<60 | 180 | 300>(60);
  const [selectedPassageId, setSelectedPassageId] = useState<string>(
    STANDARDIZED_CERTIFICATION_PASSAGES[0].id
  );

  if (!isOpen) return null;

  const chosenPassage =
    STANDARDIZED_CERTIFICATION_PASSAGES.find((p) => p.id === selectedPassageId) ||
    STANDARDIZED_CERTIFICATION_PASSAGES[0];

  const handleLaunch = () => {
    onStartTest(chosenPassage, selectedDuration);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-overlay backdrop-blur-md overflow-y-auto animate-fadeIn"
      id="certification-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-3xl bg-surface border border-border rounded-2xl shadow-dialog overflow-hidden my-auto flex flex-col max-h-[90vh]"
        id="certification-modal-dialog"
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="certification-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-surface-muted flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-subtle border border-accent-border flex items-center justify-center text-accent shadow-glow-accent-sm">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider font-bold text-accent bg-accent-subtle border border-accent-border px-2 py-0.5 rounded-full">
                  International Standard
                </span>
                <span className="text-xs text-text-subtle font-mono">Timed Official Exam</span>
              </div>
              <h2 className="text-lg font-bold text-text-primary mt-0.5" id="certification-modal-title">
                Touch Typing Certification Benchmark
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
            aria-label="Close certification modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Overview Info Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-accent-subtle/40 via-surface to-primary-subtle/30 border border-accent-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-success" />
                Standards-Aligned Speed & Accuracy Benchmark
              </h3>
              <p className="text-xs text-text-muted mt-0.5 max-w-xl">
                Pass fixed timed benchmarks on standardized passages without assistance. Earn Bronze, Silver, Gold, Platinum, or Diamond accreditation badges.
              </p>
            </div>
            <div className="text-left sm:text-right shrink-0">
              <span className="text-[11px] text-text-subtle font-mono block">Current Best:</span>
              <span className="text-sm font-mono font-bold text-accent">
                {bestWpm} WPM • {bestAccuracy}% Acc
              </span>
            </div>
          </div>

          {/* Tier Standards Grid */}
          <div className="space-y-2.5">
            <span className="text-xs uppercase tracking-wider font-bold text-text-secondary">
              Accreditation Benchmark Tiers
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {CERTIFICATION_BENCHMARKS.map((tier) => {
                const isEarned = bestWpm >= tier.minWpm && bestAccuracy >= tier.minAccuracy;
                return (
                  <div
                    key={tier.id}
                    className={`p-3 rounded-xl border flex flex-col justify-between gap-2 transition-all ${
                      isEarned
                        ? 'bg-accent-subtle/30 border-accent text-text-primary shadow-xs'
                        : 'bg-surface-muted/40 border-border text-text-muted'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xl">{tier.badge}</span>
                        {isEarned && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                        )}
                      </div>
                      <div className="text-xs font-bold mt-1">{tier.title.split(' ')[0]}</div>
                      <div className="text-[10px] text-text-subtle mt-0.5 font-mono">
                        &ge;{tier.minWpm} WPM
                      </div>
                      <div className="text-[10px] text-text-subtle font-mono">
                        &ge;{tier.minAccuracy}% Acc
                      </div>
                    </div>
                    <span
                      className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded text-center ${
                        isEarned
                          ? 'bg-success text-success-foreground'
                          : 'bg-surface-muted text-text-subtle'
                      }`}
                    >
                      {isEarned ? 'Earned' : 'Locked'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Exam Duration Selector */}
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wider font-bold text-text-secondary flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-accent" />
              Standardized Exam Duration
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { seconds: 60 as const, label: '1 Minute Sprint', desc: 'Fast benchmark' },
                { seconds: 180 as const, label: '3 Minutes Standard', desc: 'Standard exam' },
                { seconds: 300 as const, label: '5 Minutes Endurance', desc: 'Championship test' },
              ].map((dur) => (
                <button
                  key={dur.seconds}
                  type="button"
                  onClick={() => setSelectedDuration(dur.seconds)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedDuration === dur.seconds
                      ? 'bg-accent-subtle border-accent text-accent ring-1 ring-accent'
                      : 'bg-surface hover:bg-surface-hover border-border text-text-secondary'
                  }`}
                >
                  <div className="text-xs font-bold">{dur.label}</div>
                  <div className="text-[10px] text-text-muted mt-0.5">{dur.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Passage Selection */}
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wider font-bold text-text-secondary">
              Standardized Passage Corpus
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {STANDARDIZED_CERTIFICATION_PASSAGES.map((pass) => (
                <button
                  key={pass.id}
                  type="button"
                  onClick={() => setSelectedPassageId(pass.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedPassageId === pass.id
                      ? 'bg-accent-subtle/50 border-accent text-text-primary shadow-xs'
                      : 'bg-surface hover:bg-surface-hover border-border text-text-secondary'
                  }`}
                >
                  <div className="text-xs font-bold text-text-primary">{pass.title}</div>
                  <div className="text-[10px] text-text-muted font-mono mt-0.5">
                    {pass.wordCount} words • Standard prose
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface-muted flex items-center justify-between shrink-0">
          <span className="text-xs text-text-subtle font-mono hidden sm:inline">
            Timed test • Strict backspacing discipline • Official grading
          </span>
          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary rounded-xl hover:bg-surface-hover transition-colors border border-border cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleLaunch}
              className="px-5 py-2 text-xs font-bold text-accent-foreground bg-accent hover:bg-accent-hover rounded-xl transition-colors shadow-glow-accent-sm flex items-center gap-1.5 cursor-pointer"
              id="start-certification-exam-button"
            >
              <span>Begin Timed Exam</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
