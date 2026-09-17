'use client';

import React, { useState } from 'react';
import Markdown from 'react-markdown';
import { AISettings, UserProgress } from '@/types/typing';
import { askAiCoachQuestion } from '@/lib/ai-service';
import { Bot, ChevronRight, MessageSquare, Send, Sparkles, X, User } from 'lucide-react';

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

export const AICoachChat: React.FC<AICoachChatProps> = ({
  isOpen,
  onClose,
  aiSettings,
  userProgress,
  onOpenSettings,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Greetings, typist! I am your AI Typing Coach. Your current rank is **${userProgress.title}** (Level ${userProgress.level}) with a personal record of **${userProgress.highScores.bestWpm} WPM**. How can I assist your technique today?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const quickQuestions = [
    'How do I break past a speed plateau?',
    'What is the proper finger assignment for numbers?',
    'How can I reduce backspace usage?',
    'Ergonomics & wrist pain prevention',
  ];

  const handleSend = async (questionToSend?: string) => {
    const text = questionToSend || input;
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const contextSummary = `Player Level: ${userProgress.level}, Rank: ${userProgress.title}, Best WPM: ${userProgress.highScores.bestWpm}, Accuracy: ${userProgress.highScores.bestAccuracy}%, Total Practiced: ${Math.round(userProgress.highScores.totalTimePracticedSeconds / 60)} mins.`;

    try {
      const reply = await askAiCoachQuestion(text, contextSummary, aiSettings);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Keep calm and maintain your rhythm. Speed will follow your precision naturally.',
        },
      ]);
    } finally {
      setLoading(false);
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
      >
        {/* Sleek Sensei Header */}
        <div className="px-4 py-3 border-b border-border bg-surface-muted flex items-center justify-between shrink-0">
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
                <span className="px-1.5 py-0.2 rounded bg-primary-subtle border border-primary-border text-[9px] font-mono text-primary font-semibold">
                  COACH
                </span>
              </div>
              <p className="text-[10px] text-text-muted">
                {aiSettings.provider === 'gemini' ? 'Gemini 2.5 Flash' : aiSettings.model || 'Neural Sensei'} • Half-docked
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenSettings}
              className="px-2 py-1 text-[11px] font-medium text-text-muted hover:text-accent rounded-lg hover:bg-surface-hover transition-colors"
              title="Configure API Endpoint"
            >
              Settings
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-surface-hover transition-colors"
              title="Close Sensei"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-3 flex-1 text-xs scrollbar-thin">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-lg bg-primary-subtle border border-primary-border text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3 h-3" />
                </div>
              )}
              {msg.role === 'assistant' ? (
                <div className="p-3 rounded-2xl max-w-[88%] leading-relaxed bg-surface-muted border border-border text-text-primary rounded-tl-none shadow-sm">
                  <div className="prose prose-invert prose-xs max-w-none text-xs text-text-primary leading-relaxed font-sans [&>p]:mb-1.5 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-4 [&>ul]:space-y-0.5 [&>ol]:list-decimal [&>ol]:pl-4 [&>ol]:space-y-0.5 [&>strong]:text-accent [&>strong]:font-bold [&>code]:bg-surface [&>code]:text-accent [&>code]:border [&>code]:border-border [&>code]:px-1 [&>code]:py-0.5 [&>code]:rounded [&>code]:font-mono [&>code]:text-[10px] [&>pre]:bg-surface [&>pre]:border [&>pre]:border-border [&>pre]:p-2 [&>pre]:rounded-lg [&>pre]:overflow-x-auto [&>h1]:text-text-primary [&>h1]:font-bold [&>h1]:text-xs [&>h2]:text-text-primary [&>h2]:font-bold [&>h2]:text-xs [&>h3]:text-text-primary [&>h3]:font-bold [&>h3]:text-[11px] [&>blockquote]:border-l-2 [&>blockquote]:border-primary [&>blockquote]:pl-2 [&>blockquote]:italic [&>blockquote]:text-text-muted">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 px-3 rounded-2xl max-w-[85%] leading-relaxed whitespace-pre-line bg-accent text-accent-foreground font-medium text-xs rounded-tr-none shadow-sm">
                  {msg.content}
                </div>
              )}
              {msg.role === 'user' && (
                <div className="w-6 h-6 rounded-lg bg-accent-subtle border border-accent-border text-accent flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3 h-3" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-2 items-center text-text-muted text-xs">
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

        {/* Quick Question Chips */}
        <div className="px-3 py-1.5 border-t border-border bg-surface-muted flex items-center gap-1.5 overflow-x-auto text-[10px] scrollbar-none shrink-0">
          <span className="text-text-subtle shrink-0 flex items-center gap-1 font-semibold">
            <Sparkles className="w-2.5 h-2.5 text-accent" />
            Advice:
          </span>
          {quickQuestions.map((q) => (
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
            placeholder="Ask Sensei for typing tips..."
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
