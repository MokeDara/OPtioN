// Pure selection rules. No React, no storage — so they can be tested on their own
// and later moved to Supabase (database functions / RLS) without changing the UI.
import type { Announcement, CalendarEvent, Course, DB, Email, OptionGroup, Professor, Programme, Role, Round, RoundState, Selection, SupportTicket, TicketStatus, TicketTopic, User, Year } from "./types";
import { STAFF_ROLES } from "./types";

export type Result = { ok: true; db: DB; message?: string } | { ok: false; error: string };

let counter = 0;
export const uid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function roundState(round: Round, now: Date): RoundState {
  const t = now.getTime();
  if (t < new Date(round.opensAt).getTime()) return "upcoming";
  if (t >= new Date(round.closesAt).getTime()) return "closed";
  return "open";
}

export function roundForYear(db: DB, year: Year, programmeId?: string): Round | undefined {
  return db.rounds.find((r) => r.year === year && (!programmeId || r.programmeId === programmeId));
}

// ───────────────────────── programmes (School of Engineering) ─────────────────────────

/** A view of the data limited to one programme: its slots, courses, rounds, students, events and news.
 *  Staff, the School team, professors and emails stay visible. Reads only — write with the full data. */
export function scope(db: DB, programmeId?: string): DB {
  const programme = db.programmes.find((p) => p.id === programmeId);
  if (!programme) return { ...db, programme: db.programmes[0] };
  const courseIds = new Set(db.courses.filter((c) => c.programmeId === programmeId).map((c) => c.id));
  return {
    ...db,
    programme,
    groups: db.groups.filter((g) => g.programmeId === programmeId),
    courses: db.courses.filter((c) => courseIds.has(c.id)),
    rounds: db.rounds.filter((r) => r.programmeId === programmeId),
    users: db.users.filter((u) => u.role !== "student" || u.programmeId === programmeId),
    selections: db.selections.filter((x) => courseIds.has(x.courseId)),
    events: db.events.filter((e) => e.programmeId === programmeId),
    announcements: db.announcements.filter((a) => a.programmeId === programmeId),
  };
}

export type NewProgramme = Omit<Programme, "id" | "createdAt">;

/** The programme's active course director (each Master's has exactly one). */
export function directorOf(db: DB, programmeId?: string): User | undefined {
  return db.users.find((u) => u.role === "director" && u.programmeId === programmeId && u.active !== false);
}

function oneDirector(db: DB, programmeId: string | undefined, exceptUserId?: string): string | null {
  const d = directorOf(db, programmeId);
  if (!d || d.id === exceptUserId) return null;
  const p = db.programmes.find((x) => x.id === programmeId);
  return `${p?.short ?? "This Master's"} already has a course director (${d.name}). Disable them or move them first — add others as assistants.`;
}

export function createProgramme(db: DB, input: NewProgramme, now: Date): Result & { programmeId?: string } {
  if (!input.name.trim() || !input.short.trim()) return { ok: false, error: "Enter the programme's name and short name (e.g. MEGSI)." };
  if (!input.department.trim()) return { ok: false, error: "Which department runs it?" };
  if (db.programmes.some((p) => p.short.toLowerCase() === input.short.trim().toLowerCase())) return { ok: false, error: `${input.short} already exists.` };
  const id = input.short.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + uid("").slice(-4);
  const programme: Programme = { ...input, id, name: input.name.trim(), short: input.short.trim().toUpperCase(), department: input.department.trim(), createdAt: now.toISOString() };
  const d = 86_400_000;
  const t = now.getTime();
  const rounds: Round[] = ([1, 2] as Year[]).map((year) => ({
    id: uid("r"),
    programmeId: id,
    year,
    label: `Year ${year} option selection`,
    opensAt: new Date(t + (30 + (year - 1) * 15) * d).toISOString(),
    closesAt: new Date(t + (44 + (year - 1) * 15) * d).toISOString(),
  }));
  return { ok: true, db: { ...db, programmes: [...db.programmes, programme], rounds: [...db.rounds, ...rounds] }, message: `${programme.short} created. Now add courses and assign a course director.`, programmeId: id };
}

export function updateProgramme(db: DB, p: Programme): Result {
  if (!p.name.trim() || !p.short.trim() || !p.department.trim()) return { ok: false, error: "Name, short name and department are required." };
  return { ok: true, db: { ...db, programmes: db.programmes.map((x) => (x.id === p.id ? p : x)) }, message: `Saved ${p.short}.` };
}

export function assignStaff(db: DB, userId: string, programmeId: string): Result {
  const u = db.users.find((x) => x.id === userId);
  const p = db.programmes.find((x) => x.id === programmeId);
  if (!u || !STAFF_ROLES.includes(u.role)) return { ok: false, error: "Only directors and assistants are assigned to programmes." };
  if (!p) return { ok: false, error: "Programme not found." };
  if (u.role === "director" && u.active !== false) {
    const clash = oneDirector(db, programmeId, u.id);
    if (clash) return { ok: false, error: clash };
  }
  return { ok: true, db: { ...db, users: db.users.map((x) => (x.id === userId ? { ...x, programmeId } : x)) }, message: `${u.name} now manages ${p.short}.` };
}

/** Switch a course between mandatory and optional. Optional courses go into an Opção slot of the same year
 *  and semester — one is created if the programme doesn't have it yet. */
