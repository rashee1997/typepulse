import type {Metadata} from 'next';
import Link from 'next/link';
import {ArrowRight, Keyboard} from 'lucide-react';
import {SITE} from '@/lib/site-content';

export const metadata: Metadata = {
  title: `${SITE.name} — AI-Coached Touch-Typing Studio`,
  description: SITE.definition,
  alternates: {canonical: '/'},
};

/**
 * Landing route: a hero and nothing else.
 *
 * The documentation, the engine reference and the live demo all live at /docs,
 * and the product itself at /app. Keeping this page to one screen means there is
 * exactly one decision to make here — start typing, or read first.
 *
 * No skip link is needed: with no navigation or repeated blocks on the page there
 * is nothing to bypass (WCAG 2.4.1 applies to repeated content).
 */
export default function LandingPage() {
  return (
    <main className="relative flex min-h-dvh w-full flex-col items-center justify-center px-5 py-16 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(60%_50%_at_50%_0%,var(--accent-glow-subtle),transparent_70%)]"
      />

      <div className="relative flex flex-col items-center">
        <span className="inline-flex rounded-2xl bg-accent p-3 text-accent-foreground shadow-glow-accent-sm">
          <Keyboard aria-hidden="true" className="h-7 w-7" />
        </span>

        <p className="mt-6 rounded-full border border-border bg-surface-muted px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
          Offline-first · self-hosted
        </p>

        <h1 className="font-display mt-5 text-6xl font-extrabold tracking-tight text-text-primary sm:text-7xl">
          {SITE.name}
        </h1>

        <p className="mt-5 max-w-xl text-lg leading-relaxed text-text-secondary">
          {SITE.definition}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={SITE.entryPath}
            className="flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-accent-foreground shadow-glow-accent-sm transition-colors hover:bg-accent-hover"
          >
            Open the studio
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
          <Link
            href={SITE.docsPath}
            className="rounded-xl border border-border bg-surface px-6 py-3 text-sm font-bold text-text-primary transition-colors hover:border-border-hover hover:bg-surface-hover"
          >
            Documentation
          </Link>
        </div>

        <p className="mt-12 font-mono text-[11px] text-text-secondary">
          v{SITE.version} · {SITE.license} ·{' '}
          <a href={SITE.repoUrl} className="underline decoration-border underline-offset-4 transition-colors hover:text-accent-text">
            source
          </a>{' '}
          ·{' '}
          <a href="/llms.txt" className="underline decoration-border underline-offset-4 transition-colors hover:text-accent-text">
            llms.txt
          </a>
        </p>
      </div>
    </main>
  );
}
