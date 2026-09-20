'use client';

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Check, Copy} from 'lucide-react';

interface CodeBlockProps {
  code: string;
  /** Short filename-style label shown in the header bar. */
  label?: string;
  language?: string;
  className?: string;
}

/**
 * Copyable code block.
 *
 * The copy button owns its own state and clears its timer on unmount, so the
 * documentation page never leaves a queued `setState` behind after navigation.
 * No syntax-highlighting dependency is added: the block is monospace text with a
 * fixed line height, which keeps the layout stable and the bundle small.
 */
export function CodeBlock({code, label, language, className}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const codeId = React.useId();

  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    },
    []
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard permission denied (or insecure context): the code is still
      // selectable, so there is nothing to recover from here.
    }
  }, [code]);

  return (
    <figure className={`my-0 flex flex-col overflow-hidden rounded-xl border border-border bg-surface-subtle ${className ?? ''}`}>
      <div className="flex items-center justify-between gap-3 border-b border-border-subtle bg-surface-muted px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-2">
          {label ? (
            <span className="truncate font-mono text-[11px] font-semibold tracking-wide text-text-secondary">
              {label}
            </span>
          ) : null}
          {language ? (
            <span className="rounded border border-accent-border bg-accent-subtle px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-accent-text">
              {language}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          aria-describedby={copied ? `${codeId}-status` : undefined}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary"
        >
          {copied ? (
            <Check aria-hidden="true" className="h-3 w-3 text-success" />
          ) : (
            <Copy aria-hidden="true" className="h-3 w-3" />
          )}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* Announcement channel: copying is a state change screen-reader users cannot see. */}
      <span id={`${codeId}-status`} role="status" aria-live="polite" className="sr-only">
        {copied ? 'Code copied to clipboard.' : ''}
      </span>

      <pre className="m-0 overflow-x-auto px-4 py-4">
        <code className="block font-mono text-[12.5px] leading-6 text-text-secondary [font-variant-ligatures:none] tabular-nums">
          {code}
        </code>
      </pre>
    </figure>
  );
}
