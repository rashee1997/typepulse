'use client';

import React, { useState } from 'react';
import {
  Check,
  Copy,
  Flame,
  Ghost,
  Play,
  Share2,
  Swords,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import { GhostDuelPayload, UserProgress } from '@/types/typing';
import { parseGhostDuelPayload } from '@/lib/typing-engine';

export interface GhostDuelModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeGhostPayload?: GhostDuelPayload | null;
  initialDuel?: GhostDuelPayload | null;
  onStartDuel: (ghost: GhostDuelPayload) => void;
  currentShareUrl?: string;
  userProgress?: UserProgress;
}

const CURATED_GHOSTS: GhostDuelPayload[] = [
  {
    version: 1,
    id: 'ghost_cadence_expert',
    targetText: 'The fundamental law of fluid typing is rhythmic cadence. When keystrokes flow uniformly, velocity naturally follows.',
    wpm: 68,
    accuracy: 99,
    author: 'Cadence Runner (Bronze)',
    events: Array.from({ length: 110 }, (_, i) => [Math.round(i * (60000 / (68 * 5))), i, true]),
  },
  {
    version: 1,
    id: 'ghost_velocity_artisan',
    targetText: 'System engineering demands clean abstractions, predictable latencies, and relentless discipline in memory allocation.',
    wpm: 94,
    accuracy: 98,
    author: 'Velocity Artisan (Gold)',
    events: Array.from({ length: 118 }, (_, i) => [Math.round(i * (60000 / (94 * 5))), i, true]),
  },
  {
    version: 1,
    id: 'ghost_cybernetic_apex',
    targetText: 'True mastery over the keyboard transcends conscious thought. The fingers anticipate syntax before the mind analyzes it.',
    wpm: 122,
    accuracy: 100,
    author: 'Cybernetic Apex (Grandmaster)',
    events: Array.from({ length: 121 }, (_, i) => [Math.round(i * (60000 / (122 * 5))), i, true]),
  },
];

export const GhostDuelModal: React.FC<GhostDuelModalProps> = ({
  isOpen,
  onClose,
  activeGhostPayload,
  initialDuel,
  onStartDuel,
  currentShareUrl,
}) => {
  const [copied, setCopied] = useState(false);
  const [pasteInput, setPasteInput] = useState('');
  const [pasteError, setPasteError] = useState('');

  const currentGhost = initialDuel || activeGhostPayload;

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (currentShareUrl && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(currentShareUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleImportPayload = () => {
    setPasteError('');
    const raw = pasteInput.trim();
    if (!raw) return;

    let payloadStr = raw;
    if (raw.includes('duel=')) {
      try {
        const url = new URL(raw.startsWith('http') ? raw : `https://example.com/${raw}`);
        payloadStr = url.searchParams.get('duel') || raw;
      } catch {
        payloadStr = raw;
      }
    }

    const parsed = parseGhostDuelPayload(payloadStr);
    if (parsed) {
      onStartDuel(parsed);
      onClose();
    } else {
      setPasteError('Invalid duel payload or link. Please verify the code.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-surface-overlay backdrop-blur-sm animate-fadeIn"
      id="ghost-duel-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-dialog overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp"
        id="ghost-duel-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Ghost Duel Arena"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-surface-subtle">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <Ghost className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                Asynchronous Ghost Duel
              </h2>
              <p className="text-xs text-foreground-muted">
                Race frame-by-frame against an exact recorded keystroke run
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {currentGhost ? (
            <div className="space-y-4">
              {/* Challenger Card */}
              <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                    <Swords className="w-3.5 h-3.5" /> Challenger Profile
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                    ID: {currentGhost.id}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      {currentGhost.author || 'Anonymous Ghost'}
                    </h3>
                    <p className="text-xs text-foreground-muted">
                      {currentGhost.events.length} Recorded Keystrokes
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-purple-400 font-mono">
                      {currentGhost.wpm}{' '}
                      <span className="text-xs text-foreground-muted font-normal">WPM</span>
                    </div>
                    <div className="text-xs text-foreground-muted font-mono">
                      {currentGhost.accuracy}% Acc
                    </div>
                  </div>
                </div>

                {/* Target Text Preview */}
                <div className="mt-2 p-2.5 rounded-lg bg-surface border border-border/60 text-xs font-mono text-foreground-muted line-clamp-3">
                  &ldquo;{currentGhost.targetText}&rdquo;
                </div>
              </div>

              {/* Action */}
              <button
                onClick={() => {
                  onStartDuel(currentGhost);
                  onClose();
                }}
                className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 transition-all"
                id="launch-ghost-duel-btn"
              >
                <Play className="w-4 h-4 fill-white" />
                Launch Head-to-Head Duel
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Curated Rivals */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-muted mb-2.5 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-purple-400" /> Featured Shadow Rivals
                </h3>
                <div className="space-y-2">
                  {CURATED_GHOSTS.map((ghost) => (
                    <div
                      key={ghost.id}
                      className="p-3 rounded-xl border border-border bg-surface-subtle hover:border-purple-500/40 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-foreground truncate">
                          {ghost.author}
                        </div>
                        <div className="text-[11px] text-foreground-muted font-mono">
                          {ghost.wpm} WPM • {ghost.accuracy}% Acc
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          onStartDuel(ghost);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-purple-600/15 hover:bg-purple-600 text-purple-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                      >
                        <Play className="w-3 h-3 fill-current" /> Race
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Import Duel by Link or Payload */}
              <div className="pt-2 border-t border-border space-y-2">
                <label className="text-xs font-medium text-foreground-muted flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5" /> Import Friend&apos;s Challenge Link or Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pasteInput}
                    onChange={(e) => setPasteInput(e.target.value)}
                    placeholder="Paste ?duel=... URL or Base64 payload"
                    className="flex-1 px-3 py-2 text-xs font-mono bg-surface-subtle border border-border rounded-lg text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={handleImportPayload}
                    disabled={!pasteInput.trim()}
                    className="px-3 py-2 text-xs font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1.5 shrink-0 transition-colors"
                  >
                    Import
                  </button>
                </div>
                {pasteError && (
                  <p className="text-[11px] text-red-400">{pasteError}</p>
                )}
              </div>
            </div>
          )}

          {/* Share Section */}
          {currentShareUrl && (
            <div className="pt-2 border-t border-border space-y-2">
              <label className="text-xs font-medium text-foreground-muted flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5" /> Shareable Challenge URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={currentShareUrl}
                  className="flex-1 px-3 py-2 text-xs font-mono bg-surface-subtle border border-border rounded-lg text-foreground truncate focus:outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-2 text-xs font-medium rounded-lg bg-surface-hover border border-border text-foreground hover:border-accent hover:text-accent flex items-center gap-1.5 transition-colors shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-foreground-muted">
                Anyone opening this URL will face your exact ghost pacer in real-time.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
