-- Phase groups: configures the production phases/stages orders move through
CREATE TABLE IF NOT EXISTS phase_groups (
  id          TEXT PRIMARY KEY,
  label       TEXT        NOT NULL,
  color       TEXT        NOT NULL DEFAULT '#ccc',
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  phases      TEXT[]      NOT NULL DEFAULT '{}'
);

-- Order phase assignments: which production phase each line item is currently in
CREATE TABLE IF NOT EXISTS order_phases (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      TEXT        NOT NULL,
  line_item_id  TEXT        NOT NULL,
  phase         TEXT        NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_phases_phase    ON order_phases(phase);
CREATE INDEX IF NOT EXISTS idx_order_phases_order_id ON order_phases(order_id);
