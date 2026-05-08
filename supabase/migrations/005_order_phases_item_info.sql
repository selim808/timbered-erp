-- Add item_name and total to order_phases so items can be tracked directly in Supabase
ALTER TABLE order_phases
  ADD COLUMN IF NOT EXISTS item_name TEXT,
  ADD COLUMN IF NOT EXISTS total     INTEGER;
