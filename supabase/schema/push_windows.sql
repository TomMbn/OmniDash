-- Feature: notifications push "ouvrir/fermer les fenêtres" (Netatmo + Open-Meteo)
-- À exécuter manuellement dans le SQL Editor Supabase (pas de migrations versionnées dans ce repo).

create table if not exists netatmo_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table netatmo_tokens enable row level security;

create policy "Users manage their own netatmo tokens"
  on netatmo_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

create policy "Users manage their own push subscriptions"
  on push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists window_notification_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_recommendation text check (last_recommendation in ('open', 'close')),
  last_sent_at timestamptz
);

alter table window_notification_state enable row level security;

create policy "Users manage their own window notification state"
  on window_notification_state for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table user_settings
  add column if not exists windows_notifications_enabled boolean not null default false,
  add column if not exists humidex_open_threshold numeric not null default 27,
  add column if not exists humidex_close_threshold numeric not null default 30,
  add column if not exists home_lat numeric,
  add column if not exists home_lon numeric;
