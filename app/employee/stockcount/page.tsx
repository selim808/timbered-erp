'use client';

import { useState, useEffect, useRef } from 'react';

interface WCProduct {
  id: number;
  name: string;
  images: { src: string }[];
}

interface StockRow {
  product_id: number;
  stock: number;
  defected: number;
}

type Filter = 'all' | 'instock' | 'outofstock' | 'repair';

const BROWN = '#7A4610';
const CREAM = '#fef3e2';
const BORDER = '#e8ddd4';
const BG = '#f5f0eb';

const thBase: React.CSSProperties = {
  background: CREAM, color: BROWN, fontSize: 11, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.4px', padding: '10px 12px',
  textAlign: 'center', borderBottom: `1px solid ${BORDER}`,
  position: 'sticky', zIndex: 10, whiteSpace: 'nowrap',
};

const qtyBtn: React.CSSProperties = {
  width: 26, height: 26, border: `1.5px solid ${BORDER}`, borderRadius: 7,
  background: '#fff', fontSize: 15, fontWeight: 700, color: BROWN,
  cursor: 'pointer', display: 'flex', alignItems: 'center',
  justifyContent: 'center', flexShrink: 0, lineHeight: 1, padding: 0,
};

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',        label: 'All'       },
  { key: 'instock',    label: 'In Stock'  },
  { key: 'outofstock', label: 'Out Stock' },
  { key: 'repair',     label: 'Defected'  },
];

