import { NextResponse } from 'next/server';
import { EXPENSE_GROUPS, getAccountingEntries, type AccountingEntry } from '@/lib/accounting';

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

export interface AccountingResponse {
  from: string;
  to: string;
  cashIn: AccountingSide;
  expenses: AccountingSide;
}

const round = (n: number) => Math.round(n * 100) / 100;

function summarise(entries: AccountingEntry[], order?: string[]): AccountingSide {
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

// GET ?from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive): cash in and expenses for the
// period, from the Accounting-Entry Google Sheet.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get('from') ?? '';
  const to = url.searchParams.get('to') ?? from;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || to < from) {
    return NextResponse.json({ error: 'from/to must be YYYY-MM-DD with from ≤ to' }, { status: 400 });
  }
  try {
    const inRange = (await getAccountingEntries()).filter(e => e.date >= from && e.date <= to);
    const body: AccountingResponse = {
      from, to,
      cashIn: summarise(inRange.filter(e => e.kind === 'cash')),
      expenses: summarise(inRange.filter(e => e.kind === 'expense'), EXPENSE_GROUPS),
    };
    return NextResponse.json(body);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
