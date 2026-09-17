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
      className="fixed inset-0 z-50 flex items-end sm:items-end justify-center sm:justify-end sm:p-6 bg-black/40 backdrop-blur-[2px] animate-fadeIn"
      id="ai-coach-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full sm:w-[480px] max-h-[55vh] h-[480px] bg-slate-900/95 border border-indigo-500/30 sm:rounded-2xl rounded-t-2xl shadow-[0_16px_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden backdrop-blur-md"
        id="ai-coach-chatbox"
      >
        {/* Sleek Sensei Header */}
        <div className="px-4 py-3 border-b border-slate-800/90 bg-slate-950/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center shadow-inner">
                <Bot className="w-4 h-4 text-indigo-400" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-950 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-slate-100 text-xs tracking-wide">Sensei KeyPulse</h3>
                <span className="px-1.5 py-0.2 rounded bg-indigo-950 border border-indigo-800/60 text-[9px] font-mono text-indigo-300 font-semibold">
                  COACH
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                {aiSettings.provider === 'gemini' ? 'Gemini 2.5 Flash' : aiSettings.model || 'Neural Sensei'} • Half-docked
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenSettings}
              className="px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-amber-300 rounded-lg hover:bg-slate-800/70 transition-colors"
              title="Configure API Endpoint"
            >
              Settings
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
              title="Close Sensei"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-3 flex-1 text-xs scrollbar-thin scrollbar-thumb-slate-700">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-lg bg-indigo-600/25 border border-indigo-500/40 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3 h-3" />
                </div>
              )}
              {msg.role === 'assistant' ? (
                <div className="p-3 rounded-2xl max-w-[88%] leading-relaxed bg-slate-800/80 border border-slate-700/60 text-slate-200 rounded-tl-none shadow-sm">
                  <div className="prose prose-invert prose-xs max-w-none text-xs text-slate-200 leading-relaxed font-sans [&>p]:mb-1.5 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-4 [&>ul]:space-y-0.5 [&>ol]:list-decimal [&>ol]:pl-4 [&>ol]:space-y-0.5 [&>strong]:text-amber-300 [&>strong]:font-bold [&>code]:bg-slate-950 [&>code]:text-amber-300 [&>code]:px-1 [&>code]:py-0.5 [&>code]:rounded [&>code]:font-mono [&>code]:text-[10px] [&>pre]:bg-slate-950 [&>pre]:p-2 [&>pre]:rounded-lg [&>pre]:overflow-x-auto [&>h1]:text-slate-100 [&>h1]:font-bold [&>h1]:text-xs [&>h2]:text-slate-100 [&>h2]:font-bold [&>h2]:text-xs [&>h3]:text-slate-100 [&>h3]:font-bold [&>h3]:text-[11px] [&>blockquote]:border-l-2 [&>blockquote]:border-indigo-500 [&>blockquote]:pl-2 [&>blockquote]:italic [&>blockquote]:text-slate-400">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 px-3 rounded-2xl max-w-[85%] leading-relaxed whitespace-pre-line bg-amber-400 text-slate-950 font-medium text-xs rounded-tr-none shadow-sm">
                  {msg.content}
                </div>
              )}
              {msg.role === 'user' && (
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3 h-3" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-2 items-center text-slate-400 text-xs">
              <div className="w-6 h-6 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center">
                <Bot className="w-3 h-3" />
              </div>
              <div className="px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-xl flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
        </div>

        {/* Quick Question Chips */}
        <div className="px-3 py-1.5 border-t border-slate-800/80 bg-slate-950/50 flex items-center gap-1.5 overflow-x-auto text-[10px] scrollbar-none shrink-0">
          <span className="text-slate-500 shrink-0 flex items-center gap-1 font-semibold">
            <Sparkles className="w-2.5 h-2.5 text-amber-400" />
            Advice:
          </span>
          {quickQuestions.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => handleSend(q)}
              className="px-2 py-0.5 bg-slate-800/90 hover:bg-slate-750 text-slate-300 rounded-full border border-slate-700/80 shrink-0 transition-colors hover:text-amber-300"
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
          className="p-2.5 border-t border-slate-800/90 bg-slate-950/80 flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Sensei for typing tips..."
            className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 rounded-xl transition-colors shrink-0"
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
