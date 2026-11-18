-- Step 2: what the app needs to run on Supabase.
--   • sign in with username OR email
--   • student self sign-up creates the profile (always as a student)
--   • seat counts for everyone, without exposing other students' choices
--   • picking / dropping an option is checked here, in one locked transaction (round open, seats, ECTS)
--   • support tickets and system mail from signed-in people
--   • live updates (Realtime)

-- ───────────────────────── Sign in with username or email ─────────────────────────
-- Returns the email to sign in with. An email is returned as typed; a username is looked up.
create or replace function public.login_email(login text) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when position('@' in login) > 0 then lower(trim(login))
    else (select lower(p.email) from public.profiles p where lower(p.username) = lower(trim(login)) and p.active limit 1)
  end
$$;
revoke all on function public.login_email(text) from public;
grant execute on function public.login_email(text) to anon, authenticated;

-- ───────────────────────── Student sign-up ─────────────────────────
-- supabase.auth.signUp({ options: { data: { signup: 'student', … } } }) → a student profile.
-- Accounts created by the DSI team (server, secret key) carry no 'signup' flag and are linked by the server.
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}');
  uname text := lower(trim(m ->> 'username'));
begin
  if m ->> 'signup' is distinct from 'student' then
    return new;
  end if;
  if uname !~ '^(pg|a)[0-9]{4,6}$' then
    raise exception 'Student number should look like pg55000.';
  end if;
  if exists (select 1 from public.profiles where lower(username) = uname) then
    raise exception '% already has an account — sign in instead.', uname;
  end if;
  if not exists (select 1 from public.programmes where id = m ->> 'programme_id') then
    raise exception 'Choose your programme.';
  end if;
  insert into public.profiles (auth_id, username, name, email, role, programme_id, year, bio, about, aspiration, bachelor, dob)
  values (
    new.id, uname, trim(m ->> 'name'), lower(new.email), 'student', m ->> 'programme_id',
    (m ->> 'year')::smallint, nullif(m ->> 'bio', ''), nullif(m ->> 'about', ''), nullif(m ->> 'aspiration', ''),
    m -> 'bachelor', nullif(m ->> 'dob', '')::date
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- ───────────────────────── Seat counts ─────────────────────────
-- Everyone sees how full a course is; nobody sees who took the seats unless the rules allow it.
create or replace function public.seat_counts()
returns table (course_id text, enrolled integer, pending integer)
language sql stable security definer set search_path = '' as $$
  select s.course_id,
         count(*) filter (where s.status = 'enrolled')::integer,
         count(*) filter (where s.status = 'pending')::integer
  from public.selections s
  group by s.course_id
$$;
revoke all on function public.seat_counts() from public;
grant execute on function public.seat_counts() to anon, authenticated;

-- ───────────────────────── Picking and dropping options ─────────────────────────
create policy "students pick options" on public.selections for insert to authenticated
  with check (student_id = (select private.my_id()) and (select private.my_role()) = 'student');
create policy "students drop options" on public.selections for delete to authenticated
  using (student_id = (select private.my_id()) and status <> 'rejected');

/** The round an Opção slot is chosen in: its semester's round, else the whole-year round (annual slots: else S1). */
create or replace function private.round_for_group(gid text) returns public.rounds
language sql stable security definer set search_path = '' as $$
  select r.* from public.rounds r
  join public.option_groups g on g.id = gid
  where r.programme_id = g.programme_id and r.year = g.year
    and (r.semester = g.semester or r.semester is null or (g.semester = 'A' and r.semester = 'S1'))
  order by case when r.semester = g.semester then 0 when r.semester is null then 1 else 2 end, r.opens_at
  limit 1
$$;

create or replace function private.check_selection() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  c public.courses;
  g public.option_groups;
  s public.profiles;
  r public.rounds;
  taken integer;
  used numeric;
  student boolean := coalesce(private.my_role() = 'student', false);
begin
  if tg_op = 'DELETE' then
    if student then
      select * into c from public.courses where id = old.course_id;
      r := private.round_for_group(c.group_id);
      if r.id is null or now() < r.opens_at or now() >= r.closes_at then
        raise exception 'Changes are only possible while the round is open.';
      end if;
    end if;
    return old;
  end if;

  -- Lock the course: two people taking the last seat at the same moment are served one after the other.
  select * into c from public.courses where id = new.course_id for update;

  if student then
    select * into s from public.profiles where id = new.student_id;
    if c.group_id is null then
      raise exception '% is a mandatory course — there''s nothing to choose.', c.name;
    end if;
    select * into g from public.option_groups where id = c.group_id;
    if s.programme_id is distinct from c.programme_id or s.year is distinct from c.year then
      raise exception '% is not in your study plan (Year %).', c.name, s.year;
    end if;
    r := private.round_for_group(g.id);
    if r.id is null or now() < r.opens_at or now() >= r.closes_at then
      raise exception 'The selection for % is not open.', g.name;
    end if;
    new.status := case when c.requires_approval then 'pending' else 'enrolled' end;
    new.note := null;
    new.created_at := now();
    new.decided_at := case when new.status = 'enrolled' then now() end;
    select coalesce(sum(cc.ects), 0) into used
      from public.selections x join public.courses cc on cc.id = x.course_id
      where x.student_id = new.student_id and x.status in ('enrolled', 'pending') and cc.group_id = g.id;
    if used + c.ects > g.ects then
      raise exception '% is worth % ECTS and you''ve already chosen %. Drop that choice first to swap.', g.name, g.ects, used;
    end if;
  end if;

  -- Seats: only confirmed places count, for everyone (a director accepting a request too).
  if new.status = 'enrolled' and c.group_id is not null
     and (tg_op = 'INSERT' or old.status is distinct from 'enrolled') then
    select count(*) into taken from public.selections
      where course_id = new.course_id and status = 'enrolled' and id <> new.id;
    if taken >= c.capacity then
      raise exception '% is full.', c.name;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists selections_check on public.selections;
create trigger selections_check before insert or update or delete on public.selections
  for each row execute function private.check_selection();

-- ───────────────────────── Profiles ─────────────────────────
-- Students may correct their own year (the app blocks it while they hold choices of that year).
create or replace function private.guard_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or private.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.username is distinct from old.username
     or new.auth_id is distinct from old.auth_id
     or new.title is distinct from old.title
     or new.active is distinct from old.active
     or new.professor_id is distinct from old.professor_id
     or new.programme_id is distinct from old.programme_id
     or new.invited_at is distinct from old.invited_at
     or lower(new.email) is distinct from lower(old.email) then
    raise exception 'Only the DSI team can change role, login, email, title, Master''s or access.' using errcode = '42501';
  end if;
  if new.past_options is distinct from old.past_options and not private.manages(old.programme_id) then
    raise exception 'Only the course director can change past options.' using errcode = '42501';
  end if;
  if new.year is distinct from old.year and not (private.manages(old.programme_id) or old.auth_id = auth.uid()) then
    raise exception 'Only the course director can change a student''s year.' using errcode = '42501';
  end if;
  return new;
end $$;

-- ───────────────────────── Mail ─────────────────────────
-- The app writes notifications (seat confirmed, request decided, round open …) as the person acting.
-- Readers still only see their own inbox. Real email sending moves to the server in a later step.
drop policy if exists "staff send mail" on public.emails;
create policy "signed-in people send notifications" on public.emails for insert to authenticated with check (true);

-- ───────────────────────── Support ─────────────────────────
create or replace function private.can_post_to_ticket(tid text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.support_tickets t
    where t.id = tid
      and (t.user_id = private.my_id()
           -- a signed-out visitor writes the first message right after opening the ticket
           or (t.user_id is null and t.created_at > now() - interval '10 minutes'))
  )
$$;
grant execute on function private.can_post_to_ticket(text) to anon, authenticated;

drop policy if exists "reply to my ticket" on public.ticket_messages;
create policy "reply to my ticket" on public.ticket_messages for insert to anon, authenticated
  with check (sender = 'user' and private.can_post_to_ticket(ticket_id));
create policy "update my ticket" on public.support_tickets for update to authenticated
  using (user_id = (select private.my_id())) with check (user_id = (select private.my_id()));

-- ───────────────────────── Live updates ─────────────────────────
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['programmes','professors','profiles','option_groups','courses','rounds','selections',
                             'emails','events','announcements','support_tickets','ticket_messages','access_requests']
    loop
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;

-- Opening the site with no data yet: a default school row the portal can rename.
insert into public.school_settings (name, contact)
select 'Department of Information Systems', null
where not exists (select 1 from public.school_settings);
