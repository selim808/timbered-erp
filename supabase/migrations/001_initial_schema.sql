-- ─── Helpers ──────────────────────────────────────────────────────────────────

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ─── Profiles ─────────────────────────────────────────────────────────────────

create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text not null,
  full_name   text not null,
  role        text not null check (role in ('owner', 'manager', 'employee')),
  created_at  timestamptz not null default now()
);

alter table profiles enable row level security;

create or replace function get_user_role()
returns text as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer stable;

create policy "profiles: read own or owner/manager"
  on profiles for select
  using (id = auth.uid() or get_user_role() in ('owner', 'manager'));

create policy "profiles: owner can insert"
  on profiles for insert
  with check (get_user_role() = 'owner');

create policy "profiles: owner can update"
  on profiles for update
  using (get_user_role() = 'owner');

-- Auto-create profile row on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'employee')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─── Orders ───────────────────────────────────────────────────────────────────

create table orders (
  id               uuid primary key default gen_random_uuid(),
  wc_order_id      integer unique not null,
  status           text not null check (status in (
                     'placed','reviewed','planning','production',
                     'shipping','warehouse','delivery','follow_up')),
  customer_name    text not null,
  customer_email   text not null,
  customer_phone   text,
  billing_address  jsonb not null,
  shipping_address jsonb not null,
  line_items       jsonb not null default '[]',
  total            numeric(10,2) not null,
  currency         text not null default 'EGP',
  note             text,
  wc_created_at    timestamptz not null,
  wc_updated_at    timestamptz not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table orders enable row level security;

create trigger orders_updated_at
  before update on orders
  for each row execute function update_updated_at();

create policy "orders: authenticated can read"
  on orders for select
  using (auth.role() = 'authenticated');

create policy "orders: owner/manager can insert"
  on orders for insert
  with check (get_user_role() in ('owner', 'manager'));

create policy "orders: owner/manager can update"
  on orders for update
  using (get_user_role() in ('owner', 'manager'));

-- ─── Order Status History ─────────────────────────────────────────────────────

create table order_status_history (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references orders on delete cascade,
  from_status  text check (from_status in (
                 'placed','reviewed','planning','production',
                 'shipping','warehouse','delivery','follow_up')),
  to_status    text not null check (to_status in (
                 'placed','reviewed','planning','production',
                 'shipping','warehouse','delivery','follow_up')),
  changed_by   uuid not null references profiles,
  note         text,
  created_at   timestamptz not null default now()
);

alter table order_status_history enable row level security;

create policy "history: authenticated can read"
  on order_status_history for select
  using (auth.role() = 'authenticated');

create policy "history: authenticated can insert"
  on order_status_history for insert
  with check (auth.role() = 'authenticated');

-- ─── Products ─────────────────────────────────────────────────────────────────

create table products (
  id             uuid primary key default gen_random_uuid(),
  wc_product_id  integer unique not null,
  name           text not null,
  sku            text,
  price          numeric(10,2) not null,
  stock_quantity integer,
  stock_status   text not null check (stock_status in ('instock','outofstock','onbackorder')),
  image_url      text,
  categories     text[] not null default '{}',
  wc_created_at  timestamptz not null,
  updated_at     timestamptz not null default now()
);

alter table products enable row level security;

create trigger products_updated_at
  before update on products
  for each row execute function update_updated_at();

create policy "products: authenticated can read"
  on products for select
  using (auth.role() = 'authenticated');

create policy "products: owner/manager can write"
  on products for all
  using (get_user_role() in ('owner', 'manager'));

-- ─── Production Cards ─────────────────────────────────────────────────────────

create table production_cards (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders on delete cascade,
  order_wc_id   integer not null,
  customer_name text not null,
  product_name  text not null,
  quantity      integer not null,
  phase         text not null check (phase in (
                  'queue','cutting','assembly','finishing','quality_check','ready')),
  assigned_to   uuid references profiles,
  note          text,
  started_at    timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table production_cards enable row level security;

create trigger production_cards_updated_at
  before update on production_cards
  for each row execute function update_updated_at();

create policy "production: authenticated can read"
  on production_cards for select
  using (auth.role() = 'authenticated');

create policy "production: authenticated can update"
  on production_cards for update
  using (auth.role() = 'authenticated');

create policy "production: owner/manager can insert/delete"
  on production_cards for insert
  with check (get_user_role() in ('owner', 'manager'));

-- ─── Warehouse Items ──────────────────────────────────────────────────────────

create table warehouse_items (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references products on delete cascade,
  wc_product_id  integer not null,
  product_name   text not null,
  sku            text,
  quantity       integer not null default 0,
  location       text,
  updated_at     timestamptz not null default now()
);

alter table warehouse_items enable row level security;

create trigger warehouse_items_updated_at
  before update on warehouse_items
  for each row execute function update_updated_at();

create policy "warehouse: authenticated can read"
  on warehouse_items for select
  using (auth.role() = 'authenticated');

create policy "warehouse: authenticated can update"
  on warehouse_items for update
  using (auth.role() = 'authenticated');

create policy "warehouse: owner/manager can insert"
  on warehouse_items for insert
  with check (get_user_role() in ('owner', 'manager'));

-- ─── Stock Receivings ─────────────────────────────────────────────────────────

create table stock_receivings (
  id                uuid primary key default gen_random_uuid(),
  product_id        uuid not null references products on delete cascade,
  quantity_received integer not null,
  received_by       uuid not null references profiles,
  note              text,
  received_at       timestamptz not null default now()
);

alter table stock_receivings enable row level security;

create policy "stock: authenticated can read"
  on stock_receivings for select
  using (auth.role() = 'authenticated');

create policy "stock: authenticated can insert"
  on stock_receivings for insert
  with check (auth.role() = 'authenticated');

-- ─── Customers ────────────────────────────────────────────────────────────────

create table customers (
  id               uuid primary key default gen_random_uuid(),
  wc_customer_id   integer unique,
  full_name        text not null,
  email            text not null,
  phone            text,
  total_orders     integer not null default 0,
  total_spent      numeric(10,2) not null default 0,
  created_at       timestamptz not null default now()
);

alter table customers enable row level security;

create policy "customers: authenticated can read"
  on customers for select
  using (auth.role() = 'authenticated');

create policy "customers: owner/manager can write"
  on customers for all
  using (get_user_role() in ('owner', 'manager'));
