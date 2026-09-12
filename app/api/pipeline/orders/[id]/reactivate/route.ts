import { NextResponse } from 'next/server';
import { reactivateOrder } from '@/lib/commerce/write';
import { createAdminClient } from '@/lib/supabase/admin';

// POST: move a cancelled order back to processing.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await reactivateOrder(id);

    await createAdminClient().rpc('cs_set_order_status', {
      p_wc_order_id: id,
      p_new_status: 'new',
      p_note: 'Reactivated',
      p_created_by: null,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
