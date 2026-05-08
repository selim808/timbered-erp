'use client';

import { useEffect, useRef, useState } from 'react';

interface Group {
  id: string;
  label: string;
  color: string;
  sort_order: number;
  phases: string[];
}

interface AffectedItem { id: string; order_id: string; line_item_id: string; }

interface PendingDelete {
  group: Group;
  phaseIdx: number;
  phaseName: string;
  affected: AffectedItem[];
}

const PRESET_COLORS = [
  '#f59e0b','#f97316','#3b82f6','#14b8a6',
  '#f43f5e','#8b5cf6','#ef4444','#10b981',
  '#ec4899','#06b6d4','#84cc16','#64748b',
];

const CSS = `
.pg-bar { background:#7A4610; color:#fff; padding:0 20px; height:52px; display:flex; align-items:center; gap:12px; position:sticky; top:64px; z-index:100; }
.pg-bar-title { font-size:16px; font-weight:700; flex:1; }
.pg-bar-sub { font-size:12px; opacity:.6; }
.pg-bar-btn { background:rgba(255,255,255,.15); color:#fff; border:1px solid rgba(255,255,255,.3); border-radius:7px; padding:6px 14px; font-size:12px; font-weight:700; cursor:pointer; white-space:nowrap; }
.pg-bar-btn:hover { background:rgba(255,255,255,.25); }
.pg-body { padding:20px; max-width:660px; }
.pg-grid { display:flex; flex-direction:column; gap:14px; }
.pg-state { background:#fff; border-radius:10px; padding:32px; text-align:center; color:#999; font-size:14px; border:1px solid #e8ddd4; }
.pg-group-card { background:#fff; border:1px solid #e8ddd4; border-left:4px solid #ccc; border-radius:10px; overflow:hidden; display:flex; flex-direction:column; }
.pg-group-card.pg-grp-dragging { opacity:.4; }
.pg-group-card.pg-grp-over { outline:2px dashed #7A4610; outline-offset:-2px; }
.pg-card-hdr { padding:12px 14px 10px; border-bottom:1px solid #f0e8e0; display:flex; align-items:center; gap:8px; cursor:pointer; user-select:none; }
.pg-card-hdr:hover { background:#faf7f4; }
.pg-card-hdr.collapsed { border-bottom:none; }
.pg-grp-drag { width:10px; height:14px; flex-shrink:0; cursor:grab; background-image:radial-gradient(circle,#bbb 1.5px,transparent 1.5px); background-size:5px 6px; background-repeat:repeat; opacity:.5; transition:opacity .15s; }
.pg-grp-drag:active { cursor:grabbing; }
.pg-card-hdr:hover .pg-grp-drag { opacity:1; }
.pg-card-title { font-size:13px; font-weight:700; color:#333; flex:1; }
.pg-grp-edit { opacity:0; background:none; border:none; cursor:pointer; color:#7A4610; font-size:13px; padding:2px 4px; border-radius:4px; transition:opacity .15s,background .15s; }
.pg-grp-edit:hover { background:#fef3c7; }
.pg-card-hdr:hover .pg-grp-edit { opacity:1; }
.pg-card-count { font-size:11px; font-weight:600; padding:2px 8px; border-radius:20px; background:#f5f0eb; color:#7A4610; }
.pg-chevron { font-size:10px; color:#aaa; transition:transform .2s; }
.pg-chevron.collapsed { transform:rotate(-90deg); }
.pg-phases { flex:1; padding:6px 0; }
.pg-empty-phases { padding:12px 14px; font-size:12px; color:#bbb; font-style:italic; }
.pg-phase-row { display:flex; align-items:center; gap:8px; padding:5px 14px 5px 8px; font-size:13px; transition:background .15s; cursor:default; }
.pg-phase-row:hover { background:#faf7f4; }
.pg-phase-row:hover .pg-del-btn, .pg-phase-row:hover .pg-edit-btn { opacity:1; }
.pg-phase-row.pg-dragging { opacity:.35; background:#f5f0eb; }
.pg-phase-row.pg-ph-over { border-top:2px solid #7A4610; background:#fdf9f6; }
.pg-drag-handle { width:12px; height:18px; flex-shrink:0; cursor:grab; background-image:radial-gradient(circle,#bbb 1.5px,transparent 1.5px); background-size:5px 6px; background-repeat:repeat; opacity:.55; transition:opacity .15s; }
.pg-drag-handle:active { cursor:grabbing; }
.pg-phase-row:hover .pg-drag-handle { opacity:1; }
.pg-phase-idx { font-size:10px; color:#bbb; font-weight:600; min-width:16px; text-align:right; flex-shrink:0; }
.pg-phase-name { flex:1; color:#333; }
.pg-del-btn { opacity:0; background:none; border:none; cursor:pointer; color:#ef4444; font-size:15px; line-height:1; padding:2px 4px; border-radius:4px; transition:opacity .15s,background .15s; flex-shrink:0; }
.pg-del-btn:hover { background:#fee2e2; }
.pg-edit-btn { opacity:0; background:none; border:none; cursor:pointer; color:#7A4610; font-size:13px; line-height:1; padding:2px 4px; border-radius:4px; transition:opacity .15s,background .15s; flex-shrink:0; }
.pg-edit-btn:hover { background:#fef3c7; }
.pg-inline-input { border:1px solid #7A4610; border-radius:4px; padding:1px 6px; font-size:inherit; font-family:inherit; color:#333; background:#fff; outline:none; width:100%; }
.pg-add-row { padding:8px 10px; border-top:1px solid #f0e8e0; display:flex; gap:6px; }
.pg-add-input { flex:1; border:1px solid #e0d8d0; border-radius:6px; padding:5px 10px; font-size:12px; color:#333; background:#faf7f4; outline:none; }
.pg-add-input:focus { border-color:#7A4610; background:#fff; }
.pg-add-btn { background:#7A4610; color:#fff; border:none; border-radius:6px; padding:5px 12px; font-size:12px; font-weight:700; cursor:pointer; }
.pg-add-btn:hover { background:#5e340c; }
.pg-overlay { position:fixed; inset:0; background:rgba(0,0,0,.35); z-index:400; display:flex; align-items:center; justify-content:center; padding:16px; }
.pg-modal { background:#fff; border-radius:12px; padding:24px; width:360px; max-width:calc(100vw - 32px); box-shadow:0 8px 32px rgba(0,0,0,.2); }
.pg-modal h2 { font-size:15px; font-weight:700; color:#333; margin:0 0 18px; }
.pg-field { margin-bottom:14px; }
.pg-field label { display:block; font-size:11px; font-weight:700; color:#777; text-transform:uppercase; letter-spacing:.05em; margin-bottom:6px; }
.pg-field input[type=text] { width:100%; border:1px solid #e0d8d0; border-radius:7px; padding:7px 10px; font-size:13px; outline:none; color:#333; }
.pg-field input[type=text]:focus { border-color:#7A4610; }
.pg-swatches { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
.pg-swatch { width:26px; height:26px; border-radius:50%; cursor:pointer; border:2px solid transparent; transition:transform .15s,border-color .15s; }
.pg-swatch:hover { transform:scale(1.15); }
.pg-swatch.selected { border-color:#333; transform:scale(1.15); }
.pg-swatch-custom { width:26px; height:26px; border-radius:50%; border:2px dashed #ccc; cursor:pointer; overflow:hidden; position:relative; display:flex; align-items:center; justify-content:center; }
.pg-swatch-custom input[type=color] { opacity:0; position:absolute; inset:0; cursor:pointer; width:100%; height:100%; }
.pg-swatch-custom-icon { font-size:14px; color:#aaa; pointer-events:none; }
.pg-modal-actions { display:flex; gap:8px; margin-top:20px; justify-content:flex-end; }
.pg-btn-cancel { background:#f5f0eb; color:#555; border:none; border-radius:7px; padding:7px 16px; font-size:13px; font-weight:600; cursor:pointer; }
.pg-btn-cancel:hover { background:#ede5dc; }
.pg-btn-create { background:#7A4610; color:#fff; border:none; border-radius:7px; padding:7px 18px; font-size:13px; font-weight:700; cursor:pointer; }
.pg-btn-create:hover { background:#5e340c; }
.pg-btn-create:disabled, .pg-btn-move-del:disabled, .pg-btn-del-only:disabled { opacity:.5; cursor:not-allowed; }
.pg-warn-modal { background:#fff; border-radius:12px; padding:24px; width:460px; max-width:calc(100vw - 32px); box-shadow:0 8px 32px rgba(0,0,0,.25); }
.pg-warn-icon { font-size:28px; margin-bottom:10px; }
.pg-warn-title { font-size:15px; font-weight:700; color:#333; margin:0 0 5px; }
.pg-warn-sub { font-size:13px; color:#666; margin:0 0 14px; line-height:1.5; }
.pg-warn-list { max-height:180px; overflow-y:auto; border:1px solid #e8ddd4; border-radius:8px; margin-bottom:16px; background:#faf7f4; }
.pg-warn-item { display:flex; gap:10px; align-items:center; padding:7px 12px; border-bottom:1px solid #f0ebe4; font-size:12px; }
.pg-warn-item:last-child { border-bottom:none; }
.pg-warn-dot { width:6px; height:6px; border-radius:50%; background:#ef4444; flex-shrink:0; }
.pg-warn-oid { font-weight:700; color:#333; }
.pg-warn-lid { color:#aaa; }
.pg-move-field { margin-bottom:6px; }
.pg-move-field label { display:block; font-size:11px; font-weight:700; color:#777; text-transform:uppercase; letter-spacing:.05em; margin-bottom:6px; }
.pg-move-select { width:100%; border:1px solid #e0d8d0; border-radius:7px; padding:8px 10px; font-size:13px; outline:none; color:#333; background:#fff; cursor:pointer; }
.pg-move-select:focus { border-color:#7A4610; }
.pg-move-hint { font-size:11px; color:#aaa; margin:5px 0 0; }
.pg-warn-actions { display:flex; gap:8px; margin-top:18px; flex-wrap:wrap; justify-content:flex-end; }
.pg-btn-del-only { background:#fff0f0; color:#dc2626; border:1px solid #fca5a5; border-radius:7px; padding:7px 16px; font-size:13px; font-weight:700; cursor:pointer; }
.pg-btn-del-only:hover { background:#fee2e2; }
.pg-btn-move-del { background:#7A4610; color:#fff; border:none; border-radius:7px; padding:7px 18px; font-size:13px; font-weight:700; cursor:pointer; }
.pg-btn-move-del:hover { background:#5e340c; }
.pg-toast { position:fixed; bottom:20px; right:20px; padding:8px 16px; border-radius:8px; font-size:13px; font-weight:600; z-index:500; pointer-events:none; }
.pg-toast-saving { background:#fef3c7; color:#92400e; }
.pg-toast-ok  { background:#d1fae5; color:#065f46; }
.pg-toast-err { background:#fee2e2; color:#991b1b; }
`;

