-- Business Costs schema (equipment + overhead), per-user

-- business_costs
create table if not exists business_costs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  batches_per_month int not null default 0,
  updated_at timestamptz not null default now(),
  unique(user_id)
);

-- equipment_items
create table if not exists equipment_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  price numeric not null default 0,
  expected_total_batches int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists equipment_items_user_id_idx on equipment_items(user_id);

-- overhead_items
create table if not exists overhead_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  monthly_amount numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists overhead_items_user_id_idx on overhead_items(user_id);


