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

  // Load one table's rows. Called from event handlers / async callbacks only.
  function openTable(name: string) {
    setSelected(name);
    setSearch('');
    setDataState('loading');
    const url = new URL(window.location.href);
    url.searchParams.set('t', name);
    window.history.replaceState(null, '', url);

    fetch(`/api/lists/${encodeURIComponent(name)}`)
      .then(r => r.json())
      .then((d: TableData | { error: string }) => {
        if (!('rows' in d)) throw new Error(d?.error ?? 'Failed to load');
        setData(d);
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

  // Hide the internal row id; keep everything else in table order.
  const columns = useMemo(() => (data?.columns ?? []).filter(c => c !== 'id'), [data]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!data || !q) return data?.rows ?? [];
    return data.rows.filter(r => columns.some(c => show(r[c]).toLowerCase().includes(q)));
  }, [data, search, columns]);

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
                ) : (
                  <div className="overflow-auto max-h-[70vh]">
                    <table className="w-full text-sm border-collapse">
                      <thead className="sticky top-0 bg-surface-2">
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
                )}
              </div>
            )}
          </>
        )}
      </div>
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
