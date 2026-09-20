import type {Metadata} from 'next';
import {SITE} from '@/lib/site-content';

export const metadata: Metadata = {
  title: 'Studio',
  description:
    'The Runewright studio: 42 lessons, 12 arcade drills, live telemetry and the AI typing coach. Progress is stored locally in your browser.',
  alternates: {canonical: '/app'},
};

/**
 * Studio shell — the zero-disturbance seam.
 *
 * Before the documentation page existed, the interactive studio was the root
 * route and these exact classes lived on `<body>`:
 *
 *   bg-background text-foreground h-dvh antialiased overflow-hidden
 *   w-full max-w-full flex flex-col
 *
 * They are reproduced here verbatim as a wrapper element so the studio's box
 * model, scroll containment and fixed-position modal behaviour are byte-for-byte
 * what they were. `app/layout.tsx` now only paints the neutral document shell
 * that both the documentation page and the studio share; global CSS, Tailwind
 * tokens, providers and every studio component are untouched.
 */
export default function StudioLayout({children}: {children: React.ReactNode}) {
  return (
    <div
      id={SITE.entryPath.replace('/', '') + '-shell'}
      className="bg-background text-foreground h-dvh w-full max-w-full antialiased overflow-hidden flex flex-col"
    >
      {children}
    </div>
  );
}
