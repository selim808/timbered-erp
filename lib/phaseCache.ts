import type { PhaseGroup, Phase } from '@/components/shared/PipelineOrderCard';
import { PREDEFINED_PHASE_GROUPS, PREDEFINED_PHASES } from '@/data/phases';

// Client-side cache for phase groups & phases.
//
// The app reads phases from this cache instead of hitting the DB on every page:
//   1. localStorage copy (set by the "Load new phases" button), if present;
//   2. otherwise the PREDEFINED snapshot bundled in data/phases.ts.
//
// This keeps the pipeline pages instant and working on flaky mobile networks —
// phases change rarely, so a manual refresh is enough.

const GROUPS_KEY = 'tg_phase_groups_v1';
const PHASES_KEY = 'tg_phases_v1';

function readCache<T>(key: string, fallback: T[]): T[] {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

/** Cached phase groups, or the predefined snapshot. Safe to call during render. */
export function getPhaseGroups(): PhaseGroup[] {
  return readCache(GROUPS_KEY, PREDEFINED_PHASE_GROUPS);
}

/** Cached phases, or the predefined snapshot. Safe to call during render. */
export function getPhases(): Phase[] {
  return readCache(PHASES_KEY, PREDEFINED_PHASES);
}

/**
 * Fetch the latest phase groups & phases from the API and overwrite the cache.
 * Used by the "Load new phases" button on the dashboard.
 */
export async function refreshPhaseCache(): Promise<{ groups: number; phases: number }> {
  const [groups, phases] = await Promise.all([
    fetch('/api/phase-groups').then(r => r.json()),
    fetch('/api/phases').then(r => r.json()),
  ]);

  if (!Array.isArray(groups) || groups.length === 0) {
    throw new Error(groups?.error ?? 'Could not load phase groups');
  }
  if (!Array.isArray(phases) || phases.length === 0) {
    throw new Error(phases?.error ?? 'Could not load phases');
  }

  window.localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
  window.localStorage.setItem(PHASES_KEY, JSON.stringify(phases));
  return { groups: groups.length, phases: phases.length };
}
