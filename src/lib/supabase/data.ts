"use client";
// Loads the data the signed-in person may see into the app's DB shape, and writes changes back.
// The rules in logic.ts still run in the browser for instant feedback; the database enforces
// the same rules again (row-level security, seat and round checks), so nobody can bypass them.
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AccessRequest, Announcement, CalendarEvent, Course, DB, Email, OptionGroup, Professor, Programme, Round, Selection, SupportTicket, User,
} from "../types";

type Row = Record<string, unknown>;

/** null → undefined, so the app sees the same shapes as before. */
const clean = <T,>(o: Row): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null)) as T;
const nul = (v: unknown) => (v === undefined ? null : v);

interface Spec<T extends { id: string }> {
  key: "programmes" | "professors" | "users" | "groups" | "courses" | "rounds" | "selections" | "emails" | "events" | "announcements" | "tickets" | "accessRequests";
  table: string;
  to: (x: T) => Row;
  from: (r: Row) => T;
}

const programmes: Spec<Programme> = {
  key: "programmes",
  table: "programmes",
  to: (p) => ({
    id: p.id, department: p.department, name: p.name, short: p.short, degree: p.degree, ects: p.ects, duration: p.duration, regime: p.regime,
    academic_year: nul(p.academicYear), location: nul(p.location), scientific_area: nul(p.scientificArea), contacts: p.contacts ?? [],
    description: nul(p.description), learning_outcomes: p.learningOutcomes ?? [], higher_education: nul(p.higherEducation), careers: p.careers ?? [],
    ...(p.createdAt ? { created_at: p.createdAt } : {}),
  }),
  from: (r) =>
    clean<Programme>({
      id: r.id, department: r.department, name: r.name, short: r.short, degree: r.degree, ects: Number(r.ects), duration: r.duration, regime: r.regime,
      academicYear: r.academic_year, location: r.location, scientificArea: r.scientific_area, contacts: r.contacts, description: r.description,
      learningOutcomes: r.learning_outcomes, higherEducation: r.higher_education, careers: r.careers, createdAt: r.created_at,
    }),
};

const professors: Spec<Professor> = {
  key: "professors",
  table: "professors",
  to: (p) => ({ id: p.id, name: p.name, title: p.title ?? "", email: p.email, area: nul(p.area), office: nul(p.office), photo: nul(p.photo), bio: nul(p.bio) }),
  from: (r) => clean<Professor>({ ...r, title: r.title ?? "" }),
};

const users: Spec<User> = {
  key: "users",
  table: "profiles",
  // The password never goes to the table: logins live in Supabase Auth.
  to: (u) => ({
    id: u.id, username: u.username, name: u.name, email: u.email, role: u.role, photo: nul(u.photo), programme_id: nul(u.programmeId),
    year: nul(u.year), title: nul(u.title), bio: nul(u.bio), about: nul(u.about), aspiration: nul(u.aspiration), bachelor: nul(u.bachelor),
    dob: nul(u.dob || undefined), past_options: u.pastOptions ?? {}, professor_id: nul(u.professorId), active: u.active !== false,
    invited_at: nul(u.invitedAt), ...(u.createdAt ? { created_at: u.createdAt } : {}),
  }),
  from: (r) => {
    const u = clean<User>({
      id: r.id, username: r.username, name: r.name, email: r.email, role: r.role, photo: r.photo, programmeId: r.programme_id, year: r.year,
      title: r.title, bio: r.bio, about: r.about, aspiration: r.aspiration, bachelor: r.bachelor, dob: r.dob, professorId: r.professor_id,
      active: r.active, invitedAt: r.invited_at, createdAt: r.created_at,
    });
    const past = r.past_options as Record<string, string> | null;
    return { ...u, password: "", pastOptions: past && Object.keys(past).length ? past : undefined };
  },
};

const groups: Spec<OptionGroup> = {
  key: "groups",
  table: "option_groups",
  to: (g) => ({ id: g.id, programme_id: g.programmeId, year: g.year, semester: g.semester, name: g.name, ects: g.ects }),
  from: (r) => ({ id: r.id, programmeId: r.programme_id, year: r.year, semester: r.semester, name: r.name, ects: Number(r.ects) }) as OptionGroup,
};

