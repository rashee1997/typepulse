import type {Metadata, Viewport} from 'next';
import './globals.css'; // Global styles
import {
  FAQ,
  SITE,
  SITE_URL,
  faqAnswerText,
  PIPELINE,
  CAPABILITIES,
  API_ENDPOINTS,
  PROVIDER_NAMES,
} from '@/lib/site-content';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    {media: '(prefers-color-scheme: light)', color: '#f8fafc'},
    {media: '(prefers-color-scheme: dark)', color: '#020617'},
  ],
};

/**
 * Site-wide metadata.
 *
 * Titles use a template so every route reads
 * `<Specific Function> — Runewright` for both humans and answer engines.
 * Canonical URLs are intentionally per-route (see app/page.tsx and
 * app/app/layout.tsx) because a root-level `alternates.canonical` would be
 * inherited by /app and mis-attribute the studio page.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE.name} — AI-Coached Touch-Typing Studio`,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.definition,
  applicationName: SITE.name,
  category: 'DeveloperApplication',
  keywords: [
    'touch typing',
    'typing trainer',
    'typing test',
    'AI typing coach',
    'keyboard curriculum',
    'typing analytics',
    'self-hosted typing app',
    'WPM',
    'adaptive typing drills',
    'Runewright',
  ],
  authors: [{name: 'Runewright contributors', url: SITE.repoUrl}],
  creator: 'Runewright contributors',
  publisher: 'Runewright contributors',
  manifest: '/manifest.json',
  icons: {
    icon: [{url: '/icon.svg', type: 'image/svg+xml'}],
    shortcut: ['/icon.svg'],
    apple: [{url: '/icon.svg'}],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
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
  alternates: {
    types: {
      'text/plain': [
        {url: '/llms.txt', title: 'Runewright project summary for language models'},
        {url: '/llms-full.txt', title: 'Runewright full documentation for language models'},
      ],
    },
  },
};

const OG_IMAGE = `${SITE_URL}/opengraph-image`;

/**
 * Structured data graph.
 *
 * The FAQPage answers are generated from the exact same array the landing page
 * renders, so the schema can never drift away from the visible copy — which is
 * what schema validators and answer engines both check for.
 */
const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}/#software`,
      name: SITE.name,
      alternateName: SITE.formerName,
      applicationCategory: 'EducationalApplication',
      applicationSubCategory: 'Touch typing trainer and keyboard curriculum',
      operatingSystem: 'Any (web browser)',
      runtimePlatform: 'Node.js 20+ (Next.js 15, standalone output)',
      programmingLanguage: ['TypeScript'],
      softwareVersion: SITE.version,
      url: SITE_URL,
      description: SITE.definition,
      isAccessibleForFree: true,
      codeRepository: SITE.repoUrl,
      downloadUrl: SITE.repoUrl,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: 'Free to self-host; the AI coach is optional.',
      },
      featureList: CAPABILITIES.map((capability) => capability.title),
      screenshot: OG_IMAGE,
      author: { '@id': `${SITE_URL}/#organization` },
      creator: { '@id': `${SITE_URL}/#organization` },
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE.name,
      description: SITE.definition,
      inLanguage: 'en',
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE.name,
      url: SITE.repoUrl,
      description: `${SITE.name} — ${SITE.tagline}`,
    },
    {
      '@type': 'TechArticle',
      '@id': `${SITE_URL}/#architecture`,
      headline: `${SITE.name} architecture, engine API and self-hosting reference`,
      description:
        'Technical reference for Runewright: the keystroke-to-telemetry pipeline, the TypingEngine public API, the adaptive weak-key model, the two server routes, and the localStorage progress schema.',
      proficiencyLevel: 'Expert',
      inLanguage: 'en',
      articleSection: 'Software architecture',
      about: { '@id': `${SITE_URL}/#software` },
      author: { '@id': `${SITE_URL}/#organization` },
      mainEntityOfPage: SITE_URL,
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
        `Pipeline: ${PIPELINE.map((stage) => `${stage.title} (${stage.actor})` ).join(' → ')}.`,
        `Capabilities: ${CAPABILITIES.map((capability) => capability.title).join('; ')}.`,
        `AI providers: ${PROVIDER_NAMES.join(', ')}.`,
      ].join(' '),
    },
    {
      '@type': 'FAQPage',
      '@id': `${SITE_URL}/#faq`,
      isPartOf: { '@id': `${SITE_URL}/#website` },
      mainEntity: FAQ.map((entry) => ({
        '@type': 'Question',
        name: entry.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faqAnswerText(entry),
        },
      })),
    },
  ],
};

/** Escaping `<` keeps arbitrary content from terminating the script element early. */
const serializeJsonLd = (value: unknown) =>
  JSON.stringify(value).replace(/</g, '\\u003c');

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className="dark overflow-x-hidden" suppressHydrationWarning>
      <head>
        {/* Runs before paint: restores the stored theme so there is no flash and
            no server/client markup divergence (the <html> tag suppresses the
            attribute diff this necessarily produces). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const stored = localStorage.getItem('typepulse_preferences');
                if (stored) {
                  const prefs = JSON.parse(stored);
                  if (prefs.theme === 'light') {
                    document.documentElement.classList.remove('dark');
                  } else if (prefs.theme === 'system') {
                    if (!window.matchMedia('(prefers-color-scheme: dark)').matches) {
                      document.documentElement.classList.remove('dark');
                    }
                  }
                }
              } catch (e) {}
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
        <link rel="llms" href="/llms.txt" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{__html: serializeJsonLd(structuredData)}}
        />
      </head>
      <body className="bg-background text-foreground w-full max-w-full antialiased">
        {children}
      </body>
    </html>
  );
}
