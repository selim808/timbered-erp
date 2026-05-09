CREATE TABLE IF NOT EXISTS jo_plans (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ref        TEXT        NOT NULL UNIQUE,
  status     TEXT        NOT NULL DEFAULT 'open',
  items      JSONB       NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jo_plans_created_at ON jo_plans(created_at DESC);

CREATE TRIGGER update_jo_plans_updated_at
  BEFORE UPDATE ON jo_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON jo_plans TO service_role;
