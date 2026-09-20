import {ImageResponse} from 'next/og';
import {SITE} from '@/lib/site-content';

export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = {width: 1200, height: 630};
export const contentType = 'image/png';

/**
 * Generated 1200×630 social card.
 *
 * Rendered at build time by `next/og` with the project's own dark palette values
 * inlined as literals (an image renderer has no access to the CSS custom
 * properties the app uses). Keeping it generated means the card can never go
 * stale relative to the metadata it accompanies.
 */
export default function OpengraphImage() {
  const chips = ['Next.js 15', 'React 19', 'TypeScript', 'Offline-first'];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '68px',
          backgroundColor: '#020617',
          color: '#f8fafc',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Brand row */}
        <div style={{display: 'flex', alignItems: 'center', gap: '18px'}}>
          <div
            style={{
              width: '60px',
              height: '60px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '18px',
              backgroundColor: '#fbbf24',
              color: '#020617',
              fontSize: '34px',
              fontWeight: 800,
            }}
          >
            R
          </div>
          <div style={{display: 'flex', fontSize: '30px', fontWeight: 700, letterSpacing: '-0.5px'}}>
            {SITE.name}
          </div>
        </div>

        {/* Headline */}
        <div style={{display: 'flex', flexDirection: 'column'}}>
          <div
            style={{
              display: 'flex',
              fontSize: '76px',
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: '-2px',
            }}
          >
            An AI-coached touch-typing studio.
          </div>
          <div
            style={{
              marginTop: '26px',
              display: 'flex',
              fontSize: '28px',
              lineHeight: 1.4,
              color: '#94a3b8',
              maxWidth: '940px',
            }}
          >
            42 lessons · 12 arcade drills · an adaptive weak-key engine · telemetry
            that never leaves your browser.
          </div>
        </div>

        {/* Footer row */}
        <div style={{display: 'flex', alignItems: 'center', gap: '14px'}}>
          {chips.map((chip) => (
            <div
              key={chip}
              style={{
                display: 'flex',
                padding: '10px 18px',
                borderRadius: '12px',
                border: '1px solid #1e293b',
                backgroundColor: '#0f172a',
                color: '#cbd5e1',
                fontSize: '20px',
                fontWeight: 600,
              }}
            >
              {chip}
            </div>
          ))}
          <div style={{display: 'flex', flexGrow: 1}} />
          <div style={{display: 'flex', fontSize: '20px', color: '#fbbf24', fontWeight: 700}}>
            {SITE.repoLabel}
          </div>
        </div>
      </div>
    ),
    size
  );
}
