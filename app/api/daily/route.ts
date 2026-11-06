import { NextResponse } from 'next/server';
import { fetchOrders } from '@/lib/commerce/orders';
import type { CommerceOrder } from '@/lib/commerce/types';
import { getActivePhases } from '@/lib/phases/kanban';
import { fetchAdSpend } from '@/lib/meta';
import { dailySalesTarget } from '@/lib/salesTargets';

export const maxDuration = 60;

const TZ = 'Africa/Cairo';
const DAY_MS = 86_400_000;
const STUCK_DAYS = 7;
const MAX_DAYS_BACK = 60;

// ─── Response shape ─────────────────────────────────────────────────────────

export interface DayTotals { count: number; value: number }

export interface MoveRow {
  orderId: number;
  orderNumber: string;
  customer: string;
  item: string;
  qty: number;
  /** The item's share of its order's value. */
  value: number;
  from: string | null;
  to: string;
  group: string;
  at: string;
  source: string;
}

export interface StuckRow {
  orderId: number;
  orderNumber: string;
  customer: string;
  item: string;
  qty: number;
  value: number;
  phase: string;
  group: string;
  since: string;
  days: number;
}

export interface DailyResponse {
  /** YYYY-MM-DD, Cairo. */
  date: string;
  isToday: boolean;
  /** This month's sales plan ÷ days in the month. */
  target: number;
  placed: DayTotals & { yday: DayTotals };
  completed: DayTotals & { yday: DayTotals };
  cancelled: DayTotals & { yday: DayTotals; reasons: { reason: string; count: number; value: number }[] };
  adSpend: { value: number; yday: number };
  movements: { groups: { group: string; moves: number; value: number }[]; rows: MoveRow[] };
  /** Only for today: items with no phase change for STUCK_DAYS+ days. */
  stuck: { days: number; rows: StuckRow[] };
}

// ─── Cairo calendar days ────────────────────────────────────────────────────

/** Today's date in Cairo, YYYY-MM-DD. */
function cairoToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

/** Cairo's UTC offset (ms) around the given UTC instant. */
function cairoOffsetMs(at: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(at));
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(at / 1000) * 1000;
}

/** [start, end) of a Cairo calendar day as UTC milliseconds. */
function dayBounds(date: string): [number, number] {
  const [y, m, d] = date.split('-').map(Number);
  const midnightUtc = Date.UTC(y, m - 1, d);
  const start = midnightUtc - cairoOffsetMs(midnightUtc + 12 * 3600_000);
  return [start, start + DAY_MS];
}

function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const within = (iso: string | null | undefined, [a, b]: [number, number]) => {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= a && t < b;
};

const totals = (orders: CommerceOrder[]): DayTotals => ({
  count: orders.length,
  value: Math.round(orders.reduce((s, o) => s + (parseFloat(o.total) || 0), 0)),
});

const customerOf = (o: CommerceOrder) => `${o.billing.first_name} ${o.billing.last_name}`.trim();
const numberOf = (o: CommerceOrder) => String(o.number || o.id);
const cancelledAtOf = (o: CommerceOrder) => o.date_cancelled ?? o.date_modified;

/** Each line item's share of the order total (by line value), keyed by line item id. */
function itemShares(o: CommerceOrder): Map<string, { name: string; qty: number; value: number }> {
  const total = parseFloat(o.total) || 0;
  const vals = o.line_items.map(li => parseFloat(li.total) || (li.price || 0) * (li.quantity || 1));
  const sum = vals.reduce((s, v) => s + v, 0);
  const map = new Map<string, { name: string; qty: number; value: number }>();
  o.line_items.forEach((li, i) => {
    const share = sum > 0 ? vals[i] / sum : 1 / o.line_items.length;
    map.set(String(li.id), { name: li.name, qty: li.quantity || 1, value: Math.round(total * share) });
  });
  return map;
}

const SOURCES: Record<string, string> = { auto: 'Auto', erp: 'ERP', 'erp-reassign': 'ERP', shopify: 'Shopify' };

// ─── Handler ────────────────────────────────────────────────────────────────