export function setCourseType(db: DB, courseId: string, optional: boolean): Result {
  const c = db.courses.find((x) => x.id === courseId);
  if (!c) return { ok: false, error: "Course not found." };
  if (!optional) {
    if (!c.groupId) return { ok: false, error: `${c.name} is already mandatory.` };
    if (db.selections.some((s) => s.courseId === courseId && s.status !== "rejected"))
      return { ok: false, error: `Students have chosen ${c.name}. It can't become mandatory until they're moved.` };
    const next = { ...c, groupId: undefined, capacity: 0, requiresApproval: false };
    return { ok: true, db: { ...db, courses: db.courses.map((x) => (x.id === courseId ? next : x)) }, message: `${c.name} is now mandatory.` };
  }
  if (c.groupId) return { ok: false, error: `${c.name} is already optional.` };
  let groups = db.groups;
  let g = groups.find((x) => x.programmeId === c.programmeId && x.year === c.year && x.semester === c.semester);
  let note = "";
  if (!g) {
    const n = groups.filter((x) => x.programmeId === c.programmeId).length + 1;
    g = { id: uid("g"), programmeId: c.programmeId, year: c.year, semester: c.semester, name: `Opção ${n}`, ects: c.ects };
    groups = [...groups, g];
    note = ` A new ${g.name} slot (Year ${c.year}, ${c.semester}) was created.`;
  }
  if (c.ects > g.ects) return { ok: false, error: `${g.name} is ${g.ects} ECTS but ${c.name} is ${c.ects}.` };
  const next = { ...c, groupId: g.id, capacity: c.capacity || 20 };
  return { ok: true, db: { ...db, groups, courses: db.courses.map((x) => (x.id === courseId ? next : x)) }, message: `${c.name} is now an option in ${g.name}.${note}` };
}

export function groupsForYear(db: DB, year: Year): OptionGroup[] {
  return db.groups.filter((g) => g.year === year);
}

/** Optional ECTS a student must choose in a year = sum of that year's Opção slots. */
export function requiredEcts(db: DB, year: Year): number {
  return groupsForYear(db, year).reduce((n, g) => n + g.ects, 0);
}

/** ECTS a student has used inside one Opção (enrolled + pending by default). */
export function groupEcts(db: DB, studentId: string, groupId: string, statuses: Selection["status"][] = ["enrolled", "pending"]): number {
  return db.selections
    .filter((s) => s.studentId === studentId && statuses.includes(s.status))
    .map((s) => db.courses.find((c) => c.id === s.courseId))
    .filter((c): c is Course => !!c && c.groupId === groupId)
    .reduce((n, c) => n + c.ects, 0);
}

/** Seats taken = enrolled only. Pending approval requests do NOT hold a seat. */
export function seatsTaken(db: DB, courseId: string): number {
  return db.selections.filter((s) => s.courseId === courseId && s.status === "enrolled").length;
}

export function seatsLeft(db: DB, course: Course): number {
  return Math.max(0, course.capacity - seatsTaken(db, course.id));
}

export function pendingCount(db: DB, courseId: string): number {
  return db.selections.filter((s) => s.courseId === courseId && s.status === "pending").length;
}

export function activeSelections(db: DB, studentId: string, year?: Year): Selection[] {
  return db.selections.filter((s) => {
    if (s.studentId !== studentId || s.status === "rejected") return false;
    if (year === undefined) return true;
    return db.courses.find((c) => c.id === s.courseId)?.year === year;
  });
}

export function ectsFor(db: DB, studentId: string, year: Year, statuses: Selection["status"][]): number {
  return db.selections
    .filter((s) => s.studentId === studentId && statuses.includes(s.status))
    .map((s) => db.courses.find((c) => c.id === s.courseId))
    .filter((c): c is Course => !!c && c.year === year)
    .reduce((sum, c) => sum + c.ects, 0);
}

function email(to: string[], subject: string, body: string, now: Date): Email {
  return { id: uid("mail"), to, subject, body, sentAt: now.toISOString() };
}

export function students(db: DB, year?: Year): User[] {
  return db.users.filter((u) => u.role === "student" && (year === undefined || u.year === year));
}

// ───────────────────────── student actions ─────────────────────────

export function pickCourse(db: DB, studentId: string, courseId: string, now: Date, motivation?: string): Result {
  const course = db.courses.find((c) => c.id === courseId);
  if (!course) return { ok: false, error: "Course not found." };
  const group = db.groups.find((g) => g.id === course.groupId);
  if (!group) return { ok: false, error: `${course.name} is a mandatory course — there's nothing to choose.` };
  const me = db.users.find((u) => u.id === studentId);
  if (!me || me.role !== "student") return { ok: false, error: "Only students can choose options." };
  if (me.programmeId !== course.programmeId) return { ok: false, error: `${course.name} belongs to another programme.` };
  if (me.year !== course.year)
    return { ok: false, error: `${group.name} is for Year ${course.year} students. You're in Year ${me.year ?? "?"} — update your profile if that's wrong.` };
  const round = roundForYear(db, course.year, course.programmeId);
  if (!round || roundState(round, now) !== "open")
    return { ok: false, error: `The Year ${course.year} selection round is not open.` };

  const existing = db.selections.find(
    (s) => s.studentId === studentId && s.courseId === courseId && s.status !== "rejected",
  );
  if (existing) return { ok: false, error: "You have already selected this course." };
  if (db.selections.some((s) => s.studentId === studentId && s.courseId === courseId && s.status === "rejected"))
    return { ok: false, error: "The course director has already declined your request for this course." };

  const sameName = db.selections.find(
    (s) => s.studentId === studentId && s.status !== "rejected" && s.courseId !== courseId &&
      db.courses.find((c) => c.id === s.courseId)?.name === course.name,
  );
  if (sameName) return { ok: false, error: `You already chose ${course.name} in another option slot.` };

  const choose = group.choose ?? 1;
  const count = db.selections.filter(
    (s) => s.studentId === studentId && s.status !== "rejected" && db.courses.find((c) => c.id === s.courseId)?.groupId === group.id,
  ).length;
  if (count >= choose)
    return { ok: false, error: `${group.name}: you choose ${choose} course${choose === 1 ? "" : "s"} and you've already picked ${count}. Drop one first to swap.` };
  const used = groupEcts(db, studentId, group.id);
  if (used + course.ects > group.ects)
    return {
      ok: false,
      error: `${group.name} is worth ${group.ects} ECTS and you've already chosen ${used}. Drop that choice first to swap.`,
    };

  if (seatsLeft(db, course) <= 0) return { ok: false, error: `${course.name} is full.` };

  const status = course.requiresApproval ? "pending" : "enrolled";
  const sel: Selection = {
    id: uid("sel"),
    studentId,
    courseId,
    status,
    motivation: motivation?.trim() || undefined,
    createdAt: now.toISOString(),
    decidedAt: status === "enrolled" ? now.toISOString() : undefined,
  };
  const student = db.users.find((u) => u.id === studentId);
  const mail =
    status === "enrolled"
      ? email([studentId], `Seat confirmed: ${course.code} ${course.name}`,
          `Hi ${student?.name ?? ""}, your seat in ${course.name} is confirmed. You can still drop it while the round is open.`, now)
      : email([studentId], `Request sent: ${course.code} ${course.name}`,
          `Hi ${student?.name ?? ""}, ${course.name} needs the course director's acceptance. Your request was sent to ${course.courseDirector}. Note: a pending request does not reserve a seat — if the course fills up before a decision, the request cannot be approved.`, now);

  return {
    ok: true,
    db: { ...db, selections: [...db.selections, sel], emails: [mail, ...db.emails] },
    message: status === "enrolled" ? `Seat confirmed in ${course.name}.` : `Request sent to ${course.courseDirector}.`,
  };
}

