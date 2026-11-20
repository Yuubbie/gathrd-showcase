-- Send the welcome email the moment a new church pastor registers.
--
-- When a "senior pastor" profile with a church is created (that is what a new church
-- sign-up does), ask the send-welcome-email function to email them. The request is
-- queued by pg_net and sent after the sign-up transaction commits, so:
--   * sign-up never waits for it, and never fails because of it;
--   * it works even if the person closes the page straight away;
--   * it does not depend on the person confirming their email first.
-- Needs the Vault secrets cron_secret and cron_anon_key (already created).

create or replace function public.queue_welcome_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform net.http_post(
      url := 'https://jatbcoynuamynouaidpm.supabase.co/functions/v1/send-welcome-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_anon_key'),
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
      ),
      body := jsonb_build_object('user_id', new.id),
      timeout_milliseconds := 20000
    );
  exception when others then
    -- Never let an email problem block someone from registering.
    null;
  end;
  return new;
end;
$$;

revoke all on function public.queue_welcome_email() from public, anon, authenticated;

drop trigger if exists trg_profiles_welcome_email on public.profiles;
create trigger trg_profiles_welcome_email
  after insert on public.profiles
  for each row
  when (new.role = 'senior_pastor' and new.church_id is not null)
  execute function public.queue_welcome_email();
