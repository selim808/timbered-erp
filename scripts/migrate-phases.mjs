// One-time migration: Firebase phase_groups → Supabase
// Run with: node scripts/migrate-phases.mjs

const FS_KEY  = 'AIzaSyBXREsAkKX25cK5t5EiCrPpGv4zSaBMOgg';
const FS_BASE = 'https://firestore.googleapis.com/v1/projects/timbered-dashboard/databases/(default)/documents';

const SUPABASE_URL      = 'https://wpmeajpzlzdxrahgubxl.supabase.co';
const SUPABASE_SRV_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwbWVhanB6bHpkeHJhaGd1YnhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODE1NzU5NCwiZXhwIjoyMDkzNzMzNTk0fQ.IZR6Giv4tV0fMiYHqxSiZTjw4mTEgtYSxOjGivdlSHE';

// ── 1. Fetch from Firebase ────────────────────────────────────────
console.log('Fetching phase_groups from Firebase…');
const fbRes = await fetch(`${FS_BASE}/phase_groups?key=${FS_KEY}&pageSize=100`);
if (!fbRes.ok) throw new Error(`Firebase error: ${fbRes.status} ${await fbRes.text()}`);
const fbData = await fbRes.json();

if (!fbData.documents?.length) {
  console.log('No documents found in Firebase phase_groups collection.');
  process.exit(0);
}

console.log(`Found ${fbData.documents.length} groups in Firebase.`);

// ── 2. Transform ─────────────────────────────────────────────────
const rows = fbData.documents.map(doc => ({
  id:         doc.name.split('/').pop(),
  label:      doc.fields.label?.stringValue  ?? '',
  color:      doc.fields.color?.stringValue  ?? '#ccc',
  sort_order: parseInt(doc.fields.order?.integerValue ?? '0', 10),
  phases:     (doc.fields.phases?.arrayValue?.values ?? []).map(v => v.stringValue),
})).sort((a, b) => a.sort_order - b.sort_order);

console.log('\nGroups to insert:');
rows.forEach(r => console.log(`  [${r.sort_order}] ${r.id} — "${r.label}" (${r.phases.length} phases)`));

// ── 3. Upsert into Supabase ───────────────────────────────────────
console.log('\nUpserting into Supabase…');
const sbRes = await fetch(
  `${SUPABASE_URL}/rest/v1/phase_groups`,
  {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${SUPABASE_SRV_KEY}`,
      'apikey':        SUPABASE_SRV_KEY,
      'Prefer':        'resolution=merge-duplicates',
    },
    body: JSON.stringify(rows),
  }
);

if (!sbRes.ok) {
  const err = await sbRes.text();
  throw new Error(`Supabase error ${sbRes.status}: ${err}`);
}

console.log(`\n✓ Done — ${rows.length} groups inserted/updated in Supabase.`);