export function dropCourse(db: DB, studentId: string, selectionId: string, now: Date): Result {
  const sel = db.selections.find((s) => s.id === selectionId && s.studentId === studentId);
  if (!sel) return { ok: false, error: "Selection not found." };
  const course = db.courses.find((c) => c.id === sel.courseId)!;
  const round = roundForYear(db, course.year, course.programmeId);
  if (!round || roundState(round, now) !== "open")
    return { ok: false, error: "Changes are only possible while the round is open." };
  if (sel.status === "rejected") return { ok: false, error: "Nothing to drop." };
  return {
    ok: true,
    db: { ...db, selections: db.selections.filter((s) => s.id !== selectionId) },
    message: sel.status === "enrolled" ? `Dropped ${course.name}; your seat was released.` : `Withdrew request for ${course.name}.`,
  };
}

// ───────────────────────── director actions ─────────────────────────

export function decide(db: DB, selectionId: string, approve: boolean, now: Date, note?: string): Result {
  const sel = db.selections.find((s) => s.id === selectionId);
  if (!sel || sel.status !== "pending") return { ok: false, error: "This request is no longer pending." };
  const course = db.courses.find((c) => c.id === sel.courseId)!;
  if (approve && seatsLeft(db, course) <= 0)
    return { ok: false, error: `${course.name} is full — raise the capacity or reject the request.` };

  const updated: Selection = {
    ...sel,
    status: approve ? "enrolled" : "rejected",
    note: note?.trim() || undefined,
    decidedAt: now.toISOString(),
  };
  const student = db.users.find((u) => u.id === sel.studentId);
  const mail = email(
    [sel.studentId],
    `${approve ? "Accepted" : "Not accepted"}: ${course.code} ${course.name}`,
    approve
      ? `Hi ${student?.name ?? ""}, ${course.courseDirector} accepted you into ${course.name}. Your seat is confirmed.${note ? ` Note: ${note}` : ""}`
      : `Hi ${student?.name ?? ""}, your request for ${course.name} was not accepted.${note ? ` Reason: ${note}` : ""} Please pick another optional while the round is open.`,
    now,
  );
  return {
    ok: true,
    db: { ...db, selections: db.selections.map((s) => (s.id === selectionId ? updated : s)), emails: [mail, ...db.emails] },
    message: approve ? `Accepted ${student?.name} into ${course.code}.` : `Rejected ${student?.name}'s request.`,
  };
}

/** Sends the "portal is open" email to every student once per round, when the round is open. */
export function sendOpeningEmails(db: DB, now: Date): DB {
  let changed = false;
  const emails = [...db.emails];
  const rounds = db.rounds.map((r) => {
    if (r.emailSentAt || roundState(r, now) !== "open") return r;
    changed = true;
    const closes = new Date(r.closesAt).toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" });
    emails.unshift(
      email(
        students(db, r.year).filter((s) => s.programmeId === r.programmeId).map((s) => s.id),
        `OPtioN! is open: choose your Year ${r.year} optionals`,
        `The ${r.label} is now open. Choose your ${groupsForYear(db, r.year).filter((g) => g.programmeId === r.programmeId).map((g) => g.name).join(", ")} before ${closes}. Seats are first come, first served; some courses need the course director's acceptance.`,
        now,
      ),
    );
    return { ...r, emailSentAt: now.toISOString() };
  });
  return changed ? { ...db, rounds, emails } : db;
}

export function updateRound(db: DB, round: Round): Result {
  if (new Date(round.closesAt) <= new Date(round.opensAt))
    return { ok: false, error: "The closing date must be after the opening date." };
  const prev = db.rounds.find((r) => r.id === round.id);
  // Re-opening with new dates should notify students again.
  const reset = prev && prev.opensAt !== round.opensAt ? { ...round, emailSentAt: undefined } : round;
  return { ok: true, db: { ...db, rounds: db.rounds.map((r) => (r.id === round.id ? reset : r)) }, message: "Round saved." };
}

