'use client';

import React, { useState } from 'react';
import {
  ArrowRight,
  Braces,
  Check,
  Code,
  FileCode2,
  FolderGit2,
  Sparkles,
  Terminal,
  X,
  Zap,
} from 'lucide-react';
import { CodeClimberSnippet } from '@/types/typing';

export const CODE_CLIMBER_SNIPPETS: CodeClimberSnippet[] = [
  {
    id: 'ts_async_stream',
    language: 'typescript',
    title: 'Async Chunk Transform Stream',
    repoSource: 'facebook/react',
    symbols: ['async', 'TransformStream', 'Uint8Array', 'controller.enqueue'],
    code: `export async function processChunks(stream: ReadableStream<Uint8Array>) {\n  const reader = stream.getReader();\n  while (true) {\n    const { done, value } = await reader.read();\n    if (done) break;\n    yield value;\n  }\n}`,
  },
  {
    id: 'ts_react_hook',
    language: 'typescript',
    title: 'Custom Memoized Debounce Hook',
    repoSource: 'vercel/swr',
    symbols: ['useCallback', 'useRef', 'useEffect', 'ReturnType'],
    code: `export function useDebounce<T extends (...args: any[]) => any>(fn: T, delay: number) {\n  const timeoutRef = useRef<NodeJS.Timeout | null>(null);\n  return useCallback((...args: Parameters<T>) => {\n    if (timeoutRef.current) clearTimeout(timeoutRef.current);\n    timeoutRef.current = setTimeout(() => fn(...args), delay);\n  }, [fn, delay]);\n}`,
  },
  {
    id: 'py_decorator_cache',
    language: 'python',
    title: 'LRU Cache & Type Decorator',
    repoSource: 'encode/fastapi',
    symbols: ['def', 'functools.wraps', 'Callable', 'Any', '__call__'],
    code: `def timed_lru_cache(seconds: int, maxsize: int = 128):\n  def wrapper_cache(func: Callable) -> Callable:\n    func = lru_cache(maxsize=maxsize)(func)\n    func.lifetime = timedelta(seconds=seconds)\n    func.expiration = datetime.utcnow() + func.lifetime\n    return func\n  return wrapper_cache`,
  },
  {
    id: 'rust_concurrency',
    language: 'rust',
    title: 'Tokio Async Mutex Lock Guard',
    repoSource: 'tokio-rs/tokio',
    symbols: ['Arc', 'Mutex', 'async move', 'Result<T, E>', 'unwrap()'],
    code: `pub async fn send_telemetry(data: Arc<Mutex<TelemetryState>>) -> Result<(), Error> {\n  let mut guard = data.lock().await;\n  guard.flush_buffer().await?;\n  println!("Buffer synchronized successfully");\n  Ok(())\n}`,
  },
  {
    id: 'go_channel_pipeline',
    language: 'go',
    title: 'Fan-Out Worker Pool Pipeline',
    repoSource: 'golang/go',
    symbols: ['func', 'chan<-', '<-chan', 'go func()', 'sync.WaitGroup'],
    code: `func WorkerPool(jobs <-chan Job, results chan<- Result, workers int) {\n  var wg sync.WaitGroup\n  for w := 1; w <= workers; w++ {\n    wg.Add(1)\n    go worker(w, jobs, results, &wg)\n  }\n  wg.Wait()\n  close(results)\n}`,
  },
];

export interface CodeClimberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSnippet?: (snippet: CodeClimberSnippet) => void;
  onStartClimb?: (snippet: CodeClimberSnippet) => void;
  codeAutoIndent?: boolean;
}

