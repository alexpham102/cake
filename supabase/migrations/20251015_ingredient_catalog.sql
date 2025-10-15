-- Ingredient Catalog schema

create table if not exists ingredient_catalog (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  package_amount numeric not null default 0,
  package_unit text not null default 'g',
  price numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ingredient_catalog_user_id_idx on ingredient_catalog(user_id);