export default function PhasesPage() {
  const [groups, setGroups]   = useState<Group[]>([]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [loadState, setLoad]  = useState<'loading' | 'done' | 'error'>('loading');
  const [errMsg, setErrMsg]   = useState('');

  // Toast
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // New group modal
  const [newGroupOpen, setNewGroupOpen]   = useState(false);
  const [newLabel, setNewLabel]           = useState('');
  const [newColor, setNewColor]           = useState(PRESET_COLORS[0]);
  const [creating, setCreating]           = useState(false);

  // Warn modal
  const [warnModal, setWarnModal]   = useState<PendingDelete | null>(null);
  const [moveTarget, setMoveTarget] = useState('');
  const [moveHint, setMoveHint]     = useState('');
  const [proceeding, setProceeding] = useState(false);

  // Add-phase inputs (keyed by group id)
  const [addInputs, setAddInputs] = useState<Record<string, string>>({});

  // Inline editing
  const [editGrpId, setEditGrpId]   = useState<string | null>(null);
  const [editGrpVal, setEditGrpVal] = useState('');
  const [editPhKey, setEditPhKey]   = useState<string | null>(null); // "gid:idx"
  const [editPhVal, setEditPhVal]   = useState('');

  // Drag state — refs for data, state for visuals
  const phaseDrag = useRef<{ gid: string; idx: number } | null>(null);
  const groupDrag = useRef<string | null>(null);
  const [draggingPhKey, setDraggingPhKey] = useState<string | null>(null);
  const [dragOverPhKey, setDragOverPhKey] = useState<string | null>(null);
  const [draggingGrpId, setDraggingGrpId] = useState<string | null>(null);
  const [dragOverGrpId, setDragOverGrpId] = useState<string | null>(null);

  // ── Load ───────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/phase-groups')
      .then(r => r.json())
      .then((data: Group[] | { error: string }) => {
        if (!Array.isArray(data)) throw new Error((data as { error: string }).error);
        setGroups(data);
        setCollapsed(new Set(data.map(g => g.id))); // all collapsed initially
        setLoad('done');
      })
      .catch((e: Error) => { setErrMsg(e.message); setLoad('error'); });
  }, []);

  // ── Toast ──────────────────────────────────────────────────────
  function showToast(msg: string, type: 'saving' | 'ok' | 'err') {
    setToastMsg(msg); setToastType(type);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    if (type !== 'saving') {
      toastTimer.current = setTimeout(() => setToastMsg(''), 2200);
    }
  }

  // ── CRUD ───────────────────────────────────────────────────────
  async function saveGroup(g: Group, field: Partial<Group>) {
    showToast('Saving…', 'saving');
    const res = await fetch(`/api/phase-groups/${g.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(field),
    });
    if (!res.ok) { showToast('Save failed', 'err'); return false; }
    showToast('Saved', 'ok');
    return true;
  }

  async function saveGroupOrders(updated: Group[]) {
    showToast('Saving order…', 'saving');
    await Promise.all(updated.map(g =>
      fetch(`/api/phase-groups/${g.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: g.sort_order }),
      })
    ));
    showToast('Order saved', 'ok');
  }

  async function addPhase(gid: string) {
    const name = (addInputs[gid] ?? '').trim();
    if (!name) return;
    const g = groups.find(x => x.id === gid);
    if (!g) return;
    const updated = { ...g, phases: [...g.phases, name] };
    setGroups(prev => prev.map(x => x.id === gid ? updated : x));
    setAddInputs(prev => ({ ...prev, [gid]: '' }));
    await saveGroup(updated, { phases: updated.phases });
  }

  async function delPhase(gid: string, idx: number) {
    const g = groups.find(x => x.id === gid);
    if (!g) return;
    const phaseName = g.phases[idx];

    showToast('Checking usage…', 'saving');
    let affected: AffectedItem[] = [];
    try {
      const res = await fetch(`/api/phase-groups/usage?phase=${encodeURIComponent(phaseName)}`);
      affected = await res.json();
    } catch { /* ignore */ }
    showToast('', 'ok');
    setToastMsg('');

    if (affected.length === 0) {
      if (!confirm(`Delete "${phaseName}" from ${g.label}?`)) return;
      const updated = { ...g, phases: g.phases.filter((_, i) => i !== idx) };
      setGroups(prev => prev.map(x => x.id === gid ? updated : x));
      await saveGroup(updated, { phases: updated.phases });
      return;
    }

    setMoveTarget(''); setMoveHint(''); setProceeding(false);
    setWarnModal({ group: g, phaseIdx: idx, phaseName, affected });
  }

  async function proceedDelete(doMove: boolean) {
    if (!warnModal) return;
    const { group, phaseIdx, phaseName, affected } = warnModal;

    if (doMove) {
      if (!moveTarget) { setMoveHint('Please select a target phase first.'); return; }
      setProceeding(true);
      showToast(`Moving ${affected.length} item${affected.length !== 1 ? 's' : ''}…`, 'saving');
      await fetch('/api/phase-groups/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: phaseName, to: moveTarget }),
      });
    } else {
      setProceeding(true);
    }

    const updated = { ...group, phases: group.phases.filter((_, i) => i !== phaseIdx) };
    setGroups(prev => prev.map(x => x.id === group.id ? updated : x));
    setWarnModal(null);
    await saveGroup(updated, { phases: updated.phases });
  }

  // ── Phase drag & drop ──────────────────────────────────────────
  function onPhaseDragStart(e: React.DragEvent, gid: string, idx: number) {
    phaseDrag.current = { gid, idx };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
    setDraggingPhKey(`${gid}:${idx}`);
  }

  function onPhaseDragEnd() {
    phaseDrag.current = null;
    setDraggingPhKey(null);
    setDragOverPhKey(null);
  }

  function onPhaseDragOver(e: React.DragEvent, gid: string, idx: number) {
    if (!phaseDrag.current || phaseDrag.current.gid !== gid) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverPhKey(`${gid}:${idx}`);
  }

  function onPhaseDrop(e: React.DragEvent, gid: string, toIdx: number) {
    e.preventDefault();
    setDragOverPhKey(null);
    if (!phaseDrag.current || phaseDrag.current.gid !== gid) return;
    const fromIdx = phaseDrag.current.idx;
    phaseDrag.current = null;
    if (fromIdx === toIdx) return;

    setGroups(prev => prev.map(g => {
      if (g.id !== gid) return g;
      const phases = [...g.phases];
      const [moved] = phases.splice(fromIdx, 1);
      phases.splice(toIdx, 0, moved);
      const updated = { ...g, phases };
      saveGroup(updated, { phases });
      return updated;
    }));
  }

  // ── Group drag & drop ──────────────────────────────────────────
  function onGroupDragStart(e: React.DragEvent, gid: string) {
    if ((e.target as Element).closest('.pg-phase-row')) return;
    groupDrag.current = gid;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
    setDraggingGrpId(gid);
  }

  function onGroupDragEnd(gid: string) {
    groupDrag.current = null;
    setDraggingGrpId(null);
    setDragOverGrpId(null);
  }

  function onGroupDragOver(e: React.DragEvent, gid: string) {
    if (!groupDrag.current || groupDrag.current === gid) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOverGrpId(gid);
  }

  function onGroupDrop(e: React.DragEvent, toGid: string) {
    e.preventDefault();
    e.stopPropagation();
    setDragOverGrpId(null);
    const fromGid = groupDrag.current;
    groupDrag.current = null;
    setDraggingGrpId(null);
    if (!fromGid || fromGid === toGid) return;

    setGroups(prev => {
      const next = [...prev];
      const fromIdx = next.findIndex(g => g.id === fromGid);
      const toIdx   = next.findIndex(g => g.id === toGid);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      const reordered = next.map((g, i) => ({ ...g, sort_order: i }));
      saveGroupOrders(reordered);
      return reordered;
    });
  }

  // ── Create group ───────────────────────────────────────────────
  async function createGroup() {
    const label = newLabel.trim();
    if (!label) return;
    const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    if (groups.find(g => g.id === id)) { alert(`A group with id "${id}" already exists.`); return; }

    const sort_order = groups.length ? Math.max(...groups.map(g => g.sort_order)) + 1 : 0;
    setCreating(true);
    showToast('Creating…', 'saving');

    const res = await fetch('/api/phase-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, label, color: newColor, sort_order }),
    });

    if (!res.ok) { showToast('Create failed', 'err'); setCreating(false); return; }
    const created: Group = await res.json();
    setGroups(prev => [...prev, created]);
    setCollapsed(prev => new Set([...prev, created.id]));
    setNewGroupOpen(false);
    setNewLabel(''); setNewColor(PRESET_COLORS[0]);
    showToast('Group created', 'ok');
    setCreating(false);
  }

  // ── Inline edit: group name ────────────────────────────────────
  async function commitGroupName() {
    if (!editGrpId) return;
    const g = groups.find(x => x.id === editGrpId);
    if (!g) { setEditGrpId(null); return; }
    const newLabel = editGrpVal.trim();
    setEditGrpId(null);
    if (!newLabel || newLabel === g.label) return;
    setGroups(prev => prev.map(x => x.id === editGrpId ? { ...x, label: newLabel } : x));
    await saveGroup({ ...g, label: newLabel }, { label: newLabel });
  }

  // ── Inline edit: phase name ────────────────────────────────────
  async function commitPhase() {
    if (!editPhKey) return;
    const [gid, idxStr] = editPhKey.split(':');
    const idx = parseInt(idxStr);
    const g = groups.find(x => x.id === gid);
    if (!g) { setEditPhKey(null); return; }
    const newName = editPhVal.trim();
    setEditPhKey(null);
    if (!newName || newName === g.phases[idx]) return;
    const phases = [...g.phases];
    phases[idx] = newName;
    setGroups(prev => prev.map(x => x.id === gid ? { ...x, phases } : x));
    await saveGroup({ ...g, phases }, { phases });
  }

  // ── All phase options (for move-target dropdown) ───────────────
  const allPhaseOptions = groups.flatMap(g =>
    g.phases.map(p => ({ group: g.label, phase: p }))
  );

  const totalPhases = groups.reduce((s, g) => s + g.phases.length, 0);

  return (
    <>
      <style>{CSS}</style>

      {/* Sub-header bar */}
      <div className="pg-bar">
        <span className="pg-bar-title">Phase Groups</span>
        <span className="pg-bar-sub">{loadState === 'done' ? `${groups.length} groups · ${totalPhases} phases` : 'Supabase'}</span>
        <button className="pg-bar-btn" onClick={() => { setNewLabel(''); setNewColor(PRESET_COLORS[0]); setNewGroupOpen(true); }}>+ New Group</button>
      </div>

      {/* Main content */}
      <div className="pg-body">
        {loadState === 'loading' && <div className="pg-state">Loading phase groups…</div>}
        {loadState === 'error'   && <div className="pg-state">Failed to load: {errMsg}</div>}
        {loadState === 'done' && (
          <div className="pg-grid">
            {groups.length === 0 && (
              <div className="pg-state">No phase groups yet. Click <b>+ New Group</b> to create one.</div>
            )}
            {groups.map(g => {
              const isCollapsed = collapsed.has(g.id);
              const isDraggingGrp = draggingGrpId === g.id;
              const isDragOverGrp = dragOverGrpId === g.id;
              const isEditingName = editGrpId === g.id;

              return (
                <div
                  key={g.id}
                  className={`pg-group-card${isDraggingGrp ? ' pg-grp-dragging' : ''}${isDragOverGrp ? ' pg-grp-over' : ''}`}
                  style={{ borderLeftColor: g.color }}
                  draggable
                  onDragStart={e => onGroupDragStart(e, g.id)}
                  onDragEnd={() => onGroupDragEnd(g.id)}
                  onDragOver={e => onGroupDragOver(e, g.id)}
                  onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverGrpId(null); }}
                  onDrop={e => onGroupDrop(e, g.id)}
                >
                  {/* Card header */}
                  <div
                    className={`pg-card-hdr${isCollapsed ? ' collapsed' : ''}`}
                    onClick={() => setCollapsed(prev => {
                      const next = new Set(prev);
                      if (next.has(g.id)) { next.delete(g.id); } else { next.add(g.id); }
                      return next;
                    })}
                  >
                    <span className="pg-grp-drag" title="Drag to reorder group" onClick={e => e.stopPropagation()} />

                    {isEditingName ? (
                      <input
                        className="pg-inline-input pg-card-title"
                        value={editGrpVal}
                        autoFocus
                        onChange={e => setEditGrpVal(e.target.value)}
                        onBlur={commitGroupName}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { e.preventDefault(); commitGroupName(); }
                          if (e.key === 'Escape') { setEditGrpId(null); }
                        }}
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <span className="pg-card-title">{g.label}</span>
                    )}

                    <button
                      className="pg-grp-edit"
                      title="Edit group name"
                      onClick={e => { e.stopPropagation(); setEditGrpId(g.id); setEditGrpVal(g.label); }}
                    >✎</button>
                    <span className="pg-card-count" id={`cnt-${g.id}`}>{g.phases.length}</span>
                    <span className={`pg-chevron${isCollapsed ? ' collapsed' : ''}`}>▼</span>
                  </div>

                  {/* Phases list */}
                  {!isCollapsed && (
                    <>
                      <div className="pg-phases">
                        {g.phases.length === 0 && <div className="pg-empty-phases">No phases yet</div>}
                        {g.phases.map((phase, idx) => {
                          const phKey = `${g.id}:${idx}`;
                          const isEditingPh = editPhKey === phKey;
                          return (
                            <div
                              key={idx}
                              className={`pg-phase-row${draggingPhKey === phKey ? ' pg-dragging' : ''}${dragOverPhKey === phKey ? ' pg-ph-over' : ''}`}
                              draggable
                              onDragStart={e => onPhaseDragStart(e, g.id, idx)}
                              onDragEnd={onPhaseDragEnd}
                              onDragOver={e => onPhaseDragOver(e, g.id, idx)}
                              onDragLeave={() => { if (dragOverPhKey === phKey) setDragOverPhKey(null); }}
                              onDrop={e => onPhaseDrop(e, g.id, idx)}
                            >
                              <span className="pg-drag-handle" title="Drag to reorder" />
                              <span className="pg-phase-idx">{idx + 1}</span>

                              {isEditingPh ? (
                                <input
                                  className="pg-inline-input pg-phase-name"
                                  value={editPhVal}
                                  autoFocus
                                  onChange={e => setEditPhVal(e.target.value)}
                                  onBlur={commitPhase}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') { e.preventDefault(); commitPhase(); }
                                    if (e.key === 'Escape') { setEditPhKey(null); }
                                  }}
                                />
                              ) : (
                                <span className="pg-phase-name">{phase}</span>
                              )}

                              <button className="pg-edit-btn" title="Edit phase name" onClick={() => { setEditPhKey(phKey); setEditPhVal(phase); }}>✎</button>
                              <button className="pg-del-btn" title="Delete phase" onClick={() => delPhase(g.id, idx)}>×</button>
                            </div>
                          );
                        })}
                      </div>

                      {/* Add phase row */}
                      <div className="pg-add-row">
                        <input
                          className="pg-add-input"
                          placeholder="New phase name…"
                          value={addInputs[g.id] ?? ''}
                          onChange={e => setAddInputs(prev => ({ ...prev, [g.id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') addPhase(g.id); }}
                        />
                        <button className="pg-add-btn" onClick={() => addPhase(g.id)}>Add</button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Group modal */}
      {newGroupOpen && (
        <div className="pg-overlay" onClick={e => { if (e.target === e.currentTarget) setNewGroupOpen(false); }}>
          <div className="pg-modal">
            <h2>New Phase Group</h2>
            <div className="pg-field">
              <label>Group Name</label>
              <input
                type="text"
                placeholder="e.g. Quality Control"
                value={newLabel}
                autoFocus
                onChange={e => setNewLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createGroup(); }}
              />
            </div>
            <div className="pg-field">
              <label>Color</label>
              <div className="pg-swatches">
                {PRESET_COLORS.map(c => (
                  <div
                    key={c}
                    className={`pg-swatch${newColor === c ? ' selected' : ''}`}
                    style={{ background: c }}
                    onClick={() => setNewColor(c)}
                  />
                ))}
                <label className="pg-swatch-custom" title="Custom color">
                  <input type="color" value={newColor} onInput={e => setNewColor((e.target as HTMLInputElement).value)} />
                  <span className="pg-swatch-custom-icon">+</span>
                </label>
              </div>
            </div>
            <div className="pg-modal-actions">
              <button className="pg-btn-cancel" onClick={() => setNewGroupOpen(false)}>Cancel</button>
              <button className="pg-btn-create" disabled={creating || !newLabel.trim()} onClick={createGroup}>
                {creating ? 'Creating…' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete warning modal */}
      {warnModal && (
        <div className="pg-overlay" onClick={e => { if (e.target === e.currentTarget) setWarnModal(null); }}>
          <div className="pg-warn-modal">
            <div className="pg-warn-icon">⚠️</div>
            <div className="pg-warn-title">Delete phase &ldquo;{warnModal.phaseName}&rdquo;?</div>
            <div className="pg-warn-sub">
              {warnModal.affected.length} order item{warnModal.affected.length !== 1 ? 's are' : ' is'} currently assigned to this phase.
              Choose a target phase to move them before deleting, or delete without moving.
            </div>
            <div className="pg-warn-list">
              {warnModal.affected.map(a => (
                <div key={a.id} className="pg-warn-item">
                  <span className="pg-warn-dot" />
                  <span className="pg-warn-oid">Order #{a.order_id}</span>
                  <span className="pg-warn-lid">item {a.line_item_id}</span>
                </div>
              ))}
            </div>
            <div className="pg-move-field">
              <label>Move items to</label>
              <select
                className="pg-move-select"
                value={moveTarget}
                onChange={e => { setMoveTarget(e.target.value); setMoveHint(''); }}
              >
                <option value="">— select target phase —</option>
                {allPhaseOptions
                  .filter(o => !(o.group === warnModal.group.label && o.phase === warnModal.phaseName))
                  .map((o, i) => (
                    <option key={i} value={o.phase}>[{o.group}] {o.phase}</option>
                  ))
                }
              </select>
              {moveHint && <div className="pg-move-hint" style={{ color: '#dc2626' }}>{moveHint}</div>}
            </div>
            <div className="pg-warn-actions">
              <button className="pg-btn-cancel" onClick={() => setWarnModal(null)}>Cancel</button>
              <button className="pg-btn-del-only" disabled={proceeding} onClick={() => proceedDelete(false)}>Delete only</button>
              <button className="pg-btn-move-del" disabled={proceeding} onClick={() => proceedDelete(true)}>Move &amp; Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMsg && <div className={`pg-toast pg-toast-${toastType}`}>{toastMsg}</div>}
    </>
  );
}
