-- Extra pages — standalone HTML tools handed to people outside the company
-- (a sales rep, a contractor). Each page has its own password; unlocking one
-- grants access to that page only, never to /owner or anything else.
--
-- The HTML itself lives in content/extras/<file_name> — deliberately NOT in
-- public/, so the only way to reach it is through the password check in
-- app/extras/[slug]/route.ts.
--
-- No RLS: this table is read server-side through the service-role client.

create table if not exists extra_pages (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  title          text not null,
  file_name      text not null,
  -- scrypt:<salt-hex>:<hash-hex> — see lib/extras.ts. Never store plaintext.
  password_hash  text not null,
  -- Flip to false to revoke a page without deleting the row.
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists extra_pages_slug_idx on extra_pages (slug) where active;

-- Keep updated_at honest (same pattern as cs_order_state).
create or replace function extra_pages_touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists extra_pages_updated_at on extra_pages;
create trigger extra_pages_updated_at
  before update on extra_pages
  for each row execute function extra_pages_touch_updated_at();
