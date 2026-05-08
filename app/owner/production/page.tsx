'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PhaseGroup {
  id: string; label: string; color: string; sort_order: number; phases: string[];
}
interface JO {
  id: string; jo_number: string; wc_order_id: string; status: string;
  notes: string | null; created_at: string; card_count: number; in_production: boolean;
}
interface CardItem {
  id: string; card_id: string; jo_id: string;
  wc_order_id: string; wc_line_item_id: string; wc_product_id: string;
  product_name: string; quantity: number; item_type: 'mto' | 'mts';
  is_full: boolean; part_number: number | null; total_parts: number | null; phase: string;
}
interface ProdCard {
  id: string; jo_id: string; jo_number: string; wc_order_id: string;
  card_number: number; total_cards: number; status: string;
  created_at: string; effective_phase: string; items: CardItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cardCode(card: ProdCard) {
  return `${card.jo_number}-${card.card_number}/${card.total_cards}`;
}
function itemLabel(item: CardItem) {
  if (item.is_full) return 'FULL';
  return `${item.part_number}/${item.total_parts}`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
}

// ─── Production Card ──────────────────────────────────────────────────────────

function ProdCardEl({ card, groups, onPhaseChange, onSplit }: {
  card: ProdCard; groups: PhaseGroup[];
  onPhaseChange: (id: string, phase: string) => Promise<void>;
  onSplit: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [moving, setMoving] = useState(false);

  async function move(phase: string) {
    if (!phase) return;
    setMoving(true);
    await onPhaseChange(card.id, phase);
    setMoving(false);
  }

  const totalQty = card.items.reduce((s, i) => s + i.quantity, 0);
  const isSplit = card.total_cards > 1;

  return (
    <div className={`prod-card${open ? ' expanded' : ''}`} id={`pc-${card.id}`}>
      <div className="pc-summary" onClick={() => setOpen(o => !o)}>
        <div className="pc-summary-main">
          <span className="pc-jo-ref">{cardCode(card)}</span>
          <span className="pc-summary-meta">{card.items.length} prod · ×{totalQty}</span>
          {isSplit && <span className="pc-split-badge">SPLIT</span>}
        </div>
        <span className={`pc-chev${open ? ' open' : ''}`}>▾</span>
      </div>

      {open && (
        <>
          <div className="pc-body">
            <div className="pc-items">
              {card.items.map(item => (
                <div key={item.id} className="pc-item-wrap">
                  <div className="pc-item-row">
                    <span className="pc-chip pc-chip-total">×{item.quantity}</span>
                    <span className="pc-item-name">{item.product_name}</span>
                    <span style={{ fontSize: 9, color: '#aaa', flexShrink: 0 }}>{itemLabel(item)}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#7A4610', flexShrink: 0 }}>{item.phase || '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="pc-actions" style={{ flexDirection: 'column', padding: '8px 10px', borderTop: '1px solid #f5f0eb' }}>
            <select
              className="pc-phase-select"
              style={{ width: '100%' }}
              defaultValue=""
              disabled={moving}
              onChange={e => { move(e.target.value); e.currentTarget.value = ''; }}
            >
              <option value="">→ Move to…</option>
              {groups.map(g => (
                <optgroup key={g.id} label={g.label}>
                  {g.phases.filter(p => p !== card.effective_phase).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              <button className="pc-btn pc-btn-split" style={{ flex: 1 }} onClick={() => onSplit(card.id)}>
                ⚡ Split
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Queue Card ───────────────────────────────────────────────────────────────

function QueueCard({ jo, groups, onStart }: {
  jo: JO; groups: PhaseGroup[];
  onStart: (joId: string, phase: string) => Promise<void>;
}) {
  const [phase, setPhase] = useState('');
  const [busy, setBusy] = useState(false);
  const firstPhase = groups[0]?.phases[0] ?? '';

  async function handle() {
    const p = phase || firstPhase;
    if (!p) return;
    setBusy(true);
    await onStart(jo.id, p);
    setBusy(false);
  }

  return (
    <div className="q-jo-card">
      <div className="q-jo-ref">{jo.jo_number}</div>
      <div className="q-jo-meta">Order #{jo.wc_order_id} · {fmtDate(jo.created_at)}</div>
      <select
        className="pc-phase-select"
        style={{ width: '100%', marginBottom: 6, background: '#f5f0eb', color: '#555', border: '1px solid #e8ddd4' }}
        value={phase}
        onChange={e => setPhase(e.target.value)}
      >
        <option value="">Starting phase…</option>
        {groups.map(g => (
          <optgroup key={g.id} label={g.label}>
            {g.phases.map(p => <option key={p} value={p}>{p}</option>)}
          </optgroup>
        ))}
      </select>
      <button className="start-btn" disabled={busy} onClick={handle}>
        {busy ? 'Starting…' : '▶ Start Production'}
      </button>
    </div>
  );
}

// ─── Split Modal ──────────────────────────────────────────────────────────────

function SplitModal({ card, onClose, onConfirm }: {
  card: ProdCard; onClose: () => void;
  onConfirm: (itemIds: string[]) => Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  function toggle(id: string) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  const valid = selected.size > 0 && selected.size < card.items.length;

  async function confirm() {
    if (!valid) return;
    setBusy(true);
    await onConfirm(Array.from(selected));
    setBusy(false);
  }

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Split Card</div>
        <div className="modal-sub">Select items to move to a new card. Items not selected stay in the current card.</div>
        <div style={{ marginBottom: 12 }}>
          {card.items.map(item => (
            <div
              key={item.id}
              onClick={() => toggle(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px',
                border: `1.5px solid ${selected.has(item.id) ? '#7A4610' : '#e8ddd4'}`,
                borderRadius: 8, marginBottom: 6, cursor: 'pointer',
                background: selected.has(item.id) ? '#fef3e2' : '#fff',
              }}
            >
              <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)}
                onClick={e => e.stopPropagation()} style={{ accentColor: '#7A4610' }} />
              <span style={{ flex: 1, fontSize: 12 }}>{item.product_name}</span>
              <span style={{ fontSize: 11, color: '#888' }}>×{item.quantity}</span>
            </div>
          ))}
        </div>
        {selected.size > 0 && !valid && (
          <div style={{ fontSize: 11, color: '#e74c3c', marginBottom: 8 }}>Must keep at least 1 item in the original card</div>
        )}
        {valid && (
          <div style={{ fontSize: 11, color: '#7A4610', marginBottom: 8 }}>
            {card.items.length - selected.size} item(s) stay · {selected.size} item(s) split off
          </div>
        )}
        <div className="modal-actions">
          <button className="modal-cancel" onClick={onClose}>Cancel</button>
          <button className="modal-confirm" disabled={!valid || busy} onClick={confirm}>
            {busy ? 'Splitting…' : 'Split'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create JO Modal ─────────────────────────────────────────────────────────

function CreateJoModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (jo: JO) => void;
}) {
  const [wcOrderId, setWcOrderId] = useState('');
  const [joNumber, setJoNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function create() {
    if (!wcOrderId || !joNumber) { setErr('Both fields are required'); return; }
    setBusy(true); setErr('');
    const res = await fetch('/api/prod-board/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jo_number: joNumber, wc_order_id: wcOrderId, notes }),
    });
    const data = await res.json();
    if (!res.ok) { setErr(data.error ?? 'Error'); setBusy(false); return; }
    onCreated({ ...data, card_count: 0, in_production: false });
    onClose();
  }

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Create Job Order</div>
        <div className="modal-sub">Link a WooCommerce order to a new JO number.</div>
        <div className="modal-field">
          <label className="modal-label">JO Number</label>
          <input className="modal-input" placeholder="e.g. JO-001" value={joNumber}
            onChange={e => setJoNumber(e.target.value)} />
        </div>
        <div className="modal-field">
          <label className="modal-label">WooCommerce Order #</label>
          <input className="modal-input" type="number" placeholder="e.g. 19197" value={wcOrderId}
            onChange={e => setWcOrderId(e.target.value)} />
        </div>
        <div className="modal-field">
          <label className="modal-label">Notes (optional)</label>
          <input className="modal-input" style={{ fontSize: 13 }} placeholder="—" value={notes}
            onChange={e => setNotes(e.target.value)} />
        </div>
        {err && <div style={{ color: '#e74c3c', fontSize: 12, marginBottom: 8 }}>{err}</div>}
        <div className="modal-actions">
          <button className="modal-cancel" onClick={onClose}>Cancel</button>
          <button className="modal-confirm" disabled={busy} onClick={create}>
            {busy ? 'Creating…' : 'Create JO'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── JO Status Tab ────────────────────────────────────────────────────────────

function JoStatusTab({ jobOrders, cards }: { jobOrders: JO[]; cards: ProdCard[] }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setOpen(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const cardsByJo = useMemo(() => {
    const map = new Map<string, ProdCard[]>();
    for (const c of cards) {
      if (!map.has(c.jo_id)) map.set(c.jo_id, []);
      map.get(c.jo_id)!.push(c);
    }
    return map;
  }, [cards]);

  function statusBadge(jo: JO) {
    if (jo.status === 'done') return <span className="jos-status jos-status-done">Done</span>;
    if (jo.in_production) return <span className="jos-status jos-status-active">Active</span>;
    return <span className="jos-status jos-status-queue">Queue</span>;
  }

  return (
    <div className="wrap">
      {jobOrders.length === 0 && (
        <div className="state-msg">No job orders yet</div>
      )}
      {jobOrders.map(jo => {
        const joCards = cardsByJo.get(jo.id) ?? [];
        const isOpen = open.has(jo.id);
        return (
          <div key={jo.id} className="jo-status-card">
            <div className="jos-header" onClick={() => toggle(jo.id)} style={{ cursor: 'pointer' }}>
              <span className="jos-ref">{jo.jo_number}</span>
              <span className="jos-date">Order #{jo.wc_order_id} · {fmtDate(jo.created_at)}</span>
              {statusBadge(jo)}
              <span className="pc-chev" style={{ fontSize: 10, color: '#bbb' }}>
                {isOpen ? '▲' : '▼'}
              </span>
            </div>
            {isOpen && (
              <div className="jos-cards">
                {joCards.length === 0 ? (
                  <div style={{ fontSize: 11, color: '#bbb', padding: '4px 0' }}>Not started</div>
                ) : joCards.map(card => (
                  <div key={card.id} style={{ borderTop: '1px solid #f5f0eb', paddingTop: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#555', marginBottom: 4 }}>
                      {cardCode(card)}
                    </div>
                    {card.items.map(item => (
                      <div key={item.id} className="jos-card-row">
                        <span className="jos-card-name">{item.product_name}</span>
                        <span className="jos-card-qty">×{item.quantity}</span>
                        <span className={`jos-phase-badge ${item.phase ? 'phase-active' : 'phase-queue'}`}>
                          {item.phase || 'Unassigned'}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
                {jo.notes && (
                  <div style={{ fontSize: 11, color: '#9a7a3c', background: '#fffbe6', borderRadius: 6, padding: '4px 8px', marginTop: 6 }}>
                    📝 {jo.notes}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'kanban' | 'jo-status';

export default function ProductionBoardPage() {
  const [tab, setTab] = useState<Tab>('kanban');
  const [jobOrders, setJobOrders] = useState<JO[]>([]);
  const [cards, setCards] = useState<ProdCard[]>([]);
  const [phaseGroups, setPhaseGroups] = useState<PhaseGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [splitCardId, setSplitCardId] = useState<string | null>(null);
  const [createJoOpen, setCreateJoOpen] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2500);
  }

  useEffect(() => {
    fetch('/api/prod-board')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setJobOrders(d.jobOrders);
        setCards(d.productionCards);
        setPhaseGroups(d.phaseGroups);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const queueJos = useMemo(() => jobOrders.filter(jo => !jo.in_production), [jobOrders]);
  const activeCards = useMemo(() => cards.filter(c => c.status !== 'shipped'), [cards]);

  // Ordered phases from all groups
  const allPhases = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();
    for (const g of phaseGroups) {
      for (const p of g.phases) {
        if (!seen.has(p)) { seen.add(p); list.push(p); }
      }
    }
    return list;
  }, [phaseGroups]);

  const phaseColorMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of phaseGroups) for (const p of g.phases) m.set(p, g.color);
    return m;
  }, [phaseGroups]);

  const cardsByPhase = useMemo(() => {
    const map = new Map<string, ProdCard[]>();
    for (const card of activeCards) {
      const p = card.effective_phase || '__unassigned__';
      if (!map.has(p)) map.set(p, []);
      map.get(p)!.push(card);
    }
    return map;
  }, [activeCards]);

  async function handlePhaseChange(cardId: string, phase: string) {
    const res = await fetch(`/api/prod-board/cards/${cardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase }),
    });
    if (!res.ok) { showToast('Error updating phase'); return; }
    setCards(prev => prev.map(c =>
      c.id !== cardId ? c : { ...c, effective_phase: phase, items: c.items.map(i => ({ ...i, phase })) }
    ));
    showToast(`Moved to ${phase}`);
  }

  async function handleStartProduction(joId: string, startPhase: string) {
    const res = await fetch(`/api/prod-board/jobs/${joId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startPhase }),
    });
    const data = await res.json();
    if (!res.ok) { showToast('Error: ' + (data.error ?? 'Unknown')); return; }
    setJobOrders(prev => prev.map(jo => jo.id === joId ? { ...jo, in_production: true, card_count: 1 } : jo));
    setCards(prev => [...prev, data.card]);
    showToast(`Production started — ${data.card.jo_number}`);
  }

  async function handleSplit(itemIds: string[]) {
    if (!splitCardId) return;
    const res = await fetch(`/api/prod-board/cards/${splitCardId}/split`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemIds }),
    });
    const data = await res.json();
    setSplitCardId(null);
    if (!res.ok) { showToast('Error: ' + (data.error ?? 'Unknown')); return; }
    // Full refresh to get updated card numbers
    const refreshed = await fetch('/api/prod-board').then(r => r.json());
    if (!refreshed.error) {
      setJobOrders(refreshed.jobOrders);
      setCards(refreshed.productionCards);
    }
    showToast('Card split');
  }

  const splitCard = splitCardId ? cards.find(c => c.id === splitCardId) ?? null : null;

  const prodCount = activeCards.length;
  const joCount = jobOrders.length;

  return (
    <>
      <style>{`
        /* ── layout ── */
        .pb-sub-nav { display:flex; background:#fff; border-bottom:1px solid #e8ddd4; overflow-x:auto; }
        .pb-sub-nav::-webkit-scrollbar { display:none; }
        .pb-sub-btn { font-size:12px; font-weight:700; padding:10px 16px; border:none; background:none; color:#aaa; cursor:pointer; border-bottom:2px solid transparent; white-space:nowrap; flex-shrink:0; }
        .pb-sub-btn.active { color:#7A4610; border-bottom-color:#7A4610; }
        .badge { font-size:11px; background:#fef3e2; color:#7A4610; border-radius:10px; padding:2px 7px; font-weight:600; margin-left:4px; }

        .state-msg { text-align:center; color:#aaa; padding:60px 20px; font-size:14px; }

        /* ── kanban ── */
        .kanban-outer { height:calc(100vh - 64px - 44px - 52px); overflow:hidden; display:flex; flex-direction:column; }
        .kanban-scroll { display:flex; gap:10px; padding:12px; overflow-x:auto; height:100%; align-items:flex-start; }
        .kanban-scroll::-webkit-scrollbar { height:6px; }
        .kanban-scroll::-webkit-scrollbar-thumb { background:#d5c9be; border-radius:3px; }

        .k-col { background:#ece5de; border-radius:10px; width:220px; flex-shrink:0; display:flex; flex-direction:column; height:calc(100vh - 100px - 64px - 44px - 52px); }
        .k-col-hdr { font-size:10px; font-weight:800; color:#7A4610; padding:10px 10px 6px; text-transform:uppercase; letter-spacing:.5px; display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
        .k-col-hdr-left { display:flex; align-items:center; gap:6px; }
        .k-col-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        .k-col-count { font-size:10px; background:#7A4610; color:#fff; border-radius:10px; padding:1px 7px; font-weight:700; }
        .k-col-body { flex:1; overflow-y:auto; padding:0 8px 10px; display:flex; flex-direction:column; gap:8px; }
        .k-col-body::-webkit-scrollbar { width:3px; }
        .k-col-body::-webkit-scrollbar-thumb { background:#d5c9be; border-radius:2px; }
        .k-col-empty { font-size:11px; color:#bbb; padding:10px; text-align:center; }

        /* ── production card ── */
        .prod-card { background:#fff; border-radius:8px; border:1px solid #e8ddd4; overflow:hidden; }
        .prod-card.expanded { display:flex; flex-direction:column; max-height:calc(100vh - 200px); }
        .prod-card.expanded .pc-body { flex:1; overflow-y:auto; }
        .prod-card.expanded .pc-body::-webkit-scrollbar { width:3px; }
        .prod-card.expanded .pc-body::-webkit-scrollbar-thumb { background:#d5c9be; border-radius:2px; }
        .pc-summary { display:flex; align-items:center; gap:6px; padding:8px 10px; cursor:pointer; user-select:none; }
        .pc-summary:hover { background:#fdf8f4; }
        .pc-summary-main { display:flex; align-items:center; gap:5px; flex:1; min-width:0; flex-wrap:wrap; }
        .pc-jo-ref { font-size:12px; font-weight:800; color:#7A4610; flex-shrink:0; }
        .pc-summary-meta { font-size:10px; color:#aaa; flex-shrink:0; }
        .pc-split-badge { font-size:9px; font-weight:800; background:#3498db; color:#fff; border-radius:4px; padding:1px 5px; flex-shrink:0; }
        .pc-chev { font-size:10px; color:#bbb; flex-shrink:0; transition:transform .15s; }
        .pc-chev.open { transform:rotate(180deg); }
        .pc-body { border-top:1px solid #f5f0eb; padding:8px 10px; }
        .pc-items { margin-bottom:4px; }
        .pc-item-wrap { border-bottom:1px solid #f5f0eb; }
        .pc-item-wrap:last-child { border-bottom:none; }
        .pc-item-row { display:flex; align-items:center; gap:5px; padding:4px 0; }
        .pc-item-name { flex:1; font-size:10px; font-weight:600; color:#333; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .pc-chip { font-size:10px; border-radius:5px; padding:2px 6px; font-weight:600; flex-shrink:0; }
        .pc-chip-total { background:#333; color:#fff; }
        .pc-actions { display:flex; gap:4px; }
        .pc-btn { font-size:10px; font-weight:700; border:none; border-radius:6px; padding:5px 8px; cursor:pointer; white-space:nowrap; flex-shrink:0; }
        .pc-btn-split { background:#f5f0eb; color:#555; border:1px solid #e8ddd4; }
        .pc-btn-split:hover { background:#e8ddd4; }
        .pc-phase-select { flex:1; font-size:10px; font-weight:700; color:#fff; background:#7A4610; border:none; border-radius:6px; padding:5px 6px; cursor:pointer; outline:none; min-width:0; }
        .pc-phase-select:disabled { background:#ccc; cursor:not-allowed; }

        /* ── queue card ── */
        .q-jo-card { background:#fff; border-radius:8px; padding:10px; border:1.5px solid #e8ddd4; }
        .q-jo-ref { font-size:13px; font-weight:800; color:#7A4610; margin-bottom:2px; }
        .q-jo-meta { font-size:10px; color:#aaa; margin-bottom:8px; }
        .q-create-btn { width:100%; background:none; color:#7A4610; border:1.5px dashed #7A4610; border-radius:8px; padding:8px; font-size:11px; font-weight:700; cursor:pointer; margin-bottom:8px; }
        .q-create-btn:hover { background:#fef3e2; }
        .start-btn { width:100%; background:#7A4610; color:#fff; border:none; border-radius:6px; padding:7px; font-size:11px; font-weight:700; cursor:pointer; }
        .start-btn:hover { background:#5a3209; }
        .start-btn:disabled { background:#ccc; cursor:not-allowed; }

        /* ── JO status tab ── */
        .wrap { padding:10px 10px 80px; max-width:860px; margin:0 auto; }
        .jo-status-card { background:#fff; border:1px solid #e8ddd4; border-radius:8px; margin-bottom:10px; padding:12px 14px; }
        .jos-header { display:flex; align-items:center; gap:8px; margin-bottom:6px; flex-wrap:wrap; }
        .jos-ref { font-size:14px; font-weight:800; color:#7A4610; }
        .jos-date { font-size:11px; color:#aaa; flex:1; }
        .jos-status { font-size:10px; font-weight:700; border-radius:10px; padding:2px 9px; flex-shrink:0; }
        .jos-status-active { background:#fef3e2; color:#c97d3a; }
        .jos-status-done   { background:#eafaf1; color:#27ae60; }
        .jos-status-queue  { background:#f0f0f0; color:#999; }
        .jos-cards { display:flex; flex-direction:column; gap:5px; }
        .jos-card-row { display:flex; align-items:center; gap:8px; font-size:11px; padding:3px 0; }
        .jos-card-name { flex:1; color:#333; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .jos-card-qty { color:#aaa; flex-shrink:0; font-size:10px; }
        .jos-phase-badge { font-size:9px; font-weight:700; border-radius:4px; padding:2px 7px; flex-shrink:0; white-space:nowrap; }
        .phase-queue  { background:#f0f0f0; color:#999; }
        .phase-active { background:#fef3e2; color:#7A4610; }
        .phase-ready  { background:#eafaf1; color:#27ae60; }

        /* ── modals ── */
        .modal-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:300; align-items:center; justify-content:center; padding:16px; }
        .modal-overlay.open { display:flex; }
        .modal-box { background:#fff; border-radius:12px; width:100%; max-width:360px; padding:20px; }
        .modal-title { font-size:14px; font-weight:700; color:#333; margin-bottom:4px; }
        .modal-sub { font-size:11px; color:#aaa; margin-bottom:16px; line-height:1.4; }
        .modal-field { margin-bottom:12px; }
        .modal-label { font-size:11px; font-weight:700; color:#555; margin-bottom:4px; display:block; }
        .modal-input { width:100%; font-size:16px; font-weight:700; color:#333; border:1.5px solid #e8ddd4; border-radius:8px; padding:8px 12px; outline:none; }
        .modal-input:focus { border-color:#7A4610; }
        .modal-actions { display:flex; gap:8px; margin-top:16px; }
        .modal-cancel  { flex:1; background:#f5f0eb; color:#555; border:none; border-radius:8px; padding:10px; font-size:13px; font-weight:700; cursor:pointer; }
        .modal-confirm { flex:1; background:#7A4610; color:#fff; border:none; border-radius:8px; padding:10px; font-size:13px; font-weight:700; cursor:pointer; }
        .modal-confirm:hover { background:#5a3209; }
        .modal-confirm:disabled { background:#ccc; cursor:not-allowed; }

        /* ── toast ── */
        .pb-toast { position:fixed; bottom:80px; left:50%; transform:translateX(-50%); background:#333; color:#fff; font-size:12px; font-weight:600; padding:8px 18px; border-radius:20px; z-index:500; pointer-events:none; white-space:nowrap; }
      `}</style>

      {/* Sub-nav */}
      <div className="pb-sub-nav">
        <button className={`pb-sub-btn${tab === 'kanban' ? ' active' : ''}`} onClick={() => setTab('kanban')}>
          Kanban <span className="badge">{prodCount}</span>
        </button>
        <button className={`pb-sub-btn${tab === 'jo-status' ? ' active' : ''}`} onClick={() => setTab('jo-status')}>
          JO Status <span className="badge">{joCount}</span>
        </button>
      </div>

      {loading && <div className="state-msg">Loading…</div>}
      {error && (
        <div className="state-msg" style={{ color: '#e74c3c' }}>
          {error.includes('relation') || error.includes('exist')
            ? 'Production tables not found. Please apply migration 007_production_flow.sql in Supabase Studio first.'
            : error}
        </div>
      )}

      {/* Kanban tab */}
      {!loading && !error && tab === 'kanban' && (
        <div className="kanban-outer">
          <div className="kanban-scroll">

            {/* Queue column */}
            <div className="k-col">
              <div className="k-col-hdr">
                <div className="k-col-hdr-left">
                  <div className="k-col-dot" style={{ background: '#7A4610' }} />
                  Queue
                </div>
                <span className="k-col-count">{queueJos.length}</span>
              </div>
              <div className="k-col-body">
                <button className="q-create-btn" onClick={() => setCreateJoOpen(true)}>+ Create JO</button>
                {queueJos.length === 0 && <div className="k-col-empty">Empty</div>}
                {queueJos.map(jo => (
                  <QueueCard key={jo.id} jo={jo} groups={phaseGroups} onStart={handleStartProduction} />
                ))}
              </div>
            </div>

            {/* Phase columns */}
            {allPhases.map(phase => {
              const phaseCards = cardsByPhase.get(phase) ?? [];
              const color = phaseColorMap.get(phase) ?? '#ccc';
              return (
                <div key={phase} className="k-col">
                  <div className="k-col-hdr">
                    <div className="k-col-hdr-left">
                      <div className="k-col-dot" style={{ background: color }} />
                      {phase}
                    </div>
                    <span className="k-col-count">{phaseCards.length}</span>
                  </div>
                  <div className="k-col-body">
                    {phaseCards.length === 0
                      ? <div className="k-col-empty">Empty</div>
                      : phaseCards.map(card => (
                          <ProdCardEl
                            key={card.id}
                            card={card}
                            groups={phaseGroups}
                            onPhaseChange={handlePhaseChange}
                            onSplit={setSplitCardId}
                          />
                        ))
                    }
                  </div>
                </div>
              );
            })}

            {/* Unassigned column — only shown if cards exist with no phase */}
            {(cardsByPhase.get('__unassigned__') ?? []).length > 0 && (
              <div className="k-col">
                <div className="k-col-hdr">
                  <div className="k-col-hdr-left">
                    <div className="k-col-dot" style={{ background: '#ccc' }} />
                    Unassigned
                  </div>
                  <span className="k-col-count">{(cardsByPhase.get('__unassigned__') ?? []).length}</span>
                </div>
                <div className="k-col-body">
                  {(cardsByPhase.get('__unassigned__') ?? []).map(card => (
                    <ProdCardEl key={card.id} card={card} groups={phaseGroups}
                      onPhaseChange={handlePhaseChange} onSplit={setSplitCardId} />
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* JO Status tab */}
      {!loading && !error && tab === 'jo-status' && (
        <JoStatusTab jobOrders={jobOrders} cards={cards} />
      )}

      {/* Modals */}
      {splitCard && (
        <SplitModal card={splitCard} onClose={() => setSplitCardId(null)} onConfirm={handleSplit} />
      )}
      {createJoOpen && (
        <CreateJoModal
          onClose={() => setCreateJoOpen(false)}
          onCreated={jo => setJobOrders(prev => [jo, ...prev])}
        />
      )}

      {toast && <div className="pb-toast">{toast}</div>}
    </>
  );
}
