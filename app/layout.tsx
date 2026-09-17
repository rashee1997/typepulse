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
    <html lang="en" className="bg-slate-950 text-slate-100 overflow-x-hidden">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased overflow-x-hidden w-full max-w-full" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
