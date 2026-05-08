import { NextResponse } from 'next/server';
import wcClient from '@/lib/woocommerce/client';

interface WCOrder {
  status: string;
  total: string;
  date_created: string;
  date_completed: string | null;
  date_modified: string;
}

export interface WeekInMonth {
  key: string;       // "2025-W18"
  weekNo: number;
  startDate: string; // Sunday ISO date
  endDate: string;   // Saturday ISO date
  completed: number;
  cancelled: number;
  created: number;
}

export interface MonthEntry {
  key: string;        // "2025-05"
  chartLabel: string; // "25-05"  (sortable: YY-MM)
  year: number;
  month: number;      // 1–12
  completed: number;
  cancelled: number;
  created: number;
  weeks: WeekInMonth[];
}

// ─── Helpers ──────────────────────────────────────────────────────
function dateSlice(s: string | null | undefined): string {
  return s ? s.slice(0, 10) : '';
}

function toLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7); // "2025-05"
}

function sundayOf(dateStr: string): string {
  const d = toLocalDate(dateStr);
  d.setDate(d.getDate() - d.getDay());
  return toDateStr(d);
}

function weekInfo(sunStr: string): { key: string; weekNo: number; endDate: string } {
  const sun  = toLocalDate(sunStr);
  const jan1 = new Date(sun.getFullYear(), 0, 1);
  const diff = (sun.getTime() - jan1.getTime()) / 86400000;
  const weekNo = Math.floor((diff + jan1.getDay()) / 7) + 1;
  const sat = new Date(sun);
  sat.setDate(sun.getDate() + 6);
  return {
    key: `${sun.getFullYear()}-W${String(weekNo).padStart(2, '0')}`,
    weekNo,
    endDate: toDateStr(sat),
  };
}

function ensureMonth(map: Record<string, MonthEntry>, mk: string): MonthEntry {
  if (!map[mk]) {
    const [y, m] = mk.split('-').map(Number);
    map[mk] = {
      key: mk,
      chartLabel: `${String(y).slice(-2)}-${String(m).padStart(2, '0')}`,
      year: y, month: m,
      completed: 0, cancelled: 0, created: 0,
      weeks: [],
    };
  }
  return map[mk];
}

function getOrAddWeek(me: MonthEntry, sunStr: string): WeekInMonth {
  const { key, weekNo, endDate } = weekInfo(sunStr);
  let w = me.weeks.find(w => w.key === key);
  if (!w) {
    w = { key, weekNo, startDate: sunStr, endDate, completed: 0, cancelled: 0, created: 0 };
    me.weeks.push(w);
  }
  return w;
}

// ─── Handler ──────────────────────────────────────────────────────
export async function GET() {
  try {
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    const after = threeYearsAgo.toISOString().split('T')[0] + 'T00:00:00';

    const first = await wcClient.get('/orders', {
      params: { per_page: 100, after, orderby: 'date', order: 'desc', page: 1 },
    });
    const totalPages = parseInt(first.headers['x-wp-totalpages'] ?? '1', 10);

    const rest = totalPages > 1
      ? await Promise.all(Array.from({ length: totalPages - 1 }, (_, i) =>
          wcClient.get('/orders', { params: { per_page: 100, after, orderby: 'date', order: 'desc', page: i + 2 } })
        ))
      : [];

    const allOrders: WCOrder[] = [
      ...(first.data as WCOrder[]),
      ...rest.flatMap(r => r.data as WCOrder[]),
    ];

    const monthMap: Record<string, MonthEntry> = {};

    // Always ensure current month exists
    const curMonthKey = monthKey(toDateStr(new Date()));
    ensureMonth(monthMap, curMonthKey);

    for (const order of allOrders) {
      const status    = order.status;
      const createdDs = dateSlice(order.date_created);
      const compDs    = dateSlice(order.date_completed);
      const modDs     = dateSlice(order.date_modified);
      const val       = parseFloat(order.total) || 0;

      if (['completed', 'cancelled', 'processing'].includes(status) && createdDs) {
        const me = ensureMonth(monthMap, monthKey(createdDs));
        me.created += val;
        getOrAddWeek(me, sundayOf(createdDs)).created += val;
      }

      if (status === 'completed' && compDs) {
        const me = ensureMonth(monthMap, monthKey(compDs));
        me.completed += val;
        getOrAddWeek(me, sundayOf(compDs)).completed += val;
      }

      if (status === 'cancelled' && modDs) {
        const me = ensureMonth(monthMap, monthKey(modDs));
        me.cancelled += val;
        getOrAddWeek(me, sundayOf(modDs)).cancelled += val;
      }
    }

    for (const me of Object.values(monthMap)) {
      me.weeks.sort((a, b) => a.key.localeCompare(b.key));
    }

    const sorted = Object.values(monthMap).sort((a, b) => b.key.localeCompare(a.key));
    return NextResponse.json(sorted, { headers: { 'Cache-Control': 's-maxage=3600' } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
