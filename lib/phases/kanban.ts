import { createAdminClient } from '@/lib/supabase/admin';
import { shopifyGql } from '@/lib/shopify/client';
import wc from '@/lib/woocommerce/client';

// ─── Kanban phase per order item ────────────────────────────────────────────
// Each Shopify order carries the metafield timbered.kanban_phase (JSON), keyed
// by line item id:
//   { "<lineItemId>": { phase_id, phase, updated_at, history: [{ phase_id, phase, at, source }] } }
// The list of valid phases lives in Supabase (phase_groups + phases).
// Readable copies are pinned on the Shopify order page as text lists:
// timbered.kanban_status (one row per item: "Title → Phase") and
// timbered.kanban_timeline (one row per phase change).
// Every write goes through setItemPhases so validation and history stay in one place.

export interface KanbanHistoryEntry {
  phase_id: string | null;
  phase: string;
  at: string;
  source: string;
}

export interface KanbanItem {
  /** Item name, for the readable summary. */
  title?: string;
  phase_id: string | null;
  phase: string;
  updated_at: string;
  history: KanbanHistoryEntry[];
}

export type KanbanData = Record<string, KanbanItem>;

export interface ActivePhase {
  id: string;
  name: string;
  group: string;
}

const NS = 'timbered';
const KEY = 'kanban_phase';
const SUMMARY_KEY = 'kanban_status';
const HISTORY_KEY = 'kanban_timeline';
const BATCH = 8; // orders per call: 3 metafields each, metafieldsSet takes 25

/**
 * WooCommerce orders keep the same data in order meta ("Custom Fields"):
 * the JSON, plus Status and History as plain text (one line per row).
 */
export const WC_META = {
  phase: 'timbered_kanban_phase',
  status: 'timbered_kanban_status',
  history: 'timbered_kanban_history',
  cancelReason: 'timbered_cancel_reason',
  cancelTiming: 'timbered_cancel_timing',
  cancelImpact: 'timbered_cancel_impact',
} as const;
const WC_BATCH = 100; // Woo batch endpoint limit

export function parseKanban(value: string | null | undefined): KanbanData | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as KanbanData) : null;
  } catch {
    return null;
  }
}

// ─── Phase list (Supabase), cached briefly per server instance ───────────────

let phaseCache: { at: number; phases: ActivePhase[] } | null = null;
const PHASE_TTL_MS = 60_000;

/** Active phases in board order (group order, then phase order). */
export async function getActivePhases(): Promise<ActivePhase[]> {
  if (phaseCache && Date.now() - phaseCache.at < PHASE_TTL_MS) return phaseCache.phases;

  const db = createAdminClient();
  const [{ data: groups, error: gErr }, { data: phases, error: pErr }] = await Promise.all([
    db.from('phase_groups').select('id, name, sort_order').eq('is_active', true),
    db.from('phases').select('id, name, sort_order, phase_group_id').eq('is_active', true),
  ]);
  if (gErr) throw new Error(gErr.message);
  if (pErr) throw new Error(pErr.message);

  const groupById = new Map((groups ?? []).map(g => [g.id as string, g]));
  const list = (phases ?? [])
    .filter(p => groupById.has(p.phase_group_id))
    .sort((a, b) =>
      (groupById.get(a.phase_group_id)!.sort_order - groupById.get(b.phase_group_id)!.sort_order) ||
      (a.sort_order - b.sort_order))
    .map(p => ({ id: p.id as string, name: p.name as string, group: groupById.get(p.phase_group_id)!.name as string }));

  phaseCache = { at: Date.now(), phases: list };
  return list;
}

/** The phase every new item starts in (first phase of the first group). */
export async function getStartPhase(): Promise<ActivePhase | null> {
  return (await getActivePhases())[0] ?? null;
}

// ─── Reading ────────────────────────────────────────────────────────────────

/** Current phase name of one item, or null when it has none yet. */
export function itemPhaseOf(
  order: { kanban?: KanbanData | null },
  lineItemId: number | string,
): { phase: string; updatedAt: string } | null {
  const entry = order.kanban?.[String(lineItemId)];
  return entry ? { phase: entry.phase, updatedAt: entry.updated_at } : null;
}

// ─── Readable summary ───────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** DD-MMM-YY in Cairo time. */
function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Cairo', day: '2-digit', month: 'numeric', year: '2-digit',
  }).formatToParts(d);
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  return `${get('day')}-${MONTHS[Number(get('month')) - 1]}-${get('year')}`;
}

// Shown in Shopify as lists (one row per entry), so nothing hides behind a scrolling box.
const LIST_MAX = 128; // Shopify's limit on values in a list metafield

/** One row per item, e.g. "Swing Climb Set → Paint". */
export function buildSummary(data: KanbanData): string[] {
  return Object.entries(data)
    .map(([id, it]) => `${it.title || `Item ${id}`} → ${it.phase}`)
    .slice(0, LIST_MAX);
}

