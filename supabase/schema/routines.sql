-- Module Routines : étapes des routines, habitudes et suivi jour par jour.
-- À exécuter dans le SQL Editor Supabase. Rejouable sans erreur.

create table if not exists routine_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  slug text,
  section text not null default 'habitude' check (section in ('matin', 'soir', 'habitude')),
  title text not null,
  detail text,
  product text,
  optional boolean not null default false,
  -- Lundi vaut 1, dimanche 7. Liste vide : tous les jours.
  days int[] not null default '{}',
  condition text not null default 'toujours'
    check (condition in ('toujours', 'lavage', 'sans_lavage', 'lendemain', 'autres_matins')),
  -- Une étape retirée est archivée pour garder l'historique.
  start_day date not null default current_date,
  archived_on date,
  position int not null default 0,
  created_at timestamptz default now(),
  unique (user_id, slug)
);

-- Une ligne existe quand l'étape a été faite ce jour-là.
create table if not exists routine_logs (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id uuid not null references routine_items(id) on delete cascade,
  day date not null,
  done_at timestamptz default now(),
  primary key (item_id, day)
);

create table if not exists routine_settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  wash_days int[] not null default '{3,7}',
  updated_at timestamptz default now()
);

create index if not exists routine_items_user_position on routine_items (user_id, position);
create index if not exists routine_logs_user_day on routine_logs (user_id, day);

-- Sécurité : chaque utilisateur ne voit que ses lignes
alter table routine_items enable row level security;
alter table routine_logs enable row level security;
alter table routine_settings enable row level security;

drop policy if exists "Users manage their own routine items" on routine_items;
create policy "Users manage their own routine items"
  on routine_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage their own routine logs" on routine_logs;
create policy "Users manage their own routine logs"
  on routine_logs for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from routine_items i where i.id = item_id and i.user_id = auth.uid())
  );

drop policy if exists "Users manage their own routine settings" on routine_settings;
create policy "Users manage their own routine settings"
  on routine_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
