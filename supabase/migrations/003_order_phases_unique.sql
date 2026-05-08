ALTER TABLE order_phases
  ADD CONSTRAINT order_phases_order_line_unique UNIQUE (order_id, line_item_id);
