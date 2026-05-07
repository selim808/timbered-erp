import wc from '@/lib/woocommerce/client';
import { WCOrder } from '@/types';
import CollapsibleSection from '@/components/owner/CollapsibleSection';
import KpiCards from '@/components/owner/KpiCards';

async function fetchOrders(status: string): Promise<WCOrder[]> {
  try {
    const res = await wc.get('/orders', {
      params: { status, per_page: 100, orderby: 'date', order: 'desc' },
    });
    return res.data as WCOrder[];
  } catch {
    return [];
  }
}

function egp(val: number) {
  return `EGP ${val.toLocaleString('en-EG', { minimumFractionDigits: 0 })}`;
}

export const revalidate = 300; // refresh every 5 min

export default async function DashboardPage() {
  const [processing, onHold, completed] = await Promise.all([
    fetchOrders('processing'),
    fetchOrders('on-hold'),
    fetchOrders('completed'),
  ]);

  const processingValue = processing.reduce((s, o) => s + parseFloat(o.total), 0);
  const completedValue  = completed.reduce((s, o)  => s + parseFloat(o.total), 0);

  // This month completed
  const now = new Date();
  const monthCompleted = completed.filter((o) => {
    const d = new Date(o.date_created);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthValue = monthCompleted.reduce((s, o) => s + parseFloat(o.total), 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24 space-y-4">

      {/* ── Pipeline Overview ── */}
      <CollapsibleSection title="Pipeline Overview" defaultOpen>
        <KpiCards items={[
          { label: 'Processing',    value: processing.length,   sub: egp(processingValue), color: 'info' },
          { label: 'On Hold',       value: onHold.length,       color: 'danger' },
          { label: 'Done This Month', value: monthCompleted.length, sub: egp(monthValue), color: 'success' },
          { label: 'All Completed', value: completed.length,    sub: egp(completedValue) },
        ]} />

        {/* Recent processing orders */}
        <div className="px-5 pb-5">
          <p className="text-xs font-bold text-text-muted uppercase tracking-wide mb-3">
            Processing Orders
          </p>
          <div className="space-y-2">
            {processing.slice(0, 10).map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between bg-cream rounded-xl border border-border px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-text">
                    #{o.id} · {o.billing.first_name} {o.billing.last_name}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {new Date(o.date_created).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                </div>
                <span className="text-sm font-bold text-brown">{egp(parseFloat(o.total))}</span>
              </div>
            ))}
            {processing.length === 0 && (
              <p className="text-sm text-text-muted text-center py-4">No processing orders</p>
            )}
          </div>
        </div>
      </CollapsibleSection>

      {/* ── Important Links ── */}
      <CollapsibleSection title="Important Links">
        <div className="p-5 grid grid-cols-2 gap-3">
          {[
            { label: 'Google Sheets',  emoji: '📊', href: 'https://docs.google.com/spreadsheets' },
            { label: 'OneDrive',       emoji: '☁️', href: 'https://onedrive.live.com' },
            { label: 'WooCommerce',    emoji: '🛒', href: 'https://timberedgroup.com/wp-admin' },
            { label: 'Supabase',       emoji: '🗄️', href: 'https://supabase.com/dashboard/project/wpmeajpzlzdxrahgubxl' },
          ].map(({ label, emoji, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 bg-cream rounded-xl border border-border px-4 py-3 hover:border-brown transition-colors"
            >
              <span className="text-xl">{emoji}</span>
              <span className="text-sm font-semibold text-text">{label}</span>
            </a>
          ))}
        </div>
      </CollapsibleSection>

    </div>
  );
}
