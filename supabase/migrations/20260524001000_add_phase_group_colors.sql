alter table public.phase_groups
add column if not exists color text;

update public.phase_groups
set color = case name
  when 'Review' then '#16A34A'
  when 'Planning' then '#16A34A'
  when 'Production' then '#2563EB'
  when 'Repair' then '#2563EB'
  when 'Dispatch' then '#2563EB'
  when 'Interface' then '#2563EB'
  when 'Warehouse' then '#DC2626'
  when 'Delivery' then '#DC2626'
  when 'After-Sales' then '#16A34A'
  else '#64748B'
end;
