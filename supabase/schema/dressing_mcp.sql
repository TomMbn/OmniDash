-- Styliste en artefact : un jeton OAuth (mention client_id) ne doit pouvoir que lire le dressing.
-- À exécuter en entier dans le SQL Editor Supabase. Rejouable, et à relancer après chaque nouvelle table.
-- Toutes les modifications tiennent dans un seul bloc : à la moindre erreur, rien n'est appliqué.
-- La dernière requête est un audit : elle ne modifie rien.
-- Pour revenir en arrière : dressing_mcp_retrait.sql.

do $$
declare t record; ouverte text;
begin
  -- Sans sécurité par ligne, une règle n'a aucun effet.
  select string_agg(n.nspname || '.' || c.relname, ', ' order by n.nspname, c.relname) into ouverte
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where c.relkind in ('r', 'p') and not c.relrowsecurity
     and (n.nspname = 'public' or (n.nspname = 'storage' and c.relname in ('objects', 'buckets')));
  if ouverte is not null then
    raise exception 'Sécurité par ligne inactive sur : %. Rien n''a été modifié.', ouverte;
  end if;

  -- Toutes les tables sauf le dressing : aucun accès.
  for t in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p')
  loop
    execute format('drop policy if exists oauth_interdit on public.%I', t.relname);
    if t.relname <> 'wardrobe' then
      execute format($p$create policy oauth_interdit on public.%I as restrictive for all to authenticated
        using ((auth.jwt() ->> 'client_id') is null) with check ((auth.jwt() ->> 'client_id') is null)$p$, t.relname);
    end if;
  end loop;

  -- Le dressing : lecture seule.
  drop policy if exists oauth_sans_ajout on public.wardrobe;
  create policy oauth_sans_ajout on public.wardrobe as restrictive for insert to authenticated
    with check ((auth.jwt() ->> 'client_id') is null);

  drop policy if exists oauth_sans_modif on public.wardrobe;
  create policy oauth_sans_modif on public.wardrobe as restrictive for update to authenticated
    using ((auth.jwt() ->> 'client_id') is null) with check ((auth.jwt() ->> 'client_id') is null);

  drop policy if exists oauth_sans_suppression on public.wardrobe;
  create policy oauth_sans_suppression on public.wardrobe as restrictive for delete to authenticated
    using ((auth.jwt() ->> 'client_id') is null);

  -- Le stockage : aucun accès.
  drop policy if exists oauth_interdit on storage.objects;
  create policy oauth_interdit on storage.objects as restrictive for all to authenticated
    using ((auth.jwt() ->> 'client_id') is null) with check ((auth.jwt() ->> 'client_id') is null);

  drop policy if exists oauth_interdit on storage.buckets;
  create policy oauth_interdit on storage.buckets as restrictive for all to authenticated
    using ((auth.jwt() ->> 'client_id') is null) with check ((auth.jwt() ->> 'client_id') is null);
end $$;

