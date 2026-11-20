-- Run cell-group reminders and member milestones (birthdays, anniversaries)
-- automatically every morning at 07:00 West Africa Time (06:00 UTC).
--
-- Before applying, two secrets must exist in Supabase Vault (they are NOT stored
-- in this file):
--   cron_secret   - same value as the CRON_SECRET function secret
--   cron_anon_key - the project's public anon key (satisfies the JWT gateway check)
--
-- Both functions skip anything already sent today, so a repeat run is harmless.

create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'cell-reminders-daily',
  '0 6 * * *',
  $job$
  select net.http_post(
    url := 'https://jatbcoynuamynouaidpm.supabase.co/functions/v1/send-cell-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_anon_key'),
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $job$
);

select cron.schedule(
  'milestones-daily',
  '0 6 * * *',
  $job$
  select net.http_post(
    url := 'https://jatbcoynuamynouaidpm.supabase.co/functions/v1/send-milestones',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_anon_key'),
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $job$
);
