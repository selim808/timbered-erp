// Sync Firebase stockcount → Supabase
// Run with: node scripts/sync-stockcount.mjs

const FS_KEY  = 'AIzaSyBXREsAkKX25cK5t5EiCrPpGv4zSaBMOgg';
const FS_BASE = 'https://firestore.googleapis.com/v1/projects/timbered-dashboard/databases/(default)/documents';

const SUPABASE_URL     = 'https://wpmeajpzlzdxrahgubxl.supabase.co';
const SUPABASE_SRV_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwbWVhanB6bHpkeHJhaGd1YnhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODE1NzU5NCwiZXhwIjoyMDkzNzMzNTk0fQ.IZR6Giv4tV0fMiYHqxSiZTjw4mTEgtYSxOjGivdlSHE';

// ── 1. Fetch all docs from Firebase (paginated) ───────────────────
async function fetchAllDocs() {
  const docs = [];
  let pageToken = null;

  do {
    const url = new URL(`${FS_BASE}/stockcount`);
    url.searchParams.set('key', FS_KEY);
    url.searchParams.set('pageSize', '300');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Firebase error: ${res.status} ${await res.text()}`);
    const data = await res.json();

    if (data.documents) docs.push(...data.documents);
    pageToken = data.nextPageToken ?? null;
    if (pageToken) console.log(`  fetched ${docs.length} so far, loading next page…`);
  } while (pageToken);

  return docs;
}

console.log('Fetching stockcount from Firebase…');
const fbDocs = await fetchAllDocs();

if (!fbDocs.length) {
  console.log('No documents found.');
  process.exit(0);
}

console.log(`Found ${fbDocs.length} documents.`);

// ── 2. Transform ─────────────────────────────────────────────────
const rows = fbDocs.map(doc => ({
  product_id: parseInt(doc.fields.product_id?.integerValue ?? doc.name.split('/').pop(), 10),
  stock:      parseInt(doc.fields.stock?.integerValue      ?? '0', 10),
  defected:   parseInt(doc.fields.defected?.integerValue   ?? '0', 10),
  updated_at: doc.fields.updated_at?.stringValue ?? doc.updateTime,
}));

// ── 3. Upsert into Supabase in batches ───────────────────────────
const BATCH = 500;
let inserted = 0;

for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/stockcount`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${SUPABASE_SRV_KEY}`,
      'apikey':        SUPABASE_SRV_KEY,
      'Prefer':        'resolution=merge-duplicates',
    },
    body: JSON.stringify(batch),
  });

  if (!res.ok) throw new Error(`Supabase error ${res.status}: ${await res.text()}`);
  inserted += batch.length;
  console.log(`  upserted ${inserted}/${rows.length}`);
}

console.log(`\n✓ Done — ${rows.length} stockcount rows synced to Supabase.`);