const courses: Spec<Course> = {
  key: "courses",
  table: "courses",
  to: (c) => ({
    id: c.id, programme_id: c.programmeId, code: c.code ?? "", name: c.name, year: c.year, semester: c.semester, area: c.area ?? "", ects: c.ects,
    group_id: nul(c.groupId), capacity: c.capacity ?? 0, requires_approval: !!c.requiresApproval, course_director: nul(c.courseDirector),
    professor_id: nul(c.professorId), request_prompt: nul(c.requestPrompt), description: c.description ?? "", image: nul(c.image), details: c.details ?? {},
  }),
  from: (r) =>
    clean<Course>({
      id: r.id, programmeId: r.programme_id, code: r.code, name: r.name, year: r.year, semester: r.semester, area: r.area, ects: Number(r.ects),
      groupId: r.group_id, capacity: r.capacity, requiresApproval: r.requires_approval, courseDirector: r.course_director, professorId: r.professor_id,
      requestPrompt: r.request_prompt, description: r.description, image: r.image, details: r.details ?? {},
    }),
};

const rounds: Spec<Round> = {
  key: "rounds",
  table: "rounds",
  to: (x) => ({
    id: x.id, programme_id: x.programmeId, year: x.year, semester: nul(x.semester), label: x.label, opens_at: x.opensAt, closes_at: x.closesAt,
    email_sent_at: nul(x.emailSentAt),
  }),
  from: (r) =>
    clean<Round>({
      id: r.id, programmeId: r.programme_id, year: r.year, semester: r.semester, label: r.label, opensAt: r.opens_at, closesAt: r.closes_at,
      emailSentAt: r.email_sent_at,
    }),
};

const selections: Spec<Selection> = {
  key: "selections",
  table: "selections",
  to: (s) => ({
    id: s.id, student_id: s.studentId, course_id: s.courseId, status: s.status, motivation: nul(s.motivation), note: nul(s.note),
    created_at: s.createdAt, decided_at: nul(s.decidedAt),
  }),
  from: (r) =>
    clean<Selection>({
      id: r.id, studentId: r.student_id, courseId: r.course_id, status: r.status, motivation: r.motivation, note: r.note, createdAt: r.created_at,
      decidedAt: r.decided_at,
    }),
};

const emails: Spec<Email> = {
  key: "emails",
  table: "emails",
  to: (m) => ({ id: m.id, to_ids: m.to, to_addresses: m.toAddresses ?? [], subject: m.subject, body: m.body, sent_at: m.sentAt, kind: nul(m.kind) }),
  from: (r) => {
    const addr = r.to_addresses as string[];
    return clean<Email>({ id: r.id, to: r.to_ids, toAddresses: addr?.length ? addr : null, subject: r.subject, body: r.body, sentAt: r.sent_at, kind: r.kind });
  },
};

const events: Spec<CalendarEvent> = {
  key: "events",
  table: "events",
  to: (e) => ({
    id: e.id, programme_id: e.programmeId, date: e.date, end_date: nul(e.endDate || undefined), time: nul(e.time || undefined), title: e.title,
    description: nul(e.description), kind: e.kind, audience: e.audience, location: nul(e.location), created_by: nul(e.createdBy || undefined),
  }),
  from: (r) =>
    clean<CalendarEvent>({
      id: r.id, programmeId: r.programme_id, date: r.date, endDate: r.end_date, time: r.time, title: r.title, description: r.description, kind: r.kind,
      audience: r.audience, location: r.location, createdBy: r.created_by ?? "",
    }),
};

const announcements: Spec<Announcement> = {
  key: "announcements",
  table: "announcements",
  to: (a) => ({
    id: a.id, programme_id: a.programmeId, title: a.title, body: a.body, audience: a.audience, pinned: !!a.pinned, created_at: a.createdAt,
    author_id: nul(a.authorId || undefined),
  }),
  from: (r) =>
    clean<Announcement>({
      id: r.id, programmeId: r.programme_id, title: r.title, body: r.body, audience: r.audience, pinned: r.pinned, createdAt: r.created_at,
      authorId: r.author_id ?? "",
    }),
};

// Ticket messages live in their own table; the ticket row carries everything else.
const tickets: Spec<SupportTicket> = {
  key: "tickets",
  table: "support_tickets",
  to: (t) => ({
    id: t.id, user_id: nul(t.userId), name: t.name, email: t.email, role: nul(t.role), programme_id: nul(t.programmeId), topic: t.topic,
    subject: t.subject, page: nul(t.page), status: t.status, created_at: t.createdAt, updated_at: t.updatedAt,
  }),
  from: (r) =>
    ({
      ...clean<SupportTicket>({
        id: r.id, userId: r.user_id, name: r.name, email: r.email, role: r.role, programmeId: r.programme_id, topic: r.topic, subject: r.subject,
        page: r.page, status: r.status, createdAt: r.created_at, updatedAt: r.updated_at,
      }),
      messages: [],
    }) as SupportTicket,
};