-- Audit : les règles ci-dessus ne couvrent pas ce qui contourne la sécurité par ligne, ni la clé anon.
-- La première ligne, « Audit exécuté », est toujours présente. Toutes les autres sont à examiner.
-- S'il s'affiche moins de lignes qu'annoncé, retirer la limite d'affichage du SQL Editor et relancer.
with constats as (
  -- Le jeton lit le dressing : seules ces règles limitent cette lecture, et il suffit qu'une seule soit trop large.
  select 1 as rang,
         'Lecture du dressing : seule une condition équivalente à auth.uid() = user_id est attendue' as constat,
         format('public.wardrobe, règle « %s »', policyname) as objet,
         concat_ws(' ; ',
           'commande : ' || cmd,
           'rôles : ' || array_to_string(roles, ', '),
           'using : ' || coalesce(qual, 'aucune')) as detail
    from pg_policies
   where schemaname = 'public' and tablename = 'wardrobe'
     and permissive = 'PERMISSIVE'
     and cmd in ('SELECT', 'ALL')

  union all

  select 2,
         'Fonction security definer exécutable',
         format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)) as objet,
         concat_ws(' ; ',
           'exécution : ' || concat_ws(' et ',
             case when has_function_privilege('authenticated', p.oid, 'execute') then 'authenticated' end,
             case when has_function_privilege('anon', p.oid, 'execute') then 'anon' end),
           case when p.prorettype in ('trigger'::regtype, 'event_trigger'::regtype) then 'fonction de déclencheur' end
         ) as detail
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'graphql_public') and p.prosecdef
     and (has_function_privilege('authenticated', p.oid, 'execute')
       or has_function_privilege('anon', p.oid, 'execute'))

  union all

  select 3,
         case c.relkind when 'm' then 'Vue matérialisée accessible' else 'Vue accessible' end,
         format('%I.%I', n.nspname, c.relname),
         concat_ws(' ; ',
           'lecture : ' || nullif(concat_ws(' et ',
             case when has_any_column_privilege('authenticated', c.oid, 'select') then 'authenticated' end,
             case when has_any_column_privilege('anon', c.oid, 'select') then 'anon' end), ''),
           'écriture : ' || nullif(concat_ws(' et ',
             case when has_any_column_privilege('authenticated', c.oid, 'insert, update')
                    or has_table_privilege('authenticated', c.oid, 'delete') then 'authenticated' end,
             case when has_any_column_privilege('anon', c.oid, 'insert, update')
                    or has_table_privilege('anon', c.oid, 'delete') then 'anon' end), ''),
           case when c.relkind = 'v' then
             case when c.reloptions && array['security_invoker=true', 'security_invoker=on', 'security_invoker=1']
               then 'security_invoker actif' else 'security_invoker inactif' end
           end
         )
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname in ('public', 'graphql_public') and c.relkind in ('v', 'm')
     and (has_any_column_privilege('authenticated', c.oid, 'select, insert, update')
       or has_table_privilege('authenticated', c.oid, 'delete')
       or has_any_column_privilege('anon', c.oid, 'select, insert, update')
       or has_table_privilege('anon', c.oid, 'delete'))

  union all

  -- Dans public, toute table sans sécurité par ligne. Ailleurs, seulement si un de ces rôles y a un droit.
  select 4,
         case c.relkind when 'f' then 'Table étrangère, sans sécurité par ligne possible'
           else 'Table sans sécurité par ligne' end,
         format('%I.%I', n.nspname, c.relname),
         'droits : ' || coalesce(nullif(concat_ws(' et ',
           case when has_any_column_privilege('authenticated', c.oid, 'select, insert, update')
                  or has_table_privilege('authenticated', c.oid, 'delete') then 'authenticated' end,
           case when has_any_column_privilege('anon', c.oid, 'select, insert, update')
                  or has_table_privilege('anon', c.oid, 'delete') then 'anon' end), ''),
           'aucun pour authenticated ni anon')
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where c.relkind in ('r', 'p', 'f') and not c.relrowsecurity
     and (n.nspname = 'public'
       or (n.nspname in ('graphql_public', 'storage')
         and (has_any_column_privilege('authenticated', c.oid, 'select, insert, update')
           or has_table_privilege('authenticated', c.oid, 'delete')
           or has_any_column_privilege('anon', c.oid, 'select, insert, update')
           or has_table_privilege('anon', c.oid, 'delete'))))

  union all

  -- Une règle sans « to » vise le rôle public, donc aussi anon : lire sa condition.
  select 5,
         'Règle ouverte au rôle anon',
         format('%I.%I, règle « %s »', schemaname, tablename, policyname),
         concat_ws(' ; ',
           'commande : ' || cmd,
           'rôles : ' || array_to_string(roles, ', '),
           'using : ' || qual,
           'with check : ' || with_check)
    from pg_policies
   where schemaname in ('public', 'graphql_public', 'storage', 'realtime')
     and permissive = 'PERMISSIVE'
     and roles && array['public', 'anon']::name[]
),
bilan as (
  select
    (select count(*) from pg_policies
      where permissive = 'RESTRICTIVE'
        and ((schemaname = 'public' and policyname in
               ('oauth_interdit', 'oauth_sans_ajout', 'oauth_sans_modif', 'oauth_sans_suppression'))
          or (schemaname = 'storage' and tablename in ('objects', 'buckets') and policyname = 'oauth_interdit'))
    ) as en_place,
    -- Une règle par table hors dressing, trois sur le dressing, deux sur le stockage.
    (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relname <> 'wardrobe') + 3 + 2 as attendues
)
select constat, objet, detail
  from (
    select 0 as rang,
           'Audit exécuté' as constat,
           format('%s ligne(s) à examiner', (select count(*) from constats)) as objet,
           format('règles OAuth en place : %s sur %s attendues', en_place, attendues) as detail
      from bilan
    union all
    select rang, constat, objet, detail from constats
  ) as audit
 order by rang, objet, detail;
