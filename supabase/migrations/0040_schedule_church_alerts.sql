-- Replace the two paused daily jobs (cell reminders, WhatsApp milestones) with one
-- job that runs every 15 minutes and sends each church's own alerts.
-- Churches have everything switched off until their admin sets it up, so this job
-- does nothing for a church that has not opted in.
--
-- Needs the Vault secrets cron_secret and cron_anon_key (already created).

do $$
begin
  perform cron.unschedule('cell-reminders-daily');
exception when others then null;
end $$;

do $$
begin
  perform cron.unschedule('milestones-daily');
exception when others then null;
end $$;

select cron.schedule(
  'church-alerts-every-15-min',
  '*/15 * * * *',
  $job$
  select net.http_post(
    url := 'https://jatbcoynuamynouaidpm.supabase.co/functions/v1/send-scheduled-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_anon_key'),
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $job$
);
