-- Ensure each WooCommerce order line item has exactly one phase row.
-- Keep the newest row if historical duplicates already exist.

with ranked_item_phase as (
  select
    id,
    row_number() over (
      partition by order_id, line_item_id
      order by updated_at desc nulls last, id desc
    ) as row_num
  from public.item_phase
)
delete from public.item_phase
using ranked_item_phase
where public.item_phase.id = ranked_item_phase.id
  and ranked_item_phase.row_num > 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'item_phase_order_line_item_unique'
  ) then
    alter table public.item_phase
      add constraint item_phase_order_line_item_unique
      unique (order_id, line_item_id);
  end if;
end $$;
