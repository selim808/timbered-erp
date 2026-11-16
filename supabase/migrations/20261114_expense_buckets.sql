-- Expense buckets: 8 main buckets (expense_bucket_groups) and their sub-buckets (expense_buckets).
-- Same parent/child pattern as phase_groups → phases. Applied on 14-Nov-26.
create table public.expense_bucket_groups (
  id smallint generated always as identity primary key,
  name text not null unique,
  name_ar text,
  sort_order smallint not null,
  in_pnl boolean not null default true,
  active boolean not null default true,
  description text,
  created_at timestamptz not null default now()
);

create table public.expense_buckets (
  id integer generated always as identity primary key,
  group_id smallint not null references public.expense_bucket_groups(id) on update cascade,
  name text not null unique,
  name_ar text,
  sort_order smallint,
  active boolean not null default true,
  description text,
  created_at timestamptz not null default now()
);
create index on public.expense_buckets (group_id);

alter table public.expense_bucket_groups enable row level security;
alter table public.expense_buckets enable row level security;
revoke all on public.expense_bucket_groups, public.expense_buckets from anon, authenticated;
