'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { PipelineOrder } from '@/app/api/pipeline/orders/route';
import OrderDetailSheet from '@/components/shared/OrderDetailSheet';

interface JoMtoOrder {
  orderId: number;
  customer: string;
  qty: number;
  lineItemIds: number[];
}

interface JoProduct {
  productId: number;
  name: string;
  image: string;
  stock: number;
  orderedQty: number;
  mtoQty: number;
  price: number;
  orders: JoMtoOrder[];
}

interface MtsOnlyItem {
  productId: number;
  name: string;
  image: string;
  qty: number;
  price: number;
}

interface SearchProduct {
  id: number;
  name: string;
  image: string;
  material: string;
  price: number;
}

interface StoredJOItem {
  product_id: number;
  product_name: string;
  image: string;
  stock_qty: number;
  total_ordered_qty: number;
  mto: { qty: number; orders: { order_id: number; customer: string; qty: number }[] };
  mts: { qty: number };
  total_qty: number;
}

interface StoredJO {
  id: string;
  ref: string;
  status: 'open' | 'done';
  items: StoredJOItem[];
  created_at: string;
}

function fmtPrice(n: number) {
  return n.toLocaleString('en-EG', { maximumFractionDigits: 0 });
}

function fmtVal(v: number) {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1_000) return Math.round(v / 1_000) + 'K';
  return String(Math.round(v));
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function JobOrdersPage() {
  const [orders, setOrders]         = useState<PipelineOrder[]>([]);
  const [history, setHistory]       = useState<StoredJO[]>([]);
  const [activeTab, setActiveTab]   = useState<'new' | 'history'>('new');
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast]           = useState('');

  // New JO
  const [excludedPids, setExcludedPids]               = useState<Set<number>>(new Set());
  const [excludedOrdersByPid, setExcludedOrdersByPid] = useState<Record<number, Set<number>>>({});
  const [mtsQtyMap, setMtsQtyMap]                     = useState<Record<number, number>>({});
  const [mtsOnly, setMtsOnly]                         = useState<MtsOnlyItem[]>([]);
  const [expandedPids, setExpandedPids]               = useState<Set<number>>(new Set());

  // Product search (all products loaded once on mount, filtered client-side)
  const [productQuery, setProductQuery] = useState('');
  const [allProducts, setAllProducts]   = useState<SearchProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  // History
  const [expandedJos, setExpandedJos] = useState<Set<string>>(new Set());
  const [editingJo, setEditingJo]     = useState<StoredJO | null>(null);
  const [editItems, setEditItems]     = useState<StoredJOItem[]>([]);
  const [saving, setSaving]           = useState(false);

  // Ordered-orders modal
  const [orderedModal, setOrderedModal] = useState<{ productId: number; name: string } | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadOrders();

    fetch('/api/products/search')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setAllProducts(data); })
      .catch(() => {})
      .finally(() => setProductsLoading(false));

    loadHistory();
  }, []);

  function loadOrders() {
    setLoadingOrders(true);
    fetch('/api/pipeline/orders')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setOrders(data); })
      .catch(() => {})
      .finally(() => setLoadingOrders(false));
  }

  function loadHistory() {
    setLoadingHistory(true);
    fetch('/api/job-orders')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setHistory(data); })
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2500);
  }

  const joProducts = useMemo<JoProduct[]>(() => {
    const map = new Map<number, JoProduct>();
    orders.forEach(order => {
      order.lineItems
        .filter(li => li.phase === 'JO preparation')
        .forEach(li => {
          if (excludedPids.has(li.productId)) return;
          if (excludedOrdersByPid[li.productId]?.has(order.id)) return;
          if (!map.has(li.productId)) {
            map.set(li.productId, {
              productId: li.productId, name: li.name, image: li.imageUrl,
              stock: li.stock, orderedQty: li.orderedQty, mtoQty: 0, price: li.price, orders: [],
            });
          }
          const prod = map.get(li.productId)!;
          prod.mtoQty += li.quantity;
          const existOrd = prod.orders.find(o => o.orderId === order.id);
          if (existOrd) {
            existOrd.qty += li.quantity;
            existOrd.lineItemIds.push(li.id);
          } else {
            prod.orders.push({ orderId: order.id, customer: order.customerName, qty: li.quantity, lineItemIds: [li.id] });
          }
        });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [orders, excludedPids, excludedOrdersByPid]);

  const summary = useMemo(() => {
    let units = 0, joValue = 0, mtsValue = 0;
    joProducts.forEach(p => {
      const mtsQty = mtsQtyMap[p.productId] ?? 0;
      units   += p.mtoQty + mtsQty;
      joValue += (p.mtoQty + mtsQty) * p.price;
      mtsValue += mtsQty * p.price;
    });
    mtsOnly.forEach(p => {
      units    += p.qty;
      joValue  += p.qty * p.price;
      mtsValue += p.qty * p.price;
    });
    const mtsPct = joValue > 0 ? Math.round((mtsValue / joValue) * 100) : 0;
    return { products: joProducts.length + mtsOnly.length, units, joValue, mtsValue, mtsPct };
  }, [joProducts, mtsOnly, mtsQtyMap]);

  const ordersWithProduct = useMemo(() => {
    if (!orderedModal) return [];
    return orders.flatMap(o => {
      const item = o.lineItems.find(li => li.productId === orderedModal.productId);
      return item ? [{ o, item }] : [];
    });
  }, [orders, orderedModal]);

  const visibleProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return allProducts;
    return allProducts.filter(p =>
      p.name.toLowerCase().includes(q) || p.material.toLowerCase().includes(q)
    );
  }, [allProducts, productQuery]);

  function removeProduct(pid: number) {
    setExcludedPids(s => new Set([...s, pid]));
  }

  function removeOrder(pid: number, orderId: number) {
    setExcludedOrdersByPid(prev => {
      const s = new Set(prev[pid] ?? []);
      s.add(orderId);
      // if all orders excluded, also exclude the product
      const prod = joProducts.find(p => p.productId === pid);
      const remaining = prod?.orders.filter(o => !s.has(o.orderId)) ?? [];
      if (remaining.length === 0) {
        setExcludedPids(ep => new Set([...ep, pid]));
      }
      return { ...prev, [pid]: s };
    });
  }

  function setMtsQty(pid: number, qty: number) {
    setMtsQtyMap(prev => ({ ...prev, [pid]: Math.max(0, qty) }));
  }

  function addMtsProduct(prod: SearchProduct) {
    if (mtsOnly.find(p => p.productId === prod.id)) return;
    if (joProducts.find(p => p.productId === prod.id)) return;
    setMtsOnly(prev => [...prev, { productId: prod.id, name: prod.name, image: prod.image, qty: 1, price: prod.price }]);
    setProductQuery('');
  }

  function togglePid(pid: number) {
    setExpandedPids(s => { const n = new Set(s); n.has(pid) ? n.delete(pid) : n.add(pid); return n; });
  }

  function toggleJo(id: string) {
    setExpandedJos(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function submitJO() {
    if (summary.products === 0) return;
    setSubmitting(true);
    const items: StoredJOItem[] = [
      ...joProducts.map(p => ({
        product_id: p.productId, product_name: p.name, image: p.image,
        stock_qty: p.stock, total_ordered_qty: p.orderedQty,
        mto: { qty: p.mtoQty, orders: p.orders.map(o => ({ order_id: o.orderId, customer: o.customer, qty: o.qty })) },
        mts: { qty: mtsQtyMap[p.productId] ?? 0 },
        total_qty: p.mtoQty + (mtsQtyMap[p.productId] ?? 0),
      })),
      ...mtsOnly.map(p => ({
        product_id: p.productId, product_name: p.name, image: p.image,
        stock_qty: 0, total_ordered_qty: 0,
        mto: { qty: 0, orders: [] },
        mts: { qty: p.qty }, total_qty: p.qty,
      })),
    ];
    const nextNum = String(history.length + 1).padStart(3, '0');
    const ref = `JO_${nextNum}`;
    try {
      const res = await fetch('/api/job-orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref, items }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }
      // Advance MTO line items to "JO Released"
      const phaseUpdates: Promise<unknown>[] = [];
      joProducts.forEach(prod => prod.orders.forEach(ord => ord.lineItemIds.forEach(liId => {
        phaseUpdates.push(fetch(`/api/pipeline/orders/${ord.orderId}/phase`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lineItemId: String(liId), phase: 'JO Released' }),
        }));
      })));
      await Promise.all(phaseUpdates);
      showToast(`${ref} created`);
      setActiveTab('history');
      loadHistory();
      loadOrders();
      setExcludedPids(new Set());
      setExcludedOrdersByPid({});
      setMtsQtyMap({});
      setMtsOnly([]);
    } catch (e: any) {
      showToast('Error: ' + e.message);
    }
    setSubmitting(false);
  }

  async function deleteJO(id: string) {
    if (!window.confirm('Delete this Job Order?')) return;
    const res = await fetch(`/api/job-orders/${id}`, { method: 'DELETE' });
    if (res.ok) { setHistory(prev => prev.filter(jo => jo.id !== id)); showToast('JO deleted'); }
    else showToast('Failed to delete');
  }

  async function toggleStatus(jo: StoredJO) {
    const newStatus = jo.status === 'open' ? 'done' : 'open';
    const res = await fetch(`/api/job-orders/${jo.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) setHistory(prev => prev.map(j => j.id === jo.id ? { ...j, status: newStatus } : j));
  }

  function openEdit(jo: StoredJO) {
    setEditingJo(jo);
    setEditItems(JSON.parse(JSON.stringify(jo.items)));
  }

  async function saveEdit() {
    if (!editingJo) return;
    setSaving(true);
    const res = await fetch(`/api/job-orders/${editingJo.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: editItems }),
    });
    if (res.ok) {
      const updated = await res.json();
      setHistory(prev => prev.map(j => j.id === editingJo.id ? updated : j));
      setEditingJo(null);
      showToast('JO updated');
    } else showToast('Failed to save');
    setSaving(false);
  }

  return (
    <>
      <style>{`
        .jo-nav { display:flex; background:#fff; border-bottom:2px solid #e8ddd4; position:sticky; top:64px; z-index:51; }
        .jo-nav-btn { flex:1; font-size:12px; font-weight:700; color:#aaa; background:none; border:none; border-bottom:3px solid transparent; padding:10px 18px; cursor:pointer; margin-bottom:-2px; transition:color .15s,border-color .15s; }
        .jo-nav-btn.active { color:#7A4610; border-bottom-color:#7A4610; }
        .jo-badge { font-size:10px; background:#f0e8e0; color:#888; border-radius:10px; padding:1px 6px; margin-left:4px; }
        .jo-nav-btn.active .jo-badge { background:#7A4610; color:#fff; }

        .jo-toolbar { display:flex; gap:6px; flex-wrap:wrap; align-items:center; padding:7px 12px; background:#fff; border-bottom:1px solid #e8ddd4; position:sticky; top:98px; z-index:50; }
        .jo-chip { font-size:10px; color:#666; background:#f5f0eb; border:1px solid #e8ddd4; border-radius:7px; padding:3px 7px; white-space:nowrap; }
        .jo-chip strong { color:#333; font-weight:800; }
        .jo-chip.jo-val { background:#fef3e2; border-color:#f0d8c0; color:#7A4610; }
        .jo-chip.jo-val strong { color:#7A4610; }
        .jo-chip.mts-val { background:#e8f5ee; border-color:#b7dfc8; color:#1a7a3c; }
        .jo-chip.mts-val strong { color:#1a7a3c; }
        .jo-toolbar-sep { width:1px; height:16px; background:#e8ddd4; flex-shrink:0; }

        .jo-wrap { padding:8px; padding-bottom:130px; }
        .jo-empty { text-align:center; color:#aaa; padding:60px 20px; font-size:14px; }

        .jo-prod-card { background:#fff; border:1px solid #e8ddd4; border-radius:8px; margin-bottom:8px; overflow:hidden; }
        .jo-card-top { display:flex; align-items:center; gap:8px; padding:10px 12px; cursor:pointer; user-select:none; }
        .jo-card-top:hover { background:#fdf8f4; }
        .jo-thumb { width:40px; height:40px; border-radius:6px; object-fit:cover; border:1px solid #e8ddd4; flex-shrink:0; }
        .jo-thumb-ph { width:40px; height:40px; border-radius:6px; background:#f0e8e0; flex-shrink:0; }
        .jo-prod-info { flex:1; min-width:0; }
        .jo-prod-name { font-size:12px; font-weight:700; color:#333; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .jo-prod-id { font-size:10px; color:#aaa; margin-top:1px; }
        .jo-prod-meta { display:flex; gap:8px; font-size:10px; color:#777; margin-top:2px; }
        .jo-prod-meta strong { color:#333; font-weight:800; }
        .jo-qty-col { display:flex; flex-direction:column; align-items:center; gap:1px; flex-shrink:0; min-width:36px; }
        .jo-qty-lbl { font-size:9px; color:#aaa; font-weight:700; text-transform:uppercase; }
        .jo-qty-val { font-size:15px; font-weight:700; color:#333; }
        .jo-mts-col { display:flex; flex-direction:column; align-items:center; gap:1px; flex-shrink:0; }
        .jo-mts-lbl { font-size:9px; color:#7A4610; font-weight:700; text-transform:uppercase; }
        .jo-mts-input { width:48px; font-size:14px; font-weight:700; color:#7A4610; border:1.5px solid #e8ddd4; border-radius:6px; padding:2px 4px; text-align:center; outline:none; background:#fef3e2; }
        .jo-mts-input:focus { border-color:#7A4610; }
        .jo-total-col { display:flex; flex-direction:column; align-items:center; gap:1px; flex-shrink:0; min-width:40px; }
        .jo-total-lbl { font-size:9px; color:#555; font-weight:700; text-transform:uppercase; }
        .jo-total-val { font-size:15px; font-weight:700; color:#7A4610; }
        .jo-rm-btn { font-size:18px; color:#e74c3c; background:none; border:none; cursor:pointer; padding:0 2px; flex-shrink:0; line-height:1; opacity:.5; }
        .jo-rm-btn:hover { opacity:1; }
        .jo-chev { font-size:10px; color:#bbb; flex-shrink:0; transition:transform .2s; }
        .jo-prod-card.open .jo-chev { transform:rotate(180deg); }

        .jo-orders { border-top:1px solid #f5f0eb; padding:6px 12px 8px; background:#fdf8f4; }
        .jo-order-row { display:flex; align-items:center; gap:8px; padding:3px 0; font-size:11px; color:#666; }
        .jo-order-rm { font-size:14px; color:#e74c3c; background:none; border:none; cursor:pointer; padding:0; line-height:1; opacity:.6; flex-shrink:0; }
        .jo-order-rm:hover { opacity:1; }
        .jo-order-id { font-weight:700; color:#7A4610; flex-shrink:0; }
        .jo-order-customer { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .jo-order-qty { font-weight:700; color:#333; flex-shrink:0; }

        .jo-mts-card { background:#fff; border:1.5px solid #c97d3a; border-radius:8px; margin-bottom:8px; }
        .jo-mts-top { display:flex; align-items:center; gap:8px; padding:10px 12px; }
        .jo-mts-badge { font-size:9px; font-weight:700; background:#c97d3a; color:#fff; border-radius:4px; padding:1px 5px; flex-shrink:0; white-space:nowrap; }

        .jo-section-hdr { display:flex; align-items:center; gap:8px; padding:8px 4px; margin:16px 0 8px; }
        .jo-section-line { flex:1; height:1px; background:#e8ddd4; }
        .jo-section-lbl { font-size:11px; font-weight:700; color:#7A4610; white-space:nowrap; }

        .jo-search-row { margin-bottom:8px; }
        .jo-search-input { width:100%; font-size:12px; padding:8px 12px; border:1.5px solid #e8ddd4; border-radius:8px; outline:none; color:#333; background:#fff; box-sizing:border-box; }
        .jo-search-input:focus { border-color:#7A4610; }
        .jo-search-results { background:#fff; border:1px solid #e8ddd4; border-radius:8px; margin-bottom:8px; overflow-y:auto; max-height:360px; }
        .jo-sr-row { display:flex; align-items:center; gap:8px; padding:8px 12px; border-bottom:1px solid #f5f0eb; }
        .jo-sr-row:last-child { border-bottom:none; }
        .jo-sr-thumb { width:32px; height:32px; border-radius:4px; object-fit:cover; border:1px solid #e8ddd4; flex-shrink:0; }
        .jo-sr-thumb-ph { width:32px; height:32px; border-radius:4px; background:#f0e8e0; flex-shrink:0; }
        .jo-sr-info { flex:1; min-width:0; }
        .jo-sr-name { font-size:12px; font-weight:600; color:#333; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .jo-sr-mat { font-size:10px; color:#999; margin-top:1px; }
        .jo-sr-add { font-size:11px; font-weight:700; color:#7A4610; border:1.5px solid #7A4610; border-radius:20px; padding:2px 10px; background:none; cursor:pointer; flex-shrink:0; }
        .jo-sr-add:hover:not(:disabled) { background:#7A4610; color:#fff; }
        .jo-sr-add:disabled { border-color:#ccc; color:#ccc; cursor:default; }

        .jo-submit-bar { position:fixed; bottom:44px; left:0; right:0; background:#fff; border-top:1px solid #e8ddd4; padding:10px 16px; z-index:90; display:flex; gap:12px; align-items:center; }
        .jo-submit-left { flex:1; min-width:0; }
        .jo-submit-summary { font-size:11px; color:#aaa; }
        .jo-submit-vals { font-size:11px; color:#555; margin-top:3px; }
        .jo-submit-vals strong { color:#7A4610; font-weight:700; }
        .jo-submit-vals .mts-pct { color:#1a7a3c; }
        .jo-submit-btn { flex:1; background:#7A4610; color:#fff; border:none; border-radius:20px; padding:10px 18px; font-size:13px; font-weight:700; cursor:pointer; white-space:nowrap; }
        .jo-submit-btn:disabled { background:#ccc; cursor:not-allowed; }
        .jo-submit-btn:hover:not(:disabled) { background:#5a3209; }

        .jo-hist-card { background:#fff; border:1px solid #e8ddd4; border-radius:8px; margin-bottom:8px; overflow:hidden; }
        .jo-hist-top { display:flex; flex-direction:column; gap:4px; padding:10px 12px; cursor:pointer; user-select:none; }
        .jo-hist-top:hover { background:#fdf8f4; }
        .jo-hist-row1 { display:flex; align-items:center; gap:8px; }
        .jo-hist-row2 { display:flex; align-items:center; gap:8px; }
        .jo-ref { font-size:13px; font-weight:800; color:#7A4610; flex:1; }
        .jo-status-badge { font-size:10px; font-weight:700; border-radius:10px; padding:2px 8px; flex-shrink:0; }
        .jo-status-badge.open { background:#fef3e2; color:#7A4610; }
        .jo-status-badge.done { background:#eafaf1; color:#27ae60; }
        .jo-date { font-size:11px; color:#aaa; flex:1; }
        .jo-count { font-size:11px; color:#555; flex-shrink:0; }
        .jo-hist-body { border-top:1px solid #f5f0eb; }
        .jo-hist-actions { display:flex; gap:8px; padding:8px 12px; border-bottom:1px solid #f5f0eb; flex-wrap:wrap; }
        .jo-act-btn { font-size:11px; font-weight:700; border-radius:20px; padding:3px 12px; cursor:pointer; background:none; white-space:nowrap; }
        .jo-act-btn.edit { color:#7A4610; border:1.5px solid #7A4610; }
        .jo-act-btn.edit:hover { background:#7A4610; color:#fff; }
        .jo-act-btn.status { color:#27ae60; border:1.5px solid #27ae60; }
        .jo-act-btn.status:hover { background:#27ae60; color:#fff; }
        .jo-act-btn.del { color:#e74c3c; border:1.5px solid #e74c3c; }
        .jo-act-btn.del:hover { background:#e74c3c; color:#fff; }
        a.jo-act-btn { display:inline-block; text-decoration:none; }
        .jo-act-btn.cutlist { color:#2563eb; border:1.5px solid #2563eb; }
        .jo-act-btn.cutlist:hover { background:#2563eb; color:#fff; }
        .jo-hist-item { padding:10px 12px; border-bottom:1px solid #f5f0eb; }
        .jo-hist-item:last-child { border-bottom:none; }
        .jo-hist-item-top { display:flex; align-items:center; gap:8px; margin-bottom:6px; }
        .jo-item-thumb { width:36px; height:36px; border-radius:5px; object-fit:cover; border:1px solid #e8ddd4; flex-shrink:0; }
        .jo-item-thumb-ph { width:36px; height:36px; border-radius:5px; background:#f0e8e0; flex-shrink:0; }
        .jo-item-name { font-size:12px; font-weight:700; color:#333; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .jo-qty-row { display:flex; gap:6px; padding-left:44px; flex-wrap:wrap; }
        .jo-qty-chip { font-size:11px; color:#666; background:#f5f0eb; border-radius:6px; padding:2px 8px; }
        .jo-qty-chip span { font-weight:700; color:#333; }
        .jo-qty-chip.mts { background:#fef3e2; }
        .jo-qty-chip.mts span { color:#7A4610; }
        .jo-qty-chip.total { background:#7A4610; color:#fff; }
        .jo-qty-chip.total span { color:#fff; font-weight:800; }
        .jo-order-pills { margin-top:6px; padding-left:44px; display:flex; flex-wrap:wrap; gap:4px; }
        .jo-pill { font-size:10px; background:#fef3e2; color:#7A4610; border-radius:10px; padding:2px 8px; font-weight:600; }

        .jo-overlay { position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:200; display:flex; align-items:flex-end; justify-content:center; }
        .jo-sheet { background:#f5f0eb; border-radius:16px 16px 0 0; width:100%; max-width:640px; max-height:90vh; display:flex; flex-direction:column; }
        .jo-sheet-hdr { display:flex; align-items:center; gap:10px; padding:14px 16px; background:#fff; border-radius:16px 16px 0 0; border-bottom:1px solid #e8ddd4; flex-shrink:0; }
        .jo-sheet-title { font-size:14px; font-weight:700; color:#7A4610; flex:1; }
        .jo-sheet-close { font-size:20px; color:#aaa; background:none; border:none; cursor:pointer; padding:0 4px; line-height:1; }
        .jo-sheet-body { flex:1; overflow-y:auto; padding:10px; }
        .jo-sheet-footer { padding:12px 16px; background:#fff; border-top:1px solid #e8ddd4; flex-shrink:0; }
        .jo-edit-item { background:#fff; border:1px solid #e8ddd4; border-radius:8px; margin-bottom:8px; padding:10px 12px; }
        .jo-edit-item-top { display:flex; align-items:center; gap:8px; }

        .jo-toast { position:fixed; bottom:80px; left:50%; transform:translateX(-50%); background:#333; color:#fff; font-size:12px; font-weight:600; padding:8px 18px; border-radius:20px; z-index:500; pointer-events:none; white-space:nowrap; }
        .jo-loading-hint { font-size:11px; color:#aaa; text-align:center; padding:12px; }

        .jo-ordered-link { appearance:none; border:none; background:none; padding:0; color:#7A4610; font:inherit; font-size:10px; text-decoration:underline; cursor:pointer; }
        .jo-ordered-link:hover { color:#5a3209; }
        .jo-ordered-link strong { font-weight:800; }
      `}</style>

      {/* Sub-nav */}
      <nav className="jo-nav">
        <button className={`jo-nav-btn${activeTab === 'new' ? ' active' : ''}`} onClick={() => setActiveTab('new')}>
          New JO
          <span className="jo-badge">{loadingOrders ? '…' : joProducts.length + mtsOnly.length || '—'}</span>
        </button>
        <button className={`jo-nav-btn${activeTab === 'history' ? ' active' : ''}`} onClick={() => setActiveTab('history')}>
          JO Archive
          <span className="jo-badge">{loadingHistory ? '…' : history.length || '—'}</span>
        </button>
      </nav>

      {activeTab === 'new' && (
        <>
          {/* Summary toolbar — live values update as MTS qty changes */}
          <div className="jo-toolbar">
            <span className="jo-chip">Products <strong>{summary.products}</strong></span>
            <span className="jo-chip">Units <strong>{summary.units}</strong></span>
            {summary.joValue > 0 && (
              <>
                <span className="jo-toolbar-sep" />
                <span className="jo-chip jo-val">JO <strong>{fmtVal(summary.joValue)} EGP</strong></span>
                <span className="jo-chip mts-val">
                  MTS <strong>{fmtVal(summary.mtsValue)} EGP</strong>
                  {' '}({summary.mtsPct}%)
                </span>
              </>
            )}
          </div>

          {loadingOrders ? (
            <div className="jo-empty">Loading orders…</div>
          ) : (
            <div className="jo-wrap">
              {joProducts.length === 0 && mtsOnly.length === 0 && (
                <p className="jo-loading-hint">No items in JO preparation phase. Items move here when their phase is set to "JO preparation" in the planning view.</p>
              )}

              {/* MTO product cards */}
              {joProducts.map(prod => {
                const isOpen   = expandedPids.has(prod.productId);
                const mtsQty   = mtsQtyMap[prod.productId] ?? 0;
                const totalQty = prod.mtoQty + mtsQty;
                return (
                  <div key={prod.productId} className={`jo-prod-card${isOpen ? ' open' : ''}`}>
                    <div className="jo-card-top" onClick={() => togglePid(prod.productId)}>
                      {prod.image
                        ? <img src={prod.image} alt="" className="jo-thumb" />
                        : <div className="jo-thumb-ph" />}
                      <div className="jo-prod-info">
                        <div className="jo-prod-name">{prod.name}</div>
                        <div className="jo-prod-id">{prod.productId}</div>
                        <div className="jo-prod-meta">
                          <span>Stock <strong>{prod.stock}</strong></span>
                          <button className="jo-ordered-link" onClick={e => { e.stopPropagation(); setOrderedModal({ productId: prod.productId, name: prod.name }); }}>
                            Ordered <strong>{prod.orderedQty}</strong>
                          </button>
                        </div>
                      </div>
                      <div className="jo-qty-col">
                        <span className="jo-qty-lbl">MTO</span>
                        <span className="jo-qty-val">{prod.mtoQty}</span>
                      </div>
                      <div className="jo-mts-col" onClick={e => e.stopPropagation()}>
                        <span className="jo-mts-lbl">MTS</span>
                        <input className="jo-mts-input" type="number" min="0" placeholder="0"
                          value={mtsQty || ''}
                          onChange={e => setMtsQty(prod.productId, parseInt(e.target.value) || 0)} />
                      </div>
                      <div className="jo-total-col">
                        <span className="jo-total-lbl">Total</span>
                        <span className="jo-total-val">{totalQty}</span>
                      </div>
                      <button className="jo-rm-btn" onClick={e => { e.stopPropagation(); removeProduct(prod.productId); }}>×</button>
                      <span className="jo-chev">▼</span>
                    </div>
                    {isOpen && (
                      <div className="jo-orders">
                        {prod.orders.map(ord => (
                          <div key={ord.orderId} className="jo-order-row">
                            <button className="jo-order-rm" onClick={() => removeOrder(prod.productId, ord.orderId)}>×</button>
                            <span className="jo-order-id">{ord.orderId}</span>
                            <span className="jo-order-customer">{ord.customer}</span>
                            <span className="jo-order-qty">×{ord.qty}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* MTS-only section */}
              <div className="jo-section-hdr">
                <div className="jo-section-line" />
                <span className="jo-section-lbl">Stock Only — MTS (no order)</span>
                <div className="jo-section-line" />
              </div>

              {mtsOnly.map(p => (
                <div key={p.productId} className="jo-mts-card">
                  <div className="jo-mts-top">
                    {p.image
                      ? <img src={p.image} alt="" className="jo-thumb" />
                      : <div className="jo-thumb-ph" />}
                    <div className="jo-prod-info">
                      <div className="jo-prod-name">{p.name}</div>
                      <div className="jo-prod-id">#{p.productId}</div>
                    </div>
                    <span className="jo-mts-badge">MTS only</span>
                    <div className="jo-mts-col">
                      <span className="jo-mts-lbl">Qty</span>
                      <input className="jo-mts-input" type="number" min="1"
                        value={p.qty}
                        onChange={e => {
                          const qty = parseInt(e.target.value) || 1;
                          setMtsOnly(prev => prev.map(x => x.productId === p.productId ? { ...x, qty } : x));
                        }} />
                    </div>
                    <button className="jo-rm-btn" onClick={() => setMtsOnly(prev => prev.filter(x => x.productId !== p.productId))}>×</button>
                  </div>
                </div>
              ))}

              {/* Product search + list */}
              <div className="jo-search-row">
                <input className="jo-search-input" type="text" placeholder="Search by name or material…"
                  value={productQuery} onChange={e => setProductQuery(e.target.value)} />
              </div>
              <div className="jo-search-results">
                {productsLoading ? (
                  <p className="jo-loading-hint">Loading products…</p>
                ) : visibleProducts.length === 0 ? (
                  <p className="jo-loading-hint">No products found</p>
                ) : (
                  visibleProducts.map(p => {
                    const added = joProducts.some(x => x.productId === p.id) || mtsOnly.some(x => x.productId === p.id);
                    return (
                      <div key={p.id} className="jo-sr-row">
                        {p.image
                          ? <img src={p.image} alt="" className="jo-sr-thumb" />
                          : <div className="jo-sr-thumb-ph" />}
                        <div className="jo-sr-info">
                          <div className="jo-sr-name">{p.name}</div>
                          {p.material && <div className="jo-sr-mat">{p.material}</div>}
                        </div>
                        <button className="jo-sr-add" disabled={added} onClick={() => addMtsProduct(p)}>
                          {added ? 'Added' : '+ Add'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Fixed submit bar */}
          <div className="jo-submit-bar">
            <span className="jo-submit-summary">{summary.products} products · {summary.units} units</span>
            <button className="jo-submit-btn" disabled={summary.products === 0 || submitting} onClick={submitJO}>
              {submitting ? 'Submitting…' : 'Submit Job Order'}
            </button>
          </div>
        </>
      )}

      {activeTab === 'history' && (
        <div className="jo-wrap">
          {loadingHistory ? (
            <div className="jo-empty">Loading…</div>
          ) : history.length === 0 ? (
            <div className="jo-empty">No job orders yet</div>
          ) : (
            history.map(jo => {
              const isOpen = expandedJos.has(jo.id);
              const dateStr = new Date(jo.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
              return (
                <div key={jo.id} className={`jo-hist-card${isOpen ? ' open' : ''}`}>
                  <div className="jo-hist-top" onClick={() => toggleJo(jo.id)}>
                    <div className="jo-hist-row1">
                      <span className="jo-ref">{jo.ref}</span>
                      <span className={`jo-status-badge ${jo.status}`}>{jo.status}</span>
                      <span className="jo-chev">▼</span>
                    </div>
                    <div className="jo-hist-row2">
                      <span className="jo-date">{dateStr}</span>
                      <span className="jo-count">{jo.items.length} products</span>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="jo-hist-body">
                      <div className="jo-hist-actions">
                        <a className="jo-act-btn cutlist" href={`/owner/pipeline/job-orders/cutlist?jo=${jo.id}`}>Cutlist</a>
                        <button className="jo-act-btn edit" onClick={() => openEdit(jo)}>Edit</button>
                        <button className="jo-act-btn status" onClick={() => toggleStatus(jo)}>
                          Mark {jo.status === 'open' ? 'Done' : 'Open'}
                        </button>
                        <button className="jo-act-btn del" onClick={() => deleteJO(jo.id)}>Delete</button>
                      </div>
                      {jo.items.map((item: StoredJOItem) => (
                        <div key={item.product_id} className="jo-hist-item">
                          <div className="jo-hist-item-top">
                            {item.image
                              ? <img src={item.image} alt="" className="jo-item-thumb" />
                              : <div className="jo-item-thumb-ph" />}
                            <span className="jo-item-name">{item.product_name}</span>
                          </div>
                          <div className="jo-qty-row">
                            <span className="jo-qty-chip">MTO <span>{item.mto.qty}</span></span>
                            <span className="jo-qty-chip mts">MTS <span>{item.mts.qty}</span></span>
                            <span className="jo-qty-chip total">Total <span>{item.total_qty}</span></span>
                          </div>
                          {item.mto.orders.length > 0 && (
                            <div className="jo-order-pills">
                              {item.mto.orders.map(o => (
                                <span key={o.order_id} className="jo-pill">{o.order_id} ×{o.qty}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Edit overlay */}
      {editingJo && (
        <div className="jo-overlay" onClick={e => { if (e.target === e.currentTarget) setEditingJo(null); }}>
          <div className="jo-sheet">
            <div className="jo-sheet-hdr">
              <span className="jo-sheet-title">Edit {editingJo.ref}</span>
              <button className="jo-sheet-close" onClick={() => setEditingJo(null)}>×</button>
            </div>
            <div className="jo-sheet-body">
              {editItems.map((item, idx) => (
                <div key={item.product_id} className="jo-edit-item">
                  <div className="jo-edit-item-top">
                    {item.image
                      ? <img src={item.image} alt="" className="jo-item-thumb" />
                      : <div className="jo-item-thumb-ph" />}
                    <span className="jo-item-name">{item.product_name}</span>
                    <div className="jo-mts-col">
                      <span className="jo-mts-lbl">MTS</span>
                      <input className="jo-mts-input" type="number" min="0" value={item.mts.qty}
                        onChange={e => {
                          const qty = parseInt(e.target.value) || 0;
                          setEditItems(prev => prev.map((x, i) =>
                            i !== idx ? x : { ...x, mts: { qty }, total_qty: x.mto.qty + qty }
                          ));
                        }} />
                    </div>
                    <button className="jo-rm-btn"
                      onClick={() => setEditItems(prev => prev.filter((_, i) => i !== idx))}>×</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="jo-sheet-footer">
              <button className="jo-submit-btn" disabled={saving} onClick={saveEdit}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ordered-orders modal */}
      {orderedModal && (
        <OrderDetailSheet
          title={`Orders · ${orderedModal.name}`}
          rows={ordersWithProduct}
          onClose={() => setOrderedModal(null)}
        />
      )}

      {toast && <div className="jo-toast">{toast}</div>}
    </>
  );
}
