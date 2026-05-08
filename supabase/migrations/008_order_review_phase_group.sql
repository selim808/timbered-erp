INSERT INTO phase_groups (id, label, color, sort_order, phases)
VALUES ('review', 'Review', '#7A4610', -1, ARRAY['placed', 'reviewed', 'planning'])
ON CONFLICT (id) DO UPDATE SET
  phases     = EXCLUDED.phases,
  color      = EXCLUDED.color,
  sort_order = EXCLUDED.sort_order;
