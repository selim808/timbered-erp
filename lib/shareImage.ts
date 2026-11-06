// Turns a part of the page into a PNG and opens the phone's share menu
// (WhatsApp → a chat or group). Where the share menu can't take files (most
// computers) the picture downloads instead. html2canvas loads from the CDN on
// first use (the same copy the guarantee/production pages use).

type Html2Canvas = (el: HTMLElement, opts?: Record<string, unknown>) => Promise<HTMLCanvasElement>;

const HTML2CANVAS_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
let loading: Promise<Html2Canvas> | null = null;

function loadHtml2canvas(): Promise<Html2Canvas> {
  const w = window as unknown as { html2canvas?: Html2Canvas };
  if (w.html2canvas) return Promise.resolve(w.html2canvas);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const done = () => (w.html2canvas ? resolve(w.html2canvas) : reject(new Error('Image tool did not load')));
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${HTML2CANVAS_SRC}"]`);
      if (existing) { existing.addEventListener('load', done); existing.addEventListener('error', () => reject(new Error('Image tool did not load'))); return; }
      const s = document.createElement('script');
      s.src = HTML2CANVAS_SRC;
      s.onload = done;
      s.onerror = () => reject(new Error('Image tool did not load'));
      document.body.appendChild(s);
    });
    loading.catch(() => { loading = null; });
  }
  return loading;
}

/** e.g. "Fri, 6 Nov 2026, 14:05" in Cairo time. */
export function cairoNowLabel() {
  return new Date().toLocaleString('en-GB', {
    timeZone: 'Africa/Cairo', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export async function shareElementAsImage(el: HTMLElement, opts: {
  /** File name without extension; today's date is added unless addDate is false. */
  name: string;
  addDate?: boolean;
  /** Text sent along with the picture where the share target supports it. */
  text?: string;
  /** Picture width in CSS px, when the content is wider than it shows (e.g. a sideways-scrolling table). */
  width?: number;
  /** Adjust the off-screen copy before it is drawn (show headers, unclip scroll areas…). */
  prepare?: (clone: HTMLElement, doc: Document) => void;
}): Promise<void> {
  const h2c = await loadHtml2canvas();
  const marker = `share-${Math.random().toString(36).slice(2)}`;
  el.setAttribute('data-share-root', marker);
  try {
    const canvas = await h2c(el, {
      // 3× (or the screen's density, if higher) so text survives WhatsApp's compression.
      scale: Math.min(4, Math.max(3, window.devicePixelRatio || 1)),
      backgroundColor: '#FBF5EC',
      ...(opts.width ? { width: opts.width, windowWidth: Math.max(window.innerWidth, opts.width) } : {}),
      onclone: (doc: Document) => {
        doc.querySelectorAll<HTMLElement>('.share-only').forEach(n => { n.style.display = 'block'; });
        const clone = doc.querySelector<HTMLElement>(`[data-share-root="${marker}"]`);
        if (clone) {
          if (opts.width) clone.style.width = `${opts.width}px`;
          opts.prepare?.(clone, doc);
        }
      },
    });
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
    if (!blob) throw new Error('Could not create the image');
    const fileName = opts.addDate === false ? opts.name : `${opts.name}-${new Date().toISOString().slice(0, 10)}`;
    const file = new File([blob], `${fileName}.png`, { type: 'image/png' });

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: opts.name, text: opts.text });
      } catch (e) {
        // Closing the share menu without picking an app is not an error.
        if (!(e instanceof DOMException && e.name === 'AbortError')) throw e;
      }
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
  } finally {
    el.removeAttribute('data-share-root');
  }
}
