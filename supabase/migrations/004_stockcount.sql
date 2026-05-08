-- Stock count table synced from Firebase
create table if not exists stockcount (
  product_id  bigint primary key,
  stock       integer not null default 0,
  defected    integer not null default 0,
  updated_at  timestamptz,
  synced_at   timestamptz not null default now()
);

-- RLS
alter table stockcount enable row level security;

create policy "stockcount: authenticated can read"
  on stockcount for select
  using (auth.role() = 'authenticated');

grant select, insert, update, delete on stockcount to service_role;