export default function StockcountPage() {
  const [products, setProducts]   = useState<WCProduct[]>([]);
  const [stockMap, setStockMap]   = useState<Record<number, StockRow>>({});
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState<Filter>('all');
  const [popup, setPopup]         = useState<WCProduct | null>(null);
  const [theadTop, setTheadTop]   = useState(0);
  const [totalsTop, setTotalsTop] = useState(40);

  const topRef    = useRef<HTMLDivElement>(null);
  const theadRef  = useRef<HTMLTableSectionElement>(null);

  // ── Load data ────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch('/api/wc-products').then(r => r.json()),
      fetch('/api/stockcount').then(r => r.json()),
    ])
      .then(([prods, rows]: [WCProduct[], StockRow[]]) => {
        setProducts(prods);
        const map: Record<number, StockRow> = {};
        rows.forEach(r => { map[r.product_id] = r; });
        setStockMap(map);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  // ── Sticky thead offset ──────────────────────────────────────────
  useEffect(() => {
    const update = () => {
      if (!topRef.current) return;
      const h = topRef.current.offsetHeight;
      const firstRow = theadRef.current?.querySelector('tr') as HTMLElement | null;
      setTheadTop(h);
      setTotalsTop(h + (firstRow?.offsetHeight ?? 38));
    };
    const ro = new ResizeObserver(update);
    if (topRef.current) ro.observe(topRef.current);
    update();
    return () => ro.disconnect();
  }, [loading]);

  // ── Helpers ──────────────────────────────────────────────────────
  const getStock    = (id: number) => stockMap[id]?.stock    ?? 0;
  const getDefected = (id: number) => stockMap[id]?.defected ?? 0;

  const filtered = products.filter(p => {
    const s = getStock(p.id), d = getDefected(p.id);
    if (filter === 'instock'    && s === 0) return false;
    if (filter === 'outofstock' && s  > 0) return false;
    if (filter === 'repair'     && d === 0) return false;
    const q = search.toLowerCase().trim();
    if (q && !p.name.toLowerCase().includes(q) && !String(p.id).includes(q)) return false;
    return true;
  });

  const totalStock    = filtered.reduce((s, p) => s + getStock(p.id), 0);
  const totalDefected = filtered.reduce((s, p) => s + getDefected(p.id), 0);
  const countInStock  = filtered.filter(p => getStock(p.id) > 0).length;
  const countDef      = filtered.filter(p => getDefected(p.id) > 0).length;

  function updateLocal(id: number, stock: number, defected: number) {
    setStockMap(prev => ({ ...prev, [id]: { product_id: id, stock, defected } }));
  }

  function save(id: number, stock: number, defected: number) {
    fetch('/api/stockcount', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: id, stock, defected }),
    }).catch(() => {});
  }

  function changeQty(id: number, delta: number) {
    const s = getStock(id), d = getDefected(id);
    const ns = Math.max(0, s + delta);
    const nd = Math.min(d, ns);
    updateLocal(id, ns, nd);
    save(id, ns, nd);
  }

  function changeDefected(id: number, delta: number) {
    const s = getStock(id), d = getDefected(id);
    const nd = Math.min(s, Math.max(0, d + delta));
    updateLocal(id, s, nd);
    save(id, s, nd);
  }

  // ── Render ───────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        body { margin: 0; background: ${BG}; }
        * { box-sizing: border-box; }
        .sc-row:hover { background: #fdf8f4; }
        .sc-qbtn:active { background: ${CREAM} !important; }
        #sc-search { width: 100%; font-size: 12px; padding: 5px 10px; border: 1.5px solid ${BORDER}; border-radius: 8px; outline: none; color: #333; }
      `}</style>

      {/* ── Sticky header ── */}
      <div ref={topRef} style={{ position: 'sticky', top: 0, zIndex: 100, background: '#fff', borderBottom: `1px solid ${BORDER}`, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${BORDER}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://timberedgroup.com/wp-content/uploads/2024/04/Asset-14.png" alt="Timbered" style={{ height: 26 }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: BROWN }}>Stockcount</span>
          <a href="/employee" style={{ marginLeft: 'auto', fontSize: 12, color: BROWN, textDecoration: 'none', border: `1px solid ${BROWN}`, borderRadius: 20, padding: '4px 12px' }}>← Back</a>
        </div>
        <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            id="sc-search"
            type="search"
            placeholder="Search product…"
            onChange={e => setSearch(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                  border: `1.5px solid ${filter === f.key ? BROWN : BORDER}`,
                  background: filter === f.key ? BROWN : '#fff',
                  color: filter === f.key ? '#fff' : '#888',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >{f.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── States ── */}
      {loading && <div style={{ textAlign: 'center', color: '#aaa', padding: '60px 20px', fontSize: 14 }}>Loading products…</div>}
      {error   && <div style={{ textAlign: 'center', color: '#aaa', padding: '60px 20px', fontSize: 14 }}>Error: {error}</div>}

      {/* ── Table ── */}
      {!loading && !error && (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', tableLayout: 'auto' }}>
          <thead ref={theadRef}>
            <tr>
              <th style={{ ...thBase, top: theadTop, padding: 2 }}>Img</th>
              <th style={{ ...thBase, top: theadTop, width: 28, padding: '8px 6px' }}>ID</th>
              <th style={{ ...thBase, top: theadTop }}>Name</th>
              <th style={{ ...thBase, top: theadTop, width: 28 }}>
                Stock<br />
                <span style={{ fontSize: 9, fontWeight: 500, color: '#a07040' }}>({countInStock})</span>
              </th>
              <th style={{ ...thBase, top: theadTop, width: 28 }}>
                Defected<br />
                <span style={{ fontSize: 9, fontWeight: 500, color: '#a07040' }}>({countDef})</span>
              </th>
            </tr>
            <tr>
              <th colSpan={3} style={{ ...thBase, top: totalsTop, fontSize: 12, fontWeight: 800, padding: '5px 6px', borderBottom: `2px solid ${BORDER}` }} />
              <th style={{ ...thBase, top: totalsTop, fontSize: 12, fontWeight: 800, padding: '5px 6px', borderBottom: `2px solid ${BORDER}` }}>{totalStock}</th>
              <th style={{ ...thBase, top: totalsTop, fontSize: 12, fontWeight: 800, padding: '5px 6px', borderBottom: `2px solid ${BORDER}` }}>{totalDefected}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const s = getStock(p.id), d = getDefected(p.id);
              return (
                <tr key={p.id} className="sc-row" style={{ borderBottom: `1px solid ${BG}` }}>
                  {/* image */}
                  <td style={{ padding: 2, width: 48 }}>
                    {p.images?.[0]
                      ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.images[0].src} alt=""
                          onClick={() => setPopup(p)}
                          style={{ width: 44, aspectRatio: '1', objectFit: 'cover', borderRadius: 6, border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'block' }}
                        />
                      ) : (
                        <div
                          onClick={() => setPopup(p)}
                          style={{ width: 44, aspectRatio: '1', background: '#f0e8e0', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 18, cursor: 'pointer' }}
                        >📦</div>
                      )
                    }
                  </td>
                  {/* id */}
                  <td style={{ fontSize: 12, fontWeight: 600, color: '#333', textAlign: 'center', whiteSpace: 'nowrap' }}>{p.id}</td>
                  {/* name */}
                  <td style={{ fontSize: 12, fontWeight: 600, color: '#333', width: 90, maxWidth: 90, whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.3, padding: '8px 12px' }}>{p.name}</td>
                  {/* stock */}
                  <td style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <button className="sc-qbtn" onClick={() => changeQty(p.id, 1)}  style={qtyBtn}>+</button>
                      <span style={{ fontSize: 12, fontWeight: 700, minWidth: 36, textAlign: 'center' }}>{s}</span>
                      <button className="sc-qbtn" onClick={() => changeQty(p.id, -1)} style={qtyBtn}>−</button>
                    </div>
                  </td>
                  {/* defected */}
                  <td style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <button className="sc-qbtn" onClick={() => changeDefected(p.id, 1)}  style={qtyBtn}>+</button>
                      <span style={{ fontSize: 12, fontWeight: 700, minWidth: 36, textAlign: 'center' }}>{d}</span>
                      <button className="sc-qbtn" onClick={() => changeDefected(p.id, -1)} style={qtyBtn}>−</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* ── Popup ── */}
      {popup && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setPopup(null); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 320, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            {popup.images?.[0]
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={popup.images[0].src} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
              : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, aspectRatio: '1/1', background: '#f0e8e0' }}>📦</div>
            }
            <div style={{ padding: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#333', marginBottom: 14 }}>{popup.name}</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {[{ label: 'Stock', val: getStock(popup.id) }, { label: 'Defected', val: getDefected(popup.id) }].map(({ label, val }) => (
                  <div key={label} style={{ flex: 1, background: CREAM, borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: BROWN, lineHeight: 1 }}>{val}</div>
                    <div style={{ fontSize: 10, color: '#a07040', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 600 }}>{label}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setPopup(null)}
                style={{ width: '100%', padding: 12, background: BROWN, color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', borderRadius: 0 }}
              >Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