export function saveCourse(db: DB, course: Course): Result {
  if (!course.name.trim() || !course.code.trim()) return { ok: false, error: "Name and code are required." };
  if (!db.programmes.some((p) => p.id === course.programmeId)) return { ok: false, error: "Choose the programme." };
  if (course.groupId) {
    const g = db.groups.find((g) => g.id === course.groupId);
    if (!g || g.programmeId !== course.programmeId) return { ok: false, error: "Pick a valid option slot for this programme." };
    if (g.year !== course.year) return { ok: false, error: `${g.name} belongs to Year ${g.year}.` };
    if (course.ects > g.ects) return { ok: false, error: `${g.name} is only ${g.ects} ECTS.` };
    if (course.capacity < 1) return { ok: false, error: "Seats must be at least 1." };
  }
  const dupe = db.courses.find((c) => c.code.toLowerCase() === course.code.toLowerCase() && c.id !== course.id);
  if (dupe) return { ok: false, error: `Code ${course.code} is already used by ${dupe.name}.` };
  const taken = seatsTaken(db, course.id);
  if (course.capacity < taken)
    return { ok: false, error: `${taken} students are already enrolled; capacity can't go below that.` };
  const exists = db.courses.some((c) => c.id === course.id);
  return {
    ok: true,
    db: { ...db, courses: exists ? db.courses.map((c) => (c.id === course.id ? course : c)) : [...db.courses, course] },
    message: exists ? `Saved ${course.code}.` : `Created ${course.code}.`,
  };
}

export function deleteCourse(db: DB, courseId: string): Result {
  if (db.selections.some((s) => s.courseId === courseId && s.status !== "rejected"))
    return { ok: false, error: "Students have selected this course; it can't be deleted." };
  return { ok: true, db: { ...db, courses: db.courses.filter((c) => c.id !== courseId) }, message: "Course deleted." };
}

/** Students who haven't yet reached the round's ECTS (enrolled only). */
export function incompleteStudents(db: DB, year: Year): { student: User; enrolled: number; pending: number }[] {
  const need = requiredEcts(db, year);
  return students(db, year)
    .map((student) => ({
      student,
      enrolled: ectsFor(db, student.id, year, ["enrolled"]),
      pending: ectsFor(db, student.id, year, ["pending"]),
    }))
    .filter((r) => r.enrolled < need);
}

// ───────────────────────── lists & downloads ─────────────────────────

export type OptionCell = { course: Course; status: Selection["status"] | "completed" } | null;

/** What a student has for one Opção: this year's live selection, or the option they completed in an earlier year. */
export function optionFor(db: DB, student: User, groupId: string): OptionCell {
  const live = db.selections
    .filter((s) => s.studentId === student.id && s.status !== "rejected")
    .map((s) => ({ s, c: db.courses.find((c) => c.id === s.courseId) }))
    .find((x) => x.c?.groupId === groupId);
  if (live?.c) return { course: live.c, status: live.s.status };
  const pastId = student.pastOptions?.[groupId];
  const past = pastId && db.courses.find((c) => c.id === pastId);
  return past ? { course: past, status: "completed" } : null;
}

/** The general list: one row per student with their option in every Opção. */
export function generalList(db: DB, year?: Year) {
  const groups = [...db.groups].sort((a, b) => a.year - b.year || a.name.localeCompare(b.name));
  const rows = students(db, year)
    .slice()
    .sort((a, b) => (a.year ?? 0) - (b.year ?? 0) || a.username.localeCompare(b.username))
    .map((student) => ({ student, options: groups.map((g) => (g.year <= (student.year ?? 0) ? optionFor(db, student, g.id) : null)) }));
  return { groups, rows };
}

const csv = (rows: (string | number)[][]) =>
  "\uFEFF" + rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n"); // BOM so Excel shows "Opção" correctly

const cellText = (o: OptionCell) => (!o ? "" : o.status === "enrolled" || o.status === "completed" ? o.course.name : `${o.course.name} (${o.status})`);

export function generalListCsv(db: DB, year?: Year): string {
  const { groups, rows } = generalList(db, year);
  return csv([
    ["ID", "Student name", "Year", "Email", ...groups.map((g) => `${g.name} (Year ${g.year})`)],
    ...rows.map(({ student, options }) => [student.username, student.name, student.year ?? "", student.email, ...options.map(cellText)]),
  ]);
}

export function courseListCsv(db: DB, courseId: string): string {
  const course = db.courses.find((c) => c.id === courseId)!;
  const sels = db.selections.filter((s) => s.courseId === courseId);
  const past = students(db).filter((u) => Object.values(u.pastOptions ?? {}).includes(courseId));
  return csv([
    ["ID", "Student name", "Email", "Year", "Status", "Date", "Message to director"],
    ...sels.map((s) => {
      const u = db.users.find((u) => u.id === s.studentId)!;
      return [u.username, u.name, u.email, u.year ?? "", s.status, (s.decidedAt ?? s.createdAt).slice(0, 10), s.motivation ?? ""];
    }),
    ...past.map((u) => [u.username, u.name, u.email, u.year ?? "", "completed (earlier year)", "", ""]),
  ]).replace(/^\uFEFF/, `\uFEFF"${course.code} ${course.name}"\r\n`);
}

// ───────────────────────── accounts & profiles ─────────────────────────

export type NewUser = Omit<User, "id" | "createdAt">;

