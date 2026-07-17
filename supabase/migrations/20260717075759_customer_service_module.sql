-- Customer Service module
-- All new tables key off wc_order_id (text) — matches item_phase/job_orders,
-- since there is no Supabase `orders` table. No RLS: every route in this app
-- reads/writes through the service-role client server-side.

-- ─── cs_order_state ──────────────────────────────────────────────────────
-- One row per WC order, lazily auto-seeded (mirrors item_phase's 'Placed'
-- auto-seed in app/api/pipeline/orders/route.ts).
create table if not exists cs_order_state (
  id                uuid primary key default gen_random_uuid(),
  wc_order_id       text not null unique,
  cs_status         text not null default 'new' check (cs_status in (
                      'new', 'called', 'confirmed', 'deposit_pending', 'deposit_paid',
                      'in_production', 'delayed', 'delivered', 'review_requested',
                      'closed', 'cancelled'
                    )),
  deposit_required  boolean not null default false,
  deposit_amount    numeric,
  deposit_paid_at   timestamptz,
  delivered_at      timestamptz,
  upsell_offered    boolean not null default false,
  upsell_accepted   boolean,
  upsell_note       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ─── cs_status_history ───────────────────────────────────────────────────
-- Append-only audit log, populated by trigger below.
create table if not exists cs_status_history (
  id           uuid primary key default gen_random_uuid(),
  wc_order_id  text not null,
  from_status  text,
  to_status    text not null,
  note         text,
  created_by   text,
  created_at   timestamptz not null default now()
);
create index if not exists cs_status_history_order_idx on cs_status_history (wc_order_id, created_at);

-- created_by/note come from the app via the transaction-local settings
-- set inside cs_set_order_status() below, so the trigger stays the single
-- place history rows are written no matter how cs_status is updated.
create or replace function cs_order_state_log_status_change()
returns trigger as $$
begin
  if new.cs_status is distinct from old.cs_status then
    insert into cs_status_history (wc_order_id, from_status, to_status, note, created_by)
    values (
      new.wc_order_id, old.cs_status, new.cs_status,
      nullif(current_setting('app.cs_note', true), ''),
      nullif(current_setting('app.cs_created_by', true), '')
    );
  end if;
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_cs_order_state_status_history on cs_order_state;
create trigger trg_cs_order_state_status_history
  before update on cs_order_state
  for each row
  execute function cs_order_state_log_status_change();

-- Single entry point the API uses to change cs_status: upserts
-- cs_order_state and lets the trigger above log the transition, carrying
-- note/created_by through session-local settings for the duration of the call.
create or replace function cs_set_order_status(
  p_wc_order_id text,
  p_new_status  text,
  p_note        text default null,
  p_created_by  text default null
) returns cs_order_state as $$
declare
  result cs_order_state;
begin
  perform set_config('app.cs_note', coalesce(p_note, ''), true);
  perform set_config('app.cs_created_by', coalesce(p_created_by, ''), true);

  insert into cs_order_state (wc_order_id, cs_status)
  values (p_wc_order_id, p_new_status)
  on conflict (wc_order_id) do update
    set cs_status = excluded.cs_status
  returning * into result;

  return result;
end;
$$ language plpgsql;

-- ─── cs_notes ─────────────────────────────────────────────────────────────
-- Freeform per-order notes: call notes, delay-notified log, etc.
create table if not exists cs_notes (
  id           uuid primary key default gen_random_uuid(),
  wc_order_id  text not null,
  note         text not null,
  created_by   text,
  created_at   timestamptz not null default now()
);
create index if not exists cs_notes_order_idx on cs_notes (wc_order_id, created_at);

-- ─── cs_cancellations ────────────────────────────────────────────────────
-- Durable cancellation log (today the only record is a WC meta_data key +
-- a "LastName__Reason" string hack — see app/api/pipeline/orders/[id]/cancel).
create table if not exists cs_cancellations (
  id           uuid primary key default gen_random_uuid(),
  wc_order_id  text not null,
  reason       text not null,
  note         text,
  created_by   text,
  created_at   timestamptz not null default now()
);
create index if not exists cs_cancellations_order_idx on cs_cancellations (wc_order_id);

-- ─── cs_post_delivery_issues ─────────────────────────────────────────────
create table if not exists cs_post_delivery_issues (
  id            uuid primary key default gen_random_uuid(),
  wc_order_id   text not null,
  product_id    text,
  product_name  text,
  issue_type    text not null check (issue_type in ('damage', 'missing_parts', 'defect', 'other')),
  description   text not null,
  status        text not null default 'open' check (status in ('open', 'in_review', 'resolved')),
  created_by    text,
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz
);
create index if not exists cs_post_delivery_issues_order_idx on cs_post_delivery_issues (wc_order_id);

-- ─── cs_review_followups ─────────────────────────────────────────────────
-- Auto-created when cs_order_state.delivered_at is set (see /api/cs/orders/[wcOrderId]/delivered).
create table if not exists cs_review_followups (
  id            uuid primary key default gen_random_uuid(),
  wc_order_id   text not null unique,
  due_at        timestamptz not null,
  contacted_at  timestamptz,
  outcome       text not null default 'pending' check (outcome in ('pending', 'left_review', 'declined', 'no_response')),
  rating        int check (rating between 1 and 5),
  note          text,
  created_at    timestamptz not null default now()
);
create index if not exists cs_review_followups_due_idx on cs_review_followups (due_at);

-- ─── cs_returns ───────────────────────────────────────────────────────────
create table if not exists cs_returns (
  id           uuid primary key default gen_random_uuid(),
  wc_order_id  text not null,
  type         text not null check (type in ('return', 'exchange')),
  reason       text not null,
  status       text not null default 'requested' check (status in (
                 'requested', 'approved', 'in_transit', 'received', 'refunded', 'exchanged', 'rejected'
               )),
  note         text,
  created_by   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists cs_returns_order_idx on cs_returns (wc_order_id);

-- ─── cs_product_issue_flags ───────────────────────────────────────────────
-- Recurring-defect tagging surfaced for management review.
create table if not exists cs_product_issue_flags (
  id               uuid primary key default gen_random_uuid(),
  product_id       text not null,
  product_name     text,
  issue_summary    text not null,
  severity         text not null default 'medium' check (severity in ('low', 'medium', 'high')),
  status           text not null default 'open' check (status in ('open', 'reviewed', 'resolved')),
  linked_issue_id  uuid references cs_post_delivery_issues(id),
  created_by       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists cs_product_issue_flags_product_idx on cs_product_issue_flags (product_id);

-- ─── cs_faq_entries ────────────────────────────────────────────────────────
create table if not exists cs_faq_entries (
  id          uuid primary key default gen_random_uuid(),
  category    text,
  question    text not null,
  answer      text not null,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── cs_upsell_suggestions ─────────────────────────────────────────────────
create table if not exists cs_upsell_suggestions (
  id          uuid primary key default gen_random_uuid(),
  product_id  text not null,
  suggestion  text not null,
  note        text,
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists cs_upsell_suggestions_product_idx on cs_upsell_suggestions (product_id);

-- ─── phases.expected_days ───────────────────────────────────────────────
-- Per-phase delay threshold, read by Delay Flags and requirement #7
-- ("check delay estimate vs production stage").
alter table phases add column if not exists expected_days int;
