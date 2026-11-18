-- OPtioN! schema — one table per collection of the demo DB (src/lib/types.ts).
-- IDs stay as text so the seed ids (u_demo, megsi, c8, g1 …) carry over unchanged.
-- Signed-in people are linked to a profile through profiles.auth_id = auth.users.id.

create extension if not exists pgcrypto with schema extensions;

-- ───────────────────────── Types ─────────────────────────
create type public.user_role as enum ('student', 'director', 'assistant', 'professor', 'admin');
create type public.selection_status as enum ('enrolled', 'pending', 'rejected');
create type public.access_request_status as enum ('pending', 'approved', 'declined');
create type public.ticket_status as enum ('open', 'in_progress', 'resolved');
create type public.ticket_topic as enum ('access', 'selection', 'technical', 'courses', 'other');
create type public.event_kind as enum ('deadline', 'exam', 'event', 'class');
create type public.email_kind as enum ('invite', 'list', 'announcement', 'system', 'support');

-- ───────────────────────── School ─────────────────────────
-- Single row: the department running the site.
create table public.school_settings (
  id boolean primary key default true check (id),
  name text not null,
  contact text
);

create table public.programmes (
  id text primary key,
  department text not null,
  name text not null,
  short text not null,
  degree text not null,
  ects numeric(5,1) not null,
  duration text not null,
  regime text not null,
  academic_year text,
  location text,
  scientific_area text,
  contacts jsonb not null default '[]',          -- [{role, name, email?, phone?}]
  description text,
  learning_outcomes text[] not null default '{}',
  higher_education text,
  careers text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- The people who teach. Not a login: a staff profile points here through profiles.professor_id.
create table public.professors (
  id text primary key,
  name text not null,
  title text not null default '',
  email text not null,
  area text,
  office text,
  photo text,
  bio text
);

-- ───────────────────────── People ─────────────────────────
create table public.profiles (
  id text primary key default ('u_' || replace(gen_random_uuid()::text, '-', '')),
  auth_id uuid unique references auth.users (id) on delete set null,
  username text not null unique,                 -- student number (pg55000) or staff login
  name text not null,
  email text not null,
  role public.user_role not null,
  photo text,
  programme_id text references public.programmes (id) on delete set null,  -- unset for the DSI team
  year smallint check (year in (1, 2)),          -- students
  title text,                                    -- staff, set by the DSI team only
  bio text,
  about text,
  aspiration text,
  bachelor jsonb,                                -- {degree, institution?, graduated?}
  dob date,
  past_options jsonb not null default '{}',      -- {groupId: courseId} taken in earlier years
  professor_id text references public.professors (id) on delete set null,  -- staff who also teach
  active boolean not null default true,
  invited_at timestamptz,
  created_at timestamptz not null default now(),
  check (role <> 'student' or (programme_id is not null and year is not null))
);
create index on public.profiles (programme_id, role);
create index on public.profiles (professor_id);
create unique index profiles_email_lower on public.profiles (lower(email));
-- One course director per Master's.
create unique index one_director_per_programme on public.profiles (programme_id) where role = 'director' and active;

-- ───────────────────────── Study plan ─────────────────────────
-- An Opção slot: students pick `ects` worth of courses from it. Any number per semester.
create table public.option_groups (
  id text primary key default ('g_' || replace(gen_random_uuid()::text, '-', '')),
  programme_id text not null references public.programmes (id) on delete cascade,
  year smallint not null check (year in (1, 2)),
  semester text not null check (semester in ('S1', 'S2', 'A')),
  name text not null,
  ects numeric(5,1) not null check (ects > 0)
);
create index on public.option_groups (programme_id, year, semester);

create table public.courses (
  id text primary key default ('c_' || replace(gen_random_uuid()::text, '-', '')),
  programme_id text not null references public.programmes (id) on delete cascade,
  code text not null default '',
  name text not null,
  year smallint not null check (year in (1, 2)),
  semester text not null check (semester in ('S1', 'S2', 'A')),
  area text not null default '',
  ects numeric(5,1) not null,
  group_id text references public.option_groups (id) on delete restrict,  -- unset = mandatory
  capacity integer not null default 0 check (capacity >= 0),
  requires_approval boolean not null default false,
  course_director text,
  professor_id text references public.professors (id) on delete set null,
  request_prompt text,
  description text not null default '',
  image text,
  details jsonb not null default '{}'
);
create index on public.courses (programme_id, year, semester);
create index on public.courses (group_id);
create index on public.courses (professor_id);

-- An option's course follows its slot's year and semester.
create function public.course_follows_slot() returns trigger
language plpgsql set search_path = '' as $$
declare g public.option_groups;
begin
  if new.group_id is not null then
    select * into g from public.option_groups where id = new.group_id;
    if g.programme_id <> new.programme_id then
      raise exception 'Course % is in a different Master''s than its Opção', new.name;
    end if;
    new.year := g.year;
    new.semester := g.semester;
  end if;
  return new;
end $$;
create trigger courses_follow_slot before insert or update of group_id, year, semester, programme_id
  on public.courses for each row execute function public.course_follows_slot();

-- Selection rounds. semester set = only that semester's slots; unset = the whole year.
create table public.rounds (
  id text primary key default ('r_' || replace(gen_random_uuid()::text, '-', '')),
  programme_id text not null references public.programmes (id) on delete cascade,
  year smallint not null check (year in (1, 2)),
  semester text check (semester in ('S1', 'S2')),
  label text not null,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  email_sent_at timestamptz,
  check (closes_at > opens_at)
);
create index on public.rounds (programme_id, year);

create table public.selections (
  id text primary key default ('s_' || replace(gen_random_uuid()::text, '-', '')),
  student_id text not null references public.profiles (id) on delete cascade,
  course_id text not null references public.courses (id) on delete cascade,
  status public.selection_status not null,
  motivation text,
  note text,                                     -- director's note on the decision
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (student_id, course_id)
);
create index on public.selections (course_id, status);

-- ───────────────────────── Communication ─────────────────────────
create table public.emails (
  id text primary key default ('m_' || replace(gen_random_uuid()::text, '-', '')),
  to_ids text[] not null default '{}',           -- profile ids (shown in their OPtioN! inbox)
  to_addresses text[] not null default '{}',     -- external recipients
  subject text not null,
  body text not null,
  sent_at timestamptz not null default now(),
  kind public.email_kind
);
create index on public.emails using gin (to_ids);

create table public.events (
  id text primary key default ('e_' || replace(gen_random_uuid()::text, '-', '')),
  programme_id text not null references public.programmes (id) on delete cascade,
  date date not null,
  end_date date,
  time text,
  title text not null,
  description text,
  kind public.event_kind not null,
  audience smallint not null default 0 check (audience in (0, 1, 2)),  -- 0 = everyone
  location text,
  created_by text references public.profiles (id) on delete set null
);
create index on public.events (programme_id, date);

create table public.announcements (
  id text primary key default ('a_' || replace(gen_random_uuid()::text, '-', '')),
  programme_id text not null references public.programmes (id) on delete cascade,
  title text not null,
  body text not null,
  audience smallint not null default 0 check (audience in (0, 1, 2)),
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  author_id text references public.profiles (id) on delete set null
);
create index on public.announcements (programme_id, created_at desc);

create table public.support_tickets (
  id text primary key default ('t_' || replace(gen_random_uuid()::text, '-', '')),
  user_id text references public.profiles (id) on delete set null,  -- set when signed in
  name text not null,
  email text not null,
  role public.user_role,
  programme_id text references public.programmes (id) on delete set null,
  topic public.ticket_topic not null,
  subject text not null,
  page text,
  status public.ticket_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ticket_messages (
  id bigint generated always as identity primary key,
  ticket_id text not null references public.support_tickets (id) on delete cascade,
  sender text not null check (sender in ('user', 'team')),
  author_name text not null,
  body text not null,
  at timestamptz not null default now()
);
create index on public.ticket_messages (ticket_id, at);

-- A professor asking for access from the staff sign-in page. The DSI team approves it.
create table public.access_requests (
  id text primary key default ('q_' || replace(gen_random_uuid()::text, '-', '')),
  name text not null,
  email text not null,
  programme_id text not null references public.programmes (id) on delete cascade,
  course_ids text[] not null default '{}',
  status public.access_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  user_id text references public.profiles (id) on delete set null
);
