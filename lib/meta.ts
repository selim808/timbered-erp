// Meta (Facebook/Instagram) ad spend across the ad accounts in META_ACCOUNT_IDS.

async function fetchAccountSpend(accountId: string, timeRange: string): Promise<number> {
  const token = process.env.META_TOKEN;
  if (!token) return 0;

  const url =
    `https://graph.facebook.com/v24.0/${accountId}/insights` +
    `?level=account&fields=spend&time_range=${encodeURIComponent(timeRange)}&access_token=${token}`;

  const res  = await fetch(url);
  const json = await res.json() as { data?: { spend: string }[]; error?: { message: string } };
  if (json.error) return 0;
  return (json.data ?? []).reduce((s, d) => s + (parseFloat(d.spend) || 0), 0);
}

/**
 * Total ad spend between two dates inclusive (YYYY-MM-DD, in each ad
 * account's own time zone), including 14% VAT. 0 when Meta isn't configured.
 */
export async function fetchAdSpend(since: string, until: string): Promise<number> {
  const accountIds = (process.env.META_ACCOUNT_IDS ?? '').split(',').filter(Boolean);
  if (accountIds.length === 0) return 0;
  const timeRange = JSON.stringify({ since, until });
  const spends = await Promise.all(accountIds.map(id => fetchAccountSpend(id, timeRange)));
  return Math.round(spends.reduce((a, b) => a + b, 0) * 1.14);
}
