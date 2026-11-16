'use client';

import { useRef, useState, type ReactNode } from 'react';
import { cairoNowLabel, shareElementAsImage } from '@/lib/shareImage';

const STYLES = `
.ci-bar { display:flex; justify-content:flex-end; gap:6px; margin-bottom:4px; }
.ci-btn { display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:50%; border:1px solid #E8D9C4; background:#fff; color:#7A4610; cursor:pointer; padding:0; }
.ci-btn.share { color:#25D366; }
.ci-btn:disabled { color:#bbb; cursor:default; }
.ci-cap { display:none; font-size:13px; font-weight:800; color:#1C1A17; margin-bottom:6px; }
.ci-cap span { display:block; font-size:10px; font-weight:600; color:#9e9087; }
`;

/**
 * Wraps a chart (with its legend, if any) and adds two small buttons: download
 * it as a picture, or share it (phone share menu → WhatsApp). The picture holds
 * the whole chart, including any part scrolled out of view, with a title and
 * the time it was taken.
 */
export default function ChartImage({ name, title, children }: {
  /** File name, e.g. "weekly-chart" (the date is added). */
  name: string;
  /** Heading printed on the picture. */
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<'share' | 'download' | null>(null);

  async function run(mode: 'share' | 'download') {
    const el = ref.current;
    if (!el || busy) return;
    setBusy(mode);
    try {
      // Widest content inside (sideways-scrolling charts are wider than they show).
      const width = Math.max(el.clientWidth, ...[...el.querySelectorAll<HTMLElement>('*')].map(n => n.scrollWidth));
      await shareElementAsImage(el, {
        name, mode,
        text: `${title} — ${cairoNowLabel()}`,
        width: width + 24,
        prepare: clone => {
          clone.style.padding = '12px';
          clone.style.background = '#fff';
          clone.querySelectorAll<HTMLElement>('*').forEach(n => {
            if (n.style.overflowX === 'auto' || n.style.overflow === 'auto') { n.style.overflow = 'visible'; n.style.overflowX = 'visible'; }
          });
          const cap = clone.querySelector<HTMLElement>('.ci-cap');
          if (cap) cap.style.display = 'block';
          const when = clone.querySelector<HTMLElement>('.ci-when');
          if (when) when.textContent = cairoNowLabel();
        },
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not create the picture');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div ref={ref}>
      <style>{STYLES}</style>
      <div className="ci-cap">{title}<span className="ci-when" /></div>
      <div className="ci-bar" data-html2canvas-ignore>
        <button className="ci-btn" onClick={() => void run('download')} disabled={!!busy} title="Download as picture" aria-label={`Download ${title} as picture`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
          </svg>
        </button>
        <button className="ci-btn share" onClick={() => void run('share')} disabled={!!busy} title="Share as picture" aria-label={`Share ${title} as picture`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" />
            <path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4" />
          </svg>
        </button>
      </div>
      {children}
    </div>
  );
}
