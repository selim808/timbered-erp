'use client';

import { useEffect, useMemo, useState } from 'react';

interface TableData { columns: string[]; rows: Record<string, unknown>[]; total: number; limit: number }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2})?/;

/** "cancellation_reasons" → "Cancellation Reasons" */
function pretty(name: string) {
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Read-only display of a cell value. Dates as DD-MMM-YY. */
function show(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'object') return JSON.stringify(v);
  const s = String(v);
  if (ISO_DATE.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const date = `${String(d.getDate()).padStart(2, '0')}-${MONTHS[d.getMonth()]}-${String(d.getFullYear()).slice(2)}`;
      return s.length > 10 ? `${date} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : date;
    }
  }
  return s;
}

// The page's tabs. Each tab is either one list grouped by its parent list,
// or several lists shown one after another as sections.
type Tab =
  | { key: string; label: string; kind: 'grouped'; table: string; parent: string; column: string; parentLabel: string }
  | { key: string; label: string; kind: 'sections'; tables: { table: string; label: string }[] };

const TABS: Tab[] = [
  {
    key: 'cancellation', label: 'Cancellation', kind: 'sections',
    tables: [
      { table: 'cancellation_reasons', label: 'Reasons' },
      { table: 'cancellation_timing', label: 'Timing' },
      { table: 'cancellation_impact', label: 'Impact' },
    ],
  },
  { key: 'expenses', label: 'Expenses', kind: 'grouped', table: 'expense_buckets', parent: 'expense_bucket_groups', column: 'group_id', parentLabel: 'name' },
  { key: 'phases', label: 'Phases', kind: 'grouped', table: 'phases', parent: 'phase_groups', column: 'phase_group_id', parentLabel: 'name' },
];

interface Group { id: string; name: string; columns: string[]; rows: Record<string, unknown>[] }

function readInitialTab(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('t');
}

function loadTable(t: string): Promise<TableData> {
  return fetch(`/api/lists/${encodeURIComponent(t)}`)
    .then(r => r.json())
    .then((d: TableData | { error: string }) => {
      if (!('rows' in d)) throw new Error(d?.error ?? `Failed to load ${t}`);
      return d;
    });
}

// Hide internal ids and the grouping column; keep the rest in table order.
function visibleColumns(cols: string[], hide?: string) {
  return cols.filter(c => c !== 'id' && c !== hide);
}

export default function ListsPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Load one tab's lists. Called from event handlers / effects only.
  function openTab(key: string) {
    const tab = TABS.find(t => t.key === key) ?? TABS[0];
    setSelected(tab.key);
    setSearch('');
    setState('loading');
    const url = new URL(window.location.href);
    url.searchParams.set('t', tab.key);
    window.history.replaceState(null, '', url);

    const work: Promise<Group[]> = tab.kind === 'grouped'
      ? Promise.all([loadTable(tab.table), loadTable(tab.parent)]).then(([d, p]) => {
          const columns = visibleColumns(d.columns, tab.column);
          const list: Group[] = p.rows.map(r => ({
            id: String(r.id), name: String(r[tab.parentLabel] ?? '—'), columns, rows: [],
          }));
          const byId = new Map(list.map(g => [g.id, g]));
          const other: Group = { id: '_other', name: 'Ungrouped', columns, rows: [] };
          d.rows.forEach(r => (byId.get(String(r[tab.column])) ?? other).rows.push(r));
          if (other.rows.length) list.push(other);
          return list;
        })
      : Promise.all(tab.tables.map(s => loadTable(s.table))).then(all =>
          all.map((d, i) => ({
            id: tab.tables[i].table, name: tab.tables[i].label,
            columns: visibleColumns(d.columns), rows: d.rows,
          }))
        );

    work
      .then(g => { setGroups(g); setState('done'); })
      .catch((e: Error) => { setError(e.message); setState('error'); });
  }

  useEffect(() => {
    // Deferred so the first load runs outside the effect body (as a callback).
    queueMicrotask(() => openTab(readInitialTab() ?? TABS[0].key));
  }, []);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map(g => ({ ...g, rows: g.rows.filter(r => g.columns.some(c => show(r[c]).toLowerCase().includes(q))) }))
      .filter(g => g.rows.length);
  }, [groups, search]);

  const total = groups.reduce((n, g) => n + g.rows.length, 0);
  const matched = shown.reduce((n, g) => n + g.rows.length, 0);

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="bg-brown text-white px-4 h-[52px] flex items-center gap-3 sticky top-16 z-10">
        <span className="text-base font-bold flex-1">Lists</span>
        <span className="text-xs opacity-70">View only</span>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-4 space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => openTab(t.key)}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-colors ${
                selected === t.key
                  ? 'bg-brown text-white border-brown'
                  : 'bg-surface text-text border-border hover:border-brown'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {state === 'loading' && <Box>Loading…</Box>}
        {state === 'error' && <Box>Failed to load: {error}</Box>}

        {state === 'done' && (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                className="flex-1 min-w-0 border border-border rounded-md px-3 py-1.5 text-sm bg-background outline-none focus:border-brown"
              />
              <span className="text-xs text-text-muted whitespace-nowrap">
                {search ? `${matched} of ${total}` : total}
              </span>
            </div>

            {shown.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-text-muted">
                {total === 0 ? 'This list is empty.' : 'No matches.'}
              </p>
            ) : (
              <div>
                {shown.map(g => (
                  <details key={g.id} open={!!search} className="border-t border-border first:border-t-0 group">
                    <summary className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none bg-surface-2 hover:bg-cream list-none">
                      <svg className="w-3.5 h-3.5 text-brown transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="text-sm font-bold text-brown flex-1">{g.name}</span>
                      <span className="text-xs text-text-muted">{g.rows.length}</span>
                    </summary>
                    {g.rows.length === 0
                      ? <p className="px-4 py-3 text-xs text-text-muted italic">Nothing in this group.</p>
                      : <DataTable columns={g.columns} rows={g.rows} />}
                  </details>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DataTable({ columns, rows, sticky }: {
  columns: string[]; rows: Record<string, unknown>[]; sticky?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead className={sticky ? 'sticky top-0 bg-surface-2' : 'bg-surface'}>
          <tr>
            <th className="text-left text-[11px] font-bold text-text-muted uppercase tracking-wide px-3 py-2 w-8">#</th>
            {columns.map(c => (
              <th key={c} className="text-left text-[11px] font-bold text-text-muted uppercase tracking-wide px-3 py-2 whitespace-nowrap">
                {pretty(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={String(r.id ?? i)} className="border-t border-border hover:bg-surface-2">
              <td className="px-3 py-2 text-xs text-text-muted">{i + 1}</td>
              {columns.map(c => (
                <td key={c} className="px-3 py-2 text-text whitespace-nowrap max-w-[320px] truncate" title={show(r[c])}>
                  {show(r[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Box({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-xl px-4 py-8 text-center text-sm text-text-muted">
      {children}
    </div>
  );
}
