-- Jetons Withings : la fonction withings-sync les lit et les écrit, mais la table n'existait pas.
-- Sans elle, chaque synchronisation repassait par l'autorisation Withings et la synchro automatique échouait.
-- À exécuter dans le SQL Editor Supabase.

create table if not exists withings_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

alter table withings_tokens enable row level security;

drop policy if exists "Users manage their own withings tokens" on withings_tokens;
create policy "Users manage their own withings tokens"
  on withings_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
