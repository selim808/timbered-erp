'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { PipelineOrder, PipelineLineItem } from '@/app/api/pipeline/orders/route';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
} from 'chart.js';
import type { TooltipItem } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTooltip, ChartLegend, ChartDataLabels);

const ImageClickCtx = createContext<((li: PipelineLineItem) => void) | null>(null);

interface PhaseGroup {
  id: string;
  label: string;
  color: string;
  sort_order: number;
  phases: string[];
}

type Tab = 'orders' | 'wip';
type GroupBy = 'order' | 'phase' | 'product';

function daysBadgeClass(days: number) {
  if (days >= 15) return 'op-badge urgent';
  if (days >= 8)  return 'op-badge warn';
  return 'op-badge';
}

function fmtPrice(n: number) {
  return n.toLocaleString('en-EG', { maximumFractionDigits: 0 });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function waPhone(raw: string) {
  let p = raw.replace(/[^0-9]/g, '');
  if (p.startsWith('0')) p = '20' + p.slice(1);
  return p;
}

// ── Phase Selector ─────────────────────────────────────────────────────────
function PhaseSelect({ groups, value, onChange }: {
  groups: PhaseGroup[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <select
      className="op-phase-sel"
      value={value}
      onChange={e => onChange(e.target.value)}
      onClick={e => e.stopPropagation()}
    >
      <option value="">— phase —</option>
      {groups.map(g => (
        <optgroup key={g.id} label={g.label}>
          {g.phases.map(p => <option key={p} value={p}>{p}</option>)}
        </optgroup>
      ))}
    </select>
  );
}

// ── Group Checkbox (handles indeterminate) ─────────────────────────────────
function GroupCheckbox({ keys, selectedItems, onToggleGroup }: {
  keys: string[]; selectedItems: Set<string>; onToggleGroup: (keys: string[]) => void;
}) {
  const allSel = keys.length > 0 && keys.every(k => selectedItems.has(k));
  const someSel = keys.some(k => selectedItems.has(k));
  return (
    <input type="checkbox" className="op-item-check" checked={allSel}
      ref={el => { if (el) el.indeterminate = someSel && !allSel; }}
      onChange={() => onToggleGroup(keys)} onClick={e => e.stopPropagation()} />
  );
}

// ── Item Row ───────────────────────────────────────────────────────────────
function ItemRow({ li, orderNum, liIndex, daysOpen, groups, bulkMode, selected, showOrder, onToggle, onPhaseChange }: {
  li: PipelineLineItem; orderNum: string; liIndex: number; daysOpen: number;
  groups: PhaseGroup[]; bulkMode: boolean; selected: boolean; showOrder: boolean;
  onToggle: () => void; onPhaseChange: (v: string) => void;
}) {
  const ref = `${orderNum}.${liIndex}`;
  const onImageClick = useContext(ImageClickCtx);
  return (
    <div className={`op-item-row${selected ? ' selected' : ''}`} onClick={bulkMode ? onToggle : undefined}>
      {bulkMode && (
        <input type="checkbox" className="op-item-check" checked={selected}
          onChange={onToggle} onClick={e => e.stopPropagation()} />
      )}
      {li.imageUrl
        ? <img src={li.imageUrl} alt="" className="op-thumb" style={{ cursor: 'pointer' }}
            onClick={e => { e.stopPropagation(); onImageClick?.(li); }} />
        : <div className="op-thumb-ph" onClick={e => { e.stopPropagation(); onImageClick?.(li); }} style={{ cursor: 'pointer' }} />
      }
      <span className={daysBadgeClass(daysOpen)}>{daysOpen}d</span>
      <span className="op-item-ref">{ref}</span>
      <span className="op-item-name">{li.name}</span>
      <span className="op-item-qty">×{li.quantity}</span>
      <span className="op-item-stock" title="In stock">📦{li.stock}</span>
      <span className="op-item-ordered" title="Total ordered">🛒{li.orderedQty}</span>
      <span className="op-item-price">{fmtPrice(li.total)}</span>
      <PhaseSelect groups={groups} value={li.phase} onChange={onPhaseChange} />
    </div>
  );
}

// ── Order Card ─────────────────────────────────────────────────────────────
function OrderCard({ o, groups, bulkMode, selectedItems, completeMode, cancelMode,
  isSelected, isOpen, onToggleOpen, onToggleItem, onPhaseChange, onToggleOrder, onToggleGroup, onOpenDetail }: {
  o: PipelineOrder; groups: PhaseGroup[]; bulkMode: boolean;
  selectedItems: Set<string>; completeMode: boolean; cancelMode: boolean;
  isSelected: boolean; isOpen: boolean;
  onToggleOpen: () => void; onToggleItem: (k: string) => void;
  onPhaseChange: (orderId: number, liId: number, phase: string) => void;
  onToggleOrder: () => void; onToggleGroup: (keys: string[]) => void; onOpenDetail: () => void;
}) {
  const wp = o.customerPhone ? waPhone(o.customerPhone) : '';
  return (
    <div className={`op-order-card${isSelected ? ' selected' : ''}`}>
      {/* Header row */}
      <div className="op-order-top" onClick={onToggleOpen}>
        {(completeMode || cancelMode) && (
          <input type="checkbox" className="op-order-check" checked={isSelected}
            onChange={onToggleOrder} onClick={e => e.stopPropagation()} />
        )}
        {bulkMode && (
          <GroupCheckbox keys={o.lineItems.map(li => `${o.id}-${li.id}`)}
            selectedItems={selectedItems} onToggleGroup={onToggleGroup} />
        )}
        <span className={daysBadgeClass(o.daysOpen)}>{o.daysOpen}d</span>
        <span className="op-order-num" onClick={e => { e.stopPropagation(); onOpenDetail(); }}>
          #{o.number}
        </span>
        <span className="op-order-name">{o.customerName}</span>
        <span className="op-order-total">{fmtPrice(o.total)}</span>
        {wp && (
          <>
            <a href={`https://wa.me/${wp}`} className="op-wa-link" onClick={e => e.stopPropagation()} target="_blank" rel="noreferrer" title="WhatsApp">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </a>
            <span className="op-phone-num">{o.customerPhone}</span>
            <a href={`tel:${o.customerPhone}`} className="op-call-link" onClick={e => e.stopPropagation()} title="Call">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7A4610" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/>
              </svg>
            </a>
          </>
        )}
        <span className={`op-chevron${isOpen ? ' open' : ''}`}>▼</span>
      </div>

      {/* Address row — always visible */}
      {(o.customerAddress || o.customerAddress2 || o.customerCity || o.customerState) && (
        <div className="op-addr-row">
          <span className="op-addr-street">{o.customerAddress}</span>
          <span className="op-addr-city">{o.customerAddress2}</span>
          <span className="op-addr-state">{o.customerState}</span>
        </div>
      )}

      {/* Customer note — always visible */}
      {o.customerNote && (
        <div className="op-order-note">📝 {o.customerNote}</div>
      )}

      {/* Collapsible items */}
      <div className={`op-collapsible${isOpen ? ' open' : ''}`}>
        <div className="op-collapsible-inner">
          {o.lineItems.map((li, idx) => {
            const key = `${o.id}-${li.id}`;
            return (
              <ItemRow
                key={li.id} li={li} orderNum={o.number} liIndex={idx + 1}
                daysOpen={o.daysOpen} groups={groups} bulkMode={bulkMode}
                selected={selectedItems.has(key)} showOrder={false}
                onToggle={() => onToggleItem(key)}
                onPhaseChange={v => onPhaseChange(o.id, li.id, v)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Order View ─────────────────────────────────────────────────────────────
function OrderView({ orders, groups, bulkMode, selectedItems, completeMode, cancelMode,
  selectedOrders, onToggleItem, onPhaseChange, onToggleOrder, onToggleGroup, onOpenDetail }: {
  orders: PipelineOrder[]; groups: PhaseGroup[]; bulkMode: boolean;
  selectedItems: Set<string>; completeMode: boolean; cancelMode: boolean;
  selectedOrders: Set<number>;
  onToggleItem: (k: string) => void;
  onPhaseChange: (orderId: number, liId: number, phase: string) => void;
  onToggleOrder: (id: number) => void;
  onToggleGroup: (keys: string[]) => void;
  onOpenDetail: (o: PipelineOrder) => void;
}) {
  const [open, setOpen] = useState<Set<number>>(new Set());
  const toggle = (id: number) => setOpen(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  return (
    <div>
      {orders.map(o => (
        <OrderCard key={o.id} o={o} groups={groups} bulkMode={bulkMode}
          selectedItems={selectedItems} completeMode={completeMode} cancelMode={cancelMode}
          isSelected={selectedOrders.has(o.id)} isOpen={open.has(o.id)}
          onToggleOpen={() => toggle(o.id)}
          onToggleItem={onToggleItem}
          onPhaseChange={onPhaseChange}
          onToggleOrder={() => onToggleOrder(o.id)}
          onToggleGroup={onToggleGroup}
          onOpenDetail={() => onOpenDetail(o)}
        />
      ))}
    </div>
  );
}

// ── Phase View ─────────────────────────────────────────────────────────────
function PhaseView({ orders, groups, bulkMode, selectedItems, onToggleItem, onToggleGroup, onPhaseChange }: {
  orders: PipelineOrder[]; groups: PhaseGroup[]; bulkMode: boolean;
  selectedItems: Set<string>;
  onToggleItem: (k: string) => void;
  onToggleGroup: (keys: string[]) => void;
  onPhaseChange: (orderId: number, liId: number, phase: string) => void;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (p: string) => setOpen(s => { const n = new Set(s); n.has(p) ? n.delete(p) : n.add(p); return n; });

  const flat = useMemo(() => {
    const rows: { o: PipelineOrder; li: PipelineLineItem; liIndex: number }[] = [];
    orders.forEach(o => o.lineItems.forEach((li, idx) => rows.push({ o, li, liIndex: idx + 1 })));
    return rows;
  }, [orders]);

  const allPhases = useMemo(() => {
    const seen = new Set<string>();
    const list: { phase: string; groupLabel: string; color: string }[] = [];
    groups.forEach(g => g.phases.forEach(p => {
      if (!seen.has(p)) { seen.add(p); list.push({ phase: p, groupLabel: g.label, color: g.color }); }
    }));
    list.push({ phase: '', groupLabel: '', color: '#ccc' });
    return list;
  }, [groups]);

  return (
    <div>
      {allPhases.map(({ phase, groupLabel, color }) => {
        const items = flat.filter(({ li }) => li.phase === phase);
        if (items.length === 0) return null;
        const isOpen = open.has(phase);
        return (
          <div key={phase} className="op-phase-group">
            <div className="op-phase-header" style={{ borderLeftColor: color }} onClick={() => toggle(phase)}>
              {bulkMode && (
                <GroupCheckbox keys={items.map(({ o, li }) => `${o.id}-${li.id}`)}
                  selectedItems={selectedItems} onToggleGroup={onToggleGroup} />
              )}
              <span className="op-phase-name">{phase || 'Unassigned'}</span>
              {groupLabel && <span className="op-phase-meta">{groupLabel}</span>}
              <span className="op-phase-count">{items.length}</span>
              <span className={`op-chevron${isOpen ? ' open' : ''}`}>▼</span>
            </div>
            <div className={`op-collapsible${isOpen ? ' open' : ''}`}>
              <div className="op-collapsible-inner">
                {items.map(({ o, li, liIndex }) => {
                  const key = `${o.id}-${li.id}`;
                  return (
                    <ItemRow key={key} li={li} orderNum={o.number} liIndex={liIndex}
                      daysOpen={o.daysOpen} groups={groups} bulkMode={bulkMode}
                      selected={selectedItems.has(key)} showOrder={true}
                      onToggle={() => onToggleItem(key)}
                      onPhaseChange={v => onPhaseChange(o.id, li.id, v)}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Product View ───────────────────────────────────────────────────────────
function ProductView({ orders, groups, bulkMode, selectedItems, prodSort, onToggleItem, onToggleGroup, onPhaseChange }: {
  orders: PipelineOrder[]; groups: PhaseGroup[]; bulkMode: boolean;
  selectedItems: Set<string>; prodSort: 'qty' | 'value';
  onToggleItem: (k: string) => void;
  onToggleGroup: (keys: string[]) => void;
  onPhaseChange: (orderId: number, liId: number, phase: string) => void;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (n: string) => setOpen(s => { const ns = new Set(s); ns.has(n) ? ns.delete(n) : ns.add(n); return ns; });

  const byProduct = useMemo(() => {
    const map = new Map<string, { o: PipelineOrder; li: PipelineLineItem; liIndex: number }[]>();
    orders.forEach(o => o.lineItems.forEach((li, idx) => {
      if (!map.has(li.name)) map.set(li.name, []);
      map.get(li.name)!.push({ o, li, liIndex: idx + 1 });
    }));
    const arr = Array.from(map.entries()).map(([name, items]) => ({
      name, items,
      totalQty: items.reduce((s, { li }) => s + li.quantity, 0),
      totalValue: items.reduce((s, { li }) => s + li.total, 0),
    }));
    arr.sort((a, b) => prodSort === 'qty' ? b.totalQty - a.totalQty : b.totalValue - a.totalValue);
    return arr;
  }, [orders, prodSort]);

  return (
    <div>
      {byProduct.map(({ name, items, totalQty, totalValue }) => {
        const isOpen = open.has(name);
        return (
          <div key={name} className="op-product-group">
            <div className="op-product-header" onClick={() => toggle(name)}>
              {bulkMode && (
                <GroupCheckbox keys={items.map(({ o, li }) => `${o.id}-${li.id}`)}
                  selectedItems={selectedItems} onToggleGroup={onToggleGroup} />
              )}
              <span className="op-product-name">{name}</span>
              <span className="op-product-count">×{totalQty}</span>
              <span className="op-product-value">{fmtPrice(totalValue)}</span>
              <span className={`op-chevron${isOpen ? ' open' : ''}`}>▼</span>
            </div>
            <div className={`op-collapsible${isOpen ? ' open' : ''}`}>
              <div className="op-collapsible-inner">
                {items.map(({ o, li, liIndex }) => {
                  const key = `${o.id}-${li.id}`;
                  return (
                    <ItemRow key={key} li={li} orderNum={o.number} liIndex={liIndex}
                      daysOpen={o.daysOpen} groups={groups} bulkMode={bulkMode}
                      selected={selectedItems.has(key)} showOrder={true}
                      onToggle={() => onToggleItem(key)}
                      onPhaseChange={v => onPhaseChange(o.id, li.id, v)}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── WIP Chart ─────────────────────────────────────────────────────────────
function WipChart({ orders, phaseGroups, onPhaseChange }: {
  orders: PipelineOrder[];
  phaseGroups: PhaseGroup[];
  onPhaseChange: (orderId: number, liId: number, phase: string) => void;
}) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const allItems = useMemo(() =>
    orders.flatMap(o => o.lineItems.map((li, idx) => ({
      ...li, orderId: o.id, orderNum: o.number, liIndex: idx + 1, daysOpen: o.daysOpen,
    }))),
    [orders]
  );

  const totalValue = useMemo(() => allItems.reduce((s, li) => s + li.total, 0), [allItems]);
  const totalQty   = useMemo(() => allItems.reduce((s, li) => s + li.quantity, 0), [allItems]);

  const groupStats = useMemo(() => {
    const stats = phaseGroups.map(g => {
      const items = allItems.filter(li => g.phases.includes(li.phase));
      return { id: g.id, label: g.label, color: g.color, qty: items.reduce((s, li) => s + li.quantity, 0), value: items.reduce((s, li) => s + li.total, 0), orders: new Set(items.map(li => li.orderId)).size, items };
    }).filter(g => g.items.length > 0);

    const unassignedItems = allItems.filter(li => !li.phase);
    if (unassignedItems.length > 0) {
      stats.push({ id: 'unassigned', label: 'Unassigned', color: '#bbb', qty: unassignedItems.reduce((s, li) => s + li.quantity, 0), value: unassignedItems.reduce((s, li) => s + li.total, 0), orders: new Set(unassignedItems.map(li => li.orderId)).size, items: unassignedItems });
    }
    return stats;
  }, [allItems, phaseGroups]);

  const fmtK = (v: number) => v >= 1000 ? `${Math.round(v / 1000)}K` : String(Math.round(v));

  const chartData = {
    labels: groupStats.map(g => g.label),
    datasets: [{
      label: 'Value',
      data: groupStats.map(g => g.value),
      backgroundColor: groupStats.map(g => g.color + 'bb'),
      borderColor: groupStats.map(g => g.color),
      borderWidth: 1.5,
      borderRadius: 4,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      datalabels: {
        anchor: 'end' as const,
        align: 'top' as const,
        color: '#7A4610',
        font: { size: 11, weight: 'bold' as const },
        formatter: (val: number) => val > 0 ? fmtK(val) : '',
      },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<'bar'>) => {
            const g = groupStats[ctx.dataIndex];
            return [`Value: ${fmtPrice(g.value)} EGP`, `Items: ${g.qty}`, `Orders: ${g.orders}`];
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#555' } },
      y: { grid: { color: '#f0e8e0' }, ticks: { font: { size: 11 }, callback: (v: number | string) => fmtK(Number(v)) }, beginAtZero: true },
    },
  };

  return (
    <div style={{ padding: '8px' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <div className="op-wip-kpi">
          <div className="op-wip-kpi-label">Total WIP Value</div>
          <div className="op-wip-kpi-value">{fmtPrice(totalValue)} EGP</div>
        </div>
        <div className="op-wip-kpi">
          <div className="op-wip-kpi-label">Total Items</div>
          <div className="op-wip-kpi-value">{totalQty}</div>
        </div>
        <div className="op-wip-kpi">
          <div className="op-wip-kpi-label">Active Orders</div>
          <div className="op-wip-kpi-value">{orders.length}</div>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e8ddd4', borderRadius: 8, padding: '12px 8px 8px', height: 300, marginBottom: 10, position: 'relative' }}>
        <Bar data={chartData} options={chartOptions} />
      </div>

      {groupStats.map(g => (
        <div key={g.id} className="op-wip-group">
          <div className="op-wip-group-header" style={{ borderLeftColor: g.color }} onClick={() => setExpandedGroup(expandedGroup === g.id ? null : g.id)}>
            <span className="op-wip-group-dot" style={{ background: g.color }} />
            <span className="op-wip-group-name">{g.label}</span>
            <span className="op-wip-group-stat">{g.qty} items</span>
            <span className="op-wip-group-val">{fmtPrice(g.value)} EGP</span>
            <span className="op-wip-group-ord">{g.orders} ord</span>
            <span className={`op-chevron${expandedGroup === g.id ? ' open' : ''}`}>▼</span>
          </div>
          {expandedGroup === g.id && (
            <div className="op-wip-group-body">
              {g.items.map(li => (
                <ItemRow
                  key={`${li.orderId}-${li.id}`}
                  li={li}
                  orderNum={li.orderNum}
                  liIndex={li.liIndex}
                  daysOpen={li.daysOpen}
                  groups={phaseGroups}
                  bulkMode={false}
                  selected={false}
                  showOrder={true}
                  onToggle={() => {}}
                  onPhaseChange={v => onPhaseChange(li.orderId, li.id, v)}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Product Popup ──────────────────────────────────────────────────────────
function ProductPopup({ li, orders, onClose }: {
  li: PipelineLineItem; orders: PipelineOrder[]; onClose: () => void;
}) {
  const [details, setDetails] = useState<{ dim: string; material: string; imageUrl: string } | null>(null);
  const [showOrders, setShowOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PipelineOrder | null>(null);

  useEffect(() => {
    fetch(`/api/pipeline/product/${li.productId}`)
      .then(r => r.json())
      .then(d => setDetails(d))
      .catch(() => setDetails({ dim: '', material: '', imageUrl: '' }));
  }, [li.productId]);

  const ordersWithProduct = useMemo(() =>
    orders.flatMap(o => {
      const item = o.lineItems.find(i => i.productId === li.productId);
      return item ? [{ o, item }] : [];
    }),
    [orders, li.productId]
  );

  const imgSrc = details?.imageUrl || li.imageUrl;

  if (showOrders) {
    return (
      <div className="op-od-overlay open" onClick={onClose}>
        <div className="op-od-box" onClick={e => e.stopPropagation()}>
          <div className="op-od-header">
            <button className="op-od-close" onClick={() => { selectedOrder ? setSelectedOrder(null) : setShowOrders(false); }}>←</button>
            <span className="op-od-id" style={{ flex: 1 }}>
              {selectedOrder ? `#${selectedOrder.number} · ${selectedOrder.customerName}` : `Orders · ${li.name}`}
            </span>
            <button className="op-od-close" onClick={onClose}>✕</button>
          </div>

          {selectedOrder ? (
            <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="op-od-section">
                <div className="op-od-label">Customer</div>
                <div className="op-od-val">{selectedOrder.customerName}</div>
                {selectedOrder.customerPhone && <div className="op-od-val">{selectedOrder.customerPhone}</div>}
                {selectedOrder.customerAddress && (
                  <div className="op-od-val">{[selectedOrder.customerAddress, selectedOrder.customerAddress2, selectedOrder.customerState].filter(Boolean).join(', ')}</div>
                )}
              </div>
              {selectedOrder.customerNote && (
                <div className="op-od-section">
                  <div className="op-od-label">Note</div>
                  <div className="op-od-val">{selectedOrder.customerNote}</div>
                </div>
              )}
              <div className="op-od-section">
                <div className="op-od-label">Items</div>
                <table className="op-od-table">
                  <thead><tr><th>Item</th><th>Qty</th><th>Total</th><th>Phase</th></tr></thead>
                  <tbody>
                    {selectedOrder.lineItems.map(item => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>×{item.quantity}</td>
                        <td>{fmtPrice(item.total)}</td>
                        <td style={{ color: '#aaa', fontSize: 11 }}>{item.phase || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="op-od-total">
                <span>Total</span><span>{fmtPrice(selectedOrder.total)} EGP</span>
              </div>
            </div>
          ) : (
            <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {ordersWithProduct.map(({ o, item }) => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderBottom: '1px solid #f0e8e0' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#7A4610', flexShrink: 0, cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => setSelectedOrder(o)}>#{o.number}</span>
                  <span style={{ fontSize: 12, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.customerName}</span>
                  <span style={{ fontSize: 11, color: '#888', flexShrink: 0 }}>×{item.quantity}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#7A4610', flexShrink: 0 }}>{fmtPrice(item.total)} EGP</span>
                  <span style={{ fontSize: 10, color: '#aaa', flexShrink: 0 }}>{item.phase}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="op-od-overlay open" onClick={onClose}>
      <div className="op-od-box" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
        <div className="op-od-header">
          <span className="op-od-id" style={{ flex: 1 }}>{li.name}</span>
          <button className="op-od-close" onClick={onClose}>✕</button>
        </div>
        {imgSrc && (
          <img src={imgSrc} alt={li.name}
            style={{ width: '100%', maxHeight: 260, objectFit: 'contain', background: '#f8f4f0', borderBottom: '1px solid #f0e8e0', display: 'block' }} />
        )}
        <div className="op-od-section">
          {details === null
            ? <div style={{ fontSize: 12, color: '#aaa' }}>Loading…</div>
            : <>
                {details.dim      && <div className="op-od-val" style={{ marginBottom: 4 }}>📐 {details.dim} cm</div>}
                {details.material && <div className="op-od-val" style={{ marginBottom: 4 }}>🪵 {details.material}</div>}
              </>
          }
          <div className="op-od-val" style={{ marginTop: 8 }}>📦 <strong>{li.stock}</strong> in stock</div>
          <div className="op-od-val" style={{ marginTop: 4, cursor: 'pointer', color: '#e67e22' }}
            onClick={() => setShowOrders(true)}>
            🛒 <strong>{li.orderedQty}</strong> ordered
            <span style={{ fontSize: 11, marginLeft: 6, textDecoration: 'underline' }}>view orders →</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Order Detail Modal ─────────────────────────────────────────────────────
function OrderDetailModal({ order, onClose }: { order: PipelineOrder; onClose: () => void }) {
  return (
    <div className="op-od-overlay open" onClick={onClose}>
      <div className="op-od-box" onClick={e => e.stopPropagation()}>
        <div className="op-od-header">
          <span className="op-od-id">#{order.number}</span>
          <span className="op-od-date">{fmtDate(order.dateCreated)}</span>
          <button className="op-od-close" onClick={onClose}>✕</button>
        </div>
        <div className="op-od-section">
          <div className="op-od-label">Customer</div>
          <div className="op-od-val">{order.customerName}</div>
          {order.customerPhone && <div className="op-od-val">{order.customerPhone}</div>}
          {order.customerAddress && (
            <div className="op-od-val">{[order.customerAddress, order.customerAddress2, order.customerState].filter(Boolean).join(', ')}</div>
          )}
        </div>
        {order.customerNote && (
          <div className="op-od-section">
            <div className="op-od-label">Note</div>
            <div className="op-od-val">{order.customerNote}</div>
          </div>
        )}
        <div className="op-od-section">
          <div className="op-od-label">Items</div>
          <table className="op-od-table">
            <thead><tr><th>Item</th><th>Qty</th><th>Total</th><th>Phase</th></tr></thead>
            <tbody>
              {order.lineItems.map(li => (
                <tr key={li.id}>
                  <td>{li.name}</td>
                  <td>×{li.quantity}</td>
                  <td>{fmtPrice(li.total)}</td>
                  <td style={{ color: '#aaa', fontSize: 11 }}>{li.phase || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="op-od-total">
          <span>Total</span><span>{fmtPrice(order.total)} EGP</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function OrdersPipelinePage() {
  const [tab, setTab]             = useState<Tab>('orders');
  const [groupBy, setGroupBy]     = useState<GroupBy>('order');
  const [orders, setOrders]       = useState<PipelineOrder[]>([]);
  const [phaseGroups, setPhaseGroups] = useState<PhaseGroup[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [sortAsc, setSortAsc]     = useState(false);
  const [noteFilter, setNoteFilter] = useState(false);
  const [stockFilter, setStockFilter] = useState(false);
  const [bulkMode, setBulkMode]   = useState(false);
  const [bulkPhase, setBulkPhase] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [completeMode, setCompleteMode] = useState(false);
  const [cancelMode, setCancelMode]     = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());
  const [prodSort, setProdSort]   = useState<'qty' | 'value'>('qty');
  const [detailOrder, setDetailOrder] = useState<PipelineOrder | null>(null);
  const [productPopup, setProductPopup] = useState<PipelineLineItem | null>(null);
  const [toast, setToast]         = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/pipeline/orders').then(r => r.json()),
      fetch('/api/phase-groups').then(r => r.json()),
    ]).then(([ords, grps]) => {
      if (Array.isArray(ords)) setOrders(ords);
      else setError(ords.error ?? 'Failed to load orders');
      if (Array.isArray(grps)) setPhaseGroups(grps);
      setLoading(false);
    }).catch(e => { setError(e.message); setLoading(false); });
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2500);
  }

  async function handlePhaseChange(orderId: number, liId: number, phase: string) {
    const prev = orders.find(o => o.id === orderId)?.lineItems.find(li => li.id === liId)?.phase ?? '';
    setOrders(os => os.map(o =>
      o.id !== orderId ? o : { ...o, lineItems: o.lineItems.map(li => li.id === liId ? { ...li, phase } : li) }
    ));
    const res = await fetch(`/api/pipeline/orders/${orderId}/phase`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lineItemId: String(liId), phase }),
    });
    if (!res.ok) {
      setOrders(os => os.map(o =>
        o.id !== orderId ? o : { ...o, lineItems: o.lineItems.map(li => li.id === liId ? { ...li, phase: prev } : li) }
      ));
      showToast('Failed to save phase change');
    }
  }

  async function handleBulkApply() {
    if (!bulkPhase || selectedItems.size === 0) return;
    const updates = Array.from(selectedItems).map(key => {
      const [orderId, liId] = key.split('-').map(Number);
      return { orderId, liId };
    });
    for (const { orderId, liId } of updates) await handlePhaseChange(orderId, liId, bulkPhase);
    setSelectedItems(new Set());
    showToast(`Applied "${bulkPhase}" to ${updates.length} items`);
  }

  async function handleStatusAction(action: 'complete' | 'cancel') {
    if (selectedOrders.size === 0) return;
    const ids = Array.from(selectedOrders);
    for (const id of ids) await fetch(`/api/pipeline/orders/${id}/${action}`, { method: 'POST' });
    setOrders(prev => prev.filter(o => !selectedOrders.has(o.id)));
    setSelectedOrders(new Set());
    setCompleteMode(false); setCancelMode(false);
    showToast(`${ids.length} order(s) ${action === 'complete' ? 'completed' : 'cancelled'}`);
  }

  const stockSummary = useMemo(() => {
    const seen = new Map<number, { stock: number; price: number; orderedQty: number }>();
    orders.forEach(o => o.lineItems.forEach(li => {
      if (li.stock > 0 && !seen.has(li.productId))
        seen.set(li.productId, { stock: li.stock, price: li.price, orderedQty: li.orderedQty });
    }));
    let totalStock = 0, sellableValue = 0;
    seen.forEach(({ stock, price, orderedQty }) => {
      totalStock += stock;
      sellableValue += Math.min(stock, orderedQty) * price;
    });
    return { totalStock, sellableValue, productCount: seen.size };
  }, [orders]);

  const visibleOrders = useMemo(() => {
    let list = [...orders];
    if (noteFilter) list = list.filter(o => o.customerNote);
    if (stockFilter) list = list.filter(o => o.lineItems.some(li => li.stock > 0));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.number.includes(q) || o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.includes(q) || o.lineItems.some(li => li.name.toLowerCase().includes(q))
      );
    }
    list.sort((a, b) => sortAsc
      ? new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime()
      : new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime()
    );
    return list;
  }, [orders, noteFilter, stockFilter, search, sortAsc]);

  const totalItems = useMemo(() => visibleOrders.reduce((s, o) => s + o.lineItems.length, 0), [visibleOrders]);
  const totalValue = useMemo(() => visibleOrders.reduce((s, o) => s + o.total, 0), [visibleOrders]);

  function toggleItem(key: string) {
    setSelectedItems(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }
  function toggleGroup(keys: string[]) {
    setSelectedItems(s => {
      const allSel = keys.every(k => s.has(k));
      const n = new Set(s);
      if (allSel) keys.forEach(k => n.delete(k));
      else keys.forEach(k => n.add(k));
      return n;
    });
  }
  function toggleOrder(id: number) {
    setSelectedOrders(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  return (
    <ImageClickCtx.Provider value={setProductPopup}>
    <>
      <style>{`
        /* ── layout ── */
        .op-sub-nav { display:flex; background:#fff; border-bottom:1px solid #e8ddd4; position:sticky; top:64px; z-index:51; }
        .op-sub-btn { font-size:12px; font-weight:700; color:#aaa; background:none; border:none; border-bottom:2px solid transparent; padding:8px 16px; cursor:pointer; }
        .op-sub-btn.active { color:#7A4610; border-bottom-color:#7A4610; }
        .op-badges { display:flex; gap:8px; align-items:center; padding:7px 12px; background:#fff; border-bottom:1px solid #e8ddd4; }
        .op-hbadge { font-size:11px; font-weight:600; padding:2px 9px; border-radius:10px; }
        .op-hbadge.brown { background:#fef3e2; color:#7A4610; }
        .op-hbadge.green { background:#e8f5ee; color:#1a7a3c; }
        .op-content { padding:8px; }
        .op-state { text-align:center; color:#aaa; padding:60px 20px; font-size:14px; }

        /* ── toolbar ── */
        .op-toolbar { display:flex; align-items:center; gap:7px; padding:7px 12px; background:#fff; border-bottom:1px solid #e8ddd4; flex-wrap:wrap; position:sticky; top:98px; z-index:50; }
        .op-tb-label { font-size:10px; font-weight:700; color:#aaa; text-transform:uppercase; letter-spacing:.4px; white-space:nowrap; }
        .op-tb-group { display:flex; align-items:center; gap:6px; }
        .op-toggle { position:relative; width:36px; height:20px; flex-shrink:0; }
        .op-toggle input { opacity:0; width:0; height:0; }
        .op-toggle-slider { position:absolute; inset:0; background:#ddd; border-radius:20px; cursor:pointer; transition:background .2s; }
        .op-toggle input:checked + .op-toggle-slider { background:#7A4610; }
        .op-toggle-slider:before { content:''; position:absolute; width:14px; height:14px; left:3px; top:3px; background:#fff; border-radius:50%; transition:transform .2s; }
        .op-toggle input:checked + .op-toggle-slider:before { transform:translateX(16px); }
        .op-filter-btn { font-size:10px; font-weight:700; padding:3px 10px; border-radius:20px; border:1.5px solid #e8ddd4; background:#fff; color:#888; cursor:pointer; white-space:nowrap; }
        .op-filter-btn.active { background:#7A4610; color:#fff; border-color:#7A4610; }
        .op-filter-btn.stock { border-color:#1a7a3c; color:#1a7a3c; }
        .op-filter-btn.stock.active { background:#1a7a3c; color:#fff; }
        .op-stock-bar { display:flex; align-items:stretch; gap:0; border-bottom:2px solid #b7dfc8; background:#e8f5ee; }
        .op-stock-kpi { flex:1; padding:8px 14px; border-right:1px solid #b7dfc8; }
        .op-stock-kpi:last-child { border-right:none; }
        .op-stock-kpi-label { font-size:10px; font-weight:700; color:#1a7a3c; text-transform:uppercase; letter-spacing:.5px; margin-bottom:2px; }
        .op-stock-kpi-value { font-size:16px; font-weight:700; color:#145a32; }
        .op-view-btn { font-size:11px; font-weight:700; padding:4px 10px; border-radius:20px; border:1.5px solid #e8ddd4; background:#fff; color:#888; cursor:pointer; }
        .op-view-btn.active { background:#7A4610; color:#fff; border-color:#7A4610; }
        .op-sort-btn { font-size:14px; background:none; border:1.5px solid #e8ddd4; border-radius:8px; padding:2px 8px; cursor:pointer; color:#7A4610; }
        .op-bulk-sel { font-size:11px; border:1.5px solid #e8ddd4; border-radius:8px; padding:3px 4px; color:#555; max-width:110px; }
        .op-bulk-apply { font-size:11px; font-weight:700; background:#7A4610; color:#fff; border:none; border-radius:8px; padding:4px 10px; cursor:pointer; white-space:nowrap; }
        .op-bulk-apply:disabled { background:#ccc; cursor:default; }
        .op-search { width:100%; font-size:12px; padding:5px 10px; border:1.5px solid #e8ddd4; border-radius:8px; outline:none; color:#333; flex-basis:100%; }
        .op-prod-sort-btn { font-size:10px; font-weight:700; padding:2px 8px; border-radius:20px; border:1.5px solid #e8ddd4; background:#fff; color:#888; cursor:pointer; }
        .op-prod-sort-btn.active { background:#7A4610; color:#fff; border-color:#7A4610; }
        .op-action-btn { font-size:10px; font-weight:700; padding:3px 10px; border-radius:20px; border:1.5px solid; cursor:pointer; white-space:nowrap; }
        .op-complete-btn { border-color:#1a7a3c; background:#1a7a3c; color:#fff; }
        .op-cancel-btn  { border-color:#c0392b; background:#c0392b; color:#fff; }
        .op-sel-bar { display:flex; align-items:center; gap:8px; padding:7px 12px; border-bottom:1px solid; }
        .op-sel-bar.complete { background:#e8f5ee; border-color:#b7dfc8; }
        .op-sel-bar.cancel  { background:#fdecea; border-color:#f1a9a0; }
        .op-sel-bar-msg { font-size:12px; font-weight:600; flex:1; }
        .op-sel-bar.complete .op-sel-bar-msg { color:#1a7a3c; }
        .op-sel-bar.cancel  .op-sel-bar-msg { color:#c0392b; }
        .op-sel-bar-do { font-size:11px; font-weight:700; border:none; border-radius:8px; padding:5px 14px; cursor:pointer; color:#fff; }
        .op-sel-bar.complete .op-sel-bar-do { background:#1a7a3c; }
        .op-sel-bar.cancel  .op-sel-bar-do { background:#c0392b; }
        .op-sel-bar-x { font-size:12px; background:none; border:none; cursor:pointer; color:#999; padding:0 4px; }

        /* ── order card ── */
        .op-order-card { background:#fff; border:1px solid #e8ddd4; border-radius:8px; margin-bottom:5px; overflow:hidden; }
        .op-order-card.selected { border-color:#7A4610; background:#fef8f2; }
        .op-order-top { display:flex; align-items:center; gap:7px; padding:7px 10px; cursor:pointer; }
        .op-order-top:hover { background:#fdf8f4; }
        .op-order-check { width:16px; height:16px; accent-color:#1a7a3c; flex-shrink:0; cursor:pointer; }
        .op-order-num { font-size:11px; font-weight:700; color:#7A4610; flex-shrink:0; cursor:pointer; }
        .op-order-num:hover { text-decoration:underline; }
        .op-order-name { font-size:13px; font-weight:700; color:#222; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .op-order-total { font-size:13px; font-weight:700; color:#7A4610; flex-shrink:0; white-space:nowrap; }
        .op-wa-link { display:flex; align-items:center; flex-shrink:0; }
        .op-wa-link:hover { opacity:.8; }
        .op-phone-num { font-size:11px; color:#888; flex-shrink:0; white-space:nowrap; }
        .op-call-link { display:flex; align-items:center; flex-shrink:0; }
        .op-call-link:hover { opacity:.7; }
        .op-chevron { font-size:9px; color:#bbb; flex-shrink:0; transition:transform .2s ease; }
        .op-chevron.open { transform:rotate(180deg); }

        /* address row */
        .op-addr-row { display:flex; align-items:center; padding:2px 10px 6px; gap:8px; }
        .op-addr-street { font-size:11px; color:#999; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .op-addr-city { font-size:11px; color:#999; flex:1; text-align:center; }
        .op-addr-state { font-size:11px; font-weight:700; color:#7A4610; flex-shrink:0; white-space:nowrap; }

        /* customer note */
        .op-order-note { font-size:11px; color:#9a7a3c; padding:2px 10px 6px; background:#fffbe6; }

        /* ── item row ── */
        .op-collapsible { display:grid; grid-template-rows:0fr; transition:grid-template-rows .22s ease; }
        .op-collapsible.open { grid-template-rows:1fr; }
        .op-collapsible-inner { overflow:hidden; }
        .op-item-row { display:flex; align-items:center; gap:7px; padding:6px 10px; border-top:1px solid #f5f0eb; }
        .op-item-row.selected { background:#fef3e2; }
        .op-item-check { width:16px; height:16px; accent-color:#7A4610; flex-shrink:0; cursor:pointer; }
        .op-badge { font-size:10px; font-weight:700; color:#fff; background:#7A4610; border-radius:4px; padding:1px 5px; flex-shrink:0; white-space:nowrap; }
        .op-badge.warn   { background:#e67e22; }
        .op-badge.urgent { background:#e74c3c; }
        .op-thumb { width:28px; height:28px; border-radius:5px; object-fit:cover; flex-shrink:0; border:1px solid #e8ddd4; }
        .op-thumb-ph { width:28px; height:28px; border-radius:5px; background:#f0e8e0; flex-shrink:0; }
        .op-item-ref { font-size:10px; color:#aaa; flex-shrink:0; white-space:nowrap; }
        .op-item-name { font-size:12px; font-weight:600; color:#333; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .op-item-qty  { font-size:11px; color:#888; flex-shrink:0; }
        .op-item-stock { font-size:10px; color:#1a7a3c; flex-shrink:0; white-space:nowrap; }
        .op-item-ordered { font-size:10px; color:#e67e22; flex-shrink:0; white-space:nowrap; }
        .op-item-price { font-size:11px; font-weight:700; color:#7A4610; flex-shrink:0; }
        .op-phase-sel { font-size:11px; border:1px solid #e8ddd4; border-radius:6px; padding:2px 4px; color:#555; flex-shrink:0; max-width:110px; }

        /* ── phase / product groups ── */
        .op-phase-group, .op-product-group { background:#fff; border:1px solid #e8ddd4; border-radius:10px; margin-bottom:7px; overflow:hidden; }
        .op-phase-header { display:flex; align-items:center; gap:9px; padding:9px 12px; cursor:pointer; border-left:4px solid #ccc; }
        .op-phase-header:hover { background:#fdf8f4; }
        .op-phase-name { font-size:13px; font-weight:700; color:#7A4610; flex:1; }
        .op-phase-meta { font-size:11px; color:#aaa; }
        .op-phase-count { font-size:11px; font-weight:700; color:#7A4610; background:#fef3e2; border-radius:10px; padding:2px 8px; }
        .op-product-header { display:flex; align-items:center; gap:9px; padding:9px 12px; cursor:pointer; }
        .op-product-header:hover { background:#fdf8f4; }
        .op-product-name { font-size:13px; font-weight:700; color:#333; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .op-product-count { font-size:11px; font-weight:700; color:#7A4610; background:#fef3e2; border-radius:10px; padding:2px 8px; white-space:nowrap; }
        .op-product-value { font-size:11px; color:#aaa; flex-shrink:0; }

        /* ── order detail modal ── */
        .op-od-overlay { position:fixed; inset:0; background:rgba(0,0,0,.6); z-index:400; display:flex; align-items:flex-start; justify-content:center; padding:20px; overflow-y:auto; }
        .op-od-box { background:#fff; border-radius:14px; width:100%; max-width:480px; overflow:hidden; margin:auto; }
        .op-od-header { background:#7A4610; color:#fff; padding:12px 16px; display:flex; align-items:center; gap:10px; }
        .op-od-id { font-size:13px; font-weight:700; }
        .op-od-date { font-size:11px; opacity:.75; margin-left:auto; }
        .op-od-close { background:none; border:none; color:#fff; font-size:18px; cursor:pointer; padding:0 2px; }
        .op-od-section { padding:10px 16px; border-bottom:1px solid #f0e8e0; }
        .op-od-label { font-size:10px; color:#aaa; font-weight:700; text-transform:uppercase; letter-spacing:.4px; margin-bottom:4px; }
        .op-od-val { font-size:12px; color:#333; }
        .op-od-table { width:100%; border-collapse:collapse; font-size:11px; }
        .op-od-table th { text-align:left; color:#aaa; font-weight:700; font-size:10px; text-transform:uppercase; padding:4px 6px; border-bottom:1px solid #f0e8e0; }
        .op-od-table td { padding:5px 6px; border-bottom:1px solid #f8f4f0; vertical-align:top; }
        .op-od-table tr:last-child td { border-bottom:none; }
        .op-od-total { display:flex; justify-content:space-between; padding:10px 16px; background:#fef3e2; font-size:13px; font-weight:700; color:#7A4610; }

        /* ── toast ── */
        .op-toast { position:fixed; bottom:80px; left:50%; transform:translateX(-50%); background:#333; color:#fff; font-size:12px; font-weight:600; padding:8px 18px; border-radius:20px; z-index:500; pointer-events:none; white-space:nowrap; }

        /* ── wip chart ── */
        .op-wip-kpi { background:#fff; border:1px solid #e8ddd4; border-radius:8px; padding:10px 14px; flex:1; min-width:120px; }
        .op-wip-kpi-label { font-size:10px; color:#999; text-transform:uppercase; letter-spacing:.5px; }
        .op-wip-kpi-value { font-size:20px; font-weight:700; color:#7A4610; margin-top:3px; }
        .op-wip-group { background:#fff; border:1px solid #e8ddd4; border-radius:8px; margin-bottom:6px; overflow:hidden; }
        .op-wip-group-header { display:flex; align-items:center; gap:8px; padding:10px 12px; cursor:pointer; border-left:4px solid #ccc; }
        .op-wip-group-header:hover { background:#fdf8f4; }
        .op-wip-group-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
        .op-wip-group-name { font-size:13px; font-weight:700; color:#7A4610; flex:1; }
        .op-wip-group-stat { font-size:11px; font-weight:700; color:#7A4610; background:#fef3e2; border-radius:10px; padding:2px 8px; white-space:nowrap; }
        .op-wip-group-val { font-size:11px; color:#555; white-space:nowrap; }
        .op-wip-group-ord { font-size:11px; color:#aaa; white-space:nowrap; }
        .op-wip-group-body { border-top:1px solid #f5f0eb; }
        .op-wip-phase-row { display:flex; align-items:center; gap:8px; padding:7px 12px 7px 28px; border-bottom:1px solid #f8f4f0; }
        .op-wip-phase-row:last-child { border-bottom:none; }
        .op-wip-phase-name { font-size:12px; color:#555; flex:1; }
        .op-wip-phase-stat { font-size:11px; color:#888; white-space:nowrap; }
        .op-wip-phase-val { font-size:11px; color:#7A4610; font-weight:600; white-space:nowrap; }
        .op-wip-phase-ord { font-size:11px; color:#aaa; white-space:nowrap; }
      `}</style>

      {/* Sub-nav */}
      <div className="op-sub-nav">
        {(['orders','wip'] as Tab[]).map(t => (
          <button key={t} className={`op-sub-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t === 'orders' ? 'Orders' : 'WIP Chart'}
          </button>
        ))}
      </div>

      {tab === 'wip' ? (
        <WipChart orders={orders} phaseGroups={phaseGroups} onPhaseChange={handlePhaseChange} />
      ) : (
        <>
          {/* Badges */}
          <div className="op-badges">
            <span className="op-hbadge brown">{totalItems} items · {visibleOrders.length} orders</span>
            <span className="op-hbadge green">{fmtPrice(totalValue)} EGP</span>
          </div>

          {/* Toolbar */}
          <div className="op-toolbar">
            <div className="op-tb-group">
              <span className="op-tb-label">Bulk</span>
              <label className="op-toggle">
                <input type="checkbox" checked={bulkMode} onChange={e => { setBulkMode(e.target.checked); if (!e.target.checked) setSelectedItems(new Set()); }} />
                <span className="op-toggle-slider" />
              </label>
              {bulkMode && (
                <>
                  <select className="op-bulk-sel" value={bulkPhase} onChange={e => setBulkPhase(e.target.value)}>
                    <option value="">— phase —</option>
                    {phaseGroups.map(g => (
                      <optgroup key={g.id} label={g.label}>
                        {g.phases.map(p => <option key={p} value={p}>{p}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <button className="op-bulk-apply" disabled={!bulkPhase || selectedItems.size === 0} onClick={handleBulkApply}>
                    Apply ({selectedItems.size})
                  </button>
                </>
              )}
              <button className={`op-filter-btn${noteFilter ? ' active' : ''}`} onClick={() => setNoteFilter(f => !f)}>📝 Notes</button>
            </div>

            <div className="op-tb-group" style={{ flexBasis: '100%', flexWrap: 'wrap', gap: 5 }}>
              <span className="op-tb-label">Group</span>
              {(['order','phase','product'] as GroupBy[]).map(v => (
                <button key={v} className={`op-view-btn${groupBy === v ? ' active' : ''}`} onClick={() => setGroupBy(v)}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
              <button className="op-sort-btn" onClick={() => setSortAsc(s => !s)}>{sortAsc ? '↑' : '↓'}</button>
              {groupBy === 'product' && (
                <>
                  <button className={`op-prod-sort-btn${prodSort === 'qty' ? ' active' : ''}`} onClick={() => setProdSort('qty')}>Qty</button>
                  <button className={`op-prod-sort-btn${prodSort === 'value' ? ' active' : ''}`} onClick={() => setProdSort('value')}>$</button>
                </>
              )}
              {groupBy === 'order' && (
                <>
                  <button className={`op-action-btn op-complete-btn`} onClick={() => { setCompleteMode(m => !m); setCancelMode(false); setSelectedOrders(new Set()); }}>✓ Complete</button>
                  <button className={`op-action-btn op-cancel-btn`} onClick={() => { setCancelMode(m => !m); setCompleteMode(false); setSelectedOrders(new Set()); }}>✕ Cancel</button>
                </>
              )}
            </div>

            <div className="op-tb-group" style={{ flexBasis: '100%' }}>
              <button className={`op-filter-btn stock${stockFilter ? ' active' : ''}`} onClick={() => setStockFilter(f => !f)}>📦 In Stock</button>
            </div>

            <input type="search" className="op-search" placeholder="Search item, order #, customer or phone…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Stock summary bar */}
          {stockFilter && (
            <div className="op-stock-bar">
              <div className="op-stock-kpi">
                <div className="op-stock-kpi-label">Products in Stock</div>
                <div className="op-stock-kpi-value">{stockSummary.productCount}</div>
              </div>
              <div className="op-stock-kpi">
                <div className="op-stock-kpi-label">Units in Stock</div>
                <div className="op-stock-kpi-value">{stockSummary.totalStock}</div>
              </div>
              <div className="op-stock-kpi">
                <div className="op-stock-kpi-label">Sellable Value</div>
                <div className="op-stock-kpi-value">{fmtPrice(stockSummary.sellableValue)} EGP</div>
              </div>
            </div>
          )}

          {/* Complete / Cancel bar */}
          {(completeMode || cancelMode) && (
            <div className={`op-sel-bar ${completeMode ? 'complete' : 'cancel'}`}>
              <span className="op-sel-bar-msg">
                {selectedOrders.size > 0 ? `${selectedOrders.size} selected` : `Select orders to ${completeMode ? 'complete' : 'cancel'}`}
              </span>
              {selectedOrders.size > 0 && (
                <button className="op-sel-bar-do" onClick={() => handleStatusAction(completeMode ? 'complete' : 'cancel')}>
                  {completeMode ? 'Mark Completed' : 'Mark Cancelled'}
                </button>
              )}
              <button className="op-sel-bar-x" onClick={() => { setCompleteMode(false); setCancelMode(false); setSelectedOrders(new Set()); }}>✕</button>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="op-state">Loading orders…</div>
          ) : error ? (
            <div className="op-state" style={{ color: '#e74c3c' }}>{error}</div>
          ) : visibleOrders.length === 0 ? (
            <div className="op-state">No orders found</div>
          ) : (
            <div className="op-content">
              {groupBy === 'order' && (
                <OrderView orders={visibleOrders} groups={phaseGroups} bulkMode={bulkMode}
                  selectedItems={selectedItems} completeMode={completeMode} cancelMode={cancelMode}
                  selectedOrders={selectedOrders} onToggleItem={toggleItem}
                  onPhaseChange={handlePhaseChange} onToggleOrder={toggleOrder}
                  onToggleGroup={toggleGroup} onOpenDetail={setDetailOrder} />
              )}
              {groupBy === 'phase' && (
                <PhaseView orders={visibleOrders} groups={phaseGroups} bulkMode={bulkMode}
                  selectedItems={selectedItems} onToggleItem={toggleItem}
                  onToggleGroup={toggleGroup} onPhaseChange={handlePhaseChange} />
              )}
              {groupBy === 'product' && (
                <ProductView orders={visibleOrders} groups={phaseGroups} bulkMode={bulkMode}
                  selectedItems={selectedItems} prodSort={prodSort} onToggleItem={toggleItem}
                  onToggleGroup={toggleGroup} onPhaseChange={handlePhaseChange} />
              )}
            </div>
          )}
        </>
      )}

      {detailOrder && <OrderDetailModal order={detailOrder} onClose={() => setDetailOrder(null)} />}
      {productPopup && <ProductPopup li={productPopup} orders={orders} onClose={() => setProductPopup(null)} />}
      {toast && <div className="op-toast">{toast}</div>}
    </>
    </ImageClickCtx.Provider>
  );
}
