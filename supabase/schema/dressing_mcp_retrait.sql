-- Retire les règles ajoutées par dressing_mcp.sql, et aucune autre.
-- Attention : un jeton OAuth encore valide retrouve alors tous les droits d'une connexion normale.
-- À exécuter seulement après avoir révoqué les autorisations, désactivé le serveur OAuth
-- et attendu l'expiration des jetons. Rejouable ; à la moindre erreur, rien n'est retiré.

do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname from pg_policies
     where permissive = 'RESTRICTIVE'
       and ((schemaname = 'public' and tablename <> 'wardrobe' and policyname = 'oauth_interdit')
         or (schemaname = 'public' and tablename = 'wardrobe'
           and policyname in ('oauth_sans_ajout', 'oauth_sans_modif', 'oauth_sans_suppression'))
         or (schemaname = 'storage' and tablename in ('objects', 'buckets') and policyname = 'oauth_interdit'))
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- Contrôle : la ligne doit annoncer 0.
select 'Retrait exécuté' as constat,
       format('%s règle(s) OAuth restante(s)', count(*)) as detail
  from pg_policies
 where permissive = 'RESTRICTIVE'
   and ((schemaname = 'public' and policyname in
          ('oauth_interdit', 'oauth_sans_ajout', 'oauth_sans_modif', 'oauth_sans_suppression'))
     or (schemaname = 'storage' and tablename in ('objects', 'buckets') and policyname = 'oauth_interdit'));