const SOURCES: Record<string, string> = { auto: 'Auto', erp: 'ERP', 'erp-reassign': 'ERP', shopify: 'Shopify' };

/**
 * One row per phase change, grouped by item, oldest first:
 *   "Swing Climb Set · WA Confirmation · 27-Oct-26 (Auto)"
 *   "Swing Climb Set · Paint · 29-Oct-26 (ERP)"
 * Past the list limit, the newest rows are kept.
 */
export function buildHistory(data: KanbanData): string[] {
  return Object.entries(data)
    .flatMap(([id, it]) => (it.history ?? []).map(h =>
      `${it.title || `Item ${id}`} · ${h.phase} · ${shortDate(h.at)} (${SOURCES[h.source] ?? h.source})`))
    .slice(-LIST_MAX);
}

// ─── Writing ────────────────────────────────────────────────────────────────

interface MetafieldWrite { ownerId: string; data: KanbanData; digest: string | null }

const SET_MUTATION = `
mutation SetKanban($m: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $m) { userErrors { field message code } }
}`;

/** Writes metafields in batches. Returns owner ids whose write was rejected as stale. */
async function writeKanban(writes: MetafieldWrite[]): Promise<Set<string>> {
  const stale = new Set<string>();
  for (let i = 0; i < writes.length; i += BATCH) {
    const chunk = writes.slice(i, i + BATCH);
    // metafieldsSet is atomic, so the readable copies are only saved together with the data.
    const inputs = chunk.flatMap(w => [
      {
        ownerId: w.ownerId,
        namespace: NS,
        key: KEY,
        type: 'json',
        value: JSON.stringify(w.data),
        // null digest = "only create if it doesn't exist yet"
        compareDigest: w.digest,
      },
      {
        ownerId: w.ownerId,
        namespace: NS,
        key: SUMMARY_KEY,
        type: 'list.single_line_text_field',
        value: JSON.stringify(buildSummary(w.data)),
      },
      {
        ownerId: w.ownerId,
        namespace: NS,
        key: HISTORY_KEY,
        type: 'list.single_line_text_field',
        value: JSON.stringify(buildHistory(w.data)),
      },
    ]);
    const res = await shopifyGql<{ metafieldsSet: { userErrors: { field: string[] | null; message: string; code: string }[] } }>(
      SET_MUTATION,
      { m: inputs },
    );
    for (const e of res.metafieldsSet.userErrors) {
      if (e.code !== 'STALE_OBJECT') throw new Error(`Saving phase failed: ${e.message}`);
      const idx = Number(e.field?.[1]);
      if (!Number.isNaN(idx) && inputs[idx]) stale.add(inputs[idx].ownerId);
    }
  }
  return stale;
}

function wooMeta(data: KanbanData) {
  return [
    { key: WC_META.phase, value: JSON.stringify(data) },
    { key: WC_META.status, value: buildSummary(data).join('\n') },
    { key: WC_META.history, value: buildHistory(data).join('\n') },
  ];
}

/** Saves kanban meta on Woo orders. Woo has no version check, so callers re-read just before writing. */
async function writeWooKanban(writes: { id: number | string; data: KanbanData }[]): Promise<void> {
  for (let i = 0; i < writes.length; i += WC_BATCH) {
    const chunk = writes.slice(i, i + WC_BATCH);
    await wc.post('/orders/batch', {
      update: chunk.map(w => ({ id: Number(w.id), meta_data: wooMeta(w.data) })),
    });
  }
}

function applyPhase(
  data: KanbanData, lineItemId: string, phase: ActivePhase, at: string, source: string, title?: string,
): boolean {
  const cur = data[lineItemId];
  if (cur && cur.phase_id === phase.id) {
    if (title && !cur.title) { cur.title = title; return true; }
    return false;
  }
  const entry = { phase_id: phase.id, phase: phase.name, at, source };
  data[lineItemId] = {
    title: title || cur?.title,
    phase_id: phase.id,
    phase: phase.name,
    updated_at: at,
    history: [...(cur?.history ?? []), entry],
  };
  return true;
}

/**
 * Gives every item with no phase yet the start phase. Call with freshly
 * fetched orders (Shopify and Woo). Mutates order.kanban so the caller can
 * render the result straight away.
 */
