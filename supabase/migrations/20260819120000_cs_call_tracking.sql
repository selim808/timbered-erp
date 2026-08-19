-- Call-confirmation tracking for the Customer Service page tabs.
-- Adds a 'no_response' CS status (its own tab: customers who didn't pick up)
-- plus the attempt counter/timestamp the Call confirmation + No response tabs
-- read to show how many times a customer has been tried and when.

-- The original check was declared inline in create table, so Postgres named
-- it cs_order_state_cs_status_check.
alter table cs_order_state drop constraint if exists cs_order_state_cs_status_check;
alter table cs_order_state add constraint cs_order_state_cs_status_check check (cs_status in (
  'new', 'called', 'no_response', 'confirmed', 'deposit_pending', 'deposit_paid',
  'in_production', 'delayed', 'delivered', 'review_requested',
  'closed', 'cancelled'
));

alter table cs_order_state add column if not exists call_attempts int not null default 0;
alter table cs_order_state add column if not exists last_call_at  timestamptz;