function checkProfile(db: DB, u: User | NewUser, selfId?: string): string | null {
  if (!u.name.trim() || u.name.trim().split(/\s+/).length < 2) return "Please enter your full name (first and last).";
  if (!/^\S+@\S+\.\S+$/.test(u.email)) return "Please enter a valid email address.";
  if (db.users.some((x) => x.id !== selfId && x.email.toLowerCase() === u.email.toLowerCase())) return "That email is already registered.";
  if (u.role === "student") {
    if (!/^(pg|a)\d{4,6}$/i.test(u.username)) return "Student number should look like pg55000.";
    if (u.year !== 1 && u.year !== 2) return "Choose your year (1st or 2nd).";
    if (!u.bachelor?.degree?.trim()) return "Tell us which bachelor's degree you completed.";
  }
  if (u.dob && (Number.isNaN(Date.parse(u.dob)) || new Date(u.dob) > new Date())) return "Date of birth doesn't look right.";
  return null;
}

export function registerUser(db: DB, input: NewUser, now: Date): Result & { userId?: string } {
  if (input.role !== "student") return { ok: false, error: "Only students can sign up. Staff accounts are created by the School of Engineering." };
  if (!db.programmes.some((p) => p.id === input.programmeId)) return { ok: false, error: "Choose your programme." };
  const username = input.username.trim().toLowerCase();
  if (db.users.some((u) => u.username.toLowerCase() === username)) return { ok: false, error: `${username} already has an account — sign in instead.` };
  if (input.password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
  const err = checkProfile(db, { ...input, username });
  if (err) return { ok: false, error: err };
  const user: User = { ...input, username, name: input.name.trim(), id: uid("u"), createdAt: now.toISOString() };
  const welcome = email(
    [user.id],
    "Welcome to OPtioN!",
    `Hi ${user.name.split(" ")[0]}, your account is ready. You'll get an email here as soon as your option selection opens.`,
    now,
  );
  return { ok: true, db: { ...db, users: [...db.users, user], emails: [welcome, ...db.emails] }, message: "Account created.", userId: user.id };
}

export function updateProfile(db: DB, user: User): Result {
  const prev = db.users.find((u) => u.id === user.id);
  if (!prev) return { ok: false, error: "Account not found." };
  const err = checkProfile(db, user, user.id);
  if (err) return { ok: false, error: err };
  if (prev.role === "student" && prev.year !== user.year && db.selections.some((s) => s.studentId === user.id && s.status !== "rejected" && db.courses.find((c) => c.id === s.courseId)?.year === prev.year))
    return { ok: false, error: `You have Year ${prev.year} choices — drop them before changing your year.` };
  // role, username and password can't be changed here
  const next: User = { ...user, role: prev.role, username: prev.username, password: prev.password };
  return { ok: true, db: { ...db, users: db.users.map((u) => (u.id === user.id ? next : u)) }, message: "Profile saved." };
}

// ───────────────────────── sign-in ─────────────────────────

export const isStaff = (u?: Pick<User, "role"> | null) => !!u && STAFF_ROLES.includes(u.role);

/** Checks credentials for one entry point (student link, staff link or portal). */
export function authenticate(db: DB, username: string, password: string, allowed: Role[]): { ok: true; user: User } | { ok: false; error: string } {
  const u = db.users.find((x) => x.username.toLowerCase() === username.trim().toLowerCase() || x.email.toLowerCase() === username.trim().toLowerCase());
  if (!u || u.password !== password) return { ok: false, error: "Wrong username or password." };
  if (!allowed.includes(u.role)) {
    const where = u.role === "student" ? "the student link" : u.role === "admin" ? "the department portal" : "the course director link";
    return { ok: false, error: `This account signs in through ${where}.` };
  }
  if (u.active === false) return { ok: false, error: "This account has been disabled. Contact the department." };
  return { ok: true, user: u };
}

// ───────────────────────── portal: staff access ─────────────────────────

export function randomPassword(len = 10): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

const ROLE_NAME: Record<Role, string> = { director: "course director", assistant: "assistant", admin: "School of Engineering team", student: "student" };

function inviteEmail(u: User, password: string, origin: string, now: Date, reset = false): Email {
  const link = `${origin}${u.role === "admin" ? "/portal" : "/staff"}`;
  return {
    id: uid("mail"),
    to: [u.id],
    toAddresses: [u.email],
    kind: "invite",
    sentAt: now.toISOString(),
    subject: reset ? "Your OPtioN! password was reset" : `Your OPtioN! ${ROLE_NAME[u.role]} access`,
    body:
      `Hi ${u.name.split(" ")[0]},\n\n` +
      (reset ? "Your password was reset by the School of Engineering.\n\n" : `You now have ${ROLE_NAME[u.role]} access to OPtioN!.\n\n`) +
      `Sign in here: ${link}\nUsername: ${u.username}\nPassword: ${password}\n\nPlease change your password after signing in.`,
  };
}

export type NewStaff = { name: string; email: string; role: "director" | "assistant" | "admin"; title?: string; programmeId?: string };

export function createStaff(db: DB, input: NewStaff, now: Date, origin: string): Result & { credentials?: { username: string; password: string } } {
  if (!STAFF_ROLES.includes(input.role) && input.role !== "admin") return { ok: false, error: "Choose director, assistant or School team." };
  if (input.role !== "admin" && !db.programmes.some((p) => p.id === input.programmeId)) return { ok: false, error: "Choose the programme they will manage." };
  if (input.role === "director") {
    const clash = oneDirector(db, input.programmeId);
    if (clash) return { ok: false, error: clash };
  }
  if (!input.name.trim() || input.name.trim().split(/\s+/).length < 2) return { ok: false, error: "Enter the full name." };
  if (!/^\S+@\S+\.\S+$/.test(input.email)) return { ok: false, error: "Enter a valid email address." };
  if (db.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) return { ok: false, error: "Someone already uses that email." };
  const base = input.email.split("@")[0].toLowerCase().replace(/[^a-z0-9.]/g, "") || "staff";
  let username = base;
  for (let i = 2; db.users.some((u) => u.username === username); i++) username = `${base}${i}`;
  const password = randomPassword();
  const user: User = {
    id: uid("u"), username, password, name: input.name.trim(), email: input.email.trim(), role: input.role,
    programmeId: input.role === "admin" ? undefined : input.programmeId,
    title: input.title?.trim() || undefined, createdAt: now.toISOString(), invitedAt: now.toISOString(),
  };
  return {
    ok: true,
    db: { ...db, users: [...db.users, user], emails: [inviteEmail(user, password, origin, now), ...db.emails] },
    message: `Access created and sent to ${user.email}.`,
    credentials: { username, password },
  };
}

export function setUserActive(db: DB, userId: string, active: boolean): Result {
  const u = db.users.find((x) => x.id === userId);
  if (!u || u.role === "admin") return { ok: false, error: "Can't change this account." };
  if (active && u.role === "director") {
    const clash = oneDirector(db, u.programmeId, u.id);
    if (clash) return { ok: false, error: clash };
  }
  return { ok: true, db: { ...db, users: db.users.map((x) => (x.id === userId ? { ...x, active } : x)) }, message: `${u.name} ${active ? "can sign in again" : "can no longer sign in"}.` };
}

export function resetPassword(db: DB, userId: string, now: Date, origin: string): Result & { credentials?: { username: string; password: string } } {
  const u = db.users.find((x) => x.id === userId);
  if (!u || u.role === "admin") return { ok: false, error: "Can't reset this account." };
  const password = randomPassword();
  const next = { ...u, password, invitedAt: now.toISOString() };
  return {
    ok: true,
    db: { ...db, users: db.users.map((x) => (x.id === userId ? next : x)), emails: [inviteEmail(next, password, origin, now, true), ...db.emails] },
    message: `New password sent to ${u.email}.`,
    credentials: { username: u.username, password },
  };
}

export function changePassword(db: DB, userId: string, current: string, next: string): Result {
  const u = db.users.find((x) => x.id === userId);
  if (!u || u.password !== current) return { ok: false, error: "Current password is wrong." };
  if (next.length < 6) return { ok: false, error: "New password must be at least 6 characters." };
  return { ok: true, db: { ...db, users: db.users.map((x) => (x.id === userId ? { ...x, password: next } : x)) }, message: "Password changed." };
}

// ───────────────────────── professors ─────────────────────────

export function saveProfessor(db: DB, p: Professor): Result {
  if (!p.name.trim()) return { ok: false, error: "Enter the professor's name." };
  if (!/^\S+@\S+\.\S+$/.test(p.email)) return { ok: false, error: "Enter a valid email — course lists are sent there." };
  if (db.professors.some((x) => x.id !== p.id && x.email.toLowerCase() === p.email.toLowerCase())) return { ok: false, error: "Another professor uses that email." };
  const exists = db.professors.some((x) => x.id === p.id);
  return {
    ok: true,
    db: { ...db, professors: exists ? db.professors.map((x) => (x.id === p.id ? p : x)) : [...db.professors, p] },
    message: exists ? `Saved ${p.name}.` : `Added ${p.name}.`,
  };
}

export function deleteProfessor(db: DB, id: string): Result {
  const teaching = db.courses.filter((c) => c.professorId === id);
  if (teaching.length) return { ok: false, error: `Still teaching ${teaching.length} course(s). Assign them to someone else first.` };
  return { ok: true, db: { ...db, professors: db.professors.filter((p) => p.id !== id) }, message: "Professor removed." };
}

/** Plain-text class list, ready for an email body. */
export function courseListText(db: DB, courseId: string): string {
  const c = db.courses.find((x) => x.id === courseId)!;
  const rows = db.selections
    .filter((s) => s.courseId === courseId && s.status === "enrolled")
    .map((s) => db.users.find((u) => u.id === s.studentId)!)
    .sort((a, b) => a.username.localeCompare(b.username));
  const g = db.groups.find((x) => x.id === c.groupId);
  return [
    `${c.code} ${c.name}${g ? ` (${g.name})` : ""} — ${rows.length} student${rows.length === 1 ? "" : "s"}`,
    "",
    ...rows.map((u, i) => `${String(i + 1).padStart(2, " ")}. ${u.username}  ${u.name}  <${u.email}>`),
  ].join("\n");
}

export function sendCourseList(db: DB, courseId: string, sender: User, now: Date): Result {
  const c = db.courses.find((x) => x.id === courseId);
  if (!c) return { ok: false, error: "Course not found." };
  const prof = db.professors.find((p) => p.id === c.professorId);
  if (!prof) return { ok: false, error: `${c.name} has no professor yet — set one in the course editor.` };
  const mail: Email = {
    id: uid("mail"),
    to: [],
    toAddresses: [prof.email],
    kind: "list",
    sentAt: now.toISOString(),
    subject: `Student list: ${c.code} ${c.name}`,
    body: `Dear ${prof.title} ${prof.name},\n\nHere is the current list of students enrolled in ${c.name}.\n\n${courseListText(db, courseId)}\n\nBest regards,\n${sender.name}`,
  };
  return { ok: true, db: { ...db, emails: [mail, ...db.emails] }, message: `List sent to ${prof.name}.` };
}

export function lastListSent(db: DB, courseId: string): Email | undefined {
  const c = db.courses.find((x) => x.id === courseId);
  return c && db.emails.find((e) => e.kind === "list" && e.subject.endsWith(`${c.code} ${c.name}`));
}

// ───────────────────────── calendar & announcements ─────────────────────────

const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function saveEvent(db: DB, e: CalendarEvent): Result {
  if (!e.title.trim()) return { ok: false, error: "Give the event a title." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) return { ok: false, error: "Pick a date." };
  if (e.endDate && e.endDate < e.date) return { ok: false, error: "The end date is before the start date." };
  const exists = db.events.some((x) => x.id === e.id);
  return { ok: true, db: { ...db, events: exists ? db.events.map((x) => (x.id === e.id ? e : x)) : [...db.events, e] }, message: exists ? "Event updated." : "Event added to the calendar." };
}

export function deleteEvent(db: DB, id: string): Result {
  return { ok: true, db: { ...db, events: db.events.filter((e) => e.id !== id) }, message: "Event removed." };
}

/** Calendar items: staff events plus each round's opening and closing, filtered for a year (0 = all). */
export function calendarItems(db: DB, year: 0 | Year): (CalendarEvent & { auto?: boolean })[] {
  const auto = db.rounds.flatMap((r) => [
    { id: `${r.id}-open`, programmeId: r.programmeId, date: isoDate(new Date(r.opensAt)), time: new Date(r.opensAt).toTimeString().slice(0, 5), title: `Year ${r.year} option selection opens`, kind: "event" as const, audience: r.year, createdBy: "system", auto: true },
    { id: `${r.id}-close`, programmeId: r.programmeId, date: isoDate(new Date(r.closesAt)), time: new Date(r.closesAt).toTimeString().slice(0, 5), title: `Year ${r.year} option selection closes`, kind: "deadline" as const, audience: r.year, createdBy: "system", auto: true },
  ]);
  return [...db.events, ...auto]
    .filter((e) => year === 0 || e.audience === 0 || e.audience === year)
    .sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")));
}

export function postAnnouncement(db: DB, a: Announcement, now: Date, notify: boolean): Result {
  if (!a.title.trim() || !a.body.trim()) return { ok: false, error: "Add a title and a message." };
  const exists = db.announcements.some((x) => x.id === a.id);
  const announcements = exists ? db.announcements.map((x) => (x.id === a.id ? a : x)) : [a, ...db.announcements];
  const emails = [...db.emails];
  if (notify && !exists) {
    const to = students(db, a.audience === 0 ? undefined : a.audience).filter((s) => s.programmeId === a.programmeId).map((s) => s.id);
    emails.unshift({ id: uid("mail"), to, kind: "announcement", subject: a.title, body: a.body, sentAt: now.toISOString() });
  }
  return { ok: true, db: { ...db, announcements, emails }, message: exists ? "Announcement updated." : notify ? "Posted and emailed to students." : "Posted." };
}

export function deleteAnnouncement(db: DB, id: string): Result {
  return { ok: true, db: { ...db, announcements: db.announcements.filter((a) => a.id !== id) }, message: "Announcement removed." };
}

export function announcementsFor(db: DB, year: 0 | Year): Announcement[] {
  return db.announcements
    .filter((a) => year === 0 || a.audience === 0 || a.audience === year)
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.createdAt.localeCompare(a.createdAt));
}