const accessRequests: Spec<AccessRequest> = {
  key: "accessRequests",
  table: "access_requests",
  to: (q) => ({
    id: q.id, name: q.name, email: q.email, programme_id: q.programmeId, course_ids: q.courseIds ?? [], status: q.status, created_at: q.createdAt,
    decided_at: nul(q.decidedAt), user_id: nul(q.userId),
  }),
  from: (r) =>
    clean<AccessRequest>({
      id: r.id, name: r.name, email: r.email, programmeId: r.programme_id, courseIds: r.course_ids ?? [], status: r.status, createdAt: r.created_at,
      decidedAt: r.decided_at, userId: r.user_id,
    }),
};

// Order matters: parents are written before the rows that point at them (and deleted after).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SPECS: Spec<any>[] = [programmes, professors, users, groups, courses, rounds, selections, events, announcements, tickets, accessRequests, emails];

/** A placeholder while no Master's exists yet, so pages that show "the programme" don't break. */
export const NO_PROGRAMME: Programme = { id: "", department: "", name: "No Master's yet", short: "—", degree: "", ects: 0, duration: "", regime: "" };

export const emptyDB = (): DB => ({
  version: 0, school: "Department of Information Systems", programmes: [], programme: NO_PROGRAMME, users: [], rounds: [], groups: [], courses: [],
  selections: [], emails: [], professors: [], events: [], announcements: [], tickets: [], accessRequests: [], hiddenSeats: {},
});

const must = <T,>(res: { data: T | null; error: { message: string } | null }, what: string): T => {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
};

