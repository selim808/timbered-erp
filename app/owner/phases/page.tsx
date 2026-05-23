'use client';

import { useEffect, useRef, useState } from 'react';

interface Group {
  id: string;
  name: string;
  sort_order: number;
}

interface Phase {
  id: string;
  phase_group_id: string;
  name: string;
  sort_order: number;
}

interface AffectedItem { id: string; order_id: string; line_item_id: string; }

interface PendingDelete {
  group: Group;
  phase: Phase;
  affected: AffectedItem[];
}

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
.pg-chevron { font-size:10px; color:#aaa; transition:transform .25s ease; }
.pg-chevron.collapsed { transform:rotate(-90deg); }
.pg-collapse-wrap { display:grid; grid-template-rows:0fr; transition:grid-template-rows .25s ease; }
.pg-collapse-wrap.expanded { grid-template-rows:1fr; }
.pg-collapse-inner { overflow:hidden; }
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
  const [phases, setPhases]   = useState<Phase[]>([]);
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
  const [editPhId, setEditPhId]     = useState<string | null>(null);
  const [editPhVal, setEditPhVal]   = useState('');

  // Drag state — refs for data, state for visuals
  const phaseDrag = useRef<{ gid: string; phaseId: string } | null>(null);
  const groupDrag = useRef<string | null>(null);
  const [draggingPhId, setDraggingPhId] = useState<string | null>(null);
  const [dragOverPhId, setDragOverPhId] = useState<string | null>(null);
  const [draggingGrpId, setDraggingGrpId] = useState<string | null>(null);
  const [dragOverGrpId, setDragOverGrpId] = useState<string | null>(null);

  // ── Load ───────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch('/api/phase-groups').then(r => r.json()),
      fetch('/api/phases').then(r => r.json()),
    ])
      .then(([grps, phs]) => {
        if (!Array.isArray(grps)) throw new Error(grps?.error ?? 'Failed to load groups');
        if (!Array.isArray(phs))  throw new Error(phs?.error ?? 'Failed to load phases');
        setGroups(grps);
        setPhases(phs);
        setCollapsed(new Set(grps.map((g: Group) => g.id))); // all collapsed initially
        setLoad('done');
      })
      .catch((e: Error) => { setErrMsg(e.message); setLoad('error'); });
  }, []);

  function phasesOf(gid: string) {
    return phases.filter(p => p.phase_group_id === gid).sort((a, b) => a.sort_order - b.sort_order);
  }

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
    setAddInputs(prev => ({ ...prev, [gid]: '' }));

    showToast('Saving…', 'saving');
    const res = await fetch('/api/phases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase_group_id: gid, name }),
    });
    if (!res.ok) { showToast('Save failed', 'err'); return; }
    const created: Phase = await res.json();
    setPhases(prev => [...prev, created]);
    showToast('Saved', 'ok');
  }

  async function delPhase(phaseId: string) {
    const p = phases.find(x => x.id === phaseId);
    if (!p) return;
    const g = groups.find(x => x.id === p.phase_group_id);
    if (!g) return;

    showToast('Checking usage…', 'saving');
    let affected: AffectedItem[] = [];
    try {
      const res = await fetch(`/api/phase-groups/usage?phase=${encodeURIComponent(p.name)}`);
      affected = await res.json();
    } catch { /* ignore */ }
    setToastMsg('');

    if (affected.length === 0) {
      if (!confirm(`Delete "${p.name}" from ${g.name}?`)) return;
      setPhases(prev => prev.filter(x => x.id !== phaseId));
      showToast('Saving…', 'saving');
      const res = await fetch(`/api/phases/${phaseId}`, { method: 'DELETE' });
      showToast(res.ok ? 'Saved' : 'Save failed', res.ok ? 'ok' : 'err');
      return;
    }

    setMoveTarget(''); setMoveHint(''); setProceeding(false);
    setWarnModal({ group: g, phase: p, affected });
  }

  async function proceedDelete(doMove: boolean) {
    if (!warnModal) return;
    const { phase, affected } = warnModal;

    if (doMove) {
      if (!moveTarget) { setMoveHint('Please select a target phase first.'); return; }
      setProceeding(true);
      showToast(`Moving ${affected.length} item${affected.length !== 1 ? 's' : ''}…`, 'saving');
      await fetch('/api/phase-groups/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: phase.name, to: moveTarget }),
      });
    } else {
      setProceeding(true);
    }

    setPhases(prev => prev.filter(x => x.id !== phase.id));
    setWarnModal(null);
    showToast('Saving…', 'saving');
    const res = await fetch(`/api/phases/${phase.id}`, { method: 'DELETE' });
    showToast(res.ok ? 'Saved' : 'Save failed', res.ok ? 'ok' : 'err');
  }

  // ── Phase drag & drop ──────────────────────────────────────────
  function onPhaseDragStart(e: React.DragEvent, gid: string, phaseId: string) {
    phaseDrag.current = { gid, phaseId };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
    setDraggingPhId(phaseId);
  }

  function onPhaseDragEnd() {
    phaseDrag.current = null;
    setDraggingPhId(null);
    setDragOverPhId(null);
  }

  function onPhaseDragOver(e: React.DragEvent, gid: string, phaseId: string) {
    if (!phaseDrag.current || phaseDrag.current.gid !== gid) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverPhId(phaseId);
  }

  async function onPhaseDrop(e: React.DragEvent, gid: string, toPhaseId: string) {
    e.preventDefault();
    setDragOverPhId(null);
    if (!phaseDrag.current || phaseDrag.current.gid !== gid) return;
    const fromPhaseId = phaseDrag.current.phaseId;
    phaseDrag.current = null;
    if (fromPhaseId === toPhaseId) return;

    const groupPhases = phasesOf(gid);
    const fromIdx = groupPhases.findIndex(p => p.id === fromPhaseId);
    const toIdx = groupPhases.findIndex(p => p.id === toPhaseId);
    if (fromIdx === -1 || toIdx === -1) return;

    const reordered = [...groupPhases];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const newOrders = new Map(reordered.map((p, i) => [p.id, (i + 1) * 10]));
    setPhases(prev => prev.map(p => newOrders.has(p.id) ? { ...p, sort_order: newOrders.get(p.id)! } : p));

    showToast('Saving order…', 'saving');
    const res = await fetch('/api/phases/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ordered_ids: reordered.map(p => p.id) }),
    });
    showToast(res.ok ? 'Order saved' : 'Save failed', res.ok ? 'ok' : 'err');
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
    const name = newLabel.trim();
    if (!name) return;

    const sort_order = groups.length ? Math.max(...groups.map(g => g.sort_order)) + 10 : 10;
    setCreating(true);
    showToast('Creating…', 'saving');

    const res = await fetch('/api/phase-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, sort_order }),
    });

    if (!res.ok) { showToast('Create failed', 'err'); setCreating(false); return; }
    const created: Group = await res.json();
    setGroups(prev => [...prev, created]);
    setCollapsed(prev => new Set([...prev, created.id]));
    setNewGroupOpen(false);
    setNewLabel('');
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
    if (!newLabel || newLabel === g.name) return;
    setGroups(prev => prev.map(x => x.id === editGrpId ? { ...x, name: newLabel } : x));
    await saveGroup({ ...g, name: newLabel }, { name: newLabel });
  }

  // ── Inline edit: phase name ────────────────────────────────────
  async function commitPhase() {
    if (!editPhId) return;
    const p = phases.find(x => x.id === editPhId);
    const newName = editPhVal.trim();
    setEditPhId(null);
    if (!p || !newName || newName === p.name) return;

    setPhases(prev => prev.map(x => x.id === p.id ? { ...x, name: newName } : x));
    showToast('Saving…', 'saving');
    const res = await fetch(`/api/phases/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    showToast(res.ok ? 'Saved' : 'Save failed', res.ok ? 'ok' : 'err');
  }

  // ── All phase options (for move-target dropdown) ───────────────
  const allPhaseOptions = groups.flatMap(g =>
    phasesOf(g.id).map(p => ({ group: g.name, phase: p.name }))
  );

  const totalPhases = phases.length;

  return (
    <>
      <style>{CSS}</style>

      {/* Sub-header bar */}
      <div className="pg-bar">
        <span className="pg-bar-title">Phase Groups</span>
        <span className="pg-bar-sub">{loadState === 'done' ? `${groups.length} groups · ${totalPhases} phases` : 'Supabase'}</span>
        <button className="pg-bar-btn" onClick={() => { setNewLabel(''); setNewGroupOpen(true); }}>+ New Group</button>
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
                  style={{ borderLeftColor: '#7A4610' }}
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
                      <span className="pg-card-title">{g.name}</span>
                    )}

                    <button
                      className="pg-grp-edit"
                      title="Edit group name"
                      onClick={e => { e.stopPropagation(); setEditGrpId(g.id); setEditGrpVal(g.name); }}
                    >✎</button>
                    <span className="pg-card-count" id={`cnt-${g.id}`}>{phasesOf(g.id).length}</span>
                    <span className={`pg-chevron${isCollapsed ? ' collapsed' : ''}`}>▼</span>
                  </div>

                  {/* Phases list — animated collapse */}
                  <div className={`pg-collapse-wrap${isCollapsed ? '' : ' expanded'}`}>
                    <div className="pg-collapse-inner">
                      <div className="pg-phases">
                        {phasesOf(g.id).length === 0 && <div className="pg-empty-phases">No phases yet</div>}
                        {phasesOf(g.id).map((p, idx) => {
                          const isEditingPh = editPhId === p.id;
                          return (
                            <div
                              key={p.id}
                              className={`pg-phase-row${draggingPhId === p.id ? ' pg-dragging' : ''}${dragOverPhId === p.id ? ' pg-ph-over' : ''}`}
                              draggable
                              onDragStart={e => onPhaseDragStart(e, g.id, p.id)}
                              onDragEnd={onPhaseDragEnd}
                              onDragOver={e => onPhaseDragOver(e, g.id, p.id)}
                              onDragLeave={() => { if (dragOverPhId === p.id) setDragOverPhId(null); }}
                              onDrop={e => onPhaseDrop(e, g.id, p.id)}
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
                                    if (e.key === 'Escape') { setEditPhId(null); }
                                  }}
                                />
                              ) : (
                                <span className="pg-phase-name">{p.name}</span>
                              )}

                              <button className="pg-edit-btn" title="Edit phase name" onClick={() => { setEditPhId(p.id); setEditPhVal(p.name); }}>✎</button>
                              <button className="pg-del-btn" title="Delete phase" onClick={() => delPhase(p.id)}>×</button>
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
                    </div>
                  </div>
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
            <div className="pg-warn-title">Delete phase &ldquo;{warnModal.phase.name}&rdquo;?</div>
            <div className="pg-warn-sub">
              {warnModal.affected.length} order item{warnModal.affected.length !== 1 ? 's are' : ' is'} currently assigned to this phase.
              Choose a target phase to move them before deleting, or delete without moving.
            </div>
            <div className="pg-warn-list">
              {warnModal.affected.map(a => (
                <div key={a.id} className="pg-warn-item">
                  <span className="pg-warn-dot" />
                  <span className="pg-warn-oid">Order {a.order_id}</span>
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
                  .filter(o => !(o.group === warnModal.group.name && o.phase === warnModal.phase.name))
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
