-- ─── Job Orders ───────────────────────────────────────────────────────────────

CREATE TABLE job_orders (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  jo_number     TEXT        UNIQUE NOT NULL,
  wc_order_id   TEXT        NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'review'
                CHECK (status IN ('review','inventory_check','production','done','cancelled')),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_job_orders_wc_order ON job_orders(wc_order_id);

-- ─── Production Cards ─────────────────────────────────────────────────────────
-- card code is derived at query time: jo_number || '-' || card_number || '/' || COUNT(*) OVER (PARTITION BY jo_id)

CREATE TABLE production_cards (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  jo_id         UUID        NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
  card_number   INTEGER     NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'in_production'
                CHECK (status IN ('in_production','ready','internal_shipment','in_warehouse','shipped')),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (jo_id, card_number)
);

CREATE INDEX idx_production_cards_jo ON production_cards(jo_id);

-- ─── Production Card Items ────────────────────────────────────────────────────
-- phase is a single text value (from phase_groups); it IS the item's current status.
-- is_full = true  → label "FULL",      part_number/total_parts must be null
-- is_full = false → label "Part X/Y",  part_number/total_parts must be set

CREATE TABLE production_card_items (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id         UUID        NOT NULL REFERENCES production_cards(id) ON DELETE CASCADE,
  jo_id           UUID        NOT NULL REFERENCES job_orders(id),
  wc_order_id     TEXT        NOT NULL,
  wc_line_item_id TEXT        NOT NULL,
  wc_product_id   TEXT        NOT NULL,
  product_name    TEXT        NOT NULL,
  quantity        INTEGER     NOT NULL DEFAULT 1,
  item_type       TEXT        NOT NULL DEFAULT 'mto'
                  CHECK (item_type IN ('mto','mts')),
  is_full         BOOLEAN     NOT NULL DEFAULT TRUE,
  part_number     INTEGER,
  total_parts     INTEGER,
  phase           TEXT        NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT part_fields_consistent CHECK (
    (is_full = TRUE  AND part_number IS NULL  AND total_parts IS NULL) OR
    (is_full = FALSE AND part_number IS NOT NULL AND total_parts IS NOT NULL)
  )
);

CREATE INDEX idx_pci_card  ON production_card_items(card_id);
CREATE INDEX idx_pci_jo    ON production_card_items(jo_id);
CREATE INDEX idx_pci_li    ON production_card_items(wc_line_item_id);
CREATE INDEX idx_pci_phase ON production_card_items(phase);

-- ─── Auto-update timestamps ───────────────────────────────────────────────────

CREATE TRIGGER job_orders_updated_at
  BEFORE UPDATE ON job_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER production_cards_updated_at
  BEFORE UPDATE ON production_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER production_card_items_updated_at
  BEFORE UPDATE ON production_card_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Permissions ──────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON job_orders             TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON production_cards        TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON production_card_items   TO service_role;
