# Supabase — step 1: database, sign-in and permissions

The app still runs on the local demo data. These files create the shared database it will move to.

| File | What it does |
|---|---|
| `migrations/20261118000000_schema.sql` | Tables: Master's, professors, profiles, Opção slots, courses, rounds, selections, mail, calendar, announcements, support, access requests |
| `migrations/20261118000100_rls.sql` | Row-level security: the role matrix (student / professor / course director / DSI admin) |
| `migrations/20261118000200_app.sql` | Sign-in with username or email, student sign-up, seat counts, seat/round/ECTS checks, live updates |
| `catalogue.sql` | The department, the 5 Master's, their Opção slots and 219 courses. No people |
| `src/lib/supabase/client.ts` | Supabase client for browser components |
| `src/lib/supabase/server.ts` | Supabase client for server components, route handlers and server actions |
| `src/middleware.ts` | Keeps the sign-in cookie fresh on every request |

## Load it into your project

In the Supabase dashboard → **SQL Editor** → New query, paste and run, in this order:

1. `migrations/20261118000000_schema.sql`
2. `migrations/20261118000100_rls.sql`
3. `migrations/20261118000200_app.sql`
4. `catalogue.sql` (optional: the existing study plans, so you don't type them in)

Then create the first DSI admin by hand (Authentication → Add user, then insert a `profiles` row with role `admin` and `auth_id` = that user's id).
Everyone else comes in through the app: students sign up, staff get access from the portal.

## What each role can read and change

| | Student | Professor | Course director / assistant | DSI admin |
|---|---|---|---|---|
| Master's, Opção slots, courses, professors, rounds | read (also signed out) | read | read; edit their courses; run their rounds | everything |
| Students | themselves | students enrolled in or requesting their courses (all of that year for a mandatory course) | all of their Master's | all |
| Staff | their Master's staff | their Master's staff, DSI team | their Master's staff, DSI team | all |
| Selections | their own (read) | their courses (read only) | decide, add, remove in their Master's | all |
| Calendar, announcements | their Master's, their year | their Master's | read and write in their Master's | all |
| Mail | their inbox | their inbox | their inbox; send | all |
| Access requests | — | can send one (signed out) | — | approve / decline |

Locked columns: only the DSI team can change a profile's role, login, email, title, Master's, linked professor or active flag.
Course directors can change a student's year.

Students don't write selections directly. Choosing and dropping options moves into database functions in step 2, which check the round, the seats and the ECTS inside one locked transaction.