// ───────────────────────── support ─────────────────────────

export type NewTicket = { name: string; email: string; topic: TicketTopic; subject: string; message: string; page?: string };

export function createTicket(db: DB, input: NewTicket, me: User | null, now: Date): Result & { ticketId?: string } {
  const name = (me?.name ?? input.name).trim();
  const email = (me?.email ?? input.email).trim();
  if (!name) return { ok: false, error: "Tell us your name." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "Add an email so the team can reply." };
  if (!input.subject.trim() || input.message.trim().length < 5) return { ok: false, error: "Add a subject and describe the problem." };
  const at = now.toISOString();
  const t: SupportTicket = {
    id: uid("t"), userId: me?.id, name, email, role: me?.role, programmeId: me?.programmeId, topic: input.topic,
    subject: input.subject.trim(), page: input.page, status: "open", createdAt: at, updatedAt: at,
    messages: [{ from: "user", authorName: name, body: input.message.trim(), at }],
  };
  return { ok: true, db: { ...db, tickets: [t, ...db.tickets] }, message: "Sent to the School of Engineering team. You'll see the reply here.", ticketId: t.id };
}

export function replyTicket(db: DB, ticketId: string, body: string, author: User | null, now: Date): Result {
  const t = db.tickets.find((x) => x.id === ticketId);
  if (!t) return { ok: false, error: "Request not found." };
  if (!body.trim()) return { ok: false, error: "Write a message first." };
  const team = author?.role === "admin";
  const at = now.toISOString();
  const next: SupportTicket = {
    ...t,
    status: team ? (t.status === "open" ? "in_progress" : t.status) : t.status === "resolved" ? "open" : t.status,
    updatedAt: at,
    messages: [...t.messages, { from: team ? "team" : "user", authorName: author?.name ?? t.name, body: body.trim(), at }],
  };
  const emails = [...db.emails];
  if (team)
    emails.unshift({
      id: uid("mail"), to: t.userId ? [t.userId] : [], toAddresses: [t.email], kind: "support", sentAt: at,
      subject: `Re: ${t.subject}`, body: `${body.trim()}\n\n— ${author!.name}, School of Engineering`,
    });
  return { ok: true, db: { ...db, tickets: db.tickets.map((x) => (x.id === ticketId ? next : x)), emails }, message: team ? `Reply sent to ${t.name}.` : "Message sent." };
}

