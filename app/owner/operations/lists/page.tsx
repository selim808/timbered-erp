'use client';

import { useEffect, useMemo, useState } from 'react';

interface TableInfo { name: string; columns: string[] }
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

// Tables shown as collapsible sections, grouped by a parent list.
const GROUP_BY: Record<string, { column: string; table: string; label: string }> = {
  phases: { column: 'phase_group_id', table: 'phase_groups', label: 'name' },
};

interface Group { id: string; name: string; rows: Record<string, unknown>[] }

function readInitialTable(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('t');
}

export default function ListsPage() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [tablesState, setTablesState] = useState<'loading' | 'done' | 'error'>('loading');
  const [selected, setSelected] = useState<string | null>(null);
  const [data, setData] = useState<TableData | null>(null);
  const [dataState, setDataState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [parents, setParents] = useState<Record<string, unknown>[]>([]);

  // Load one table's rows. Called from event handlers / async callbacks only.
  function openTable(name: string) {
    setSelected(name);
    setSearch('');
    setDataState('loading');
    const url = new URL(window.location.href);
    url.searchParams.set('t', name);
    window.history.replaceState(null, '', url);

    const load = (t: string) =>
      fetch(`/api/lists/${encodeURIComponent(t)}`)
        .then(r => r.json())
        .then((d: TableData | { error: string }) => {
          if (!('rows' in d)) throw new Error(d?.error ?? 'Failed to load');
          return d;
        });

    const group = GROUP_BY[name];
    Promise.all([load(name), group ? load(group.table) : Promise.resolve(null)])
      .then(([d, p]) => {
        setData(d);
        setParents(p?.rows ?? []);
        setDataState('done');
      })
      .catch((e: Error) => { setError(e.message); setDataState('error'); });
  }

  useEffect(() => {
    fetch('/api/lists')
      .then(r => r.json())
      .then((list: TableInfo[] | { error: string }) => {
        if (!Array.isArray(list)) throw new Error(list?.error ?? 'Failed to load');
        setTables(list);
        setTablesState('done');
        const wanted = readInitialTable();
        const first = list.find(t => t.name === wanted)?.name ?? list[0]?.name;
        if (first) openTable(first);
      })
      .catch((e: Error) => { setError(e.message); setTablesState('error'); });
  }, []);

  const group = selected ? GROUP_BY[selected] : undefined;

  // Hide the internal row id (and the grouping column); keep the rest in table order.
  const columns = useMemo(
    () => (data?.columns ?? []).filter(c => c !== 'id' && c !== group?.column),
    [data, group]
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!data || !q) return data?.rows ?? [];
    return data.rows.filter(r => columns.some(c => show(r[c]).toLowerCase().includes(q)));
  }, [data, search, columns]);

  // For grouped tables: one section per parent, in the parent's sort order.
  const groups = useMemo<Group[] | null>(() => {
    if (!group) return null;
    const list: Group[] = parents.map(p => ({
      id: String(p.id), name: String(p[group.label] ?? '—'), rows: [],
    }));
    const byId = new Map(list.map(g => [g.id, g]));
    const other: Group = { id: '_other', name: 'Ungrouped', rows: [] };
    rows.forEach(r => (byId.get(String(r[group.column])) ?? other).rows.push(r));
    if (other.rows.length) list.push(other);
    return search ? list.filter(g => g.rows.length) : list;
  }, [group, parents, rows, search]);

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="bg-brown text-white px-4 h-[52px] flex items-center gap-3 sticky top-16 z-10">
        <span className="text-base font-bold flex-1">Lists</span>
        <span className="text-xs opacity-70">View only</span>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-4 space-y-4">
        {tablesState === 'loading' && <Box>Loading lists…</Box>}
        {tablesState === 'error' && <Box>Failed to load: {error}</Box>}

        {tablesState === 'done' && (
          <>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
              {tables.map(t => (
                <button
                  key={t.name}
                  onClick={() => openTable(t.name)}
                  className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-colors ${
                    selected === t.name
                      ? 'bg-brown text-white border-brown'
                      : 'bg-surface text-text border-border hover:border-brown'
                  }`}
                >
                  {pretty(t.name)}
                </button>
              ))}
            </div>

            {dataState === 'loading' && <Box>Loading…</Box>}
            {dataState === 'error' && <Box>Failed to load: {error}</Box>}

            {dataState === 'done' && data && (
              <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border">
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search…"
                    className="flex-1 min-w-0 border border-border rounded-md px-3 py-1.5 text-sm bg-background outline-none focus:border-brown"
                  />
                  <span className="text-xs text-text-muted whitespace-nowrap">
                    {search ? `${rows.length} of ${data.rows.length}` : data.total}
                    {data.total > data.limit && ` (first ${data.limit})`}
                  </span>
                </div>

                {rows.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-text-muted">
                    {data.rows.length === 0 ? 'This list is empty.' : 'No matches.'}
                  </p>
                ) : groups ? (
                  <div>
                    {groups.map(g => (
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
                          : <DataTable columns={columns} rows={g.rows} />}
                      </details>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-auto max-h-[70vh]">
                    <DataTable columns={columns} rows={rows} sticky />
                  </div>
                )}
              </div>
            )}
          </>
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
