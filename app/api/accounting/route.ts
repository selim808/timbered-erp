import { NextResponse } from 'next/server';
import { getAccountingEntries } from '@/lib/accounting';
import { EXPENSE_GROUPS, summarise, type AccountingSide } from '@/lib/accountingSummary';

export type { AccountingGroup, AccountingSide } from '@/lib/accountingSummary';

export interface AccountingResponse {
  from: string;
  to: string;
  cashIn: AccountingSide;
  expenses: AccountingSide;
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
