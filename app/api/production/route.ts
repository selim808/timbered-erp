import { NextResponse } from 'next/server';
import wcClient from '@/lib/woocommerce/client';

interface WCOrder {
  total: string;
  line_items: { quantity: number }[];
}

interface Phase {
  Phases: string;
  Value: number;
}

// ── WIP breakdown source ────────────────────────────────────────────
// The WIP phases/values live in a Google Sheet, range A2:B32
// (col A = phase name, col B = value). We read it via the gviz endpoint so we
// get the raw cell values and the exact range. Sheet id/gid are overridable via
// env but default to the production sheet so no extra Vercel config is needed.
const SHEET_ID    = process.env.PROD_SHEET_ID  ?? '1nWXrJVPPjGtq7Om4c1FDlKw8vDJ_IGsE76avg2V0c-o';
const SHEET_GID   = process.env.PROD_SHEET_GID ?? '810319678';
const SHEET_RANGE = 'A2:B32';

async function fetchPhases(): Promise<Phase[]> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${SHEET_GID}&range=${SHEET_RANGE}`;
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
    .map((r) => ({
      Phases: r?.c?.[0]?.v ?? '',
      Value: Number(r?.c?.[1]?.v ?? 0),
    }))
    .filter((p: Phase) => p.Phases);
}

async function fetchProcessing() {
  let page = 1, ordersNo = 0, itemsNo = 0, procValue = 0;
  while (true) {
    const res    = await wcClient.get('/orders', { params: { status: 'processing', per_page: 100, page } });
    const orders = res.data as WCOrder[];
    if (!orders.length) break;
    ordersNo += orders.length;
    orders.forEach(o => {
      (o.line_items || []).forEach(i => { itemsNo += i.quantity || 1; });
      procValue += parseFloat(o.total) || 0;
    });
    if (orders.length < 100) break;
    page++;
  }
  return { ordersNo, itemsNo, procValue: Math.round(procValue) };
}

export async function GET() {
  try {
    const [phases, wc] = await Promise.all([
      fetchPhases(),
      fetchProcessing(),
    ]);
    return NextResponse.json({ phases, ...wc });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
