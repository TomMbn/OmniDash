-- Semaine de match et programmes de musculation partagés entre les appareils.
-- À exécuter dans le SQL Editor Supabase.

alter table user_settings
  add column if not exists planning_mode text not null default 'standard',
  add column if not exists planning_week date,
  add column if not exists workout_templates jsonb;

alter table user_settings
  drop constraint if exists user_settings_planning_mode_check;

alter table user_settings
  add constraint user_settings_planning_mode_check check (planning_mode in ('standard', 'match'));
