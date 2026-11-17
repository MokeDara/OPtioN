"use client";
import Link from "next/link";
import { useState } from "react";
import { BadgeCheck, CalendarClock, Check, Info, Megaphone, ShieldQuestion, Trash2, X } from "lucide-react";
import { AppHeader, Countdown, RoundPill, SeatMeter, StatusBadge, fmtDate, useRequireRole } from "@/components/ui";
import { CourseDetail, CourseImage } from "@/components/course-detail";
import { Avatar } from "@/components/profile";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/prefs";
import { announcementsFor, groupEcts, groupsForYear, optionFor, pendingCount, requiredEcts, roundForYear, roundState, seatsLeft, seatsTaken } from "@/lib/logic";
import type { Course, Year } from "@/lib/types";

export default function StudentPage() {
  const user = useRequireRole("student");
  const { db, now, pick, drop } = useStore();
  const t = useT();
  const [openCourse, setOpenCourse] = useState<string | null>(null);
  const [requesting, setRequesting] = useState<Course | null>(null);

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
  const round = roundForYear(db, year)!;
  const state = roundState(round, now);
  const isOpen = state === "open";
  const groups = groupsForYear(db, year);
  const need = requiredEcts(db, year);
  const enrolled = groups.reduce((n, g) => n + groupEcts(db, user.id, g.id, ["enrolled"]), 0);
  const pending = groups.reduce((n, g) => n + groupEcts(db, user.id, g.id, ["pending"]), 0);
  const yearCourses = db.courses.filter((c) => c.year === year);
  const mandatory = yearCourses.filter((c) => !c.groupId).sort((a, b) => a.semester.localeCompare(b.semester));
  const pastGroups = db.groups.filter((g) => g.year < year);

  const mine = (courseId: string) => db.selections.find((s) => s.studentId === user.id && s.courseId === courseId);

  /** The button/label for one optional course — used on the cards and in the detail window. */
  const action = (c: Course, size: "sm" | "lg" = "sm") => {
    const sel = mine(c.id);
    const g = groups.find((g) => g.id === c.groupId)!;
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
    if (!isOpen) return <span className="text-xs font-semibold text-ink/40">{t(state === "upcoming" ? "Not open yet" : "Closed")}</span>;
    if (seatsLeft(db, c) === 0) return <button className={`btn-ghost ${big}`} disabled>{t("Full")}</button>;
    if (c.ects > room) return <span className="text-xs text-ink/45">{g.name} already chosen</span>;
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
        <span className="hidden rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold md:inline">{t("Year")} {year} · {db.programme.short}</span>
      </AppHeader>

      <main className="mx-auto max-w-6xl px-5 py-8">
        {/* Round banner */}
        <section className="card overflow-hidden">
          <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center">
            <div className="flex items-center gap-4">
              <Avatar user={user} size={64} className="hidden sm:grid" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                  {db.programme.short} · {db.programme.name}
                </p>
                <div className="mt-1 flex items-center gap-3">
                  <h1 className="font-display text-3xl font-bold">{t("Hi")} {user.name.split(" ")[0]}</h1>
                  <RoundPill round={round} />
                </div>
                <p className="mt-1 text-ink/60">
                  {round.label}: {fmtDate(round.opensAt)} → {fmtDate(round.closesAt)}
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
                const tone = sel?.status === "enrolled" ? "border-emerald-300 bg-emerald-50" : sel ? "border-amber-300 bg-amber-50" : "border-dashed border-ink/25 bg-white";
                return (
                  <div key={g.id} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${tone}`}>
                    <span className="font-semibold">{g.name}</span>
                    <span className="text-ink/40">·</span>
                    {c ? (
                      <>
                        <span className="max-w-[16rem] truncate">{c.name}</span>
                        {sel!.status === "enrolled" ? <Check className="size-4 text-emerald-600" /> : <span className="text-xs text-amber-700">pending</span>}
                      </>
                    ) : (
                      <span className="text-ink/50">choose {g.ects} ECTS</span>
                    )}
                  </div>
                );
              })}
              <span className="ml-auto text-sm">
                {enrolled >= need ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                    <BadgeCheck className="size-4" /> All options confirmed
                  </span>
                ) : (
                  <span className="text-ink/60">
                    <b className="text-ink">{enrolled}</b>/{need} option ECTS confirmed{pending > 0 && <span className="text-amber-700"> · {pending} pending</span>}
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

        {/* Options */}
        {groups.map((g) => {
          const options = yearCourses.filter((c) => c.groupId === g.id);
          const chosen = groupEcts(db, user.id, g.id) >= g.ects;
          return (
            <section key={g.id} className="mt-10">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
                    {g.name}
                    {chosen && <Check className="size-5 text-emerald-600" />}
                  </h2>
                  <p className="text-sm text-ink/60">
                    {g.semester === "A" ? "Annual" : g.semester === "S1" ? "1st semester" : "2nd semester"} · choose one ({g.ects} ECTS) from {options.length} options
                  </p>
                </div>
                <p className="text-sm text-ink/50">Click a course for its full description.</p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {options.map((c) => {
                  const sel = mine(c.id);
                  const active = sel && sel.status !== "rejected";
                  return (
                    <article
                      key={c.id}
                      className={`group card flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg ${active ? "ring-2 ring-brand" : ""}`}
                    >
                      <button onClick={() => setOpenCourse(c.id)} className="relative block h-40 overflow-hidden text-left" aria-label={`Open ${c.name}`}>
                        <CourseImage course={c} className="size-full transition duration-500 group-hover:scale-105" />
                        <span className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
                        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-ink">{c.area} · {c.ects} ECTS</span>
                        {c.requiresApproval && (
                          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-violet-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                            <ShieldQuestion className="size-3" /> Needs acceptance
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
                          <button onClick={() => setOpenCourse(c.id)} className="text-sm font-semibold text-brand hover:underline">Details</button>
                          {action(c)}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* Mandatory */}
        <section className="mt-12">
          <h2 className="font-display text-xl font-bold">Your mandatory courses · Year {year}</h2>
          <p className="text-sm text-ink/60">Every Year {year} student takes these — nothing to choose.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {(["S1", "S2"] as const).map((sem) => {
              const list = mandatory.filter((c) => c.semester === sem);
              const optionHere = groups.find((g) => g.semester === sem);
              return (
                <div key={sem} className="card overflow-hidden">
                  <div className="flex items-center justify-between bg-band/60 px-4 py-2.5 text-sm font-semibold text-ink/70">
                    <span>{sem === "S1" ? "1st semester" : "2nd semester"}</span>
                    <span>{list.reduce((n, c) => n + c.ects, 0) + (optionHere?.ects ?? 0)} ECTS</span>
                  </div>
                  <div className="divide-y divide-line">
                    {list.length === 0 && (
                      <p className="px-4 py-4 text-sm text-ink/50">
                        No mandatory courses this semester{groups.some((g) => g.semester === "A") ? ` — it's dedicated to your ${groups.find((g) => g.semester === "A")!.name} work.` : "."}
                      </p>
                    )}
                    {list.map((c) => (
                      <button key={c.id} onClick={() => setOpenCourse(c.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-paper/70">
                        <CourseImage course={c} className="size-11 shrink-0 rounded-lg" />
                        <span className="flex-1 text-sm font-medium text-brand">{c.name}</span>
                        <span className="w-14 text-right text-sm text-ink/60">{c.ects} ECTS</span>
                      </button>
                    ))}
                    {optionHere && (
                      <div className="flex items-center gap-3 px-4 py-3 text-sm text-ink/55">
                        <span className="grid size-11 shrink-0 place-items-center rounded-lg border-2 border-dashed border-ink/20 text-xs font-bold">+1</span>
                        <span className="flex-1">{optionHere.name} — your choice above</span>
                        <span className="w-14 text-right">{optionHere.ects} ECTS</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {pastGroups.length > 0 && (
            <p className="mt-4 text-sm text-ink/60">
              Completed earlier:{" "}
              {pastGroups
                .map((g) => {
                  const o = optionFor(db, user, g.id);
                  return `${g.name} — ${o ? o.course.name : "not recorded"}`;
                })
                .join(" · ")}
            </p>
          )}
        </section>
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
