import { createAdminClient } from '@/lib/supabase/admin';
import { readFileSync } from 'fs';
import { join } from 'path';
import MigrationPanel from './MigrationPanel';

const TABLES = [
  'profiles',
  'orders',
  'order_status_history',
  'products',
  'production_cards',
  'warehouse_items',
  'stock_receivings',
  'customers',
] as const;

async function getTableStatus() {
  const supabase = createAdminClient();
  const results = await Promise.all(
    TABLES.map(async (table) => {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      return { table, exists: !error, count: count ?? 0 };
    })
  );
  return results;
}

function getMigrationSQL() {
  try {
    return readFileSync(
      join(process.cwd(), 'supabase/migrations/001_initial_schema.sql'),
      'utf-8'
    );
  } catch {
    return null;
  }
}

export default async function DatabasePage() {
  const [tableStatus, migrationSQL] = await Promise.all([
    getTableStatus(),
    Promise.resolve(getMigrationSQL()),
  ]);

  const allReady = tableStatus.every((t) => t.exists);
  const readyCount = tableStatus.filter((t) => t.exists).length;

  return (
    <div className="min-h-screen bg-cream p-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="font-serif text-2xl text-brown">Database Config</h1>
          <p className="text-text-muted text-sm mt-1">
            Supabase schema status for timbered-erp
          </p>
        </div>

        {/* Connection status */}
        <div className="bg-surface border-2 border-border rounded-2xl p-5 flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${allReady ? 'bg-success' : 'bg-gold'}`} />
          <div>
            <p className="font-semibold text-text text-sm">
              {allReady ? 'All tables ready' : `${readyCount} / ${TABLES.length} tables found`}
            </p>
            <p className="text-text-muted text-xs">{process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
          </div>
        </div>

        {/* Table status grid */}
        <div className="bg-surface border-2 border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <p className="font-semibold text-text text-sm">Tables</p>
          </div>
          <div className="divide-y divide-border">
            {tableStatus.map(({ table, exists, count }) => (
              <div key={table} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${exists ? 'bg-success' : 'bg-danger'}`} />
                  <span className="text-sm font-medium text-text">{table}</span>
                </div>
                <span className="text-xs text-text-muted">
                  {exists ? `${count} rows` : 'missing'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Migration panel */}
        {migrationSQL && (
          <MigrationPanel sql={migrationSQL} allReady={allReady} />
        )}

      </div>
    </div>
  );
}
