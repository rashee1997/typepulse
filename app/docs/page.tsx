import type {Metadata} from 'next';
import Link from 'next/link';
import {ArrowRight, Keyboard} from 'lucide-react';
import {CodeBlock} from '@/components/site/CodeBlock';
import {EnginePreview} from '@/components/site/EnginePreview';
import {
  API_ENDPOINTS,
  CAPABILITIES,
  CODE_SAMPLES,
  FAQ,
  NAV_LINKS,
  PIPELINE,
  PROVIDER_NAMES,
  QUICKSTART,
  SITE,
  SITE_URL,
  faqAnswerText,
} from '@/lib/site-content';

export const metadata: Metadata = {
  title: 'Documentation',
  description:
    'Runewright reference: keystroke pipeline, TypingEngine and HTTP API surface, self-hosting quickstart, and answers on storage, offline use and model providers.',
  alternates: {canonical: SITE.docsPath},
};

/** Escaping `<` keeps content from terminating the script element early. */
const serializeJsonLd = (value: unknown) =>
  JSON.stringify(value).replace(/</g, '\\u003c');

/**
 * Page-scoped structured data.
 *
 * `TechArticle` and `FAQPage` live here rather than in the root layout because
 * schema validators require marked-up content to be present on the page that
 * declares it — these describe the documentation, which exists only at /docs.
 * The FAQ answers are generated from the same array this page renders, so the
 * schema cannot drift from the visible copy.
 */
const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'TechArticle',
      '@id': `${SITE_URL}${SITE.docsPath}/#article`,
      headline: `${SITE.name} architecture, engine API and self-hosting reference`,
      description:
        'Technical reference for Runewright: the keystroke-to-telemetry pipeline, the TypingEngine public API, the adaptive weak-key model, the two server routes and the localStorage progress schema.',
      proficiencyLevel: 'Expert',
      inLanguage: 'en',
      articleSection: 'Software architecture',
      isPartOf: { '@id': `${SITE_URL}/#website` },
      about: { '@id': `${SITE_URL}/#software` },
      author: { '@id': `${SITE_URL}/#organization` },
      mainEntityOfPage: `${SITE_URL}${SITE.docsPath}`,
      dependencies:
        'Next.js 15 (App Router), React 19.2, TypeScript 5.9, Tailwind CSS 4.1, @google/genai 2.x, motion 12, canvas-confetti 1.9, react-markdown 10',
      keywords: [
        'typing engine architecture',
        'keystroke latency',
        'adaptive typing curriculum',
        'localStorage progress schema',
        ...API_ENDPOINTS.map((endpoint) => endpoint.path),
      ],
      articleBody: [
        `Pipeline: ${PIPELINE.map((stage) => `${stage.title} (${stage.actor})`).join(' → ')}.`,
        `Capabilities: ${CAPABILITIES.map((capability) => capability.title).join('; ')}.`,
        `AI providers: ${PROVIDER_NAMES.join(', ')}.`,
      ].join(' '),
    },
    {
      '@type': 'FAQPage',
      '@id': `${SITE_URL}${SITE.docsPath}/#faq`,
      isPartOf: { '@id': `${SITE_URL}/#website` },
      mainEntity: FAQ.map((entry) => ({
        '@type': 'Question',
        name: entry.question,
        acceptedAnswer: {'@type': 'Answer', text: faqAnswerText(entry)},
      })),
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${SITE_URL}${SITE.docsPath}/#breadcrumb`,
      itemListElement: [
        {'@type': 'ListItem', position: 1, name: SITE.name, item: SITE_URL},
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Documentation',
          item: `${SITE_URL}${SITE.docsPath}`,
        },
      ],
    },
  ],
};

export default function DocumentationPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{__html: serializeJsonLd(structuredData)}}
      />

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
            <Link href="/" className="flex shrink-0 items-center gap-2 rounded-lg">
              <span className="rounded-lg bg-accent p-1.5 text-accent-foreground">
                <Keyboard aria-hidden="true" className="h-4 w-4" />
              </span>
              <span className="text-base font-bold tracking-tight text-text-primary">
                {SITE.name}
              </span>
            </Link>

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
              <Link
                href={SITE.entryPath}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-bold text-accent-foreground transition-colors hover:bg-accent-hover"
              >
                Open studio
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </header>

        <main id="main-content" className="mx-auto w-full max-w-5xl px-4 sm:px-6">
          <div className="py-12">
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-text-primary">
              Documentation
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-text-secondary">
              {SITE.definition}
            </p>
          </div>

          {/* ── LIVE DEMO ────────────────────────────────────────────────── */}
          <section aria-labelledby="try-heading" className="border-t border-border py-12">
            <h2
              id="try-heading"
              className="font-display text-2xl font-extrabold tracking-tight text-text-primary"
            >
              Try it
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
              The production <code className="rounded bg-surface-muted px-1 py-0.5 font-mono text-[12px] text-accent-text">TypingEngine</code> and{' '}
              <code className="rounded bg-surface-muted px-1 py-0.5 font-mono text-[12px] text-accent-text">WordViewport</code>{' '}
              running on this page. Same code the studio uses.
            </p>
            <div className="mt-5">
              <EnginePreview />
            </div>
          </section>

          {/* ── QUICKSTART ───────────────────────────────────────────────── */}
          <section
            id="quickstart"
            aria-labelledby="quickstart-heading"
            className="scroll-mt-20 border-t border-border py-12"
          >
            <h2
              id="quickstart-heading"
              className="font-display text-2xl font-extrabold tracking-tight text-text-primary"
            >
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

          {/* ── PIPELINE ─────────────────────────────────────────────────── */}
          <section
            id="engine"
            aria-labelledby="engine-heading"
            className="scroll-mt-20 border-t border-border py-12"
          >
            <h2
              id="engine-heading"
              className="font-display text-2xl font-extrabold tracking-tight text-text-primary"
            >
              How a keystroke is graded
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
              Typing logic never lives in a component. TypingEngine owns character state,
              timing and grading; React only renders it.
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
          <section aria-labelledby="code-heading" className="border-t border-border py-12">
            <h2
              id="code-heading"
              className="font-display text-2xl font-extrabold tracking-tight text-text-primary"
            >
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
          <section
            id="api"
            aria-labelledby="api-heading"
            className="scroll-mt-20 border-t border-border py-12"
          >
            <h2
              id="api-heading"
              className="font-display text-2xl font-extrabold tracking-tight text-text-primary"
            >
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
                      <div
                        key={param.name}
                        className="grid gap-0.5 border-t border-border-subtle pt-1.5 first:border-0 first:pt-0"
                      >
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
          <section
            id="faq"
            aria-labelledby="faq-heading"
            className="scroll-mt-20 border-t border-border py-12"
          >
            <h2
              id="faq-heading"
              className="font-display text-2xl font-extrabold tracking-tight text-text-primary"
            >
              FAQ
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-text-secondary">
              Published as FAQPage structured data — the same text, verbatim.
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

        <footer className="border-t border-border">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-8 text-sm text-text-secondary sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="font-mono text-[12px]">
              v{SITE.version} · {SITE.license} · Next.js 15 · React 19
            </p>
            <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <Link href="/" className="transition-colors hover:text-accent-text">
                Home
              </Link>
              <Link href={SITE.entryPath} className="transition-colors hover:text-accent-text">
                Studio
              </Link>
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
            </nav>
          </div>
        </footer>
      </div>
    </>
  );
}
