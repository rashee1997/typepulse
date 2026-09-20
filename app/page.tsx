import type {Metadata} from 'next';
import {ArrowRight, GitBranch, Keyboard} from 'lucide-react';
import {CodeBlock} from '@/components/site/CodeBlock';
import {EnginePreview} from '@/components/site/EnginePreview';
import {
  API_ENDPOINTS,
  CODE_SAMPLES,
  FACTS,
  FAQ,
  NAV_LINKS,
  PIPELINE,
  PROVIDER_NAMES,
  QUICKSTART,
  SITE,
} from '@/lib/site-content';

export const metadata: Metadata = {
  title: `${SITE.name} — AI-Coached Touch-Typing Studio`,
  description: SITE.definition,
  alternates: {canonical: '/'},
};

export default function DocumentationPage() {
  return (
    <>
      <a
        href="#main-content"
        id="skip-to-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:border focus:border-accent-border focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-text-primary focus:shadow-modal"
      >
        Skip to main content
      </a>

      <div className="min-h-dvh w-full">
        <header className="sticky top-0 z-50 border-b border-border bg-surface/85 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <a href="#top" className="flex shrink-0 items-center gap-2 rounded-lg">
              <span className="rounded-lg bg-accent p-1.5 text-accent-foreground">
                <Keyboard aria-hidden="true" className="h-4 w-4" />
              </span>
              <span className="text-base font-bold tracking-tight text-text-primary">
                {SITE.name}
              </span>
            </a>

            <nav aria-label="Sections" className="hidden items-center gap-1 sm:flex">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-2.5 py-1.5 text-sm text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-2">
              <a
                href={SITE.repoUrl}
                className="hidden rounded-lg border border-border bg-surface-muted px-2.5 py-1.5 font-mono text-[11px] font-semibold text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary sm:block"
              >
                {SITE.repoLabel}
              </a>
              <a
                href={SITE.entryPath}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-bold text-accent-foreground transition-colors hover:bg-accent-hover"
              >
                Open studio
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </header>

        <main id="main-content" className="mx-auto w-full max-w-5xl px-4 sm:px-6">
          {/* ── HERO ─────────────────────────────────────────────────────── */}
          <section id="top" className="grid gap-10 py-14 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
            <div>
              <h1 className="font-display text-5xl font-extrabold tracking-tight text-text-primary">
                {SITE.name}
              </h1>

              <p className="mt-4 max-w-xl text-lg leading-relaxed text-text-secondary">
                {SITE.definition}
              </p>

              <ul className="mt-6 flex list-none flex-wrap gap-x-5 gap-y-1 p-0 font-mono text-[12px] text-text-secondary">
                {FACTS.map((fact) => (
                  <li key={fact.label}>
                    <strong className="font-bold text-text-primary">{fact.value}</strong>{' '}
                    {fact.label}
                  </li>
                ))}
              </ul>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <a
                  href={SITE.entryPath}
                  className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground transition-colors hover:bg-accent-hover"
                >
                  Open the studio
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </a>
                <a
                  href={SITE.repoUrl}
                  className="flex items-center gap-2 rounded-lg border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:border-border-hover"
                >
                  <GitBranch aria-hidden="true" className="h-4 w-4" />
                  Source
                </a>
                <a
                  href="/llms.txt"
                  className="font-mono text-[12px] text-text-secondary underline decoration-border underline-offset-4 transition-colors hover:text-accent-text"
                >
                  llms.txt
                </a>
              </div>
            </div>

            <EnginePreview />
          </section>

          {/* ── QUICKSTART ───────────────────────────────────────────────── */}
          <section id="quickstart" aria-labelledby="quickstart-heading" className="scroll-mt-20 border-t border-border py-14">
            <h2 id="quickstart-heading" className="font-display text-2xl font-extrabold tracking-tight text-text-primary">
              Quickstart
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              Next.js 15 standalone build. No database, no storage, one optional runtime secret.
            </p>

            <ol className="mt-6 grid list-none gap-4 p-0 md:grid-cols-3">
              {QUICKSTART.map((step) => (
                <li key={step.id}>
                  <h3 className="mb-2 flex items-center gap-2 font-mono text-[12px] font-bold text-text-primary">
                    <span className="text-text-secondary">{step.step}</span>
                    {step.title}
                  </h3>
                  <CodeBlock code={step.code} language="bash" />
                </li>
              ))}
            </ol>

            <p className="mt-5 text-sm text-text-secondary">
              Coach providers:{' '}
              <span className="font-mono text-[12px]">{PROVIDER_NAMES.join(' · ')}</span>
            </p>
          </section>

          {/* ── ENGINE ───────────────────────────────────────────────────── */}
          <section id="engine" aria-labelledby="engine-heading" className="scroll-mt-20 border-t border-border py-14">
            <h2 id="engine-heading" className="font-display text-2xl font-extrabold tracking-tight text-text-primary">
              How a keystroke is graded
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
              Typing logic never lives in a component. <code className="rounded bg-surface-muted px-1 py-0.5 font-mono text-[12px] text-accent-text">TypingEngine</code>{' '}
              owns character state, timing and grading; React only renders it.
            </p>

            <ol className="mt-6 grid list-none gap-x-8 gap-y-4 p-0 md:grid-cols-2">
              {PIPELINE.map((stage, index) => (
                <li key={stage.id} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 font-mono text-[12px] font-bold tabular-nums text-text-secondary"
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-mono text-[13px] font-bold text-text-primary">
                      {stage.title}
                    </h3>
                    <p className="mt-0.5 text-[13px] leading-snug text-text-secondary">
                      {stage.detail}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-text-secondary">
                      {stage.actor}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* ── CODE ─────────────────────────────────────────────────────── */}
          <section aria-labelledby="code-heading" className="border-t border-border py-14">
            <h2 id="code-heading" className="font-display text-2xl font-extrabold tracking-tight text-text-primary">
              Engine surface
            </h2>

            <div className="mt-6 grid gap-5">
              {CODE_SAMPLES.map((sample) => (
                <CodeBlock
                  key={sample.id}
                  code={sample.code}
                  label={sample.label}
                  language={sample.language}
                />
              ))}
            </div>
          </section>

          {/* ── HTTP API ─────────────────────────────────────────────────── */}
          <section id="api" aria-labelledby="api-heading" className="scroll-mt-20 border-t border-border py-14">
            <h2 id="api-heading" className="font-display text-2xl font-extrabold tracking-tight text-text-primary">
              HTTP routes
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
              Optional. Both exist so a hosted deployment can hold a key the browser must not see.
            </p>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              {API_ENDPOINTS.map((endpoint) => (
                <article key={endpoint.id} className="rounded-xl border border-border bg-surface p-4">
                  <h3 className="flex flex-wrap items-baseline gap-2">
                    <span className="rounded border border-success-border bg-success-subtle px-1.5 py-0.5 font-mono text-[10px] font-bold text-text-primary">
                      {endpoint.method}
                    </span>
                    <code className="font-mono text-[13px] font-bold text-text-primary">
                      {endpoint.path}
                    </code>
                  </h3>

                  <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">
                    {endpoint.description}
                  </p>

                  <dl className="mt-3 grid gap-1.5">
                    {endpoint.params.map((param) => (
                      <div key={param.name} className="grid gap-0.5 border-t border-border-subtle pt-1.5 first:border-0 first:pt-0">
                        <dt className="flex flex-wrap items-baseline gap-2">
                          <code className="font-mono text-[12px] font-bold text-accent-text">
                            {param.name}
                          </code>
                          <span className="font-mono text-[11px] text-text-secondary">
                            {param.type} · {param.required}
                          </span>
                        </dt>
                        <dd className="text-[13px] leading-snug text-text-secondary">
                          {param.description}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <p className="mt-3 flex flex-wrap gap-x-2 font-mono text-[11px] text-text-secondary">
                    {endpoint.notes.map((note) => (
                      <span key={note}>{note}</span>
                    ))}
                  </p>
                </article>
              ))}
            </div>
          </section>

          {/* ── FAQ ──────────────────────────────────────────────────────── */}
          <section id="faq" aria-labelledby="faq-heading" className="scroll-mt-20 border-t border-border py-14">
            <h2 id="faq-heading" className="font-display text-2xl font-extrabold tracking-tight text-text-primary">
              FAQ
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-text-secondary">
              Published as <code className="rounded bg-surface-muted px-1 py-0.5 font-mono text-[12px] text-accent-text">FAQPage</code>{' '}
              structured data — the same text, verbatim.
            </p>

            <div className="mt-6 grid gap-2">
              {FAQ.map((entry) => (
                <details
                  key={entry.question}
                  className="group rounded-xl border border-border bg-surface px-4"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3.5 text-[15px] font-bold text-text-primary [&::-webkit-details-marker]:hidden">
                    {entry.question}
                    <span
                      aria-hidden="true"
                      className="shrink-0 font-mono text-base leading-none text-accent-text transition-transform duration-200 group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="pb-4 pr-6 text-sm leading-relaxed text-text-secondary">
                    {entry.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>
        </main>

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <footer className="border-t border-border">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-8 text-sm text-text-secondary sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="font-mono text-[12px]">
              v{SITE.version} · {SITE.license} · Next.js 15 · React 19
            </p>
            <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <a href={SITE.entryPath} className="transition-colors hover:text-accent-text">
                Studio
              </a>
              <a href="/llms.txt" className="transition-colors hover:text-accent-text">
                llms.txt
              </a>
              <a href="/llms-full.txt" className="transition-colors hover:text-accent-text">
                llms-full.txt
              </a>
              <a
                href={`${SITE.repoUrl}/issues`}
                className="transition-colors hover:text-accent-text"
              >
                Issues
              </a>
              <a href={SITE.repoUrl} className="transition-colors hover:text-accent-text">
                Source
              </a>
            </nav>
          </div>
        </footer>
      </div>
    </>
  );
}
