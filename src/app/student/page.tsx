"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BadgeCheck, CalendarClock, Check, Info, LayoutGrid, List, Lock, Megaphone, ShieldQuestion, Trash2, X } from "lucide-react";
import { AppHeader, Countdown, RoundPill, SeatMeter, StatusBadge, fmtDate, useRequireRole } from "@/components/ui";
import { CourseDetail, CourseImage } from "@/components/course-detail";
import { Avatar } from "@/components/profile";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/prefs";
import { announcementsFor, currentRound, groupEcts, groupsForYear, optionFor, pendingCount, requiredEcts, roundForGroup, roundState, roundTitle, seatsLeft, seatsTaken, semesterStatus, studentTerm } from "@/lib/logic";
import type { Course, OptionGroup, Round, RoundState, Selection, Semester, Year } from "@/lib/types";

type View = "cards" | "table";
const VIEW_KEY = "option-student-view";
const SEM_LABEL: Record<Semester, string> = { S1: "Semester 1", S2: "Semester 2", A: "Whole year" };

export default function StudentPage() {
  const user = useRequireRole("student");
  const { db, now, pick, drop } = useStore();
  const t = useT();
  const [openCourse, setOpenCourse] = useState<string | null>(null);
  const [requesting, setRequesting] = useState<Course | null>(null);
  const [view, setViewState] = useState<View>("cards");
  useEffect(() => {
    try {
      if (localStorage.getItem(VIEW_KEY) === "table") setViewState("table");
    } catch {}
  }, []);
  const setView = (v: View) => {
    setViewState(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {}
  };

  if (!user) return null;
  if (!user.year)
    return (
      <>
        <AppHeader user={user} />
        <main className="mx-auto max-w-xl px-5 py-16 text-center">
          <h1 className="font-display text-2xl font-bold">{t("Which year are you in?")}</h1>
          <p className="mt-2 text-ink/60">{t("Add your level to your profile so we can show your options.")}</p>
          <Link href="/profile" className="btn-brand mt-6">{t("Complete my profile")}</Link>
        </main>
      </>
    );

  const year: Year = user.year;
  const term = studentTerm(user, now);
  const round = currentRound(db, year, now)!;
  const state = roundState(round, now);
  const groups = groupsForYear(db, year);
  const need = requiredEcts(db, year);
  const enrolled = groups.reduce((n, g) => n + groupEcts(db, user.id, g.id, ["enrolled"]), 0);
  const pending = groups.reduce((n, g) => n + groupEcts(db, user.id, g.id, ["pending"]), 0);
  const yearCourses = db.courses.filter((c) => c.year === year);
  const pastGroups = db.groups.filter((g) => g.year < year);
  // Semester 1, then Semester 2, then anything that runs all year — skipping empty ones.
  const semesters = (["S1", "S2", "A"] as Semester[]).filter((sem) => yearCourses.some((c) => c.semester === sem) || groups.some((g) => g.semester === sem));

  const mine = (courseId: string) => db.selections.find((s) => s.studentId === user.id && s.courseId === courseId);
  const slotState = (g: OptionGroup) => {
    const r = roundForGroup(db, g);
    return { r, st: r ? roundState(r, now) : ("closed" as const) };
  };

  /** The button/label for one optional course — used on cards, table rows and the detail window. */
  const action = (c: Course, size: "sm" | "lg" = "sm") => {
    const sel = mine(c.id);
    const g = groups.find((g) => g.id === c.groupId)!;
    const { r, st } = slotState(g);
    const isOpen = st === "open";
    const room = g.ects - groupEcts(db, user.id, g.id);
    const big = size === "lg" ? "px-5 py-3 text-base" : "";
    if (sel)
      return (
        <div className="flex items-center gap-2">
          <StatusBadge status={sel.status} />
          {isOpen && sel.status !== "rejected" && (
            <button
              onClick={() => confirm(sel.status === "enrolled" ? `Drop ${c.name}? Your seat goes to the next student.` : `Withdraw your request for ${c.name}?`) && drop(sel.id)}
              className="rounded-lg p-1.5 text-ink/40 hover:bg-paper hover:text-brand"
              aria-label={`Drop ${c.name}`}
              title={sel.status === "enrolled" ? "Drop" : "Withdraw request"}
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      );
    if (st === "upcoming") return <span className="text-xs font-semibold text-ink/45">{t("Opens")} {r && fmtDay(r.opensAt)}</span>;
    if (!isOpen) return <span className="text-xs font-semibold text-ink/40">{t("Closed")}</span>;
    if (seatsLeft(db, c) === 0) return <button className={`btn-ghost ${big}`} disabled>{t("Full")}</button>;
    if (c.ects > room) return <span className="text-xs text-ink/45">{g.name} {t("already chosen")}</span>;
    if (c.requiresApproval)
      return (
        <button className={`btn-ghost border-brand text-brand ${big}`} onClick={() => setRequesting(c)}>
          {t("Request seat")}
        </button>
      );
    return (
      <button className={`btn-brand ${big}`} onClick={() => pick(c.id)}>
        {t("Choose")}
      </button>
    );
  };

  const detail = openCourse ? db.courses.find((c) => c.id === openCourse) : null;
  const detailGroup = detail ? db.groups.find((g) => g.id === detail.groupId) : undefined;

  return (
    <>
      <AppHeader user={user}>
        <span className="hidden truncate whitespace-nowrap rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold lg:inline">
          {t(term.label)} · {db.programme.short}
        </span>
      </AppHeader>

      <main className="mx-auto max-w-6xl px-5 py-8">
        {/* Who I am, where I am, what's open */}
        <section className="card overflow-hidden">
          <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center">
            <div className="flex items-center gap-4">
              <Avatar user={user} size={64} className="hidden sm:grid" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                  {db.programme.short} · {t(term.label)}
                </p>
                <div className="mt-1 flex items-center gap-3">
                  <h1 className="font-display text-3xl font-bold">{t("Hi")} {user.name.split(" ")[0]}</h1>
                  <RoundPill round={round} />
                </div>
                <p className="mt-1 text-ink/60">
                  {t(roundTitle(round))}: {fmtDate(round.opensAt)} → {fmtDate(round.closesAt)}
                </p>
                <Link href="/profile#programme" className="mt-1 inline-block text-sm font-semibold text-brand hover:underline">
                  {t("About my Master's →")}
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-paper px-4 py-3">
              <CalendarClock className="size-5 text-ink/50" />
              <div className="text-sm">
                {state === "open" && <>{t("Closes in")} <b className="text-lg"><Countdown to={round.closesAt} /></b></>}
                {state === "upcoming" && <>{t("Opens in")} <b className="text-lg"><Countdown to={round.opensAt} /></b></>}
                {state === "closed" && <span className="font-semibold">{t("Selection closed")}</span>}
              </div>
            </div>
          </div>

          {/* Per-Opção progress */}
          <div className="border-t border-line bg-paper/60 px-6 py-4">
            <div className="flex flex-wrap items-center gap-2">
              {groups.map((g) => {
                const sel = db.selections.find(
                  (s) => s.studentId === user.id && s.status !== "rejected" && db.courses.find((c) => c.id === s.courseId)?.groupId === g.id,
                );
                const c = sel && db.courses.find((c) => c.id === sel.courseId);
                const { r, st } = slotState(g);
                const tone = sel?.status === "enrolled" ? "border-emerald-300 bg-emerald-50" : sel ? "border-amber-300 bg-amber-50" : st === "upcoming" ? "border-ink/10 bg-ink/5 text-ink/50" : "border-dashed border-ink/25 bg-white";
                return (
                  <div key={g.id} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${tone}`}>
                    <span className="font-semibold">{g.name}</span>
                    <span className="text-ink/40">·</span>
                    {c ? (
                      <>
                        <span className="max-w-[16rem] truncate">{c.name}</span>
                        {sel!.status === "enrolled" ? <Check className="size-4 text-emerald-600" /> : <span className="text-xs text-amber-700">{t("pending")}</span>}
                      </>
                    ) : st === "upcoming" ? (
                      <span className="inline-flex items-center gap-1"><Lock className="size-3.5" /> {t("opens")} {r && fmtDay(r.opensAt)}</span>
                    ) : (
                      <span className="text-ink/50">{t("choose")} {g.ects} ECTS</span>
                    )}
                  </div>
                );
              })}
              <span className="ml-auto text-sm">
                {enrolled >= need ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                    <BadgeCheck className="size-4" /> {t("All options confirmed")}
                  </span>
                ) : (
                  <span className="text-ink/60">
                    <b className="text-ink">{enrolled}</b>/{need} {t("option ECTS confirmed")}
                    {pending > 0 && <span className="text-amber-700"> · {pending} {t("pending")}</span>}
                  </span>
                )}
              </span>
            </div>
            {db.selections
              .filter((s) => s.studentId === user.id && s.note && db.courses.find((c) => c.id === s.courseId)?.year === year)
              .map((s) => (
                <p key={s.id} className="mt-3 rounded-lg bg-white px-3 py-2 text-sm">
                  <b>{db.courses.find((c) => c.id === s.courseId)?.name}</b> — director&apos;s note: “{s.note}”
                </p>
              ))}
          </div>
        </section>

        {/* Announcements */}
        {announcementsFor(db, year).length > 0 && (
          <section className="mt-6 grid gap-3 md:grid-cols-2">
            {announcementsFor(db, year)
              .slice(0, 2)
              .map((a) => (
                <Link key={a.id} href="/calendar" className={`card flex gap-3 p-4 transition hover:shadow-md ${a.pinned ? "border-brand/40" : ""}`}>
                  <Megaphone className="mt-0.5 size-5 shrink-0 text-brand" />
                  <span className="min-w-0">
                    <span className="block font-semibold">{a.title}</span>
                    <span className="line-clamp-2 block text-sm text-ink/65">{a.body}</span>
                  </span>
                </Link>
              ))}
          </section>
        )}

        {/* View switch */}
        <div className="mt-10 flex justify-end">
          <div className="flex gap-1 rounded-xl border border-line bg-white p-1 text-sm" role="group" aria-label={t("View")}>
            {([
              ["cards", LayoutGrid, "Cards"],
              ["table", List, "Table"],
            ] as const).map(([v, Icon, label]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold ${view === v ? "bg-brand text-white" : "text-ink/60 hover:text-ink"}`}
              >
                <Icon className="size-4" /> {t(label)}
              </button>
            ))}
          </div>
        </div>

        {/* One block per semester: mandatory courses first, then each Opção */}
        {semesters.map((sem) => {
          const status = semesterStatus(sem, now);
          const mandatory = yearCourses.filter((c) => !c.groupId && c.semester === sem).sort((a, b) => a.name.localeCompare(b.name));
          const slots = groups.filter((g) => g.semester === sem);
          const ects = mandatory.reduce((n, c) => n + c.ects, 0) + slots.reduce((n, g) => n + g.ects, 0);
          const badge =
            status === "now"
              ? ["Now", "bg-emerald-100 text-emerald-800"]
              : status === "past"
                ? ["Completed", "bg-ink/10 text-ink/60"]
                : status === "next"
                  ? ["Coming next", "bg-sky-100 text-sky-800"]
                  : ["All year", "bg-violet-100 text-violet-800"];
          return (
            <section key={sem} className={`mt-6 ${status === "past" ? "opacity-80" : ""}`}>
              <div className="flex flex-wrap items-center gap-3 border-b-2 border-ink pb-2">
                <h2 className="font-display text-2xl font-bold">
                  {t("Year")} {year} · {t(SEM_LABEL[sem])}
                </h2>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge[1]}`}>{t(badge[0])}</span>
                <span className="ml-auto text-sm text-ink/55">{ects} ECTS</span>
              </div>

              {mandatory.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">{t("Mandatory courses")}</p>
                  <div className="card mt-2 divide-y divide-line overflow-hidden">
                    {mandatory.map((c) => (
                      <button key={c.id} onClick={() => setOpenCourse(c.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-paper/70">
                        <CourseImage course={c} className="size-11 shrink-0 rounded-lg" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{c.name}</span>
                          <span className="block text-xs text-ink/50">{c.area}</span>
                        </span>
                        <span className="text-sm text-ink/60">{c.ects} ECTS</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {slots.map((g) => (
                <OptionSlot
                  key={g.id}
                  group={g}
                  options={yearCourses.filter((c) => c.groupId === g.id)}
                  view={view}
                  mine={mine}
                  slot={slotState(g)}
                  action={action}
                  onOpen={setOpenCourse}
                />
              ))}

              {mandatory.length === 0 && slots.length === 0 && <p className="mt-4 text-sm text-ink/50">{t("Nothing scheduled this semester.")}</p>}
            </section>
          );
        })}

        {pastGroups.length > 0 && (
          <p className="mt-10 text-sm text-ink/60">
            {t("Completed earlier")}:{" "}
            {pastGroups
              .map((g) => {
                const o = optionFor(db, user, g.id);
                return `${g.name} — ${o ? o.course.name : "not recorded"}`;
              })
              .join(" · ")}
          </p>
        )}
      </main>

      {detail && (
        <CourseDetail course={detail} group={detailGroup} onClose={() => setOpenCourse(null)}>
          {detailGroup && detail.year === year ? (
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <SeatMeter taken={seatsTaken(db, detail.id)} capacity={detail.capacity} pending={detail.requiresApproval ? pendingCount(db, detail.id) : 0} />
                {detail.requiresApproval && (
                  <p className="mt-2 text-xs text-ink/60">Needs the course director&apos;s acceptance. A pending request doesn&apos;t hold a seat.</p>
                )}
              </div>
              <div>{action(detail, "lg")}</div>
            </div>
          ) : !detailGroup ? (
            <p className="text-sm text-ink/70">Mandatory course — every student in Year {detail.year} takes it. Nothing to choose.</p>
          ) : null}
        </CourseDetail>
      )}

      {requesting && (
        <RequestDialog
          course={requesting}
          onClose={() => setRequesting(null)}
          onSubmit={(m) => {
            if (pick(requesting.id, m)) {
              setRequesting(null);
              setOpenCourse(null);
            }
          }}
        />
      )}
    </>
  );
}

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/** One Opção: its tag, when it opens, and its options as cards or a table. Not-yet-open slots are greyed out. */
function OptionSlot({
  group: g,
  options,
  view,
  mine,
  slot,
  action,
  onOpen,
}: {
  group: OptionGroup;
  options: Course[];
  view: View;
  mine: (courseId: string) => Selection | undefined;
  slot: { r?: Round; st: RoundState };
  action: (c: Course) => React.ReactNode;
  onOpen: (id: string) => void;
}) {
  const { db, user } = useStore();
  const t = useT();
  const [showAll, setShowAll] = useState(false);
  const { r, st } = slot;
  const chosen = options.filter((c) => {
    const s = mine(c.id);
    return s && s.status !== "rejected";
  });
  const done = groupEcts(db, user!.id, g.id) >= g.ects;
  const locked = st === "upcoming";
  // Once the window has closed and a choice is made, show just that choice.
  const list = st === "closed" && chosen.length > 0 && !showAll ? chosen : options;

  return (
    <div className="mt-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={`rounded-lg px-2.5 py-1 font-display text-base font-bold ${locked ? "bg-ink/10 text-ink/55" : "bg-brand text-white"}`}>{g.name}</span>
        {done && <Check className="size-5 text-emerald-600" />}
        <span className="text-sm text-ink/60">
          {t("choose one")} ({g.ects} ECTS) · {options.length} {t("options")}
        </span>
        <span className="ml-auto text-sm">
          {st === "open" && r && (
            <span className="font-semibold text-emerald-700">
              {t("Open")} · {t("closes in")} <Countdown to={r.closesAt} />
            </span>
          )}
          {st === "upcoming" && r && (
            <span className="inline-flex items-center gap-1.5 font-semibold text-ink/55">
              <Lock className="size-4" /> {t("Opens")} {fmtDate(r.opensAt)}
            </span>
          )}
          {st === "closed" && <span className="text-ink/45">{t("Selection closed")}</span>}
        </span>
      </div>

      <div className={locked ? "grayscale opacity-60" : ""}>
        {view === "cards" ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((c) => {
              const sel = mine(c.id);
              const active = sel && sel.status !== "rejected";
              return (
                <article key={c.id} className={`group card flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg ${active ? "ring-2 ring-brand" : ""}`}>
                  <button onClick={() => onOpen(c.id)} className="relative block h-40 overflow-hidden text-left" aria-label={`Open ${c.name}`}>
                    <CourseImage course={c} className="size-full transition duration-500 group-hover:scale-105" />
                    <span className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-ink">{c.area} · {c.ects} ECTS</span>
                    {c.requiresApproval && (
                      <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-violet-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                        <ShieldQuestion className="size-3" /> {t("Needs acceptance")}
                      </span>
                    )}
                    <span className="absolute bottom-3 left-3 right-3 font-display text-lg font-bold leading-tight text-white">{c.name}</span>
                  </button>
                  <div className="flex flex-1 flex-col p-4">
                    <p className="line-clamp-2 flex-1 text-sm text-ink/65">{c.description}</p>
                    <div className="mt-4">
                      <SeatMeter taken={seatsTaken(db, c.id)} capacity={c.capacity} pending={c.requiresApproval ? pendingCount(db, c.id) : 0} />
                    </div>
                    <div className="mt-4 flex min-h-10 items-center justify-between gap-2">
                      <button onClick={() => onOpen(c.id)} className="text-sm font-semibold text-brand hover:underline">{t("Details")}</button>
                      {action(c)}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-line bg-band/60 text-xs uppercase tracking-wide text-ink/55">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t("Course")}</th>
                  <th className="px-4 py-3 font-semibold">{t("Area")}</th>
                  <th className="px-4 py-3 font-semibold">ECTS</th>
                  <th className="w-48 px-4 py-3 font-semibold">{t("Seats")}</th>
                  <th className="px-4 py-3 text-right font-semibold" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.map((c) => {
                  const sel = mine(c.id);
                  const active = sel && sel.status !== "rejected";
                  return (
                    <tr key={c.id} className={active ? "bg-brand/5" : "hover:bg-paper/60"}>
                      <td className="px-4 py-3">
                        <button onClick={() => onOpen(c.id)} className="flex items-center gap-3 text-left">
                          <CourseImage course={c} className="size-10 shrink-0 rounded-lg" />
                          <span>
                            <span className="block font-semibold hover:text-brand hover:underline">{c.name}</span>
                            {c.requiresApproval && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700">
                                <ShieldQuestion className="size-3" /> {t("Needs acceptance")}
                              </span>
                            )}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-ink/60">{c.area}</td>
                      <td className="px-4 py-3 text-ink/60">{c.ects}</td>
                      <td className="px-4 py-3">
                        <SeatMeter taken={seatsTaken(db, c.id)} capacity={c.capacity} pending={c.requiresApproval ? pendingCount(db, c.id) : 0} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">{action(c)}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {st === "closed" && chosen.length > 0 && options.length > chosen.length && (
        <button className="mt-3 text-sm font-semibold text-brand hover:underline" onClick={() => setShowAll(!showAll)}>
          {showAll ? t("Show only my choice") : `${t("See all")} ${options.length} ${t("options")}`}
        </button>
      )}
    </div>
  );
}

function RequestDialog({ course, onClose, onSubmit }: { course: Course; onClose: () => void; onSubmit: (motivation: string) => void }) {
  const [m, setM] = useState("");
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/40 p-4" onClick={onClose}>
      <div className="card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-ink/50">{course.code} · {course.ects} ECTS</p>
            <h2 className="font-display text-xl font-bold">Request a seat in {course.name}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-paper" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        <p className="mt-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          <Info className="mt-0.5 size-4 shrink-0" />
          The course director decides on requests here, so there&apos;s no need to email. A pending request doesn&apos;t reserve a seat.
        </p>
        <label className="label mt-5" htmlFor="mot">{course.requestPrompt ?? "Message to the course director (optional)"}</label>
        <textarea id="mot" className="input min-h-28" value={m} onChange={(e) => setM(e.target.value)} />
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-brand" onClick={() => onSubmit(m)}>Send request</button>
        </div>
      </div>
    </div>
  );
}
