-- V2 : prévision de créneau (modèle thermique RC) au lieu de la comparaison réactive.
-- À exécuter manuellement dans le SQL Editor Supabase.

alter table user_settings
  add column if not exists wall_type text not null default 'medium';

alter table user_settings
  drop constraint if exists user_settings_wall_type_check;

alter table user_settings
  add constraint user_settings_wall_type_check check (wall_type in ('light', 'medium', 'heavy'));

create table if not exists window_forecast (
  user_id uuid primary key references auth.users(id) on delete cascade,
  predicted_open_at timestamptz,
  predicted_close_at timestamptz,
  open_notified boolean not null default false,
  close_notified boolean not null default false,
  computed_at timestamptz not null default now()
);

alter table window_forecast enable row level security;

create policy "Users manage their own window forecast"
  on window_forecast for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
