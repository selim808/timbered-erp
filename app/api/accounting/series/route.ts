import { NextResponse } from 'next/server';
import { getAccountingEntries } from '@/lib/accounting';

export interface CashFlowPeriod {
  /** Week: its Sunday (YYYY-MM-DD). Month: YYYY-MM. */
  key: string;
  cashIn: number;
  expenses: number;
}

/** The Sunday on or before a YYYY-MM-DD date (weeks run Sunday–Saturday, as in Weekly). */
function sundayOf(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() - t.getUTCDay());
  return t.toISOString().slice(0, 10);
}

// GET ?by=week|month: cash in and expenses per week (keyed by its Sunday) or
// per month (YYYY-MM), from the Accounting-Entry sheet. Oldest first.
export async function GET(req: Request) {
  const by = new URL(req.url).searchParams.get('by');
  if (by !== 'week' && by !== 'month') {
    return NextResponse.json({ error: 'by must be week or month' }, { status: 400 });
  }
  try {
    const periods = new Map<string, CashFlowPeriod>();
    for (const e of await getAccountingEntries()) {
      const key = by === 'week' ? sundayOf(e.date) : e.date.slice(0, 7);
      const p = periods.get(key) ?? { key, cashIn: 0, expenses: 0 };
      if (e.kind === 'cash') p.cashIn += e.amount; else p.expenses += e.amount;
      periods.set(key, p);
    }
    const list = [...periods.values()]
      .map(p => ({ ...p, cashIn: Math.round(p.cashIn), expenses: Math.round(p.expenses) }))
      .sort((a, b) => a.key.localeCompare(b.key));
    return NextResponse.json(list);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
