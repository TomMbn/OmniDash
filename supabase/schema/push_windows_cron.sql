-- Programme l'appel périodique de l'edge function check-windows via pg_cron + pg_net.
-- À exécuter manuellement dans le SQL Editor Supabase.
-- Remplace <CRON_SECRET> par la valeur réelle du secret (ne jamais commiter la vraie valeur dans ce fichier).

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'check-windows-every-20-min',
  '*/20 * * * *',
  $$
  select net.http_post(
    url := 'https://donvvefgxzzasuzvsnwx.supabase.co/functions/v1/check-windows',
    headers := jsonb_build_object('x-cron-secret', '<CRON_SECRET>')
  );
  $$
);

-- Pour vérifier que le job est bien programmé :
-- select * from cron.job;

-- Pour le supprimer si besoin :
-- select cron.unschedule('check-windows-every-20-min');
