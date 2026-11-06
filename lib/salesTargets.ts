// Monthly sales plan for the current year (used by Goals and the Daily flash).
// Aug–Dec ramps linearly from 700K to 1M (+75K/month).
export const SALES_TGT: Record<string, number> = {
  Jan: 200_000, Feb: 300_000, Mar: 400_000, Apr: 500_000, May: 600_000,
  Jun: 400_000, Jul: 400_000, Aug: 700_000, Sep: 775_000,
  Oct: 850_000, Nov: 925_000, Dec: 1_000_000,
};

const MONTHS = Object.keys(SALES_TGT);

/** The month's plan spread evenly over its days. month is 1–12. */
export function dailySalesTarget(year: number, month: number): number {
  const days = new Date(year, month, 0).getDate();
  return Math.round((SALES_TGT[MONTHS[month - 1]] ?? 0) / days);
}