export function setTicketStatus(db: DB, ticketId: string, status: TicketStatus, now: Date): Result {
  const t = db.tickets.find((x) => x.id === ticketId);
  if (!t) return { ok: false, error: "Request not found." };
  return { ok: true, db: { ...db, tickets: db.tickets.map((x) => (x.id === ticketId ? { ...x, status, updatedAt: now.toISOString() } : x)) }, message: status === "resolved" ? "Marked as resolved." : "Status updated." };
}

/** Link a director/assistant to the professor record they teach as ("new" creates one from their account). */
export function linkStaffProfessor(db: DB, userId: string, professorId: string | "new" | undefined): Result {
  const u = db.users.find((x) => x.id === userId);
  if (!u || !STAFF_ROLES.includes(u.role)) return { ok: false, error: "Only directors and assistants can be linked to a professor." };
  if (professorId === undefined) return { ok: true, db: { ...db, users: db.users.map((x) => (x.id === userId ? { ...x, professorId: undefined } : x)) }, message: `${u.name} is no longer linked to a professor.` };
  let professors = db.professors;
  let pid = professorId;
  if (professorId === "new") {
    const existing = db.professors.find((p) => p.email.toLowerCase() === u.email.toLowerCase());
    if (existing) pid = existing.id;
    else {
      const p: Professor = { id: uid("p"), name: u.name, title: "Prof.", email: u.email, photo: u.photo, bio: u.bio };
      professors = [...professors, p];
      pid = p.id;
    }
  } else if (!db.professors.some((p) => p.id === professorId)) return { ok: false, error: "Professor not found." };
  if (db.users.some((x) => x.id !== userId && x.professorId === pid)) return { ok: false, error: "Another staff member is already linked to that professor." };
  const prof = professors.find((p) => p.id === pid)!;
  return {
    ok: true,
    db: { ...db, professors, users: db.users.map((x) => (x.id === userId ? { ...x, professorId: pid } : x)) },
    message: `${u.name} also teaches as ${prof.title} ${prof.name}.`,
  };
}

