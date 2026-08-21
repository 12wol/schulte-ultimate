-- Enable schulte-rogue variant for submit_attempt RPC
insert into public.test_variants (id, name, description, sort_order, enabled)
values (
  'schulte-rogue',
  '方格远征',
  '舒尔特方格肉鸽：时限 + 专注力，八层遗物远征',
  2,
  true
)
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  enabled = true,
  sort_order = excluded.sort_order;
