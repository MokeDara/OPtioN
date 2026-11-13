# OPtioN!

Optional course selection without the email back-and-forth.

Students sign in during a selection window, see every optional course with **live seat counts**, and either
**take a seat** (first come, first served) or **request one** from the course director. Every confirmation,
acceptance and rejection is sent to the student's OPtioN! inbox.

## Run it

You need [Node.js 20+](https://nodejs.org).

```bash
cd ~/Desktop/OPtioN
npm install
npm run dev
```

Open http://localhost:3000.

**Three entry points** (demo password `option` for all):

| Link | Who | Demo username |
|---|---|---|
| `/login` | Students (new students: `/signup`) | `pg50001` (Year 2), `pg50101` (Year 1) |
| `/staff` | Course director & assistants | `director`, `assistant` |
| `/portal` | Department: staff access, professors, courses, sent mail | `admin` |

Staff can't sign up themselves: the portal creates their account and emails the link, username and a temporary password
(for now the email is logged under **Sent mail**, with copy / open-in-email-app buttons).

Tip: sign in as a student in one tab and as the director in another — seats and decisions update live across tabs.
Use the ↺ button on the director dashboard to reset the demo data.

## How it works

- **Study plan.** Data follows the MEGSI study plan (2026/27): Year 1 has mandatory courses plus **Opção 1** (S1) and
  **Opção 2** (S2), one 5-ECTS option each; Year 2 has **Opção 3** (Dissertation or Project Work, 45 ECTS) plus mandatory courses.
  Course codes other than Corporate Strategy (14724) are placeholders.
- **Year levels.** Every student has a level (1st or 2nd year) and only sees and picks their own year's options.
  Year 2 students' Opção 1 and 2 from last year are kept as history. In the demo, the Year 1 round has closed and the Year 2 round is open.
- **Profiles.** Students and directors sign up with a profile: photo, full name, level, short bio, what they want to become,
  about me, bachelor's degree and (optional) date of birth. Click your avatar in the header to view or edit it.
- **Course images.** Every option has a photo (Unsplash); directors can upload or link a different one.
- **Course sheet.** Click any course name to open its full description in a pop-up (general info, contact hours,
  objectives, learning outcomes, program, bibliography, teaching and assessment methods). Directors fill these in under Courses → Edit.
- **Opening email.** When a round opens, every student automatically gets a "portal is open" email (shown in the bell inbox for now).
- **First come, first served.** "Take seat" confirms instantly if a seat is left.
- **Director-acceptance courses.** Students send a request (with an optional motivation). A pending request does
  **not** hold a seat; the director can only accept while a seat is free.
- **One choice per Opção.** Students can't go over an Opção's ECTS, can't take the same course in two slots, and can drop or swap while the round is open.
- **Professors.** The department's professors live in the portal; every course has a professor, and directors can email them
  the current student list in one click (Professors page or the ✉ button on a course).
- **Calendar & news.** Directors and assistants add dates (deadlines, exams, events, classes) and post announcements
  (optionally emailed) for everyone, Year 1 or Year 2. Students see only theirs; round open/close dates appear automatically.
- **Director dashboard.** Approval queue (with student profiles), course editor by Opção (seats, ECTS, image, full course sheet),
  round dates, and downloads: the **general list** (ID, name, Opção 1, Opção 2, Opção 3) and a **student list per course**.
  Downloads are CSV files that open in Excel.

## Code map

```
src/lib/types.ts    data model
src/lib/logic.ts    all selection rules (pure functions — tested)
src/lib/seed.ts     demo data
src/lib/store.tsx   demo data layer (localStorage + live sync across tabs)
src/components/ui.tsx  shared UI (header, inbox, seat meter, badges…)
src/components/course-detail.tsx  course pop-up
src/components/profile.tsx  avatar, photo upload, profile form & card
src/components/cover-flow.tsx  home-page 3D carousel
src/app/signup, src/app/profile  sign-up and profile pages
src/app/            pages: / , /login , /student , /director
```

## Next step: Supabase

Only `store.tsx` needs replacing. The plan:
1. Tables `profiles`, `rounds`, `courses`, `selections`, `emails` mirroring `types.ts`.
2. Seat-taking as a Postgres function (`pick_course`) that locks the course row, so two students can't take the last seat at once.
3. Supabase Auth for logins, row-level security so students only see their own selections.
4. Supabase Realtime on `selections` for live seat counts.
5. Real emails via a Supabase Edge Function (e.g. Resend) when a round opens and when a request is decided.
