-- Module Routines : étapes qui dépendent de l'indice UV (le SPF du matin).
-- À exécuter après routines.sql, dans le SQL Editor Supabase. Rejouable sans erreur.

-- Indice maximal du jour, enregistré pour que l'historique ne change pas ensuite.
create table if not exists routine_uv (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day date not null,
  uv_max numeric(4,1) not null check (uv_max >= 0),
  updated_at timestamptz default now(),
  primary key (user_id, day)
);

alter table routine_uv enable row level security;

drop policy if exists "Users manage their own routine uv" on routine_uv;
create policy "Users manage their own routine uv"
  on routine_uv for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Seuil sous lequel l'étape devient facultative. Vide : l'indice ne change rien.
-- Le SPF n'est réglé qu'à la création de la colonne : un réglage modifié ensuite est gardé.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'routine_items' and column_name = 'uv_min'
  ) then
    alter table routine_items add column uv_min int check (uv_min between 1 and 11);
    update routine_items set uv_min = 3 where slug = 'matin-spf';
  end if;
end $$;
