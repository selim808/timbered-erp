'use client';

import { useEffect, useRef, useState } from 'react';
import LoadingDots from './LoadingDots';
import type { DailyResponse, DayTotals, MoveRow, StuckRow } from '@/app/api/daily/route';
import type { PipelineOrder } from '@/app/api/pipeline/orders/route';
import OrderDetailSheet from '@/components/shared/OrderDetailSheet';
import CashExpenseCards from '@/components/shared/CashExpenseCards';
import { groupColor } from '@/lib/phaseGroupColors';
import { cairoNowLabel, shareElementAsImage } from '@/lib/shareImage';

const fmt = (n: number) => Math.round(n).toLocaleString('en-GB');

const todayCairo = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });

function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** "Thu, 6 Nov 2026" */
function dayLabel(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

/** "14:05" in Cairo. */
const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit' });

/** ▲ / ▼ against yesterday. `goodWhenUp` false for cancellations and spend. */
function Delta({ now, prev, goodWhenUp = true, money = false }: { now: number; prev: number; goodWhenUp?: boolean; money?: boolean }) {
  const diff = now - prev;
  if (diff === 0) return <span className="dl-delta flat">= yday</span>;
  const up = diff > 0;
  const good = up === goodWhenUp;
  return (
    <span className={`dl-delta ${good ? 'good' : 'bad'}`}>
      {up ? '▲' : '▼'} {money ? fmt(Math.abs(diff)) : Math.abs(diff)} vs yday
    </span>
  );
}

const STYLES = `
.dl-wrap { padding:10px 12px; display:flex; flex-direction:column; gap:12px; }
.dl-bar { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.dl-nav { border:1px solid #E8D9C4; background:#fff; border-radius:8px; width:32px; height:32px; font-size:14px; color:#7A4610; cursor:pointer; }
.dl-nav:disabled { opacity:.35; cursor:default; }
.dl-date { border:1.5px solid #C8AA88; border-radius:8px; padding:6px 8px; font:inherit; font-size:13px; color:#1C1A17; background:#fff; }
.dl-day { font-weight:700; color:#1C1A17; font-size:13px; flex:1; }
.dl-share { display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:50%; border:1px solid #E8D9C4; background:#fff; color:#25D366; cursor:pointer; padding:0; }
.dl-share:disabled { color:#bbb; cursor:default; }
.dl-cards { display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; }
.dl-card { background:#fff; border:1px solid #E8D9C4; border-radius:12px; padding:10px 10px 9px; text-align:center; min-width:0; }
.dl-card-lbl { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.8px; color:#9e9087; }
.dl-card-val { font-size:20px; font-weight:800; margin-top:2px; }
.dl-card-sub { font-size:12px; font-weight:700; color:#1C1A17; }
.dl-delta { display:block; font-size:10px; font-weight:700; margin-top:3px; }
.dl-delta.good { color:#1e8449; } .dl-delta.bad { color:#c0392b; } .dl-delta.flat { color:#9e9087; }
.dl-panel { background:#fff; border:1px solid #E8D9C4; border-radius:12px; padding:12px; }
.dl-title { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:#9e9087; margin-bottom:8px; }
.dl-target-row { display:flex; justify-content:space-between; font-size:12px; color:#1C1A17; margin-bottom:6px; }
.dl-meter { height:12px; border-radius:6px; background:#f0e8e0; overflow:hidden; }
.dl-meter > div { height:100%; border-radius:6px; }
.dl-kv { display:flex; justify-content:space-between; align-items:baseline; font-size:13px; color:#1C1A17; padding:2px 0; }
.dl-kv span:first-child { color:#7A6F65; }
.dl-reasons { margin-top:8px; display:flex; flex-wrap:wrap; gap:6px; }
.dl-reason { font-size:11px; font-weight:700; color:#922b21; background:#fdedec; border-radius:10px; padding:2px 8px; }
.dl-groups { display:grid; grid-template-columns:repeat(auto-fill, minmax(120px, 1fr)); gap:8px; }
.dl-group { text-align:left; border:1px solid #E8D9C4; border-left-width:5px; border-radius:10px; background:#fff; padding:8px 10px; cursor:pointer; font:inherit; }
.dl-group b { display:block; font-size:12px; color:#1C1A17; }
.dl-group span { font-size:11px; color:#7A6F65; }
.dl-empty { font-size:12px; color:#9e9087; text-align:center; padding:6px 0; }
.dl-stuck { width:100%; text-align:left; border:1.5px solid #f5b7b1; background:#fdf2f0; color:#922b21; border-radius:12px; padding:10px 12px; font:inherit; font-size:13px; font-weight:700; cursor:pointer; }
.dl-ok { font-size:12px; color:#1e8449; font-weight:700; text-align:center; }
.share-only { display:none; }
.dl-modal-overlay { position:fixed; inset:0; z-index:1000; background:rgba(28,26,23,.45); display:flex; align-items:center; justify-content:center; padding:16px; }
.dl-modal { background:#fff; border-radius:12px; width:100%; max-width:560px; max-height:85vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 12px 40px rgba(0,0,0,.25); }
.dl-modal-head { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:12px 14px; color:#fff; }
.dl-modal-close { background:none; border:none; color:inherit; font-size:22px; line-height:1; cursor:pointer; padding:0 2px; }
.dl-tbl { width:100%; border-collapse:collapse; font-size:12px; }
.dl-tbl th { position:sticky; top:0; background:#FBF5EC; color:#7A6F65; font-size:10px; text-transform:uppercase; letter-spacing:.5px; text-align:left; padding:7px 10px; }
.dl-tbl td { padding:7px 10px; border-bottom:1px solid #F0E6D8; vertical-align:top; }
.dl-tbl .num { text-align:right; white-space:nowrap; }
.dl-ord { font-weight:700; color:#7A4610; background:none; border:none; padding:0; cursor:pointer; text-decoration:underline dotted; text-underline-offset:3px; font:inherit; font-size:12px; }
.dl-move { font-size:11px; color:#7A6F65; }
.dl-move b { color:#1C1A17; }
`;

interface ListModal {
  title: string;
  color: string;
  kind: 'moves' | 'stuck';
  rows: (MoveRow | StuckRow)[];
}

export default function DailySection() {
  const [date, setDate] = useState(todayCairo);
  const [data, setData] = useState<DailyResponse | null>(null);
  const [error, setError] = useState('');
  const [list, setList] = useState<ListModal | null>(null);
  const [detail, setDetail] = useState<PipelineOrder | null>(null);
  const [detailState, setDetailState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [sharing, setSharing] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/daily?date=${date}`)
      .then(r => r.json())
      .then((d: DailyResponse & { error?: string }) => {
        if (!live) return;
        if (d.error) throw new Error(d.error);
        setData(d);
        setError('');
      })
      .catch((e: Error) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [date]);

  function changeDate(next: string) {
    setData(null);
    setError('');
    setDate(next);
  }

  function openOrder(id: number) {
    setDetailState('loading');
    fetch(`/api/orders/${id}`)
      .then(r => r.json())
      .then((o: PipelineOrder & { error?: string }) => {
        if (o.error) throw new Error(o.error);
        setDetail(o);
        setDetailState('idle');
      })
      .catch(() => setDetailState('error'));
  }

  async function share() {
    if (!shareRef.current || !data) return;
    setSharing(true);
    try {
      await shareElementAsImage(shareRef.current, {
        name: `daily-flash-${data.date}`,
        addDate: false, // the picture is for data.date, which may not be today
        text: `Daily flash · ${dayLabel(data.date)}`,
        prepare: clone => {
          // html2canvas draws this font ~4px low in coloured boxes; nudge text up in the picture.
          clone.querySelectorAll<HTMLElement>('.dl-reason').forEach(n => {
            n.innerHTML = `<span style="position:relative;top:-3px">${n.textContent ?? ''}</span>`;
          });
        },
      });
    } catch (e) {
      alert('Could not share the image: ' + (e instanceof Error ? e.message : String(e)));
    }
    setSharing(false);
  }

  const today = todayCairo();
  const minDate = shiftDate(today, -60);

  const header = (
    <div className="dl-bar" data-html2canvas-ignore>
      <button className="dl-nav" onClick={() => changeDate(shiftDate(date, -1))} disabled={date <= minDate} aria-label="Previous day">◀</button>
      <input className="dl-date" type="date" value={date} min={minDate} max={today}
        onChange={e => e.target.value && changeDate(e.target.value)} />
      <button className="dl-nav" onClick={() => changeDate(shiftDate(date, 1))} disabled={date >= today} aria-label="Next day">▶</button>
      <span className="dl-day">{date === today ? 'Today' : dayLabel(date)}</span>
      <button className="dl-share" onClick={() => void share()} disabled={!data || sharing} title="Share as image" aria-label="Share daily flash as image">
        {sharing ? '…' : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
        )}
      </button>
    </div>
  );

  if (error) return (
    <div className="dl-wrap"><style>{STYLES}</style>{header}
      <div style={{ padding: '16px', textAlign: 'center', fontSize: 13, color: '#b0341e' }}>Could not load the daily flash — {error}</div>
    </div>
  );
  if (!data) return <div className="dl-wrap"><style>{STYLES}</style>{header}<LoadingDots label="Loading daily flash" /></div>;

  const { placed, completed, cancelled, adSpend, target, movements, stuck } = data;
  const targetPct = target > 0 ? Math.round(placed.value / target * 100) : 0;
  const perOrder = placed.count > 0 ? Math.round(adSpend.value / placed.count) : null;

  const card = (label: string, t: DayTotals & { yday: DayTotals }, color: string, goodWhenUp: boolean) => (
    <div className="dl-card">
      <div className="dl-card-lbl">{label}</div>
      <div className="dl-card-val" style={{ color }}>{t.count}</div>
      <div className="dl-card-sub">{fmt(t.value)}</div>
      <Delta now={t.value} prev={t.yday.value} goodWhenUp={goodWhenUp} money />
    </div>
  );

  return (
    <>
      <style>{STYLES}</style>
      <div className="dl-wrap" ref={shareRef}>
        {header}
        <div className="share-only" style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#7A4610' }}>Timbered · Daily flash</div>
          <div style={{ fontSize: 12, color: '#7A6F65' }}>{dayLabel(data.date)}{data.isToday ? ` · as of ${cairoNowLabel().split(', ').pop()}` : ''}</div>
        </div>

        {/* Placed / Completed / Cancelled */}
        <div className="dl-cards">
          {card('Placed', placed, '#2563EB', true)}
          {card('Completed', completed, '#1e8449', true)}
          {card('Cancelled', cancelled, '#c0392b', false)}
        </div>

        {/* Cash in & expenses (accounting sheet) */}
        <CashExpenseCards from={data.date} to={data.date} periodLabel={dayLabel(data.date)} />

        {/* Target & ad spend */}
        <div className="dl-panel">
          <div className="dl-target-row">
            <span><b>Placed vs daily target</b></span>
            <span><b>{fmt(placed.value)}</b> / {fmt(target)} · <b style={{ color: targetPct >= 100 ? '#1e8449' : '#B86E1A' }}>{targetPct}%</b></span>
          </div>
          <div className="dl-meter">
            <div style={{ width: `${Math.min(100, targetPct)}%`, background: targetPct >= 100 ? '#27ae60' : '#F0AE66' }} />
          </div>
          <div style={{ marginTop: 10 }}>
            <div className="dl-kv">
              <span>Ad spend</span>
              <span><b>{fmt(adSpend.value)}</b> <Delta now={adSpend.value} prev={adSpend.yday} goodWhenUp={false} money /></span>
            </div>
            <div className="dl-kv">
              <span>Cost per placed order</span>
              <span><b>{perOrder === null ? '—' : fmt(perOrder)}</b></span>
            </div>
          </div>
          {cancelled.reasons.length > 0 && (
            <div className="dl-reasons">
              {cancelled.reasons.map(r => <span key={r.reason} className="dl-reason">{r.reason} · {r.count}</span>)}
            </div>
          )}
        </div>

        {/* Movements by phase group */}
        <div className="dl-panel">
          <div className="dl-title">Movements {data.isToday ? 'today' : 'that day'} · items moved into each group</div>
          {movements.groups.length === 0 ? (
            <div className="dl-empty">No phase changes recorded.</div>
          ) : (
            <div className="dl-groups">
              {movements.groups.map(g => (
                <button key={g.group} className="dl-group" style={{ borderLeftColor: groupColor(g.group) }}
                  onClick={() => setList({
                    title: `${g.group} · moved in`, color: groupColor(g.group), kind: 'moves',
                    rows: movements.rows.filter(r => r.group === g.group),
                  })}>
                  <b>{g.group}</b>
                  <span>{g.moves} item{g.moves === 1 ? '' : 's'} · {fmt(g.value)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Stuck items (today only) */}
        {data.isToday && (stuck.rows.length > 0 ? (
          <button className="dl-stuck"
            onClick={() => setList({ title: `Stuck ${stuck.days}+ days`, color: '#c0392b', kind: 'stuck', rows: stuck.rows })}>
            ⚠ {stuck.rows.length} item{stuck.rows.length === 1 ? '' : 's'} stuck in the same phase for {stuck.days}+ days · {fmt(stuck.rows.reduce((s, r) => s + r.value, 0))} →
          </button>
        ) : (
          <div className="dl-ok">✓ No items stuck for {stuck.days}+ days</div>
        ))}
      </div>

      {list && (
        <div className="dl-modal-overlay" onClick={() => setList(null)}>
          <div className="dl-modal" onClick={e => e.stopPropagation()}>
            <div className="dl-modal-head" style={{ background: list.color, color: list.color === '#f4d03f' ? '#1C1A17' : '#fff' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{list.title}</div>
                <div style={{ fontSize: 11, opacity: .9 }}>
                  {list.rows.length} item{list.rows.length === 1 ? '' : 's'} · {fmt(list.rows.reduce((s, r) => s + r.value, 0))} EGP
                </div>
              </div>
              <button className="dl-modal-close" onClick={() => setList(null)} aria-label="Close">×</button>
            </div>
            <div style={{ overflowY: 'auto' }}>
              <table className="dl-tbl">
                <thead>
                  <tr>
                    <th>Order</th><th>Customer / item</th><th className="num">Value</th>
                    <th className="num">{list.kind === 'moves' ? 'Time' : 'Stuck'}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.rows.map((r, i) => (
                    <tr key={`${r.orderNumber}-${i}`}>
                      <td><button className="dl-ord" onClick={() => openOrder(r.orderId)}>{r.orderNumber}</button></td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.customer || '—'}</div>
                        <div style={{ fontSize: 11, color: '#7A6F65' }}>{r.item}{r.qty > 1 ? ` ×${r.qty}` : ''}</div>
                        {'to' in r ? (
                          <div className="dl-move">{r.from ? <>{r.from} → </> : 'New → '}<b>{r.to}</b> · {r.source}</div>
                        ) : (
                          <div className="dl-move">in <b>{r.phase}</b></div>
                        )}
                      </td>
                      <td className="num">{fmt(r.value)}</td>
                      <td className="num">{'to' in r ? timeLabel(r.at) : `${r.days}d`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {detail && (
        <OrderDetailSheet order={detail} onBack={() => setDetail(null)} onClose={() => { setDetail(null); setList(null); }} />
      )}
      {detailState === 'loading' && <div className="dl-modal-overlay" style={{ zIndex: 1050, color: '#fff', fontSize: 13 }}>Loading order…</div>}
      {detailState === 'error' && (
        <div className="dl-modal-overlay" style={{ zIndex: 1050 }} onClick={() => setDetailState('idle')}>
          <div className="dl-modal" style={{ padding: 20, textAlign: 'center', color: '#b0341e', fontSize: 13 }}>Couldn&apos;t load that order.</div>
        </div>
      )}
    </>
  );
}
