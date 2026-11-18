-- Row-level security: the role matrix.
--
--   Student          own profile, own selections; the public catalogue (Master's, slots, courses, professors, rounds);
--                    their Master's calendar and announcements for their year; staff of their Master's (director contact).
--   Professor        courses they teach; students enrolled in or requesting those courses (read-only);
--                    the staff of their Master's (course directors); the calendar and announcements of their Master's.
--   Course director  everything in their Master's: students, selections (decides seat requests), rounds,
--   / assistant      calendar, announcements; edits the courses of their Master's.
--   DSI admin        everything: creates Master's, slots, courses and staff; full override.
--
-- Dual-hat directors (role director/assistant with a professor_id) get both the director rights and the professor rights.
-- Students never write selections directly: picking and dropping goes through database functions (next step),
-- which check the round, the seats and the ECTS in one locked transaction.

create schema if not exists private;
grant usage on schema private to anon, authenticated;

-- ───────────────────────── Who am I ─────────────────────────
-- security definer: they read profiles without going through its own policies (no recursion).

create function private.me() returns public.profiles
language sql stable security definer set search_path = '' as $$
  select p.* from public.profiles p where p.auth_id = auth.uid() and p.active
$$;

create function private.my_id() returns text
language sql stable security definer set search_path = '' as $$
  select (private.me()).id
$$;

create function private.my_role() returns public.user_role
language sql stable security definer set search_path = '' as $$
  select (private.me()).role
$$;

create function private.my_programme() returns text
language sql stable security definer set search_path = '' as $$
  select (private.me()).programme_id
$$;

create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((private.me()).role = 'admin', false)
$$;

/** Director or assistant of this Master's. */
create function private.manages(programme text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select m.role in ('director', 'assistant') and m.programme_id = programme from private.me() m), false)
$$;

/** Admin, or director/assistant of the course's Master's. */
create function private.manages_course(course text) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_admin() or exists (
    select 1 from public.courses c where c.id = course and private.manages(c.programme_id)
  )
$$;

/** The signed-in person teaches this course (professors and dual-hat staff). */
create function private.teaches(course text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.courses c
    where c.id = course and c.professor_id is not null and c.professor_id = (private.me()).professor_id
  )
$$;

/**
 * May the signed-in person see this student?
 * Admin; director/assistant of the student's Master's; a professor whose option the student
 * picked or requested; a professor of a mandatory course of the student's Master's and year.
 */
create function private.can_see_student(student text) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_admin()
    or exists (
      select 1 from public.profiles s
      where s.id = student and s.role = 'student' and private.manages(s.programme_id)
    )
    or exists (
      select 1 from public.selections sel
      join public.courses c on c.id = sel.course_id
      where sel.student_id = student and sel.status in ('enrolled', 'pending')
        and c.professor_id = (private.me()).professor_id
    )
    or exists (
      select 1 from public.profiles s
      join public.courses c on c.programme_id = s.programme_id and c.year = s.year and c.group_id is null
      where s.id = student and s.role = 'student'
        and c.professor_id = (private.me()).professor_id
    )
$$;

/** Belongs to this Master's: its students and staff (and professors teaching any of its courses). */
create function private.in_programme(programme text) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.my_programme() = programme
    or exists (select 1 from public.courses c where c.programme_id = programme and c.professor_id = (private.me()).professor_id)
$$;

/** Students see items for everyone (0) or their year; staff see all of their Master's. */
create function private.sees_audience(programme text, audience smallint) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_admin()
    or private.manages(programme)
    or (private.my_role() = 'student' and private.my_programme() = programme and audience in (0, (private.me()).year))
    or (private.my_role() <> 'student' and private.in_programme(programme))
$$;

revoke all on all functions in schema private from public;
grant execute on all functions in schema private to anon, authenticated;

-- ───────────────────────── Turn RLS on everywhere ─────────────────────────
alter table public.school_settings enable row level security;
alter table public.programmes enable row level security;
alter table public.professors enable row level security;
alter table public.profiles enable row level security;
alter table public.option_groups enable row level security;
alter table public.courses enable row level security;
alter table public.rounds enable row level security;
alter table public.selections enable row level security;
alter table public.emails enable row level security;
alter table public.events enable row level security;
alter table public.announcements enable row level security;
alter table public.support_tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.access_requests enable row level security;

-- ───────────────────────── Public catalogue ─────────────────────────
-- Anyone (also signed out: landing page, sign-up, request-access form) can read the study plans.
create policy "catalogue is public" on public.school_settings for select to anon, authenticated using (true);
create policy "catalogue is public" on public.programmes for select to anon, authenticated using (true);
create policy "catalogue is public" on public.professors for select to anon, authenticated using (true);
create policy "catalogue is public" on public.option_groups for select to anon, authenticated using (true);
create policy "catalogue is public" on public.courses for select to anon, authenticated using (true);
create policy "catalogue is public" on public.rounds for select to anon, authenticated using (true);

