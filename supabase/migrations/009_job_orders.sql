CREATE TABLE IF NOT EXISTS job_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'open',
  items JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_orders_created_at ON job_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_orders_status ON job_orders(status);

CREATE TRIGGER update_job_orders_updated_at
  BEFORE UPDATE ON job_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
