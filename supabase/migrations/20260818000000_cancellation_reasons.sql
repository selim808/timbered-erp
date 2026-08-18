-- Cancellation reasons
-- Backfills the table the cancellation-reasons routes have always queried
-- (app/api/cancellation-reasons/**) but that no migration ever created —
-- GET returned "Could not find the table 'public.cancellation_reasons'".
-- No RLS: every route reads/writes through the service-role client
-- server-side, same as the CS module tables.

create table if not exists cancellation_reasons (
  id          uuid primary key default gen_random_uuid(),
  label       text not null unique,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- GET filters on is_active and orders by sort_order.
create index if not exists cancellation_reasons_active_idx
  on cancellation_reasons (is_active, sort_order);

-- Seed a starting set, but only into an empty table so re-running the
-- migration never resurrects reasons the owner deleted in the manager.
insert into cancellation_reasons (label, sort_order)
select v.label, v.sort_order
from (values
  ('Customer changed their mind',   10),
  ('Duplicate order',               20),
  ('Price / budget',                30),
  ('Delivery time too long',        40),
  ('Item out of stock',             50),
  ('Customer unreachable',          60),
  ('Payment not completed',         70),
  ('Wrong item ordered',            80),
  ('Other',                         90)
) as v(label, sort_order)
where not exists (select 1 from cancellation_reasons);
