'use client';

import { useState } from 'react';
import type { PipelineOrder, PipelineLineItem } from '@/app/api/pipeline/orders/route';

// ── Shared types & utilities ───────────────────────────────────────────────

export interface PhaseGroup {
  id: string;
  label: string;
  color: string;
  sort_order: number;
  phases: string[];
}

export function fmtPrice(n: number) {
  return n.toLocaleString('en-EG', { maximumFractionDigits: 0 });
}

export function daysBadgeClass(days: number) {
  if (days >= 15) return 'poc-days urgent';
  if (days >= 8)  return 'poc-days warn';
  return 'poc-days';
}

export function waPhone(raw: string) {
  let p = raw.replace(/[^0-9]/g, '');
  if (p.startsWith('0')) p = '20' + p.slice(1);
  return p;
}

export function PhaseSelect({ groups, value, onChange }: {
  groups: PhaseGroup[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <select className="poc-phase-sel" value={value} onChange={e => onChange(e.target.value)}
      onClick={e => e.stopPropagation()}>
      <option value="">— phase —</option>
      {groups.map(g => (
        <optgroup key={g.id} label={g.label}>
          {g.phases.map(p => <option key={p} value={p}>{p}</option>)}
        </optgroup>
      ))}
    </select>
  );
}

// ── Internal sub-components ────────────────────────────────────────────────

export function GroupCheckbox({ keys, selectedItems, onToggleGroup }: {
  keys: string[]; selectedItems: Set<string>; onToggleGroup: (keys: string[]) => void;
}) {
  const allSel = keys.length > 0 && keys.every(k => selectedItems.has(k));
  const someSel = keys.some(k => selectedItems.has(k));
  return (
    <input type="checkbox" className="poc-check" checked={allSel}
      ref={el => { if (el) el.indeterminate = someSel && !allSel; }}
      onChange={() => onToggleGroup(keys)} onClick={e => e.stopPropagation()} />
  );
}

export function ItemRow({ li, orderNum, liIndex, daysOpen, groups, bulkMode, selected, onToggle, onPhaseChange, onImageClick }: {
  li: PipelineLineItem; orderNum: string; liIndex: number; daysOpen: number;
  groups: PhaseGroup[]; bulkMode: boolean; selected: boolean;
  onToggle: () => void; onPhaseChange: (v: string) => void;
  onImageClick?: (li: PipelineLineItem) => void;
}) {
  const ref = `${orderNum}.${liIndex}`;
  return (
    <div className={`poc-item${selected ? ' selected' : ''}`} onClick={bulkMode ? onToggle : undefined}>
      {bulkMode && (
        <input type="checkbox" className="poc-check" checked={selected}
          onChange={onToggle} onClick={e => e.stopPropagation()} />
      )}
      {li.imageUrl
        ? <img src={li.imageUrl} alt="" className="poc-thumb" style={{ cursor: onImageClick ? 'pointer' : undefined }}
            onClick={e => { e.stopPropagation(); onImageClick?.(li); }} />
        : <div className="poc-thumb-ph" style={{ cursor: onImageClick ? 'pointer' : undefined }}
            onClick={e => { e.stopPropagation(); onImageClick?.(li); }} />
      }
      <span className={daysBadgeClass(daysOpen)}>{daysOpen}d</span>
      <span className="poc-ref">{ref}</span>
      <span className="poc-item-name">{li.name}</span>
      <span className="poc-qty">×{li.quantity}</span>
      <span className="poc-stock" title="In stock">📦{li.stock}</span>
      <span className="poc-ordered" title="Total ordered">🛒{li.orderedQty}</span>
      <span className="poc-price">{fmtPrice(li.total)}</span>
      <PhaseSelect groups={groups} value={li.phase} onChange={onPhaseChange} />
    </div>
  );
}

function OrderCard({ o, groups, items, isOpen, onToggleOpen, bulkMode, selectedItems,
  onToggleItem, onToggleGroup, onPhaseChange, completeMode, cancelMode,
  isSelected, onToggleOrder, onOpenDetail, accentColor, onImageClick }: {
  o: PipelineOrder; groups: PhaseGroup[]; items: PipelineLineItem[];
  isOpen: boolean; onToggleOpen: () => void;
  bulkMode: boolean; selectedItems: Set<string>;
  onToggleItem: (k: string) => void; onToggleGroup: (keys: string[]) => void;
  onPhaseChange: (orderId: number, liId: number, phase: string) => void;
  completeMode: boolean; cancelMode: boolean; isSelected: boolean;
  onToggleOrder: () => void; onOpenDetail: () => void;
  accentColor?: string; onImageClick?: (li: PipelineLineItem) => void;
}) {
  const wp = o.customerPhone ? waPhone(o.customerPhone) : '';
  const groupKeys = items.map(li => `${o.id}-${li.id}`);
  return (
    <div className={`poc-card${isSelected ? ' selected' : ''}`}>
      <div className="poc-header" onClick={onToggleOpen}>
        {(completeMode || cancelMode) && (
          <input type="checkbox" className="poc-check" checked={isSelected}
            onChange={onToggleOrder} onClick={e => e.stopPropagation()} />
        )}
        {bulkMode && (
          <GroupCheckbox keys={groupKeys} selectedItems={selectedItems} onToggleGroup={onToggleGroup} />
        )}
        <span className={daysBadgeClass(o.daysOpen)}>{o.daysOpen}d</span>
        <span className="poc-num" onClick={e => { e.stopPropagation(); onOpenDetail(); }}>
          #{o.number}
        </span>
        <span className="poc-name">{o.customerName}</span>
        <span className="poc-total">{fmtPrice(o.total)}</span>
        {wp && (
          <>
            <a href={`https://wa.me/${wp}`} className="poc-wa" onClick={e => e.stopPropagation()} target="_blank" rel="noreferrer" title="WhatsApp">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </a>
            <span className="poc-phone">{o.customerPhone}</span>
            <a href={`tel:${o.customerPhone}`} className="poc-call" onClick={e => e.stopPropagation()} title="Call">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7A4610" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/>
              </svg>
            </a>
          </>
        )}
        <span className={`poc-chevron${isOpen ? ' open' : ''}`}>▼</span>
      </div>

      {(o.customerAddress || o.customerAddress2 || o.customerCity || o.customerState) && (
        <div className="poc-addr">
          <span className="poc-addr-street">{o.customerAddress}</span>
          <span className="poc-addr-city">{o.customerAddress2}</span>
          <span className="poc-addr-state">{o.customerState}</span>
        </div>
      )}

      {o.customerNote && (
        <div className="poc-note">📝 {o.customerNote}</div>
      )}

      <div className={`poc-items${isOpen ? ' open' : ''}`}>
        <div className="poc-items-inner">
          {items.map((li, idx) => {
            const key = `${o.id}-${li.id}`;
            return (
              <ItemRow key={li.id} li={li} orderNum={o.number} liIndex={idx + 1}
                daysOpen={o.daysOpen} groups={groups} bulkMode={bulkMode}
                selected={selectedItems.has(key)}
                onToggle={() => onToggleItem(key)}
                onPhaseChange={v => onPhaseChange(o.id, li.id, v)}
                onImageClick={onImageClick}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── CSS ────────────────────────────────────────────────────────────────────

const STYLES = `
  .poc-card { background:#fff; border:1px solid #e8ddd4; border-radius:8px; margin-bottom:5px; overflow:hidden; }
  .poc-card.selected { border-color:#7A4610; background:#fef8f2; }
  .poc-header { display:flex; align-items:center; gap:7px; padding:7px 10px; cursor:pointer; }
  .poc-header:hover { background:#fdf8f4; }
  .poc-days { font-size:10px; font-weight:700; color:#fff; background:#7A4610; border-radius:4px; padding:1px 5px; flex-shrink:0; white-space:nowrap; }
  .poc-days.warn { background:#e67e22; }
  .poc-days.urgent { background:#e74c3c; }
  .poc-num { font-size:11px; font-weight:700; color:#7A4610; flex-shrink:0; cursor:pointer; }
  .poc-num:hover { text-decoration:underline; }
  .poc-name { font-size:13px; font-weight:700; color:#222; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .poc-total { font-size:13px; font-weight:700; color:#7A4610; flex-shrink:0; white-space:nowrap; }
  .poc-wa { display:flex; align-items:center; flex-shrink:0; }
  .poc-wa:hover { opacity:.8; }
  .poc-phone { font-size:11px; color:#888; flex-shrink:0; white-space:nowrap; }
  .poc-call { display:flex; align-items:center; flex-shrink:0; }
  .poc-call:hover { opacity:.7; }
  .poc-chevron { font-size:9px; color:#bbb; flex-shrink:0; transition:transform .2s ease; }
  .poc-chevron.open { transform:rotate(180deg); }
  .poc-addr { display:flex; align-items:center; padding:2px 10px 6px; gap:8px; }
  .poc-addr-street { font-size:11px; color:#999; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .poc-addr-city { font-size:11px; color:#999; flex:1; text-align:center; }
  .poc-addr-state { font-size:11px; font-weight:700; color:#7A4610; flex-shrink:0; white-space:nowrap; }
  .poc-note { font-size:11px; color:#9a7a3c; padding:2px 10px 6px; background:#fffbe6; }
  .poc-items { display:grid; grid-template-rows:0fr; transition:grid-template-rows .22s ease; }
  .poc-items.open { grid-template-rows:1fr; }
  .poc-items-inner { overflow:hidden; }
  .poc-item { display:flex; align-items:center; gap:7px; padding:6px 10px; border-top:1px solid #f5f0eb; }
  .poc-item.selected { background:#fef3e2; }
  .poc-check { width:16px; height:16px; accent-color:#7A4610; flex-shrink:0; cursor:pointer; }
  .poc-thumb { width:28px; height:28px; border-radius:5px; object-fit:cover; flex-shrink:0; border:1px solid #e8ddd4; }
  .poc-thumb-ph { width:28px; height:28px; border-radius:5px; background:#f0e8e0; flex-shrink:0; }
  .poc-ref { font-size:10px; color:#aaa; flex-shrink:0; white-space:nowrap; }
  .poc-item-name { font-size:12px; font-weight:600; color:#333; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .poc-qty { font-size:11px; color:#888; flex-shrink:0; }
  .poc-stock { font-size:10px; color:#1a7a3c; flex-shrink:0; white-space:nowrap; }
  .poc-ordered { font-size:10px; color:#e67e22; flex-shrink:0; white-space:nowrap; }
  .poc-price { font-size:11px; font-weight:700; color:#7A4610; flex-shrink:0; }
  .poc-phase-sel { font-size:11px; border:1px solid #e8ddd4; border-radius:6px; padding:2px 4px; color:#555; flex-shrink:0; max-width:110px; }
`;

// ── PipelineOrderList (public default export) ──────────────────────────────

export interface PipelineOrderListProps {
  orders: PipelineOrder[];
  groups: PhaseGroup[];
  filterLineItems?: (o: PipelineOrder, li: PipelineLineItem) => boolean;
  defaultOpen?: boolean;
  accentColor?: string;
  bulkMode?: boolean;
  selectedItems?: Set<string>;
  onToggleItem?: (k: string) => void;
  onToggleGroup?: (keys: string[]) => void;
  onPhaseChange: (orderId: number, liId: number, phase: string) => void;
  completeMode?: boolean;
  cancelMode?: boolean;
  selectedOrders?: Set<number>;
  onToggleOrder?: (id: number) => void;
  onOpenDetail?: (o: PipelineOrder) => void;
  onImageClick?: (li: PipelineLineItem) => void;
}

export default function PipelineOrderList({
  orders, groups, filterLineItems, defaultOpen = false,
  bulkMode = false, selectedItems = new Set(), onToggleItem = () => {},
  onToggleGroup = () => {}, onPhaseChange,
  completeMode = false, cancelMode = false,
  selectedOrders = new Set(), onToggleOrder = () => {},
  onOpenDetail, onImageClick,
}: PipelineOrderListProps) {
  const [open, setOpen] = useState<Set<number>>(() =>
    defaultOpen ? new Set(orders.map(o => o.id)) : new Set()
  );

  function toggleOpen(id: number) {
    setOpen(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  return (
    <>
      <style>{STYLES}</style>
      {orders.map(o => {
        const items = filterLineItems ? o.lineItems.filter(li => filterLineItems(o, li)) : o.lineItems;
        if (items.length === 0) return null;
        return (
          <OrderCard key={o.id}
            o={o} groups={groups} items={items}
            isOpen={open.has(o.id)}
            onToggleOpen={() => toggleOpen(o.id)}
            bulkMode={bulkMode} selectedItems={selectedItems}
            onToggleItem={onToggleItem}
            onToggleGroup={onToggleGroup}
            onPhaseChange={onPhaseChange}
            completeMode={completeMode} cancelMode={cancelMode}
            isSelected={selectedOrders.has(o.id)}
            onToggleOrder={() => onToggleOrder(o.id)}
            onOpenDetail={() => onOpenDetail?.(o)}
            onImageClick={onImageClick}
          />
        );
      })}
    </>
  );
}
