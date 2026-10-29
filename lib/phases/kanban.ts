import { createAdminClient } from '@/lib/supabase/admin';
import { shopifyGql } from '@/lib/shopify/client';

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
 * fetched Shopify orders; Woo orders are skipped. Mutates order.kanban so the
 * caller can render the result straight away.
 */
export async function seedMissingPhases(
  orders: {
    gid: string | null; kanban?: KanbanData | null; kanban_digest?: string | null; kanban_summary?: string | null; kanban_history?: string | null;
    line_items: { id: number; name: string }[];
  }[],
): Promise<void> {
  const start = await getStartPhase();
  if (!start) return;
  const at = new Date().toISOString();

  const writes: MetafieldWrite[] = [];
  for (const o of orders) {
    if (!o.gid) continue;
    const data: KanbanData = JSON.parse(JSON.stringify(o.kanban ?? {}));
    // Also rewrite when a readable copy is missing (orders saved before it existed).
    let changed = !!o.kanban && (!o.kanban_summary || !o.kanban_history);
    for (const li of o.line_items) {
      const key = String(li.id);
      if (!data[key]) changed = applyPhase(data, key, start, at, 'auto', li.name) || changed;
      else if (!data[key].title) { data[key].title = li.name; changed = true; }
    }
    // Rewrite when the readable Status is out of date (e.g. after a format change).
    if (o.kanban && o.kanban_summary !== JSON.stringify(buildSummary(data))) changed = true;
    if (changed) {
      writes.push({ ownerId: o.gid, data, digest: o.kanban_digest ?? null });
      o.kanban = data;
    }
  }
  if (writes.length) await writeKanban(writes); // a stale write means someone else just saved; leave theirs
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
      const res = await shopifyGql<ReadOne>(READ_ONE, { q: `name:${num}` });
      const order = res.orders.nodes[0];
      if (!order) throw new Error(`Order ${num} is not a Shopify order (phases are stored on Shopify orders only)`);

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
