import { NextResponse } from 'next/server';
import { fetchOrderById } from '@/lib/commerce/orders';

export interface JourneyStep {
  phase: string;
  /** When the item entered this phase (ISO). */
  at: string;
  /** Who moved it: Auto, ERP, Shopify, Production… */
  source: string;
}

export interface ItemJourney {
  title: string;
  /** Current phase. */
  phase: string;
  steps: JourneyStep[];
}

export interface OrderJourneyResponse {
  orderNumber: string;
  /** When the order was placed, so the first step's wait can be shown. */
  placedAt: string;
  /** Keyed by line item id. */
  items: Record<string, ItemJourney>;
}

const SOURCES: Record<string, string> = { auto: 'Auto', erp: 'ERP', 'erp-reassign': 'ERP', shopify: 'Shopify' };

// GET: every item's phase history on one order, from its kanban data
// (Shopify metafield timbered.kanban_phase; Woo order meta).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const order = await fetchOrderById(id);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const items: Record<string, ItemJourney> = {};
    for (const [lineItemId, k] of Object.entries(order.kanban ?? {})) {
      items[lineItemId] = {
        title: k.title ?? '',
        phase: k.phase,
        steps: (k.history ?? [])
          .map(h => ({ phase: h.phase, at: h.at, source: SOURCES[h.source] ?? h.source }))
          .sort((a, b) => a.at.localeCompare(b.at)),
      };
    }

    const body: OrderJourneyResponse = {
      orderNumber: String(order.number || order.id),
      placedAt: order.date_created,
      items,
    };
    return NextResponse.json(body);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load order' },
      { status: 502 },
    );
  }
}