/** Everything the signed-in person (or a signed-out visitor) may see. */
export async function loadDB(sb: SupabaseClient, signedIn: boolean): Promise<DB> {
  const all = (table: string, order?: string) => {
    const q = sb.from(table).select("*").limit(5000);
    return order ? q.order(order, { ascending: false }) : q;
  };
  const [school, progs, profs, grps, crs, rnds, seats] = await Promise.all([
    sb.from("school_settings").select("*").maybeSingle(),
    all("programmes"),
    all("professors"),
    all("option_groups"),
    all("courses"),
    all("rounds"),
    sb.rpc("seat_counts"),
  ]);
  const db = emptyDB();
  const s = must(school, "school") as Row | null;
  if (s) {
    db.school = String(s.name);
    db.schoolContact = (s.contact as string) ?? undefined;
  }
  db.programmes = must(progs, "programmes").map((r: Row) => programmes.from(r)).sort((a: Programme, b: Programme) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
  db.professors = must(profs, "professors").map((r: Row) => professors.from(r));
  db.groups = must(grps, "option_groups").map((r: Row) => groups.from(r));
  db.courses = must(crs, "courses").map((r: Row) => courses.from(r));
  db.rounds = must(rnds, "rounds").map((r: Row) => rounds.from(r));

  if (signedIn) {
    const [usr, sel, mail, ev, ann, tix, msgs, reqs] = await Promise.all([
      all("profiles"),
      all("selections"),
      all("emails", "sent_at").limit(500),
      all("events"),
      all("announcements", "created_at"),
      all("support_tickets", "updated_at"),
      sb.from("ticket_messages").select("*").order("at").limit(5000),
      all("access_requests", "created_at"),
    ]);
    db.users = must(usr, "profiles").map((r: Row) => users.from(r));
    db.selections = must(sel, "selections").map((r: Row) => selections.from(r));
    db.emails = must(mail, "emails").map((r: Row) => emails.from(r));
    db.events = must(ev, "events").map((r: Row) => events.from(r));
    db.announcements = must(ann, "announcements").map((r: Row) => announcements.from(r));
    const byTicket = new Map<string, SupportTicket["messages"]>();
    for (const m of must(msgs, "ticket_messages") as Row[]) {
      const list = byTicket.get(String(m.ticket_id)) ?? [];
      list.push({ from: m.sender as "user" | "team", authorName: String(m.author_name), body: String(m.body), at: String(m.at) });
      byTicket.set(String(m.ticket_id), list);
    }
    db.tickets = must(tix, "support_tickets").map((r: Row) => ({ ...tickets.from(r), messages: byTicket.get(String(r.id)) ?? [] }));
    db.accessRequests = must(reqs, "access_requests").map((r: Row) => accessRequests.from(r));
  }

  // Seats taken by people whose choices this person can't see (e.g. other students).
  const visible = new Map<string, { enrolled: number; pending: number }>();
  for (const x of db.selections) {
    const v = visible.get(x.courseId) ?? { enrolled: 0, pending: 0 };
    if (x.status === "enrolled") v.enrolled++;
    if (x.status === "pending") v.pending++;
    visible.set(x.courseId, v);
  }
  db.hiddenSeats = {};
  for (const r of (must(seats, "seat counts") ?? []) as Row[]) {
    const v = visible.get(String(r.course_id)) ?? { enrolled: 0, pending: 0 };
    db.hiddenSeats[String(r.course_id)] = { enrolled: Math.max(0, Number(r.enrolled) - v.enrolled), pending: Math.max(0, Number(r.pending) - v.pending) };
  }
  db.programme = db.programmes[0] ?? NO_PROGRAMME;
  return db;
}

/** A login the server must create or reset after a profile is saved (DSI portal: give access, reset & resend). */
export type LoginJob = { action: "create" | "reset"; profileId: string; password: string; name: string };

type Op = { table: string; kind: "insert" | "update" | "delete"; rows: Row[]; quiet?: boolean };

/** What changed between two versions of the data, as database writes. */
export function diff(prev: DB, next: DB): { ops: Op[]; logins: LoginJob[] } {
  const ups: Op[] = [];
  const dels: Op[] = [];
  const logins: LoginJob[] = [];
  for (const spec of SPECS) {
    const a = (prev[spec.key] ?? []) as { id: string }[];
    const b = (next[spec.key] ?? []) as { id: string }[];
    if (a === b) continue;
    const before = new Map(a.map((x) => [x.id, x]));
    const after = new Map(b.map((x) => [x.id, x]));
    const ins: Row[] = [];
    const upd: Row[] = [];
    for (const [id, x] of after) {
      const old = before.get(id);
      if (!old) ins.push(spec.to(x));
      else if (old !== x && JSON.stringify(spec.to(old)) !== JSON.stringify(spec.to(x))) upd.push(spec.to(x));
      if (spec.key === "users") {
        const u = x as User;
        if (u.password && u.password !== (old as User | undefined)?.password)
          logins.push({ action: old ? "reset" : "create", profileId: u.id, password: u.password, name: u.name });
      }
    }
    const gone = [...before.keys()].filter((id) => !after.has(id)).map((id) => ({ id }));
    // Mail is a side effect: a notification that can't be written must not undo the action itself.
    const quiet = spec.key === "emails";
    if (ins.length) ups.push({ table: spec.table, kind: "insert", rows: ins, quiet });
    if (upd.length) ups.push({ table: spec.table, kind: "update", rows: upd, quiet });
    if (gone.length) dels.unshift({ table: spec.table, kind: "delete", rows: gone, quiet });

    if (spec.key === "tickets") {
      const msgs: Row[] = [];
      for (const [id, x] of after) {
        const t = x as SupportTicket;
        const had = (before.get(id) as SupportTicket | undefined)?.messages.length ?? 0;
        for (const m of t.messages.slice(had)) msgs.push({ ticket_id: id, sender: m.from, author_name: m.authorName, body: m.body, at: m.at });
      }
      if (msgs.length) ups.push({ table: "ticket_messages", kind: "insert", rows: msgs });
    }
  }
  if (prev.school !== next.school || prev.schoolContact !== next.schoolContact)
    ups.push({ table: "school_settings", kind: "update", rows: [{ id: true, name: next.school, contact: nul(next.schoolContact) }] });
  return { ops: [...ups, ...dels], logins };
}

/** Writes the changes. Throws with the database's message (e.g. "Corporate Strategy is full.") on the first failure. */
export async function save(sb: SupabaseClient, ops: Op[]) {
  for (const op of ops) {
    try {
      if (op.kind === "insert") {
        const { error } = await sb.from(op.table).insert(op.rows);
        if (error) throw error;
      } else if (op.kind === "delete") {
        const { error, count } = await sb.from(op.table).delete({ count: "exact" }).in("id", op.rows.map((r) => r.id as string));
        if (error) throw error;
        if (count === 0) throw new Error("You don't have permission to delete this.");
      } else {
        for (const row of op.rows) {
          const { id, ...rest } = row;
          const { error, count } = await sb.from(op.table).update(rest, { count: "exact" }).eq("id", id as string);
          if (error) throw error;
          if (count === 0) throw new Error("You don't have permission to change this.");
        }
      }
    } catch (e) {
      if (op.quiet) continue;
      throw new Error(friendly((e as { message?: string }).message ?? String(e)));
    }
  }
}

/** Database errors in plain words. */
export function friendly(message: string): string {
  if (/row-level security|permission denied|42501/i.test(message)) return "You don't have permission to do that.";
  if (/duplicate key.*username/i.test(message)) return "That username is already taken.";
  if (/duplicate key.*email/i.test(message)) return "That email is already registered.";
  if (/one_director_per_programme/i.test(message)) return "This Master's already has a course director.";
  if (/duplicate key.*student_id/i.test(message)) return "You have already selected this course.";
  if (/violates foreign key.*option_groups|courses_group_id_fkey/i.test(message)) return "Move or delete this option's courses first.";
  if (/Failed to fetch|NetworkError/i.test(message)) return "No connection to the database. Check your internet and try again.";
  return message;
}
