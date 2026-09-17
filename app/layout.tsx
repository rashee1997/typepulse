import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'TypePulse AI - Touch Typing & AI Coach',
  description: 'Interactive touch typing platform with curriculum lessons, Typing Duel AI combat mode, Word Games section featuring Typing Race and Word Scramble, real-time analytics, and customizable OpenAI-compatible AI coaching.',
  openGraph: {
    title: 'TypePulse AI - Touch Typing & AI Coach',
    description: 'Interactive touch typing platform with curriculum lessons, Typing Duel AI combat mode, Word Games section featuring Typing Race and Word Scramble, real-time analytics, and customizable OpenAI-compatible AI coaching.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TypePulse AI - Touch Typing & AI Coach',
    description: 'Interactive touch typing platform with curriculum lessons, Typing Duel AI combat mode, Word Games section featuring Typing Race and Word Scramble, real-time analytics, and customizable OpenAI-compatible AI coaching.',
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
      </head>
      <body className="bg-background text-foreground min-h-screen antialiased overflow-x-hidden w-full max-w-full" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
