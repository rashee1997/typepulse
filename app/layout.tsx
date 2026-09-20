import type {Metadata, Viewport} from 'next';
import './globals.css'; // Global styles

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'TypePulse AI - Touch Typing & AI Coach',
  description: 'Interactive touch typing platform with curriculum lessons, AI pattern drills, streamlined Arcade featuring Grand Prix Speedway, Orbital Laser Defense, Bomb Squad Defusal, and Word Blitz, real-time analytics, and customizable AI coaching.',
  manifest: '/manifest.json',
  openGraph: {
    title: 'TypePulse AI - Touch Typing & AI Coach',
    description: 'Interactive touch typing platform with curriculum lessons, AI pattern drills, streamlined Arcade featuring Grand Prix Speedway, Orbital Laser Defense, Bomb Squad Defusal, and Word Blitz, real-time analytics, and customizable AI coaching.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TypePulse AI - Touch Typing & AI Coach',
    description: 'Interactive touch typing platform with curriculum lessons, AI pattern drills, streamlined Arcade featuring Grand Prix Speedway, Orbital Laser Defense, Bomb Squad Defusal, and Word Blitz, real-time analytics, and customizable AI coaching.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className="dark overflow-x-hidden" suppressHydrationWarning>
      <head>
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
      </head>
      <body className="bg-background text-foreground h-dvh antialiased overflow-hidden w-full max-w-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
