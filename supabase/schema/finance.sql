-- Module Finance : comptes, catégories, transactions importées, règles, imports, abonnements et valeurs de placements.
-- À exécuter dans le SQL Editor Supabase. Rejouable sans erreur.
-- Aucun IBAN ni numéro de compte n'est stocké.

create table if not exists finance_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  kind text not null default 'courant' check (kind in ('courant', 'pea', 'livret', 'autre')),
  position int default 0,
  created_at timestamptz default now()
);

create table if not exists finance_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  budget numeric,
  position int default 0,
  archived boolean default false,
  created_at timestamptz default now()
);

create table if not exists finance_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  file_name text,
  format text,
  period_start date,
  period_end date,
  row_count int,
  imported int,
  duplicates int,
  created_at timestamptz default now()
);

create table if not exists finance_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id uuid references finance_accounts(id) on delete set null,
  date date not null,
  amount numeric not null,
  label_raw text not null,
  label text,
  category_id uuid references finance_categories(id) on delete set null,
  kind text not null default 'depense' check (kind in ('depense', 'revenu', 'epargne', 'remboursement', 'interne')),
  status text not null default 'auto' check (status in ('auto', 'verifier', 'confirme')),
  linked_id uuid references finance_transactions(id) on delete set null,
  import_hash text not null,
  import_id uuid references finance_imports(id) on delete set null,
  created_at timestamptz default now(),
  unique (user_id, import_hash)
);

create table if not exists finance_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pattern text not null,
  category_id uuid references finance_categories(id) on delete set null,
  kind text check (kind is null or kind in ('depense', 'revenu', 'epargne', 'remboursement', 'interne')),
  created_at timestamptz default now()
);

create table if not exists finance_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pattern text not null,
  name text not null,
  amount numeric not null,
  previous_amount numeric,
  day int,
  status text default 'detecte' check (status in ('detecte', 'confirme', 'ignore')),
  last_seen date,
  created_at timestamptz default now(),
  unique (user_id, pattern)
);

create table if not exists finance_holding_values (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id uuid not null references finance_accounts(id) on delete cascade,
  month date not null,
  value numeric not null,
  created_at timestamptz default now(),
  unique (account_id, month)
);

-- Index
create index if not exists finance_accounts_user_idx on finance_accounts (user_id);
create index if not exists finance_categories_user_idx on finance_categories (user_id);
create index if not exists finance_imports_user_idx on finance_imports (user_id, created_at desc);
create index if not exists finance_transactions_user_date_idx on finance_transactions (user_id, date desc);
create index if not exists finance_transactions_category_idx on finance_transactions (category_id);
create index if not exists finance_transactions_linked_idx on finance_transactions (linked_id);
create index if not exists finance_rules_user_idx on finance_rules (user_id);
create index if not exists finance_subscriptions_user_idx on finance_subscriptions (user_id);
create index if not exists finance_holding_values_user_month_idx on finance_holding_values (user_id, month desc);

-- Sécurité : chaque utilisateur ne voit que ses lignes
alter table finance_accounts enable row level security;
alter table finance_categories enable row level security;
alter table finance_imports enable row level security;
alter table finance_transactions enable row level security;
alter table finance_rules enable row level security;
alter table finance_subscriptions enable row level security;
alter table finance_holding_values enable row level security;

drop policy if exists "Users manage their own finance accounts" on finance_accounts;
create policy "Users manage their own finance accounts"
  on finance_accounts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage their own finance categories" on finance_categories;
create policy "Users manage their own finance categories"
  on finance_categories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage their own finance imports" on finance_imports;
create policy "Users manage their own finance imports"
  on finance_imports for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage their own finance transactions" on finance_transactions;
create policy "Users manage their own finance transactions"
  on finance_transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage their own finance rules" on finance_rules;
create policy "Users manage their own finance rules"
  on finance_rules for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage their own finance subscriptions" on finance_subscriptions;
create policy "Users manage their own finance subscriptions"
  on finance_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage their own finance holding values" on finance_holding_values;
create policy "Users manage their own finance holding values"
  on finance_holding_values for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