-- DSI admin: school, Master's, professors, Opção slots and courses.
create policy "admin writes" on public.school_settings for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admin writes" on public.programmes for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admin writes" on public.professors for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admin writes" on public.option_groups for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admin writes" on public.courses for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- Course directors edit the courses of their Master's (description, seats, professor …) but don't create or delete them.
create policy "directors edit their courses" on public.courses for update to authenticated
  using (private.manages(programme_id)) with check (private.manages(programme_id));

-- Rounds: DSI admin and the Master's directors.
create policy "directors run rounds" on public.rounds for all to authenticated
  using ((select private.is_admin()) or private.manages(programme_id))
  with check ((select private.is_admin()) or private.manages(programme_id));

-- ───────────────────────── Profiles ─────────────────────────
create policy "see profiles" on public.profiles for select to authenticated using (
  auth_id = (select auth.uid())
  or (select private.is_admin())
  -- Staff are visible to everyone signed in to the same Master's (director contact, colleagues).
  or (role <> 'student' and active and programme_id is not null and private.in_programme(programme_id))
  -- The DSI team is visible to all staff.
  or (role = 'admin' and (select private.my_role()) <> 'student')
  or (role = 'student' and private.can_see_student(id))
);

create policy "edit own profile" on public.profiles for update to authenticated
  using (auth_id = (select auth.uid())) with check (auth_id = (select auth.uid()));
create policy "directors edit their students" on public.profiles for update to authenticated
  using (role = 'student' and private.manages(programme_id)) with check (role = 'student' and private.manages(programme_id));
create policy "admin manages profiles" on public.profiles for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- Column guard: people may edit their own profile text and photo, nothing that grants access.
create function private.guard_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or private.is_admin() then
    return new;  -- service role, SQL editor, seed, DSI admin
  end if;
  if new.role is distinct from old.role
     or new.username is distinct from old.username
     or new.auth_id is distinct from old.auth_id
     or new.title is distinct from old.title
     or new.active is distinct from old.active
     or new.professor_id is distinct from old.professor_id
     or new.programme_id is distinct from old.programme_id
     or new.invited_at is distinct from old.invited_at
     or new.email is distinct from old.email then
    raise exception 'Only the DSI team can change role, login, title, Master''s or access' using errcode = '42501';
  end if;
  if (new.year is distinct from old.year or new.past_options is distinct from old.past_options)
     and not private.manages(old.programme_id) then
    raise exception 'Only the course director can change a student''s year or past options' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles for each row execute function private.guard_profile();

-- ───────────────────────── Selections ─────────────────────────
create policy "see selections" on public.selections for select to authenticated using (
  student_id = (select private.my_id())
  or private.manages_course(course_id)
  or private.teaches(course_id)
);
-- Directors decide seat requests and can place or remove students; professors only read.
create policy "directors manage selections" on public.selections for all to authenticated
  using (private.manages_course(course_id)) with check (private.manages_course(course_id));

-- ───────────────────────── Mail ─────────────────────────
create policy "read my mail" on public.emails for select to authenticated
  using ((select private.my_id()) = any (to_ids) or (select private.is_admin()));
create policy "staff send mail" on public.emails for insert to authenticated
  with check ((select private.my_role()) in ('admin', 'director', 'assistant'));
create policy "admin manages mail" on public.emails for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- ───────────────────────── Calendar & announcements ─────────────────────────
create policy "see calendar" on public.events for select to authenticated
  using (private.sees_audience(programme_id, audience));
create policy "directors edit calendar" on public.events for all to authenticated
  using ((select private.is_admin()) or private.manages(programme_id))
  with check ((select private.is_admin()) or private.manages(programme_id));

create policy "see announcements" on public.announcements for select to authenticated
  using (private.sees_audience(programme_id, audience));
create policy "directors post announcements" on public.announcements for all to authenticated
  using ((select private.is_admin()) or private.manages(programme_id))
  with check ((select private.is_admin()) or private.manages(programme_id));

-- ───────────────────────── Support ─────────────────────────
create policy "open a ticket" on public.support_tickets for insert to anon, authenticated
  with check (status = 'open' and (user_id is null or user_id = (select private.my_id())));
create policy "see my tickets" on public.support_tickets for select to authenticated
  using (user_id = (select private.my_id()) or (select private.is_admin()));
create policy "admin handles tickets" on public.support_tickets for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "read ticket thread" on public.ticket_messages for select to authenticated using (
  (select private.is_admin())
  or exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = (select private.my_id()))
);
create policy "reply to my ticket" on public.ticket_messages for insert to authenticated with check (
  sender = 'user'
  and exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = (select private.my_id()))
);
create policy "admin answers tickets" on public.ticket_messages for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
-- The first message of a signed-out ticket is written together with it by a function (next step).

-- ───────────────────────── Professor access requests ─────────────────────────
create policy "request access" on public.access_requests for insert to anon, authenticated
  with check (status = 'pending' and user_id is null and decided_at is null);
create policy "admin approves access" on public.access_requests for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
