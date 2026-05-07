import { NextResponse } from 'next/server';
import wcClient from '@/lib/woocommerce/client';

const GOALS = [
  { month: 'Jan', salesTgt: 200000,  mktTgt: 20000  },
  { month: 'Feb', salesTgt: 300000,  mktTgt: 30000  },
  { month: 'Mar', salesTgt: 400000,  mktTgt: 40000  },
  { month: 'Apr', salesTgt: 500000,  mktTgt: 50000  },
  { month: 'May', salesTgt: 600000,  mktTgt: 60000  },
  { month: 'Jun', salesTgt: 700000,  mktTgt: 70000  },
  { month: 'Jul', salesTgt: 900000,  mktTgt: 90000  },
  { month: 'Aug', salesTgt: 1100000, mktTgt: 110000 },
  { month: 'Sep', salesTgt: 1300000, mktTgt: 130000 },
  { month: 'Oct', salesTgt: 1500000, mktTgt: 150000 },
  { month: 'Nov', salesTgt: 2500000, mktTgt: 250000 },
  { month: 'Dec', salesTgt: 5000000, mktTgt: 500000 },
];

async function fetchMonthSales(year: number, month: number): Promise<number> {
  const mm = String(month).padStart(2, '0');
  const after  = `${year}-${mm}-01T00:00:00`;
  const before = `${year}-${mm}-31T23:59:59`;
  let total = 0;

  for (const status of ['pending', 'processing', 'on-hold', 'completed']) {
    let page = 1, pages = 1;
    do {
      const res = await wcClient.get('/orders', {
        params: { per_page: 100, after, before, status, page },
      });
      if (page === 1) pages = parseInt(res.headers['x-wp-totalpages'] ?? '1', 10);
      (res.data as { total: string }[]).forEach(o => { total += parseFloat(o.total) || 0; });
      page++;
    } while (page <= pages);
  }

  return Math.round(total);
}

async function fetchAccountSpend(accountId: string, timeRange: string): Promise<number> {
  const token = process.env.META_TOKEN;
  if (!token) return 0;

  let spend = 0;
  let url: string | null =
    `https://graph.facebook.com/v24.0/${accountId}/insights` +
    `?level=ad&fields=spend&time_range=${encodeURIComponent(timeRange)}&limit=500&access_token=${token}`;

  while (url) {
    const res  = await fetch(url);
    const json = await res.json() as { data?: { spend: string }[]; error?: { message: string }; paging?: { next?: string } };
    if (json.error) return 0;
    (json.data ?? []).forEach(d => { spend += parseFloat(d.spend) || 0; });
    url = json.paging?.next ?? null;
  }
  return spend;
}

async function fetchMonthMeta(year: number, month: number): Promise<number> {
  const accountIds = (process.env.META_ACCOUNT_IDS ?? '').split(',').filter(Boolean);
  if (accountIds.length === 0) return 0;

  const mm  = String(month).padStart(2, '0');
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
  const lastDay = isCurrentMonth
    ? String(now.getDate()).padStart(2, '0')
    : String(new Date(year, month, 0).getDate()).padStart(2, '0');

  const timeRange = JSON.stringify({ since: `${year}-${mm}-01`, until: `${year}-${mm}-${lastDay}` });
  const spends = await Promise.all(accountIds.map(id => fetchAccountSpend(id, timeRange)));
  return Math.round(spends.reduce((a, b) => a + b, 0) * 1.14);
}

export async function GET() {
  const now        = new Date();
  const curYear    = now.getFullYear();
  const monthCount = now.getMonth() + 1;

  try {
    const [wcActuals, metaActuals] = await Promise.all([
      Promise.all(Array.from({ length: monthCount }, (_, i) => fetchMonthSales(curYear, i + 1))),
      Promise.all(Array.from({ length: monthCount }, (_, i) => fetchMonthMeta(curYear, i + 1))),
    ]);

    const rows = GOALS.map((g, idx) => ({
      ...g,
      salesAct: idx < monthCount ? wcActuals[idx] : null,
      mktAct:   idx < monthCount ? metaActuals[idx] : null,
    }));

    return NextResponse.json({ rows, year: curYear });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