// ───────────────────────── programme access & option rules ─────────────────────────

/** The Master's a person may open: staff get their own plus any granted in the portal; the School team gets all. */
export function staffProgrammes(db: DB, u: User | null): Programme[] {
  if (!u) return [];
  if (u.role === "admin") return db.programmes;
  if (u.role === "student") return db.programmes.filter((p) => p.id === u.programmeId);
  const ids = new Set([u.programmeId, ...(u.programmeIds ?? [])].filter(Boolean));
  return db.programmes.filter((p) => ids.has(p.id));
}

export function setProgrammeAccess(db: DB, userId: string, ids: string[]): Result {
  const u = db.users.find((x) => x.id === userId);
  if (!u || !STAFF_ROLES.includes(u.role)) return { ok: false, error: "Only directors and assistants get programme access." };
  const valid = ids.filter((id) => db.programmes.some((p) => p.id === id) && id !== u.programmeId);
  return {
    ok: true,
    db: { ...db, users: db.users.map((x) => (x.id === userId ? { ...x, programmeIds: [...new Set(valid)] } : x)) },
    message: `${u.name} can open ${valid.length + (u.programmeId ? 1 : 0)} Master's.`,
  };
}

/** Plain-language rules for a programme, e.g. "Year 1: 2 courses (10 ECTS) · Year 2: 1 course (45 ECTS)". */
export function ruleSummary(db: DB, programmeId: string) {
  return ([1, 2] as Year[]).map((year) => {
    const slots = db.groups.filter((g) => g.programmeId === programmeId && g.year === year);
    return {
      year,
      slots,
      courses: slots.reduce((n, g) => n + (g.choose ?? 1), 0),
      ects: slots.reduce((n, g) => n + g.ects, 0),
    };
  });
}

export function saveGroup(db: DB, g: OptionGroup): Result {
  if (!db.programmes.some((p) => p.id === g.programmeId)) return { ok: false, error: "Programme not found." };
  if (!g.name.trim()) return { ok: false, error: "Give the slot a name, e.g. Opção 1." };
  if (!(g.ects > 0)) return { ok: false, error: "ECTS must be more than 0." };
  const choose = g.choose ?? 1;
  if (!Number.isInteger(choose) || choose < 1) return { ok: false, error: "Students must choose at least 1 course." };
  if (db.groups.some((x) => x.id !== g.id && x.programmeId === g.programmeId && x.name.trim().toLowerCase() === g.name.trim().toLowerCase()))
    return { ok: false, error: `${g.name} already exists in this programme.` };
  const prev = db.groups.find((x) => x.id === g.id);
  const courses = db.courses.filter((c) => c.groupId === g.id);
  if (prev) {
    if (prev.year !== g.year && courses.length) return { ok: false, error: "Move its courses out before changing the year." };
    const tooBig = courses.find((c) => c.ects > g.ects);
    if (tooBig) return { ok: false, error: `${tooBig.name} is ${tooBig.ects} ECTS — more than the slot's ${g.ects}.` };
    const maxChosen = Math.max(
      0,
      ...students(db).map((st) => db.selections.filter((x) => x.studentId === st.id && x.status !== "rejected" && courses.some((c) => c.id === x.courseId)).length),
    );
    if (choose < maxChosen) return { ok: false, error: `Some students already chose ${maxChosen} courses here — the number can't go below that.` };
  }
  const next = { ...g, name: g.name.trim(), choose };
  return {
    ok: true,
    db: { ...db, groups: prev ? db.groups.map((x) => (x.id === g.id ? next : x)) : [...db.groups, next] },
    message: prev ? `${next.name} updated.` : `${next.name} added.`,
  };
}

export function deleteGroup(db: DB, groupId: string): Result {
  const g = db.groups.find((x) => x.id === groupId);
  if (!g) return { ok: false, error: "Slot not found." };
  const n = db.courses.filter((c) => c.groupId === groupId).length;
  if (n) return { ok: false, error: `${g.name} still has ${n} course${n === 1 ? "" : "s"}. Make them mandatory or move them first.` };
  return { ok: true, db: { ...db, groups: db.groups.filter((x) => x.id !== groupId) }, message: `${g.name} removed.` };
}
