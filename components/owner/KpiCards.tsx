interface Kpi {
  label: string;
  value: string | number;
  sub?: string;
  color?: 'default' | 'success' | 'danger' | 'info';
}

const COLOR = {
  default: 'text-text',
  success: 'text-success',
  danger:  'text-danger',
  info:    'text-info',
};

export default function KpiCards({ items }: { items: Kpi[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5">
      {items.map(({ label, value, sub, color = 'default' }) => (
        <div key={label} className="bg-cream rounded-xl border border-border p-4">
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wide mb-1">{label}</p>
          <p className={`text-2xl font-black ${COLOR[color]}`}>{value}</p>
          {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
        </div>
      ))}
    </div>
  );
}
