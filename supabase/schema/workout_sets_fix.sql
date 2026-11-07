-- Séries de musculation : aucune n'était enregistrée.
-- La table n'avait ni colonne user_id (envoyée par l'app) ni règle d'accès alors que la RLS est active.
-- À exécuter dans le SQL Editor Supabase.

alter table workout_sets
  add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;

-- Le RPE peut être saisi avec une décimale (8,5)
alter table workout_sets
  alter column rpe type numeric;

create index if not exists workout_sets_workout_id_idx on workout_sets (workout_id);

drop policy if exists "Users manage sets of their own workouts" on workout_sets;
create policy "Users manage sets of their own workouts"
  on workout_sets for all
  to authenticated
  using (exists (select 1 from workouts w where w.id = workout_id and w.user_id = auth.uid()))
  with check (exists (select 1 from workouts w where w.id = workout_id and w.user_id = auth.uid()));

-- Exercices et groupes musculaires : l'app peut en ajouter (bibliothèque, programmes)
drop policy if exists "Les utilisateurs connectés ajoutent des exercices" on exercises;
create policy "Les utilisateurs connectés ajoutent des exercices"
  on exercises for insert to authenticated with check (true);

drop policy if exists "Les utilisateurs connectés ajoutent des groupes" on muscle_groups;
create policy "Les utilisateurs connectés ajoutent des groupes"
  on muscle_groups for insert to authenticated with check (true);

-- « Presse » du programme Legs, absente de la base
insert into exercises (name, muscle_group_id, type)
select 'Presse', muscle_group_id, 'custom'
from exercises
where name = 'Presse unilatérale'
  and not exists (select 1 from exercises where name = 'Presse')
limit 1;
