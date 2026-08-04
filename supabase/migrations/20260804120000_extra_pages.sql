-- Extra Pages module
-- Stores standalone HTML documents uploaded from the Operations hub. The html
-- column holds the file verbatim — it is never parsed, sanitised or templated;
-- the viewer renders it as-is inside a sandboxed iframe. No RLS: every route in
-- this app reads/writes through the service-role client server-side.

create table if not exists extra_pages (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  slug            text not null unique,
  html            text not null default '',
  source_filename text,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists extra_pages_sort_idx on extra_pages (sort_order, created_at);

create or replace function extra_pages_touch_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_extra_pages_updated_at on extra_pages;
create trigger trg_extra_pages_updated_at
  before update on extra_pages
  for each row execute function extra_pages_touch_updated_at();
