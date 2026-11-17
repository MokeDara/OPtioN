"use client";
import { useState } from "react";
import { BookOpen, ChevronDown, Download, Mail, UserRound } from "lucide-react";
import { AppHeader, Empty, SeatMeter, fmtDate, useRequireRole } from "@/components/ui";
import { CourseImage } from "@/components/course-detail";
import { Avatar } from "@/components/profile";
import { download, slug } from "@/components/staff";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/prefs";
import { courseListCsv, courseRoster, pendingCount, professorView, seatsTaken } from "@/lib/logic";
import type { Course } from "@/lib/types";

/** Professor view: only the courses this person teaches, their students and the seat requests (read-only). */
export default function MyCoursesPage() {
  const user = useRequireRole(["professor", "director", "assistant"]);
  const { school } = useStore();
  const t = useT();
  if (!user) return null;
  const { courses, directors } = professorView(school, user.professorId);
  const pending = courses.reduce((n, c) => n + pendingCount(school, c.id), 0);

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto max-w-6xl px-5 py-8">
        <h1 className="font-display text-3xl font-bold">{t("My courses")}</h1>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            { k: t("Courses I teach"), v: courses.length },
            { k: t("Students enrolled"), v: courses.reduce((n, c) => n + (c.groupId ? seatsTaken(school, c.id) : courseRoster(school, c.id).length), 0) },
            { k: t("Seat requests pending"), v: pending },
          ].map((s) => (
            <div key={s.k} className="card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">{s.k}</p>
              <p className="mt-1 font-display text-3xl font-bold">{s.v}</p>
            </div>
          ))}
        </div>

        {directors.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/50">{t("Course directors")}</h2>
            <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {directors.map(({ programme, director }) => (
                <div key={programme.id} className="card flex items-center gap-3 p-4">
                  {director ? <Avatar user={director} size={44} /> : <span className="grid size-11 place-items-center rounded-full bg-paper"><UserRound className="size-5 text-ink/40" /></span>}
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-brand">{programme.short}</p>
                    <p className="truncate font-semibold">{director?.name ?? programme.contacts?.find((c) => c.role === "Course Director")?.name ?? "—"}</p>
                    {director?.email && (
                      <a href={`mailto:${director.email}`} className="flex items-center gap-1 truncate text-sm text-brand hover:underline">
                        <Mail className="size-3.5 shrink-0" /> {director.email}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-8 space-y-4">
          {courses.length === 0 ? (
            <Empty icon={BookOpen} title={t("No courses yet")} text={t("The DSI team links you to the courses you teach.")} />
          ) : (
            courses.map((c) => <CourseRoster key={c.id} course={c} />)
          )}
        </section>
      </main>
    </>
  );
}

function CourseRoster({ course: c }: { course: Course }) {
  const { school } = useStore();
  const t = useT();
  const [open, setOpen] = useState(false);
  const prog = school.programmes.find((p) => p.id === c.programmeId);
  const group = school.groups.find((g) => g.id === c.groupId);
  const roster = courseRoster(school, c.id);
  const enrolled = roster.filter((r) => r.status !== "pending");
  const requests = roster.filter((r) => r.status === "pending");

  return (
    <div className="card overflow-hidden">
      <button className="flex w-full items-center gap-4 p-4 text-left hover:bg-paper/50" onClick={() => setOpen(!open)} aria-expanded={open}>
        <CourseImage course={c} className="size-14 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{c.name}</p>
          <p className="text-xs text-ink/55">
            {prog?.short} · {t("Year")} {c.year} · {c.semester === "A" ? t("Annual") : c.semester} · {group ? group.name : t("Mandatory")}
          </p>
          {group && <SeatMeter taken={seatsTaken(school, c.id)} capacity={c.capacity} pending={requests.length} />}
        </div>
        <span className="hidden text-right text-sm sm:block">
          <b className="font-display text-xl">{enrolled.length}</b> <span className="text-ink/50">{t("students")}</span>
          {requests.length > 0 && <span className="block text-xs font-semibold text-amber-700">{requests.length} {t("requesting")}</span>}
        </span>
        <ChevronDown className={`size-5 shrink-0 text-ink/40 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-line p-4">
          {requests.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{t("Seat requests (decided by the course director)")}</p>
              <div className="mt-2 space-y-2">
                {requests.map(({ student, selection }) => (
                  <div key={student.id} className="rounded-xl bg-amber-50 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Avatar user={student} size={28} />
                      <b>{student.name}</b>
                      <span className="text-ink/50">· {student.username}</span>
                      <span className="ml-auto text-xs text-ink/50">{selection && fmtDate(selection.createdAt)}</span>
                    </div>
                    {selection?.motivation && <p className="mt-1.5 text-ink/75">“{selection.motivation}”</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
              {group ? t("Enrolled students") : t("Students in this year")} ({enrolled.length})
            </p>
            {group && (
              <button className="btn-ghost py-1.5 text-xs" onClick={() => download(`${slug(c.code + " " + c.name)}-students.csv`, courseListCsv(school, c.id))}>
                <Download className="size-3.5" /> {t("Download list")}
              </button>
            )}
          </div>
          {enrolled.length === 0 ? (
            <p className="mt-3 text-sm text-ink/50">{t("No students yet.")}</p>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-ink/45">
                  <tr>
                    <th className="py-2 pr-4 font-semibold">ID</th>
                    <th className="py-2 pr-4 font-semibold">{t("Student")}</th>
                    <th className="py-2 font-semibold">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {enrolled.map(({ student }) => (
                    <tr key={student.id}>
                      <td className="py-2 pr-4 font-mono text-xs">{student.username}</td>
                      <td className="py-2 pr-4">{student.name}</td>
                      <td className="py-2">
                        <a href={`mailto:${student.email}`} className="text-brand hover:underline">{student.email}</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
