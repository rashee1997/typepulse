import type {Metadata} from 'next';
import {SITE, SITE_URL, CAPABILITIES, FACTS} from '@/lib/site-content';
import TypingStudio from '@/components/TypingStudio';

export const metadata: Metadata = {
  title: `${SITE.name} — AI-Coached Touch-Typing Studio`,
  description: SITE.definition,
  alternates: {
    canonical: '/',
    types: {
      'text/plain': [
        {url: '/llms.txt', title: 'Runewright project summary for language models'},
        {url: '/llms-full.txt', title: 'Runewright full documentation for language models'},
      ],
    },
  },
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    title: `${SITE.name} — AI-Coached Touch-Typing Studio`,
    description: SITE.definition,
    url: SITE_URL,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} — AI-Coached Touch-Typing Studio`,
    description: SITE.definition,
  },
};

/**
 * Root route: direct-to-app interactive typing studio.
 *
 * Provides immediate zero-friction access to the typing engine (Monkeytype/Keybr style)
 * while preserving complete SEO and AAEO (Answer Engine Optimization) via rich metadata,
 * structured JSON-LD in the root layout, and server-rendered semantic indexing.
 */
export default function Page() {
  return (
    <div
      id="studio-shell"
      className="bg-background text-foreground h-dvh w-full max-w-full antialiased overflow-hidden flex flex-col"
    >
      {/* Semantic outline for Search Engines & AI Answer Engines (AAEO) */}
      <header className="sr-only">
        <h1>{SITE.name} — AI-Coached Touch-Typing Studio</h1>
        <p>{SITE.definition}</p>
        <nav aria-label="Quick links">
          <a href="/docs">Documentation and Engine Architecture</a>
          <a href="/llms.txt">Machine-Readable LLM Directory</a>
          <a href="/llms-full.txt">Full Technical Specifications</a>
        </nav>
      </header>

      <div className="sr-only" aria-hidden="true">
        <h2>Features &amp; Curriculum</h2>
        <ul>
          {FACTS.map((fact) => (
            <li key={fact.label}>
              {fact.value} {fact.label} ({fact.detail})
            </li>
          ))}
        </ul>
        <h3>Capabilities</h3>
        <ul>
          {CAPABILITIES.map((cap) => (
            <li key={cap.id}>
              <strong>{cap.title}</strong>: {cap.summary}
            </li>
          ))}
        </ul>
      </div>

      <TypingStudio />
    </div>
  );
}
