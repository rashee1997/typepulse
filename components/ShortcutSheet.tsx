'use client';

import React from 'react';
import { Keyboard } from 'lucide-react';
import { useModalFocus } from '@/hooks/use-modal-focus';

interface ShortcutSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUT_GROUPS: { scope: string; items: { keys: string; action: string }[] }[] = [
  {
    scope: 'Anywhere',
    items: [
      { keys: 'Ctrl / ⌘ + K', action: 'Open the command palette' },
      { keys: 'Shift + Z', action: 'Toggle Zen focus mode' },
      { keys: 'Esc', action: 'Close the open dialog, or leave Zen mode' },
      { keys: 'Shift + /', action: 'Open this shortcut sheet' },
    ],
  },
  {
    scope: 'Typing surface',
    items: [
      { keys: 'Tab', action: 'Restart the current passage' },
      { keys: 'Backspace', action: 'Correct the previous character' },
      { keys: 'Ctrl + Backspace', action: 'Correct the whole word' },
      { keys: 'Space', action: 'Skip the word when quick word skip is on' },
    ],
  },
  {
    scope: 'Command palette',
    items: [
      { keys: '↑ / ↓', action: 'Move through results' },
      { keys: 'Enter', action: 'Run the highlighted command' },
    ],
  },
];

export const ShortcutSheet: React.FC<ShortcutSheetProps> = ({ isOpen, onClose }) => {
  const dialogRef = useModalFocus<HTMLDivElement>(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-overlay backdrop-blur-sm animate-fadeIn"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-sheet-title"
        className="w-full max-w-lg max-h-[80vh] overflow-y-auto bg-surface border border-border rounded-2xl shadow-dialog p-5 sm:p-6 animate-scaleUp"
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 id="shortcut-sheet-title" className="text-base font-bold text-text-primary flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-accent" aria-hidden="true" />
            Keyboard shortcuts
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded-lg border border-border bg-surface-muted text-xs font-semibold text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
          >
            Close
          </button>
        </div>

        <div className="space-y-5">
          {SHORTCUT_GROUPS.map((group) => (
            <section key={group.scope}>
              <h3 className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">
                {group.scope}
              </h3>
              <dl className="space-y-1.5">
                {group.items.map((item) => (
                  <div key={item.keys} className="flex items-center justify-between gap-4 text-xs">
                    <dt>
                      <kbd className="px-2 py-0.5 rounded-md border border-border bg-surface-muted font-mono text-[11px] text-text-primary">
                        {item.keys}
                      </kbd>
                    </dt>
                    <dd className="text-text-secondary text-right">{item.action}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};