// GET ?date=YYYY-MM-DD (Cairo; default today): the daily flash report.
export async function GET(req: Request) {
  const today = cairoToday();
  const date = new URL(req.url).searchParams.get('date') ?? today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today || date < shiftDate(today, -MAX_DAYS_BACK)) {
    return NextResponse.json({ error: `Pick a day within the last ${MAX_DAYS_BACK} days` }, { status: 400 });
  }
  const yday = shiftDate(date, -1);
  const day = dayBounds(date);
  const prev = dayBounds(yday);
  const iso = (t: number) => new Date(t).toISOString();

  try {
    const [placedAll, completedRecent, cancelledRecent, processing, phases, spend, spendYday] = await Promise.all([
      // Placed today + yesterday in one go.
      fetchOrders({ after: iso(prev[0]), before: iso(day[1] - 1), lite: true }),
      // Anything completed/cancelled on either day was modified at or after that moment.
      fetchOrders({ status: 'completed', modifiedAfter: iso(prev[0]) }),
      fetchOrders({ status: 'cancelled', modifiedAfter: iso(prev[0]) }),
      fetchOrders({ status: 'processing' }),
      getActivePhases(),
      fetchAdSpend(date, date),
      fetchAdSpend(yday, yday),
    ]);

    // Placed = every order created that day except unpaid web checkouts (Woo "pending").
    const placedOn = (b: [number, number]) => placedAll.filter(o => o.status !== 'pending' && within(o.date_created, b));
    const completedOn = (b: [number, number]) => completedRecent.filter(o => within(o.date_completed, b));
    const cancelledOn = (b: [number, number]) => cancelledRecent.filter(o => within(cancelledAtOf(o), b));

    const cancelledToday = cancelledOn(day);
    const reasons = new Map<string, { reason: string; count: number; value: number }>();
    for (const o of cancelledToday) {
      const reason = o.cancel_reason || 'No reason given';
      const r = reasons.get(reason) ?? { reason, count: 0, value: 0 };
      r.count += 1;
      r.value += Math.round(parseFloat(o.total) || 0);
      reasons.set(reason, r);
    }

    // ── Movements: every kanban history entry dated that day ──
    const groupById = new Map(phases.map(p => [p.id, p.group]));
    const groupByName = new Map(phases.map(p => [p.name.toLowerCase(), p.group]));
    const groupOf = (id: string | null, name: string) =>
      (id && groupById.get(id)) || groupByName.get(name.toLowerCase()) || 'Other';
    const groupOrder = [...new Set(phases.map(p => p.group))];

    const seen = new Set<string>();
    const rows: MoveRow[] = [];
    for (const o of [...processing, ...completedRecent, ...cancelledRecent]) {
      const key = `${o.source}:${o.id}`;
      if (seen.has(key) || !o.kanban) continue;
      seen.add(key);
      const shares = itemShares(o);
      for (const [lineItemId, k] of Object.entries(o.kanban)) {
        const hist = [...(k.history ?? [])].sort((a, b) => a.at.localeCompare(b.at));
        hist.forEach((h, i) => {
          if (!within(h.at, day)) return;
          const li = shares.get(lineItemId);
          rows.push({
            orderId: o.id, orderNumber: numberOf(o), customer: customerOf(o),
            item: li?.name ?? k.title ?? `Item ${lineItemId}`,
            qty: li?.qty ?? 1, value: li?.value ?? 0,
            from: i > 0 ? hist[i - 1].phase : null,
            to: h.phase, group: groupOf(h.phase_id, h.phase),
            at: h.at, source: SOURCES[h.source] ?? h.source,
          });
        });
      }
    }
    rows.sort((a, b) => b.at.localeCompare(a.at));
    const byGroup = new Map<string, { group: string; moves: number; value: number }>();
    for (const r of rows) {
      const g = byGroup.get(r.group) ?? { group: r.group, moves: 0, value: 0 };
      g.moves += 1;
      g.value += r.value;
      byGroup.set(r.group, g);
    }
    const groups = [...byGroup.values()].sort((a, b) =>
      (groupOrder.indexOf(a.group) + 1 || 99) - (groupOrder.indexOf(b.group) + 1 || 99));

    // ── Stuck: items whose phase hasn't changed for STUCK_DAYS+ days (today only) ──
    const isToday = date === today;
    const stuck: StuckRow[] = [];
    if (isToday) {
      const now = Date.now();
      for (const o of processing) {
        const shares = itemShares(o);
        for (const li of o.line_items) {
          const k = o.kanban?.[String(li.id)];
          if (!k?.updated_at) continue;
          const days = Math.floor((now - new Date(k.updated_at).getTime()) / DAY_MS);
          if (days < STUCK_DAYS) continue;
          stuck.push({
            orderId: o.id, orderNumber: numberOf(o), customer: customerOf(o),
            item: li.name, qty: li.quantity || 1, value: shares.get(String(li.id))?.value ?? 0,
            phase: k.phase, group: groupOf(k.phase_id, k.phase), since: k.updated_at, days,
          });
        }
      }
      stuck.sort((a, b) => b.days - a.days);
    }

    const [y, m] = date.split('-').map(Number);
    const body: DailyResponse = {
      date, isToday,
      target: dailySalesTarget(y, m),
      placed:    { ...totals(placedOn(day)),    yday: totals(placedOn(prev)) },
      completed: { ...totals(completedOn(day)), yday: totals(completedOn(prev)) },
      cancelled: {
        ...totals(cancelledToday), yday: totals(cancelledOn(prev)),
        reasons: [...reasons.values()].sort((a, b) => b.value - a.value),
      },
      adSpend: { value: spend, yday: spendYday },
      movements: { groups, rows },
      stuck: { days: STUCK_DAYS, rows: stuck },
    };
    return NextResponse.json(body);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