export const CodeClimberModal: React.FC<CodeClimberModalProps> = ({
  isOpen,
  onClose,
  onSelectSnippet,
  onStartClimb,
  codeAutoIndent = true,
}) => {
  const [selectedLang, setSelectedLang] = useState<string>('all');
  const [activeSnippetId, setActiveSnippetId] = useState<string>(CODE_CLIMBER_SNIPPETS[0].id);

  if (!isOpen) return null;

  const filteredSnippets = CODE_CLIMBER_SNIPPETS.filter((s) =>
    selectedLang === 'all' ? true : s.language === selectedLang
  );

  const activeSnippet =
    CODE_CLIMBER_SNIPPETS.find((s) => s.id === activeSnippetId) || filteredSnippets[0];

  const handleLaunch = () => {
    if (activeSnippet) {
      if (onStartClimb) {
        onStartClimb(activeSnippet);
      } else if (onSelectSnippet) {
        onSelectSnippet(activeSnippet);
      }
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-surface-overlay backdrop-blur-sm animate-fadeIn"
      id="code-climber-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-3xl bg-surface border border-border rounded-2xl shadow-dialog overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp"
        id="code-climber-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Developer AST Code Climber"
      >
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-surface-subtle">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">AST Code Climber</h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Developer Engine
                </span>
              </div>
              <p className="text-xs text-foreground-muted">
                Practice real-world syntax with smart auto-indentation and bracket navigation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Language Tabs */}
        <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-3 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            {['all', 'typescript', 'python', 'rust', 'go'].map((lang) => (
              <button
                key={lang}
                onClick={() => {
                  setSelectedLang(lang);
                  const first = CODE_CLIMBER_SNIPPETS.find((s) =>
                    lang === 'all' ? true : s.language === lang
                  );
                  if (first) setActiveSnippetId(first.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                  selectedLang === lang
                    ? 'bg-accent text-accent-foreground font-semibold'
                    : 'text-foreground-muted hover:text-foreground hover:bg-surface-subtle'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 shrink-0">
            <Check className="w-3.5 h-3.5" /> Auto-Indentation Active
          </div>
        </div>

        {/* Body Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 flex-1 overflow-hidden">
          {/* Snippet List */}
          <div className="p-3 border-r border-border overflow-y-auto space-y-2 max-h-56 md:max-h-[420px]">
            {filteredSnippets.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSnippetId(s.id)}
                className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                  activeSnippetId === s.id
                    ? 'border-accent/60 bg-accent/10 shadow-sm'
                    : 'border-border bg-surface hover:bg-surface-subtle'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono uppercase text-[10px] text-accent font-bold">
                    {s.language}
                  </span>
                  <span className="text-[10px] text-foreground-muted flex items-center gap-1">
                    <FolderGit2 className="w-2.5 h-2.5" /> {s.repoSource}
                  </span>
                </div>
                <h4 className="font-medium text-foreground truncate">{s.title}</h4>
              </button>
            ))}
          </div>

          {/* Snippet Code Preview */}
          <div className="p-5 md:col-span-2 overflow-y-auto flex flex-col justify-between space-y-4 bg-surface-subtle/40">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <FileCode2 className="w-4 h-4 text-accent" /> {activeSnippet?.title}
                </span>
                <span className="text-xs font-mono text-foreground-muted">
                  {activeSnippet?.code.split('\n').length} lines · {activeSnippet?.code.length} chars
                </span>
              </div>

              {/* Code Display Box */}
              <div className="p-4 rounded-xl bg-surface border border-border font-mono text-xs text-foreground-muted overflow-x-auto leading-relaxed">
                <pre className="whitespace-pre">{activeSnippet?.code}</pre>
              </div>

              {/* Target Syntax Symbols */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-foreground-muted uppercase tracking-wider">
                  Target AST Constructs:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeSnippet?.symbols.map((sym, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-surface border border-border text-[11px] font-mono text-accent"
                    >
                      {sym}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Launch Action */}
            <button
              onClick={handleLaunch}
              className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-accent text-accent-foreground hover:opacity-90 flex items-center justify-center gap-2 shadow-md transition-all"
              id="launch-code-climber-btn"
            >
              Load Snippet & Start Climber <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
