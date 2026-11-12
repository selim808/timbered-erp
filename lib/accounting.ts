// Cash-in and expenses from the "Accounting-Entry" Google Sheet.
//
// The sheet is shared as "anyone with the link can view", so each tab is read
// through its CSV export (what the sheet shows, so text-typed dates such as
// "15-October-26" survive). Columns are found by their heading, so reordering
// columns in the sheet doesn't break this.

const SHEET_ID = process.env.ACCOUNTING_SHEET_ID ?? '1iToqTUU7m7B03UstNvavVt1MGoFzAmo_K88LcgtyU9o';

/** Tabs read, by gid. "Copy of Expenses Omar" and "Expenses others" are deliberately left out. */
const CASH_TABS = [{ name: 'Cash in', gid: '766490067' }];
const EXPENSE_TABS = [
  { name: 'Expenses Omar',      gid: '43369540' },
  { name: 'Expenses Saied',     gid: '0' },
  { name: 'Marketing Expenses', gid: '185202289' },
];

const CACHE_MS = 3 * 60_000;

export interface AccountingEntry {
  kind: 'cash' | 'expense';
  /** YYYY-MM-DD */
  date: string;
  amount: number;
  description: string;
  /** Expenses: the sheet's Bucket; cash in: empty. */
  bucket: string;
  /** Expenses: COGS / Marketing / Fixed costs / Logistics / Losses / Other. Cash in: payment method. */
  group: string;
  person: string;
  method: string;
  /** Cash in: the order number it pays for, when given. */
  order: string;
  tab: string;
  /** False only where the tab has a Confirmed column set to FALSE. */
  confirmed: boolean;
  /** The ERP's own reference (ERP-123) when the entry came from it. */
  ref: string;
}

// ─── CSV ────────────────────────────────────────────────────────────────────

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// ─── Values ─────────────────────────────────────────────────────────────────

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const pad = (n: number) => String(n).padStart(2, '0');
const fullYear = (y: number) => (y < 100 ? 2000 + y : y);

/** "12-Nov-26", "1-Jul-26", "15-October-26", "4/20/2026" (month first), "2026-11-12" → YYYY-MM-DD. */
export function parseSheetDate(raw: string): string | null {
  const s = raw.trim();
  let m = s.match(/^(\d{1,2})[-\s]([A-Za-z]+)[-\s,]+(\d{2,4})$/);
  if (m) {
    const mon = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase());
    return mon < 0 ? null : `${fullYear(Number(m[3]))}-${pad(mon + 1)}-${pad(Number(m[1]))}`;
  }
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) return `${fullYear(Number(m[3]))}-${pad(Number(m[1]))}-${pad(Number(m[2]))}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

const toAmount = (raw: string) => parseFloat(raw.replace(/[^0-9.-]/g, '')) || 0;

/** Old and new bucket names → one of the report's expense groups. */
export function expenseGroup(bucket: string): string {
  const b = bucket.trim().toLowerCase().replace(/^stop using\s+/, '');
  if (b.startsWith('cogs') || ['supplier', 'accessories', 'fab material', 'packing materials', 'assembly n painting', 'installation'].includes(b)) return 'COGS';
  if (b === 'marketing') return 'Marketing';
  if (b.startsWith('fc') || ['salaries', 'adminstation', 'administration', 'assets', 'fintech'].includes(b)) return 'Fixed costs';
  if (b.startsWith('logistics') || b === 'shipping') return 'Logistics';
  if (b.startsWith('losses') || ['unforeseen', 'cash back'].includes(b)) return 'Losses';
  return 'Other';
}

export const EXPENSE_GROUPS = ['COGS', 'Marketing', 'Fixed costs', 'Logistics', 'Losses', 'Other'];

// ─── Reading ────────────────────────────────────────────────────────────────

async function readTab(gid: string): Promise<string[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  const res = await fetch(url, { cache: 'no-store' });
  const text = await res.text();
  if (!res.ok || text.trimStart().startsWith('<')) {
    throw new Error('Could not read the accounting sheet — check it is shared as "Anyone with the link can view"');
  }
  return parseCsv(text);
}

function toEntries(rows: string[][], tab: string, kind: 'cash' | 'expense'): AccountingEntry[] {
  const head = (rows[0] ?? []).map(h => h.trim().toLowerCase());
  const col = (...names: string[]) => head.findIndex(h => names.includes(h));
  const iDate = col('date'), iDesc = col('description'), iBucket = col('bucket');
  const iPerson = col('person'), iMethod = col('method'), iRef = col('erp ref'), iConfirmed = col('confirmed');
  const iOrder = col('order');
  // Cash in records what was actually collected; expenses have an Amount.
  const iAmount = kind === 'cash' ? col('collected') : col('amount');
  if (iDate < 0 || iAmount < 0) throw new Error(`"${tab}" is missing its Date or ${kind === 'cash' ? 'Collected' : 'Amount'} column`);

  const out: AccountingEntry[] = [];
  for (const r of rows.slice(1)) {
    const date = parseSheetDate(r[iDate] ?? '');
    const amount = toAmount(r[iAmount] ?? '');
    if (!date || !amount) continue;
    const bucket = iBucket >= 0 ? (r[iBucket] ?? '').trim() : '';
    const method = iMethod >= 0 ? (r[iMethod] ?? '').trim() : '';
    out.push({
      kind, date, amount,
      description: (iDesc >= 0 ? r[iDesc] : '')?.trim() ?? '',
      bucket,
      group: kind === 'cash' ? (method || 'Unspecified') : expenseGroup(bucket),
      person: iPerson >= 0 ? (r[iPerson] ?? '').trim() : '',
      method,
      order: iOrder >= 0 ? (r[iOrder] ?? '').trim() : '',
      tab,
      confirmed: iConfirmed >= 0 ? (r[iConfirmed] ?? '').trim().toUpperCase() !== 'FALSE' : true,
      ref: iRef >= 0 ? (r[iRef] ?? '').trim() : '',
    });
  }
  return out;
}

let cache: { at: number; entries: AccountingEntry[] } | null = null;

/** Every cash-in and expense entry, re-read at most every few minutes. */
export async function getAccountingEntries(): Promise<AccountingEntry[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.entries;
  const tabs = await Promise.all([
    ...CASH_TABS.map(async t => toEntries(await readTab(t.gid), t.name, 'cash')),
    ...EXPENSE_TABS.map(async t => toEntries(await readTab(t.gid), t.name, 'expense')),
  ]);
  cache = { at: Date.now(), entries: tabs.flat() };
  return cache.entries;
}
