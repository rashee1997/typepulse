import type {Metadata, Viewport} from 'next';
import './globals.css'; // Global styles
import {SITE, SITE_URL, CAPABILITIES} from '@/lib/site-content';

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
 * Structured data graph — the site-wide identity nodes.
 *
 * `TechArticle` and `FAQPage` deliberately live on /docs instead of here: schema
 * validators require the marked-up content to be visible on the page that
 * declares it, and those nodes describe documentation that only exists there.
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
