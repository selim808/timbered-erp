// Totals and groupings for accounting entries. Pure, so both the API route and
// client components (per-day breakdowns) can use it.
import type { AccountingEntry } from '@/lib/accounting';

export const EXPENSE_GROUPS = ['COGS', 'Marketing', 'Fixed costs', 'Logistics', 'Losses', 'Other'];

export interface AccountingGroup {
  name: string;
  total: number;
  count: number;
  /** Expenses only: the sheet buckets inside this group. */
  buckets?: { name: string; total: number; count: number }[];
}

export interface AccountingSide {
  total: number;
  count: number;
  groups: AccountingGroup[];
  /** Newest first. */
  entries: AccountingEntry[];
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Totals per group (payment method / expense category), ordered by `order` or by total. */
export function summarise(entries: AccountingEntry[], order?: string[]): AccountingSide {
  const groups = new Map<string, AccountingGroup & { bucketMap: Map<string, { name: string; total: number; count: number }> }>();
  for (const e of entries) {
    const g = groups.get(e.group) ?? { name: e.group, total: 0, count: 0, bucketMap: new Map() };
    g.total += e.amount;
    g.count += 1;
    if (e.kind === 'expense') {
      const name = e.bucket || 'No bucket';
      const b = g.bucketMap.get(name) ?? { name, total: 0, count: 0 };
      b.total += e.amount;
      b.count += 1;
      g.bucketMap.set(name, b);
    }
    groups.set(e.group, g);
  }
  const list = [...groups.values()].map(({ bucketMap, ...g }) => ({
    ...g,
    total: round(g.total),
    ...(bucketMap.size ? { buckets: [...bucketMap.values()].map(b => ({ ...b, total: round(b.total) })).sort((a, b) => b.total - a.total) } : {}),
  }));
  list.sort((a, b) => order
    ? (order.indexOf(a.name) + 1 || 99) - (order.indexOf(b.name) + 1 || 99)
    : b.total - a.total);
  return {
    total: round(entries.reduce((s, e) => s + e.amount, 0)),
    count: entries.length,
    groups: list,
    entries: [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.amount - a.amount),
  };
}
