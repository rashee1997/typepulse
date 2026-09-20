'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useModalFocus } from '@/hooks/use-modal-focus';
import Markdown from 'react-markdown';
import { AISettings, UserProgress } from '@/types/typing';
import { askAiCoachQuestion, describeProvider, type ChatMessage } from '@/lib/ai-service';
import { buildStarterBriefing, buildSuggestedQuestions, buildTypistProfile, summarizeProfile } from '@/lib/ai-prompts';
import { Bot, MessageSquare, Send, Sparkles, X, User } from 'lucide-react';

interface AICoachChatProps {
  isOpen: boolean;
  onClose: () => void;
  aiSettings: AISettings;
  userProgress: UserProgress;
  onOpenSettings: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/** Turns of conversation kept in the request, beyond the opening briefing. */
const MAX_HISTORY_TURNS = 8;

export const AICoachChat: React.FC<AICoachChatProps> = ({
  isOpen,
  onClose,
  aiSettings,
  userProgress,
  onOpenSettings,
}) => {
  const dialogRef = useModalFocus<HTMLDivElement>(isOpen, onClose);

  // The coach answers from measured data, so the whole panel is built from a
  // profile of the typist rather than a fixed greeting. `useMemo` keeps it in
  // sync when a session completes while the panel is open.
  const profile = useMemo(() => buildTypistProfile(userProgress), [userProgress]);
  const briefing = useMemo(() => buildStarterBriefing(profile), [profile]);
  const suggestions = useMemo(() => buildSuggestedQuestions(profile), [profile]);
  const contextSummary = useMemo(() => summarizeProfile(profile), [profile]);

  // Only the turns after the briefing live in state; the briefing is rendered
  // from the profile on every render, so it can never go stale.
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Async safety: one AbortController per in-flight request, plus a monotonic
  // session token so out-of-order or post-unmount replies are discarded instead
  // of overwriting coaching for the drill that is actually on screen.
  const abortRef = useRef<AbortController | null>(null);
  const sessionTokenRef = useRef(0);
  const isMountedRef = useRef(true);

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

  // Hard teardown of every in-flight request on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      sessionTokenRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  // Cancel pending coaching the moment the panel closes so nothing resolves later.
  // The promise's own `finally` clears the loading flag, so no state is written here.
  useEffect(() => {
    if (isOpen) return;
    sessionTokenRef.current += 1;
    abortRef.current?.abort();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSend = async (questionToSend?: string) => {
    const text = questionToSend || input;
    if (!text.trim() || loading) return;

    // Supersede any previous request before issuing a new one.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const token = ++sessionTokenRef.current;
    const isStale = () =>
      !isMountedRef.current || controller.signal.aborted || token !== sessionTokenRef.current;

    const userMsg: Message = { role: 'user', content: text };
    const history: ChatMessage[] = [
      { role: 'assistant' as const, content: briefing },
      ...messages.slice(-MAX_HISTORY_TURNS).map((msg) => ({ role: msg.role, content: msg.content })),
    ];

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      const reply = await askAiCoachQuestion({
        question: text,
        profile,
        settings: aiSettings,
        history,
        signal: controller.signal,
      });
      if (isStale()) return;
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      if (isStale()) return;
      // The service answers from the local profile whenever a provider fails, so
      // reaching here means the request never completed at all.
      setError(
        'That question did not get an answer. Check the provider in Settings, or ask again — the rest of the studio keeps working offline.'
      );
    } finally {
      // Only the request that still owns the slot may clear it, so a superseded
      // request can never unlock the composer while a newer one is running.
      if (abortRef.current === controller) {
        abortRef.current = null;
        setLoading(false);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-end justify-center sm:justify-end sm:p-6 bg-overlay backdrop-blur-[2px] animate-fadeIn"
      id="ai-coach-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full sm:w-[480px] max-h-[55vh] h-[480px] bg-surface border border-primary-border sm:rounded-2xl rounded-t-2xl shadow-modal flex flex-col overflow-hidden backdrop-blur-md"
        id="ai-coach-chatbox"
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="false"
        aria-label="AI Coach Sensei Chat"
      >
        {/* Sleek Sensei Header */}
        <div className="px-4 py-3 border-b border-border bg-surface-muted flex flex-col gap-1.5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-8 h-8 rounded-xl bg-primary-subtle border border-primary-border text-primary flex items-center justify-center shadow-inner">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-surface animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-text-primary text-xs tracking-wide">Sensei KeyPulse</h3>
                  <span className="px-1.5 py-0.5 rounded bg-primary-subtle border border-primary-border text-[11px] font-mono text-primary font-semibold">
                    COACH
                  </span>
                </div>
                <p className="text-xs text-text-muted">{describeProvider(aiSettings)} • Half-docked</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onOpenSettings}
                className="px-2.5 py-1 text-xs font-medium text-text-muted hover:text-accent rounded-lg hover:bg-surface-hover transition-colors"
                title="Configure API Endpoint"
              >
                Settings
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-surface-hover transition-colors cursor-pointer"
                title="Close Sensei (Esc)"
                aria-label="Close Sensei Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          {/* What the coach can actually see. Stating it makes the grounding visible
              instead of something the typist has to take on trust. */}
          <p
            className="text-[10px] font-mono text-text-subtle truncate"
            title={contextSummary}
            id="ai-coach-context-line"
          >
            Reading: {contextSummary}
          </p>
        </div>

        {/* Messages Stream */}
        <div
          className="p-3 sm:p-4 overflow-y-auto space-y-3 flex-1 text-xs scrollbar-thin"
          role="log"
          aria-live="polite"
          aria-relevant="additions text"
          aria-busy={loading}
          aria-label="Coaching conversation"
        >
          <MessageRow role="assistant" content={briefing} />

          {messages.map((msg, i) => (
            <MessageRow key={i} role={msg.role} content={msg.content} />
          ))}

          {error && (
            <div className="flex items-start gap-2 p-2.5 bg-danger-subtle border border-danger-border rounded-xl text-danger">
              <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {loading && (
            <div className="flex gap-2 items-center text-text-muted text-xs" role="status" aria-live="polite">
              <span className="sr-only">Your coach is composing a reply.</span>
              <div className="w-6 h-6 rounded-lg bg-primary-subtle border border-primary-border text-primary flex items-center justify-center">
                <Bot className="w-3 h-3" />
              </div>
              <div className="px-3 py-2 bg-surface-muted border border-border rounded-xl flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
        </div>

        {/* Starter questions, chosen from the typist's own weak keys and trend */}
        <div className="px-3 py-1.5 border-t border-border bg-surface-muted flex items-center gap-1.5 overflow-x-auto text-[10px] scrollbar-none shrink-0">
          <span className="text-text-subtle shrink-0 flex items-center gap-1 font-semibold">
            <Sparkles className="w-2.5 h-2.5 text-accent" />
            Advice:
          </span>
          {suggestions.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => handleSend(q)}
              className="px-2 py-0.5 bg-surface hover:bg-surface-hover text-text-secondary hover:text-accent rounded-full border border-border shrink-0 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-2.5 border-t border-border bg-surface-muted flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your weak keys, a drill, or your posture…"
            aria-label="Ask the coach a question"
            className="flex-1 px-3 py-2 bg-surface border border-border rounded-xl text-xs text-text-primary placeholder:text-text-subtle focus:outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2 bg-accent hover:bg-accent-hover disabled:opacity-40 text-accent-foreground rounded-xl transition-colors shrink-0 shadow-glow-accent-sm"
            id="send-ai-chat-button"
            title="Send Message"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};

/** One message bubble. Assistant replies render markdown; user turns stay plain. */
const MessageRow: React.FC<Message> = ({ role, content }) => (
  <div className={`flex gap-2 ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
    {role === 'assistant' && (
      <div className="w-6 h-6 rounded-lg bg-primary-subtle border border-primary-border text-primary flex items-center justify-center shrink-0 mt-0.5">
        <Bot className="w-3 h-3" />
      </div>
    )}
    {role === 'assistant' ? (
      <div className="p-3 rounded-2xl max-w-[88%] leading-relaxed bg-surface-muted border border-border text-text-primary rounded-tl-none shadow-sm">
        <div className="prose prose-invert prose-xs max-w-none text-xs text-text-primary leading-relaxed font-sans [&>p]:mb-1.5 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-4 [&>ul]:space-y-0.5 [&>ol]:list-decimal [&>ol]:pl-4 [&>ol]:space-y-0.5 [&>strong]:text-accent [&>strong]:font-bold [&>code]:bg-surface [&>code]:text-accent [&>code]:border [&>code]:border-border [&>code]:px-1 [&>code]:py-0.5 [&>code]:rounded [&>code]:font-mono [&>code]:text-[10px] [&>pre]:bg-surface [&>pre]:border [&>pre]:border-border [&>pre]:p-2 [&>pre]:rounded-lg [&>pre]:overflow-x-auto [&>h1]:text-text-primary [&>h1]:font-bold [&>h1]:text-xs [&>h2]:text-text-primary [&>h2]:font-bold [&>h2]:text-xs [&>h3]:text-text-primary [&>h3]:font-bold [&>h3]:text-[11px] [&>blockquote]:border-l-2 [&>blockquote]:border-primary [&>blockquote]:pl-2 [&>blockquote]:italic [&>blockquote]:text-text-muted">
          <Markdown>{content}</Markdown>
        </div>
      </div>
    ) : (
      <div className="p-2.5 px-3 rounded-2xl max-w-[85%] leading-relaxed whitespace-pre-line bg-accent text-accent-foreground font-medium text-xs rounded-tr-none shadow-sm">
        {content}
      </div>
    )}
    {role === 'user' && (
      <div className="w-6 h-6 rounded-lg bg-accent-subtle border border-accent-border text-accent flex items-center justify-center shrink-0 mt-0.5">
        <User className="w-3 h-3" />
      </div>
    )}
  </div>
);
