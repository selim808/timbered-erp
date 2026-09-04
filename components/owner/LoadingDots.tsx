const STYLES = `
  @keyframes ld-ellipsis { to { width: 3ch; } }
  @keyframes ld-pulse { 50% { opacity: 0.55; } }

  .ld-wrap { animation: ld-pulse 1.6s ease-in-out infinite; }

  /* Reveals "..." one character at a time, then snaps back to none. */
  .ld-dots::after {
    content: '...';
    display: inline-block;
    width: 0;
    overflow: hidden;
    vertical-align: bottom;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    animation: ld-ellipsis 1.2s steps(4, jump-none) infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .ld-wrap { animation: none; }
    .ld-dots::after { width: 3ch; animation: none; }
  }
`;

export default function LoadingDots({ label = 'Loading' }: { label?: string }) {
  return (
    <div
      className="ld-wrap"
      style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: '#7A6F65' }}
    >
      <style>{STYLES}</style>
      <span className="ld-dots">{label}</span>
    </div>
  );
}
