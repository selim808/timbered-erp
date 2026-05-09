// Run with: node --env-file=.env.local scripts/seed-phases.mjs

const WC_BASE   = process.env.WC_BASE_URL;
const WC_KEY    = process.env.WC_CONSUMER_KEY;
const WC_SECRET = process.env.WC_CONSUMER_SECRET;
const SB_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_SRV    = process.env.SUPABASE_SERVICE_ROLE_KEY;

const WC_AUTH = 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64');

async function wcGet(path) {
  const res = await fetch(`${WC_BASE}${path}`, {
    headers: { Authorization: WC_AUTH },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`WC ${res.status} ${path}`);
  return res.json();
}

async function sbUpsert(rows) {
  const res = await fetch(`${SB_URL}/rest/v1/order_phases`, {
    method: 'POST',
    headers: {
      apikey: SB_SRV,
      Authorization: `Bearer ${SB_SRV}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase ${res.status}: ${body}`);
  }
}

// code = "{order_number}.{item_seq_1based}"
const RAW = [
  { code: '19197.1', phase: 'WH-No_Response' },
  { code: '19202.1', phase: 'Not available in WH' },
  { code: '19219.1', phase: 'WH-Ready' },
  { code: '19226.1', phase: 'WH-No_Response' },
  { code: '19248.1', phase: 'Assemble' },
  { code: '19261.1', phase: 'WH-No_Response' },
  { code: '19264.1', phase: 'Delivered Partially' },
  { code: '19264.2', phase: 'Delivered Partially' },
  { code: '19264.3', phase: 'Assemble' },
  { code: '19269.1', phase: 'WH-No_Response' },
  { code: '19269.2', phase: 'WH-No_Response' },
  { code: '19282.1', phase: 'WH-No_Response' },
  { code: '19293.1', phase: 'Cutting' },
  { code: '19308.1', phase: 'Assemble' },
  { code: '19325.1', phase: 'WH-No_Response' },
  { code: '19353.1', phase: 'WH-No_Response' },
  { code: '19355.1', phase: 'WH-No_Response' },
  { code: '19356.1', phase: 'Ready to Ship' },
  { code: '19370.1', phase: 'Assemble' },
  { code: '19380.1', phase: 'Paint' },
  { code: '19388.1', phase: 'WH-Postponed' },
  { code: '19388.2', phase: 'WH-Postponed' },
  { code: '19388.3', phase: 'WH-Postponed' },
  { code: '19388.4', phase: 'WH-Postponed' },
  { code: '19392.1', phase: 'WH-No_Response' },
  { code: '19394.1', phase: 'Assemble' },
  { code: '19395.1', phase: 'WH-No_Response' },
  { code: '19396.1', phase: 'WH-No_Response' },
  { code: '19399.1', phase: 'Paint' },
  { code: '19405.1', phase: 'Assemble' },
  { code: '19405.2', phase: 'Delivered Partially' },
  { code: '19405.3', phase: 'Delivered Partially' },
  { code: '19416.1', phase: 'Ready to Ship' },
  { code: '19424.1', phase: 'WH-No_Response' },
  { code: '19427.1', phase: 'WH-No_Response' },
  { code: '19436.1', phase: 'Cutting' },
  { code: '19439.1', phase: 'WH-Ready' },
  { code: '19451.1', phase: 'Delivered Partially' },
  { code: '19451.2', phase: 'Assemble' },
  { code: '19458.1', phase: 'CNC' },
  { code: '19471.1', phase: 'Delivered Partially' },
  { code: '19471.2', phase: 'Assemble' },
  { code: '19472.1', phase: 'WH-No_Response' },
  { code: '19478.1', phase: 'WH-Postponed' },
  { code: '19488.1', phase: 'Assemble' },
  { code: '19490.1', phase: 'WH-Returned' },
  { code: '19490.2', phase: 'WH-Returned' },
  { code: '19492.1', phase: 'CNC' },
  { code: '19498.1', phase: 'CNC' },
  { code: '19500.1', phase: 'CNC' },
  { code: '19506.1', phase: 'Check Inventory' },
  { code: '19506.2', phase: 'Check Inventory' },
  { code: '19508.1', phase: 'CNC' },
  { code: '19530.1', phase: 'Assemble' },
  { code: '19535.1', phase: 'WH-No_Response' },
  { code: '19543.1', phase: 'Assemble' },
  { code: '19547.1', phase: 'Assemble' },
  { code: '19549.1', phase: 'Assemble' },
  { code: '19552.1', phase: 'Cutting' },
  { code: '19556.1', phase: 'Assemble' },
  { code: '19558.1', phase: 'Ready to Ship' },
  { code: '19562.1', phase: 'Assemble' },
  { code: '19572.1', phase: 'Assemble' },
  { code: '19573.1', phase: 'Cutting' },
  { code: '19574.1', phase: 'Delivered Partially' },
  { code: '19574.2', phase: 'Delivered Partially' },
  { code: '19574.3', phase: 'Assemble' },
  { code: '19585.1', phase: 'CNC' },
  { code: '19593.1', phase: 'Paint' },
  { code: '19605.1', phase: 'DLV-Bareed-Cairo' },
  { code: '19611.1', phase: 'Assemble' },
  { code: '19624.1', phase: 'Paint' },
  { code: '19626.1', phase: 'CNC' },
  { code: '19631.1', phase: 'Paint' },
  { code: '19633.1', phase: 'Delivered Partially' },
  { code: '19647.1', phase: 'Cutting' },
  { code: '19647.2', phase: 'CNC' },
  { code: '19648.1', phase: 'Paint' },
  { code: '19651.1', phase: 'Not available in WH' },
  { code: '19652.1', phase: 'Paint' },
  { code: '19652.2', phase: 'Cutting' },
  { code: '19655.1', phase: 'WH-Ready' },
  { code: '19655.2', phase: 'Assemble' },
  { code: '19658.1', phase: 'Not available in WH' },
  { code: '19661.1', phase: 'Not available in WH' },
  { code: '19665.1', phase: 'Not available in WH' },
  { code: '19668.1', phase: 'Ready to Ship' },
  { code: '19670.1', phase: 'Not available in WH' },
  { code: '19670.2', phase: 'WH-Ready' },
  { code: '19673.1', phase: 'Cutting' },
  { code: '19676.1', phase: 'Not available in WH' },
  { code: '19680.1', phase: 'Assemble' },
  { code: '19684.1', phase: 'CNC' },
  { code: '19691.1', phase: 'Not available in WH' },
  { code: '19693.1', phase: 'WH-Ready' },
  { code: '19694.1', phase: 'WH-Ready' },
  { code: '19696.1', phase: 'Cutting' },
  { code: '19698.1', phase: 'Ready to Ship' },
  { code: '19699.1', phase: 'DLV-Bareed-Cairo' },
  { code: '19701.1', phase: 'DLV-Bareed-Cairo' },
  { code: '19703.1', phase: 'Not available in WH' },
  { code: '19704.1', phase: 'Ready to Ship' },
  { code: '20247.1', phase: 'Sent to WH' },
  { code: '20248.1', phase: 'Sent to WH' },
];

// Group by order number
const byOrder = new Map();
for (const item of RAW) {
  const dot = item.code.lastIndexOf('.');
  const orderNum = item.code.slice(0, dot);
  const seq = parseInt(item.code.slice(dot + 1), 10);
  if (!byOrder.has(orderNum)) byOrder.set(orderNum, []);
  byOrder.get(orderNum).push({ seq, phase: item.phase, code: item.code });
}

console.log(`Processing ${RAW.length} items across ${byOrder.size} orders...\n`);

const upserts = [];
const errors = [];
let fetched = 0;

for (const [orderNum, items] of byOrder) {
  try {
    const order = await wcGet(`/orders/${orderNum}`);
    fetched++;

    for (const item of items) {
      const li = order.line_items?.[item.seq - 1];
      if (!li) {
        const msg = `${item.code}: order has ${order.line_items?.length ?? 0} line items, wanted index ${item.seq - 1}`;
        console.warn('  WARN', msg);
        errors.push(msg);
        continue;
      }
      upserts.push({
        order_id: String(order.id),
        line_item_id: String(li.id),
        phase: item.phase,
        item_name: li.name,
        total: Math.round(parseFloat(li.total ?? '0')),
        updated_at: new Date().toISOString(),
      });
    }

    if (fetched % 10 === 0) console.log(`  [${fetched}/${byOrder.size}] orders fetched`);
  } catch (err) {
    const msg = `order ${orderNum}: ${err.message}`;
    console.warn('  ERR ', msg);
    errors.push(msg);
  }
}

console.log(`\nBuilt ${upserts.length} upsert rows from ${fetched}/${byOrder.size} orders`);

if (upserts.length === 0) {
  console.error('Nothing to upsert');
  process.exit(1);
}

await sbUpsert(upserts);
console.log(`\nDone. Seeded ${upserts.length} phase records.`);

if (errors.length) {
  console.log(`\nSkipped (${errors.length}):`);
  errors.forEach(e => console.log('  -', e));
}
