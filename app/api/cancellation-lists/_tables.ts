// Maps the URL list key to its Supabase table. Only these three are allowed.
export const CANCELLATION_TABLES = {
  reasons: 'cancellation_reasons',
  timing: 'cancellation_timing',
  impact: 'cancellation_impact',
} as const;

export type CancellationList = keyof typeof CANCELLATION_TABLES;

export function tableFor(list: string): string | null {
  return (CANCELLATION_TABLES as Record<string, string>)[list] ?? null;
}