export async function seedMissingPhases(
  orders: {
    source: string; id: number; gid: string | null;
    kanban?: KanbanData | null; kanban_digest?: string | null; kanban_summary?: string | null; kanban_history?: string | null;
    line_items: { id: number; name: string }[];
  }[],
): Promise<void> {
  const start = await getStartPhase();
  if (!start) return;
  const at = new Date().toISOString();

  const writes: MetafieldWrite[] = [];
  const wooWrites: { id: number; data: KanbanData }[] = [];
  for (const o of orders) {
    const isWoo = o.source === 'wc';
    if (!isWoo && !o.gid) continue;
    const data: KanbanData = JSON.parse(JSON.stringify(o.kanban ?? {}));
    // Also rewrite when a readable copy is missing (orders saved before it existed).
    let changed = !!o.kanban && (!o.kanban_summary || !o.kanban_history);
    for (const li of o.line_items) {
      const key = String(li.id);
      if (!data[key]) changed = applyPhase(data, key, start, at, 'auto', li.name) || changed;
      else if (!data[key].title) { data[key].title = li.name; changed = true; }
    }
    // Rewrite when the readable Status is out of date (e.g. after a format change).
    const expected = isWoo ? buildSummary(data).join('\n') : JSON.stringify(buildSummary(data));
    if (o.kanban && o.kanban_summary !== expected) changed = true;
    if (changed) {
      if (isWoo) wooWrites.push({ id: o.id, data });
      else writes.push({ ownerId: o.gid!, data, digest: o.kanban_digest ?? null });
      o.kanban = data;
    }
  }
  if (writes.length) await writeKanban(writes); // a stale write means someone else just saved; leave theirs
  if (wooWrites.length) await writeWooKanban(wooWrites);
}

const READ_ONE = `
query OrderKanban($q: String!) {
  orders(first: 1, query: $q) {
    nodes {
      id
      kanban: metafield(namespace: "timbered", key: "kanban_phase") { value compareDigest }
      lineItems(first: 100) { nodes { id title } }
    }
  }
}`;

interface ReadOne { orders: { nodes: { id: string; kanban: { value: string; compareDigest: string } | null; lineItems: { nodes: { id: string; title: string }[] } }[] } }

export interface PhaseUpdate {
  /** Order number as the ERP shows it (Shopify "#1234" without the #). */
  orderNumber: string | number;
  lineItemId: string | number;
  /** Phase name or id from Supabase. */
  phase: string;
}

/**
 * Moves items to a phase, adding history. Validates against the Supabase
 * phase list. Retries an order up to 3 times if someone else saved meanwhile.
 */
export async function setItemPhases(updates: PhaseUpdate[], source = 'erp'): Promise<void> {
  const phases = await getActivePhases();
  const byKey = new Map<string, ActivePhase>();
  phases.forEach(p => { byKey.set(p.id, p); byKey.set(p.name.toLowerCase(), p); });

  const perOrder = new Map<string, { lineItemId: string; phase: ActivePhase }[]>();
  for (const u of updates) {
    const phase = byKey.get(u.phase) ?? byKey.get(String(u.phase).toLowerCase());
    if (!phase) throw new Error(`Unknown phase: ${u.phase}`);
    const num = String(u.orderNumber).replace('#', '');
    perOrder.set(num, [...(perOrder.get(num) ?? []), { lineItemId: String(u.lineItemId), phase }]);
  }

  for (const [num, items] of perOrder) {
    for (let attempt = 1; ; attempt++) {
      const res = await shopifyGql<ReadOne>(READ_ONE, { q: `name:${num}` }).catch(() => null);
      const order = res?.orders.nodes[0];
      if (!order) { await setWooItemPhases(num, items, source); break; }

      const titles = new Map(order.lineItems.nodes.map(n => [n.id.split('/').pop()!, n.title]));
      const data: KanbanData = parseKanban(order.kanban?.value) ?? {};
      const at = new Date().toISOString();
      let changed = false;
      for (const it of items) {
        if (!titles.has(it.lineItemId)) throw new Error(`Item ${it.lineItemId} is not on order ${num}`);
        changed = applyPhase(data, it.lineItemId, it.phase, at, source, titles.get(it.lineItemId)) || changed;
      }
      if (!changed) break;

      const stale = await writeKanban([{ ownerId: order.id, data, digest: order.kanban?.compareDigest ?? null }]);
      if (!stale.size) break;
      if (attempt >= 3) throw new Error(`Order ${num} kept changing while saving; try again`);
    }
  }
}

/** Woo version of a phase change: same data and rules, stored in order meta. */
async function setWooItemPhases(
  num: string, items: { lineItemId: string; phase: ActivePhase }[], source: string,
): Promise<void> {
  let order: { id: number; line_items?: { id: number; name: string }[]; meta_data?: { key: string; value: unknown }[] };
  try {
    ({ data: order } = await wc.get(`/orders/${num}`));
  } catch {
    throw new Error(`Order ${num} was not found on Shopify or WooCommerce`);
  }
  const titles = new Map((order.line_items ?? []).map(li => [String(li.id), li.name]));
  const raw = order.meta_data?.find(m => m.key === WC_META.phase)?.value;
  const data: KanbanData = parseKanban(typeof raw === 'string' ? raw : null) ?? {};
  const at = new Date().toISOString();
  let changed = false;
  for (const it of items) {
    if (!titles.has(it.lineItemId)) throw new Error(`Item ${it.lineItemId} is not on order ${num}`);
    changed = applyPhase(data, it.lineItemId, it.phase, at, source, titles.get(it.lineItemId)) || changed;
  }
  if (changed) await wc.put(`/orders/${order.id}`, { meta_data: wooMeta(data) });
}
