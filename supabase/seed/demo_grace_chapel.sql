-- =====================================================================================
-- Demo data for the marketing church "Grace Chapel Demo"
--
-- Fills every section of Gathrd with realistic, clearly fictional Nigerian church data
-- so the app can be shown in videos and screenshots.
--
--   * Safe to re-run: it first clears ONLY this demo church, then rebuilds it, with all
--     dates relative to today. Re-run it the day before recording to refresh the dates.
--   * Refuses to run unless the church id and name match "Grace Chapel Demo".
--   * Uses fake phone numbers (08000xxxxxx) and example.com emails, so no message or
--     alert can ever reach a real person.
--   * Keeps the existing logins (Pastor Dee, Emeka Nwankwo and any demo staff accounts).
--
-- Run:  supabase db query --linked -f supabase/seed/demo_grace_chapel.sql
-- =====================================================================================

-- Same calendar day as `t`, in year `y` (29 February becomes 28 February).
create or replace function pg_temp.bday(y int, t date) returns date language sql immutable as $$
  select make_date(y, extract(month from t)::int,
                   case when extract(month from t) = 2 and extract(day from t) = 29 then 28 else extract(day from t)::int end)
$$;

do $seed$
declare
  c constant uuid := '986dc44c-a1fc-4435-b8bc-415244a175f1';
  v_today date := (now() at time zone 'Africa/Lagos')::date;

  -- staff (looked up from the demo church's existing logins, with safe fallbacks)
  v_pastor uuid;
  v_admin uuid;
  v_asst uuid;
  v_fin uuid;
  v_media uuid;
  v_teacher uuid;
  v_counter2 uuid;
  v_heads uuid[];
  v_leaders uuid[];

  fn_m text[] := array['Tunde','Emeka','Ibrahim','Chinedu','Segun','Kelechi','Adebayo','Obinna','Femi','Yusuf','Kayode','Ikenna','Seyi','Tobi','Gbenga','Uche','Bode','Chidi','Damilola','Olumide','Nnamdi','Sunday','Efe','Lanre','Musa'];
  fn_f text[] := array['Ngozi','Funke','Adaeze','Blessing','Chiamaka','Folake','Amaka','Titilayo','Ifeoma','Bukola','Yetunde','Nkechi','Aisha','Omolara','Chioma','Temitope','Grace','Joy','Esther','Ruth','Mercy','Faith','Zainab','Kemi','Ebere'];
  lnames text[] := array['Adebayo','Okafor','Eze','Ogunleye','Nwankwo','Okonkwo','Musa','Balogun','Ojo','Adeyemi','Chukwu','Obi','Akinola','Olawale','Ibekwe','Onyeka','Bello','Salami','Afolabi','Uzor','Eke','Nwosu','Akpan','Udoh','Etim','Ajayi','Oladipo','Okeke','Agu','Danjuma'];
  states text[] := array['FCT (Abuja)','Lagos','Anambra','Imo','Enugu','Oyo','Ogun','Kogi','Kwara','Delta','Edo','Rivers','Akwa Ibom','Benue','Plateau','Kaduna','Ondo','Osun','Ebonyi','Cross River'];
  lgas text[] := array['Abuja Municipal','Ikeja','Onitsha North','Owerri Municipal','Enugu North','Ibadan North','Abeokuta South','Lokoja','Ilorin West','Warri South','Oredo','Port Harcourt','Uyo','Makurdi','Jos North','Kaduna North','Akure South','Osogbo','Abakaliki','Calabar Municipal'];
  jobs text[] := array['Teacher','Civil servant','Trader','Nurse','Engineer','Accountant','Banker','Student','Farmer','Entrepreneur','Software developer','Tailor','Driver','Lawyer','Pharmacist','Electrician','Caterer','Hair stylist','Surveyor','Security officer','Doctor','Journalist'];
  areas text[] := array['Apo','Lugbe','Kubwa','Gwarinpa','Wuse 2','Garki','Jabi','Utako','Karu','Nyanya','Kado','Dutse','Life Camp'];
  streets text[] := array['Aminu Kano Crescent','Ahmadu Bello Way','Gana Street','Herbert Macaulay Way','Mississippi Street','Sokode Crescent','Ibrahim Babangida Way','Adetokunbo Ademola Crescent','Libreville Street','Zambezi Crescent','Cadastral Zone Road','Tafawa Balewa Way'];
  hows text[] := array['Invited by a member','Friend','Walk-in','Social media','Flyer','Passing by','Online service'];
  pr_list text[] := array['Healing for members in the hospital','Job opportunities for the unemployed','Safe delivery for expectant mothers','Peace and security in our community','Open doors for graduating students','Financial breakthrough for small businesses','Restoration of marriages','Salvation of family members','Strength for the sick and elderly','Wisdom for church leaders'];
  tm_list text[] := array['A member received a job offer after months of prayer','Sister Ngozi testified of a safe delivery of twins','A visitor gave her life to Christ','Brother Tunde was healed of a long illness','A family testified of a new apartment','Two members passed their professional exams','A business received an unexpected contract','A broken relationship was restored'];

  n_adults int := 112;
  n_kids int := 26;
begin
  if not exists (
    select 1 from public.churches
     where id = c and name = 'Grace Chapel Demo' and deleted_at is null
  ) then
    raise exception 'Demo seed refused: this script only runs on the church named Grace Chapel Demo.';
  end if;

  perform setseed(0.37);

  -- ---------------------------------------------------------------------------------
  -- 1. Clear this demo church (and nothing else)
  -- ---------------------------------------------------------------------------------
  delete from public.announcement_recipients where announcement_id in (select id from public.announcements where church_id = c);
  delete from public.announcement_reads where announcement_id in (select id from public.announcements where church_id = c);
  delete from public.notifications where church_id = c;
  delete from public.church_notification_reads where notification_id in (select id from public.church_notifications where church_id = c);
  delete from public.church_notifications where church_id = c;
  delete from public.cell_meeting_attendance where meeting_report_id in (select id from public.cell_group_meeting_reports where church_id = c);
  delete from public.cell_group_meeting_reports where church_id = c;
  delete from public.offering_counting_entries where counting_session_id in (select id from public.offering_counting_sessions where church_id = c);
  delete from public.offering_counting_sessions where church_id = c;
  delete from public.attendance_records where church_id = c;
  delete from public.service_sessions where church_id = c;
  delete from public.follow_up_tasks where church_id = c;
  delete from public.visits where church_id = c;
  delete from public.discipleship_stage_log where discipleship_record_id in (select id from public.discipleship_records where church_id = c);
  delete from public.discipleship_records where church_id = c;
  delete from public.visitors where church_id = c;
  delete from public.personal_soul_outreach where church_id = c;
  delete from public.personal_souls where church_id = c;
  delete from public.roster_assignments where church_id = c;
  delete from public.roster_services where church_id = c;
  delete from public.roster_template_items where church_id = c;
  delete from public.church_events where church_id = c;
  delete from public.announcements where church_id = c;
  delete from public.message_highlights where church_id = c;
  delete from public.giving_records where church_id = c;
  delete from public.giving where church_id = c;
  delete from public.church_bank_account_changes where church_id = c;
  delete from public.church_bank_accounts where church_id = c;
  delete from public.monthly_report_additions where church_id = c;
  delete from public.milestone_messages_log where church_id = c;
  delete from public.message_templates where church_id = c;
  delete from public.member_departments where department_id in (select id from public.departments where church_id = c);
  update public.profiles set cell_group_id = null, department_id = null where church_id = c;
  delete from public.members where church_id = c;
  delete from public.departments where church_id = c;
  delete from public.cell_groups where church_id = c;
  delete from public.church_alert_activities where church_id = c;
  delete from public.church_alert_settings where church_id = c;

  -- ---------------------------------------------------------------------------------
  -- 2. Staff: use the demo church's real logins, falling back safely
  -- ---------------------------------------------------------------------------------
  create temp table st on commit drop as
    select p.id pid, p.full_name, p.role::text role, row_number() over (partition by p.role order by p.created_at) rn
      from public.profiles p
     where p.church_id = c and p.deleted_at is null;

  select pid into v_pastor from st where role = 'senior_pastor' and rn = 1;
  select pid into v_admin from st where role = 'church_admin' and rn = 1;
  v_pastor := coalesce(v_pastor, v_admin);
  v_admin := coalesce(v_admin, v_pastor);
  select coalesce((select pid from st where role = 'assistant_pastor' and rn = 1), v_pastor) into v_asst;
  select coalesce((select pid from st where role = 'finance_admin' and rn = 1), v_admin) into v_fin;
  select coalesce((select pid from st where role = 'media_team' and rn = 1), v_admin) into v_media;
  select coalesce((select pid from st where role = 'childrens_teacher' and rn = 1), v_admin) into v_teacher;
  select array(select pid from st where role = 'department_head' order by rn) into v_heads;
  select array(select pid from st where role = 'cell_leader' order by rn) into v_leaders;
  v_counter2 := case when v_admin <> v_fin then v_admin else v_pastor end;
  while coalesce(array_length(v_heads, 1), 0) < 3 loop v_heads := v_heads || v_admin; end loop;
  while coalesce(array_length(v_leaders, 1), 0) < 4 loop v_leaders := v_leaders || v_pastor; end loop;

  -- ---------------------------------------------------------------------------------
  -- 3. Departments and cell groups
  -- ---------------------------------------------------------------------------------
  create temp table dep (idx int, id uuid, name text);
  with names(idx, name) as (values
    (1,'Ushering & Protocol'),(2,'Choir & Instrumentalists'),(3,'Media & Technical'),(4,'Children''s Ministry'),
    (5,'Prayer & Intercession'),(6,'Welfare & Care'),(7,'Evangelism & Outreach'),(8,'Youth & Singles')
  ), ins as (
    insert into public.departments (church_id, name, leader_profile_id, created_at)
    select c, name,
           case idx when 1 then v_heads[1] when 2 then v_heads[2] when 3 then v_media when 4 then v_teacher
                    when 5 then v_asst when 6 then v_fin when 7 then v_heads[3] else v_pastor end,
           now() - interval '300 days'
      from names
    returning id, name
  )
  insert into dep select n.idx, ins.id, ins.name from ins join names n on n.name = ins.name;

  create temp table cg (idx int, id uuid, name text, meeting_day text);
  with g(idx, name, zone, day, tm, loc) as (values
    (1,'Apo Light Cell','Apo','Tuesday','6:00 PM','Block 12, Apo Resettlement Zone E'),
    (2,'Lugbe Grace Cell','Lugbe','Wednesday','5:30 PM','Plot 40, Lugbe Main Road'),
    (3,'Kubwa Faith Cell','Kubwa','Thursday','6:00 PM','Phase 3, Kubwa Extension'),
    (4,'Gwarinpa Victory Cell','Gwarinpa','Tuesday','6:30 PM','7th Avenue, Gwarinpa Estate'),
    (5,'Wuse Zion Cell','Wuse 2','Thursday','6:00 PM','Aminu Kano Crescent, Wuse 2'),
    (6,'Karu Hope Cell','Karu','Saturday','4:00 PM','New Karu Site'),
    (7,'Jabi Youth Cell','Jabi','Friday','5:00 PM','Jabi Lake Mall Annex'),
    (8,'Kado Family Cell','Kado','Saturday','5:00 PM','Kado Estate, Block C')
  ), ins as (
    insert into public.cell_groups (church_id, name, leader_profile_id, zone, meeting_day, meeting_time, location, created_at)
    select c, name, v_leaders[((idx - 1) % array_length(v_leaders, 1)) + 1], zone, day, tm, loc, now() - interval '250 days'
      from g
    returning id, name, meeting_day
  )
  insert into cg select g.idx, ins.id, ins.name, ins.meeting_day from ins join g on g.name = ins.name;

  update public.profiles p set cell_group_id = x.id
    from (select distinct on (leader_profile_id) leader_profile_id, id from public.cell_groups where church_id = c order by leader_profile_id, name) x
   where p.id = x.leader_profile_id and p.church_id = c;

  -- ---------------------------------------------------------------------------------
  -- 4. Members: staff, adults and children
  -- ---------------------------------------------------------------------------------
  create temp table mem (idx int, id uuid, name text, gender text, age_group text, status text, joined date, cell_idx int, eng numeric);

  -- 4a. adults and children (generated)
  insert into mem (idx, id, name, gender, age_group, status, joined, cell_idx, eng)
  select g.i, gen_random_uuid(),
         case when (g.i * 37) % 100 < 54 then fn_f[(g.i * 7) % 25 + 1] else fn_m[(g.i * 7) % 25 + 1] end
           || ' ' || lnames[(g.i * 11) % 30 + 1],
         case when (g.i * 37) % 100 < 54 then 'female' else 'male' end,
         case when g.i <= n_adults then 'adult' else 'child' end,
         case when g.i > n_adults then 'active'
              when g.i % 29 = 0 then 'inactive'
              when g.i = 100 then 'transferred_out'
              when g.i % 14 = 7 then 'new_convert'
              when g.i % 10 = 3 then 'worker'
              else 'active' end,
         case when g.i % 14 = 7 and g.i <= n_adults then v_today - ((g.i % 55) + 3)
              when g.i > n_adults then v_today - (((g.i * 41) % 900) + 30)
              else v_today - (((g.i * 53) % 1500) + 60) end,
         case when g.i <= n_adults and g.i % 10 <> 0 then (g.i % 8) + 1 else null end,
         ((g.i * 37) % 100) / 100.0
    from generate_series(1, n_adults + n_kids) as g(i);

  insert into public.members (
    id, church_id, full_name, phone, email, date_of_birth, gender, marital_status, residential_address,
    state_of_origin, lga, occupation, cell_group_id, status, date_joined, wedding_anniversary,
    blood_group, genotype, born_again_date, next_of_kin_name, next_of_kin_phone, social_handles,
    source, created_at, age_group
  )
  select m.id, c, m.name,
         '0800000' || lpad(m.idx::text, 4, '0'),
         case when m.age_group = 'adult' and m.idx % 5 <> 0
              then lower(split_part(m.name, ' ', 1) || '.' || split_part(m.name, ' ', 2)) || m.idx || '@example.com' end,
         case when m.age_group = 'child'
              then v_today - (((m.idx * 211) % 3300) + 700)
              -- a few birthdays today and in the next 10 days, for the birthday and milestone screens
              when m.idx in (5, 12) then pg_temp.bday(1980 + m.idx % 15, v_today)
              when m.idx in (20, 21, 30, 31, 32, 33, 34, 35) then pg_temp.bday(1978 + m.idx % 20, v_today + (m.idx % 9) + 1)
              else date '1960-03-01' + ((m.idx * 733) % 15000) end,
         m.gender,
         case when m.age_group = 'child' then 'single'
              when m.idx % 20 = 4 then 'widowed'
              when (m.idx * 13) % 100 < 56 then 'married' else 'single' end,
         ((m.idx % 60) + 1)::text || ', ' || streets[(m.idx * 5) % 12 + 1] || ', ' || areas[(m.idx * 3) % 13 + 1] || ', Abuja',
         states[(m.idx * 3) % 20 + 1],
         lgas[(m.idx * 3) % 20 + 1],
         case when m.age_group = 'child' then 'Student' else jobs[(m.idx * 7) % 22 + 1] end,
         (select id from cg where cg.idx = m.cell_idx),
         m.status::public.member_status,
         m.joined,
         case when m.age_group = 'adult' and (m.idx * 13) % 100 < 56 and m.idx % 20 <> 4
              then case when m.idx in (8, 9, 22) then pg_temp.bday(2012 + m.idx % 8, v_today + 6)
                        else date '2000-02-01' + ((m.idx * 317) % 8500) end end,
         (array['O+','A+','B+','O-','AB+','A-'])[(m.idx % 6) + 1],
         (array['AA','AS','AA','AA','AS','SS'])[(m.idx % 6) + 1],
         case when m.age_group = 'adult' then m.joined - ((m.idx * 17) % 400) end,
         case when m.age_group = 'adult' then lnames[(m.idx * 17) % 30 + 1] || ' ' || fn_f[(m.idx * 3) % 25 + 1] end,
         '0800009' || lpad(m.idx::text, 4, '0'),
         case when m.age_group = 'adult' and m.idx % 3 = 0
              then jsonb_build_object('instagram', '@' || lower(split_part(m.name, ' ', 1)) || m.idx) end,
         (array['admin_added','self_onboarded','admin_added','manual'])[(m.idx % 4) + 1],
         m.joined::timestamp + interval '10 hours',
         m.age_group
    from mem m;

  -- 4b. staff members linked to their logins (so they appear as people and in rosters)
  insert into public.members (church_id, profile_id, full_name, phone, email, gender, marital_status, status, date_joined, source, created_at, age_group, state_of_origin, lga, occupation, cell_group_id)
  select c, s.pid, s.full_name,
         '0800008' || lpad(s.rn::text, 2, '0') || lpad((row_number() over (order by s.pid))::text, 2, '0'),
         'staff.' || (row_number() over (order by s.pid)) || '@example.com',
         case when s.full_name ~* '^(Mrs|Sis|Pastor Chid)' then 'female' else 'male' end,
         case when s.role = 'member' then 'single' else 'married' end,
         (case when s.role = 'member' then 'active' else 'worker' end)::public.member_status, v_today - 900, 'admin_added', now() - interval '900 days', 'adult',
         'FCT (Abuja)', 'Abuja Municipal', 'Church staff',
         (select p.cell_group_id from public.profiles p where p.id = s.pid)
    from st s;

  -- department membership (workers and some others)
  insert into public.member_departments (member_id, department_id)
  select m.id, (select id from dep where dep.idx = ((m.idx * 3) % 8) + 1)
    from mem m where m.age_group = 'adult' and m.status = 'worker'
  union
  select m.id, (select id from dep where dep.idx = ((m.idx * 5 + 2) % 8) + 1)
    from mem m where m.age_group = 'adult' and m.status = 'active' and m.idx % 4 = 0;

  -- ---------------------------------------------------------------------------------
  -- 5. Services and attendance (last 12 weeks)
  -- ---------------------------------------------------------------------------------
  create temp table svc (id uuid, d date, kind text, name text);
  with days as (select (v_today - g.n) as d from generate_series(1, 84) as g(n)),
  plan as (
    select d, 'sunday' kind, 'Sunday Service' name, time '08:00' t from days where extract(dow from d) = 0
    union all select d, 'midweek', 'Midweek Bible Study', time '18:00' from days where extract(dow from d) = 3
    union all select d, 'midweek', 'Friday Prayer Meeting', time '18:00' from days where extract(dow from d) = 5
    union all select v_today - 24 - extract(dow from v_today - 24)::int + 6, 'special', 'Youth Night', time '17:00'
    union all select v_today - 45 - extract(dow from v_today - 45)::int + 6, 'special', 'Evangelism Outreach', time '10:00'
  ), ins as (
    insert into public.service_sessions (church_id, service_name, service_date, status, service_type, started_at, ended_at, check_in_token, check_in_code, created_at)
    select c, name, d, 'closed', kind,
           ((d + t - interval '1 hour') at time zone 'UTC'),
           ((d + t + interval '2 hours') at time zone 'UTC'),
           md5(random()::text || d::text || name), lpad((100000 + (random() * 899999)::int)::text, 6, '0'),
           ((d + t - interval '1 hour') at time zone 'UTC')
      from plan
    returning id, service_date, service_type, service_name
  )
  insert into svc select id, service_date, service_type, service_name from ins;

  -- attendance: adults by engagement, children on Sundays; trend rises through the 12 weeks
  insert into public.attendance_records (church_id, service_session_id, member_id, check_in_method, checked_in_at, created_at)
  select c, s.id, m.id,
         case when m.age_group = 'child' then 'dashboard'
              else (array['qr_self','qr_self','manual','dashboard'])[(abs(hashtext(s.id::text || m.id::text)) % 4) + 1] end,
         (s.d + case when s.kind = 'sunday' then time '07:00' else time '17:00' end
            + (random() * interval '80 minutes')) at time zone 'UTC',
         (s.d + time '09:00') at time zone 'UTC'
    from svc s
    join mem m on m.status in ('active','worker','new_convert','inactive')
   where m.joined <= s.d
     and random() < (
       case when m.age_group = 'child' then (case when s.kind = 'sunday' then 0.62 else 0 end)
            else (case when m.status = 'worker' then 0.9 when m.status = 'inactive' then 0.05 when m.status = 'new_convert' then 0.7
                       else 0.40 + 0.58 * m.eng end)
                 * (case s.kind when 'sunday' then 1.0 when 'special' then 0.85 else 0.55 end)
                 * (0.9 + 0.1 * (84 - (v_today - s.d)) / 84.0)
       end);

  -- a handful of regulars who stopped coming recently, for the "missed 3 Sundays" screens
  delete from public.attendance_records a
   using svc s, mem m
   where a.service_session_id = s.id and a.member_id = m.id and a.church_id = c
     and s.kind = 'sunday' and m.age_group = 'adult' and m.idx between 40 and 47
     and s.d in (select d from svc where kind = 'sunday' order by d desc limit 3);
  insert into public.attendance_records (church_id, service_session_id, member_id, check_in_method, checked_in_at, created_at)
  select c, s.id, m.id, 'qr_self', (s.d + time '07:30') at time zone 'UTC', (s.d + time '09:00') at time zone 'UTC'
    from svc s join mem m on m.idx between 40 and 47 and m.age_group = 'adult'
   where s.kind = 'sunday' and s.d in (select d from svc where kind = 'sunday' order by d desc offset 3 limit 5)
     and not exists (select 1 from public.attendance_records a where a.service_session_id = s.id and a.member_id = m.id);

  -- ---------------------------------------------------------------------------------
  -- 6. Visitors, follow-up and discipleship
  -- ---------------------------------------------------------------------------------
  create temp table vis (idx int, id uuid, name text, first_d date, status text);
  insert into vis
  select g.i, gen_random_uuid(),
         case when g.i % 2 = 0 then fn_f[(g.i * 9) % 25 + 1] else fn_m[(g.i * 9) % 25 + 1] end || ' ' || lnames[(g.i * 13 + 5) % 30 + 1],
         (select d from svc where kind = 'sunday' order by d desc offset ((g.i * 5) % 12) limit 1),
         (array['first_timer','first_timer','repeat_visitor','convert','first_timer','repeat_visitor','inactive'])[(g.i % 7) + 1]
    from generate_series(1, 36) as g(i);
  -- the newest few visitors came this past Sunday
  update vis set first_d = (select max(d) from svc where kind = 'sunday'), status = 'first_timer' where idx in (1, 2, 3, 4);

  insert into public.visitors (id, church_id, full_name, phone, address, how_heard, status, first_visit_date, created_at)
  select v.id, c, v.name, '0800001' || lpad(v.idx::text, 4, '0'),
         ((v.idx % 40) + 3)::text || ', ' || streets[(v.idx * 7) % 12 + 1] || ', ' || areas[(v.idx * 5) % 13 + 1],
         hows[(v.idx % 7) + 1], v.status::public.visitor_status, v.first_d, v.first_d::timestamp + interval '11 hours'
    from vis v;

  insert into public.visits (visitor_id, church_id, visit_date, created_at)
  select v.id, c, v.first_d, v.first_d::timestamp + interval '11 hours' from vis v
  union all
  select v.id, c, s.d, s.d::timestamp + interval '11 hours'
    from vis v join svc s on s.kind = 'sunday' and s.d > v.first_d
   where v.status in ('repeat_visitor', 'convert') and (abs(hashtext(v.id::text || s.d::text)) % 3) = 0;

  insert into public.follow_up_tasks (church_id, visitor_id, assigned_to, status, due_at, notes, created_at)
  select c, v.id,
         (array[v_leaders[1], v_leaders[2], v_leaders[3], v_asst, v_admin, v_leaders[4]])[(v.idx % 6) + 1],
         case when v.idx in (5, 6, 7, 8, 9) then 'pending'   -- overdue, shows in "needs follow-up"
              when v.status = 'first_timer' and v.first_d >= v_today - 6 then 'pending'
              when v.status = 'convert' then 'converted'
              when v.status = 'inactive' then 'inactive'
              else (array['contacted','visited','contacted'])[(v.idx % 3) + 1] end,
         (v.first_d + 1)::timestamp + interval '12 hours',
         case when v.status = 'convert' then 'Gave his or her life to Christ. Enrolled for the new converts class.'
              when v.status = 'inactive' then 'Has moved out of the area.'
              else (array['Called and welcomed. Promised to come next Sunday.','Not reachable. Try WhatsApp in the evening.','Visited at home. Interested in the cell group.','Invited to the Midweek Bible Study.','Asked for prayers about a job.'])[(v.idx % 5) + 1] end,
         v.first_d::timestamp + interval '12 hours'
    from vis v;

  -- discipleship: visitors who converted and recent new converts, at different stages
  create temp table dr (id uuid, stage text, started date);
  with src as (
    (select 'v' kind, v.id ref, v.first_d base, (row_number() over (order by v.idx))::int rn from vis v where v.status in ('convert', 'repeat_visitor') order by v.idx limit 10)
    union all
    (select 'm', m.id, m.joined, (100 + row_number() over (order by m.idx))::int from mem m where m.status = 'new_convert' and m.age_group = 'adult' order by m.idx limit 8)
  ), ins as (
    insert into public.discipleship_records (
      church_id, visitor_id, member_id, current_stage, stage_entered_at, salvation_date, assigned_pastor_id,
      water_baptism_scheduled_date, water_baptism_completed_date, holy_spirit_baptism_date,
      new_convert_class_completed_date, membership_class_completed_date, membership_card_issued,
      worker_consecration_date, created_at
    )
    select c, case when kind = 'v' then ref end, case when kind = 'm' then ref end,
           (array['salvation','salvation','water_baptism','holy_spirit_baptism','new_convert_class','membership_class','worker_consecration'])[(rn % 7) + 1]::public.discipleship_stage,
           (base + ((rn * 3) % 20))::timestamp + interval '10 hours',
           base,
           case when rn % 2 = 0 then v_asst else v_pastor end,
           case when rn % 7 >= 1 then base + 14 end,
           case when rn % 7 >= 2 then base + 21 end,
           case when rn % 7 >= 3 then base + 35 end,
           case when rn % 7 >= 4 then base + 49 end,
           case when rn % 7 >= 5 then base + 63 end,
           rn % 7 >= 5,
           case when rn % 7 = 6 then base + 90 end,
           base::timestamp + interval '10 hours'
      from src
    returning id, current_stage, salvation_date
  )
  insert into dr select id, current_stage::text, salvation_date from ins;

  insert into public.discipleship_stage_log (discipleship_record_id, stage, completed_at, administered_by, notes)
  select dr.id, s.stage::public.discipleship_stage, (dr.started + s.days)::timestamp + interval '11 hours', v_asst, s.note
    from dr
    join (values
      ('salvation', 0, 'Gave his or her life to Christ'),
      ('water_baptism', 21, 'Baptised in the church baptistery'),
      ('holy_spirit_baptism', 35, 'Received the baptism of the Holy Spirit'),
      ('new_convert_class', 49, 'Completed the new converts class'),
      ('membership_class', 63, 'Completed the membership class')
    ) as s(stage, days, note)
      on (select array_position(enum_range(null::public.discipleship_stage), s.stage::public.discipleship_stage)) <=
         (select array_position(enum_range(null::public.discipleship_stage), dr.stage::public.discipleship_stage));

  -- ---------------------------------------------------------------------------------
  -- 7. Cell group reports (last 8 weeks)
  -- ---------------------------------------------------------------------------------
  create temp table rep (id uuid, cell_id uuid, d date);
  with weeks as (select k from generate_series(0, 7) k),
  meet as (
    select cg.id cell_id, cg.idx,
           (v_today - ((extract(dow from v_today)::int - array_position(array['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'], cg.meeting_day) + 1 + 7) % 7) - 7 * w.k) as d,
           w.k
      from cg cross join weeks w
  ), ins as (
    insert into public.cell_group_meeting_reports (cell_group_id, church_id, meeting_date, attendance_count, new_faces_count, prayer_points, testimonies, status, created_at)
    select cell_id, c, d,
           case when (idx + k) % 11 = 0 then 0 else 7 + ((idx * 5 + k * 3) % 13) end,
           case when (idx + k) % 11 = 0 then 0 else (idx + k) % 4 end,
           case when (idx + k) % 11 = 0 then null else pr_list[((idx + k) % 10) + 1] end,
           case when (idx + k) % 11 = 0 then null else tm_list[((idx * 2 + k) % 8) + 1] end,
           case when (idx + k) % 11 = 0 then 'missing' when (idx + k) % 5 = 0 then 'late' else 'on_time' end::public.cell_report_status,
           d::timestamp + interval '21 hours'
      from meet where d < v_today
    returning id, cell_group_id, meeting_date
  )
  insert into rep select id, cell_group_id, meeting_date from ins;

  insert into public.cell_meeting_attendance (meeting_report_id, member_id, present)
  select r.id, m.id, (abs(hashtext(r.id::text || m.id::text)) % 10) < 8
    from rep r
    join public.members m on m.cell_group_id = r.cell_id and m.church_id = c and m.age_group = 'adult'
   where r.d = (select max(d) from rep r2 where r2.cell_id = r.cell_id);

  -- ---------------------------------------------------------------------------------
  -- 8. Announcements
  -- ---------------------------------------------------------------------------------
  insert into public.announcements (church_id, title, body, target_type, target_department_id, target_cell_group_id, send_via_whatsapp, send_via_in_app, is_emergency, sent_at, created_at)
  select c, a.title, a.body, a.target::public.announcement_target,
         case when a.target = 'department' then (select id from dep where dep.idx = a.dep) end,
         case when a.target = 'cell_group' then (select id from cg where cg.idx = a.cell) end,
         false, true, a.urgent, (now() - (a.days_ago || ' days')::interval), (now() - (a.days_ago || ' days')::interval)
    from (values
      ('Annual Thanksgiving Service', 'Join us this month for our Annual Thanksgiving Service. Come with a heart full of gratitude and invite your family and friends. Service holds at 8:00 AM.', 'all', 0, 0, false, 2),
      ('Service time change this Sunday', 'Please note that this Sunday''s service will start at 9:00 AM because of the road closure around the church. We apologise for any inconvenience.', 'all', 0, 0, true, 5),
      ('Choir rehearsal moved to Saturday', 'Choir and instrumentalists, rehearsal this week is on Saturday at 4:00 PM in the main auditorium. Please be punctual.', 'department', 2, 0, false, 8),
      ('Apo Light Cell visitation', 'Apo Light Cell will visit new members in the area this Saturday. Meet at the church car park by 10:00 AM.', 'cell_group', 0, 1, false, 9),
      ('New converts class begins', 'The new converts class starts this Wednesday after Bible Study. Everyone who gave their life to Christ recently should attend.', 'all', 0, 0, false, 12),
      ('Ushering team training', 'Ushers and protocol team, there will be a short training after service this Sunday. Please stay behind.', 'department', 1, 0, false, 16),
      ('Welfare drive for the less privileged', 'We are collecting food items and clothes for our outreach to the less privileged. Drop your items at the church office by Friday.', 'all', 0, 0, false, 21),
      ('Youth Night this Saturday', 'All youths, join us for Youth Night with worship, a talk and games. Come with a friend. Starts at 5:00 PM.', 'department', 8, 0, false, 26),
      ('Membership class holds Sunday', 'The membership class holds this Sunday after service. All new members and interested visitors are welcome.', 'all', 0, 0, false, 33)
    ) as a(title, body, target, dep, cell, urgent, days_ago);

  insert into public.announcement_recipients (announcement_id, member_id, phone_snapshot, whatsapp_status, in_app_read_at, created_at)
  select an.id, m.id, '0800000' || lpad(m.idx::text, 4, '0'), 'not_configured',
         case when m.idx % 3 <> 0 then an.sent_at + (m.idx || ' minutes')::interval end, an.sent_at
    from (select id, sent_at from public.announcements where church_id = c order by sent_at desc limit 2) an
    join mem m on m.age_group = 'adult' and m.status in ('active', 'worker') and m.idx % 2 = 0;

  -- ---------------------------------------------------------------------------------
  -- 9. Calendar events (next weeks; recurring ones repeat)
  -- ---------------------------------------------------------------------------------
  insert into public.church_events (church_id, title, description, location, event_date, start_time, end_time, repeat_rule, repeat_until, cell_group_id, send_reminders, created_at)
  select c, e.title, e.descr, e.loc, v_today + e.offs, e.st::time, e.en::time, e.rule, case when e.rule <> 'none' then v_today + 365 end,
         case when e.cell > 0 then (select id from cg where cg.idx = e.cell) end, true, now() - interval '60 days'
    from (values
      ('Sunday Service', 'Our main weekly worship service.', 'Main auditorium', (7 - extract(dow from v_today)::int) % 7, '08:00', '10:30', 'weekly', 0),
      ('Midweek Prayer & Bible Study', 'Prayer and a study of the Word.', 'Main auditorium', (3 - extract(dow from v_today)::int + 7) % 7, '18:00', '19:30', 'weekly', 0),
      ('Friday Prayer Meeting', 'A night of prayer and intercession.', 'Main auditorium', (5 - extract(dow from v_today)::int + 7) % 7, '18:00', '19:30', 'weekly', 0),
      ('Choir Rehearsal', 'Weekly choir and instrumentalists rehearsal.', 'Music room', (6 - extract(dow from v_today)::int + 7) % 7, '16:00', '18:00', 'weekly', 0),
      ('Cell Leaders Meeting', 'Monthly meeting with all cell leaders.', 'Conference room', 9, '17:00', '19:00', 'monthly', 0),
      ('Youth Night', 'Worship, a talk and games for the youth.', 'Youth hall', 6, '17:00', '20:00', 'monthly', 0),
      ('Annual Thanksgiving Service', 'A special service of thanksgiving.', 'Main auditorium', 17, '08:00', '12:00', 'none', 0),
      ('Women''s Fellowship', 'Monthly fellowship for the women.', 'Fellowship hall', 12, '15:00', '17:00', 'monthly', 0),
      ('Men''s Fellowship', 'Monthly fellowship for the men.', 'Fellowship hall', 13, '15:00', '17:00', 'monthly', 0),
      ('Evangelism Outreach', 'Door to door and market evangelism.', 'Kubwa Market', 20, '10:00', '14:00', 'none', 0),
      ('Wedding of Brother Segun and Sister Amaka', 'Join us as we celebrate our members.', 'Main auditorium', 24, '11:00', '15:00', 'none', 0),
      ('Apo Light Cell Meeting', 'Weekly cell meeting.', 'Block 12, Apo Resettlement', (2 - extract(dow from v_today)::int + 7) % 7, '18:00', '19:30', 'weekly', 1)
    ) as e(title, descr, loc, offs, st, en, rule, cell);

  -- ---------------------------------------------------------------------------------
  -- 10. Service roster (order of service and duties)
  -- ---------------------------------------------------------------------------------
  insert into public.roster_template_items (church_id, service_type, section, title, sort_order, is_active)
  select c, 'sunday', t.section, t.title, t.ord, true
    from (values
      ('order','Opening prayer',1),('order','Praise & worship',2),('order','Announcements',3),('order','Anthem',4),
      ('order','Offering',5),('order','Sermon',6),('order','Altar call / ministration',7),('order','Closing prayer',8),
      ('duty','Ushers',1),('duty','Sound / PA',2),('duty','Projector / lyrics',3),('duty','Live stream / camera',4),
      ('duty','Greeters / welcome team',5),('duty','Protocol',6),('duty','Offering counters',7),
      ('duty','Prayer team / altar workers',8),('duty','Children''s church teachers',9),('duty','Security / car park',10)
    ) as t(section, title, ord);

  create temp table ros (id uuid, d date);
  with sundays as (select (v_today + ((7 - extract(dow from v_today)::int) % 7) + 7 * k) as d, k from generate_series(-2, 4) k),
  ins as (
    insert into public.roster_services (church_id, service_date, service_type, title, notes, created_at)
    select c, d, 'sunday', 'Sunday Service',
           (array['Theme: Walking in divine purpose','Theme: The power of consistent prayer','Theme: Faith that moves mountains','Theme: Stewardship and the open heavens','Theme: Love in action','Theme: Overcoming fear','Theme: Renewed strength'])[(k + 2) % 7 + 1],
           now() - interval '30 days'
      from sundays
    returning id, service_date
  )
  insert into ros select id, service_date from ins;

  insert into public.roster_assignments (church_id, roster_service_id, section, title, sort_order, member_id, assignee_name, note, created_at)
  select c, r.id, t.section, t.title, t.sort_order,
         case when t.section = 'duty' then (select m.id from mem m where m.status = 'worker' and m.age_group = 'adult' order by (m.idx * 7 + (extract(doy from r.d))::int + t.sort_order) % 97 limit 1) end,
         case when t.section = 'order' then (array[(select full_name from st where pid = v_pastor),'Sis. Amaka Eze','Bro. Segun Balogun','Choir','Pastor Chidinma Okeke','Pastor Dee','Pastor Dee','Bro. Kelechi Obi'])[t.sort_order] end,
         null, now() - interval '30 days'
    from ros r join public.roster_template_items t on t.church_id = c and t.service_type = 'sunday' and t.is_active;

  -- put the church admin on an upcoming duty so the dashboard "My duties" card shows something
  update public.roster_assignments ra
     set member_id = (select id from public.members where profile_id = v_admin and church_id = c)
   where ra.id = (
     select a.id from public.roster_assignments a join ros r on r.id = a.roster_service_id
      where a.church_id = c and a.section = 'duty' and a.title = 'Greeters / welcome team' and r.d >= v_today
      order by r.d limit 1);

  -- ---------------------------------------------------------------------------------
  -- 11. Giving
  -- ---------------------------------------------------------------------------------
  insert into public.church_bank_accounts (church_id, label, bank_name, account_number, account_name, sort_order, purpose, is_active, created_at)
  values
    (c, 'Tithes & Offerings', 'Guaranty Trust Bank', '0123456789', 'Grace Chapel Demo Church', 1, 'Tithes and offerings', true, now() - interval '200 days'),
    (c, 'Building Project', 'Access Bank', '0987654321', 'Grace Chapel Building Fund', 2, 'Building project', true, now() - interval '200 days');

  insert into public.giving_records (church_id, member_id, category, amount, currency, payment_method, source, paystack_reference, status, tithe_card_number, given_at, created_at)
  select c, m.id, g.cat::public.giving_category,
         (case g.cat
            when 'tithe' then (array[5000,10000,15000,20000,30000,50000,75000,100000,120000])[1 + floor(g.r * 9)::int]
            when 'offering' then (array[1000,2000,5000,10000,20000])[1 + floor(g.r * 5)::int]
            when 'thanksgiving' then (array[5000,10000,20000,50000,100000])[1 + floor(g.r * 5)::int]
            when 'building_project' then (array[10000,20000,50000,100000,200000])[1 + floor(g.r * 5)::int]
            else (array[2000,5000,10000,30000])[1 + floor(g.r * 4)::int] end)::numeric,
         'NGN', g.pm, g.src, case when g.src = 'paystack' then 'DEMO-' || g.n end,
         case when g.n % 47 = 0 then 'pending' else 'success' end,
         case when g.cat = 'tithe' then 'TC-' || lpad(m.idx::text, 4, '0') end,
         g.at, g.at
    from (
      select row_number() over () n, s.d, k.i, random() r,
             (array['tithe','tithe','offering','thanksgiving','building_project','welfare'])[(k.i % 6) + 1] cat,
             (array['card','bank_transfer','cash'])[(k.i % 3) + 1] pm,
             case when k.i % 3 = 0 then 'paystack' else 'manual' end src,
             (s.d + interval '10 hours' + random() * interval '4 hours') at time zone 'UTC' at
        from (select d from svc where kind = 'sunday') s
        cross join generate_series(1, 24) as k(i)
    ) g
    join mem m on m.age_group = 'adult' and m.status in ('active', 'worker', 'new_convert')
              and m.idx = ((g.i * 7 + extract(doy from g.d)::int) % n_adults) + 1;

  -- bank transfers waiting for the finance team to verify (screen: Transfers)
  insert into public.giving (church_id, member_id, amount, fund_type, bank_account_id, status, payment_method, given_by_name, given_by_phone, notes, verified_by, verified_at, rejection_reason, created_at)
  select c, (select id from mem where idx = t.midx), t.amount, t.fund,
         (select id from public.church_bank_accounts where church_id = c and sort_order = case when t.fund = 'building' then 2 else 1 end),
         t.status, 'bank_transfer', (select name from mem where idx = t.midx), '0800000' || lpad(t.midx::text, 4, '0'), t.note,
         case when t.status <> 'pending' then v_fin end,
         case when t.status <> 'pending' then now() - (t.days_ago - 1 || ' days')::interval end,
         case when t.status = 'rejected' then 'The transfer could not be found in the account statement.' end,
         now() - (t.days_ago || ' days')::interval
    from (values
      (14, 50000, 'tithe', 'pending', 'Sunday tithe', 1), (23, 100000, 'building', 'pending', 'Building project pledge', 1),
      (31, 25000, 'offering', 'pending', 'Thanksgiving offering', 2), (47, 30000, 'welfare', 'pending', 'For the welfare drive', 2),
      (52, 75000, 'tithe', 'verified', 'Monthly tithe', 6), (61, 200000, 'building', 'verified', 'Building project', 8),
      (66, 15000, 'offering', 'verified', 'Sunday offering', 9), (71, 40000, 'tithe', 'verified', 'Tithe', 11),
      (75, 120000, 'building', 'verified', 'Building project', 14), (80, 20000, 'welfare', 'verified', 'Welfare', 16),
      (84, 60000, 'tithe', 'verified', 'Tithe', 19), (90, 10000, 'offering', 'verified', 'Offering', 23),
      (95, 500000, 'building', 'rejected', 'Building project', 27), (99, 8000, 'offering', 'rejected', 'Offering', 30)
    ) as t(midx, amount, fund, status, note, days_ago);

  -- offering counting (two counters per session; the database confirms or flags a mismatch)
  create temp table cnt (id uuid, d date, n int);
  with sess as (select d, row_number() over (order by d) rn from svc where kind = 'sunday' order by d desc limit 10),
  ins as (
    insert into public.offering_counting_sessions (church_id, service_name, service_date, status, created_at)
    select c, 'Sunday Service', d, 'open', d::timestamp + interval '13 hours' from sess
    returning id, service_date
  )
  insert into cnt select ins.id, ins.service_date, row_number() over (order by ins.service_date) from ins;
  insert into public.offering_counting_entries (counting_session_id, counted_by, tallied_amount, submitted_at)
  select id, v_fin, 380000 + (n * 47000) % 520000, d::timestamp + interval '13 hours 30 minutes' from cnt;
  -- the second counter agrees, except once (a discrepancy to review) and the latest count (still waiting)
  insert into public.offering_counting_entries (counting_session_id, counted_by, tallied_amount, submitted_at)
  select id, v_counter2, 380000 + (n * 47000) % 520000 + case when n = 4 then 20000 else 0 end, d::timestamp + interval '13 hours 45 minutes'
    from cnt where n < (select max(n) from cnt);

  -- ---------------------------------------------------------------------------------
  -- 12. Message highlights, souls, monthly reports, templates, alerts
  -- ---------------------------------------------------------------------------------
  insert into public.message_highlights (church_id, service_date, title, summary, preacher_name, scripture, created_at)
  select c, s.d, h.title, h.summary, h.preacher, h.scripture, s.d::timestamp + interval '15 hours'
    from (select d, row_number() over (order by d desc) rn from svc where kind = 'sunday' order by d desc limit 8) s
    join (values
      (1, 'Walking in Divine Purpose', 'God has a specific plan for every believer. Pastor Dee taught that purpose is discovered through prayer, obedience and patience, and that no season is wasted.', 'Pastor Dee', 'Jeremiah 29:11'),
      (2, 'The Power of Consistent Prayer', 'Prayer is not an event but a lifestyle. We were encouraged to set a daily time for prayer and to expect God to answer in his time.', 'Pastor Dee', 'Luke 18:1'),
      (3, 'Faith That Moves Mountains', 'Faith begins where human effort ends. A message on trusting God completely when the situation looks impossible.', 'Pastor Chidinma Okeke', 'Matthew 17:20'),
      (4, 'Stewardship and the Open Heavens', 'Our giving is an act of worship. The church was reminded that faithful stewardship unlocks God''s provision.', 'Pastor Dee', 'Malachi 3:10'),
      (5, 'Love in Action', 'Love must be seen, not only spoken. We were challenged to serve the people around us in practical ways this week.', 'Pastor Dee', '1 John 3:18'),
      (6, 'Overcoming Fear', 'Fear loses its power when we hold on to God''s promises. A reminder that God has not given us a spirit of fear.', 'Guest minister: Rev. Adebayo', '2 Timothy 1:7'),
      (7, 'Renewed Strength', 'Those who wait on the Lord will renew their strength. A word of encouragement for the weary and the waiting.', 'Pastor Dee', 'Isaiah 40:31'),
      (8, 'Fruitfulness in Every Season', 'God expects fruit in every season of life. We learned how to stay planted, patient and productive.', 'Pastor Chidinma Okeke', 'Psalm 1:3')
    ) as h(rn, title, summary, preacher, scripture) on h.rn = s.rn;

  -- always one from yesterday, so the "message highlight" card on the Today screen is filled
  insert into public.message_highlights (church_id, service_date, title, summary, preacher_name, scripture, created_at)
  select c, v_today - 1, 'Standing Firm in Faith',
         'A short word for the week: stay anchored in God''s promises, keep praying, and encourage one another. Our help comes from the Lord.',
         'Pastor Dee', 'Psalm 121:1-2', (v_today - 1)::timestamp + interval '19 hours'
   where extract(dow from v_today - 1) <> 0;

  insert into public.personal_souls (id, church_id, won_by_profile_id, full_name, phone, notes, status, last_contacted_at, follow_up_notes, times_reached, created_at)
  select gen_random_uuid(), c, (array[v_pastor, v_admin, v_asst, v_leaders[1], v_leaders[2], v_leaders[3]])[(g.i % 6) + 1],
         case when g.i % 2 = 0 then fn_f[(g.i * 11) % 25 + 1] else fn_m[(g.i * 11) % 25 + 1] end || ' ' || lnames[(g.i * 7 + 3) % 30 + 1],
         '0800002' || lpad(g.i::text, 4, '0'),
         (array['Met at the market during evangelism','Invited by a colleague at work','Reached during the door to door outreach','Met at a bus stop and shared the gospel'])[(g.i % 4) + 1],
         (array['pending','contacted','contacted','inactive'])[(g.i % 4) + 1],
         now() - ((g.i * 2) || ' days')::interval,
         (array['Prayed together over the phone','Invited to the next Sunday service','Shared a Bible study booklet','Promised to visit the church'])[(g.i % 4) + 1],
         (g.i % 4) + 1, now() - ((g.i * 6 + 5) || ' days')::interval
    from generate_series(1, 14) g(i);

  insert into public.personal_soul_outreach (church_id, soul_id, reached_by, step_number, channel, created_at)
  select c, ps.id, ps.won_by_profile_id, s.step, (array['whatsapp','call','sms','in_person'])[s.step], ps.created_at + (s.step * 2 || ' days')::interval
    from public.personal_souls ps
    join generate_series(1, 4) s(step) on s.step <= ps.times_reached
   where ps.church_id = c;

  insert into public.monthly_report_additions (church_id, report_year, report_month, department_id, notes, extras, created_at)
  select c, extract(year from m.d)::int, extract(month from m.d)::int, (select id from dep where dep.idx = x.dep_idx), x.note,
         jsonb_build_array(jsonb_build_object('title', x.t1, 'body', x.b1), jsonb_build_object('title', x.t2, 'body', x.b2)),
         m.d + interval '27 days'
    from (select date_trunc('month', v_today - interval '1 month')::date d union all select date_trunc('month', v_today - interval '2 month')::date) m
    cross join (values
      (1, 'The ushering team served well and added four new members.', 'Training', 'Held a one hour training for ushers on welcoming visitors.', 'Challenge', 'We need more ushers for the second service.'),
      (2, 'Rehearsals were consistent. The choir learned three new songs.', 'New songs', 'Three new songs were introduced during the month.', 'Need', 'The keyboard needs repair.'),
      (3, 'The media team streamed every service without interruption.', 'Live stream', 'Average of 180 online viewers on Sundays.', 'Equipment', 'A second camera would improve coverage.'),
      (7, 'Two outreaches held. Over 60 people heard the gospel.', 'Souls won', '14 people gave their lives to Christ.', 'Follow-up', 'Most new converts have been assigned to cells.')
    ) x(dep_idx, note, t1, b1, t2, b2);

  insert into public.message_templates (church_id, template_type, body_text, created_at)
  values
    (c, 'birthday', 'Happy Birthday {{name}}! The whole {{church_name}} family celebrates you today. God bless you richly.', now()),
    (c, 'wedding_anniversary', 'Happy Anniversary {{name}}! {{church_name}} celebrates your union today. Wishing you many more joyful years together.', now()),
    (c, 'born_again_anniversary', 'Happy Spiritual Birthday {{name}}! {{church_name}} celebrates the day you gave your life to Christ.', now()),
    (c, 'announcement_default', 'Hello from {{church_name}}. Please read the latest announcement in Gathrd.', now());

  insert into public.milestone_messages_log (church_id, member_id, milestone_type, sent_on, whatsapp_status, sent_by, created_at)
  select c, m.id, 'birthday', v_today - (m.idx % 20 + 1), 'sent', v_admin, now() - ((m.idx % 20 + 1) || ' days')::interval
    from mem m where m.age_group = 'adult' and m.idx % 9 = 0 limit 8;

  insert into public.church_alert_settings (church_id, birthday_enabled, birthday_hour) values (c, true, 7);
  insert into public.church_alert_activities (church_id, name, weekday, start_time, alert_1_minutes_before, alert_2_minutes_before, enabled)
  values (c, 'Sunday Service', 0, '08:00', 120, 30, true),
         (c, 'Midweek Bible Study', 3, '18:00', 360, 90, true),
         (c, 'Friday Prayer Meeting', 5, '18:00', 360, 90, true);

  -- ---------------------------------------------------------------------------------
  -- 13. The bell: reminders for the demo logins, and church-wide alerts
  -- ---------------------------------------------------------------------------------
  insert into public.notifications (church_id, member_id, title, body, source_type, source_id, is_read, created_at)
  select c, mm.id, n.title, n.body, n.src, (select id from ros where d >= v_today order by d limit 1), n.is_read, now() - (n.hrs || ' hours')::interval
    from public.members mm
    cross join (values
      ('Your duty in 2 days', 'Sunday Service: Greeters / welcome team', 'duty_reminder_2d', false, 3),
      ('Tomorrow at church', 'Choir Rehearsal (Saturday at 4:00 PM, Music room)', 'event_reminder_1d', false, 20),
      ('Today at church', 'Midweek Prayer & Bible Study (Wednesday at 6:00 PM, Main auditorium)', 'event_reminder_today', true, 70)
    ) n(title, body, src, is_read, hrs)
   where mm.church_id = c and mm.profile_id in (v_pastor, v_admin);

  insert into public.church_notifications (church_id, kind, title, body, url, dedupe_key, created_at)
  values
    (c, 'activity', 'Friday Prayer Meeting today', 'Friday Prayer Meeting holds today at 6:00 PM. Plan to be there.', '/dashboard', 'demo:act1', now() - interval '5 hours'),
    (c, 'birthday', 'Birthday celebrants today', 'Today we celebrate two members. Send them your blessings!', '/dashboard', 'demo:bday1', now() - interval '9 hours'),
    (c, 'activity', 'Midweek Bible Study is almost here', 'Midweek Bible Study starts at 6:00 PM. See you there!', '/dashboard', 'demo:act2', now() - interval '2 days');

  drop table if exists mem, dep, cg, svc, vis, dr, rep, ros, cnt, st;
end
$seed$;
