import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';

// ─── Kanban Phase panel (Shopify admin › order page) ─────────────────────────
// Shows each item of the order with its current phase, lets staff change it,
// and shows the full history. Same data and rules as the Timbered ERP:
//   • phase list: Supabase (phase_groups + phases), read with the public key
//   • data: order metafield timbered.kanban_phase (JSON keyed by line item id)
//   • readable copies: timbered.kanban_status / timbered.kanban_timeline (lists)
// Writes use compareDigest so a change made elsewhere is never overwritten.

const SUPABASE_URL = 'https://wpmeajpzlzdxrahgubxl.supabase.co';
// Publishable key: read-only access to the active phase list. Safe to ship.
const SUPABASE_KEY = 'sb_publishable_fRSoij2wIPYaqi34bHRbyg_SSYlMG3b';

const NS = 'timbered';
const SOURCE = 'shopify';
const LIST_MAX = 128;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SOURCES = { auto: 'Auto', erp: 'ERP', 'erp-reassign': 'ERP', shopify: 'Shopify' };
const GROUP_TONES = {
  confirmation: 'info',
  planning: 'caution',
  production: 'info',
  warehouse: 'warning',
  delivery: 'success',
  'after-sales': 'critical',
};

export default async () => {
  render(<Extension />, document.body);
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/** DD-MMM-YY in Cairo time. */
function shortDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Cairo', day: '2-digit', month: 'numeric', year: '2-digit',
  }).formatToParts(d);
  const get = (t) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('day')}-${MONTHS[Number(get('month')) - 1]}-${get('year')}`;
}

const numId = (gid) => String(gid).split('/').pop();
const sourceLabel = (s) => SOURCES[s] ?? s;

function parseKanban(value) {
  if (!value) return {};
  try {
    const v = JSON.parse(value);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

function buildStatus(data) {
  return Object.entries(data)
    .map(([id, it]) => `${it.title || `Item ${id}`} → ${it.phase} (${shortDate(it.updated_at)})`)
    .slice(0, LIST_MAX);
}

function buildTimeline(data) {
  return Object.entries(data)
    .flatMap(([id, it]) => (it.history ?? []).map((h) =>
      `${it.title || `Item ${id}`} · ${h.phase} · ${shortDate(h.at)} (${sourceLabel(h.source)})`))
    .slice(-LIST_MAX);
}

async function loadPhases() {
  const get = (path) =>
    fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: SUPABASE_KEY } }).then((r) => {
      if (!r.ok) throw new Error(`Could not load phases (${r.status})`);
      return r.json();
    });
  const [groups, phases] = await Promise.all([
    get('phase_groups?select=id,name,sort_order&is_active=eq.true&order=sort_order'),
    get('phases?select=id,name,sort_order,phase_group_id&is_active=eq.true&order=sort_order'),
  ]);
  return groups.map((g) => ({
    ...g,
    phases: phases.filter((p) => p.phase_group_id === g.id),
  }));
}

const ORDER_QUERY = `#graphql
query KanbanOrder($id: ID!) {
  order(id: $id) {
    id
    lineItems(first: 100) { nodes { id title quantity } }
    kanban: metafield(namespace: "timbered", key: "kanban_phase") { value compareDigest }
  }
}`;

const SET_MUTATION = `#graphql
mutation SetKanban($m: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $m) { userErrors { field message code } }
}`;

async function loadOrder(orderId) {
  const res = await shopify.query(ORDER_QUERY, { variables: { id: orderId } });
  if (res.errors?.length) throw new Error(res.errors[0].message);
  return res.data.order;
}

/** Moves one item to a phase, adding history. Retries if the order changed meanwhile. */
async function savePhase(orderId, lineItemId, title, phase) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const order = await loadOrder(orderId);
    const data = parseKanban(order.kanban?.value);
    const cur = data[lineItemId];
    if (cur && cur.phase_id === phase.id) return data;

    const at = new Date().toISOString();
    data[lineItemId] = {
      title: cur?.title || title,
      phase_id: phase.id,
      phase: phase.name,
      updated_at: at,
      history: [...(cur?.history ?? []), { phase_id: phase.id, phase: phase.name, at, source: SOURCE }],
    };

    const res = await shopify.query(SET_MUTATION, {
      variables: {
        m: [
          {
            ownerId: orderId, namespace: NS, key: 'kanban_phase', type: 'json',
            value: JSON.stringify(data), compareDigest: order.kanban?.compareDigest ?? null,
          },
          {
            ownerId: orderId, namespace: NS, key: 'kanban_status', type: 'list.single_line_text_field',
            value: JSON.stringify(buildStatus(data)),
          },
          {
            ownerId: orderId, namespace: NS, key: 'kanban_timeline', type: 'list.single_line_text_field',
            value: JSON.stringify(buildTimeline(data)),
          },
        ],
      },
    });
    if (res.errors?.length) throw new Error(res.errors[0].message);
    const errs = res.data.metafieldsSet.userErrors;
    if (!errs.length) return data;
    if (!errs.every((e) => e.code === 'STALE_OBJECT')) throw new Error(errs[0].message);
  }
  throw new Error('This order kept changing while saving. Try again.');
}

// ─── UI ─────────────────────────────────────────────────────────────────────

function Extension() {
  const orderId = shopify.data.selected?.[0]?.id;
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [groups, setGroups] = useState([]);
  const [items, setItems] = useState([]);
  const [data, setData] = useState({});
  const [saving, setSaving] = useState('');
  const [openHistory, setOpenHistory] = useState('');

  useEffect(() => {
    Promise.all([loadPhases(), loadOrder(orderId)])
      .then(([g, order]) => {
        setGroups(g);
        setItems(order.lineItems.nodes.map((n) => ({ id: numId(n.id), title: n.title, quantity: n.quantity })));
        setData(parseKanban(order.kanban?.value));
        setState('ready');
      })
      .catch((e) => { setError(e.message); setState('error'); });
  }, [orderId]);

  const phaseById = new Map();
  const groupOf = new Map();
  groups.forEach((g) => g.phases.forEach((p) => { phaseById.set(p.id, p); groupOf.set(p.id, g); }));

  async function onChange(item, phaseId) {
    const phase = phaseById.get(phaseId);
    if (!phase) return;
    setSaving(item.id);
    setError('');
    try {
      setData(await savePhase(orderId, item.id, item.title, phase));
      try { shopify.toast?.show(`${item.title} → ${phase.name}`); } catch { /* toast not available here */ }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving('');
    }
  }

  if (state === 'loading') {
    return (
      <s-admin-block heading="Kanban Phase">
        <s-stack direction="inline" gap="small-200">
          <s-spinner accessibilityLabel="Loading phases" />
          <s-text color="subdued">Loading…</s-text>
        </s-stack>
      </s-admin-block>
    );
  }

  if (state === 'error') {
    return (
      <s-admin-block heading="Kanban Phase">
        <s-banner tone="critical">{error}</s-banner>
      </s-admin-block>
    );
  }

  const summary = items.length === 1 && data[items[0].id]
    ? data[items[0].id].phase
    : `${items.length} items`;

  return (
    <s-admin-block heading="Kanban Phase" collapsedSummary={summary}>
      <s-stack gap="base">
        {error && <s-banner tone="critical">{error}</s-banner>}

        {items.map((item, i) => {
          const entry = data[item.id];
          const group = entry ? groupOf.get(entry.phase_id) : null;
          const history = entry?.history ?? [];
          const showHistory = openHistory === item.id;

          return (
            <s-stack key={item.id} gap="small-200">
              {i > 0 && <s-divider />}

              <s-stack direction="inline" gap="small-200" alignItems="center">
                <s-text type="strong">{item.title}</s-text>
                {item.quantity > 1 && <s-text color="subdued">×{item.quantity}</s-text>}
              </s-stack>

              <s-stack direction="inline" gap="small-200" alignItems="center">
                {entry ? (
                  <s-badge tone={GROUP_TONES[group?.name?.toLowerCase()] ?? 'auto'}>
                    {group ? `${group.name} · ` : ''}{entry.phase}
                  </s-badge>
                ) : (
                  <s-badge>No phase yet</s-badge>
                )}
                {entry && <s-text color="subdued">since {shortDate(entry.updated_at)}</s-text>}
              </s-stack>

              <s-select
                label="Change phase"
                labelAccessibilityVisibility="exclusive"
                placeholder="Select a phase"
                value={entry?.phase_id ?? ''}
                disabled={saving === item.id}
                onChange={(e) => onChange(item, e.currentTarget.value)}
              >
                {groups.map((g) => (
                  <s-option-group key={g.id} label={g.name}>
                    {g.phases.map((p) => (
                      <s-option key={p.id} value={p.id}>{p.name}</s-option>
                    ))}
                  </s-option-group>
                ))}
              </s-select>

              {history.length > 0 && (
                <s-button
                  variant="tertiary"
                  onClick={() => setOpenHistory(showHistory ? '' : item.id)}
                >
                  {showHistory ? 'Hide history' : `History (${history.length})`}
                </s-button>
              )}

              {showHistory && (
                <s-unordered-list>
                  {[...history].reverse().map((h, idx) => (
                    <s-list-item key={idx}>
                      {h.phase} · {shortDate(h.at)} · {sourceLabel(h.source)}
                    </s-list-item>
                  ))}
                </s-unordered-list>
              )}
            </s-stack>
          );
        })}

        {saving && <s-text color="subdued">Saving…</s-text>}
      </s-stack>
    </s-admin-block>
  );
}
