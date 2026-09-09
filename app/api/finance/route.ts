import { NextResponse } from 'next/server';

interface Round {
  Round: string;
  Start_Date: string | null;
  Start_Order: string | number | null;
  End_Order: string | number | null;
  Duration: number;
  Total_Orders_No: number;
  Total_Orders_Value: number;
  CashIn_Value: number;
  CashIn_No: number;
  Expenses: number;
  Orders_Ceiling: number;
  Ceiling_Gap: number;
  Processing_Value: number;
  Processing_No: number;
  Completed_Value: number;
  Completed_No: number;
  Cash_Minus_Com_Value: number;
  Cash_Minus_Com_No: number;
  Cancelled_Value: number;
  Cancelled_No: number;
  COGS_Value: number;      COGS_Percent: number;
  MRK_Value: number;       MRK_Percent: number;
  FixedCost_Value: number; FixedCost_Percent: number;
  Logistics_Value: number; Logistics_Percent: number;
  Others_Value: number;    Others_Percent: number;
}

// ── Finance rounds source ───────────────────────────────────────────
// The per-round finance breakdown lives in the "Rounds_DB" tab of the
// finance spreadsheet. Read via the gviz endpoint (same approach as
// /api/production) rather than the old Apps Script echo URL, which was an
// ephemeral redirect link that expired.
const SHEET_ID  = process.env.FINANCE_SHEET_ID  ?? '1K8nxRWyl6KjePKrvH0gn4dzF4qDa8OgmrAzp0Lp0Yd4';
const SHEET_GID = process.env.FINANCE_SHEET_GID ?? '1951233913';

const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v) || 0);

// gviz date cells come back as "Date(YYYY,M,D)" (M is 0-indexed) — convert to ISO.
function gvizDate(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const m = v.match(/^Date\((\d+),(\d+),(\d+)\)$/);
  if (!m) return null;
  const [, y, mo, d] = m;
  return `${y}-${String(Number(mo) + 1).padStart(2, '0')}-${String(Number(d)).padStart(2, '0')}`;
}

async function fetchRounds(): Promise<Round[]> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${SHEET_GID}&sheet=Rounds_DB`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  const text = await res.text();

  // gviz wraps the JSON in a JSONP callback: /*O_o*/\ngoogle.visualization.Query.setResponse({…});
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < 0) throw new Error('Unexpected sheet response');
  const json = JSON.parse(text.slice(start, end + 1));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = json?.table?.rows ?? [];
  return rows
    .map((r): Round | null => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c: any[] = r?.c ?? [];
      const v = (i: number) => c[i]?.v ?? null;
      const round = v(0);
      if (!round) return null;
      return {
        Round: String(round),
        Start_Date: gvizDate(v(2)),
        Start_Order: v(3),
        End_Order: v(4),
        Duration: num(v(6)),
        Total_Orders_No: num(v(7)),
        Total_Orders_Value: num(v(8)),
        Completed_No: num(v(9)),
        Completed_Value: num(v(10)),
        Processing_No: num(v(13)),
        Processing_Value: num(v(14)),
        Cancelled_No: num(v(16)),
        Cancelled_Value: num(v(17)),
        Expenses: num(v(19)),
        COGS_Value: num(v(21)),      COGS_Percent: num(v(22)),
        MRK_Value: num(v(23)),       MRK_Percent: num(v(24)),
        FixedCost_Value: num(v(25)), FixedCost_Percent: num(v(26)),
        Logistics_Value: num(v(27)), Logistics_Percent: num(v(28)),
        Others_Value: num(v(29)),    Others_Percent: num(v(30)),
        CashIn_Value: num(v(31)),
        CashIn_No: num(v(32)),
        Cash_Minus_Com_No: num(v(33)),
        Cash_Minus_Com_Value: num(v(34)),
        Orders_Ceiling: num(v(36)),
        Ceiling_Gap: num(v(37)),
      };
    })
    .filter((r): r is Round => r !== null);
}

export async function GET() {
  try {
    const rounds = await fetchRounds();
    return NextResponse.json(rounds);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
