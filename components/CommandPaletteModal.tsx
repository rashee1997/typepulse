'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Bot,
  Check,
  Code,
  Flame,
  Gamepad2,
  Ghost,
  Keyboard,
  Moon,
  Quote,
  RotateCcw,
  Search,
  Sparkles,
  Sun,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Mode' | 'Word Count' | 'Time Limit' | 'Views' | 'Settings & Audio' | 'AI & Drills' | 'Arenas & Pass';
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandItem[];
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  commands,
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter commands by query
  const filteredCommands = commands.filter((cmd) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      cmd.title.toLowerCase().includes(q) ||
      cmd.category.toLowerCase().includes(q) ||
      (cmd.subtitle && cmd.subtitle.toLowerCase().includes(q))
    );
  });

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = () => {
    setSearch('');
    setSelectedIndex(0);
    onClose();
  };

  const handleSelectCommand = (cmd: CommandItem) => {
    setSearch('');
    setSelectedIndex(0);
    cmd.action();
    onClose();
  };

  const safeSelectedIndex = filteredCommands.length > 0 ? Math.min(selectedIndex, filteredCommands.length - 1) : 0;

  // Keyboard navigation inside palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredCommands.length > 0 ? (prev + 1) % filteredCommands.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredCommands.length > 0 ? (prev - 1 + filteredCommands.length) % filteredCommands.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredCommands[safeSelectedIndex];
      if (selected) {
        handleSelectCommand(selected);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    }
  };

  // Keep the highlighted row visible as the user arrows through results.
  // `behavior: 'instant'` is deliberate: the document opts into smooth scrolling
  // globally, and smooth-scrolling a list one row at a time on every key repeat
  // makes the highlight trail behind the cursor.
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector(`[data-index="${safeSelectedIndex}"]`) as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  }, [safeSelectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 pt-16 sm:pt-24 bg-surface-overlay backdrop-blur-sm animate-fadeIn"
      id="command-palette-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="w-full max-w-xl bg-surface border border-border rounded-2xl shadow-dialog overflow-hidden flex flex-col max-h-[80vh] sm:max-h-[600px] animate-slideDown"
        id="command-palette-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Quick Command Palette"
      >
        {/* Search Header */}
        <div className="p-3.5 border-b border-border bg-surface flex items-center gap-3 shrink-0">
          <Search className="w-4 h-4 text-accent shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search mode, words, theme, AI..."
            className="flex-1 bg-transparent border-none text-text-primary placeholder:text-text-subtle text-sm focus:outline-none focus:ring-0"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-list"
            aria-autocomplete="list"
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 rounded bg-surface-muted text-[11px] font-mono text-text-subtle border border-border">
            ESC
          </kbd>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover sm:hidden"
            aria-label="Close command palette"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Command List */}
        <div
          ref={listRef}
          id="command-palette-list"
          role="listbox"
          className="flex-1 overflow-y-auto p-2 space-y-1 text-xs scrollbar-thin"
        >
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-text-subtle flex flex-col items-center justify-center gap-2">
              <Search className="w-6 h-6 opacity-40 text-text-muted" />
              <p className="text-sm font-medium">No matching commands found</p>
              <p className="text-xs text-text-muted">Try searching &quot;words&quot;, &quot;code&quot;, &quot;dark&quot;, or &quot;lessons&quot;</p>
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === safeSelectedIndex;
              return (
                <div
                  key={cmd.id}
                  data-index={idx}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectCommand(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-accent-subtle text-accent font-semibold border border-accent-border shadow-xs'
                      : 'text-text-primary hover:bg-surface-muted border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg shrink-0 ${
                        isSelected
                          ? 'bg-accent text-accent-foreground shadow-glow-accent-sm'
                          : 'bg-surface-muted text-text-muted border border-border'
                      }`}
                    >
                      {cmd.icon}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-xs font-medium text-text-primary">{cmd.title}</span>
                      {cmd.subtitle && (
                        <span className="text-[11px] text-text-muted truncate">{cmd.subtitle}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-surface-muted border border-border text-text-subtle">
                      {cmd.category}
                    </span>
                    {cmd.shortcut && (
                      <kbd className="px-1.5 py-0.5 rounded bg-surface text-[10px] font-mono text-text-subtle border border-border">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="px-4 py-2 border-t border-border bg-surface-muted flex items-center justify-between text-[11px] text-text-subtle font-mono shrink-0">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 rounded bg-surface border border-border text-text-primary">↑</kbd>{' '}
              <kbd className="px-1 py-0.5 rounded bg-surface border border-border text-text-primary">↓</kbd> Navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-text-primary">↵</kbd> Select
            </span>
          </div>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-text-primary">Esc</kbd> Close
          </span>
        </div>
      </div>
    </div>
  );
};
