import { NextResponse } from 'next/server';
import wcClient from '@/lib/woocommerce/client';

interface WCOrder {
  status: string;
  total: string;
  date_created: string;
  date_completed: string | null;
  date_modified: string;
}

interface DayData { completed: number; cancelled: number; created: number; }

export interface WeekEntry {
  key: string;        // "2025-W01"
  chartLabel: string; // "25W01"
  year: number;
  weekNo: number;
  startDate: string;  // Sunday ISO date
  endDate: string;    // Saturday ISO date
  completed: number;
  cancelled: number;
  created: number;
  days: Record<string, DayData>;
}

// ─── Date helpers (all use local time to match old project) ───────
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

function sundayOf(dateStr: string): string {
  const d = toLocalDate(dateStr);
  d.setDate(d.getDate() - d.getDay());
  return toDateStr(d);
}

function weekNumbers(sunStr: string): { year: number; weekNo: number; chartLabel: string; key: string; endDate: string } {
  const sun  = toLocalDate(sunStr);
  const jan1 = new Date(sun.getFullYear(), 0, 1);
  const diff = (sun.getTime() - jan1.getTime()) / 86400000;
  const weekNo = Math.floor((diff + jan1.getDay()) / 7) + 1;
  const year   = sun.getFullYear();
  const sat    = new Date(sun);
  sat.setDate(sun.getDate() + 6);
  return {
    year, weekNo,
    key: `${year}-W${String(weekNo).padStart(2, '0')}`,
    chartLabel: `${String(year).slice(-2)}W${String(weekNo).padStart(2, '0')}`,
    endDate: toDateStr(sat),
  };
}

function ensureWeek(map: Record<string, WeekEntry>, sunStr: string): WeekEntry {
  const { year, weekNo, key, chartLabel, endDate } = weekNumbers(sunStr);
  if (!map[key]) {
    map[key] = { key, chartLabel, year, weekNo, startDate: sunStr, endDate, completed: 0, cancelled: 0, created: 0, days: {} };
  }
  return map[key];
}

function ensureDay(week: WeekEntry, dayStr: string): DayData {
  if (!week.days[dayStr]) week.days[dayStr] = { completed: 0, cancelled: 0, created: 0 };
  return week.days[dayStr];
}

// ─── Main handler ─────────────────────────────────────────────────
export async function GET() {
  try {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const after = twoYearsAgo.toISOString().split('T')[0] + 'T00:00:00';

    const first = await wcClient.get('/orders', { params: { per_page: 100, after, orderby: 'date', order: 'desc', page: 1 } });
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

    const weekMap: Record<string, WeekEntry> = {};

    // Ensure current week always exists
    const todayStr  = toDateStr(new Date());
    const curSunStr = sundayOf(todayStr);
    ensureWeek(weekMap, curSunStr);

    for (const order of allOrders) {
      const status    = order.status;
      const createdDs = dateSlice(order.date_created);
      const compDs    = dateSlice(order.date_completed);
      const modDs     = dateSlice(order.date_modified);
      const val       = parseFloat(order.total) || 0;

      // Created (grouped by created date)
      if (['completed', 'cancelled', 'processing'].includes(status) && createdDs) {
        const w = ensureWeek(weekMap, sundayOf(createdDs));
        w.created += val;
        ensureDay(w, createdDs).created += val;
      }

      // Completed (grouped by completed date)
      if (status === 'completed' && compDs) {
        const w = ensureWeek(weekMap, sundayOf(compDs));
        w.completed += val;
        ensureDay(w, compDs).completed += val;
      }

      // Cancelled (grouped by modified date)
      if (status === 'cancelled' && modDs) {
        const w = ensureWeek(weekMap, sundayOf(modDs));
        w.cancelled += val;
        ensureDay(w, modDs).cancelled += val;
      }
    }

    const sorted = Object.values(weekMap).sort((a, b) => b.key.localeCompare(a.key));
    return NextResponse.json(sorted, { headers: { 'Cache-Control': 's-maxage=3600' } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
