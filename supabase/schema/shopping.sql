-- Module Achats : liste d'achats et mesures.
-- À exécuter dans le SQL Editor Supabase. Rejouable sans erreur.

create table if not exists shopping_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  slug text,
  category text not null default 'vetements',
  group_name text not null default 'Divers',
  name text not null,
  qty text,
  tier text check (tier in ('invest', 'mid', 'basic')),
  price text,
  size text,
  note text,
  options jsonb not null default '[]'::jsonb,
  done boolean not null default false,
  wardrobe_added_at timestamptz,
  position int not null default 0,
  created_at timestamptz default now(),
  unique (user_id, slug)
);

create table if not exists shopping_profile (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  measures jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create index if not exists shopping_items_user_position on shopping_items (user_id, position);

-- Sécurité : chaque utilisateur ne voit que ses lignes
alter table shopping_items enable row level security;
alter table shopping_profile enable row level security;

drop policy if exists "Users manage their own shopping items" on shopping_items;
create policy "Users manage their own shopping items"
  on shopping_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage their own shopping profile" on shopping_profile;
create policy "Users manage their own shopping profile"
  on shopping_profile for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
